import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, note } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LIBRARY } from "./data";
import { Drift, FIG_Y, Headline, KEY, Mark, Spot, X0 } from "./parts";

const TOP = 340;
const LOANS_Y = 520;

/** An entity's columns as the kit takes them (data.ts reads them from the catalog). */
const cols = (c: (typeof LIBRARY)["books"]) => c.map(({ name, type, key }) => ({ name, type, key }));

/**
 * The library: is a book the title or the copy? The lesson's ER diagram,
 * built as it is named: books, then book_copies with their own barcodes,
 * then loans pointing at a copy and the borrowers who make them.
 */
export const LibraryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const libFrom = n.beat("library").from;
  const libraryAt = n.word("library", "library");
  const bookAt = n.word("library", "book");
  const titleAt = n.word("library", "title");
  const catalogAt = n.word("library", "catalog");
  const copyAt = n.word("library", "copy");
  const shelfAt = n.word("library", "shelf");
  const threeAt = n.word("copies", "Three");
  const barcodeAt = n.word("copies", "barcode");
  const lentAt = n.word("copies", "lent");
  const separatelyAt = n.word("copies", "separately");
  const pointsAt = n.word("loan", "points");
  const notAt = n.word("loan", "not");
  const manualAt = n.word("means", "manual");
  const tellAt = n.word("means", "tell");
  const meansAt = n.word("means", "MEANS");
  const payAt = n.word("buys-in", "pay");
  const end = n.beat("ask").from;

  const books = useEntityLayout({ x: X0, y: y(TOP), width: 300, name: "books", columns: cols(LIBRARY.books) });
  const copies = useEntityLayout({ x: 580, y: y(TOP), width: 340, name: "book_copies", columns: cols(LIBRARY.copies) });
  const loans = useEntityLayout({ x: 1040, y: y(LOANS_Y), width: 400, name: "loans", columns: cols(LIBRARY.loans) });
  const borrowers = useEntityLayout({ x: 1520, y: y(TOP), width: 300, name: "borrowers", columns: cols(LIBRARY.borrowers) });

  const b = books.anchor("right", "id");
  const c = copies.anchor("left", "book_id");
  const cId = copies.anchor("right", "id");
  const lCopy = loans.anchor("left", "copy_id");
  const lBorrower = loans.anchor("right", "borrower_id");
  const br = borrowers.anchor("bottom");
  const jog1 = (b[0] + c[0]) / 2;
  const jog2 = (cId[0] + lCopy[0]) / 2;

  const fade = 1 - ease(frame, payAt, 24) * 0.55;

  return (
    <AbsoluteFill>
      {/* ── Sound: each entity as it lands, the lines between them ── */}
      <Sfx name="el-tap" at={bookAt - 2} level={-29} />
      <Sfx name="el-tap" at={copyAt - 2} level={-29} />
      <Sfx name="el-pencil" at={shelfAt} level={-34} />
      <Sfx name="el-tap" at={lentAt - 2} level={-30} />
      <Sfx name="el-pencil" at={separatelyAt} level={-35} />
      <Sfx name="el-pop" at={libraryAt - 2} level={-31} />

      <Headline lead="A book:" turn="the title, or the copy?" at={libFrom - 6} turnAt={copyAt - 4} out={manualAt - 4} size={72} />
      <Headline lead="Not syntax," turn="meaning." at={manualAt + 2} turnAt={meansAt - 2} size={72} />

      <Spot id="db-why-design-books" at={libraryAt - 4} dim={payAt} left={X0 + 10} top={y(625)} width={316} height={300} />

      <Drift from={libFrom} to={end} amount={0.02} origin="60% 50%">
        <div style={{ position: "absolute", inset: 0, opacity: fade }}>
          <FigLabel n="3" title="A library, as tables" at={bookAt - 6} x={X0} y={y(FIG_Y)} />
          <Entity
            layout={books}
            at={bookAt - 2}
            rowAt={{ id: bookAt + 4, title: titleAt - 2, author: titleAt + 4 }}
            marks={{ title: { at: catalogAt - 2, tone: "note", out: copyAt + 6 } }}
            dim={notAt}
          />
          <Entity
            layout={copies}
            at={copyAt - 2}
            rowAt={{ id: copyAt + 4, book_id: shelfAt - 2, barcode: barcodeAt - 4 }}
            marks={{ barcode: { at: barcodeAt, tone: "note", out: lentAt + 8 }, id: { at: pointsAt + 2, tone: "key" } }}
          />
          <Relation
            name="books has book_copies"
            points={[b, [jog1, b[1]], [jog1, c[1]], c]}
            from="exactly-one"
            to="zero-or-many"
            at={shelfAt - 2}
            label="has"
            dim={notAt}
          />
          <Note at={threeAt} x={copies.left} y={copies.bottom + 22} out={lentAt + 6}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Three copies: three rows here.</span>
          </Note>

          <Entity
            layout={loans}
            at={lentAt - 4}
            rowAt={{ id: lentAt + 2, borrower_id: separatelyAt, copy_id: lentAt + 8, loaned_on: separatelyAt + 6, due_on: separatelyAt + 10 }}
            marks={{ copy_id: { at: pointsAt - 2, tone: "key" } }}
          />
          <Relation
            name="book_copies appear in loans"
            points={[cId, [jog2, cId[1]], [jog2, lCopy[1]], lCopy]}
            from="exactly-one"
            to="zero-or-many"
            at={lentAt + 4}
            color={frame >= pointsAt ? KEY : INK}
            label="appears in"
            labelPos={[jog2 - 112, copies.bottom + 74]}
          />
          <Entity layout={borrowers} at={separatelyAt - 6} />
          <Relation
            name="borrowers make loans"
            points={[br, [br[0], lBorrower[1]], lBorrower]}
            from="exactly-one"
            to="zero-or-many"
            at={separatelyAt + 2}
            label="makes"
          />
          <Note at={pointsAt + 4} x={loans.left} y={loans.bottom + 18}>
            <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
              <Mark at={tellAt - 2}>A loan points at a copy, not a title.</Mark>
            </span>
          </Note>
          <Note at={titleAt + 2} x={books.left} y={books.bottom + 18} out={copyAt}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>The title, as the catalog lists it</span>
          </Note>
          <Note at={copyAt + 4} x={copies.left} y={copies.bottom + 22} out={threeAt - 2}>
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>The copy, as it sits on the shelf</span>
          </Note>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
