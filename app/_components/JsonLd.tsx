/**
 * Renders one or more schema.org objects as `<script type="application/ld+json">`
 * tags. A server component (no client JS), safe to drop into any page.
 *
 * The `<` → `<` escape prevents a stray `</script>` inside any string
 * value (e.g. a lesson description) from breaking out of the script element,
 * the standard XSS guard for inlined JSON-LD.
 */
interface JsonLdProps {
  data: object | object[];
}

export function JsonLd({ data }: JsonLdProps) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, index) => (
        <script
          // Order is stable across renders; index keys are fine here.
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
