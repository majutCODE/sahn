import {
  CalculationMethod,
  CalculationParameters,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PolarCircleResolution,
  PrayerTimes,
  Qibla
} from 'adhan';

/**
 * Prayer time calculation. Everything here is pure and runs on the device —
 * no API, no rate limit, works offline. That is a non-negotiable: a user must
 * never need a network to know when to pray.
 */

export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type Prayer = (typeof PRAYERS)[number];

/** Sunrise is shown but is not a prayer; it ends the Fajr window. */
export type TimeSlot = Prayer | 'sunrise';
export const TIME_SLOTS: readonly TimeSlot[] = [
  'fajr',
  'sunrise',
  'dhuhr',
  'asr',
  'maghrib',
  'isha'
];

export const CALC_METHODS = [
  'mwl',
  'isna',
  'umm_al_qura',
  'karachi',
  'egyptian',
  'moonsighting'
] as const;
export type CalcMethod = (typeof CALC_METHODS)[number];

export const ASR_METHODS = ['standard', 'hanafi'] as const;
export type AsrMethod = (typeof ASR_METHODS)[number];

/**
 * What to do where the sun never reaches the twilight angle. `auto` follows
 * adhan's own recommendation for the latitude, which is the right default for
 * anyone who does not already know which rule their community follows.
 */
export const HIGH_LATITUDE_RULES = [
  'auto',
  'middle_of_the_night',
  'seventh_of_the_night',
  'twilight_angle'
] as const;
export type HighLatitudeRuleName = (typeof HIGH_LATITUDE_RULES)[number];

export type GeoPoint = { latitude: number; longitude: number };

export type PrayerSettings = {
  method: CalcMethod;
  asr: AsrMethod;
  highLatitudeRule: HighLatitudeRuleName;
};

const METHOD_FACTORY: Record<CalcMethod, () => CalculationParameters> = {
  mwl: CalculationMethod.MuslimWorldLeague,
  isna: CalculationMethod.NorthAmerica,
  umm_al_qura: CalculationMethod.UmmAlQura,
  karachi: CalculationMethod.Karachi,
  egyptian: CalculationMethod.Egyptian,
  moonsighting: CalculationMethod.MoonsightingCommittee
};

function buildParams(settings: PrayerSettings, coords: Coordinates) {
  const params = METHOD_FACTORY[settings.method]();
  params.madhab = settings.asr === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;

  params.highLatitudeRule =
    settings.highLatitudeRule === 'auto'
      ? HighLatitudeRule.recommended(coords)
      : settings.highLatitudeRule === 'middle_of_the_night'
        ? HighLatitudeRule.MiddleOfTheNight
        : settings.highLatitudeRule === 'seventh_of_the_night'
          ? HighLatitudeRule.SeventhOfTheNight
          : HighLatitudeRule.TwilightAngle;

  // Inside the polar circles the sun may not rise or set at all, and the
  // high-latitude rule does not help: it adjusts Fajr and Isha, but with no
  // sunrise there is no Dhuhr or Maghrib either, and every time comes back
  // NaN. AqrabBalad ("nearest locality") falls back to the closest latitude
  // where the day does break — the majority position, and the only option
  // here that yields a usable timetable rather than a blank screen.
  params.polarCircleResolution = PolarCircleResolution.AqrabBalad;

  return params;
}

export type DayTimes = Record<TimeSlot, Date>;

/** The six marks of a single day at one location. */
export function computeDay(
  point: GeoPoint,
  date: Date,
  settings: PrayerSettings
): DayTimes {
  const coords = new Coordinates(point.latitude, point.longitude);
  const times = new PrayerTimes(coords, date, buildParams(settings, coords));

  return {
    fajr: times.fajr,
    sunrise: times.sunrise,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha
  };
}

export type UpcomingPrayer = {
  prayer: Prayer;
  time: Date;
  /** True when the next prayer is tomorrow's Fajr, i.e. Isha has passed. */
  tomorrow: boolean;
};

/**
 * The next prayer, rolling into tomorrow after Isha.
 *
 * adhan's own `nextPrayer` returns "none" once Isha has passed, which would
 * leave the primary view of the app blank every evening. Sunrise is skipped:
 * it is a boundary, not something you wait for.
 */
export function nextPrayer(
  point: GeoPoint,
  settings: PrayerSettings,
  now: Date = new Date()
): UpcomingPrayer {
  const today = computeDay(point, now, settings);

  for (const prayer of PRAYERS) {
    if (today[prayer].getTime() > now.getTime()) {
      return { prayer, time: today[prayer], tomorrow: false };
    }
  }

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return {
    prayer: 'fajr',
    time: computeDay(point, tomorrow, settings).fajr,
    tomorrow: true
  };
}

/** The prayer whose window is currently open, or null before Fajr. */
export function currentPrayer(
  point: GeoPoint,
  settings: PrayerSettings,
  now: Date = new Date()
): Prayer | null {
  const today = computeDay(point, now, settings);
  let current: Prayer | null = null;
  for (const prayer of PRAYERS) {
    if (today[prayer].getTime() <= now.getTime()) current = prayer;
  }
  return current;
}

/** Great-circle bearing from a point to the Kaaba, in degrees from true north. */
export function qiblaBearing(point: GeoPoint): number {
  return Qibla(new Coordinates(point.latitude, point.longitude));
}

export const KAABA: GeoPoint = { latitude: 21.4225241, longitude: 39.8261818 };
