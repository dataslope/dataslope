/**
 * Single-query SQL challenges over the warehouse dataset.
 *
 * What they share is the ledger. Nothing in this schema stores how much
 * stock there is: every answer starts by summing signed movements, and the
 * interesting part is what to sum over. Group too coarsely and a warehouse
 * that ran dry hides behind one that did not; join too eagerly and the SKU
 * that never moved disappears; order a running total by timestamp alone and
 * two movements booked in the same minute cancel out before anyone sees the
 * dip between them.
 *
 * The count date is 2024-06-30. Every solution is executed against
 * node:sqlite by `__tests__/challengeSolutions`, so a wrong expectation fails
 * CI.
 */

import { resultShape, sqlChallenge } from "./authoring";
import { WAREHOUSE } from "./dataset-warehouse";
import type { Challenge } from "./types";

/** The day stock was counted; anything measured "until now" runs to here. */
const AS_OF = "2024-06-30";
/** The first day of the 14-day window that ends on the count date. */
const WINDOW_START = "2024-06-17";

export const SQL_WAREHOUSE: Challenge[] = [
  sqlChallenge(
    {
      slug: "stock-on-hand",
      title: "Stock on Hand",
      difficulty: "Beginner",
      topic: "Summing a ledger",
      dataset: WAREHOUSE,
      description:
        "Work out how much of each SKU every warehouse holds by adding up its stock movements.",
      solutionNote:
        "A ledger becomes a balance with one `SUM` per group: the signs already say which way each unit moved, so receipts, sales and transfers need no special handling. Grouping by warehouse and SKU together is the point. Group by SKU alone and you get the network total, which hides that Riverside has sold every bolt it was sent.",
    },
    {
      prompt: [
        "There is no stock column anywhere in this database. `stock_movements` is a ledger: every receipt, sale, transfer and adjustment is one row with a signed `quantity`, positive when stock arrives and negative when it leaves. What a warehouse holds is the sum of everything that has happened there.",
        "Return the warehouse name, the SKU and its quantity `on_hand` for every warehouse and SKU pair that has ever had a movement, including pairs whose balance has come back to zero. Sort by `warehouse_name`, then `sku`.",
      ],
      columns: [
        { name: "warehouse_name", type: "text" },
        { name: "sku", type: "text" },
        { name: "on_hand", type: "integer" },
      ],
      starter: `SELECT w.warehouse_name, m.sku
FROM stock_movements m
JOIN warehouses w ON w.warehouse_id = m.warehouse_id
`,
      solution: `SELECT w.warehouse_name, m.sku, SUM(m.quantity) AS on_hand
FROM stock_movements m
JOIN warehouses w ON w.warehouse_id = m.warehouse_id
GROUP BY w.warehouse_name, m.sku
ORDER BY w.warehouse_name, m.sku`,
      tests: resultShape(
        ["warehouse_name", "sku", "on_hand"],
        12,
        "Twelve warehouse and SKU pairs, one of them at exactly zero.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "inventory-value-by-category",
      title: "Inventory Value by Category",
      difficulty: "Beginner",
      topic: "Aggregating an expression",
      dataset: WAREHOUSE,
      description: "Value the stock on hand at cost, one category at a time.",
      solutionNote:
        "Multiply inside the sum, `SUM(m.quantity * p.unit_cost)`, so every movement is priced at its own product's cost. `SUM(m.quantity) * p.unit_cost` looks equivalent and is not: a category holds products at different costs, and SQLite quietly picks one of them to price the whole category with.",
    },
    {
      prompt: [
        "Stock is valued at what it cost to buy: units on hand times the product's `unit_cost`. Units on hand are the sum of `quantity` in `stock_movements`, across all three warehouses.",
        "For each product `category`, return the `units` on hand and their `stock_value` at cost, rounded to 2 decimal places. Most valuable category first.",
      ],
      columns: [
        { name: "category", type: "text" },
        { name: "units", type: "integer" },
        { name: "stock_value", type: "real" },
      ],
      starter: `SELECT p.category
FROM stock_movements m
JOIN products p ON p.sku = m.sku
GROUP BY p.category
`,
      solution: `SELECT p.category,
       SUM(m.quantity) AS units,
       ROUND(SUM(m.quantity * p.unit_cost), 2) AS stock_value
FROM stock_movements m
JOIN products p ON p.sku = m.sku
GROUP BY p.category
ORDER BY stock_value DESC`,
      tests: resultShape(
        ["category", "units", "stock_value"],
        4,
        "Each movement priced at its own product's cost, then summed per category.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "outstanding-purchase-orders",
      title: "Outstanding Purchase Orders",
      difficulty: "Beginner",
      topic: "NULL in comparisons",
      dataset: WAREHOUSE,
      description:
        "List the purchase orders still waiting on stock, including the ones where nothing has arrived.",
      solutionNote:
        "`received_qty < ordered_qty` finds the partial delivery and nothing else. Comparing NULL with a number gives NULL rather than true, and `WHERE` keeps only true, so the two orders with nothing received need their own `received_qty IS NULL` test. The same NULL needs `COALESCE(received_qty, 0)` before it can be subtracted, or the outstanding quantity comes out NULL too.",
    },
    {
      prompt: [
        "A purchase order records how many units were ordered and how many have been received so far. `received_qty` stays NULL until the first delivery arrives, so an order can be waiting in two ways: nothing received yet, or less received than ordered.",
        "Return each outstanding order's `po_id`, the supplier's name, the `sku`, `ordered_qty`, `received_qty` and the `outstanding` quantity still to come. An order with nothing received is owed all of it. Sort by `po_id`.",
      ],
      columns: [
        { name: "po_id", type: "text" },
        { name: "supplier_name", type: "text" },
        { name: "sku", type: "text" },
        { name: "ordered_qty", type: "integer" },
        { name: "received_qty", type: "integer" },
        { name: "outstanding", type: "integer" },
      ],
      starter: `SELECT po.po_id, s.supplier_name, po.sku, po.ordered_qty, po.received_qty
FROM purchase_orders po
JOIN suppliers s ON s.supplier_id = po.supplier_id
`,
      solution: `SELECT po.po_id, s.supplier_name, po.sku, po.ordered_qty, po.received_qty,
       po.ordered_qty - COALESCE(po.received_qty, 0) AS outstanding
FROM purchase_orders po
JOIN suppliers s ON s.supplier_id = po.supplier_id
WHERE po.received_qty IS NULL
   OR po.received_qty < po.ordered_qty
ORDER BY po.po_id`,
      tests: resultShape(
        ["po_id", "supplier_name", "sku", "ordered_qty", "received_qty", "outstanding"],
        3,
        "Two orders with nothing received yet and one partial delivery.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "below-reorder-level",
      title: "Below Reorder Level",
      difficulty: "Intermediate",
      topic: "Outer joins with COALESCE",
      dataset: WAREHOUSE,
      description:
        "Find every SKU whose network stock is below its reorder level, including one that has never had any.",
      solutionNote:
        "An inner join to the ledger silently drops the SKU that has never moved, and it is the one most in need of stock. `LEFT JOIN` keeps it with NULL movements, and `COALESCE(SUM(m.quantity), 0)` turns its missing balance into the zero it really is. The comparison is strict, so the hex nuts, sitting at exactly 40, stay off the list.",
    },
    {
      prompt: [
        "Each product has a `reorder_level`: when the stock held across all three warehouses falls below it, the buyer orders more. Stock on hand is the sum of the SKU's movements.",
        "Return the `sku`, `product_name`, units `on_hand`, the `reorder_level` and the `shortfall` (reorder level minus on hand) for every product strictly below its level. A product that has never had a movement holds nothing, so it belongs on the list too. Largest shortfall first, ties by `sku`.",
      ],
      columns: [
        { name: "sku", type: "text" },
        { name: "product_name", type: "text" },
        { name: "on_hand", type: "integer" },
        { name: "reorder_level", type: "integer" },
        { name: "shortfall", type: "integer" },
      ],
      starter: `SELECT p.sku, p.product_name, p.reorder_level
FROM products p
-- stock on hand comes from stock_movements
`,
      solution: `SELECT p.sku, p.product_name,
       COALESCE(SUM(m.quantity), 0) AS on_hand,
       p.reorder_level,
       p.reorder_level - COALESCE(SUM(m.quantity), 0) AS shortfall
FROM products p
LEFT JOIN stock_movements m ON m.sku = p.sku
GROUP BY p.sku, p.product_name, p.reorder_level
HAVING COALESCE(SUM(m.quantity), 0) < p.reorder_level
ORDER BY shortfall DESC, p.sku`,
      tests: resultShape(
        ["sku", "product_name", "on_hand", "reorder_level", "shortfall"],
        5,
        "Five SKUs are short, one of which has never had a single movement.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "movements-by-reason",
      title: "Movements by Reason",
      difficulty: "Intermediate",
      topic: "Pivoting with FILTER",
      dataset: WAREHOUSE,
      description:
        "Break each warehouse's stock down into what was received, sold, transferred and adjusted.",
      solutionNote:
        "`SUM(quantity) FILTER (WHERE reason = 'sale')` aggregates only the rows of one kind, which turns a long ledger into a wide report in a single pass. When no row qualifies, the sum is NULL rather than 0, so each column needs a `COALESCE`: Northgate has never made an adjustment, and a NULL there reads as unknown when the true answer is none.",
    },
    {
      prompt: [
        "Every movement carries a `reason`: `receipt`, `sale`, `transfer` or `adjustment`. Turn the ledger into one row per warehouse with a column for each.",
        "Return the `warehouse_name`, units `received`, units `sold` (as a positive number), the net of transfers in and out as `transferred`, the net of adjustments as `adjusted`, and the resulting `on_hand`. A warehouse with no movements of a kind shows 0 in that column, not NULL. Sort by `warehouse_name`.",
      ],
      columns: [
        { name: "warehouse_name", type: "text" },
        { name: "received", type: "integer" },
        { name: "sold", type: "integer" },
        { name: "transferred", type: "integer" },
        { name: "adjusted", type: "integer" },
        { name: "on_hand", type: "integer" },
      ],
      starter: `SELECT w.warehouse_name, SUM(m.quantity) AS on_hand
FROM warehouses w
JOIN stock_movements m ON m.warehouse_id = w.warehouse_id
GROUP BY w.warehouse_id, w.warehouse_name
`,
      solution: `SELECT w.warehouse_name,
       COALESCE(SUM(m.quantity) FILTER (WHERE m.reason = 'receipt'), 0)     AS received,
       -COALESCE(SUM(m.quantity) FILTER (WHERE m.reason = 'sale'), 0)       AS sold,
       COALESCE(SUM(m.quantity) FILTER (WHERE m.reason = 'transfer'), 0)    AS transferred,
       COALESCE(SUM(m.quantity) FILTER (WHERE m.reason = 'adjustment'), 0)  AS adjusted,
       SUM(m.quantity) AS on_hand
FROM warehouses w
JOIN stock_movements m ON m.warehouse_id = w.warehouse_id
GROUP BY w.warehouse_id, w.warehouse_name
ORDER BY w.warehouse_name`,
      tests: resultShape(
        ["warehouse_name", "received", "sold", "transferred", "adjusted", "on_hand"],
        3,
        "Northgate made no adjustments, so its adjusted column is 0 rather than NULL.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "days-since-last-receipt",
      title: "Days Since Last Receipt",
      difficulty: "Intermediate",
      topic: "Conditions in the ON clause",
      dataset: WAREHOUSE,
      description:
        "Measure how long ago each SKU last had a delivery, with the ones never delivered first.",
      solutionNote:
        "Putting `m.reason = 'receipt'` in the `ON` clause of the `LEFT JOIN`, not in `WHERE`, is what keeps the SKU that has never been received: a `WHERE` would filter out its all-NULL row after the join. `NULLS FIRST` then lifts it to the top, where a descending sort in SQLite would otherwise leave it last. Counting any positive movement instead would date the packing tape by a transfer on June 13.",
    },
    {
      prompt: [
        `Stock that has not been delivered for a while is worth a look. For every product, find the date of its most recent \`receipt\` movement as \`last_receipt\` (the date only, no time), and \`days_since\`: the number of days from that date to the stock count on \`'${AS_OF}'\`.`,
        "Only receipts count. A transfer also adds stock to a warehouse, but nothing new arrived in the network. A product that has never been received shows NULL in both columns.",
        "Sort by `days_since` descending with the never-received products first, then by `sku`.",
      ],
      columns: [
        { name: "sku", type: "text" },
        { name: "last_receipt", type: "text" },
        { name: "days_since", type: "integer" },
      ],
      starter: `SELECT p.sku
FROM products p
`,
      solution: `SELECT p.sku,
       date(MAX(m.moved_at)) AS last_receipt,
       CAST(julianday('${AS_OF}') - julianday(date(MAX(m.moved_at))) AS INTEGER) AS days_since
FROM products p
LEFT JOIN stock_movements m
  ON m.sku = p.sku AND m.reason = 'receipt'
GROUP BY p.sku
ORDER BY days_since DESC NULLS FIRST, p.sku`,
      tests: resultShape(
        ["sku", "last_receipt", "days_since"],
        11,
        "Every product, with transfers in not counted as receipts.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "transfer-pairs",
      title: "Transfer Pairs",
      difficulty: "Intermediate",
      topic: "Self joins",
      dataset: WAREHOUSE,
      description:
        "Match the two halves of every stock transfer, including one still on the road.",
      solutionNote:
        "Joining the ledger to itself on `ref` gives each departure its arrival, and making it a `LEFT JOIN` keeps the transfer that has not arrived. The warehouses table then joins twice under two aliases, once for each end, and the second of those has to be a `LEFT JOIN` as well or the missing arrival drops the row again. `julianday` differences are in days, so multiply by 24 for hours.",
    },
    {
      prompt: [
        "A transfer is recorded twice: a negative `transfer` movement out of the sending warehouse and, when the goods arrive, a positive one into the receiving warehouse. Both halves carry the same transfer number in `ref`.",
        "Return one row per transfer: `transfer_ref`, the `sku`, the `from_warehouse` and `to_warehouse` names, the `quantity` moved (as a positive number), `shipped_at`, `arrived_at`, and `hours_in_transit` rounded to 1 decimal place. A transfer that has not arrived yet has NULL for everything about the arrival. Sort by `transfer_ref`.",
        "Pair the halves by `ref`. Two different transfers moved 24 rolls of tape from Northgate to Eastfield, so pairing on SKU and quantity matches each departure with both arrivals.",
      ],
      columns: [
        { name: "transfer_ref", type: "text" },
        { name: "sku", type: "text" },
        { name: "from_warehouse", type: "text" },
        { name: "to_warehouse", type: "text" },
        { name: "quantity", type: "integer" },
        { name: "shipped_at", type: "text" },
        { name: "arrived_at", type: "text" },
        { name: "hours_in_transit", type: "real" },
      ],
      starter: `SELECT o.ref AS transfer_ref, o.sku, o.moved_at AS shipped_at
FROM stock_movements o
WHERE o.reason = 'transfer' AND o.quantity < 0
`,
      solution: `SELECT o.ref AS transfer_ref,
       o.sku,
       wo.warehouse_name AS from_warehouse,
       wi.warehouse_name AS to_warehouse,
       -o.quantity AS quantity,
       o.moved_at AS shipped_at,
       i.moved_at AS arrived_at,
       ROUND((julianday(i.moved_at) - julianday(o.moved_at)) * 24, 1) AS hours_in_transit
FROM stock_movements o
JOIN warehouses wo ON wo.warehouse_id = o.warehouse_id
LEFT JOIN stock_movements i
  ON i.ref = o.ref AND i.reason = 'transfer' AND i.quantity > 0
LEFT JOIN warehouses wi ON wi.warehouse_id = i.warehouse_id
WHERE o.reason = 'transfer' AND o.quantity < 0
ORDER BY o.ref`,
      tests: resultShape(
        [
          "transfer_ref",
          "sku",
          "from_warehouse",
          "to_warehouse",
          "quantity",
          "shipped_at",
          "arrived_at",
          "hours_in_transit",
        ],
        4,
        "Four transfers, the last one still in transit.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "dead-stock",
      title: "Dead Stock",
      difficulty: "Intermediate",
      topic: "NOT EXISTS over a window",
      dataset: WAREHOUSE,
      description:
        "Find the SKUs that still have stock but have not sold anything in the last two weeks.",
      solutionNote:
        "The recent-sale test looks at rows the rest of the query must keep: filtering the main query to old movements would throw away half the stock-on-hand arithmetic with them. A correlated `NOT EXISTS` asks its question on the side, and `MAX(m.moved_at) FILTER (WHERE m.reason = 'sale')` finds the last sale without disturbing the balance. The vests show why the reason matters: they moved on June 26, but only between warehouses.",
    },
    {
      prompt: [
        `Dead stock is inventory that sits on the shelf. A SKU is dead when it has stock on hand across the network but no \`sale\` movement in the 14 days up to the count, that is on or after \`'${WINDOW_START}'\`.`,
        "Only sales count as selling. A transfer between warehouses moves a box without anyone buying it.",
        "Return the `sku`, `product_name`, units `on_hand`, and `last_sale`: the date of its last sale ever (the date only, NULL if it has never sold). Sort by `sku`.",
      ],
      columns: [
        { name: "sku", type: "text" },
        { name: "product_name", type: "text" },
        { name: "on_hand", type: "integer" },
        { name: "last_sale", type: "text" },
      ],
      starter: `SELECT p.sku, p.product_name, SUM(m.quantity) AS on_hand
FROM products p
JOIN stock_movements m ON m.sku = p.sku
GROUP BY p.sku, p.product_name
`,
      solution: `SELECT p.sku, p.product_name,
       SUM(m.quantity) AS on_hand,
       date(MAX(m.moved_at) FILTER (WHERE m.reason = 'sale')) AS last_sale
FROM products p
JOIN stock_movements m ON m.sku = p.sku
GROUP BY p.sku, p.product_name
HAVING SUM(m.quantity) > 0
   AND NOT EXISTS (
     SELECT 1
     FROM stock_movements s
     WHERE s.sku = p.sku
       AND s.reason = 'sale'
       AND s.moved_at >= '${WINDOW_START}'
   )
ORDER BY p.sku`,
      tests: resultShape(
        ["sku", "product_name", "on_hand", "last_sale"],
        3,
        "Three SKUs have stock and no recent sale; one of them has never sold at all.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "first-negative-balance",
      title: "First Negative Balance",
      difficulty: "Advanced",
      topic: "Running totals",
      dataset: WAREHOUSE,
      description:
        "Find the first moment each SKU's stock in a warehouse dipped below zero.",
      solutionNote:
        "The running balance is `SUM(quantity) OVER (PARTITION BY sku, warehouse_id ORDER BY moved_at, movement_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`, and every part of it matters. Partition by SKU alone and Eastfield's tape shortfall is covered by Northgate's stock. Order by `moved_at` alone and the default frame adds up every row sharing a timestamp at once, so the LED sale and receipt booked at 12:00 on June 19 cancel out and the dip between them vanishes.",
    },
    {
      prompt: [
        "Stock should never go negative, but a ledger lets it: a sale booked before the delivery that covers it drives the balance below zero until the delivery is recorded. Find where that happened.",
        "Track the running balance of each SKU in each warehouse, applying movements in `moved_at` order. Movements that share a timestamp apply one at a time, in `movement_id` order. For every SKU and warehouse whose balance ever dropped below zero, return the first movement that took it there: the `sku`, the `warehouse_name`, `moved_at` and the `balance` right after it.",
        "Sort by `moved_at`, then `sku`.",
      ],
      columns: [
        { name: "sku", type: "text" },
        { name: "warehouse_name", type: "text" },
        { name: "moved_at", type: "text" },
        { name: "balance", type: "integer" },
      ],
      starter: `SELECT m.sku, m.warehouse_id, m.moved_at, m.quantity
FROM stock_movements m
ORDER BY m.sku, m.warehouse_id, m.moved_at
`,
      solution: `WITH running AS (
  SELECT m.movement_id, m.sku, m.warehouse_id, m.moved_at,
         SUM(m.quantity) OVER (
           PARTITION BY m.sku, m.warehouse_id
           ORDER BY m.moved_at, m.movement_id
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
         ) AS balance
  FROM stock_movements m
), dips AS (
  SELECT r.*,
         ROW_NUMBER() OVER (
           PARTITION BY r.sku, r.warehouse_id
           ORDER BY r.moved_at, r.movement_id
         ) AS nth
  FROM running r
  WHERE r.balance < 0
)
SELECT d.sku, w.warehouse_name, d.moved_at, d.balance
FROM dips d
JOIN warehouses w ON w.warehouse_id = d.warehouse_id
WHERE d.nth = 1
ORDER BY d.moved_at, d.sku`,
      tests: resultShape(
        ["sku", "warehouse_name", "moved_at", "balance"],
        3,
        "Three SKU and warehouse pairs went negative; the gloves did it twice but are reported once.",
        true,
      ),
    },
  ),

  sqlChallenge(
    {
      slug: "abc-classification",
      title: "ABC Classification",
      difficulty: "Advanced",
      topic: "Cumulative share",
      dataset: WAREHOUSE,
      description:
        "Rank SKUs by the value they sold and class them A, B or C by their cumulative share.",
      solutionNote:
        "The running total is a window `SUM` ordered by value, and the grand total a second window with an empty `OVER ()`, so one pass gives both halves of the share. The tie-break is part of the ordering, not decoration: the extension cables and hex nuts both sold 124.00, and ordered by value alone they are peers, which the default frame adds up together, giving both the same cumulative share.",
    },
    {
      prompt: [
        "ABC analysis sorts products by how much value moves through them, so the few that matter most get the closest attention. Value each SKU's sales at cost: units sold times `unit_cost`. Only SKUs that sold something are classified.",
        "Rank them from the highest sold value down, breaking ties by `sku`, and work out each one's cumulative share: its own value plus everything ranked above it, divided by the total over all SKUs. A cumulative share of at most 80% is class A, at most 95% is class B, and anything above that is class C.",
        "Return the `sku`, `sold_value` rounded to 2 decimal places, `cumulative_pct` as a percentage rounded to 1 decimal place, and `abc_class`. Sort by `sold_value` descending, then `sku`.",
      ],
      columns: [
        { name: "sku", type: "text" },
        { name: "sold_value", type: "real" },
        { name: "cumulative_pct", type: "real" },
        { name: "abc_class", type: "text" },
      ],
      starter: `SELECT p.sku, -SUM(m.quantity * p.unit_cost) AS sold_value
FROM products p
JOIN stock_movements m ON m.sku = p.sku AND m.reason = 'sale'
GROUP BY p.sku
`,
      solution: `WITH sold AS (
  SELECT p.sku, -SUM(m.quantity * p.unit_cost) AS sold_value
  FROM products p
  JOIN stock_movements m ON m.sku = p.sku AND m.reason = 'sale'
  GROUP BY p.sku
), shares AS (
  SELECT sku, sold_value,
         SUM(sold_value) OVER (ORDER BY sold_value DESC, sku)
           / SUM(sold_value) OVER () AS cumulative_share
  FROM sold
)
SELECT sku,
       ROUND(sold_value, 2) AS sold_value,
       ROUND(100 * cumulative_share, 1) AS cumulative_pct,
       CASE
         WHEN cumulative_share <= 0.80 THEN 'A'
         WHEN cumulative_share <= 0.95 THEN 'B'
         ELSE 'C'
       END AS abc_class
FROM shares
ORDER BY sold_value DESC, sku`,
      tests: resultShape(
        ["sku", "sold_value", "cumulative_pct", "abc_class"],
        9,
        "Classes follow the cumulative share, with the tie at 124.00 broken by sku.",
        true,
      ),
    },
  ),
];
