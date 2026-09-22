import { useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubeIFramePlayerProps {
  videoId: string;
  onEnd?: () => void;
  onReady?: () => void;
}

let apiLoadingPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }

  if (apiLoadingPromise) return apiLoadingPromise;

  apiLoadingPromise = new Promise<void>((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      resolve();
    };
  });

  return apiLoadingPromise;
}

export function YouTubeIFramePlayer({
  videoId,
  onEnd,
  onReady,
}: YouTubeIFramePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const onEndRef = useRef(onEnd);
  const onReadyRef = useRef(onReady);

  onEndRef.current = onEnd;
  onReadyRef.current = onReady;

  const handleEnd = useCallback(() => {
    onEndRef.current?.();
  }, []);

  useEffect(() => {
    let destroyed = false;

    loadYouTubeAPI().then(() => {
      if (destroyed || !containerRef.current) return;

      if (playerRef.current) {
        try {
          playerRef.current.loadVideoById({ videoId, autoplay: 1 });
        } catch {
          playerRef.current = null;
        }
      }

      if (!playerRef.current || !playerRef.current.getIframe) {
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              onReadyRef.current?.();
            },
            onStateChange: (event: any) => {
              if (event.data === 0) {
                handleEnd();
              }
            },
          },
        });
      }
    });

    return () => {
      destroyed = true;
      if (playerRef.current) {
        try {
          if (typeof playerRef.current.destroy === "function") {
            playerRef.current.destroy();
          }
        } catch {}
        playerRef.current = null;
      }
    };
  }, [videoId, handleEnd]);

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
