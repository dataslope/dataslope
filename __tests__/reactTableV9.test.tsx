/**
 * Contract tests for the TanStack Table v9 API the SQL result grids use.
 *
 * `ResultView` and `SqlChallengeCard` were ported from v8, whose
 * `useReactTable` + `get*RowModel()` options no longer exist. Both grids need
 * a live SQL engine (PGlite / sqlite-wasm, loaded from jsDelivr) before they
 * render a single row, which makes them awkward to exercise in a unit test and
 * impossible in a sandbox with no CDN egress. So this file pins the *table*
 * half of that migration instead: the same feature sets, the same column-def
 * shapes, and the row/cell accessors the components call.
 *
 * That is a deliberately narrower claim than "the grids work" — it is a guard
 * against the v9 API drifting under them, not a substitute for exercising the
 * components. What it does catch is every rename that broke the build during
 * the port (`useReactTable`, `getCoreRowModel`, `getSortedRowModel`,
 * one-argument `ColumnDef`, `getVisibleCells`).
 */
import { describe, expect, it } from "vitest";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { getInitialTableState } from "@tanstack/table-core";
import { renderToStaticMarkup } from "react-dom/server";

// ── The two feature sets the components declare ──────────────────────────
// SqlChallengeCard: a read-only preview grid, so no features at all — v9
// always builds the core row model.
const PREVIEW_FEATURES = tableFeatures({});
// ResultView: sorting only.
const RESULT_FEATURES = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

type PreviewRow = { __idx: number; row: unknown[] };
type ResultRow = { absoluteRow: number; values: unknown[] };

/** Render a component through `useTable` the way the grids do. Going through
 *  the real hook (rather than `constructTable`) is the point: it is the path
 *  the components take, and it wires the TanStack Store adapter that the bare
 *  core constructor leaves undefined. */
function renderTable(node: React.ReactElement): string {
  return renderToStaticMarkup(node);
}

describe("react-table v9: preview grid (SqlChallengeCard)", () => {
  it("exposes createColumnHelper accessors with the features type param", () => {
    const helper = createColumnHelper<typeof PREVIEW_FEATURES, PreviewRow>();
    const col = helper.accessor((d) => d.row[0], { id: "0", header: "c0" });
    expect(col.id).toBe("0");
  });

  it("builds a core row model and per-row cells with no features declared", () => {
    const helper = createColumnHelper<typeof PREVIEW_FEATURES, PreviewRow>();
    const columns = [0, 1].map((i) =>
      helper.accessor((d) => d.row[i], { id: `${i}`, header: `c${i}` }),
    );
    const data: PreviewRow[] = [
      { __idx: 0, row: ["a", 1] },
      { __idx: 1, row: ["b", 2] },
    ];
    function Grid() {
      const table = useTable({ features: PREVIEW_FEATURES, columns, data });
      return (
        <table>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {/* getAllCells, not getVisibleCells: v9 gates visibility
                    behind columnVisibilityFeature, which neither grid
                    declares. */}
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} data-col={cell.column.id}>
                    {String(cell.getValue())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    const html = renderTable(<Grid />);
    expect(html).toContain('data-col="0"');
    expect(html).toContain('data-col="1"');
    expect(html).toContain(">a</td>");
    expect(html).toContain(">1</td>");
    expect(html.match(/<tr>/g)).toHaveLength(2);
  });
});

describe("react-table v9: result grid (ResultView)", () => {
  it("accepts ColumnDef with the features type parameter", () => {
    const columns: ColumnDef<typeof RESULT_FEATURES, ResultRow>[] = [
      { id: "select", header: "", cell: () => null },
      { id: "0", accessorFn: (r) => r.values[0], header: "col0" },
    ];
    expect(columns.map((c) => c.id)).toEqual(["select", "0"]);
  });

  it("registers the sorting slot only when the sorting feature is declared", () => {
    expect(getInitialTableState(RESULT_FEATURES)).toHaveProperty("sorting");
    expect(getInitialTableState(PREVIEW_FEATURES)).not.toHaveProperty("sorting");
  });

  it("renders headers and sorting handles through the sorted row model", () => {
    const columns: ColumnDef<typeof RESULT_FEATURES, ResultRow>[] = [
      { id: "0", accessorFn: (r) => r.values[0], header: "col0" },
    ];
    const data: ResultRow[] = [
      { absoluteRow: 0, values: ["b"] },
      { absoluteRow: 1, values: ["a"] },
    ];
    function Grid() {
      const table = useTable({
        features: RESULT_FEATURES,
        columns,
        data,
        state: { sorting: [{ id: "0", desc: false }] },
        onSortingChange: () => {},
        // ResultView sorts upstream against the whole result set, not just
        // the loaded page, so the table only tracks the state.
        manualSorting: true,
      });
      return (
        <table>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} data-sorted={String(h.column.getIsSorted())}>
                    {String(h.column.columnDef.header)}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getAllCells().map((cell) => (
                  <td key={cell.id}>{String(cell.getValue())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    const html = renderTable(<Grid />);
    expect(html).toContain("col0");
    expect(html).toContain('data-sorted="asc"');
    // manualSorting: the table must NOT reorder; upstream owns the ordering.
    expect(html.indexOf(">b</td>")).toBeLessThan(html.indexOf(">a</td>"));
  });
});
