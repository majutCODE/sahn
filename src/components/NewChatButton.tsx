'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';

/** Broadcast so an already-mounted ChatRoom clears itself. */
export const NEW_CHAT_EVENT = 'sahn:new-chat';

/**
 * Starts a fresh conversation.
 *
 * This cannot be a plain link to "/". When you are already on the home screen
 * with a conversation open, navigating to the route you are on is a no-op —
 * the router does nothing, the component never remounts, and the button
 * appears broken. So it navigates when it needs to and always tells the chat
 * to reset.
 */
export default function NewChatButton({
  className,
  onNavigate
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations('nav');
  const router = useRouter();
  const pathname = usePathname();

  function start() {
    if (pathname !== '/') router.push('/');
    // Fires in both cases: after a route change the fresh ChatRoom mounts empty
    // and ignores it, and on the home screen it is what actually clears state.
    window.dispatchEvent(new Event(NEW_CHAT_EVENT));
    onNavigate?.();
  }

  return (
    <button type="button" onClick={start} className={className}>
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path
          d="M8 3v10M3 8h10"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-start">{t('newChat')}</span>
    </button>
  );
}
