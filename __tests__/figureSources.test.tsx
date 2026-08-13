import { describe, expect, it } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { FigureSources } from "../app/_components/mdx/FigureSources";

// The credit line under a figure. A claim made in lesson *prose* takes a GFM
// footnote instead (remark-gfm is on by default; see app/docs.css); this is
// for a figure, whose caption is a JSX string prop markdown never touches.

/** The rendered tree as plain data: strings stay strings, elements become
 *  `tag:<children>`, with an href appended when the element carries one. */
function shape(node: ReactNode): unknown {
  if (Array.isArray(node)) return node.map(shape);
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode; href?: string }>;
    const tag = typeof el.type === "string" ? el.type : "component";
    const label = el.props.href ? `${tag}[${el.props.href}]` : tag;
    return { [label]: shape(el.props.children) };
  }
  return node;
}

/** Every string in the rendered tree, flattened, which is what the reader
 *  actually sees regardless of how the spans nest. */
function text(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(text).join("");
  if (isValidElement(node)) {
    return text((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}

describe("FigureSources", () => {
  it("renders nothing when a figure has no sources", () => {
    expect(FigureSources({ sources: [] })).toBeNull();
  });

  it("labels one reference in the singular and several in the plural", () => {
    expect(text(FigureSources({ sources: [{ text: "Boehm (1981)" }] }))).toContain(
      "Source",
    );
    expect(
      text(FigureSources({ sources: [{ text: "Boehm (1981)" }] })),
    ).not.toContain("Sources");
    expect(
      text(
        FigureSources({
          sources: [{ text: "Boehm (1981)" }, { text: "NIST (2002)" }],
        }),
      ),
    ).toContain("Sources");
  });

  it("links a reference that has a home and leaves one that does not as text", () => {
    const rendered = shape(
      FigureSources({
        sources: [
          { text: "Boehm (1981)", href: "https://openlibrary.org/works/OL6034830W" },
          { text: "Internal measurement" },
        ],
      }),
    );
    const dump = JSON.stringify(rendered);
    expect(dump).toContain("a[https://openlibrary.org/works/OL6034830W]");
    // The unlinked one is still rendered, just not as an anchor.
    expect(dump).toContain("Internal measurement");
    expect((dump.match(/"a\[/g) ?? []).length).toBe(1);
  });

  it("honours the inline markup a caption takes, so a title can be italic", () => {
    const dump = JSON.stringify(
      shape(FigureSources({ sources: [{ text: "Boehm, *Software Engineering Economics*" }] })),
    );
    expect(dump).toContain("em");
    expect(dump).not.toContain("*Software");
  });

  it("keeps every reference, so a list cannot be silently truncated", () => {
    const sources = [
      { text: "Boehm (1981)" },
      { text: "NIST (2002)" },
      { text: "Bossavit (2015)" },
    ];
    const rendered = text(FigureSources({ sources }));
    for (const source of sources) expect(rendered).toContain(source.text);
  });
});
