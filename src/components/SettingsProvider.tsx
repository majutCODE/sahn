'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { loadSettings, saveSettings, type Settings } from '@/lib/settings';

type SettingsContextValue = {
  /** null until localStorage has been read, which cannot happen on the server. */
  settings: Settings | null;
  update: (patch: Partial<Settings>) => void;
  ready: boolean;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * One settings store for the whole app.
 *
 * This has to be shared state rather than a per-component hook: the location
 * picker lives in the prayer panel but the Qibla dial, the tracker and the
 * calendar all read the same location, and a hook called twice would give each
 * caller its own copy that never hears about the other's changes.
 */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  // Keep other tabs honest: settings are one small object, and a stale second
  // tab showing a different city is worse than the cost of re-reading.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === 'sahn:settings') {
        setSettings(loadSettings());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ settings, update, ready: settings !== null }),
    [settings, update]
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used inside <SettingsProvider>');
  }
  return ctx;
}
