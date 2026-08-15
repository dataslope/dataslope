/**
 * Renders a lesson/role page's frontmatter `description` as inline Markdown
 * (GFM). The top-level paragraph is unwrapped so the result is inline-only:
 * `<DocsDescription>` already supplies the `<p>`, and a nested `<p>` is
 * invalid HTML that breaks hydration.
 */
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  p: ({ children }) => <>{children}</>,
};

export function MarkdownDescription({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
