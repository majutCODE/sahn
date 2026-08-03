import { useTranslations } from 'next-intl';

/**
 * The spec requires this on every page of M9, not just the index. It is a
 * component rather than a copied paragraph so it cannot drift between pages or
 * be left off a new one by accident.
 */
export default function FinanceDisclaimer() {
  const t = useTranslations('finance');

  return (
    <aside
      role="note"
      className="border-s-2 border-brass ps-4 text-xs leading-relaxed text-muted"
    >
      {t('disclaimer')}
    </aside>
  );
}
