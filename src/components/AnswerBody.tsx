'use client';

import Markdown from 'react-markdown';

/**
 * Renders an assistant answer.
 *
 * The model writes markdown, so raw `**bold**` on screen is a rendering bug,
 * not a prompt problem — and it is the single thing that most makes a chat
 * surface feel unfinished.
 *
 * No `rehype-raw`: model output is untrusted text, and enabling raw HTML here
 * would let a retrieved passage or a crafted answer inject markup.
 */
export default function AnswerBody({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-base leading-relaxed text-ink">
      <Markdown
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-ink">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 ps-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 ps-5">{children}</ol>
          ),
          li: ({ children }) => <li className="ps-1">{children}</li>,
          h1: ({ children }) => (
            <h3 className="font-display text-lg text-ink">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="font-display text-lg text-ink">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="font-medium text-ink">{children}</h4>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-s-2 border-line ps-4 text-muted">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="bg-sunk px-1 py-0.5 text-[0.9em]">{children}</code>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              rel="noopener noreferrer nofollow"
              target="_blank"
              className="text-glaze underline underline-offset-2"
            >
              {children}
            </a>
          )
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}
