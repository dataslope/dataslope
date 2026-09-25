/**
 * Multi-step SQL challenges over the warehouse dataset.
 *
 * Both are builds where one query written in a single go gets a number
 * subtly wrong. The reorder plan needs stock on hand and stock on order side
 * by side, and summing them across one join repeats every order once per
 * movement; its last step is also where forgetting the stock already on
 * order reorders gloves that are on their way. The supplier scorecard has to
 * decide what an order with nothing received means before it can score
 * anyone, because the same NULL is late in one case and not yet due in
 * another.
 *
 * `__tests__/challengeSolutions` runs every step's solution against
 * node:sqlite.
 */

import { indentSql, sqlSteps } from "./authoring";
import { WAREHOUSE } from "./dataset-warehouse";
import type { Challenge } from "./types";

/** The day stock was counted. */
const AS_OF = "2024-06-30";
/** The first day of the 14-day sales window that ends on the count date. */
const WINDOW_START = "2024-06-17";

// ─── Reorder plan ────────────────────────────────────────────────────

const STOCK_CTES = `WITH stock AS (
  SELECT sku, SUM(quantity) AS on_hand
  FROM stock_movements
  GROUP BY sku
), open_orders AS (
  SELECT sku, SUM(ordered_qty - COALESCE(received_qty, 0)) AS on_order
  FROM purchase_orders
  WHERE received_qty IS NULL OR received_qty < ordered_qty
  GROUP BY sku
)`;

const POSITION_BODY = `SELECT p.sku, p.product_name,
       COALESCE(s.on_hand, 0)  AS on_hand,
       COALESCE(o.on_order, 0) AS on_order
FROM products p
LEFT JOIN stock s       ON s.sku = p.sku
LEFT JOIN open_orders o ON o.sku = p.sku`;

const POSITION = `${STOCK_CTES}
${POSITION_BODY}
ORDER BY p.sku`;

const POSITION_CTE = `${STOCK_CTES}, stock_position AS (
${indentSql(POSITION_BODY)}
)`;

const RECENT_SALES_CTE = `recent_sales AS (
  SELECT sku, -SUM(quantity) AS sold_14d
  FROM stock_movements
  WHERE reason = 'sale' AND moved_at >= '${WINDOW_START}'
  GROUP BY sku
)`;

const DEMAND_BODY = `SELECT sp.sku, sp.on_hand, sp.on_order,
       COALESCE(r.sold_14d, 0) AS sold_14d,
       ROUND(COALESCE(r.sold_14d, 0) / 14.0, 2) AS daily_usage
FROM stock_position sp
LEFT JOIN recent_sales r ON r.sku = sp.sku`;

const DEMAND = `${POSITION_CTE}, ${RECENT_SALES_CTE}
${DEMAND_BODY}
ORDER BY sp.sku`;

const DEMAND_CTE = `${POSITION_CTE}, ${RECENT_SALES_CTE}, demand AS (
${indentSql(DEMAND_BODY)}
)`;

