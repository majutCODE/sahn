'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Locale } from '@/i18n/routing';
import AnswerBody from './AnswerBody';
import Composer, { DRAFT_KEY } from './Composer';
import FirstRunSetup, { useNeedsSetup } from './FirstRunSetup';
import GirihDoorway from './GirihDoorway';
import { NEW_CHAT_EVENT } from './NewChatButton';
import SourcePanel, { type Citation } from './SourcePanel';

type Helpline = { name: string; contact: string; note?: Record<string, string> };

type Turn = {
  id: number;
  question: string;
  answer: string;
  route: 'fiqh' | 'general' | 'sensitive' | null;
  citations: Citation[];
  resources: Helpline[];
  crisis: boolean;
  streaming: boolean;
  error: string | null;
  /** Seconds to wait, when the error is a limit rather than a fault. */
  retryAfter: number | null;
};

export default function ChatRoom({ threadId: initialThread }: { threadId?: string } = {}) {
  const t = useTranslations('chat');
  const locale = useLocale() as Locale;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [open, setOpen] = useState<Citation | null>(null);
  const [incognito, setIncognito] = useState(false);
  // Held in a ref, not state: the first message creates the thread and the
  // second must reuse it, and a state update would not have landed by then.
  const threadRef = useRef<string | undefined>(initialThread);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const setup = useNeedsSetup();

  const patch = useCallback((id: number, changes: Partial<Turn>) => {
    setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  }, []);

  const ask = useCallback(
    async (question: string) => {
      const id = nextId.current++;
      setTurns((prev) => [
        ...prev,
        {
          id,
          question,
          answer: '',
          route: null,
          citations: [],
          resources: [],
          crisis: false,
          streaming: true,
          error: null,
          retryAfter: null
        }
      ]);

      // Create the thread on the first message of a saved chat. Incognito
      // never creates one, so there is nothing to leave behind.
      if (!incognito && !threadRef.current) {
        try {
          const res = await fetch('/api/threads', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ title: question.slice(0, 120) })
          });
          if (res.ok) {
            threadRef.current = (await res.json()).thread.id;
            window.dispatchEvent(new Event('sahn:threads-changed'));
          }
        } catch {
          // Signed out, or the write failed. The answer still streams; it
          // simply is not saved.
        }
      }

      let response: Response;
      try {
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            message: question,
            locale,
            threadId: threadRef.current,
            incognito
          })
        });
      } catch {
        patch(id, { streaming: false, error: 'network' });
        return;
      }

      // The sensitive route answers as plain JSON, not a stream — its copy is
      // fixed text, so there is nothing to stream and nothing to wait for.
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (!response.ok) {
          // A signed-out visitor who hits the limit has a fix available to
          // them — signing in raises it — so they get told that instead.
          const reason =
            data.error === 'rate_limited' && !data.signedIn
              ? 'rate_limited_anon'
              : (data.error ?? 'failed');
          patch(id, {
            streaming: false,
            error: reason,
            retryAfter: data.retryAfter ?? null
          });
          return;
        }
        patch(id, {
          streaming: false,
          route: data.route,
          answer: data.text,
          resources: data.resources ?? [],
          crisis: Boolean(data.crisis)
        });
        return;
      }

      if (!response.body) {
        patch(id, { streaming: false, error: 'failed' });
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

        // SSE frames are separated by a blank line; a chunk can split one.
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const event = /^event: (.+)$/m.exec(frame)?.[1];
          const raw = /^data: (.+)$/m.exec(frame)?.[1];
          if (!event || !raw) continue;
          const data = JSON.parse(raw);

          if (event === 'route') patch(id, { route: data.route });
          else if (event === 'citations') patch(id, { citations: data.citations });
          else if (event === 'delta') {
            answer += data.text;
            patch(id, { answer });
          } else if (event === 'error') patch(id, { error: data.message });
        }
      }

      patch(id, { streaming: false });
    },
    [locale, patch, incognito]
  );

  // A question typed on the courtyard page arrives through sessionStorage.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const draft = sessionStorage.getItem(DRAFT_KEY);
    if (!draft) return;
    sessionStorage.removeItem(DRAFT_KEY);
    void ask(draft);
  }, [ask]);

  useEffect(() => {
    if (!initialThread) return;
    fetch(`/api/threads/${initialThread}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const restored: Turn[] = [];
        // Messages are stored as alternating user/assistant rows; the UI shows
        // them as question-and-answer pairs.
        for (let i = 0; i < d.messages.length; i += 2) {
          const q = d.messages[i];
          const a = d.messages[i + 1];
          if (!q || q.role !== 'user') continue;
          restored.push({
            id: nextId.current++,
            question: q.content,
            answer: a?.content ?? '',
            route: a?.route ?? null,
            citations: a?.citations ?? [],
            resources: [],
            crisis: false,
            streaming: false,
            error: null,
            retryAfter: null
          });
        }
        setTurns(restored);
      })
      .catch(() => undefined);
  }, [initialThread]);

  // "New chat" while already on the home screen cannot rely on navigation —
  // the route is unchanged, so nothing remounts. The rail says so explicitly.
  useEffect(() => {
    function reset() {
      setTurns([]);
      setOpen(null);
      threadRef.current = undefined;
      sessionStorage.removeItem(DRAFT_KEY);
    }
    window.addEventListener(NEW_CHAT_EVENT, reset);
    return () => window.removeEventListener(NEW_CHAT_EVENT, reset);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [turns]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-8 sm:px-8">
      {turns.length === 0 ? (
        // Centred normally, top-aligned when the setup card is up: a centred
        // column that overflows hides its own last rows behind the composer.
        <div
          className={`flex flex-1 flex-col pb-8 ${
            setup.needed ? 'justify-start pt-2' : 'justify-center'
          }`}
        >
          <GirihDoorway variant={0} size={44} className="text-glaze" />
          <h1 className="mt-5 font-display text-3xl text-ink sm:text-4xl">
            {t('heading')}
          </h1>
          <p className="mt-3 max-w-prose text-base text-muted">
            {t('everythingElse')}
          </p>
          {/* Where the Islamic answers come from, stated up front rather than
              left for the user to infer from a citation chip. */}
          <p className="mt-4 max-w-prose border-s-2 border-brass ps-4 text-sm text-muted">
            {t('sourcesNote')}
          </p>
          {/* Only on an empty chat. Interrupting a conversation in progress to
              ask for a postcode would be worse than never asking. */}
          {setup.needed && <FirstRunSetup onDismiss={setup.dismiss} />}
        </div>
      ) : (
        <ol className="flex-1 space-y-10 pb-8">
          {turns.map((turn) => (
            <li key={turn.id}>
              <p className="text-xs tracking-wide text-muted uppercase">{t('you')}</p>
              <p className="mt-1.5 text-base whitespace-pre-wrap text-ink">
                {turn.question}
              </p>

              <div className="mt-6 flex items-center gap-2">
                <p className="text-xs tracking-wide text-muted uppercase">
                  {t('assistant')}
                </p>
                {turn.route && turn.route !== 'sensitive' && (
                  <span
                    className={`text-[10px] uppercase tracking-wider ${
                      turn.route === 'fiqh' ? 'text-glaze' : 'text-muted'
                    }`}
                  >
                    {t(`routeTag.${turn.route}`)}
                  </span>
                )}
              </div>

              <div
                className={`mt-1.5 ${
                  turn.route === 'sensitive' ? 'border-s-2 border-brass ps-4' : ''
                }`}
                aria-live={turn.streaming ? 'polite' : undefined}
              >
                {turn.error ? (
                  <p role="alert" className="text-sm text-clay">
                    {/* Only known keys are looked up — an unexpected error
                        string must not become a missing-message crash. */}
                    {t.has(`errors.${turn.error}`)
                      ? t(`errors.${turn.error}`, {
                          seconds: turn.retryAfter ?? 20
                        })
                      : t('errors.failed')}
                  </p>
                ) : (
                  <>
                    {turn.answer && <AnswerBody text={turn.answer} />}
                    {turn.streaming && !turn.answer && (
                      <p className="text-base text-muted">{t('thinking')}</p>
                    )}
                  </>
                )}

                {turn.resources.length > 0 && (
                  <ul className="mt-4 border-t border-line pt-3">
                    {turn.resources.map((r) => (
                      <li key={r.name} className="py-1.5 text-sm">
                        <span className="text-ink">{r.name}</span>
                        <span className="ms-2 tabular-nums text-glaze" dir="ltr">
                          {r.contact}
                        </span>
                        {r.note?.[locale] && (
                          <span className="ms-2 text-xs text-muted">
                            {r.note[locale]}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {turn.citations.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-muted">{t('sourcesLabel')}</p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {turn.citations.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => setOpen(c)}
                            className="border border-line px-2 py-1 text-xs text-muted transition-colors hover:border-glaze hover:text-ink"
                          >
                            {c.reference}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* A message with no citations is general knowledge, and the
                    spec requires that to be visible rather than implied. */}
                {!turn.streaming &&
                  turn.route === 'general' &&
                  turn.citations.length === 0 &&
                  !turn.error && (
                    <p className="mt-4 text-xs text-muted">{t('uncited')}</p>
                  )}
              </div>
            </li>
          ))}
          <div ref={endRef} />
        </ol>
      )}

      <div className="sticky bottom-0 bg-surface pt-2 pb-4">
        <div className="mb-2 flex items-center justify-end">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={incognito}
              disabled={turns.length > 0}
              onChange={(e) => setIncognito(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            {incognito ? t('incognitoOn') : t('incognito')}
          </label>
        </div>
        <Composer
          autoFocus
          // The setup card and three example prompts compete for the same
          // attention on a first visit, and together they push the card under
          // the composer on a laptop screen. The card wins; the suggestions
          // come back the moment it is answered or dismissed.
          showSuggestions={turns.length === 0 && !setup.needed}
          onSubmit={(text) => void ask(text)}
        />
      </div>

      <SourcePanel citation={open} onClose={() => setOpen(null)} />
    </div>
  );
}
