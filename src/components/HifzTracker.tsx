'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { formatNumber } from '@/lib/format';
import {
  SURAHS,
  TOTAL_AYAT,
  ayatIn,
  dueNow,
  memorisedAyat,
  strengthLabel,
  surahByNumber,
  type Portion
} from '@/lib/hifz';
import { createClient } from '@/lib/supabase/client';

type Load = 'loading' | 'signed-out' | 'ready' | 'error';

export default function HifzTracker() {
  const t = useTranslations('hifz');
  const locale = useLocale() as Locale;

  const [state, setState] = useState<Load>('loading');
  const [portions, setPortions] = useState<Portion[]>([]);
  const [surah, setSurah] = useState(1);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(7);
  const [problem, setProblem] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      setState('signed-out');
      return;
    }
    const res = await fetch('/api/hifz').catch(() => null);
    if (!res?.ok) {
      setState('error');
      return;
    }
    setPortions((await res.json()).portions as Portion[]);
    setState('ready');
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Keep the range inside the chosen surah, so the form cannot offer something
  // the server will refuse.
  const chosen = surahByNumber(surah);
  useEffect(() => {
    if (!chosen) return;
    setFrom((f) => Math.min(Math.max(f, 1), chosen.ayat));
    setTo((v) => Math.min(Math.max(v, 1), chosen.ayat));
  }, [chosen]);

  async function add() {
    setProblem(null);
    const res = await fetch('/api/hifz', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ surah, ayah_from: from, ayah_to: to })
    }).catch(() => null);

    if (!res?.ok) {
      setProblem((await res?.json().catch(() => null))?.detail ?? t('addFailed'));
      return;
    }
    void refresh();
  }

  async function review(id: string, confident: boolean) {
    // Optimistic: the queue should empty as you work through it.
    setPortions((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              strength: confident ? Math.min(p.strength + 1, 5) : 1,
              next_review_at: new Date(Date.now() + 86_400_000).toISOString()
            }
          : p
      )
    );
    const res = await fetch('/api/hifz', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, confident })
    }).catch(() => null);
    // Read the real schedule back: the interval is computed in the database,
    // and the optimistic value above is a placeholder, not the truth.
    if (res?.ok) void refresh();
  }

  async function remove(id: string) {
    setPortions((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/hifz?id=${id}`, { method: 'DELETE' }).catch(() => null);
  }

  if (state === 'loading') {
    return <p className="mt-8 text-sm text-muted">{t('loading')}</p>;
  }

  if (state === 'signed-out') {
    return (
      <p className="mt-8 text-sm text-muted">
        {t('signedOut')}{' '}
        <Link href="/sign-in" className="text-glaze underline underline-offset-2">
          {t('signIn')}
        </Link>
      </p>
    );
  }

  if (state === 'error') {
    return <p className="mt-8 text-sm text-clay">{t('loadFailed')}</p>;
  }

  const memorised = memorisedAyat(portions);
  const due = dueNow(portions);
  const percent = Math.round((memorised / TOTAL_AYAT) * 1000) / 10;

  return (
    <div className="mt-8">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          label={t('stats.memorised')}
          value={`${formatNumber(locale, memorised)} / ${formatNumber(locale, TOTAL_AYAT)}`}
        />
        <Stat label={t('stats.percent')} value={`${formatNumber(locale, percent)}%`} />
        <Stat label={t('stats.due')} value={formatNumber(locale, due.length)} />
      </dl>

      {due.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl text-ink">{t('dueHeading')}</h2>
          <p className="mt-2 max-w-prose text-sm text-muted">{t('dueBody')}</p>
          <ul className="mt-4 border-t border-line">
            {due.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 border-b border-line py-3">
                <span className="flex-1 text-sm text-ink">
                  {label(p, locale)}
                </span>
                <button
                  type="button"
                  onClick={() => void review(p.id, true)}
                  className="border border-glaze bg-glaze px-3 py-1.5 text-xs text-on-glaze"
                >
                  {t('solid')}
                </button>
                <button
                  type="button"
                  onClick={() => void review(p.id, false)}
                  className="border border-line px-3 py-1.5 text-xs text-muted hover:text-ink"
                >
                  {t('shaky')}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-xl text-ink">{t('addHeading')}</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted">
            {t('surah')}
            <select
              value={surah}
              onChange={(e) => setSurah(Number(e.target.value))}
              className="mt-1 block border border-line bg-raised px-2 py-1.5 text-sm text-ink"
            >
              {SURAHS.map((s) => (
                <option key={s.surah} value={s.surah}>
                  {formatNumber(locale, s.surah)}. {locale === 'ar' ? s.arabic : s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            {t('from')}
            <input
              type="number"
              min={1}
              max={chosen?.ayat ?? 1}
              value={from}
              onChange={(e) => setFrom(Number(e.target.value))}
              className="mt-1 block w-20 border border-line bg-raised px-2 py-1.5 text-sm text-ink"
            />
          </label>
          <label className="text-xs text-muted">
            {t('to')}
            <input
              type="number"
              min={1}
              max={chosen?.ayat ?? 1}
              value={to}
              onChange={(e) => setTo(Number(e.target.value))}
              className="mt-1 block w-20 border border-line bg-raised px-2 py-1.5 text-sm text-ink"
            />
          </label>
          <button
            type="button"
            onClick={() => void add()}
            className="border border-line px-4 py-2 text-sm text-ink hover:border-glaze"
          >
            {t('add')}
          </button>
        </div>
        {chosen && (
          <p className="mt-2 text-xs text-muted">
            {t('surahLength', {
              surah: locale === 'ar' ? chosen.arabic : chosen.name,
              count: formatNumber(locale, chosen.ayat)
            })}
          </p>
        )}
        {problem && (
          <p role="alert" className="mt-2 text-sm text-clay">
            {problem}
          </p>
        )}
      </section>

      {portions.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl text-ink">{t('allHeading')}</h2>
          <ul className="mt-3 border-t border-line">
            {portions.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 border-b border-line py-3">
                <span className="flex-1 text-sm text-ink">{label(p, locale)}</span>
                <span className="text-xs text-muted">
                  {t(`strength.${strengthLabel(p.strength)}`)}
                </span>
                <Link
                  href={`/quran/${p.surah}#ayah-${p.ayah_from}`}
                  className="text-xs text-glaze underline underline-offset-2"
                >
                  {t('open')}
                </Link>
                <button
                  type="button"
                  onClick={() => void remove(p.id)}
                  className="text-xs text-muted underline underline-offset-2 hover:text-clay"
                >
                  {t('remove')}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 border-s-2 border-line ps-4 text-sm text-muted">
        {t('note')}
      </p>
    </div>
  );
}

function label(p: Portion, locale: Locale): string {
  const s = surahByNumber(p.surah);
  const name = s ? (locale === 'ar' ? s.arabic : s.name) : String(p.surah);
  const range =
    p.ayah_from === p.ayah_to ? `${p.ayah_from}` : `${p.ayah_from}-${p.ayah_to}`;
  return `${name} ${range} (${ayatIn(p)})`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line px-3 py-2.5">
      <dt className="text-[10px] tracking-wider text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-display text-lg text-ink">{value}</dd>
    </div>
  );
}
