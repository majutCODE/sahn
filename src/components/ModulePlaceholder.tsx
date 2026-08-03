import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import { formatNumber } from '@/lib/format';
import { getModule, type ModuleId } from '@/lib/modules';
import GirihDoorway from './GirihDoorway';

/**
 * Shell for a module route that has no feature behind it yet.
 * Phase 1 ships the doors; the rooms are built in the phase each one names.
 */
export default function ModulePlaceholder({ id }: { id: ModuleId }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const mod = getModule(id);

  return (
    <section className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <GirihDoorway variant={mod.girih} size={44} className="text-glaze" />
      <h1 className="mt-5 font-display text-3xl leading-tight text-ink sm:text-4xl">
        {t(`modules.${id}.name`)}
      </h1>
      <p className="mt-3 text-base text-muted">{t(`modules.${id}.summary`)}</p>

      <div className="mt-8 border-s-2 border-line ps-4">
        <p className="text-sm text-ink">{t('shell.notBuiltYet')}</p>
        <p className="mt-1.5 text-sm text-muted">
          {t('shell.phaseNote', { phase: formatNumber(locale, mod.phase) })}
        </p>
      </div>
    </section>
  );
}
