'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import LocationPicker from './LocationPicker';
import { useSettings } from './SettingsProvider';

const DISMISSED_KEY = 'sahn:setup-dismissed';

/**
 * Whether to ask this visitor for a location.
 *
 * Exposed as a hook rather than kept inside the card, because the caller has
 * to change its own layout when the card appears: the empty chat state is
 * vertically centred, and a centred flex container that overflows pushes its
 * last rows underneath the sticky composer. Margin does not fix that — the
 * overflow has to not happen in the first place.
 */
export function useNeedsSetup(): { needed: boolean; dismiss: () => void } {
  const { settings, ready } = useSettings();
  const [dismissed, setDismissed] = useState(true);

  // Read after mount. Reading localStorage during render makes the server and
  // client disagree, and the card would flash on every page load.
  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === '1');
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  }, []);

  // Nothing to ask for once a location exists, however it got there.
  return { needed: ready && !dismissed && !settings?.location, dismiss };
}

/**
 * First-run prompt for a location.
 *
 * Four of the ten modules — prayer times, Qibla, the tracker and the calendar
 * — cannot compute anything without one, and a new visitor previously met a
 * chat box with no indication that any of that existed or why it was empty.
 * The features were not broken; they were unreachable, which looks the same.
 *
 * Deliberately not a wizard. Everything else has a sensible default and can be
 * changed later on the screen it belongs to. Location is the only setting with
 * no reasonable default, so it is the only one worth interrupting for.
 */
export default function FirstRunSetup({ onDismiss }: { onDismiss: () => void }) {
  const t = useTranslations('setup');
  const { settings, update } = useSettings();

  return (
    <aside className="mt-8 border border-line bg-raised p-5">
      <h2 className="font-display text-lg text-ink">{t('heading')}</h2>
      <p className="mt-2 max-w-prose text-sm text-muted">{t('body')}</p>

      <div className="mt-4">
        <LocationPicker
          location={settings?.location ?? null}
          onChange={(location) => update({ location })}
        />
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="mt-4 text-xs text-muted underline underline-offset-2 hover:text-ink"
      >
        {t('notNow')}
      </button>
    </aside>
  );
}
