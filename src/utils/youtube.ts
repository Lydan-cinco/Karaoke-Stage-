/**
 * YouTube utility helpers for parsing URLs and video IDs
 */

export function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // If it's already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex for standard URLs, youtu.be, embed, shorts, music.youtube
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/i,
    /music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function getYouTubeThumbnail(videoId: string, quality: 'hq' | 'max' = 'hq'): string {
  if (!videoId) return '';
  return quality === 'max'
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function buildYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
}

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
  duration?: string;
}

// In-memory caches to make typing and auto-suggestions instant
const suggestionsCache = new Map<string, string[]>();
const searchResultsCache = new Map<string, YouTubeSearchResult[]>();

export async function fetchYouTubeSuggestions(query: string): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];
  if (suggestionsCache.has(q)) {
    return suggestionsCache.get(q)!;
  }

  try {
    const res = await fetch(`/api/youtube-suggest?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data.suggestions) ? data.suggestions : [];
      suggestionsCache.set(q, list);
      return list;
    }
  } catch (err) {
    console.warn('Error fetching YouTube suggestions:', err);
  }

  return [];
}

export async function searchYouTubeVideos(query: string): Promise<YouTubeSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  if (searchResultsCache.has(q)) {
    return searchResultsCache.get(q)!;
  }

  try {
    const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      const list: YouTubeSearchResult[] = Array.isArray(data.results) ? data.results : [];
      searchResultsCache.set(q, list);
      return list;
    }
  } catch (err) {
    console.warn('Error searching YouTube videos:', err);
  }

  return [];
}

export async function fetchYouTubeVideoInfo(videoIdOrUrl: string): Promise<YouTubeVideoInfo> {
  const videoId = extractYouTubeId(videoIdOrUrl) || videoIdOrUrl.trim();
  
  // Try server endpoint first
  try {
    const res = await fetch(`/api/youtube-info?id=${encodeURIComponent(videoId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.title) {
        return {
          videoId,
          title: data.title,
          artist: data.artist || 'Karaoke',
          thumbnailUrl: data.thumbnailUrl || getYouTubeThumbnail(videoId),
        };
      }
    }
  } catch {
    // try direct YouTube oembed if server endpoint is not accessible
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      if (oembedRes.ok) {
        const d = (await oembedRes.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
        return {
          videoId,
          title: d.title || `YouTube Video (${videoId})`,
          artist: d.author_name || 'YouTube Video',
          thumbnailUrl: d.thumbnail_url || getYouTubeThumbnail(videoId),
        };
      }
    } catch {
      // fallback
    }
  }

  return {
    videoId,
    title: `YouTube Karaoke Track (${videoId})`,
    artist: 'Karaoke Video',
    thumbnailUrl: getYouTubeThumbnail(videoId),
  };
}

