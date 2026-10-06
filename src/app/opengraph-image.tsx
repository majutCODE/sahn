import { ImageResponse } from 'next/og';
import { FRAUNCES_500_BASE64 } from './_fonts/fraunces';
import { starPath } from '@/lib/girih';

/**
 * The card X, Slack, iMessage and every link preview will render.
 *
 * Generated rather than committed as a PNG so it cannot drift from the palette
 *, the star comes from the same `starPath` the app draws with.
 */
export const alt = 'Sahn, sourced and cited, never decreed';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#10202B';
const STONE = '#F2EDE4';
const GLAZE = '#2C8D88';

/** Decoded once per render. See _fonts/fraunces.ts for why it is inlined. */
function displayFont(): ArrayBuffer {
  const binary = Buffer.from(FRAUNCES_500_BASE64, 'base64');
  return binary.buffer.slice(
    binary.byteOffset,
    binary.byteOffset + binary.byteLength
  ) as ArrayBuffer;
}

export default async function Image() {
  const font = displayFont();

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
              fontFamily: 'Fraunces',
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
          Prayer times, the Qur&apos;an, duas and zakat, and answers on Islamic
          law that trace to a named source and school, or are not given.
        </div>
      </div>
    ),
    {
      ...size,
      // Always a real font. An empty array here is what threw.
      fonts: [
        { name: 'Fraunces', data: font, weight: 500 as const, style: 'normal' as const }
      ]
    }
  );
}
