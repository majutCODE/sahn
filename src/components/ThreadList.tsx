'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';

type Thread = { id: string; title: string; created_at: string };

/**
 * Saved conversations in the sidebar.
 *
 * Renders nothing at all when signed out or when there is no history — an
 * empty "Chats" heading over blank space just looks broken. Incognito threads
 * never appear here because they are never created.
 */
export default function ThreadList() {
  const t = useTranslations('chat');
  const pathname = usePathname();
  const [threads, setThreads] = useState<Thread[]>([]);

  const load = useCallback(() => {
    fetch('/api/threads')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setThreads(d.threads ?? []))
      .catch(() => setThreads([]));
  }, []);

  useEffect(() => {
    load();
    // The chat creates threads, not this component — it says so on the window
    // rather than the two needing to know about each other.
    window.addEventListener('sahn:threads-changed', load);
    return () => window.removeEventListener('sahn:threads-changed', load);
  }, [load]);

  async function remove(id: string) {
    setThreads((prev) => prev.filter((x) => x.id !== id));
    await fetch(`/api/threads/${id}`, { method: 'DELETE' }).catch(() => undefined);
  }

  if (threads.length === 0) return null;

  return (
    <section className="mb-5">
      <h2 className="px-3 pb-1.5 text-[10px] font-medium tracking-wider text-muted uppercase">
        {t('threadsHeading')}
      </h2>
      <ul>
        {threads.map((thread) => {
          const href = `/c/${thread.id}`;
          const active = pathname === href;
          return (
            <li key={thread.id} className="group/thread flex items-center">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`min-w-0 flex-1 truncate rounded-sm px-3 py-1.5 text-sm transition-colors ${
                  active ? 'bg-sunk text-ink' : 'text-muted hover:bg-sunk hover:text-ink'
                }`}
              >
                {thread.title}
              </Link>
              <button
                type="button"
                onClick={() => remove(thread.id)}
                aria-label={t('deleteThread')}
                className="px-2 text-muted opacity-0 transition-opacity group-hover/thread:opacity-100 hover:text-clay focus-visible:opacity-100"
              >
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
