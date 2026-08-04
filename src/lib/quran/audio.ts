import 'server-only';
import { quranFetch } from './client';
import { DEFAULT_RECITER } from './resources';

export type AyahAudio = { key: string; url: string };

type AudioFile = { verse_key: string; url: string };

/**
 * Per-ayah recitation for a whole surah.
 *
 * The API returns protocol-relative URLs (`//mirrors.quranicaudio.com/...`).
 * Left as they are, they resolve against the page and 404; on an https page a
 * browser would also refuse the http fallback. They are made absolute here so
 * no caller has to remember.
 */
export async function fetchRecitation(
  surah: number,
  reciterId: number = DEFAULT_RECITER
): Promise<AyahAudio[]> {
  const data = await quranFetch<{ audio_files: AudioFile[] }>(
    `recitations/${reciterId}/by_chapter/${surah}`,
    { params: { per_page: 300 } }
  );

  return (data.audio_files ?? []).map((file) => ({
    key: file.verse_key,
    url: file.url.startsWith('//') ? `https:${file.url}` : file.url
  }));
}
