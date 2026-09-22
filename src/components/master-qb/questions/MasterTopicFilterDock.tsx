import { useEffect, useState, type RefObject } from "react";
import { ArrowUp, Check, Layers, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { MasterQbTopic } from "@/lib/master-qb-queries";

interface MasterTopicFilterDockProps {
  topics: MasterQbTopic[];
  selectedTopic: string | null;
  onSelectTopic: (topicId: string | null) => void;
  listTopRef?: RefObject<HTMLDivElement | null>;
}

function TopicRow({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors font-bengali",
        active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/60",
      )}
    >
      <span className="truncate">{label}</span>
      {active && <Check className="size-4 shrink-0" />}
    </button>
  );
}

export default function MasterTopicFilterDock({
  topics,
  selectedTopic,
  onSelectTopic,
  listTopRef,
}: MasterTopicFilterDockProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 150);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSelect = (id: string | null) => {
    onSelectTopic(id);
    setOpen(false);
    requestAnimationFrame(() => {
      listTopRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const iconSize = isScrolled ? "w-[18px] h-[18px] md:w-5 md:h-5" : "w-6 h-6";

  return (
    <div
      className={cn(
        "fixed bottom-20 right-3 md:bottom-8 md:right-8 z-[60] flex flex-col md:flex-row items-center rounded-full transition-all duration-500 ease-out",
        isScrolled
          ? "bg-background/95 backdrop-blur-md border border-border shadow-xl p-1.5 md:p-2"
          : "bg-transparent border-transparent shadow-none p-0",
      )}
    >
      {/* Animated section: back-to-top + divider (revealed on scroll) */}
      <div
        className={cn(
          "flex flex-col md:flex-row items-center overflow-hidden transition-all duration-500 ease-out origin-bottom md:origin-right",
          isScrolled
            ? "opacity-100 scale-100 max-h-[100px] md:max-w-[150px] mb-1.5 md:mb-0 md:mr-2"
            : "opacity-0 scale-50 max-h-0 md:max-h-[100px] max-w-[150px] md:max-w-0 pointer-events-none mb-0 md:mr-0",
        )}
      >
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all bg-primary/10 text-primary hover:bg-primary/20"
          aria-label="Back to top"
        >
          <ArrowUp className="w-[18px] h-[18px] md:w-5 md:h-5" />
        </button>

        <div className="shrink-0 bg-border w-[22px] h-[1px] mt-1.5 md:w-[1px] md:h-6 md:mt-0 md:ml-2" />
      </div>

      {/* Primary topic filter button (always visible) */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "shrink-0 rounded-full flex items-center justify-center transition-all duration-500 bg-primary text-primary-foreground hover:bg-background hover:border hover:border-primary hover:text-primary",
              isScrolled
                ? "w-9 h-9 md:w-10 md:h-10 shadow-sm"
                : "w-12 h-12 md:w-14 md:h-14 shadow-xl",
              open && "bg-primary/90",
            )}
            title="টপিক ফিল্টার"
            aria-label="টপিক ফিল্টার"
          >
            {open ? (
              <X className={cn("transition-all duration-500", iconSize)} />
            ) : (
              <Layers className={cn("transition-all duration-500", iconSize)} />
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="end"
          sideOffset={12}
          avoidCollisions={true}
          collisionPadding={16}
          className="w-[calc(100vw-2rem)] max-w-[280px] sm:max-w-xs z-[100] max-h-[65vh] md:max-h-[70vh] overflow-y-auto overscroll-contain shadow-2xl rounded-2xl p-4 font-bengali"
        >
          <div className="flex items-center justify-between gap-2 px-1 pb-2 border-b border-border/60">
            <span className="text-sm font-bold flex items-center gap-1.5 text-foreground">
              <Layers className="size-4 text-primary" />
              টপিক নির্বাচন
            </span>
            {selectedTopic !== null && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                রিসেট
              </button>
            )}
          </div>

          <div className="mt-2 space-y-1">
            <TopicRow label="সকল টপিক" active={selectedTopic === null} onClick={() => handleSelect(null)} />
            {topics.map((topic) => (
              <TopicRow
                key={topic.id}
                label={topic.name}
                active={selectedTopic === topic.id}
                onClick={() => handleSelect(topic.id)}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
