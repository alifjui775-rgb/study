export type VideoSource =
  | { type: "youtube"; videoId: string }
  | { type: "youtube-playlist"; playlistId: string }
  | { type: "direct"; url: string }
  | null;

export function parseVideoSource(url: string | null | undefined): VideoSource {
  if (!url) return null;

  try {
    const trimmed = url.trim();

    // 1. Check for YouTube Playlist (youtube.com or youtu.be with list= param)
    if ((trimmed.includes("youtube.com") || trimmed.includes("youtu.be")) && trimmed.includes("list=")) {
      const urlObj = new URL(trimmed);
      const playlistId = urlObj.searchParams.get("list");
      if (playlistId) return { type: "youtube-playlist", playlistId };
    }

    // 2. Check for single YouTube Video (Handles youtu.be, watch?v=, embed/, shorts/)
    const ytRegex =
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = trimmed.match(ytRegex);

    if (match && match[1]) {
      return { type: "youtube", videoId: match[1] };
    }

    // 3. Fallback to direct video link
    return { type: "direct", url: trimmed };
  } catch (error) {
    console.error("Error parsing video URL:", error);
    return { type: "direct", url };
  }
}
