import { girihRotation, starPath } from '@/lib/girih';

type Props = {
  /** Star rotation variant, 0–7. */
  variant: number;
  size?: number;
  className?: string;
};

/**
 * A doorway: a two-centred pointed arch with an eight-point star set in the
 * tympanum. Purely decorative — the accessible name lives on the link.
 *
 * The arch is drawn as two circular arcs of radius 24 struck from (18,30) and
 * (30,30), which meets at a true cusp rather than a rounded head. Below 26px
 * the secondary tracery is dropped: at rail size it turns to mud, and a legible
 * star matters more than a complete one.
 *
 * Symmetric about its own axis, so it needs no RTL mirroring.
 */
export default function GirihDoorway({ variant, size = 40, className }: Props) {
  const rotation = girihRotation(variant);
  const detailed = size >= 26;

  return (
    <svg
      viewBox="0 0 48 64"
      width={size}
      height={(size * 64) / 48}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* Jambs and pointed head */}
      <path
        d="M7 62 V30 A24 24 0 0 1 24 6.8 A24 24 0 0 1 41 30 V62"
        fill="none"
        stroke="currentColor"
        strokeWidth={detailed ? 1.5 : 2.2}
        strokeLinejoin="miter"
        opacity="0.45"
      />
      {detailed && (
        <path
          d="M13 62 V32 A18 18 0 0 1 24 15 A18 18 0 0 1 35 32 V62"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.25"
        />
      )}
      {/* The khātam, filling the head */}
      <path
        d={starPath(24, 33, detailed ? 11 : 12.5, rotation)}
        fill="currentColor"
      />
      {detailed && (
        <path
          d={starPath(24, 33, 5.4, rotation + 22.5)}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.45"
        />
      )}
      {/* Threshold */}
      <line
        x1="4"
        y1="62"
        x2="44"
        y2="62"
        stroke="currentColor"
        strokeWidth={detailed ? 1.5 : 2.2}
        opacity="0.45"
      />
    </svg>
  );
}
