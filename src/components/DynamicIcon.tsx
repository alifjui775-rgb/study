import React from "react";
import {
  BookOpen,
  Atom,
  FlaskConical,
  Calculator,
  Binary,
  Dna,
  Globe,
  Languages,
  Landmark,
  Scale,
  Brain,
  Stethoscope,
  Briefcase,
  TrendingUp,
  Cpu,
  GraduationCap,
  Music,
  Palette,
  Compass,
  FileText,
  Activity,
  Award,
  Layers,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

// Curated academic & subject icon registry
const iconMap: Record<string, LucideIcon> = {
  book: BookOpen,
  "book-open": BookOpen,
  bookopen: BookOpen,
  atom: Atom,
  physics: Atom,
  chemistry: FlaskConical,
  "flask-conical": FlaskConical,
  flaskconical: FlaskConical,
  flask: FlaskConical,
  calculator: Calculator,
  math: Calculator,
  mathematics: Calculator,
  binary: Binary,
  computer: Binary,
  programming: Binary,
  dna: Dna,
  biology: Dna,
  globe: Globe,
  geography: Globe,
  languages: Languages,
  language: Languages,
  english: Languages,
  bangla: Languages,
  landmark: Landmark,
  history: Landmark,
  scale: Scale,
  law: Scale,
  brain: Brain,
  psychology: Brain,
  stethoscope: Stethoscope,
  medical: Stethoscope,
  medicine: Stethoscope,
  briefcase: Briefcase,
  business: Briefcase,
  "trending-up": TrendingUp,
  trendingup: TrendingUp,
  economics: TrendingUp,
  accounting: TrendingUp,
  cpu: Cpu,
  engineering: Cpu,
  "graduation-cap": GraduationCap,
  graduationcap: GraduationCap,
  general: GraduationCap,
  music: Music,
  palette: Palette,
  arts: Palette,
  compass: Compass,
  file: FileText,
  "file-text": FileText,
  activity: Activity,
  award: Award,
  layers: Layers,
};

export type DynamicIconProps = LucideProps & {
  iconName: string | null | undefined;
  fallbackIcon?: React.ComponentType<LucideProps>;
};

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

export function DynamicIcon({ iconName, fallbackIcon, ...props }: DynamicIconProps) {
  const Fallback = fallbackIcon ?? BookOpen;

  if (!iconName || typeof iconName !== "string" || iconName.trim() === "") {
    return <Fallback {...props} />;
  }

  const raw = iconName.trim().toLowerCase();
  const normalized = normalizeName(iconName);

  const IconComponent = iconMap[raw] || iconMap[normalized] || Fallback;

  return <IconComponent {...props} />;
}
