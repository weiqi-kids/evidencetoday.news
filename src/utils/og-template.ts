import satori from 'satori';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadFonts } from './og-fonts';

let logoDataUriCache: string | null = null;

async function loadLogoDataUri(): Promise<string> {
  if (logoDataUriCache) return logoDataUriCache;
  const buf = await readFile(join(process.cwd(), 'public/images/brand/logo-icon.png'));
  logoDataUriCache = `data:image/png;base64,${buf.toString('base64')}`;
  return logoDataUriCache;
}

const CATEGORY_LABELS: Record<string, string> = {
  articles: '深度文章',
  myths: '迷思查核',
  ingredients: '原料檢視',
  podcasts: 'Podcast',
  videos: '影片',
};

const CATEGORY_COLORS: Record<string, string> = {
  articles: '#2d8185',
  myths: '#b85a3a',
  ingredients: '#3a8a4a',
  podcasts: '#6a5aad',
  videos: '#8a7030',
};

const TEAL_HEX = '#1a6b6e';

// Satori doesn't support -webkit-line-clamp. Truncate title to ~2 lines.
// At 48px font, ~1040px usable width, CJK chars are ~48px each → ~21 chars/line → 42 for 2 lines.
// Mixed CJK/Latin: use 50 as safe limit.
function truncateTitle(title: string, maxLen = 50): string {
  if (title.length <= maxLen) return title;
  return title.slice(0, maxLen - 1) + '…';
}

export async function generateOgSvg(title: string, collection: string): Promise<string> {
  const fonts = await loadFonts();
  const displayTitle = truncateTitle(title);
  const label = CATEGORY_LABELS[collection];
  const pillColor = CATEGORY_COLORS[collection] || TEAL_HEX;

  const markup = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '1200px',
        height: '630px',
        backgroundColor: TEAL_HEX,
        padding: '60px 80px',
      },
      children: [
        ...(label
          ? [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    marginBottom: '24px',
                  },
                  children: {
                    type: 'span',
                    props: {
                      style: {
                        backgroundColor: pillColor,
                        color: 'white',
                        padding: '6px 20px',
                        borderRadius: '9999px',
                        fontSize: '20px',
                        fontWeight: 700,
                      },
                      children: label,
                    },
                  },
                },
              },
            ]
          : []),
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              color: 'white',
              fontSize: '48px',
              fontWeight: 700,
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
            children: displayTitle,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              marginTop: 'auto',
              borderTop: '1px solid rgba(255, 255, 255, 0.4)',
              paddingTop: '20px',
            },
            children: {
              type: 'span',
              props: {
                style: {
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 400,
                },
                children: '本日有據 Evidence Today',
              },
            },
          },
        },
      ],
    },
  };

  return satori(markup as any, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Noto Sans TC',
        data: fonts.regular,
        weight: 400,
        style: 'normal' as const,
      },
      {
        name: 'Noto Sans TC',
        data: fonts.bold,
        weight: 700,
        style: 'normal' as const,
      },
    ],
  });
}

// 判讀色帶顏色：對應 src/utils/myths/schema.ts VERDICT_META 的 tone，
// 手動取 src/styles/variables.css 對應 oklch token 的近似 hex（satori 不支援 oklch()）。
const VERDICT_BAND_COLORS: Record<string, string> = {
  positive: '#2f7d52', // --color-verdict-true
  negative: '#a83f2a', // --color-verdict-false
  neutral: '#55697c', // --color-verdict-insufficient
  context: '#8a6a2a', // --color-verdict-contextual
  caution: '#a8502f', // --color-cat-myth
  warning: '#c65a35', // --color-coral
};

interface MythOgInput {
  title: string;
  verdictLabel: string; // 已轉換好的顯示字串，如「須謹慎」
  verdictTone: string; // VERDICT_META[verdict].tone
  evidenceLevel: string;
}

function truncateMythTitle(title: string, maxLen = 32): string {
  if (title.length <= maxLen) return title;
  return title.slice(0, maxLen - 1) + '…';
}

