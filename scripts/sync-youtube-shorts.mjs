import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const DEFAULT_CHANNEL_ID = 'UCTejYxFd04qma-LY0_Z17NQ';
const OUTPUT = 'src/data/youtube-shorts.json';
const channelId = process.env.YOUTUBE_CHANNEL_ID || DEFAULT_CHANNEL_ID;
const maxVideos = Number(process.env.YOUTUBE_MAX_VIDEOS || '100');
const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

const mk = (id, title, publishedAt, updatedAt, source, thumbnailUrl) => ({
  id,
  title,
  publishedAt,
  updatedAt,
  youtubeUrl: `https://www.youtube.com/watch?v=${id}`,
  shortsUrl: `https://www.youtube.com/shorts/${id}`,
  embedUrl: `https://www.youtube.com/embed/${id}`,
  thumbnailUrl: thumbnailUrl || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  source,
});

const decodeXml = (s = '') => s.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
const sortDedup = (items) => [...new Map(items.map((i) => [i.id, i])).values()].sort((a, b) => new Date(b.publishedAt || b.updatedAt || 0) - new Date(a.publishedAt || a.updatedAt || 0));

function parseRss(xml) {
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
  const videos = entries.map((entry) => {
    const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]?.trim();
    const title = decodeXml(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() || '');
    if (!id || !title) return null;
    const publishedAt = entry.match(/<published>([^<]+)<\/published>/)?.[1];
    const updatedAt = entry.match(/<updated>([^<]+)<\/updated>/)?.[1];
    const link = entry.match(/<link[^>]*href="([^"]+)"/)?.[1];
    const thumbnail = entry.match(/<media:thumbnail[^>]*url="([^"]+)"/)?.[1];
    return {
      ...mk(id, title, publishedAt, updatedAt, 'youtube-rss', thumbnail),
      youtubeUrl: link || `https://www.youtube.com/watch?v=${id}`,
    };
  }).filter(Boolean);
  return { entries: entries.length, videos };
}

async function fetchFromApi() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('YOUTUBE_API_KEY not set');

  let uploads = process.env.YOUTUBE_UPLOADS_PLAYLIST_ID;
  if (!uploads) {
    const cu = new URL('https://www.googleapis.com/youtube/v3/channels');
    cu.searchParams.set('part', 'contentDetails');
    cu.searchParams.set('id', channelId);
    cu.searchParams.set('key', key);
    const cr = await fetch(cu);
    if (!cr.ok) throw new Error(`channels.list failed: ${cr.status}`);
    const cd = await cr.json();
    uploads = cd?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  }
  if (!uploads) throw new Error('uploads playlist missing');

  const result = [];
  let nextPageToken;
  do {
    const pu = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    pu.searchParams.set('part', 'snippet,contentDetails');
    pu.searchParams.set('playlistId', uploads);
    pu.searchParams.set('maxResults', '50');
    pu.searchParams.set('key', key);
    if (nextPageToken) pu.searchParams.set('pageToken', nextPageToken);

    const pr = await fetch(pu);
    if (!pr.ok) throw new Error(`playlistItems.list failed: ${pr.status}`);
    const pd = await pr.json();

    for (const i of pd?.items || []) {
      const id = i?.contentDetails?.videoId;
      const title = i?.snippet?.title;
      if (!id || !title) continue;
      result.push(mk(id, title, i?.contentDetails?.videoPublishedAt, i?.snippet?.publishedAt, 'youtube-api', i?.snippet?.thumbnails?.high?.url));
      if (result.length >= maxVideos) break;
    }

    nextPageToken = pd?.nextPageToken;
  } while (nextPageToken && result.length < maxVideos);

  return result;
}

async function readExisting() {
  if (!existsSync(OUTPUT)) return [];
  try {
    const parsed = JSON.parse(await readFile(OUTPUT, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

(async () => {
  console.log(`[sync:youtube] channelId=${channelId}`);
  console.log(`[sync:youtube] maxVideos=${maxVideos}`);

  const existing = await readExisting();

  let videos = [];
  try {
    videos = await fetchFromApi();
    console.log(`[sync:youtube] API videos=${videos.length}`);
  } catch (apiErr) {
    console.warn(`[sync:youtube] API failed, fallback to RSS merge. reason=${apiErr.message}`);
    try {
      const res = await fetch(rssUrl);
      if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
      const { videos: rssVideos } = parseRss(await res.text());
      videos = sortDedup([...rssVideos, ...existing]).slice(0, maxVideos);
      console.log(`[sync:youtube] RSS+existing merged videos=${videos.length}`);
    } catch (rssErr) {
      console.warn(`[sync:youtube] RSS merge failed, fallback to existing JSON. reason=${rssErr.message}`);
      videos = existing;
    }
  }

  videos = sortDedup(videos).slice(0, maxVideos);
  if (videos.length === 0 && existing.length > 0) {
    videos = sortDedup(existing).slice(0, maxVideos);
  }

  await writeFile(OUTPUT, `${JSON.stringify(videos, null, 2)}
`, 'utf8');
  console.log(`[sync:youtube] wrote videos=${videos.length}`);

  if (!existsSync(OUTPUT)) throw new Error('output file missing');
  JSON.parse(await readFile(OUTPUT, 'utf8'));
})();
