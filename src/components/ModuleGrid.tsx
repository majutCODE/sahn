import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { modules } from '@/lib/modules';
import GirihDoorway from './GirihDoorway';

/**
 * The courtyard as a grid of doorways. This is the home screen on mobile and
 * the body of the landing page everywhere. Two columns at 360px, so every
 * doorway keeps a legible label without truncation.
 */
export default function ModuleGrid() {
  const t = useTranslations();

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {modules.map((m, i) => (
        <li
          key={m.id}
          className="doorway-stagger"
          style={{ ['--doorway-index' as string]: i }}
        >
          <Link
            href={m.href}
            className="group flex h-full flex-col gap-2 border border-line bg-raised p-4 text-ink transition-colors hover:border-glaze"
          >
            <GirihDoorway
              variant={m.girih}
              size={28}
              className="text-muted transition-colors group-hover:text-glaze"
            />
            <span className="text-sm leading-snug font-medium text-start">
              {t(`modules.${m.id}.name`)}
            </span>
            <span className="text-xs leading-snug text-muted text-start">
              {t(`modules.${m.id}.summary`)}
            </span>
            {m.tier === 'paid' && (
              <span className="mt-auto pt-2 text-[10px] uppercase tracking-wider text-brass text-start">
                {t('shell.tier.paid')}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
