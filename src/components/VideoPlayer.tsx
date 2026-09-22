import {
  lazy,
  Suspense,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useSearchParams } from "react-router-dom";
import { parseVideoSource } from "@/lib/video-utils";
import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
import "plyr-react/plyr.css";
import { YouTubePlaylistView } from "@/components/YouTubePlaylistView";
import { YouTubeIFramePlayer } from "@/components/YouTubeIFramePlayer";
import type { YouTubePlaylistItem } from "@/lib/youtube";

const PlyrPlayer = lazy(() =>
  import("plyr-react").then((mod) => ({ default: mod.Plyr })),
);

function PlyrFallback() {
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black animate-pulse" />
  );
}

function YouTubePlayer({ videoId }: { videoId: string }) {
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden">
      <LiteYouTubeEmbed
        id={videoId}
        title="Course Video"
        params="rel=0"
        poster="hqdefault"
      />
    </div>
  );
}

function VideoFallback({ message }: { message: string }) {
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted flex items-center justify-center">
      <p className="text-muted-foreground text-sm font-bengali">{message}</p>
    </div>
  );
}

export interface VideoPlayerProps {
  url: string | null | undefined;
  activeVideoId?: string | null;
}

export function VideoPlayer({
  url,
  activeVideoId: externalActiveVideoId,
}: VideoPlayerProps) {
  const source = parseVideoSource(url);

  if (!source) {
    return (
      <VideoFallback message="এই ক্লাসের জন্য কোনো ভিডিও পাওয়া যায়নি।" />
    );
  }

  switch (source.type) {
    case "youtube":
      return <YouTubePlayer videoId={source.videoId} />;
    case "youtube-playlist":
      return (
        <VideoPlayerWithPlaylistInner
          playlistId={source.playlistId}
          initialVideoId={externalActiveVideoId}
        />
      );
    case "direct":
      return (
        <Suspense fallback={<PlyrFallback />}>
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
            <PlyrPlayer
              source={{
                type: "video",
                sources: [{ src: source.url }],
              }}
              options={{
                controls: [
                  "play-large",
                  "restart",
                  "rewind",
                  "play",
                  "fast-forward",
                  "progress",
                  "current-time",
                  "duration",
                  "mute",
                  "volume",
                  "settings",
                  "pip",
                  "fullscreen",
                ],
              }}
            />
          </div>
        </Suspense>
      );
    default:
      return <VideoFallback message="ভিডিও সোর্স সমর্থিত নয়।" />;
  }
}

interface HybridYouTubePlayerProps {
  videoId: string;
  autoPlay: boolean;
  onEnd?: () => void;
}

function HybridYouTubePlayer({
  videoId,
  autoPlay,
  onEnd,
}: HybridYouTubePlayerProps) {
  const [mode, setMode] = useState<"placeholder" | "active">(
    autoPlay ? "active" : "placeholder",
  );
  const wrapperRef = useRef<HTMLDivElement>(null);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    setMode(autoPlay ? "active" : "placeholder");
  }, [videoId, autoPlay]);

  useEffect(() => {
    if (mode !== "placeholder") return;

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let destroyed = false;

    const observer = new MutationObserver(() => {
      if (destroyed) return;
      const iframe = wrapper.querySelector(
        'iframe[src*="youtube-nocookie.com"]',
      );
      if (iframe) {
        destroyed = true;
        observer.disconnect();
        setMode("active");
      }
    });

    observer.observe(wrapper, { childList: true, subtree: true });

    return () => {
      destroyed = true;
      observer.disconnect();
    };
  }, [mode, videoId]);

  if (mode === "active") {
    return (
      <YouTubeIFramePlayer
        key={videoId}
        videoId={videoId}
        onEnd={onEndRef.current}
      />
    );
  }

  return (
    <div ref={wrapperRef} className="relative w-full aspect-video rounded-xl overflow-hidden">
      <LiteYouTubeEmbed
        id={videoId}
        title="Course Video"
        params="rel=0"
        poster="hqdefault"
      />
    </div>
  );
}

function VideoPlayerWithPlaylistInner({
  playlistId,
  initialVideoId,
}: {
  playlistId: string;
  initialVideoId?: string | null;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeVideoId, setActiveVideoId] = useState<string | null>(
    initialVideoId || null,
  );
  const [playlistItems, setPlaylistItems] = useState<YouTubePlaylistItem[]>(
    [],
  );
  const autoPlayNextRef = useRef<boolean>(false);
  const fetchNextPageRef = useRef<(() => Promise<any>) | null>(null);
  const hasNextPageRef = useRef<boolean>(false);

  const handleVideoSelect = useCallback(
    (videoId: string) => {
      autoPlayNextRef.current = false;
      setActiveVideoId(videoId);
      setSearchParams(
        (prev) => {
          prev.set("v", videoId);
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleVideoEnd = useCallback(() => {
    if (playlistItems.length === 0) return;
    const currentIndex = playlistItems.findIndex(
      (item) => item.videoId === activeVideoId,
    );

    if (currentIndex === -1) return;

    const nextItem = playlistItems[currentIndex + 1];

    if (nextItem) {
      autoPlayNextRef.current = true;
      setActiveVideoId(nextItem.videoId);
      setSearchParams(
        (prev) => {
          prev.set("v", nextItem.videoId);
          return prev;
        },
        { replace: true },
      );
    } else if (hasNextPageRef.current && fetchNextPageRef.current) {
      fetchNextPageRef.current().then(() => {
        setTimeout(() => {
          setPlaylistItems((prev) => {
            const currentIdx = prev.findIndex(
              (item) => item.videoId === activeVideoId,
            );
            const next = prev[currentIdx + 1];
            if (next) {
              autoPlayNextRef.current = true;
              setActiveVideoId(next.videoId);
              setSearchParams(
                (prev2) => {
                  prev2.set("v", next.videoId);
                  return prev2;
                },
                { replace: true },
              );
            }
            return prev;
          });
        }, 100);
      });
    }
  }, [playlistItems, activeVideoId, setSearchParams]);

  const handleItemsLoaded = useCallback((items: YouTubePlaylistItem[]) => {
    setPlaylistItems((prev) => {
      if (
        prev.length === items.length &&
        prev.length > 0 &&
        prev[0]?.videoId === items[0]?.videoId
      ) {
        return prev;
      }
      return items;
    });
  }, []);

  const handleFetchNextPageReady = useCallback(
    (fn: () => Promise<any>, hasNext: boolean) => {
      fetchNextPageRef.current = fn;
      hasNextPageRef.current = hasNext;
    },
    [],
  );

  useEffect(() => {
    if (initialVideoId && initialVideoId !== activeVideoId) {
      setActiveVideoId(initialVideoId);
    }
  }, [initialVideoId]);

  const hybridAutoPlay = autoPlayNextRef.current;

  return (
    <div className="space-y-4">
      {activeVideoId ? (
        <HybridYouTubePlayer
          key={activeVideoId}
          videoId={activeVideoId}
          autoPlay={hybridAutoPlay}
          onEnd={handleVideoEnd}
        />
      ) : (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <span className="text-sm text-muted-foreground font-bengali">
              প্লেলিস্ট থেকে ভিডিও নির্বাচন করুন
            </span>
          </div>
        </div>
      )}

      <YouTubePlaylistView
        playlistId={playlistId}
        activeVideoId={activeVideoId}
        onVideoSelect={handleVideoSelect}
        onItemsLoaded={handleItemsLoaded}
        onFetchNextPageReady={handleFetchNextPageReady}
      />
    </div>
  );
}
