import 'server-only';
import { absoluteAudioUrl } from './audio-url';
import { quranFetch } from './client';
import { DEFAULT_RECITER } from './resources';

export type AyahAudio = { key: string; url: string };

type AudioFile = { verse_key: string; url: string };

/** Per-ayah recitation for a whole surah. */
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
    url: absoluteAudioUrl(file.url)
  }));
}
