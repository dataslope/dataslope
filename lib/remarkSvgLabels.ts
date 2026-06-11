/**
 * Remark plugin: insert a <SvgLabel figId="svg-N" /> element after each
 * top-level <svg> block in an MDX file.
 *
 * Why a remark plugin (not an MDX component override):
 * In MDX v3 with fumadocs-mdx dynamic compilation, the `svg` key in the
 * MDX components map does not reliably intercept inline <svg> elements —
 * the compiled output may call React.createElement("svg", ...) directly
 * rather than going through `_components.svg`. A remark plugin runs during
 * compilation and injects a new MDAST node, which is the same approach
 * fumadocs-core/remarkMdxMermaid uses for Mermaid code blocks.
 *
 * IDs are sequential within each file (svg-1, svg-2, …). Per-file
 * uniqueness is sufficient because the user references graphics in the
 * context of a specific lesson page.
 *
 * Only root-level <svg> elements are processed; SVGs nested inside other
 * components are left untouched.
 */

type AnyNode = Record<string, unknown> & { type?: string };

export function remarkSvgLabels() {
  return (tree: AnyNode): void => {
    const children = tree.children as AnyNode[] | undefined;
    if (!Array.isArray(children)) return;

    let counter = 0;
    const next: AnyNode[] = [];

    for (const child of children) {
      next.push(child);

      if (
        child.type === "mdxJsxFlowElement" &&
        (child as { name?: string }).name === "svg"
      ) {
        counter++;
        const figId = `svg-${counter}`;

        next.push({
          type: "mdxJsxFlowElement",
          name: "SvgLabel",
          attributes: [
            { type: "mdxJsxAttribute", name: "figId", value: figId },
          ],
          children: [],
        });
      }
    }

    tree.children = next;
  };
}
