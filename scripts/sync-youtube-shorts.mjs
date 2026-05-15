import { writeFile } from 'node:fs/promises';

const EXPECTED_CHANNEL_ID = 'UCTejYxFd04qma-LY0_Z17NQ';
const EXPECTED_CHANNEL_TITLE = '本日有據影音';
const OUTPUT = 'src/data/youtube-shorts.json';
const channelId = process.env.YOUTUBE_CHANNEL_ID || EXPECTED_CHANNEL_ID;
const parsedMax = Number(process.env.YOUTUBE_MAX_VIDEOS ?? '500');
const maxVideos = Number.isFinite(parsedMax) && parsedMax >= 0 ? parsedMax : 500;
const unlimited = maxVideos === 0;

const isCI = process.env.GITHUB_ACTIONS === 'true';
const hasKey = !!process.env.YOUTUBE_API_KEY;

const mk = (id, title, publishedAt, updatedAt, thumbnailUrl) => ({
  id,
  title,
  publishedAt,
  updatedAt,
  youtubeUrl: `https://www.youtube.com/watch?v=${id}`,
  shortsUrl: `https://www.youtube.com/shorts/${id}`,
  embedUrl: `https://www.youtube.com/embed/${id}`,
  thumbnailUrl: thumbnailUrl || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  source: 'youtube-api',
});

const sortDedup = (items) => [...new Map(items.map((i) => [i.id, i])).values()].sort((a, b) => new Date(b.publishedAt || b.updatedAt || 0) - new Date(a.publishedAt || a.updatedAt || 0));

function isAllowed(item) {
  const id = item?.contentDetails?.videoId;
  const rawTitle = item?.snippet?.title;
  const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
  if (!id || !title) return { ok: false, reason: 'invalid' };
  if (title === 'Private video') return { ok: false, reason: 'private' };
  if (title === 'Deleted video') return { ok: false, reason: 'deleted' };
  return { ok: true, reason: null };
}

async function fetchFromApi() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('YOUTUBE_API_KEY is not set');

  console.log('Using YouTube Data API.');
  console.log(`Channel ID: ${channelId}`);
  console.log(`YOUTUBE_MAX_VIDEOS: ${maxVideos}`);

  const cu = new URL('https://www.googleapis.com/youtube/v3/channels');
  cu.searchParams.set('part', 'snippet,contentDetails');
  cu.searchParams.set('id', channelId);
  cu.searchParams.set('key', key);

  const cr = await fetch(cu);
  if (!cr.ok) throw new Error(`channels.list failed: ${cr.status}`);
  const cd = await cr.json();

  const ch = cd?.items?.[0];
  const channelTitle = ch?.snippet?.title;
  const uploads = ch?.contentDetails?.relatedPlaylists?.uploads;

  console.log(`channels.list title: ${channelTitle || '(missing)'}`);
  console.log(`Uploads playlist ID: ${uploads || '(missing)'}`);

  if (!uploads) throw new Error('uploads playlist missing');
  if (channelId !== EXPECTED_CHANNEL_ID) throw new Error(`Unexpected YOUTUBE_CHANNEL_ID: ${channelId}`);
  if (channelTitle !== EXPECTED_CHANNEL_TITLE) throw new Error(`Channel title mismatch: expected "${EXPECTED_CHANNEL_TITLE}", got "${channelTitle}"`);

  const allItems = [];
  let page = 0;
  let nextPageToken;

  while (true) {
    page += 1;
    const pu = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    pu.searchParams.set('part', 'snippet,contentDetails');
    pu.searchParams.set('playlistId', uploads);
    pu.searchParams.set('maxResults', '50');
    pu.searchParams.set('key', key);
    if (nextPageToken) pu.searchParams.set('pageToken', nextPageToken);

    const pr = await fetch(pu);
    if (!pr.ok) throw new Error(`playlistItems.list failed: ${pr.status}`);
    const pd = await pr.json();

    const pageItems = pd?.items || [];
    allItems.push(...pageItems);
    console.log(`Fetched playlist page ${page}: ${pageItems.length} items`);

    nextPageToken = pd?.nextPageToken;
    if (!nextPageToken) {
      console.log('No nextPageToken. Stop.');
      break;
    }

    if (!unlimited && allItems.length >= maxVideos) {
      console.log(`Reached YOUTUBE_MAX_VIDEOS (${maxVideos}). Stop pagination.`);
      break;
    }
  }

  console.log(`Total fetched from API: ${allItems.length}`);

  const counters = { private: 0, deleted: 0, invalid: 0 };
  const filtered = [];
  for (const i of allItems) {
    const status = isAllowed(i);
    if (!status.ok) {
      counters[status.reason] += 1;
      continue;
    }
    filtered.push(mk(i.contentDetails.videoId, i.snippet.title.trim(), i?.contentDetails?.videoPublishedAt, i?.snippet?.publishedAt, i?.snippet?.thumbnails?.high?.url));
  }

  console.log(`Filtered out private/deleted/invalid: ${counters.private + counters.deleted + counters.invalid} (private=${counters.private}, deleted=${counters.deleted}, invalid=${counters.invalid})`);
  const deduped = sortDedup(filtered);
  console.log(`After dedupe: ${deduped.length}`);

  return unlimited ? deduped : deduped.slice(0, maxVideos);
}

(async () => {
  if (!isCI && !hasKey) {
    console.log('Skipping YouTube sync: not in GitHub Actions and YOUTUBE_API_KEY is not set.');
    console.log(`Writing empty placeholder to ${OUTPUT} so astro build can import it.`);
    await writeFile(OUTPUT, '[]\n', 'utf8');
    return;
  }

  const videos = await fetchFromApi();
  await writeFile(OUTPUT, `${JSON.stringify(videos, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${OUTPUT} with ${videos.length} videos`);
})();
