'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { localeFormatTag, type Locale } from '@/i18n/routing';
import { formatDate } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import {
  ASSET_KINDS,
  CONTESTED_ASSETS,
  LIABILITY_KINDS,
  calculateZakat,
  nextHawlDate,
  type AssetKind,
  type LiabilityKind,
  type NisabBasis,
  type SpotPrice
} from '@/lib/zakat';

type Amounts = Partial<Record<string, number>>;
type SaveState = 'idle' | 'saving' | 'saved' | 'signed-out' | 'error';

export default function ZakatCalculator() {
  const t = useTranslations('zakat');
  const locale = useLocale() as Locale;

  const [spot, setSpot] = useState<SpotPrice | null>(null);
  const [spotError, setSpotError] = useState(false);
  const [basis, setBasis] = useState<NisabBasis>('silver');
  const [assets, setAssets] = useState<Amounts>({});
  const [liabilities, setLiabilities] = useState<Amounts>({});
  const [save, setSave] = useState<SaveState>('idle');

  useEffect(() => {
    fetch('/api/metals?currency=GBP')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setSpot(d.spot))
      .catch(() => setSpotError(true));
  }, []);

  const result = useMemo(
    () =>
      spot
        ? calculateZakat({ assets, liabilities }, spot, basis)
        : null,
    [assets, liabilities, spot, basis]
  );

  const money = (value: number) =>
    new Intl.NumberFormat(localeFormatTag[locale], {
      style: 'currency',
      currency: spot?.currency ?? 'GBP',
      maximumFractionDigits: 2
    }).format(value);

  const hawl = useMemo(() => nextHawlDate(new Date()), []);

  async function persist() {
    if (!spot || !result) return;
    setSave('saving');

    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      setSave('signed-out');
      return;
    }

    const res = await fetch('/api/zakat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        assets,
        liabilities,
        nisabBasis: basis,
        spotPrice: spot,
        currency: spot.currency,
        amountDue: result.amountDue,
        hawlDate: hawl.toISOString().slice(0, 10)
      })
    });
    setSave(res.ok ? 'saved' : 'error');
  }

  return (
    <div>
      <section className="border-s-2 border-glaze ps-5">
        {result ? (
          <>
            <p className="text-sm text-muted">{t('dueLabel')}</p>
            <h2 className="mt-1 font-display text-4xl text-ink sm:text-5xl">
              {money(result.amountDue)}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {result.meetsNisab
                ? t('aboveNisab', { nisab: money(result.nisab) })
                : t('belowNisab', { nisab: money(result.nisab) })}
            </p>
          </>
        ) : spotError ? (
          <p role="alert" className="text-sm text-clay">
            {t('spotError')}
          </p>
        ) : (
          <p className="text-sm text-muted">{t('loadingSpot')}</p>
        )}
      </section>

      <section className="mt-10">
        <h3 className="font-display text-xl text-ink">{t('nisabHeading')}</h3>
        <p className="mt-2 max-w-prose text-sm text-muted">{t('nisabNote')}</p>
        <div className="mt-3 flex gap-2">
          {(['silver', 'gold'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={basis === option}
              onClick={() => setBasis(option)}
              className={`border px-3 py-2 text-sm transition-colors ${
                basis === option
                  ? 'border-glaze bg-glaze text-on-glaze'
                  : 'border-line text-muted hover:text-ink'
              }`}
            >
              {t(`basis.${option}`)}
            </button>
          ))}
        </div>
      </section>

      <AmountGroup
        heading={t('assetsHeading')}
        kinds={ASSET_KINDS}
        values={assets}
        onChange={setAssets}
        label={(k) => t(`assets.${k}`)}
        hint={(k) =>
          k === 'gold' || k === 'silver'
            ? t('grams')
            : CONTESTED_ASSETS.includes(k as AssetKind)
              ? t(`contested.${k}`)
              : null
        }
      />

      <AmountGroup
        heading={t('liabilitiesHeading')}
        kinds={LIABILITY_KINDS}
        values={liabilities}
        onChange={setLiabilities}
        label={(k) => t(`liabilities.${k}`)}
        hint={() => null}
      />

      {result && spot && (
        <section className="mt-10 border-t border-line pt-6">
          <dl className="space-y-2 text-sm">
            <Row label={t('assetTotal')} value={money(result.assetTotal)} />
            <Row label={t('liabilityTotal')} value={money(result.liabilityTotal)} />
            <Row label={t('netWorth')} value={money(result.netWorth)} />
            <Row label={t('nisabValue')} value={money(result.nisab)} />
            <Row
              label={t('dueLabel')}
              value={money(result.amountDue)}
              emphasis
            />
          </dl>

          <p className="mt-4 text-xs text-muted">
            {t('spotUsed', {
              gold: money(spot.gold),
              silver: money(spot.silver),
              date: formatDate(locale, new Date(spot.fetchedAt), {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })
            })}
          </p>
          <p className="mt-1 text-xs text-muted">
            {t('hawlNote', {
              date: formatDate(locale, hawl, {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })
            })}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={persist}
              disabled={save === 'saving' || result.amountDue === 0}
              className="border border-glaze bg-glaze px-4 py-2 text-sm text-on-glaze transition-colors enabled:hover:bg-transparent enabled:hover:text-glaze disabled:opacity-40"
            >
              {save === 'saving' ? t('saving') : t('save')}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="border border-line px-4 py-2 text-sm text-ink hover:border-glaze"
            >
              {t('print')}
            </button>
            {save === 'saved' && (
              <span role="status" className="text-sm text-glaze">
                {t('saved')}
              </span>
            )}
            {save === 'signed-out' && (
              <span className="text-sm text-muted">
                {t.rich('signInToSave', {
                  link: (chunks) => (
                    <Link href="/sign-in" className="text-glaze underline">
                      {chunks}
                    </Link>
                  )
                })}
              </span>
            )}
            {save === 'error' && (
              <span role="alert" className="text-sm text-clay">
                {t('saveError')}
              </span>
            )}
          </div>
        </section>
      )}

      <p className="mt-10 max-w-prose text-xs text-muted">{t('disclaimer')}</p>
    </div>
  );
}

function Row({
  label,
  value,
  emphasis
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
      <dt className={emphasis ? 'text-ink' : 'text-muted'}>{label}</dt>
      <dd className={`tabular-nums ${emphasis ? 'text-ink' : 'text-muted'}`}>
        {value}
      </dd>
    </div>
  );
}

function AmountGroup({
  heading,
  kinds,
  values,
  onChange,
  label,
  hint
}: {
  heading: string;
  kinds: readonly string[];
  values: Amounts;
  onChange: (next: Amounts) => void;
  label: (kind: string) => string;
  hint: (kind: string) => string | null;
}) {
  return (
    <section className="mt-10">
      <h3 className="font-display text-xl text-ink">{heading}</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {kinds.map((kind) => {
          const note = hint(kind);
          return (
            <div key={kind}>
              <label htmlFor={`z-${kind}`} className="block text-sm text-ink">
                {label(kind)}
              </label>
              <input
                id={`z-${kind}`}
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                dir="ltr"
                value={values[kind] ?? ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  const next = { ...values };
                  if (raw === '') delete next[kind];
                  else next[kind] = Number(raw);
                  onChange(next);
                }}
                className="mt-1 w-full border border-line bg-raised px-3 py-2 text-ink text-start tabular-nums"
              />
              {note && <p className="mt-1 text-xs text-muted">{note}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