// 闢謠單篇專屬 OG：白底題目區 + 判讀色滿版底欄，讓分享出去的 LINE 卡片直接秀出
// 這篇的判讀結果與證據強度，而非全站共用一張「迷思查證」分類圖。
// 由 src/pages/og/myths/[slug].png.ts 在 build 時逐篇呼叫、輸出成靜態 png route。
export async function generateMythOgSvg({ title, verdictLabel, verdictTone, evidenceLevel }: MythOgInput): Promise<string> {
  const fonts = await loadFonts();
  const logo = await loadLogoDataUri();
  const displayTitle = truncateMythTitle(title);
  const bandColor = VERDICT_BAND_COLORS[verdictTone] || VERDICT_BAND_COLORS.caution;

  const brandRow = {
    type: 'div',
    props: {
      style: { display: 'flex', alignItems: 'center', gap: '16px' },
      children: [
        { type: 'img', props: { src: logo, width: 52, height: 52 } },
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'baseline', gap: '12px' },
            children: [
              { type: 'span', props: { style: { fontSize: '30px', fontWeight: 700, color: '#22303a' }, children: '本日有據' } },
              { type: 'span', props: { style: { fontSize: '22px', color: 'rgba(34,48,58,0.6)' }, children: 'Evidence Today' } },
            ],
          },
        },
      ],
    },
  };

  const markup = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '1200px',
        height: '630px',
        backgroundColor: 'white',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column', flex: 1, padding: '48px 68px 0' },
            children: [
              {
                type: 'div',
                props: {
                  style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
                  children: [
                    brandRow,
                    {
                      type: 'span',
                      props: {
                        style: {
                          display: 'flex',
                          backgroundColor: '#b95b3b',
                          color: 'white',
                          padding: '8px 24px',
                          borderRadius: '9999px',
                          fontSize: '24px',
                          fontWeight: 700,
                        },
                        children: '迷思查證',
                      },
                    },
                  ],
                },
              },
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flex: 1, alignItems: 'center' },
                  children: {
                    type: 'span',
                    props: {
                      style: { display: 'flex', fontSize: '68px', fontWeight: 700, color: '#22303a', lineHeight: 1.3 },
                      children: displayTitle,
                    },
                  },
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              backgroundColor: bandColor,
              padding: '30px 68px',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
            children: [
              {
                type: 'span',
                props: { style: { display: 'flex', fontSize: '52px', fontWeight: 700, color: 'white' }, children: `判讀：${verdictLabel}` },
              },
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' },
                  children: [
                    {
                      type: 'span',
                      props: { style: { display: 'flex', fontSize: '28px', fontWeight: 700, color: 'rgba(255,255,255,0.95)' }, children: `證據強度：${evidenceLevel}` },
                    },
                    {
                      type: 'span',
                      props: { style: { display: 'flex', fontSize: '22px', color: 'rgba(255,255,255,0.8)' }, children: 'evidencetoday.news' },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };

  return satori(markup as any, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Noto Sans TC', data: fonts.regular, weight: 400, style: 'normal' as const },
      { name: 'Noto Sans TC', data: fonts.bold, weight: 700, style: 'normal' as const },
    ],
  });
}

interface MythSquareCardInput {
  title: string;
  verdictLabel: string;
  verdictTone: string;
  evidenceLevel: string;
  summary: string;
}

function truncateSummary(text: string, maxLen = 78): string {
  const cleaned = text.trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen - 1) + '…';
}

