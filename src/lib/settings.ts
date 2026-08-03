import type {
  AsrMethod,
  CalcMethod,
  GeoPoint,
  HighLatitudeRuleName,
  PrayerSettings
} from './prayer';

/**
 * Device-local settings.
 *
 * These live in localStorage rather than only on the profile, because prayer
 * times must work signed-out and offline. When a user is signed in the profile
 * is the durable copy and this is the cache; when they are not, this is all
 * there is.
 */

export type StoredLocation = GeoPoint & {
  /**
   * Id from the bundled city list, when the user picked one. The display name
   * is resolved from this at render time rather than stored — storing the
   * resolved string would leave an English city name on an Arabic screen after
   * a locale switch.
   */
  cityId?: string;
  /** IANA zone. Times are absolute instants; this decides how they read. */
  timeZone: string;
  source: 'device' | 'manual';
};

export type Settings = PrayerSettings & {
  location: StoredLocation | null;
};

const KEY = 'sahn:settings';

export function defaultSettings(): Settings {
  return {
    method: 'mwl',
    asr: 'standard',
    highLatitudeRule: 'auto',
    location: null
  };
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

const CALC: readonly string[] = [
  'mwl',
  'isna',
  'umm_al_qura',
  'karachi',
  'egyptian',
  'moonsighting'
];
const ASR: readonly string[] = ['standard', 'hanafi'];
const HIGH_LAT: readonly string[] = [
  'auto',
  'middle_of_the_night',
  'seventh_of_the_night',
  'twilight_angle'
];

/**
 * Reads settings defensively: anything unrecognised falls back to the default
 * rather than throwing. A corrupted key must not be able to break the one
 * screen that has to work when everything else is unavailable.
 */
export function parseSettings(raw: unknown): Settings {
  const base = defaultSettings();
  if (!raw || typeof raw !== 'object') return base;
  const v = raw as Record<string, unknown>;

  const method = CALC.includes(v.method as string)
    ? (v.method as CalcMethod)
    : base.method;
  const asr = ASR.includes(v.asr as string) ? (v.asr as AsrMethod) : base.asr;
  const highLatitudeRule = HIGH_LAT.includes(v.highLatitudeRule as string)
    ? (v.highLatitudeRule as HighLatitudeRuleName)
    : base.highLatitudeRule;

  let location: StoredLocation | null = null;
  const loc = v.location as Record<string, unknown> | null | undefined;
  if (
    loc &&
    typeof loc.latitude === 'number' &&
    typeof loc.longitude === 'number' &&
    Number.isFinite(loc.latitude) &&
    Number.isFinite(loc.longitude) &&
    Math.abs(loc.latitude) <= 90 &&
    Math.abs(loc.longitude) <= 180
  ) {
    location = {
      latitude: loc.latitude,
      longitude: loc.longitude,
      ...(typeof loc.cityId === 'string' ? { cityId: loc.cityId } : {}),
      timeZone: typeof loc.timeZone === 'string' ? loc.timeZone : deviceTimeZone(),
      source: loc.source === 'manual' ? 'manual' : 'device'
    };
  }

  return { method, asr, highLatitudeRule, location };
}

export function loadSettings(): Settings {
  if (typeof window === 'undefined') return defaultSettings();
  try {
    return parseSettings(JSON.parse(window.localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Private browsing or a full quota. Settings revert to defaults next load,
    // which is degraded but still usable — not worth surfacing an error for.
  }
}
