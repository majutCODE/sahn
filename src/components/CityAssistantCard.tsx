'use client';

import { useRouter } from '@/i18n/navigation';
import { PREFILL_KEY } from './Composer';

/** Where the conversation began, so the chat route can count it. */
export const CTA_SOURCE_KEY = 'sahn:cta-source';

/**
 * The route from a prayer-times page into the assistant.
 *
 * The point of the cluster is not the traffic, it is whether the traffic ever
 * becomes a conversation. The source is stashed alongside the prefill and sent
 * with the first message, which counts sessions rather than clicks: someone who
 * taps this and then closes the tab is not a conversion, and counting them as
 * one would flatter the numbers that decide whether to build more pages.
 */
export default function CityAssistantCard({
  source,
  prompt
}: {
  source: string;
  prompt: string;
}) {
  const router = useRouter();

  return (
    <section className="mt-10 border border-line bg-raised p-5">
      <p className="max-w-prose text-sm text-ink">{prompt}</p>
      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem(PREFILL_KEY, prompt);
          sessionStorage.setItem(CTA_SOURCE_KEY, source);
          router.push('/');
        }}
        className="mt-4 border border-glaze bg-glaze px-4 py-2.5 text-sm text-on-glaze transition-colors hover:bg-transparent hover:text-glaze"
      >
        {prompt.length > 60 ? prompt.slice(0, 57) + '...' : prompt}
      </button>
    </section>
  );
}
