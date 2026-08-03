import { ImageResponse } from 'next/og';
import { starPath } from '@/lib/girih';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Home-screen icon. iOS applies its own mask, so this is drawn full-bleed. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#10202B'
        }}
      >
        <svg width="132" height="132" viewBox="0 0 200 200">
          <path d={starPath(100, 100, 96, 0)} fill="#F2EDE4" />
        </svg>
      </div>
    ),
    size
  );
}
