/** YouTube ID from watch, embed, shorts, or bare 11-char id. */
export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = trimmed.match(regExp);
    if (match && match[2].length === 11) {
      return match[2];
    }
  } catch {
    // ignore
  }
  return null;
}

/** Third-party embed pages (not direct video files). */
export function isEmbedUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();

  if (getYouTubeId(url)) return false;

  const isDirectVideo =
    trimmed.includes('.mp4') ||
    trimmed.includes('.webm') ||
    trimmed.includes('.ogg') ||
    trimmed.includes('.m3u8') ||
    trimmed.startsWith('data:video');

  return trimmed.startsWith('http') && !isDirectVideo;
}

/** Normalize watch URLs to HTTPS embed-friendly URLs. */
export function getCleanEmbedUrl(url: string): string {
  if (!url) return '';
  let trimmed = url.trim();

  if (trimmed.startsWith('http://')) {
    trimmed = trimmed.replace('http://', 'https://');
  }

  const ytId = getYouTubeId(trimmed);
  if (ytId) {
    return `https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1`;
  }

  if (trimmed.includes('moviebox') && trimmed.includes('/watch/')) {
    return trimmed.replace('/watch/', '/embed/');
  }

  return trimmed;
}
