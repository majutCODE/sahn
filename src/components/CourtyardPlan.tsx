import { starPath } from '@/lib/girih';

type Props = {
  className?: string;
};

/**
 * The sahn seen from above: an open square, an arcade of openings on all four
 * sides, a star at the centre where the fountain sits. This is the product's
 * plan drawing — the rail is the same figure unrolled.
 *
 * Decorative; the page supplies the heading and links.
 */
export default function CourtyardPlan({ className }: Props) {
  const piers = [0, 1, 2, 3, 4, 5, 6];

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* Outer wall */}
      <rect
        x="8"
        y="8"
        width="184"
        height="184"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        opacity="0.55"
      />
      {/* Arcade line — the covered walk */}
      <rect
        x="30"
        y="30"
        width="140"
        height="140"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.35"
      />
      {/* Openings: piers spaced along each side of the arcade */}
      {piers.map((i) => {
        const t = 30 + ((i + 1) * 140) / 8;
        return (
          <g key={i} stroke="currentColor" strokeWidth="0.9" opacity="0.3">
            <line x1={t} y1="8" x2={t} y2="30" />
            <line x1={t} y1="170" x2={t} y2="192" />
            <line x1="8" y1={t} x2="30" y2={t} />
            <line x1="170" y1={t} x2="192" y2={t} />
          </g>
        );
      })}
      {/* Water */}
      <circle
        cx="100"
        cy="100"
        r="34"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        opacity="0.3"
      />
      <path d={starPath(100, 100, 26, 0)} fill="currentColor" opacity="0.16" />
      <path
        d={starPath(100, 100, 26, 22.5)}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        opacity="0.5"
      />
      <path d={starPath(100, 100, 10, 0)} fill="currentColor" opacity="0.7" />
    </svg>
  );
}
