import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

// ─── Props ────────────────────────────────────────────────────────────────────
interface SharedPageHeaderProps {
  /** Primary heading text */
  title: string;
  /** Secondary muted description text */
  description: string;
  /** Optional: placeholder text for the search input */
  placeholder?: string;
  /** Optional: controlled value for the search input */
  searchValue?: string;
  /** Optional: change handler for the search input */
  onSearchChange?: (value: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
const SharedPageHeader = ({
  title,
  description,
  placeholder,
  searchValue,
  onSearchChange,
}: SharedPageHeaderProps) => {
  const showSearch =
    placeholder !== undefined || searchValue !== undefined || onSearchChange !== undefined;

  return (
    <div className="px-4">
      {/* Title & Description */}
      <div className="text-center font-bengali">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-relaxed gradient-text animate-in fade-in duration-500">
          {title}
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          {description}
        </p>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="mt-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={placeholder ?? ""}
              className="w-full pl-10 h-12 text-base bg-card font-bengali"
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedPageHeader;
