import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchStudyLevels,
  fetchStudyDisciplines,
  fetchCurriculumPapers,
  fetchPaperChapters,
  fetchChapterTopics,
  insertDiscipline,
  updateDiscipline,
  deleteDiscipline,
  insertPaper,
  updatePaper,
  deletePaper,
  insertChapter,
  updateChapter,
  deleteChapter,
  insertTopic,
  updateTopic,
  deleteTopic,
  type StudyLevel,
  type StudyDiscipline,
  type CurriculumPaper,
  type PaperChapter,
  type ChapterTopic,
} from "./api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  Layers,
  FileText,
  ListTree,
  BookOpen,
} from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";

export default function CurriculumTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<StudyDiscipline | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<CurriculumPaper | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<PaperChapter | null>(null);

  const { data: levels, isLoading: levelsLoading } = useQuery({
    queryKey: ["study_levels"],
    queryFn: fetchStudyLevels,
  });

  const { data: disciplines, isLoading: disciplinesLoading } = useQuery({
    queryKey: ["study_disciplines", selectedLevelId],
    queryFn: () => fetchStudyDisciplines(selectedLevelId!),
    enabled: !!selectedLevelId,
  });

  const { data: papers, isLoading: papersLoading } = useQuery({
    queryKey: ["curriculum_papers", selectedDiscipline?.id],
    queryFn: () => fetchCurriculumPapers(selectedDiscipline!.id),
    enabled: !!selectedDiscipline,
  });

  const { data: chapters, isLoading: chaptersLoading } = useQuery({
    queryKey: ["paper_chapters", selectedPaper?.id],
    queryFn: () => fetchPaperChapters(selectedPaper!.id),
    enabled: !!selectedPaper,
  });

  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ["chapter_topics", selectedChapter?.id],
    queryFn: () => fetchChapterTopics(selectedChapter!.id),
    enabled: !!selectedChapter,
  });

  if (levelsLoading) return <LoadingSpinner message="Loading levels..." />;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* LEVEL SELECTION */}
      <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border">
        <label className="font-semibold whitespace-nowrap">Study Level:</label>
        <Select
          value={selectedLevelId?.toString() || ""}
          onValueChange={(val) => {
            setSelectedLevelId(Number(val));
            setSelectedDiscipline(null);
            setSelectedPaper(null);
            setSelectedChapter(null);
          }}
        >
          <SelectTrigger className="w-[250px] bg-background">
            <SelectValue placeholder="Select a level..." />
          </SelectTrigger>
          <SelectContent>
            {levels?.map((lvl) => (
              <SelectItem key={lvl.id} value={lvl.id.toString()}>
                {lvl.name} ({lvl.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedLevelId && !selectedDiscipline && (
        <DisciplinesView
          levelId={selectedLevelId}
          disciplines={disciplines || []}
          loading={disciplinesLoading}
          onSelect={(d: StudyDiscipline) => setSelectedDiscipline(d)}
        />
      )}

      {selectedDiscipline && !selectedPaper && (
        <PapersView
          discipline={selectedDiscipline}
          papers={papers || []}
          loading={papersLoading}
          onBack={() => setSelectedDiscipline(null)}
          onSelect={(p: CurriculumPaper) => setSelectedPaper(p)}
        />
      )}

      {selectedPaper && !selectedChapter && (
        <ChaptersView
          paper={selectedPaper}
          chapters={chapters || []}
          loading={chaptersLoading}
          onBack={() => setSelectedPaper(null)}
          onSelect={(c: PaperChapter) => setSelectedChapter(c)}
        />
      )}

      {selectedChapter && (
        <TopicsView
          chapter={selectedChapter}
          topics={topics || []}
          loading={topicsLoading}
          onBack={() => setSelectedChapter(null)}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Sub-views
// -------------------------------------------------------------

function DisciplinesView({ levelId, disciplines, loading, onSelect }: any) {
  const [name, setName] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const insertMut = useMutation({
    mutationFn: () => insertDiscipline({ name, level_id: levelId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study_disciplines"] });
      setName("");
      toast({ title: "Added discipline" });
    },
  });

  const delMut = useMutation({
    mutationFn: deleteDiscipline,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study_disciplines"] });
      toast({ title: "Deleted discipline" });
    },
  });

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b flex justify-between items-center bg-muted/10">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" /> Study Disciplines
        </h2>
      </div>
      <div className="p-4 flex gap-2">
        <Input
          placeholder="New Discipline Name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={() => insertMut.mutate()} disabled={!name || insertMut.isPending}>
          <Plus className="h-4 w-4 mr-2" /> Add
        </Button>
      </div>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {disciplines.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  No disciplines found.
                </TableCell>
              </TableRow>
            )}
            {disciplines.map((d: any) => (
              <TableRow key={d.id}>
                <TableCell className="font-semibold">{d.name}</TableCell>
                <TableCell className="text-right flex items-center justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => onSelect(d)}>
                    Papers <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => delMut.mutate(d.id)}
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
  );
}

function PapersView({ discipline, papers, loading, onBack, onSelect }: any) {
  const [name, setName] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const insertMut = useMutation({
    mutationFn: () => insertPaper({ name, discipline_id: discipline.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curriculum_papers"] });
      setName("");
      toast({ title: "Added paper" });
    },
  });

  const delMut = useMutation({
    mutationFn: deletePaper,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curriculum_papers"] });
      toast({ title: "Deleted paper" });
    },
  });

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b flex justify-between items-center bg-muted/10">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="mr-2">
            &larr; Back
          </Button>
          <FileText className="h-5 w-5 text-primary" /> Papers in {discipline.name}
        </h2>
      </div>
      <div className="p-4 flex gap-2">
        <Input
          placeholder="New Paper Name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={() => insertMut.mutate()} disabled={!name || insertMut.isPending}>
          <Plus className="h-4 w-4 mr-2" /> Add
        </Button>
      </div>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {papers.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  No papers found.
                </TableCell>
              </TableRow>
            )}
            {papers.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-semibold">{p.name}</TableCell>
                <TableCell className="text-right flex items-center justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => onSelect(p)}>
                    Chapters <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
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
  );
}

function ChaptersView({ paper, chapters, loading, onBack, onSelect }: any) {
  const [name, setName] = useState("");
  const [serial, setSerial] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const insertMut = useMutation({
    mutationFn: () =>
      insertChapter({ name, serial: serial ? Number(serial) : null, paper_id: paper.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paper_chapters"] });
      setName("");
      setSerial("");
      toast({ title: "Added chapter" });
    },
  });

  const delMut = useMutation({
    mutationFn: deleteChapter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paper_chapters"] });
      toast({ title: "Deleted chapter" });
    },
  });

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b flex justify-between items-center bg-muted/10">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="mr-2">
            &larr; Back
          </Button>
          <BookOpen className="h-5 w-5 text-primary" /> Chapters in {paper.name}
        </h2>
      </div>
      <div className="p-4 flex gap-2">
        <Input
          type="number"
          placeholder="Serial (optional)"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          className="w-24"
        />
        <Input
          placeholder="New Chapter Name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-xs flex-1"
        />
        <Button onClick={() => insertMut.mutate()} disabled={!name || insertMut.isPending}>
          <Plus className="h-4 w-4 mr-2" /> Add
        </Button>
      </div>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Serial</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chapters.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No chapters found.
                </TableCell>
              </TableRow>
            )}
            {chapters.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell>{c.serial}</TableCell>
                <TableCell className="font-semibold">{c.name}</TableCell>
                <TableCell className="text-right flex items-center justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => onSelect(c)}>
                    Topics <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => delMut.mutate(c.id)}
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
  );
}

function TopicsView({ chapter, topics, loading, onBack }: any) {
  const [name, setName] = useState("");
  const [serial, setSerial] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const insertMut = useMutation({
    mutationFn: () =>
      insertTopic({
        name,
        serial: serial ? Number(serial) : null,
        paper_id: chapter.paper_id,
        chapter_id: chapter.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter_topics"] });
      setName("");
      setSerial("");
      toast({ title: "Added topic" });
    },
  });

  const delMut = useMutation({
    mutationFn: deleteTopic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapter_topics"] });
      toast({ title: "Deleted topic" });
    },
  });

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b flex justify-between items-center bg-muted/10">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="mr-2">
            &larr; Back
          </Button>
          <ListTree className="h-5 w-5 text-primary" /> Topics in {chapter.name}
        </h2>
      </div>
      <div className="p-4 flex gap-2">
        <Input
          type="number"
          placeholder="Serial (optional)"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          className="w-24"
        />
        <Input
          placeholder="New Topic Name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-xs flex-1"
        />
        <Button onClick={() => insertMut.mutate()} disabled={!name || insertMut.isPending}>
          <Plus className="h-4 w-4 mr-2" /> Add
        </Button>
      </div>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Serial</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topics.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No topics found.
                </TableCell>
              </TableRow>
            )}
            {topics.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell>{t.serial}</TableCell>
                <TableCell className="font-semibold">{t.name}</TableCell>
                <TableCell className="text-right flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => delMut.mutate(t.id)}
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
  );
}
