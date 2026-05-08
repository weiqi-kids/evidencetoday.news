import satori from 'satori';
import { loadFonts } from './og-fonts';

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
