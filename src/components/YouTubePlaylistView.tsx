import { useEffect, useRef, useMemo } from "react";
import { PlayCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useYouTubePlaylist, flattenPlaylistPages } from "@/hooks/useYouTubePlaylist";
import type { YouTubePlaylistItem } from "@/lib/youtube";

interface YouTubePlaylistViewProps {
  playlistId: string;
  activeVideoId: string | null;
  onVideoSelect: (videoId: string) => void;
  onItemsLoaded?: (items: YouTubePlaylistItem[]) => void;
  onFetchNextPageReady?: (fn: () => Promise<any>, hasNext: boolean) => void;
}

export function YouTubePlaylistView({
  playlistId,
  activeVideoId,
  onVideoSelect,
  onItemsLoaded,
  onFetchNextPageReady,
}: YouTubePlaylistViewProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useYouTubePlaylist({ playlistId });

  const allItems = useMemo(() => flattenPlaylistPages(data?.pages), [data?.pages]);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (allItems.length > 0) {
      onItemsLoaded?.(allItems);
    }
  }, [allItems, onItemsLoaded]);

  useEffect(() => {
    onFetchNextPageReady?.(fetchNextPage, hasNextPage);
  }, [fetchNextPage, hasNextPage, onFetchNextPageReady]);

  useEffect(() => {
    if (allItems.length > 0 && !activeVideoId) {
      onVideoSelect(allItems[0].videoId);
    }
  }, [allItems, activeVideoId, onVideoSelect]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="bg-card border rounded-xl p-4 md:p-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-4">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm font-medium font-bengali">প্লেলিস্ট লোড হচ্ছে...</span>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-40 aspect-video bg-muted rounded-lg shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="size-4" />
          <span className="text-sm font-medium font-bengali">
            প্লেলিস্ট লোড করা যায়নি: {error?.message || "অজানা ত্রুটি"}
          </span>
        </div>
      </div>
    );
  }

  if (allItems.length === 0) {
    return null;
  }

  const activeIndex = allItems.findIndex((item) => item.videoId === activeVideoId);

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlayCircle className="size-4 text-primary" />
          <span className="font-semibold text-sm font-bengali">প্লেলিস্ট</span>
        </div>
        <span className="text-xs text-muted-foreground font-bengali">
          {activeIndex >= 0 && `${activeIndex + 1} / `}
          {allItems.length} ভিডিও
        </span>
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        {allItems.map((item, index) => (
          <PlaylistItem
            key={item.videoId}
            item={item}
            index={index}
            isActive={item.videoId === activeVideoId}
            isCurrentlyPlaying={item.videoId === activeVideoId}
            onClick={() => onVideoSelect(item.videoId)}
          />
        ))}

        <div ref={sentinelRef} className="p-4">
          {isFetchingNextPage && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-xs font-bengali">আরও লোড হচ্ছে...</span>
            </div>
          )}
          {hasNextPage && !isFetchingNextPage && (
            <Button
              variant="outline"
              size="sm"
              className="w-full font-bengali"
              onClick={() => fetchNextPage()}
            >
              আরও দেখুন
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface PlaylistItemProps {
  item: YouTubePlaylistItem;
  index: number;
  isActive: boolean;
  isCurrentlyPlaying: boolean;
  onClick: () => void;
}

function PlaylistItem({
  item,
  index,
  isActive,
  isCurrentlyPlaying,
  onClick,
}: PlaylistItemProps) {
  const itemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isActive]);

  return (
    <button
      ref={itemRef}
      onClick={onClick}
      className={cn(
        "w-full flex gap-3 p-3 text-left transition-colors hover:bg-muted/50",
        isActive && "bg-primary/5 border-l-2 border-primary",
      )}
    >
      <div className="relative w-40 aspect-video bg-muted rounded-lg overflow-hidden shrink-0">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PlayCircle className="size-8 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
          {String(index + 1).padStart(2, "0")}
        </div>
        {isCurrentlyPlaying && (
          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
            <div className="bg-primary rounded-full p-1.5">
              <PlayCircle className="size-4 text-primary-foreground" />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 py-0.5">
        <p
          className={cn(
            "text-sm font-medium leading-snug line-clamp-3 font-bengali",
            isActive ? "text-primary" : "text-foreground",
          )}
        >
          {item.title}
        </p>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
          {item.channelTitle}
        </p>
      </div>
    </button>
  );
}
