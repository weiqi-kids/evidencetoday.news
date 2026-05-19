import type { CollectionEntry } from 'astro:content';

export type PodcastEntry = CollectionEntry<'podcasts'>;

export function stripPodcastSlug(id: string): string {
  return id.replace(/\.[^.]+$/, '');
}

export function parseDurationToIso(duration: string): string {
  const parts = duration.split(':').map((part) => Number.parseInt(part, 10));

  if (parts.some((part) => Number.isNaN(part) || part < 0)) {
    return 'PT0S';
  }

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    [hours, minutes, seconds] = parts;
  } else if (parts.length === 2) {
    [minutes, seconds] = parts;
  } else if (parts.length === 1) {
    [seconds] = parts;
  } else {
    return 'PT0S';
  }

  const iso = `PT${hours > 0 ? `${hours}H` : ''}${minutes > 0 ? `${minutes}M` : ''}${seconds > 0 ? `${seconds}S` : ''}`;

  return iso === 'PT' ? 'PT0S' : iso;
}

function qualityScore(entry: PodcastEntry): number {
  const { data, body } = entry;
  return [
    data.summary ? 2 : 0,
    data.keyPoints?.length ? 2 : 0,
    data.showNotes?.length ? 1 : 0,
    data.chapters?.length ? 1 : 0,
    body?.length > 100 ? 1 : 0,
    data.audioUrl || data.embedUrl ? 1 : 0,
  ].reduce((acc, val) => acc + val, 0);
}

export function getPodcastSortDate(entry: PodcastEntry): Date {
  return entry.data.updatedDate ?? entry.data.publishDate;
}

export function getPublishedPodcasts(entries: PodcastEntry[]): PodcastEntry[] {
  const visible = entries.filter((entry) => !entry.data.draft && entry.data.title && (entry.data.audioUrl || entry.data.embedUrl));
  const byEpisode = new Map<string, PodcastEntry>();

  for (const entry of visible) {
    const key = entry.data.episodeNumber ? `ep-${entry.data.episodeNumber}` : `slug-${stripPodcastSlug(entry.id)}`;
    const existing = byEpisode.get(key);

    if (!existing || qualityScore(entry) > qualityScore(existing) || getPodcastSortDate(entry) > getPodcastSortDate(existing)) {
      byEpisode.set(key, entry);
    }
  }

  return [...byEpisode.values()].sort((a, b) => getPodcastSortDate(b).getTime() - getPodcastSortDate(a).getTime());
}
