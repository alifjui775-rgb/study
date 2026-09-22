import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Pencil, Plus, Database, ListTree } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export function PaperSyllabusManager({
  paperId,
  paperName,
  onClose,
}: {
  paperId: string | null;
  paperName: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [topicName, setTopicName] = useState("");
  const [topicSerial, setTopicSerial] = useState("");

  const [newTopicChapterId, setNewTopicChapterId] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicSerial, setNewTopicSerial] = useState("");

  // Fetch Chapters
  const { data: chapters = [], isLoading: isChaptersLoading } = useQuery({
    queryKey: ["paper_chapters", paperId],
    queryFn: async () => {
      if (!paperId) return [];
      const { data, error } = await supabase
        .from("paper_chapters")
        .select("*")
        .eq("paper_id", paperId)
        .order("serial", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
    enabled: !!paperId,
  });

  // Fetch Topics
  const { data: topics = [], isLoading: isTopicsLoading } = useQuery({
    queryKey: ["chapter_topics", paperId],
    queryFn: async () => {
      if (!paperId) return [];
      const { data, error } = await supabase
        .from("chapter_topics")
        .select("*")
        .eq("paper_id", paperId)
        .order("serial", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
    enabled: !!paperId,
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["chapter_topics", paperId] });
  };

  // Add Topic
  const addTopicMut = useMutation({
    mutationFn: async (vars: { chapterId: string; name: string; serial: number | null }) => {
      const { error } = await supabase.from("chapter_topics").insert({
        paper_id: paperId!,
        chapter_id: vars.chapterId,
        name: vars.name,
        serial: vars.serial,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "✅ টপিক যুক্ত হয়েছে" });
      setNewTopicChapterId(null);
      setNewTopicName("");
      setNewTopicSerial("");
      invalidateQueries();
    },
    onError: (e: any) =>
      toast({ title: "❌ সমস্যা হয়েছে", description: e.message, variant: "destructive" }),
  });

  // Edit Topic
  const editTopicMut = useMutation({
    mutationFn: async (vars: { id: string; name: string; serial: number | null }) => {
      const { error } = await supabase
        .from("chapter_topics")
        .update({ name: vars.name, serial: vars.serial })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "✅ টপিক আপডেট হয়েছে" });
      setEditingTopicId(null);
      invalidateQueries();
    },
    onError: (e: any) =>
      toast({ title: "❌ সমস্যা হয়েছে", description: e.message, variant: "destructive" }),
  });

  // Delete Topic
  const deleteTopicMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chapter_topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "🗑️ টপিক মুছে ফেলা হয়েছে" });
      invalidateQueries();
    },
    onError: (e: any) =>
      toast({ title: "❌ সমস্যা হয়েছে", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={!!paperId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bengali flex items-center gap-2">
            <ListTree className="h-5 w-5 text-primary" />
            {paperName} - এর চ্যাপ্টার ও টপিকসমূহ
          </DialogTitle>
        </DialogHeader>

        {isChaptersLoading || isTopicsLoading ? (
          <div className="py-10">
            <LoadingSpinner message="তথ্য লোড হচ্ছে..." />
          </div>
        ) : chapters.length === 0 ? (
          <p className="text-center text-muted-foreground font-bengali py-10">
            কোনো চ্যাপ্টার পাওয়া যায়নি।
          </p>
        ) : (
          <Accordion type="multiple" className="w-full space-y-2 mt-4">
            {chapters.map((chapter) => {
              const chapterTopics = topics.filter((t) => t.chapter_id === chapter.id);

              return (
                <AccordionItem
                  value={chapter.id}
                  key={chapter.id}
                  className="border rounded-lg px-4 bg-muted/10"
                >
                  <AccordionTrigger className="font-semibold font-bengali hover:no-underline text-left">
                    {chapter.serial ? `${chapter.serial}. ` : ""}
                    {chapter.name}
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4 space-y-3">
                    {chapterTopics.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic font-bengali mb-2">
                        এই চ্যাপ্টারে কোনো টপিক নেই।
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {chapterTopics.map((topic) => (
                          <div
                            key={topic.id}
                            className="flex items-center justify-between p-2 rounded-md bg-background border"
                          >
                            {editingTopicId === topic.id ? (
                              <div className="flex flex-1 items-center gap-2 mr-2">
                                <Input
                                  className="w-16 h-8 text-xs"
                                  placeholder="Serial"
                                  type="number"
                                  value={topicSerial}
                                  onChange={(e) => setTopicSerial(e.target.value)}
                                />
                                <Input
                                  className="flex-1 h-8 text-xs font-bengali"
                                  placeholder="টপিকের নাম..."
                                  value={topicName}
                                  onChange={(e) => setTopicName(e.target.value)}
                                />
                                <Button
                                  size="sm"
                                  className="h-8 text-xs font-bengali"
                                  onClick={() =>
                                    editTopicMut.mutate({
                                      id: topic.id,
                                      name: topicName,
                                      serial: topicSerial ? Number(topicSerial) : null,
                                    })
                                  }
                                  disabled={!topicName || editTopicMut.isPending}
                                >
                                  সংরক্ষণ
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs font-bengali"
                                  onClick={() => setEditingTopicId(null)}
                                >
                                  বাতিল
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span className="font-bengali text-sm text-foreground flex-1">
                                  {topic.serial ? (
                                    <span className="mr-2 text-muted-foreground text-xs">
                                      {topic.serial}.
                                    </span>
                                  ) : null}
                                  {topic.name}
                                </span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      setEditingTopicId(topic.id);
                                      setTopicName(topic.name);
                                      setTopicSerial(topic.serial?.toString() || "");
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => deleteTopicMut.mutate(topic.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add new topic inline form */}
                    {newTopicChapterId === chapter.id ? (
                      <div className="flex items-center gap-2 mt-3 p-2 bg-muted/30 rounded-md border border-dashed">
                        <Input
                          className="w-16 h-8 text-xs"
                          placeholder="Serial"
                          type="number"
                          value={newTopicSerial}
                          onChange={(e) => setNewTopicSerial(e.target.value)}
                        />
                        <Input
                          className="flex-1 h-8 text-xs font-bengali"
                          placeholder="নতুন টপিকের নাম..."
                          value={newTopicName}
                          onChange={(e) => setNewTopicName(e.target.value)}
                        />
                        <Button
                          size="sm"
                          className="h-8 text-xs font-bengali"
                          onClick={() =>
                            addTopicMut.mutate({
                              chapterId: chapter.id,
                              name: newTopicName,
                              serial: newTopicSerial ? Number(newTopicSerial) : null,
                            })
                          }
                          disabled={!newTopicName || addTopicMut.isPending}
                        >
                          যুক্ত করুন
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs font-bengali"
                          onClick={() => setNewTopicChapterId(null)}
                        >
                          বাতিল
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 h-8 text-xs font-bengali w-full border-dashed"
                        onClick={() => {
                          setNewTopicChapterId(chapter.id);
                          setNewTopicName("");
                          setNewTopicSerial("");
                          setEditingTopicId(null);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" /> নতুন টপিক
                      </Button>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </DialogContent>
    </Dialog>
  );
}
