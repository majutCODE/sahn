'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales, type Locale } from '@/i18n/routing';

/**
 * Switches locale on the current route, preserving the path.
 * Rendered as real links-in-a-group rather than a select so the two scripts
 * are both visible — the switcher is also the product's bilingual promise.
 */
export default function LocaleSwitcher() {
  const t = useTranslations('nav');
  const active = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, startTransition] = useTransition();

  function select(next: Locale) {
    if (next === active) return;
    startTransition(() => {
      router.replace(
        // @ts-expect-error — params are carried through unchanged
        { pathname, params },
        { locale: next }
      );
    });
  }

  return (
    <div
      role="group"
      aria-label={t('language')}
      className="flex items-center gap-1 text-sm"
      data-pending={pending || undefined}
    >
      {locales.map((code) => {
        const isActive = code === active;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            onClick={() => select(code)}
            aria-current={isActive ? 'true' : undefined}
            className={`rounded-sm px-2.5 py-1 transition-colors ${
              isActive
                ? 'bg-sunk text-ink'
                : 'text-muted hover:bg-sunk hover:text-ink'
            }`}
          >
            {t(`locale.${code}`)}
          </button>
        );
      })}
    </div>
  );
}
