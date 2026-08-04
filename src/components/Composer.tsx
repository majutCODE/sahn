'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';

/** Where a first message waits while the router moves to /chat. */
export const DRAFT_KEY = 'sahn:draft';

/**
 * A question started elsewhere and handed over unfinished.
 *
 * Distinct from DRAFT_KEY, which is a complete message and is sent on arrival.
 * This one is only typed into the box: "Ask about this" on an ayah knows the
 * reference but not the question, and sending on the reader's behalf would put
 * words in their mouth.
 */
export const PREFILL_KEY = 'sahn:prefill';

type Props = {
  /**
   * Called with the trimmed message when the composer is already inside a
   * thread. When omitted, the composer hands the draft to /chat instead.
   */
  onSubmit?: (message: string) => void;
  autoFocus?: boolean;
  /** Show the three worked examples. Landing only — noise inside a thread. */
  showSuggestions?: boolean;
};

export default function Composer({ onSubmit, autoFocus, showSuggestions }: Props) {
  const t = useTranslations('composer');
  const router = useRouter();
  const [value, setValue] = useState('');
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const prefill = sessionStorage.getItem(PREFILL_KEY);
    if (!prefill) return;
    sessionStorage.removeItem(PREFILL_KEY);
    setValue(prefill);

    const area = areaRef.current;
    if (!area) return;
    area.focus();
    // Caret to the end, so they carry on typing their question rather than
    // landing in front of the reference they were given.
    area.setSelectionRange(prefill.length, prefill.length);
    grow(area);
  }, []);

  function grow(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }

  function send(message: string) {
    const text = message.trim();
    if (!text) return;

    if (onSubmit) {
      onSubmit(text);
      setValue('');
      if (areaRef.current) areaRef.current.style.height = 'auto';
      return;
    }

    // Deliberately not a query parameter. A first message here may be a
    // sensitive disclosure, and URLs end up in history, referrers and access
    // logs. sessionStorage keeps it on the device and dies with the tab.
    sessionStorage.setItem(DRAFT_KEY, text);
    router.push('/');
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(value);
        }}
        className="border border-line bg-raised focus-within:border-glaze"
      >
        <label htmlFor="composer" className="sr-only">
          {t('label')}
        </label>
        <textarea
          id="composer"
          ref={areaRef}
          rows={2}
          value={value}
          autoFocus={autoFocus}
          placeholder={t('placeholder')}
          onChange={(e) => {
            setValue(e.target.value);
            grow(e.target);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(value);
            }
          }}
          className="block w-full resize-none bg-transparent px-4 py-3 text-base text-ink text-start outline-none placeholder:text-muted"
        />
        <div className="flex items-center gap-3 border-t border-line px-3 py-2">
          <span className="hidden text-xs text-muted sm:inline">{t('hint')}</span>
          <button
            type="submit"
            disabled={!value.trim()}
            className="ms-auto border border-glaze bg-glaze px-4 py-1.5 text-sm text-on-glaze transition-colors enabled:hover:bg-transparent enabled:hover:text-glaze disabled:opacity-40"
          >
            {t('send')}
          </button>
        </div>
      </form>

      {showSuggestions && (
        <div className="mt-3">
          <h2 className="sr-only">{t('suggestionsLabel')}</h2>
          <ul className="flex flex-wrap gap-2">
            {(['one', 'two', 'three'] as const).map((key) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => send(t(`suggestions.${key}`))}
                  className="border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-glaze hover:text-ink"
                >
                  {t(`suggestions.${key}`)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
