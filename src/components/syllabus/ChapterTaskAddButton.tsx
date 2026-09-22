import { useState } from "react";
import { Plus, Check, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DEFAULT_PRESETS, SETTINGS_PRESETS } from "@/lib/chapter-task-presets";
import {
  getActivePresetIds,
  setActivePresetIds,
  getCustomPresets,
  addCustomPreset,
  removeCustomPreset,
  renameCustomPreset,
  getSubjectOverrides,
  toggleSubjectOverride,
  getSubjectPresetState,
  getSubjectLocalPresets,
  addSubjectLocalPreset,
  removeSubjectLocalPreset,
  renameSubjectLocalPreset,
} from "@/lib/chapter-task-store";
import type { ChapterTaskPreset } from "@/lib/chapter-task-presets";

interface ChapterTaskAddButtonProps {
  subjectId: string;
  chapterIds: string[];
  onTasksApplied: () => void;
}

export function ChapterTaskAddButton({
  subjectId,
  chapterIds,
  onTasksApplied,
}: ChapterTaskAddButtonProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "subject">("all");

  // These four presets/selections states are populated lazily in handleOpen.
  // They intentionally start empty: this component mounts once per chapter row
  // (dozens of instances while a large subject is expanded), so reading
  // localStorage in the initializers would cost ~4 sync reads per row even
  // though every dialog stays closed. handleOpen always refreshes all four
  // before setOpen(true), so the dialog never renders stale/empty data.
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [customPresets, setCustomPresets] = useState<ChapterTaskPreset[]>([]);
  const [newCustom, setNewCustom] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  // Setter-only state: updates re-render the subject tab (which reads the
  // override map through getSubjectPresetState), the value itself is unused.
  const [, setSubjectOverrides] = useState<Record<string, boolean>>({});
  const [localPresets, setLocalPresets] = useState<ChapterTaskPreset[]>([]);
  const [newLocal, setNewLocal] = useState("");
  const [editingLocalId, setEditingLocalId] = useState<string | null>(null);
  const [editLocalLabel, setEditLocalLabel] = useState("");

  // refresh state when dialog opens
  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIds(getActivePresetIds());
    setCustomPresets(getCustomPresets());
    setSubjectOverrides(getSubjectOverrides(subjectId));
    setLocalPresets(getSubjectLocalPresets(subjectId));
    setOpen(true);
  };

  // --- "সব বিষয়ে" handlers ---
  const togglePreset = (id: string) => {
    const next = activeIds.includes(id)
      ? activeIds.filter((i) => i !== id)
      : [...activeIds, id];
    setActiveIds(next);
    setActivePresetIds(next);
  };

  const handleAddGlobalCustom = () => {
    const trimmed = newCustom.trim();
    if (!trimmed) return;
    addCustomPreset(trimmed);
    setCustomPresets(getCustomPresets());
    setActiveIds(getActivePresetIds());
    setNewCustom("");
  };

  const handleRenameGlobal = (id: string) => {
    const trimmed = editLabel.trim();
    if (!trimmed) return;
    renameCustomPreset(id, trimmed);
    setCustomPresets(getCustomPresets());
    setEditingId(null);
  };

  const handleRemoveGlobal = (id: string) => {
    removeCustomPreset(id);
    setCustomPresets(getCustomPresets());
    setActiveIds(getActivePresetIds());
  };

  // --- "শুধু এই বিষয়ে" handlers ---
  const handleToggleSubjectPreset = (presetId: string) => {
    toggleSubjectOverride(subjectId, presetId);
    setSubjectOverrides(getSubjectOverrides(subjectId));
    onTasksApplied();
  };

  const handleAddLocal = () => {
    const trimmed = newLocal.trim();
    if (!trimmed) return;
    addSubjectLocalPreset(subjectId, trimmed);
    setLocalPresets(getSubjectLocalPresets(subjectId));
    setNewLocal("");
    onTasksApplied();
  };

  const handleRenameLocal = (id: string) => {
    const trimmed = editLocalLabel.trim();
    if (!trimmed) return;
    renameSubjectLocalPreset(subjectId, id, trimmed);
    setLocalPresets(getSubjectLocalPresets(subjectId));
    setEditingLocalId(null);
  };

  const handleRemoveLocal = (id: string) => {
    removeSubjectLocalPreset(subjectId, id);
    setLocalPresets(getSubjectLocalPresets(subjectId));
    onTasksApplied();
  };

  const allGlobalPresets = [...DEFAULT_PRESETS, ...SETTINGS_PRESETS, ...customPresets];

  return (
    <>
      <button
        className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
        onClick={handleOpen}
      >
        <Plus className="h-3 w-3 text-primary" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 rounded-2xl" onClick={(e) => e.stopPropagation()}>
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-lg font-bengali text-center">
              টাস্ক ম্যানেজ করুন
            </DialogTitle>
            {activeTab === "subject" ? (
              <p className="text-xs text-muted-foreground font-bengali text-center">
                এই টাস্কগুলো এই বিষয়ের বাকি সব অধ্যায়ে প্রযোজ্য হবে
              </p>
            ) : (
              <p className="text-xs text-muted-foreground font-bengali text-center">
                এই টাস্কগুলো সব বিষয়ের সব অধ্যায়ে প্রযোজ্য হবে
              </p>
            )}
          </DialogHeader>

          {/* Tabs */}
          <div className="px-4 flex justify-center gap-1 border-b border-border/50">
            <button
              className={`px-3 py-2 text-xs font-bengali font-medium transition-colors border-b-2 -mb-px ${
                activeTab === "all"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("all")}
            >
              সব বিষয়ে
            </button>
            <button
              className={`px-3 py-2 text-xs font-bengali font-medium transition-colors border-b-2 -mb-px ${
                activeTab === "subject"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("subject")}
            >
              শুধু এই বিষয়ে
            </button>
          </div>

          {/* "সব বিষয়ে" Tab */}
          {activeTab === "all" ? (
            <div className="flex flex-col max-h-[50vh]">
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                <div className="space-y-1.5">
                  {DEFAULT_PRESETS.map((preset) => (
                    <div key={preset.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`all-${preset.id}`}
                        checked={activeIds.includes(preset.id)}
                        onCheckedChange={() => togglePreset(preset.id)}
                      />
                      <Label htmlFor={`all-${preset.id}`} className="font-bengali text-sm cursor-pointer">
                        {preset.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {SETTINGS_PRESETS.map((preset) => (
                    <div key={preset.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`all-${preset.id}`}
                        checked={activeIds.includes(preset.id)}
                        onCheckedChange={() => togglePreset(preset.id)}
                      />
                      <Label htmlFor={`all-${preset.id}`} className="font-bengali text-sm cursor-pointer">
                        {preset.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {customPresets.length > 0 && (
                  <div className="space-y-1.5">
                    {customPresets.map((preset) => (
                      <div key={preset.id} className="flex items-center gap-1.5">
                        {editingId === preset.id ? (
                          <>
                            <Input
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameGlobal(preset.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="h-7 text-xs font-bengali"
                              autoFocus
                            />
                            <button onClick={() => handleRenameGlobal(preset.id)} className="p-1 hover:bg-muted rounded">
                              <Check className="h-3 w-3 text-emerald-600" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1 hover:bg-muted rounded">
                              <span className="text-xs text-muted-foreground">✕</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <Checkbox
                              id={`all-${preset.id}`}
                              checked={activeIds.includes(preset.id)}
                              onCheckedChange={() => togglePreset(preset.id)}
                            />
                            <Label htmlFor={`all-${preset.id}`} className="font-bengali text-sm cursor-pointer flex-1">
                              {preset.label}
                            </Label>
                            <button onClick={() => { setEditingId(preset.id); setEditLabel(preset.label); }} className="p-1 hover:bg-muted rounded">
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </button>
                            <button onClick={() => handleRemoveGlobal(preset.id)} className="p-1 hover:bg-muted rounded">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="sticky bottom-0 px-4 py-3 bg-muted/30 border-t border-border/50 rounded-b-2xl">
                <p className="text-xs font-semibold font-bengali mb-1.5 text-muted-foreground">নিজে যুক্ত করুন</p>
                <div className="flex gap-2">
                  <Input
                    value={newCustom}
                    onChange={(e) => setNewCustom(e.target.value)}
                    placeholder="টাস্কের নাম লিখুন..."
                    className="h-8 text-xs font-bengali"
                    onKeyDown={(e) => e.key === "Enter" && handleAddGlobalCustom()}
                  />
                  <button
                    onClick={handleAddGlobalCustom}
                    disabled={!newCustom.trim()}
                    className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* "শুধু এই বিষয়ে" Tab */
            <div className="flex flex-col max-h-[50vh]">
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
                {/* ALL presets - each with per-subject override */}
                {allGlobalPresets.map((preset) => {
                  const isOn = getSubjectPresetState(subjectId, preset.id);
                  return (
                    <div key={preset.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`subj-${preset.id}`}
                        checked={isOn}
                        onCheckedChange={() => handleToggleSubjectPreset(preset.id)}
                      />
                      <Label htmlFor={`subj-${preset.id}`} className="font-bengali text-sm cursor-pointer flex-1">
                        {preset.label}
                      </Label>
                    </div>
                  );
                })}

                {/* subject-local presets */}
                {localPresets.map((preset) => (
                  <div key={preset.id} className="flex items-center gap-1.5">
                    {editingLocalId === preset.id ? (
                      <>
                        <Input
                          value={editLocalLabel}
                          onChange={(e) => setEditLocalLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameLocal(preset.id);
                            if (e.key === "Escape") setEditingLocalId(null);
                          }}
                          className="h-7 text-xs font-bengali"
                          autoFocus
                        />
                        <button onClick={() => handleRenameLocal(preset.id)} className="p-1 hover:bg-muted rounded">
                          <Check className="h-3 w-3 text-emerald-600" />
                        </button>
                        <button onClick={() => setEditingLocalId(null)} className="p-1 hover:bg-muted rounded">
                          <span className="text-xs text-muted-foreground">✕</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <Checkbox
                          id={`subj-local-${preset.id}`}
                          checked={true}
                          onCheckedChange={() => {}}
                          className="opacity-60"
                        />
                        <Label htmlFor={`subj-local-${preset.id}`} className="font-bengali text-sm cursor-pointer flex-1">
                          {preset.label}
                        </Label>
                        <button onClick={() => { setEditingLocalId(preset.id); setEditLocalLabel(preset.label); }} className="p-1 hover:bg-muted rounded">
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleRemoveLocal(preset.id)} className="p-1 hover:bg-muted rounded">
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="sticky bottom-0 px-4 py-3 bg-muted/30 border-t border-border/50 rounded-b-2xl">
                <p className="text-xs font-semibold font-bengali mb-1.5 text-muted-foreground">নিজে যুক্ত করুন</p>
                <div className="flex gap-2">
                  <Input
                    value={newLocal}
                    onChange={(e) => setNewLocal(e.target.value)}
                    placeholder="টাস্কের নাম লিখুন..."
                    className="h-8 text-xs font-bengali"
                    onKeyDown={(e) => e.key === "Enter" && handleAddLocal()}
                  />
                  <button
                    onClick={handleAddLocal}
                    disabled={!newLocal.trim()}
                    className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
