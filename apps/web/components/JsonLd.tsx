/**
 * Server component that emits a JSON-LD <script> for structured data (SEO/AEO).
 * Answer engines (Google AI, Perplexity, ChatGPT) and rich results read these
 * graphs to understand and cite the page. Render one per schema object.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe here — it's our own static data, and
      // angle brackets in strings are escaped to avoid breaking out of <script>.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
