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
import { Drift, FIG_Y, FigKey, Headline, KEY, Mark, Spot, X0 } from "./parts";

const TOP = 340;
const LOANS_Y = 520;
/** The figure's right edge: borrowers' right side, where its key ends. */
const RIGHT = 1820;

/**
 * The library: is a book the title or the copy? The lesson's ER diagram,
 * built as it is named: books, then book_copies with their own barcodes,
 * then loans pointing at a copy and the borrowers who make them. This is the
 * course's first diagram, so its key reads out the notation as the narration
 * reaches each mark: PK with the first box, the two ends with "three copies
 * of one title", UK with "their own barcode", FK with "points".
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
  const oneAt = n.word("copies", "one");
  const barcodeAt = n.word("copies", "barcode");
  const lentAt = n.word("copies", "lent");
  const separatelyAt = n.word("copies", "separately");
  const pointsAt = n.word("loan", "points");
  const notAt = n.word("loan", "not");
  const loanTitleAt = n.word("loan", "title");
  const manualAt = n.word("means", "manual");
  const tellAt = n.word("means", "tell");
  const meansAt = n.word("means", "MEANS");
  const payAt = n.word("buys-in", "pay");
  const end = n.beat("ask").from;

  const books = useEntityLayout({ x: X0, y: y(TOP), width: 300, name: "books", columns: LIBRARY.books });
  const copies = useEntityLayout({ x: 580, y: y(TOP), width: 340, name: "book_copies", columns: LIBRARY.copies });
  const loans = useEntityLayout({ x: 1040, y: y(LOANS_Y), width: 400, name: "loans", columns: LIBRARY.loans });
  const borrowers = useEntityLayout({ x: 1520, y: y(TOP), width: RIGHT - 1520, name: "borrowers", columns: LIBRARY.borrowers });

  const b = books.anchor("right", "id");
  const c = copies.anchor("left", "book_id");
  const cId = copies.anchor("right", "id");
  const lCopy = loans.anchor("left", "copy_id");
  const lBorrower = loans.anchor("right", "borrower_id");
  const br = borrowers.anchor("bottom");
  const jog1 = (b[0] + c[0]) / 2;
  const jog2 = (cId[0] + lCopy[0]) / 2;

  const fade = 1 - ease(frame, payAt, 24) * 0.55;
  // Borrowers complete the diagram once the point about loans is made; the
  // "makes" line waits for the box to reach its full height.
  const borrowersAt = loanTitleAt + 4;

  return (
    <AbsoluteFill>
      {/* ── Sound: each entity as it lands, the lines between them ── */}
      <Sfx name="el-tap" at={bookAt - 2} level={-29} />
      <Sfx name="el-tap" at={copyAt - 2} level={-29} />
      <Sfx name="el-pencil" at={shelfAt} level={-34} />
      <Sfx name="el-tap" at={lentAt - 2} level={-30} />
      <Sfx name="el-pencil" at={lentAt + 12} level={-35} />
      <Sfx name="el-tap" at={borrowersAt - 2} level={-31} />
      <Sfx name="el-pencil" at={borrowersAt + 24} level={-36} />
      <Sfx name="el-pop" at={libraryAt - 2} level={-31} />

      <Headline lead="A book:" turn="the title, or the copy?" at={libFrom - 6} turnAt={copyAt - 4} out={manualAt - 4} size={72} />
      <Headline lead="Not syntax," turn="meaning." at={manualAt + 2} turnAt={meansAt - 2} size={72} />

      <Spot id="db-why-design-books" at={libraryAt - 4} dim={payAt} left={X0 + 10} top={y(625)} width={316} height={300} />

      <Drift from={libFrom} to={end} amount={0.02} origin="60% 50%">
        <div style={{ position: "absolute", inset: 0, opacity: fade }}>
          <FigLabel n="3" title="A library, as tables" at={bookAt - 6} x={X0} y={y(FIG_Y)} />
          <FigKey
            right={RIGHT}
            top={y(FIG_Y)}
            entries={[
              { badge: "PK", text: "the row's identity", at: bookAt + 6 },
              { badge: "UK", text: "unique", at: barcodeAt },
              { badge: "FK", text: "points at another table", at: pointsAt - 2 },
              { end: "exactly-one", text: "exactly one", at: oneAt - 2 },
              { end: "zero-or-many", text: "zero or many", at: threeAt - 2 },
            ]}
          />
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
            rowAt={{ id: lentAt + 2, borrower_id: lentAt + 6, copy_id: lentAt + 10, loaned_on: separatelyAt + 2, due_on: separatelyAt + 6 }}
            marks={{ copy_id: { at: pointsAt - 2, tone: "key" } }}
          />
          <Relation
            name="book_copies appear in loans"
            points={[cId, [jog2, cId[1]], [jog2, lCopy[1]], lCopy]}
            from="exactly-one"
            to="zero-or-many"
            at={lentAt + 12}
            color={frame >= pointsAt ? KEY : INK}
            label="appears in"
            labelPos={[jog2 - 128, copies.bottom + 74]}
          />
          <Entity layout={borrowers} at={borrowersAt} rowAt={{ id: borrowersAt + 6, name: borrowersAt + 11 }} />
          <Relation
            name="borrowers make loans"
            points={[br, [br[0], lBorrower[1]], lBorrower]}
            from="exactly-one"
            to="zero-or-many"
            at={borrowersAt + 24}
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
