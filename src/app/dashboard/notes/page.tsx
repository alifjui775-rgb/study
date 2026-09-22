import { useState, useEffect } from "react";
import { PageHeader, EmptyState } from "@/components";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListTodo, Notebook, PlusCircle, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import NoteCard from "@/components/NoteCard";
import NoteDialog from "@/components/NoteDialog";
import type { Note } from "@/lib/types";
import TodoTasks from "@/components/TodoTasks";

const getLocalNotes = (userId: string): Note[] => {
  if (typeof window === "undefined") return [];
  const notes = localStorage.getItem(`notes_${userId}`);
  return notes ? JSON.parse(notes) : [];
};

const saveLocalNotes = (userId: string, notes: Note[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(`notes_${userId}`, JSON.stringify(notes));
};

export default function NotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTaskTab, setActiveTaskTab] = useState("todo");

  useEffect(() => {
    if (user?.uid) {
      setNotes(getLocalNotes(user.uid));
    }
    setIsLoading(false);
  }, [user]);

  const filteredNotes = notes.filter(
    (note) =>
      note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAddNoteClick = () => {
    setSelectedNote(null);
    setIsNoteDialogOpen(true);
  };

  const handleEditNoteClick = (note: Note) => {
    setSelectedNote(note);
    setIsNoteDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsNoteDialogOpen(false);
    setSelectedNote(null);
  };

  const handleSaveNote = (noteToSave: Omit<Note, "created_at">) => {
    if (!user?.uid) return;
    let updatedNotes;
    if ("id" in noteToSave && noteToSave.id) {
      // Update
      updatedNotes = notes.map((n) => (n.id === noteToSave.id ? { ...n, ...noteToSave } : n));
    } else {
      // Create
      const newNote: Note = {
        ...noteToSave,
        id: new Date().toISOString(), // Simple unique ID
        created_at: new Date().toISOString(),
      };
      updatedNotes = [newNote, ...notes];
    }
    setNotes(updatedNotes);
    saveLocalNotes(user.uid, updatedNotes);
    handleDialogClose();
  };

  const handleDeleteNote = (noteId: string) => {
    if (!user?.uid) return;
    const updatedNotes = notes.filter((n) => n.id !== noteId);
    setNotes(updatedNotes);
    saveLocalNotes(user.uid, updatedNotes);
  };

  return (
    <>
      <div className="container mx-auto px-4 py-6 space-y-8 max-w-4xl">
        <PageHeader
          title="নোটস এবং টাস্ক"
          description="আপনার ব্যক্তিগত নোট এবং করণীয় কাজগুলো এখানে গুছিয়ে রাখুন।"
        />

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="h-auto p-1 bg-muted rounded-xl flex-wrap justify-center max-w-md mx-auto">
            <TabsTrigger
              value="tasks"
              className="px-6 py-2.5 rounded-lg font-bengali data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <ListTodo className="h-4 w-4 mr-2" />
              টাস্ক
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="px-6 py-2.5 rounded-lg font-bengali data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <Notebook className="h-4 w-4 mr-2" />
              নোটস
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tasks" className="mt-6">
            <Tabs value={activeTaskTab} onValueChange={setActiveTaskTab} defaultValue="todo">
              <TabsList>
                <TabsTrigger value="todo">আমার টাস্ক</TabsTrigger>
              </TabsList>
              <TabsContent value="todo">
                <TodoTasks />
              </TabsContent>
            </Tabs>
          </TabsContent>
          <TabsContent value="notes" className="mt-6">
            <div className="flex justify-between items-center mb-4 gap-4">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="নোট খুঁজুন..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button onClick={handleAddNoteClick} className="whitespace-nowrap">
                <PlusCircle className="h-4 w-4 mr-2" />
                <span>+ নোট</span>
              </Button>
            </div>

            {isLoading ? (
              <p>নোট লোড হচ্ছে...</p>
            ) : filteredNotes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={() => handleEditNoteClick(note)}
                    onDelete={() => handleDeleteNote(note.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Notebook className="h-12 w-12 text-primary" />}
                title="কোনো নোট পাওয়া যায়নি"
                description="শুরু করতে একটি নতুন নোট তৈরি করুন।"
              />
            )}
          </TabsContent>
        </Tabs>
        <div className="h-20" />
      </div>

      <NoteDialog
        isOpen={isNoteDialogOpen}
        onClose={handleDialogClose}
        note={selectedNote}
        onSave={handleSaveNote}
      />
    </>
  );
}
