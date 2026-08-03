'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Locale } from '@/i18n/routing';
import { decryptTranscript, encryptTranscript } from '@/lib/counsel/crypto';
import AnswerBody from './AnswerBody';

type Helpline = { name: string; contact: string; note?: Record<string, string> };

type Turn = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  crisis: boolean;
  resources: Helpline[];
  streaming: boolean;
  error: string | null;
};

type Saved = { id: string; created_at: string; content: string };

export default function CounselRoom() {
  const t = useTranslations('counsel');
  const locale = useLocale() as Locale;

  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [passphrase, setPassphrase] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'done' | 'failed'>(
    'idle'
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const nextId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [turns]);

  const loadSaved = useCallback(async () => {
    const res = await fetch('/api/counsel/threads').catch(() => null);
    if (!res?.ok) return;
    setSaved((await res.json()).threads as Saved[]);
  }, []);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  async function send() {
    const message = draft.trim();
    if (!message || busy) return;
    setDraft('');
    setBusy(true);

    const mine: Turn = {
      id: nextId.current++,
      role: 'user',
      text: message,
      crisis: false,
      resources: [],
      streaming: false,
      error: null
    };
    const reply: Turn = {
      id: nextId.current++,
      role: 'assistant',
      text: '',
      crisis: false,
      resources: [],
      streaming: true,
      error: null
    };
    setTurns((prev) => [...prev, mine, reply]);

    const patch = (changes: Partial<Turn>) =>
      setTurns((prev) =>
        prev.map((turn) => (turn.id === reply.id ? { ...turn, ...changes } : turn))
      );

    // History travels with the request because the server keeps none.
    const history = turns.map((turn) => ({ role: turn.role, content: turn.text }));

    let response: Response;
    try {
      response = await fetch('/api/counsel', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, locale, history })
      });
    } catch {
      patch({ streaming: false, error: 'network' });
      setBusy(false);
      return;
    }

    // The sensitive route answers as JSON: fixed copy, no model, nothing to
    // stream. Same handling as the main chat surface.
    if ((response.headers.get('content-type') ?? '').includes('application/json')) {
      const data = await response.json();
      patch(
        response.ok
          ? {
              streaming: false,
              text: data.text,
              crisis: Boolean(data.crisis),
              resources: data.resources ?? []
            }
          : { streaming: false, error: data.error ?? 'failed' }
      );
      setBusy(false);
      return;
    }

    if (!response.body) {
      patch({ streaming: false, error: 'failed' });
      setBusy(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let answer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        const event = /^event: (.+)$/m.exec(frame)?.[1];
        const raw = /^data: (.+)$/m.exec(frame)?.[1];
        if (!event || !raw) continue;
        const data = JSON.parse(raw);
        if (event === 'delta') {
          answer += data.text;
          patch({ text: answer });
        } else if (event === 'error') patch({ error: data.message });
      }
    }

    patch({ streaming: false });
    setBusy(false);
  }

  async function save() {
    if (passphrase.length < 8 || turns.length === 0) return;
    setSaveState('saving');

    const transcript = JSON.stringify({
      saved_at: new Date().toISOString(),
      turns: turns.map((turn) => ({ role: turn.role, text: turn.text }))
    });

    const content = await encryptTranscript(transcript, passphrase);
    const res = await fetch('/api/counsel/threads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content })
    }).catch(() => null);

    setSaveState(res?.ok ? 'done' : 'failed');
    if (res?.ok) void loadSaved();
  }

  async function open(thread: Saved) {
    const plaintext = await decryptTranscript(thread.content, passphrase);
    setOpenId(thread.id);
    if (!plaintext) {
      setOpened(null);
      return;
    }
    const parsed = JSON.parse(plaintext) as {
      turns: { role: string; text: string }[];
    };
    setOpened(
      parsed.turns
        .map((turn) => `**${t(turn.role === 'user' ? 'you' : 'sahn')}**\n\n${turn.text}`)
        .join('\n\n---\n\n')
    );
  }

  async function remove(id: string) {
    await fetch(`/api/counsel/threads?id=${id}`, { method: 'DELETE' }).catch(
      () => null
    );
    if (openId === id) {
      setOpenId(null);
      setOpened(null);
    }
    void loadSaved();
  }

  return (
    <div className="mt-8">
      <p className="border-s-2 border-glaze ps-4 text-sm text-muted">
        {t('privacyNote')}
      </p>

      <div className="mt-8">
        {turns.map((turn) => (
          <div key={turn.id} className="mb-6">
            <p className="text-[10px] tracking-wider text-muted uppercase">
              {t(turn.role === 'user' ? 'you' : 'sahn')}
            </p>
            {turn.role === 'user' ? (
              <p className="mt-1.5 text-base whitespace-pre-wrap text-ink">
                {turn.text}
              </p>
            ) : turn.error ? (
              <p className="mt-1.5 text-sm text-clay">{t('failed')}</p>
            ) : (
              <div className="mt-1.5">
                {turn.text ? (
                  <AnswerBody text={turn.text} />
                ) : (
                  <p className="text-sm text-muted">{t('thinking')}</p>
                )}
                {turn.crisis && turn.resources.length > 0 && (
                  <ul className="mt-4 border border-clay p-4">
                    {turn.resources.map((helpline) => (
                      <li key={helpline.name} className="text-sm text-ink">
                        <span className="font-medium">{helpline.name}</span>{' '}
                        <span dir="ltr">{helpline.contact}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 bg-page pt-2 pb-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={3}
          placeholder={t('placeholder')}
          className="w-full border border-line bg-raised px-3 py-2.5 text-base text-ink text-start placeholder:text-muted"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy || !draft.trim()}
          className="mt-2 border border-glaze bg-glaze px-4 py-2 text-sm text-on-glaze disabled:opacity-50"
        >
          {busy ? t('sending') : t('send')}
        </button>
      </div>

      <section className="mt-10 border-t border-line pt-8">
        <h2 className="font-display text-xl text-ink">{t('saveHeading')}</h2>
        <p className="mt-2 max-w-prose text-sm text-muted">{t('saveBody')}</p>

        <label htmlFor="passphrase" className="mt-4 block text-xs text-muted">
          {t('passphraseLabel')}
        </label>
        <input
          id="passphrase"
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          autoComplete="off"
          className="mt-1 w-full max-w-sm border border-line bg-raised px-3 py-2.5 text-ink text-start"
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={passphrase.length < 8 || turns.length === 0 || saveState === 'saving'}
            className="border border-line px-4 py-2.5 text-sm text-ink transition-colors hover:border-glaze disabled:opacity-50"
          >
            {saveState === 'saving' ? t('saving') : t('saveAction')}
          </button>
          {saveState === 'done' && (
            <span className="text-sm text-muted">{t('saved')}</span>
          )}
          {saveState === 'failed' && (
            <span className="text-sm text-clay">{t('saveFailed')}</span>
          )}
        </div>

        {saved.length > 0 && (
          <ul className="mt-6 border-t border-line">
            {saved.map((thread) => (
              <li key={thread.id} className="border-b border-line py-3">
                <div className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-muted">
                    {new Date(thread.created_at).toLocaleDateString(locale)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void open(thread)}
                    className="text-sm text-glaze underline underline-offset-2"
                  >
                    {t('openSaved')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(thread.id)}
                    className="text-sm text-muted underline underline-offset-2 hover:text-clay"
                  >
                    {t('deleteSaved')}
                  </button>
                </div>

                {openId === thread.id && (
                  <div className="mt-3 border-s-2 border-line ps-4">
                    {opened ? (
                      <AnswerBody text={opened} />
                    ) : (
                      <p className="text-sm text-clay">{t('wrongPassphrase')}</p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
