'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { MODULE_GROUPS, modulesInGroup } from '@/lib/modules';
import GirihDoorway from './GirihDoorway';
import LocaleSwitcher from './LocaleSwitcher';

/**
 * Small-screen header and feature drawer.
 *
 * The sidebar is hidden below `lg`, so without this the modules are simply
 * unreachable on a phone — which is most of the audience.
 */
export default function MobileBar() {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Any navigation closes the drawer; leaving it open over the new page is the
  // classic mobile-nav bug.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <header className="flex items-center gap-3 border-b border-line bg-raised px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          className="flex items-center gap-2 text-sm text-muted hover:text-ink"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path
              d="M2 4h12M2 8h12M2 12h12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span className="sr-only">{t('nav.menu')}</span>
        </button>

        <Link href="/" className="font-display text-lg text-ink">
          {t('app.name')}
        </Link>

        <div className="ms-auto">
          <LocaleSwitcher />
        </div>
      </header>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.modules')}
            className="fixed inset-y-0 start-0 z-50 flex w-80 max-w-[85%] flex-col border-e border-line bg-raised lg:hidden"
          >
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <span className="flex-1 font-display text-lg text-ink">
                {t('app.name')}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="border border-line px-2.5 py-1 text-sm text-muted hover:text-ink"
              >
                {t('nav.closeMenu')}
              </button>
            </div>

            <div className="px-3 pt-3">
              <Link
                href="/"
                className="flex items-center gap-2.5 rounded-sm border border-line px-3 py-2.5 text-sm text-ink hover:bg-sunk"
              >
                {t('nav.newChat')}
              </Link>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto px-2 pb-6">
              {MODULE_GROUPS.map((group) => {
                const items = modulesInGroup(group);
                if (items.length === 0) return null;
                return (
                  <section key={group} className="mb-5">
                    <h2 className="px-3 pb-1.5 text-[10px] font-medium tracking-wider text-muted uppercase">
                      {t(`nav.groups.${group}`)}
                    </h2>
                    <ul>
                      {items.map((m) => (
                        <li key={m.id}>
                          <Link
                            href={m.href}
                            className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm text-muted hover:bg-sunk hover:text-ink"
                          >
                            <GirihDoorway
                              variant={m.girih}
                              size={15}
                              className="text-muted"
                            />
                            <span className="flex-1 text-start">
                              {t(`modules.${m.id}.name`)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
