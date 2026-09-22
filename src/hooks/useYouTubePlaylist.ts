import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchPlaylistItems, type YouTubePlaylistItem } from "@/lib/youtube";

interface UseYouTubePlaylistOptions {
  playlistId: string | null;
  enabled?: boolean;
}

interface PlaylistPage {
  items: YouTubePlaylistItem[];
  nextPageToken?: string;
}

export function useYouTubePlaylist({ playlistId, enabled = true }: UseYouTubePlaylistOptions) {
  return useInfiniteQuery<PlaylistPage>({
    queryKey: ["youtube-playlist", playlistId],
    queryFn: ({ pageParam }) =>
      fetchPlaylistItems(playlistId!, pageParam as string | undefined),
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    initialPageParam: undefined as string | undefined,
    enabled: !!playlistId && enabled,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

export function flattenPlaylistPages(
  pages: PlaylistPage[] | undefined,
): YouTubePlaylistItem[] {
  if (!pages) return [];
  return pages.flatMap((page) => page.items);
}