const REORDER_PLAN = sqlSteps(
  {
    slug: "reorder-plan",
    title: "Reorder Plan",
    difficulty: "Advanced",
    topic: "Aggregating before joining",
    dataset: WAREHOUSE,
    description:
      "Build a reorder list from stock on hand, stock already on order and the last two weeks of sales.",
    solutionNote:
      "Two separate aggregations meet in this plan, and the order of operations is the whole difficulty. Summing movements and purchase orders across one join multiplies each by the other's row count; collapsing each to one row per SKU first keeps both honest. The last step then only works because `on_order` came along: without it the plan reorders nitrile gloves that the supplier already owes.",
  },
  [
    {
      title: "Stock position per SKU",
      short: "Position",
      solutionNote:
        "Each CTE collapses its own table to one row per SKU before anything is joined, so the joins are one-to-one and nothing is counted twice. Join `products` to both raw tables and sum afterwards, and the shipping boxes show 900 on order: their one open order, repeated for each of their five movements. The `COALESCE`s turn the SKUs missing from either side into honest zeros.",
      prompt: [
        "A reorder decision needs two numbers per SKU: what is on the shelves and what is already coming. `on_hand` is the sum of the SKU's movements across all warehouses. `on_order` is what open purchase orders still owe: `ordered_qty` minus `received_qty` for every order not fully received, where nothing received counts as 0.",
        "Return every product with its `sku`, `product_name`, `on_hand` and `on_order`, including products with no movements or no open orders (show 0, not NULL). Sort by `sku`.",
        "Aggregate the ledger and the purchase orders separately, then join the results to `products`. Joining both raw tables first and summing afterwards repeats every order once per movement.",
      ],
      columns: [
        { name: "sku", type: "text" },
        { name: "product_name", type: "text" },
        { name: "on_hand", type: "integer" },
        { name: "on_order", type: "integer" },
      ],
      starter: `SELECT p.sku, p.product_name
FROM products p
ORDER BY p.sku
`,
      solution: POSITION,
      tests: [
        {
          id: "columns",
          name: "Returns sku, product_name, on_hand and on_order",
          expectedColumns: ["sku", "product_name", "on_hand", "on_order"],
        },
        {
          id: "rowcount",
          name: "All eleven products",
          description: "Ear plugs have never moved and still belong in the plan.",
          expectedRowCount: 11,
        },
        {
          id: "ordered",
          name: "Stock and orders match the reference result",
          description: "Shipping boxes have 180 on order, not 180 once for every box movement.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Average daily usage",
      short: "Usage",
      solutionNote:
        "`AVG(-quantity)` over the sale rows is the average size of a sale, a different number that ignores every day nothing sold. A usage rate is a total divided by a length of time, so the denominator is the window, 14, whatever the rows say, and a SKU with no recent sales comes through the `LEFT JOIN` at 0.",
      prompt: [
        `Next, how fast is each SKU selling? Add up the units sold in the 14 days up to the count, from \`'${WINDOW_START}'\` onwards, as \`sold_14d\`, and divide by 14 for \`daily_usage\`, rounded to 2 decimal places.`,
        "Divide by all 14 days, not by the days that happened to have a sale: the shipping boxes sold 40 on one day and nothing on the other 13, which is about 2.86 a day, not 40. A SKU with no sales in the window uses 0.",
        "Keep all eleven SKUs. Return `sku`, `on_hand`, `on_order`, `sold_14d` and `daily_usage`, sorted by `sku`.",
      ],
      columns: [
        { name: "sku", type: "text" },
        { name: "on_hand", type: "integer" },
        { name: "on_order", type: "integer" },
        { name: "sold_14d", type: "integer" },
        { name: "daily_usage", type: "real" },
      ],
      starter: `${POSITION_CTE}
SELECT sp.sku, sp.on_hand, sp.on_order
FROM stock_position sp
ORDER BY sp.sku
`,
      solution: DEMAND,
      tests: [
        {
          id: "columns",
          name: "Returns sku, on_hand, on_order, sold_14d and daily_usage",
          expectedColumns: ["sku", "on_hand", "on_order", "sold_14d", "daily_usage"],
        },
        {
          id: "rowcount",
          name: "Still all eleven products",
          description: "SKUs with no recent sales stay in, at a usage of 0.",
          expectedRowCount: 11,
        },
        {
          id: "ordered",
          name: "Usage matches the reference result",
          description: "Units sold over 14 days, so one big sale is spread across the whole window.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "What to order",
      short: "Reorder",
      solutionNote:
        "Subtracting `on_order` is what makes this a plan rather than a wish list: without it, nitrile gloves come out 17 boxes short and get ordered again while the supplier still owes 20. A SKU sitting exactly at its target, like the hex nuts, needs nothing, which is why the filter is `> 0` and not `>= 0`.",
      prompt: [
        "The buyer wants enough stock for 28 days of usage, which is twice what sold in the last 14. Stock on the shelves and stock on order both count towards that target, so `reorder_qty` is `2 * sold_14d - on_hand - on_order`.",
        "Also show `days_of_cover`: how many days the stock on hand lasts at the current rate, `on_hand * 14.0 / sold_14d`, rounded to 1 decimal place. Work it out from `sold_14d` rather than the rounded `daily_usage`, which would move the last digit.",
        "Return only the SKUs that need ordering (`reorder_qty` above 0), with `sku`, `on_hand`, `on_order`, `days_of_cover` and `reorder_qty`. The one that runs out soonest comes first; break ties by `sku`.",
      ],
      columns: [
        { name: "sku", type: "text" },
        { name: "on_hand", type: "integer" },
        { name: "on_order", type: "integer" },
        { name: "days_of_cover", type: "real" },
        { name: "reorder_qty", type: "integer" },
      ],
      starter: `${DEMAND_CTE}
SELECT sku, on_hand, on_order
FROM demand
`,
      solution: `${DEMAND_CTE}
SELECT sku, on_hand, on_order,
       ROUND(on_hand * 14.0 / sold_14d, 1) AS days_of_cover,
       2 * sold_14d - on_hand - on_order AS reorder_qty
FROM demand
WHERE 2 * sold_14d - on_hand - on_order > 0
ORDER BY days_of_cover, sku`,
      tests: [
        {
          id: "columns",
          name: "Returns sku, on_hand, on_order, days_of_cover and reorder_qty",
          expectedColumns: ["sku", "on_hand", "on_order", "days_of_cover", "reorder_qty"],
        },
        {
          id: "rowcount",
          name: "Three SKUs to reorder",
          description: "The gloves already on order cover what the gloves need.",
          expectedRowCount: 3,
        },
        {
          id: "ordered",
          name: "Soonest to run out first",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
  ],
);

// ─── Supplier scorecard ──────────────────────────────────────────────

const LEAD_BODY = `SELECT po.po_id, s.supplier_name, po.ordered_on, po.expected_on,
       date(MIN(m.moved_at)) AS first_received,
       CAST(julianday(date(MIN(m.moved_at))) - julianday(po.ordered_on) AS INTEGER) AS lead_days
FROM purchase_orders po
JOIN suppliers s ON s.supplier_id = po.supplier_id
LEFT JOIN stock_movements m
  ON m.ref = po.po_id AND m.reason = 'receipt'
GROUP BY po.po_id, s.supplier_name, po.ordered_on, po.expected_on`;

const LEAD_TIMES = `${LEAD_BODY}
ORDER BY po.po_id`;

const LEAD_CTE = `WITH lead_times AS (
${indentSql(LEAD_BODY)}
)`;

const JUDGED_BODY = `SELECT po_id, supplier_name, expected_on, first_received, lead_days,
       CASE
         WHEN first_received IS NOT NULL
           THEN IIF(first_received <= expected_on, 1, 0)
         WHEN expected_on < '${AS_OF}' THEN 0
       END AS on_time
FROM lead_times`;

const JUDGED = `${LEAD_CTE}
${JUDGED_BODY}
ORDER BY po_id`;

const JUDGED_CTE = `${LEAD_CTE}, judged AS (
${indentSql(JUDGED_BODY)}
)`;

const SUPPLIER_SCORECARD = sqlSteps(
  {
    slug: "supplier-scorecard",
    title: "Supplier Scorecard",
    difficulty: "Intermediate",
    topic: "Judging open records",
    dataset: WAREHOUSE,
    description:
      "Score suppliers on lead time, on-time delivery and fill rate, without penalising orders not yet due.",
    solutionNote:
      "An order with nothing received is one of two things depending on the calendar: overdue or simply not due. Fold the not-yet-due order into the score and Harrow Safety is punished for an order not due until July; drop the overdue one and Kestrel is let off for 180 boxes it never sent. Labelling every order first turns the scorecard into a plain `GROUP BY`.",
  },
  [
    {
      title: "Lead time per order",
      short: "Lead time",
      solutionNote:
        "`LEFT JOIN` keeps the orders nothing has arrived for, and `GROUP BY` with `MIN(m.moved_at)` folds a split delivery back into one row dated by its first drop. Without the grouping, the box order delivered in two drops appears twice. `date()` strips the time of day so the lead time is a whole number of days.",
      prompt: [
        "Receipts in `stock_movements` carry the purchase order they delivered in `ref`. Some orders arrived in more than one delivery, and some have not arrived at all.",
        "For every purchase order, return the `po_id`, the `supplier_name`, `ordered_on`, `expected_on`, the date of its first receipt as `first_received` (the date only), and `lead_days`: the days from `ordered_on` to that date. An order with no receipt yet has NULL in both. One row per order, sorted by `po_id`.",
      ],
      columns: [
        { name: "po_id", type: "text" },
        { name: "supplier_name", type: "text" },
        { name: "ordered_on", type: "text" },
        { name: "expected_on", type: "text" },
        { name: "first_received", type: "text" },
        { name: "lead_days", type: "integer" },
      ],
      starter: `SELECT po.po_id, s.supplier_name, po.ordered_on, po.expected_on
FROM purchase_orders po
JOIN suppliers s ON s.supplier_id = po.supplier_id
ORDER BY po.po_id
`,
      solution: LEAD_TIMES,
      tests: [
        {
          id: "columns",
          name: "Returns po_id, supplier_name, ordered_on, expected_on, first_received and lead_days",
          expectedColumns: [
            "po_id",
            "supplier_name",
            "ordered_on",
            "expected_on",
            "first_received",
            "lead_days",
          ],
        },
        {
          id: "rowcount",
          name: "All fourteen orders, once each",
          description:
            "The boxes delivered in two drops count once, and the two open orders stay in.",
          expectedRowCount: 14,
        },
        {
          id: "ordered",
          name: "Lead times match the reference result",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "On time or late",
      short: "On time",
      solutionNote:
        "A `CASE` with no `ELSE` returns NULL for anything its branches do not cover, which is exactly the right label for an order that cannot be judged yet. Comparing the dates as text works because `YYYY-MM-DD` sorts in date order.",
      prompt: [
        "An order is on time when its first delivery arrived on or before `expected_on`. Add an `on_time` column that is 1 for on time and 0 for late.",
        `The open orders need a decision too. One whose \`expected_on\` is before the count date, \`'${AS_OF}'\`, is already late and scores 0. One that is not due yet has not been judged, so it gets NULL.`,
        "Return `po_id`, `supplier_name`, `expected_on`, `first_received`, `lead_days` and `on_time` for all fourteen orders, sorted by `po_id`.",
      ],
      columns: [
        { name: "po_id", type: "text" },
        { name: "supplier_name", type: "text" },
        { name: "expected_on", type: "text" },
        { name: "first_received", type: "text" },
        { name: "lead_days", type: "integer" },
        { name: "on_time", type: "integer" },
      ],
      starter: `${LEAD_CTE}
SELECT po_id, supplier_name, expected_on, first_received, lead_days
FROM lead_times
ORDER BY po_id
`,
      solution: JUDGED,
      tests: [
        {
          id: "columns",
          name: "Adds an on_time column",
          expectedColumns: [
            "po_id",
            "supplier_name",
            "expected_on",
            "first_received",
            "lead_days",
            "on_time",
          ],
        },
        {
          id: "rowcount",
          name: "Still fourteen orders",
          expectedRowCount: 14,
        },
        {
          id: "ordered",
          name: "Every order labelled correctly",
          description:
            "The overdue box order scores 0; the ear plugs are not due until July, so they score NULL.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
    {
      title: "Score each supplier",
      short: "Score",
      solutionNote:
        "Filtering to the judged orders before aggregating makes both corrections at once: Harrow Safety's July order leaves every denominator, and Kestrel's overdue order stays in as late, with nothing received against 180 ordered. Because `on_time` is a 0-or-1 flag, its average is the on-time rate.",
      prompt: [
        "Roll it up per supplier, over the orders that have been judged (a non-NULL `on_time`). Return how many there are as `pos_due`, the percentage delivered on time as `on_time_pct`, and `fill_pct`: units received as a percentage of units ordered, where an order with nothing received counts as 0 received. Take the quantities from `purchase_orders`, and round both percentages to 1 decimal place.",
        "Add `avg_lead_days`, the average lead time of the judged orders that have arrived, rounded to 1 decimal place.",
        "Best on-time record first, ties by `supplier_name`.",
      ],
      columns: [
        { name: "supplier_name", type: "text" },
        { name: "pos_due", type: "integer" },
        { name: "on_time_pct", type: "real" },
        { name: "fill_pct", type: "real" },
        { name: "avg_lead_days", type: "real" },
      ],
      starter: `${JUDGED_CTE}
SELECT j.supplier_name, COUNT(*) AS pos_due
FROM judged j
JOIN purchase_orders po ON po.po_id = j.po_id
GROUP BY j.supplier_name
`,
      solution: `${JUDGED_CTE}
SELECT j.supplier_name,
       COUNT(*) AS pos_due,
       ROUND(100.0 * AVG(j.on_time), 1) AS on_time_pct,
       ROUND(100.0 * SUM(COALESCE(po.received_qty, 0)) / SUM(po.ordered_qty), 1) AS fill_pct,
       ROUND(AVG(j.lead_days), 1) AS avg_lead_days
FROM judged j
JOIN purchase_orders po ON po.po_id = j.po_id
WHERE j.on_time IS NOT NULL
GROUP BY j.supplier_name
ORDER BY on_time_pct DESC, j.supplier_name`,
      tests: [
        {
          id: "columns",
          name: "Returns supplier_name, pos_due, on_time_pct, fill_pct and avg_lead_days",
          expectedColumns: [
            "supplier_name",
            "pos_due",
            "on_time_pct",
            "fill_pct",
            "avg_lead_days",
          ],
        },
        {
          id: "rowcount",
          name: "All four suppliers",
          expectedRowCount: 4,
        },
        {
          id: "ordered",
          name: "Scores match the reference result",
          description:
            "The ear plug order due in July is left out; the overdue box order counts as late and unfilled.",
          matchesSolution: true,
          ordered: true,
        },
      ],
    },
  ],
);

export const SQL_MULTI_WAREHOUSE: Challenge[] = [REORDER_PLAN, SUPPLIER_SCORECARD];
