'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { MODULE_GROUPS, modulesInGroup } from '@/lib/modules';
import GirihDoorway from './GirihDoorway';
import LocaleSwitcher from './LocaleSwitcher';
import ThreadList from './ThreadList';

/**
 * The sidebar. Chat is the product, so "New chat" sits at the top on its own;
 * the modules are grouped features beneath it.
 *
 * Groups are built from the module registry rather than listed here — adding a
 * feature is one line in `src/lib/modules.ts` and its two message keys.
 */
export default function CourtyardRail() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t('nav.modules')}
      className="hidden h-dvh w-72 shrink-0 flex-col border-e border-line bg-raised lg:flex"
    >
      <div className="px-5 pt-6 pb-4">
        <Link href="/" className="flex items-center gap-2.5">
          <GirihDoorway variant={0} size={18} className="text-glaze" />
          <span className="font-display text-xl tracking-tight text-ink">
            {t('app.name')}
          </span>
        </Link>
      </div>

      <div className="px-3">
        <Link
          href="/"
          className={`flex items-center gap-2.5 rounded-sm border px-3 py-2.5 text-sm transition-colors ${
            pathname === '/'
              ? 'border-glaze bg-glaze text-on-glaze'
              : 'border-line text-ink hover:bg-sunk'
          }`}
        >
          <PlusIcon />
          <span className="text-start">{t('nav.newChat')}</span>
        </Link>
      </div>

      <div className="mt-6 flex-1 overflow-y-auto px-2 pb-4">
        <ThreadList />

        {MODULE_GROUPS.map((group) => {
          const items = modulesInGroup(group);
          if (items.length === 0) return null;
          return (
            <section key={group} className="mb-5">
              <h2 className="px-3 pb-1.5 text-[10px] font-medium tracking-wider text-muted uppercase">
                {t(`nav.groups.${group}`)}
              </h2>
              <ul>
                {items.map((m, i) => {
                  const active = pathname === m.href;
                  return (
                    <li
                      key={m.id}
                      className="doorway-stagger"
                      style={{ ['--doorway-index' as string]: i }}
                    >
                      <Link
                        href={m.href}
                        aria-current={active ? 'page' : undefined}
                        className={`group flex items-center gap-2.5 rounded-sm px-3 py-1.5 text-sm transition-colors ${
                          active
                            ? 'bg-sunk text-ink'
                            : 'text-muted hover:bg-sunk hover:text-ink'
                        }`}
                      >
                        <GirihDoorway
                          variant={m.girih}
                          size={15}
                          className={
                            active ? 'text-glaze' : 'text-muted group-hover:text-glaze'
                          }
                        />
                        <span className="flex-1 text-start">
                          {t(`modules.${m.id}.name`)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="border-t border-line px-4 py-3">
        <LocaleSwitcher />
      </div>
    </nav>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M8 3v10M3 8h10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
