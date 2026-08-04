'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { PREFILL_KEY } from './Composer';

type TafsirEntry = {
  key: string;
  covers: string[];
  resourceName: string;
  paragraphs: string[];
};

type State = 'idle' | 'loading' | 'open' | 'failed';

/**
 * Per-ayah actions: listen, read the commentary, ask about it.
 *
 * The three sit together because they are the same gesture — "tell me more
 * about this one" — and splitting them across the interface would make the
 * reader choose a mode before knowing what they wanted.
 */
export default function AyahTools({
  verseKey,
  playing,
  hasAudio,
  onPlay
}: {
  verseKey: string;
  playing: boolean;
  hasAudio: boolean;
  onPlay: () => void;
}) {
  const t = useTranslations('quran');
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const [tafsir, setTafsir] = useState<TafsirEntry | null>(null);

  async function toggleTafsir() {
    if (state === 'open') {
      setState('idle');
      return;
    }
    if (tafsir) {
      setState('open');
      return;
    }

    setState('loading');
    const res = await fetch(
      `/api/quran/tafsir?verse=${encodeURIComponent(verseKey)}`
    ).catch(() => null);

    if (!res?.ok) {
      setState('failed');
      return;
    }
    setTafsir((await res.json()).tafsir as TafsirEntry);
    setState('open');
  }

  /**
   * Hands the question to the chat half-written.
   *
   * Prefilled rather than sent. Composing a question on the reader's behalf
   * and firing it would put words in their mouth and spend a model call on a
   * question nobody asked; this just saves them typing the reference.
   */
  function ask() {
    sessionStorage.setItem(PREFILL_KEY, t('askPrefill', { verse: verseKey }));
    router.push('/');
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {hasAudio && (
          <button
            type="button"
            onClick={onPlay}
            aria-pressed={playing}
            className={`text-xs underline underline-offset-2 ${
              playing ? 'text-glaze' : 'text-muted hover:text-ink'
            }`}
          >
            {playing ? t('pause') : t('listen')}
          </button>
        )}

        <button
          type="button"
          onClick={() => void toggleTafsir()}
          aria-expanded={state === 'open'}
          className="text-xs text-muted underline underline-offset-2 hover:text-ink"
        >
          {state === 'loading'
            ? t('tafsirLoading')
            : state === 'open'
              ? t('tafsirHide')
              : t('tafsirShow')}
        </button>

        <button
          type="button"
          onClick={ask}
          className="text-xs text-muted underline underline-offset-2 hover:text-ink"
        >
          {t('askAboutThis')}
        </button>
      </div>

      {state === 'failed' && (
        <p role="alert" className="mt-2 text-xs text-clay">
          {t('tafsirFailed')}
        </p>
      )}

      {state === 'open' && tafsir && (
        <div className="mt-3 border-s-2 border-brass ps-4">
          <p className="text-[10px] tracking-wider text-muted uppercase">
            {/* Commentary is usually written over a group of ayat, not one.
                Saying so stops a passage about 112:1-4 reading as though it
                were written about the single ayah the reader tapped. */}
            {tafsir.covers.length > 1
              ? t('tafsirCovers', {
                  name: tafsir.resourceName,
                  from: tafsir.covers[0],
                  to: tafsir.covers[tafsir.covers.length - 1]
                })
              : t('tafsirBy', { name: tafsir.resourceName })}
          </p>
          {tafsir.paragraphs.map((paragraph, i) => (
            <p key={i} className="mt-2 text-sm leading-relaxed text-muted">
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
