/**
 * Geometry for the eight-point girih star (khātam) that every doorway in the
 * courtyard is cut from. Not a rounded card, not an icon set — one construction
 * with eight rotations, so the rail reads as a single tiled surface.
 *
 * The {8/3} star polygon: eight outer points, eight inner vertices at
 * cos(3π/8) / cos(π/8) ≈ 0.4142 of the outer radius. That ratio is what makes
 * the points sharp enough to read as zellige rather than a flower.
 */

export const GIRIH_INNER_RATIO = Math.cos((3 * Math.PI) / 8) / Math.cos(Math.PI / 8);

export type Point = { x: number; y: number };

export function starPoints(
  cx: number,
  cy: number,
  radius: number,
  rotationDeg = 0
): Point[] {
  const points: Point[] = [];
  const step = Math.PI / 8; // 16 vertices alternating outer/inner
  const offset = (rotationDeg * Math.PI) / 180 - Math.PI / 2;

  for (let i = 0; i < 16; i += 1) {
    const r = i % 2 === 0 ? radius : radius * GIRIH_INNER_RATIO;
    const angle = offset + i * step;
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    });
  }

  return points;
}

/** Closed SVG path for the star. Coordinates rounded to keep markup small. */
export function starPath(
  cx: number,
  cy: number,
  radius: number,
  rotationDeg = 0
): string {
  const pts = starPoints(cx, cy, radius, rotationDeg);
  const round = (n: number) => Math.round(n * 100) / 100;
  return (
    pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p.x)} ${round(p.y)}`)
      .join(' ') + ' Z'
  );
}

/**
 * The eight-point star's own rotation set. Variant `n` turns the star by
 * n × 5.625° — an eighth of the 45° symmetry, so no two doorways in the rail
 * present the same face while the tiling stays coherent.
 */
export function girihRotation(variant: number): number {
  return (variant % 8) * 5.625;
}
