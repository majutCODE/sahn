'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { PREFILL_KEY } from './Composer';

export type Citation = {
  id: string;
  kind: 'quran';
  reference: string;
  arabic: string;
  text: string;
  href: string;
};

/**
 * The source behind a citation chip. Built here rather than inside the chat
 * because M3, M4 and M5 all need the same panel — the spec puts it in phase 3
 * for exactly that reason.
 *
 * Slides in from the inline-end edge, so it opens from the right in English
 * and from the left in Arabic without any direction-specific code.
 */
export default function SourcePanel({
  citation,
  onClose
}: {
  citation: Citation | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations('chat');

  useEffect(() => {
    if (!citation) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [citation, onClose]);

  if (!citation) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-ink/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={citation.reference}
        className="fixed inset-y-0 end-0 z-50 flex w-full max-w-md flex-col border-s border-line bg-raised"
      >
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <h2 className="flex-1 font-display text-lg text-ink">
            {citation.reference}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="border border-line px-2.5 py-1 text-sm text-muted hover:text-ink"
          >
            {t('closeSource')}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <p className="quran text-2xl text-ink" dir="rtl" lang="ar">
            {citation.arabic}
          </p>
          <p className="mt-5 text-base text-muted">{citation.text}</p>
        </div>

        <footer className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line px-5 py-4">
          <Link
            href={citation.href}
            onClick={onClose}
            className="text-sm text-glaze underline underline-offset-2"
          >
            {t('openInReader')}
          </Link>
          {/* The other direction of the same loop as the reader's button:
              from a cited source back into a question about it. */}
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem(
                PREFILL_KEY,
                t('askPrefill', { reference: citation.reference })
              );
              onClose();
              router.push('/');
            }}
            className="text-sm text-muted underline underline-offset-2 hover:text-ink"
          >
            {t('askAboutThis')}
          </button>
        </footer>
      </aside>
    </>
  );
}
