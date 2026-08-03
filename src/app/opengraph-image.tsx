import { ImageResponse } from 'next/og';
import { starPath } from '@/lib/girih';

/**
 * The card X, Slack, iMessage and every link preview will render.
 *
 * Generated rather than committed as a PNG so it cannot drift from the palette
 * — the star comes from the same `starPath` the app draws with.
 */
export const alt = 'Sahn — sourced and cited, never decreed';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#10202B';
const STONE = '#F2EDE4';
const GLAZE = '#2C8D88';

/**
 * Fraunces, fetched at render time. If the fetch fails the card still renders —
 * satori falls back to its default face rather than throwing, and a slightly
 * off-brand preview beats a broken one.
 */
async function displayFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500&display=swap',
      { headers: { 'user-agent': 'Mozilla/5.0' } }
    ).then((r) => r.text());
    const url = /src:\s*url\((https:[^)]+\.(?:ttf|woff2?))\)/.exec(css)?.[1];
    if (!url) return null;
    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function Image() {
  const font = await displayFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: INK,
          padding: '0 96px',
          position: 'relative'
        }}
      >
        {/* The courtyard star, bled off the trailing edge as a watermark. */}
        <svg
          width="620"
          height="620"
          viewBox="0 0 400 400"
          style={{ position: 'absolute', right: -150, top: 5, opacity: 0.09 }}
        >
          <path d={starPath(200, 200, 195, 0)} fill={STONE} />
        </svg>

        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <svg width="86" height="86" viewBox="0 0 200 200">
            <path d={starPath(100, 100, 96, 0)} fill={GLAZE} />
          </svg>
          <div
            style={{
              fontSize: 92,
              color: STONE,
              fontFamily: font ? 'Fraunces' : 'serif',
              letterSpacing: -2
            }}
          >
            Sahn
          </div>
        </div>

        <div style={{ fontSize: 40, color: STONE, marginTop: 40, maxWidth: 820 }}>
          An assistant that retrieves and cites.
        </div>
        <div style={{ fontSize: 30, color: '#9AABB4', marginTop: 18, maxWidth: 860 }}>
          Prayer times, the Qur&apos;an, duas and zakat — and answers on Islamic
          law that trace to a named source and school, or are not given.
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: 'Fraunces', data: font, weight: 500 as const, style: 'normal' as const }]
        : []
    }
  );
}
