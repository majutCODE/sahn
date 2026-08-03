import type { Locale } from '@/i18n/routing';
import { CONTACT_EMAIL, type LegalDocument } from '@/lib/legal';

/**
 * Renders a legal document in the reader's language.
 *
 * The prose lives in `src/lib/legal.ts` rather than in the message catalogue:
 * these are documents with their own revision date, not interface strings, and
 * mixing them into the catalogue makes both harder to review.
 */
export default function LegalPage({
  doc,
  locale,
  updatedLabel
}: {
  doc: LegalDocument;
  locale: Locale;
  updatedLabel: string;
}) {
  const updated = new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    numberingSystem: 'latn'
  }).format(new Date(doc.updated));

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="font-display text-3xl text-ink sm:text-4xl">
        {doc.title[locale]}
      </h1>
      <p className="mt-2 text-xs tracking-wide text-muted uppercase">
        {updatedLabel} {updated}
      </p>
      <p className="mt-5 max-w-prose text-base text-muted">
        {doc.intro[locale]}
      </p>

      {doc.sections.map((section) => (
        <section key={section.heading.en} className="mt-10">
          <h2 className="font-display text-xl text-ink">
            {section.heading[locale]}
          </h2>
          {section.body[locale].split('\n\n').map((paragraph, i) => (
            <p key={i} className="mt-3 max-w-prose text-sm leading-relaxed text-ink">
              {/* The contact address is substituted rather than written into
                  each document, so changing it is one edit and not six. */}
              {paragraph.split('{email}').map((part, j, parts) => (
                <span key={j}>
                  {part}
                  {j < parts.length - 1 && (
                    <a
                      href={`mailto:${CONTACT_EMAIL}`}
                      dir="ltr"
                      className="text-glaze underline underline-offset-2"
                    >
                      {CONTACT_EMAIL}
                    </a>
                  )}
                </span>
              ))}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
