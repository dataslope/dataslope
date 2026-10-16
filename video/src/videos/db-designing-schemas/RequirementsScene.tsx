import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, INK } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Head, Kicker, Mark, MARK_KEY, Underline } from "./parts";

type Part = string | { t: string; kind: "noun" | "verb" | "fact" };

/**
 * Part 2 opens: step one, the store's requirements as plain sentences, after
 * case-study-ecommerce's list. They ink in as they are read; then the nouns
 * are washed in the key blue (the entities to come) and the verbs underlined
 * (the relationships), and the two facts of an order line are marked as the
 * narration names them.
 */
export const RequirementsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const reqsFrom = n.beat("reqs").from;
  const sentenceAt = [
    n.word("reqs", "A customer"),
    n.word("reqs", "A product"),
    n.word("reqs", "Categories"),
    n.word("contains", "an order"),
  ];
  // The third sentence's second clause arrives as it is read.
  const severalAt = n.word("reqs", "and a product");
  const quantityAt = n.word("contains", "quantity");
  const chargedAt = n.word("contains", "price charged");
  const nounsAt = n.word("nouns", "nouns");
  const verbsAt = n.word("nouns", "verbs");
  const connectAt = n.word("nouns", "connect");

  const sentences: Part[][] = [
    ["A ", { t: "customer", kind: "noun" }, " ", { t: "places", kind: "verb" }, " orders."],
    ["A ", { t: "product", kind: "noun" }, " ", { t: "has", kind: "verb" }, " a name and a price."],
    [{ t: "Categories", kind: "noun" }, " ", { t: "group", kind: "verb" }, " products,", " and a product can ", { t: "sit in", kind: "verb" }, " several."],
    ["An ", { t: "order", kind: "noun" }, " ", { t: "contains", kind: "verb" }, " products, each with a ", { t: "quantity", kind: "fact" }, " and ", { t: "the price charged", kind: "fact" }, "."],
  ];

  let noun = 0;
  let verb = 0;
  let fact = 0;
  const factAt = [quantityAt - 2, chargedAt - 2];

  const part = (p: Part, k: number) => {
    if (typeof p === "string") return <React.Fragment key={k}>{p}</React.Fragment>;
    if (p.kind === "noun") {
      const at = nounsAt + 4 + noun++ * 5;
      return (
        <Mark key={k} at={at} color={MARK_KEY}>
          {p.t}
        </Mark>
      );
    }
    if (p.kind === "verb") {
      const at = verbsAt + 2 + verb++ * 5;
      return (
        <Underline key={k} at={at}>
          {p.t}
        </Underline>
      );
    }
    return (
      <Mark key={k} at={factAt[fact++]}>
        {p.t}
      </Mark>
    );
  };

  return (
    <AbsoluteFill>
      {sentenceAt.map((t, i) => (
        <Sfx key={i} name="el-pencil" at={t - 4} level={-35} />
      ))}
      <Sfx name="el-sprinkle" at={nounsAt} level={-34} />
      <Sfx name="el-pencil" at={verbsAt} level={-34} />

      <Kicker at={reqsFrom - 10}>Case study: an online store</Kicker>
      <Head at={reqsFrom - 6} size={64}>
        What must the store remember?
      </Head>

      {sentences.map((parts, i) => (
        <Ink key={i} at={sentenceAt[i] - 4} dur={22} style={{ left: 120, top: y(330 + i * 92), whiteSpace: "nowrap" }}>
          <span style={{ ...body(40), color: INK }}>
            {parts.map((p, k) => {
              const late = i === 2 && k >= 4;
              const el = part(p, k);
              if (!late) return el;
              const q = ease(frame, severalAt - 4, 16);
              return (
                <span key={k} style={{ opacity: q, filter: q < 1 ? `blur(${(1 - q) * 1.4}px)` : undefined }}>
                  {el}
                </span>
              );
            })}
          </span>
        </Ink>
      ))}

      {/* What the marks mean, under the sentences. */}
      <Ink at={nounsAt + 2} dur={16} style={{ left: 120, top: y(720), display: "flex", gap: 40, whiteSpace: "nowrap" }}>
        <span style={{ ...body(30, true), color: INK }}>
          <Mark at={nounsAt + 2} color={MARK_KEY}>
            nouns
          </Mark>{" "}
          become entities
        </span>
      </Ink>
      <Ink at={verbsAt + 2} dur={16} style={{ left: 580, top: y(720), whiteSpace: "nowrap" }}>
        <span style={{ ...body(30, true), color: INK }}>
          <Underline at={verbsAt + 2}>verbs</Underline> become how they <Mark at={connectAt}>connect</Mark>
        </span>
      </Ink>
    </AbsoluteFill>
  );
};
