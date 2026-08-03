import { localeFormatTag, type Locale } from '@/i18n/routing';

/**
 * Number formatting for display.
 *
 * ICU's own `{n, number}` is not enough here: `Intl.NumberFormat('ar')` emits
 * Western digits, because the CLDR default numbering system for plain `ar` is
 * `latn`. The spec calls for Eastern Arabic digits, so we format against the
 * tagged locale (`ar-EG-u-nu-arab`) and interpolate the result as a string.
 *
 * Rule: never put a bare number into a message. Format it here first.
 */
export function formatNumber(
  locale: Locale,
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(localeFormatTag[locale], options).format(value);
}

/**
 * A year, never grouped. `formatNumber` would render 1448 AH as "1,448" —
 * or ١٬٤٤٨ in Arabic — which reads as a quantity rather than a year.
 */
export function formatYear(locale: Locale, value: number): string {
  return new Intl.NumberFormat(localeFormatTag[locale], {
    useGrouping: false
  }).format(value);
}

export function formatDate(
  locale: Locale,
  value: Date,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(localeFormatTag[locale], options).format(value);
}

/**
 * A clock time in a specific zone. The zone is explicit because a user can pick
 * a city they are not currently in, and 04:12 in Mecca must not be rendered
 * against the browser's idea of local time.
 */
export function formatTime(locale: Locale, value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(localeFormatTag[locale], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone
  }).format(value);
}

/** Zero-padded unit for the countdown, in the locale's numerals. */
export function formatClockUnit(locale: Locale, value: number): string {
  return new Intl.NumberFormat(localeFormatTag[locale], {
    minimumIntegerDigits: 2,
    useGrouping: false
  }).format(value);
}
