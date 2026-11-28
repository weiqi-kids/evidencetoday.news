import { describe, it, expect } from 'vitest';
import { resolveTopicCover } from './topic-cover';
import type { Topic } from '@/data/topics';

const topic = (slug: string, keywords: string[]): Topic => ({
  slug,
  name: slug,
  intro: '',
  thirtySecond: [],
  matchKeywords: keywords,
  faq: [],
});

// 同一篇文章同時比對到兩個專題（例如「兒童保健品」同時含魚油與維生素 D）
const shared = { data: { title: '魚油 維生素 D 兒童保健品', coverImage: 'https://example.com/shared.jpg' } };
const fishOnly = { data: { title: '魚油怎麼挑', coverImage: 'https://example.com/fish.jpg' } };
const dOnly = { data: { title: '維生素 D 怎麼補', coverImage: 'https://example.com/d.jpg' } };

describe('resolveTopicCover', () => {
  it('不傳 used 時維持舊行為：取第一個比對到的封面', () => {
    const a = resolveTopicCover(topic('omega', ['魚油']), [[shared, fishOnly]]);
    const b = resolveTopicCover(topic('vitd', ['維生素 d']), [[shared, dOnly]]);
    expect(a.src).toBe('https://example.com/shared.jpg');
    expect(b.src).toBe('https://example.com/shared.jpg');
  });

  it('傳入共用集合時，第二個專題跳過已用過的封面', () => {
    const used = new Set<string>();
    const a = resolveTopicCover(topic('omega', ['魚油']), [[shared, fishOnly, dOnly]], used);
    const b = resolveTopicCover(topic('vitd', ['維生素 d']), [[shared, fishOnly, dOnly]], used);
    expect(a.src).toBe('https://example.com/shared.jpg');
    expect(b.src).toBe('https://example.com/d.jpg');
  });

  it('所有候選都用過時退回重複圖，不退成品牌佔位', () => {
    const used = new Set<string>(['https://example.com/shared.jpg']);
    const b = resolveTopicCover(topic('vitd', ['維生素 d']), [[shared]], used);
    expect(b.src).toBe('https://example.com/shared.jpg');
  });
});
