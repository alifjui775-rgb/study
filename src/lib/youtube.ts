const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export interface YouTubePlaylistItem {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt: string;
  position: number;
}

interface PlaylistItemsResponse {
  items: {
    id: string;
    snippet: {
      title: string;
      channelTitle: string;
      publishedAt: string;
      position: number;
      thumbnails: {
        default?: { url: string };
        medium?: { url: string };
        high?: { url: string };
        standard?: { url: string };
        maxres?: { url: string };
      };
    };
    contentDetails: {
      videoId: string;
      videoPublishedAt: string;
    };
    status: {
      privacyStatus: string;
    };
  }[];
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

function getApiKey(): string {
  const key = import.meta.env.VITE_YOUTUBE_API_KEY;
  if (!key) {
    console.warn(
      "VITE_YOUTUBE_API_KEY is not set. YouTube playlist features will be disabled.",
    );
  }
  return key || "";
}

function pickBestThumbnail(
  thumbnails: Record<string, { url: string } | undefined>,
): string {
  return (
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    ""
  );
}

export async function fetchPlaylistItems(
  playlistId: string,
  pageToken?: string,
): Promise<{ items: YouTubePlaylistItem[]; nextPageToken?: string; totalResults: number }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { items: [], nextPageToken: undefined, totalResults: 0 };
  }

  const params = new URLSearchParams({
    part: "snippet,contentDetails,status",
    playlistId,
    maxResults: "50",
    key: apiKey,
  });

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const response = await fetch(`${YOUTUBE_API_BASE}/playlistItems?${params}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("YouTube API error:", response.status, error);
    throw new Error(
      error?.error?.message || `YouTube API request failed: ${response.status}`,
    );
  }

  const data: PlaylistItemsResponse = await response.json();

  const items: YouTubePlaylistItem[] = data.items
    .filter((item) => {
      const status = item.status?.privacyStatus;
      return status === "public" || status === "unlisted";
    })
    .map((item) => ({
      videoId: item.contentDetails.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl: pickBestThumbnail(item.snippet.thumbnails),
      publishedAt: item.contentDetails.videoPublishedAt,
      position: item.snippet.position,
    }));

  return {
    items,
    nextPageToken: data.nextPageToken,
    totalResults: data.pageInfo.totalResults,
  };
}
