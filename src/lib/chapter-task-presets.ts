export type ChapterTaskPreset = {
  id: string;
  label: string;
  isDefault: boolean;
};

export const DEFAULT_PRESETS: ChapterTaskPreset[] = [
  { id: "book_reading", label: "মূলবই পড়া", isDefault: true },
  { id: "exam_practice", label: "পরীক্ষা দেয়া", isDefault: true },
  { id: "question_bank", label: "প্রশ্নব্যাংক সলভ", isDefault: true },
  { id: "concept_clear", label: "কনসেপ্ট ক্লিয়ার ক্লাস", isDefault: true },
];

export const SETTINGS_PRESETS: ChapterTaskPreset[] = [
  { id: "concept_book", label: "কনসেপ্ট বুক", isDefault: false },
  { id: "hand_note", label: "হ্যান্ড নোট", isDefault: false },
  { id: "udvas_class", label: "উদ্ভাসের ক্লাস", isDefault: false },
  { id: "unmesh_class", label: "উন্মেষের ক্লাস", isDefault: false },
  { id: "retina_class", label: "রেটিনার ক্লাস", isDefault: false },
  { id: "acs_class", label: "ACS এর ক্লাস", isDefault: false },
  { id: "udvas_exam", label: "উদ্ভাসের পরীক্ষা", isDefault: false },
  { id: "unmesh_exam", label: "উন্মেষের পরীক্ষা", isDefault: false },
  { id: "retina_exam", label: "রেটিনার পরীক্ষা", isDefault: false },
  { id: "acs_exam", label: "ACS এর পরীক্ষা", isDefault: false },
];
