/** Where relative audio paths are served from. */
const AUDIO_ORIGIN = 'https://verses.quran.com/';

/**
 * Makes a recitation URL absolute.
 *
 * The API returns three different shapes and does not say which. Al-Husary
 * comes back protocol-relative (`//mirrors.quranicaudio.com/...`); every other
 * reciter comes back as a bare relative path (`Alafasy/mp3/112001.mp3`). A
 * relative path resolves against our own origin and 404s, which fails
 * silently — the audio element simply never plays.
 *
 * Because the default reciter happens to be the one shape that works without
 * help, this was invisible until a second reciter was tried. Kept apart from
 * `audio.ts` so it is testable: that module is `server-only`.
 */
export function absoluteAudioUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return `${AUDIO_ORIGIN}${url.replace(/^\//, '')}`;
}
