/**
 * The ten modules of the courtyard, in rail order.
 *
 * `key` indexes into the `modules` namespace in messages/{locale}.json —
 * no module name is ever written as a literal string in a component.
 * `girih` selects the doorway's star geometry variant (see GirihDoorway).
 */

export type ModuleTier = 'free' | 'paid';

/**
 * Sidebar groups. Adding a feature means adding it to `modules` with a group —
 * the rail builds itself from this, so nothing else has to change. Adding a
 * whole new group means one entry here plus one message key.
 */
export const MODULE_GROUPS = ['worship', 'read', 'money', 'support'] as const;
export type ModuleGroup = (typeof MODULE_GROUPS)[number];

export type ModuleId =
  | 'prayer'
  | 'tracker'
  | 'duas'
  | 'quran'
  | 'hifz'
  | 'search'
  | 'ramadan'
  | 'calendar'
  | 'zakat'
  | 'finance'
  | 'counsel';

export type ModuleDef = {
  id: ModuleId;
  group: ModuleGroup;
  /** Path segment beneath /[locale]. */
  href: string;
  /** Build phase from the spec, surfaced as a shell placeholder. */
  phase: 2 | 3 | 4 | 5 | 6;
  tier: ModuleTier;
  /** Rotation index for the doorway's eight-point star, 0–7. */
  girih: number;
};

export const modules: readonly ModuleDef[] = [
  { id: 'prayer', group: 'worship', href: '/prayer', phase: 2, tier: 'free', girih: 0 },
  { id: 'tracker', group: 'worship', href: '/tracker', phase: 2, tier: 'free', girih: 1 },
  { id: 'duas', group: 'read', href: '/duas', phase: 3, tier: 'free', girih: 2 },
  { id: 'quran', group: 'read', href: '/quran', phase: 3, tier: 'free', girih: 3 },
  { id: 'hifz', group: 'read', href: '/hifz', phase: 6, tier: 'free', girih: 1 },
  { id: 'search', group: 'read', href: '/search', phase: 4, tier: 'paid', girih: 4 },
  { id: 'ramadan', group: 'worship', href: '/ramadan', phase: 6, tier: 'paid', girih: 5 },
  { id: 'calendar', group: 'worship', href: '/calendar', phase: 2, tier: 'free', girih: 6 },
  { id: 'zakat', group: 'money', href: '/zakat', phase: 5, tier: 'paid', girih: 7 },
  { id: 'finance', group: 'money', href: '/finance', phase: 5, tier: 'paid', girih: 2 },
  { id: 'counsel', group: 'support', href: '/counsel', phase: 6, tier: 'paid', girih: 5 }
] as const;

/** Modules in a group, in rail order. */
export function modulesInGroup(group: ModuleGroup): ModuleDef[] {
  return modules.filter((m) => m.group === group);
}

export function getModule(id: ModuleId): ModuleDef {
  const found = modules.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown module: ${id}`);
  return found;
}
