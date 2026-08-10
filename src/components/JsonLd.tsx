/**
 * Structured data.
 *
 * Serialised with JSON.stringify and escaped for the one sequence that can
 * break out of a script element. The values here are city names and computed
 * times rather than user input, but a component that emits raw JSON into a
 * script tag should be safe by construction rather than by what happens to
 * flow through it today.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c')
      }}
    />
  );
}
