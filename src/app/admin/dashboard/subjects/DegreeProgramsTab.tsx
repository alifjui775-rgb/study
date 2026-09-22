import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchDegreePrograms,
  insertDegreeProgram,
  updateDegreeProgram,
  deleteDegreeProgram,
  type DegreeProgram,
} from "./api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GraduationCap } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";

export default function DegreeProgramsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");

  const { data: programs, isLoading } = useQuery({
    queryKey: ["degree_programs"],
    queryFn: fetchDegreePrograms,
  });

  const insertMut = useMutation({
    mutationFn: () => insertDegreeProgram({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["degree_programs"] });
      setName("");
      toast({ title: "Added degree program" });
    },
  });

  const delMut = useMutation({
    mutationFn: deleteDegreeProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["degree_programs"] });
      toast({ title: "Deleted program" });
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b flex justify-between items-center bg-muted/10">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" /> Degree Programs
          </h2>
        </div>
        <div className="p-4 flex gap-2">
          <Input
            placeholder="New Program Name (e.g. CSE, EEE)..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={() => insertMut.mutate()} disabled={!name || insertMut.isPending}>
            <Plus className="h-4 w-4 mr-2" /> Add
          </Button>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No programs found.
                  </TableCell>
                </TableRow>
              )}
              {programs?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-semibold">{p.name}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => delMut.mutate(p.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
