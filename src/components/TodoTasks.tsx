import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, PlusCircle, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export default function TodoTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (user?.uid) {
      const savedTasks = localStorage.getItem(`todo_tasks_${user.uid}`);
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    }
  }, [user]);

  const saveTasks = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    if (user?.uid) {
      localStorage.setItem(`todo_tasks_${user.uid}`, JSON.stringify(updatedTasks));
    }
  };

  const handleAddTask = () => {
    if (newTaskText.trim() === "") return;
    const newTask: Task = {
      id: new Date().toISOString(),
      text: newTaskText,
      completed: false,
    };
    saveTasks([newTask, ...tasks]);
    setNewTaskText("");
  };

  const handleToggleTask = (id: string) => {
    const updatedTasks = tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task,
    );
    saveTasks(updatedTasks);
  };

  const handleDeleteTask = (id: string) => {
    const updatedTasks = tasks.filter((task) => task.id !== id);
    saveTasks(updatedTasks);
  };

  const filteredTasks = tasks.filter((task) =>
    task.text.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (!isClient) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>আমার টাস্ক</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="নতুন টাস্ক যোগ করুন..."
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddTask()}
          />
          <Button onClick={handleAddTask}>
            <PlusCircle className="h-4 w-4 mr-2" />
            যোগ করুন
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="টাস্ক খুঁজুন..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  id={`task-${task.id}`}
                  checked={task.completed}
                  onCheckedChange={() => handleToggleTask(task.id)}
                />
                <Label
                  htmlFor={`task-${task.id}`}
                  className={cn(
                    "flex-1 cursor-pointer",
                    task.completed && "line-through text-muted-foreground",
                  )}
                >
                  {task.text}
                </Label>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDeleteTask(task.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