// 闢謠「儲存圖卡」：1080x1080 正方形，供讀者下載後直接在 LINE／群組貼圖分享，
// 圖上帶標題、判讀結論與網址，即使脫離原始連結轉傳也能看懂重點、找得回來源。
// 由 src/pages/og/myths/[slug]-square.png.ts 在 build 時逐篇生成。
export async function generateMythSquareCardSvg({ title, verdictLabel, verdictTone, evidenceLevel, summary }: MythSquareCardInput): Promise<string> {
  const fonts = await loadFonts();
  const logo = await loadLogoDataUri();
  const displayTitle = truncateMythTitle(title, 28);
  const displaySummary = truncateSummary(summary);
  const bandColor = VERDICT_BAND_COLORS[verdictTone] || VERDICT_BAND_COLORS.caution;

  const pill = (text: string, bg: string, fg = 'white') => ({
    type: 'span',
    props: {
      style: { display: 'flex', backgroundColor: bg, color: fg, padding: '14px 32px', borderRadius: '9999px', fontSize: '34px', fontWeight: 700 },
      children: text,
    },
  });

  const markup = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '1080px',
        height: '1080px',
        backgroundColor: '#faf6ef',
        padding: '64px 72px',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', gap: '18px' },
            children: [
              { type: 'img', props: { src: logo, width: 56, height: 56 } },
              { type: 'span', props: { style: { fontSize: '32px', fontWeight: 700, color: '#22303a' }, children: '本日有據' } },
              { type: 'span', props: { style: { fontSize: '24px', color: 'rgba(34,48,58,0.6)' }, children: 'Evidence Today' } },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', marginTop: '44px' },
            children: pill('迷思查證', '#b95b3b'),
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', marginTop: '36px' },
            children: {
              type: 'span',
              props: { style: { display: 'flex', fontSize: '58px', fontWeight: 700, color: '#22303a', lineHeight: 1.35 }, children: displayTitle },
            },
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', gap: '16px', marginTop: '40px' },
            children: [pill(`判讀：${verdictLabel}`, bandColor), pill(`證據強度：${evidenceLevel}`, 'rgba(34,48,58,0.08)', '#22303a')],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              marginTop: '40px',
              paddingTop: '40px',
              borderTop: '2px solid rgba(34,48,58,0.12)',
            },
            children: {
              type: 'span',
              props: { style: { display: 'flex', fontSize: '36px', color: 'rgba(34,48,58,0.82)', lineHeight: 1.55 }, children: displaySummary },
            },
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', marginTop: 'auto', justifyContent: 'space-between', alignItems: 'center' },
            children: [
              { type: 'span', props: { style: { fontSize: '28px', color: 'rgba(34,48,58,0.55)' }, children: '完整查證看本日有據' } },
              { type: 'span', props: { style: { fontSize: '30px', fontWeight: 700, color: '#1f6f72' }, children: 'evidencetoday.news' } },
            ],
          },
        },
      ],
    },
  };

  return satori(markup as any, {
    width: 1080,
    height: 1080,
    fonts: [
      { name: 'Noto Sans TC', data: fonts.regular, weight: 400, style: 'normal' as const },
      { name: 'Noto Sans TC', data: fonts.bold, weight: 700, style: 'normal' as const },
    ],
  });
}

interface AuthorOgInput {
  name: string;
  subtitle: string;
  badge: string;
  tagline: string;
}

// 作者頁專屬文字 OG（人物卡，無人臉）。版面沿用分類模板的 teal 底與品牌頁尾。
// 由 scripts/generate-author-og.ts 一次性柵格化為 /og-static/author-luo-yang.png。
export async function generateAuthorOgSvg({ name, subtitle, badge, tagline }: AuthorOgInput): Promise<string> {
  const fonts = await loadFonts();

  const markup = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '1200px',
        height: '630px',
        backgroundColor: TEAL_HEX,
        padding: '60px 80px',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', marginBottom: '28px' },
            children: {
              type: 'span',
              props: {
                style: {
                  backgroundColor: 'rgba(255, 255, 255, 0.16)',
                  color: 'white',
                  padding: '6px 20px',
                  borderRadius: '9999px',
                  fontSize: '22px',
                  fontWeight: 700,
                },
                children: badge,
              },
            },
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              color: 'white',
              fontSize: '104px',
              fontWeight: 700,
              lineHeight: 1.1,
            },
            children: name,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              color: 'rgba(255, 255, 255, 0.92)',
              fontSize: '40px',
              fontWeight: 400,
              marginTop: '20px',
            },
            children: subtitle,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              color: 'rgba(255, 255, 255, 0.82)',
              fontSize: '32px',
              fontWeight: 400,
              marginTop: '14px',
            },
            children: tagline,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              marginTop: 'auto',
              borderTop: '1px solid rgba(255, 255, 255, 0.4)',
              paddingTop: '20px',
            },
            children: {
              type: 'span',
              props: {
                style: { color: 'white', fontSize: '24px', fontWeight: 400 },
                children: '本日有據 Evidence Today',
              },
            },
          },
        },
      ],
    },
  };

  return satori(markup as any, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Noto Sans TC',
        data: fonts.regular,
        weight: 400,
        style: 'normal' as const,
      },
      {
        name: 'Noto Sans TC',
        data: fonts.bold,
        weight: 700,
        style: 'normal' as const,
      },
    ],
  });
}
