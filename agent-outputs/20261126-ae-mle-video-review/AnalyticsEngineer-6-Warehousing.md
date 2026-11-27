# AnalyticsEngineer-6-Warehousing (9:53, 593.3 s)

Second review. The first pass (2026-11-20) raised 13 findings, and its fixer fixed all 13.

## Verdict
- Every earlier fix holds on screen. The P1 on partition grain holds (element-401.jpeg): the month files are in ink, "still far under the usual 128 MB to 1 GB" is red, and "At this size, one file" is the green answer, said aloud in `hurt-month`. The other fixes also hold:
  - the Q5 tally, including 769 kB and the `LIMIT` line (element-242.jpeg);
  - the band and the matched config in the dbt listing (element-251.jpeg);
  - the one-line dictionary codes (element-190.jpeg);
  - the suspend wait in Q9 (element-457.jpeg);
  - the App box arriving with its arrows (element-122.jpeg);
  - "9.8 MB in all" under the day grid;
  - the yellow slots and the slot caption (element-108.jpeg);
  - "size M → L" in Q1;
  - "Home & Kitchen";
  - Redshift with no initialism;
  - "5 times the bytes" held for about 3 s (element-336.jpeg).
- Every number on screen still matches `results.json` or de-warehousing's `results.json`.
- That pass missed one answer gap. Q9 asks how compute "drives cost". The answer covers which meter runs (time or bytes) and the idle time. It never says that a warehouse's size sets the rate. "Do I size up?" is the follow-up an interviewer asks next.
- The rest is small. In Q3 the Transform step is drawn as a box outside the warehouse, while the narration says "transformed there". In Q9 the busy minutes are in data blue.
- Pacing is unchanged and comfortable. The beats run 1.8 to 3.1 words a second, no gap is under 0.55 s, and every scene holds its finished state for at least 1.6 s.

## Findings

### 1. [P2] answer: Q9 never says that size sets the rate
- When: 411.1-426.4 s, beat `compute-def`, from "Snowflake bills credits per second while a warehouse runs" (415.8 s) (element-425.jpeg, element-457.jpeg)
- What: the question is "What is a virtual warehouse, or slot, or compute cluster, and how does it drive cost?" The answer gives each vendor's meter (credits per second, bytes or slots, nodes), then the idle-hour model. Nothing says what the size of the compute does to the bill. On Snowflake, each warehouse size up doubles the credits billed per second. The video draws XS, M and L warehouses in Q2 and a cluster scaled from M to L in Q1, but never prices the size.
- Why it matters: cost is the rate times the time. The video only covers the time. "Would you size the warehouse up to save money?" is the standard next question. The answer it needs is that a bigger warehouse costs no more only if it finishes at least twice as fast. A viewer who has only "credits per second while it runs" has no answer to it.
- Cause: `video/src/videos/ae-warehousing/script.ts:484-487` (`compute-def`); `ComputeScene.tsx:142-171` (the Snowflake column has one line).
- Fix: split `compute-def` after "while a warehouse runs." and after it, which gives `compute-def` and `compute-vendors`, two free recuts. Voice one new beat between them, `compute-size`: "Each size up doubles that rate, so a bigger warehouse costs no more only if it finishes twice as fast." (104 characters). Under "Credits per second while running", ink two soft lines on it: "Each size up doubles the rate:" and "the same bill only at twice the speed". Extend the column rules and move the model rows down to make room. Record the fact in the script header, beyond the page, as Snowflake's warehouse sizes.

### 2. [P3] confusion: Transform is drawn outside the warehouse while the narration says "transformed there"
- When: 140.8-151.8 s, beats `oltp-flow` from "transformed there" through `oltp-heavy` (element-144.jpeg, element-151.jpeg)
- What: the column strips (the warehouse) end at x≈1385. Then a yellow arrow leads out to a separate "Transform" box at x 1460-1700, with "The analytics engineer's part" under it. Rows, Extract and Load, columns and Transform read as four stages in a row, and the last one sits outside the warehouse. That is the ETL shape. The narration says the data is transformed *in* the warehouse (ELT). The scene's own comment says "the transform inside the warehouse" (`OltpScene.tsx:31`).
- Why it matters: where the T runs is what ELT means, and it is why the transform is "the analytics engineer's" step. The picture puts it on the wrong side of the warehouse's edge.
- Cause: `video/src/videos/ae-warehousing/OltpScene.tsx:205-209` (the T box placed right of the strips, with nothing grouping the two).
- Fix: on "transformed there", draw one thin ink outline (no fill) around the column strips and the Transform box together, labelled "The warehouse" inside its top-right corner. The Load arrow then ends inside it, and Transform sits inside the same edge as the data.

### 3. [P3] color: Q9's busy minutes are in data blue
- When: 431.3-459 s, beat `compute-model` from "busy for two minutes an hour" to the cut (element-457.jpeg)
- What: the "Busy" row's two ticks are blue (`BAR`), and so is its result "2 min" (`BLUE_INK`). Busy minutes are compute time, not data. Further down the same panel, blue does mean data: in the "Billed by bytes, on demand" row, the two blue bars are the bytes scanned. So one color stands for two different quantities a few rows apart, the very thing the panel contrasts.
- Why it matters: the series keeps one meaning per color, and blue is data. With the busy minutes in ink, the bytes row's blue reads as what it is: under per-byte billing, the data is the meter.
- Cause: `video/src/videos/ae-warehousing/ComputeScene.tsx:82-90` (`BAR` ticks and `BLUE_INK` result in the Busy row).
- Fix: draw the busy ticks and "2 min" in ink. Leave the bytes row's scan bars blue.
