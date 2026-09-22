import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCurriculumPapers,
  fetchGroups,
  fetchPaperGroups,
  setPaperGroups,
  type CurriculumPaper,
  type Group,
} from "./api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BookMarked, Layers } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";

export default function PaperGroupsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);

  const { data: papers, isLoading: papersLoading } = useQuery({
    queryKey: ["curriculum_papers"],
    queryFn: () => fetchCurriculumPapers(),
  });

  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: fetchGroups,
  });

  const { data: paperGroups, isLoading: pgLoading } = useQuery({
    queryKey: ["paper_groups", selectedPaperId],
    queryFn: () => fetchPaperGroups(selectedPaperId!),
    enabled: !!selectedPaperId,
  });

  const updateMut = useMutation({
    mutationFn: (groupIds: string[]) => setPaperGroups(selectedPaperId!, groupIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paper_groups", selectedPaperId] });
      toast({ title: "Updated allocations" });
    },
  });

  const handleToggle = (groupId: string, checked: boolean) => {
    if (!paperGroups) return;
    const currentGroupIds = paperGroups.map((pg) => pg.group_id);
    let newGroupIds = [...currentGroupIds];

    if (checked && !newGroupIds.includes(groupId)) {
      newGroupIds.push(groupId);
    } else if (!checked) {
      newGroupIds = newGroupIds.filter((id) => id !== groupId);
    }

    updateMut.mutate(newGroupIds);
  };

  if (papersLoading || groupsLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-muted/10">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-primary" /> Paper Group Allocation
          </h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border">
            <label className="font-semibold whitespace-nowrap">Select Paper:</label>
            <Select value={selectedPaperId || ""} onValueChange={setSelectedPaperId}>
              <SelectTrigger className="w-full sm:w-[350px] bg-background">
                <SelectValue placeholder="Select a curriculum paper..." />
              </SelectTrigger>
              <SelectContent>
                {papers?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPaperId && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4" /> Allocated Groups
              </h3>

              {pgLoading ? (
                <LoadingSpinner />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {groups?.map((g) => {
                    const isAllocated = paperGroups?.some((pg) => pg.group_id === g.id);
                    return (
                      <div
                        key={g.id}
                        className={`flex items-center space-x-3 rounded-xl border p-4 transition-all cursor-pointer ${isAllocated ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:bg-muted/30"}`}
                        onClick={() => handleToggle(g.id, !isAllocated)}
                      >
                        <Checkbox
                          checked={isAllocated}
                          onCheckedChange={(checked) => handleToggle(g.id, !!checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="font-medium cursor-pointer select-none">
                          {g.name_bn}{" "}
                          <span className="text-muted-foreground text-sm">({g.name_en})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!selectedPaperId && (
            <div className="text-center p-8 text-muted-foreground border border-dashed rounded-xl">
              Please select a paper from the dropdown to manage its group allocations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
