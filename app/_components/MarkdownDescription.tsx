/**
 * Renders a lesson/role page's frontmatter `description` as inline Markdown.
 *
 * Fumadocs surfaces `description` as a raw string, and the page templates
 * previously dropped it straight into `<DocsDescription>` (which renders a
 * `<p>`). That meant inline Markdown in a description, `` `code` ``, **bold**,
 * *italic*, [links](…), showed up as literal backticks and asterisks instead
 * of being formatted. This parses the string with the same GitHub-flavoured
 * Markdown pipeline the MDX bodies use.
 *
 * The top-level paragraph React Markdown emits is unwrapped (see `components`
 * below) so the result is inline-only: `<DocsDescription>` already supplies the
 * `<p>` wrapper, and a `<p>` nested inside a `<p>` is invalid HTML, the browser
 * would auto-close the outer one and break hydration.
 */
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  // Descriptions are a single line of prose, so React Markdown produces exactly
  // one paragraph; rendering its children directly keeps the output inline.
  p: ({ children }) => <>{children}</>,
};

export function MarkdownDescription({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
