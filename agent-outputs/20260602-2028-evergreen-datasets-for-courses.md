# DataSlope — Evergreen, Commercially-Safe Datasets for Courses

**Generated:** 2026-06-02
**Purpose:** A curated, license-verified catalogue of small "evergreen" datasets that DataSlope can **re-host in a public GitHub repo** and use across its courses (Pandas, data visualization, scientific computing, statistics, machine learning, NLP, time series, R, and SQL).
**Special focus:** multi-table relational datasets for the SQL courses.

**Methodology:** Five parallel research agents fanned out across the web; every license claim was checked against a primary source (the actual `LICENSE` file, dataset page, or terms-of-use page), not from memory. The nine most load-bearing claims (Chinook, Sakila, Northwind, UCI, Palmer Penguins, FiveThirtyEight, seaborn-data, diamonds→Zenodo, SILSO) were then independently re-verified by hand. **A second pass (§14–§15)** added ~50 more *standalone* datasets — from Kaggle, a broader UCI sweep, the Hugging Face Hub, government/institutional portals, and data hubs — under the same discipline (MovieLens's non-commercial terms, `banking77`'s CC BY 4.0, and Natural Earth's public-domain status were hand-checked). A third pass (§16) catalogues **scraped / legally gray-area** datasets — *for awareness only* — each with its specific risk and a clean substitute. Source URLs are cited inline and collected at the end.

---

## 1. How to read this report

Because DataSlope will **re-host** these files (not merely read them), every dataset must pass a **two-part test**:

1. **Commercial use** is permitted (DataSlope is a commercial platform), **and**
2. **Redistribution** is permitted (we copy the file into our own public repo).

A dataset can fail part 2 even when it's "free to use." The clearest example: the datasets bundled with **seaborn** are loaded by millions of tutorials, but the `seaborn-data` repository **has no license at all**, so re-hosting its CSVs is not authorized (see §11). Always source from the canonical origin.

### License tiers used throughout

| Tier | Meaning | Licenses | Re-host? |
| --- | --- | --- | --- |
| 🟢 **A** | Public domain / no rights reserved | CC0, US-Gov public domain (17 U.S.C. §105), PDDL | Yes — no attribution needed (but credit is polite) |
| 🟢 **B** | Permissive, attribution only | CC BY 4.0, MIT, BSD-2/3, PostgreSQL License | Yes — keep an attribution/NOTICE entry |
| 🟡 **C** | Usable with friction | CC BY-SA / ODbL (copyleft "ShareAlike"); unstated-but-low-risk; oversized | Yes, but isolate in its own subfolder + LICENSE, or down-sample |
| 🔴 **D** | Do not re-host | CC BY-NC (non-commercial), no license stated, proprietary / scraped | No |

### Six cross-cutting rules that decide most cases

1. **US federal government works are public domain** (17 U.S.C. §105). This single rule clears a huge amount of data: **NOAA, USGS, NASA, US Census, BLS, SSA, FEC, EPA, BTS**. Most release under CC0 explicitly via NOAA's NODD program. 🟢
2. **The entire UCI Machine Learning Repository is now CC BY 4.0** (adopted site-wide ~2022–23; verified on the Iris, Wine, Wine Quality, Auto MPG, Abalone, Breast Cancer, Heart Disease, Spambase, and SMS-Spam pages). One attribution line clears dozens of classic ML datasets. 🟢
3. **"Facts aren't copyrightable"** (US, *Feist v. Rural* 1991). The numbers inside R's GPL-licensed `datasets` package (`mtcars`, `faithful`, …) can be extracted to CSV and re-hosted; only the R *package binary* carries the GPL. Still, prefer a cleaner-licensed source when one exists. 🟡
4. **`seaborn-data` has no license** — never clone-and-host it. Pull each dataset from its real origin (`palmerpenguins`, EPA, Zenodo, `reshape2`, …). 🔴→🟢
5. **Project Gutenberg:** the *trademark/header* is licensed (20% royalty for commercial use **with** the PG branding); the **underlying public-domain text is unencumbered once you strip the PG header/footer**. Strip it, then re-host freely. 🟢
6. **Freeze time series to a closed historical window.** A live feed (current CO₂, latest earthquakes, this year's sunspots) is never evergreen. Snapshot e.g. *1958–2001* and the dataset is stable forever. 🟢

### Practical re-hosting notes for DataSlope's WASM playgrounds

- **SQLite/sql.js:** ship the prebuilt `.db` (Chinook, Northwind, Sakila port). **PGlite/Postgres:** ship the `.sql` dump. **DuckDB-WASM:** point it at CSV/Parquet.
- Keep an `ATTRIBUTION.md`/`NOTICE` in the repo for all 🟢B (CC BY / MIT / BSD) datasets.
- Put any 🟡C **ShareAlike** dataset (HYG stars, Lahman, MySQL `employees`) in its **own subdirectory with its own `LICENSE`** so the copyleft doesn't bleed into the rest of the repo.
- **Down-sample** the oversized-but-clean sets for in-browser use: `nycflights13` (~26 MB), `diamonds` (~3 MB), California Housing (~1.6 MB), HYG (~14 MB).

---

## 2. Multi-table relational datasets — SQL courses ⭐

For `intro-sql-postgres`, `sqlite-for-beginners`, `sql-analytics-duckdb`, and `database-design-postgresql`. These are the headline deliverable.

| Dataset | Tables | Size | Formats | License | Re-host? | Best for |
| --- | --- | --- | --- | --- | --- | --- |
| **Chinook** ⭐ | 11 | **~1 MB** | SQLite `.db`, SQL (PG/MySQL/SQLite/SQL Server/Oracle), CSV-exportable | **MIT** 🟢B | **Yes — top pick** | Joins, FK chains, GROUP BY, subqueries |
| **Northwind** ⭐ | 13 | ~0.5 MB (schema) | SQLite `.db`, Postgres SQL, SQL Server | **MIT** (jpwhite3 & MS ports) 🟢B | **Yes — top pick** | Classic ERP/orders schema, joins, aggregation |
| **Sakila** | 16 + 7 views | ~6 MB | MySQL SQL; **SQLite ports** (BSD) | **BSD-3** (schema+data files) 🟢B | **Yes** | Views, many-to-many, partitioning concepts |
| **Pagila** (Postgres Sakila) | 15–21 | ~3–6 MB | Postgres SQL dump / `pg_restore` | **PostgreSQL License** 🟢B | **Yes** | The canonical Postgres teaching DB |
| **Mondial** | ~33 | ~5–20 MB | SQL (PG/MySQL/Oracle), XML, RDF | **CC BY 3.0** 🟢B | Yes (advanced) | Rich geography schema, cyclic FKs, advanced joins |
| **AdventureWorksLT** | ~12 | small | SQLite port (MIT), MS scripts | **MIT** 🟢B | Yes | Sales/product schema; Microsoft-style |
| Lahman Baseball | ~27 | ~50 MB | CSV, SQLite, Postgres | CC BY-SA 3.0 🟡C | Caution (copyleft + size) | Deep historical stats, window functions |
| MySQL `employees` | 6 | ~167 MB | MySQL SQL | CC BY-SA 3.0 🟡C | No (too large) | — |
| MySQL `world` | 3 | <1 MB | MySQL SQL | **Unclear (Statistics Finland ©)** 🔴D | **No** | — |
| ClassicModels | 8 | <1 MB | MySQL SQL | **No license stated** 🔴D | **No** | — |

### Recommended SQL picks, in order

1. **Chinook** — *Digital music store* (artists → albums → tracks → invoice lines → invoices → customers; self-referential employee hierarchy). 11 tables, ~1 MB, ships as a native **SQLite `.db`**, MIT-licensed. The single best fit for an in-browser SQL course.
   Source: <https://github.com/lerocha/chinook-database> · License (MIT): <https://github.com/lerocha/chinook-database/blob/master/LICENSE.md> *(hand-verified)*
2. **Northwind** — *Food import/export company* (customers, orders, order-details, products, suppliers, employees, shippers, categories). The quintessential ERP teaching schema; the **jpwhite3 SQLite port** and **Microsoft's own `sql-server-samples`** are both MIT.
   Source: <https://github.com/jpwhite3/northwind-SQLite3> (MIT, ships `dist/northwind.db`) *(hand-verified)* · <https://github.com/microsoft/sql-server-samples> (MIT)
3. **Sakila / Pagila** — *DVD-rental store* (films, actors, inventory, rentals, payments, staff, stores). 16 tables incl. views and a many-to-many `film_actor`. Use **MySQL Sakila** (BSD), the **SQLite ports** (`bradleygrant/sakila-sqlite3` BSD-3, `jOOQ/sakila` BSD-2), or **Pagila** for Postgres.
   ⚠️ Nuance (hand-verified): only the `sakila-schema.sql` + `sakila-data.sql` files are **New BSD**; the Sakila *documentation* is **not** open-licensed — re-host the SQL/data files only.
   Sources: <https://dev.mysql.com/doc/sakila/en/sakila-license.html> · <https://github.com/jOOQ/sakila> · <https://github.com/devrimgunduz/pagila>
4. **Mondial** — *World geography* (countries, cities, rivers, mountains, organizations, languages, religions…). ~33 tables, **CC BY 3.0**; great for an intermediate/advanced course but needs conversion to SQLite. Source: <https://github.com/ullenboom/mondial-database>

### SQL datasets to AVOID / handle carefully

- 🔴 **MySQL `world`** — the data carries a *"Copyright Statistics Finland"* notice with **no open license**, plus Oracle's restrictive doc boilerplate. Do not re-host. (<https://dev.mysql.com/doc/world-setup/en/world-setup-preface.html>)
- 🔴 **ClassicModels** (mysqltutorial.org) — **no license file anywhere**; all-rights-reserved by default. Tempting (8 clean tables) but not redistributable.
- 🟡 **Lahman Baseball** & **MySQL `employees`** — both **CC BY-SA 3.0**. Commercial *verbatim* re-hosting is allowed, but ShareAlike adds copyleft friction and both are large (50 MB / 167 MB). If used, isolate with their own LICENSE; otherwise skip.
- 🟡 **AdventureWorks (full)** — MIT but ~198 MB and distributed as a SQL-Server `.bak`. Use **AdventureWorksLT** (SQLite port) instead.

---

## 3. Core tabular datasets — Pandas · Statistics · ML · Viz

These small tables are the workhorses shared across `data-analysis-python-pandas`, `statistics-for-data-science-python`, `machine-learning-scikit-learn`, `practical-r-for-beginners`, and the viz courses. (Viz-library *bundled* data and its licensing quirks are in §11; scientific/time-series/NLP follow in §12–§14.)

| Dataset | Rows × Cols | Size | License | Tier | Best for |
| --- | --- | --- | --- | --- | --- |
| **Palmer Penguins** ⭐ | 344 × 8 | ~52 KB | **CC0** | 🟢A | EDA, classification — the clean **Iris replacement** |
| Iris | 150 × 5 | ~4 KB | CC BY 4.0 (UCI) | 🟢B | Classic classification *(ethics note below)* |
| Wine | 178 × 13 | ~13 KB | CC BY 4.0 (UCI) | 🟢B | Multiclass classification |
| Wine Quality (red+white) | 6,497 × 12 | ~340 KB | CC BY 4.0 (UCI) | 🟢B | Regression, ordinal targets |
| Auto MPG | 398 × 8 | ~30 KB | CC BY 4.0 (UCI) | 🟢B | Regression, missing values |
| Abalone | 4,177 × 8 | ~187 KB | CC BY 4.0 (UCI) | 🟢B | Regression/classification |
| Breast Cancer Wisconsin | 569 × 30 | ~121 KB | CC BY 4.0 (UCI) | 🟢B | Binary classification |
| Heart Disease (Cleveland) | 303 × 13 | ~59 KB | CC BY 4.0 (UCI) | 🟢B | Clinical classification |
| **Gapminder** (excerpt) ⭐ | 1,704 × 6 | <100 KB | CC BY 4.0 | 🟢B | Life-exp/GDP/pop — bubble charts, groupby |
| mtcars | 32 × 11 | <5 KB | GPL pkg / facts free | 🟡C | Regression, R teaching |
| Old Faithful (`faithful`) | 272 × 2 | <10 KB | GPL pkg / facts free | 🟡C | Bimodal distributions, density |
| **Anscombe's Quartet** ⭐ | 48 × 3 | <5 KB | CC0 / ODbL | 🟢A | "Always plot your data" |
| **Datasaurus Dozen** ⭐ | ~1,846 × 3 | <100 KB | **MIT** | 🟢B | Same-stats/different-shape demo |
| Diamonds | 53,940 × 10 | ~3 MB | CC BY 4.0 (Zenodo) | 🟢B | Regression, big-ish categorical EDA |
| California Housing | 20,640 × 9 | ~1.6 MB | US-Gov public domain (1990 Census) | 🟢A | Regression — **Boston Housing replacement** |
| Ames Housing | 2,930 × ~80 | ~700 KB | Public records (unstated) | 🟡C | Rich regression / feature engineering |
| SSA Baby Names | ~2 MB series | ~2 MB | **CC0** (US gov) | 🟢A | Time-trend EDA, groupby, joins |
| FiveThirtyEight: Candy Power Ranking | 86 × 13 | tiny | CC BY 4.0 | 🟢B | A/B-style ranking, correlation |
| FiveThirtyEight: US Births (1994–2014) | ~7,300 × 4 | small | CC BY 4.0 | 🟢B | Seasonality, calendar effects |
| FiveThirtyEight: Bechdel Test | ~1,800 × ~15 | small | CC BY 4.0 | 🟢B | Categorical analysis |
| nycflights13 | 336,776 × 19 | ~26 MB ⚠️ | **CC0** | 🟢A (down-sample) | **Multi-table joins** (flights/airlines/airports/weather/planes) |

**Notes & flagged items**

- 🟢 **Palmer Penguins** (CC0, 344 penguins, Palmer Station LTER) is the community-standard, ethically-clean **drop-in replacement for Iris** — same 3-class structure, nicer story. Credit Dr. Kristen Gorman / Palmer Station LTER. <https://allisonhorst.github.io/palmerpenguins/> *(hand-verified CC0)*
- ⚠️ **Iris** is *legally* fine (CC BY 4.0 via UCI) but was published in the *Annals of Eugenics* (Fisher, 1936). Many educators now lead with Palmer Penguins and mention the history. Pedagogical, not legal.
- 🟡 **mtcars / Old Faithful / R base datasets** — the R `datasets` package is GPL-2|3, but the underlying *numbers* aren't copyrightable; extract to CSV and re-host (don't ship the `.rda` binary). Prefer cleaner upstreams where they exist.
- 🟡 **Ames Housing** — derived from public Ames, Iowa assessor records (effectively public domain) but with **no explicit license**; cite the public-records origin. The De Cock (2011) paper offers it explicitly as the Boston Housing alternative.
- 🟢 **nycflights13** is itself a tidy **multi-table** set (5 related tables) and doubles as a friendly SQL/join teaching set — but down-sample for WASM.

---

## 4. Data visualization

`seaborn-foundations`, `intro-data-viz-plotly`, `mastering-ggplot2`. The best viz datasets have clear categories, correlations, and a story.

**Great evergreen picks (all 🟢):** Palmer Penguins (CC0), Gapminder (CC BY 4.0 — the Hans Rosling bubble chart), Diamonds (CC BY 4.0 — price vs carat/cut), **Anscombe's Quartet** (CC0) and the **Datasaurus Dozen** (MIT) for "why you must plot," `mpg`/fuel-economy (EPA, public domain), `midwest` US-census demographics (public domain), and NOAA **Seattle weather** (public domain, the canonical Vega-Lite teaching set).

⚠️ **The library-bundled-data trap** — see §11 for the full breakdown. In short: **don't re-host `seaborn-data` directly** (no license); from **vega-datasets**, avoid `movies`, `sp500`, `stocks`, `ohlc`, `driving`; and in **ggplot2** avoid `economics` (FRED terms). The clean ones (penguins, gapminder, co2, seattle-weather, global-temp, earthquakes, political-contributions, diamonds, mpg) are all fine from their canonical sources.

---

## 5. Statistics

`statistics-for-data-science-python`, `practical-r-for-beginners`, `time-series-analysis-python`.

- **Distributions / EDA:** Old Faithful (bimodal), Wine Quality, Penguins, Abalone, Gapminder.
- **"Summary stats can lie":** **Anscombe's Quartet** (CC0) and **Datasaurus Dozen** (MIT) — identical means/correlations, wildly different plots.
- **Regression & hypothesis testing:** Auto MPG, mtcars, California/Ames Housing, Wine Quality, FiveThirtyEight US Births (seasonality).
- **Numerical-accuracy / certified answers:** **NIST StRD** (Longley, Wampler, NoInt — certified regression/ANOVA results) — public domain, tiny; perfect for "did my implementation get the right answer?" labs (see §12).

---

## 6. Machine learning

`machine-learning-scikit-learn`. Classic, small, **cleanly licensed** toy sets — every one below is 🟢:

| Task | Datasets (all UCI CC BY 4.0 unless noted) |
| --- | --- |
| Multiclass classification | **Palmer Penguins (CC0)**, Iris, Wine |
| Binary classification | Breast Cancer Wisconsin, Heart Disease, **Spambase** (CC BY 4.0), **SMS Spam** (CC BY 4.0) |
| Regression | **California Housing (public domain)**, **Ames Housing**, Auto MPG, Abalone, Wine Quality, Diamonds (CC BY 4.0) |

🔴 **AVOID — Boston Housing.** Removed from scikit-learn in **v1.2 (Dec 2022)**: its `B` feature mathematically encodes the proportion of Black residents under an explicitly racist modeling assumption. It is ethically condemned regardless of license. **Use California Housing or Ames Housing instead** — scikit-learn's own deprecation message points there. (<https://scikit-learn.org/stable/modules/generated/sklearn.datasets.fetch_california_housing.html>)

---

## 7. Scientific computing

`scientific-computing-python`. Evergreen, fixed-range, mostly US-government public domain.

| Dataset | What / use | Size | License | Tier | Source |
| --- | --- | --- | --- | --- | --- |
| **NOAA Mauna Loa CO₂** (monthly) | Trend + curve fitting; the Keeling curve | ~600 rows | **CC0** | 🟢A | <https://gml.noaa.gov/ccgg/trends/data.html> |
| Scripps CO₂ (flask) | Original Keeling record | ~800 rows | CC BY 4.0 | 🟢B | <https://scrippsco2.ucsd.edu/data/atmospheric_co2/> |
| **NIST StRD** (SRD 140) | 58 sets w/ **certified** numerical answers (regression, ANOVA, nonlinear fit) | <1 MB total | US-Gov, no copyright | 🟢A | <https://www.itl.nist.gov/div898/strd/> |
| USGS earthquakes (fixed window) | Spatial stats, Gutenberg–Richter law | 2k–25k rows | **CC0** / US-Gov | 🟢A | <https://earthquake.usgs.gov/earthquakes/search/> |
| NOAA GHCN-Monthly (station extract) | Temperature series; FFT of seasonal cycle | per-station | **CC0** | 🟢A | <https://www.ncei.noaa.gov/products/.../ghcn-monthly> |
| NOAA US Climate Normals **1991–2020** | 30-yr averages — *fixed by definition* | small | US-Gov public domain | 🟢A | <https://www.ncei.noaa.gov/access/us-climate-normals/> |
| NASA GISS global temp anomalies | 1880–present anomaly series | ~143 rows | US-Gov public domain | 🟢A | <https://data.giss.nasa.gov/gistemp/> |
| Burtin antibiotics (1951) | Small, famous viz/measurement set | 16 rows | BSD-3 (via vega) | 🟢B | vega-datasets |

🔴 **AVOID — SILSO sunspot numbers** (Royal Observatory of Belgium) are **CC BY-NC 4.0 — non-commercial** *(hand-verified at <https://www.sidc.be/SILSO/datafiles>)*. Use **`statsmodels.datasets.sunspots`** instead (1700–2008, NOAA-sourced, **public domain**).
🟡 **CAUTION — NIST CODATA physical constants (SRD 121):** governed by the Standard Reference Data Act; redistribution of the compiled file needs NIST permission. **Link to it / fetch at runtime; don't host a copy.** (scipy/astropy already ship the constants if you need them in-playground.)
🟡 **CAUTION — HYG star database:** CC BY-SA 4.0 (copyleft) and ~14 MB. Usable, but isolate it with its own LICENSE and down-sample.

---

## 8. Time series

`time-series-analysis-python`. The `statsmodels` built-ins are gold — all **public domain** and pre-frozen to historical ranges.

| Series | Span | Rows | Use | License |
| --- | --- | --- | --- | --- |
| `statsmodels` **co2** | 1958–2001 (weekly) | 2,225 | Trend + seasonal decomposition | Public domain 🟢A |
| `statsmodels` **sunspots** | 1700–2008 (annual) | 309 | Periodicity, FFT, AR models | Public domain 🟢A |
| `statsmodels` **nile** | 1871–1970 (annual) | 100 | Changepoint / structural break | Public domain 🟢A |
| `statsmodels` **elnino** (ERSST) | 1950–2010 (monthly) | 720 | ENSO oscillation, autocorrelation | Public domain 🟢A |
| `statsmodels` **macrodata** | 1959–2009 (quarterly) | 202 | Multivariate macro TS | Public domain 🟢A |
| Canadian Lynx | 1821–1934 (annual) | 114 | Predator-prey cycles, ARIMA | R GPL / facts free 🟡C |

🟡 **CAUTION — AirPassengers** (the famous 1949–1960 Box–Jenkins airline series): heavily used, but its provenance (IATA records, bundled via R's GPL `datasets`) gives it **no clean open license**. Practical risk is low, but for a commercial re-host prefer **US BTS T-100 air-traffic data** (US-Gov public domain) or the `statsmodels` series above.
🔴 Reminder: **never** ship a *live* feed (current CO₂, latest quakes, this-year sunspots) — freeze a closed window.

---

## 9. NLP / text corpora

`natural-language-processing-python`. Public-domain text + a few cleanly-licensed labelled sets.

| Corpus | What | License | Tier | Notes |
| --- | --- | --- | --- | --- |
| **Project Gutenberg** books | *Pride & Prejudice*, *Alice in Wonderland*, *Moby Dick*, complete Shakespeare | Public domain (text) | 🟢A | **Strip the PG header/footer**, then re-host freely |
| NLTK `gutenberg` / `words` / `inaugural` | 18 PD novels; word list; US inaugural addresses | Public domain | 🟢A | The clean subset of NLTK's corpora |
| US Presidential speeches / SOTU | Inaugurals, State of the Union | Public domain (US gov) | 🟢A | Use Miller Center / official text, **not** NLTK `state_union` (C-SPAN ©) |
| **UCI SMS Spam Collection** | 5,574 SMS labelled spam/ham | CC BY 4.0 | 🟢B | Clean labelled text classification set |
| **UCI Spambase** | 4,601 emails as word-frequency features | CC BY 4.0 | 🟢B | Features only (no raw email) |
| UCI Sentiment Labelled Sentences | 3,000 short reviews, pos/neg | CC BY 4.0 | 🟢B | Sentiment baseline |

🔴 **AVOID (non-commercial / no grant / proprietary):** IMDb official datasets and the **Stanford Large Movie Review** set (non-commercial); NLTK **`reuters`** (Reuters ©), **`twitter_samples`** (X/Twitter Developer Agreement), **`movie_reviews`** (no stated license); **SpamAssassin** corpus (sender © retained); **Enron** email (privacy + non-commercial mirrors).
🟡 **CAUTION:** NLTK **`names`** / **`stopwords`** have undocumented licenses (open GitHub issue #2501) — use an alternative stopword list; NLTK **`state_union`** text is PD but compiled from copyrighted C-SPAN material — use official government text instead.

---

## 10. Open-data portals — where to find *more* evergreen data

When a course needs a fresh example, these sources have clear, **commercial-friendly** licenses. Always trace an individual indicator back to its *primary* source and freeze a historical window.

| Source | License | Tier | Good evergreen examples |
| --- | --- | --- | --- |
| **US data.gov / federal agencies** | Public domain / CC0 (17 U.S.C. §105) | 🟢A | SSA Baby Names, BLS CPI, Census, NOAA, USGS, FEC, EPA |
| **UCI ML Repository** | CC BY 4.0 (site-wide) | 🟢B | Iris, Wine, Abalone, Spambase, … (dozens) |
| **FiveThirtyEight** (GitHub) | CC BY 4.0 (data) / MIT (code) | 🟢B | Candy rankings, US births, Bechdel test |
| **Our World in Data** | CC BY 4.0 (OWID's own work) | 🟢B | CO₂ & GHG emissions, life expectancy, energy mix ⚠️ trace 3rd-party indicators |
| **World Bank Open Data** | CC BY 4.0 | 🟢B | Life expectancy, fertility, GDP/capita (1960–) |
| **Gapminder** | CC BY 4.0 | 🟢B | Life exp / GDP / population (1800–) — also a CC0 R package |
| **Wikidata** | CC0 | 🟢A | Structured facts for many TidyTuesday weeks |
| TidyTuesday | **Mixed (per-dataset)** | 🟡C | Great index, but **verify each upstream** before re-hosting |
| Kaggle / data.world | **Per-dataset** | 🟡C | Filter to CC0/CC BY; confirm against the *primary* source |

---

## 11. The "bundled with a library" licensing trap (important)

Course authors instinctively reach for `sns.load_dataset(...)`, `px.data.*`, `vega_datasets`, or R's `data()`. The **data inside a library usually has a different license than the library's code** — and sometimes none at all.

- 🔴 **seaborn (`mwaskom/seaborn-data`)** — **no LICENSE file; all rights reserved by default** *(hand-verified — GitHub shows no license)*. Do **not** clone-and-host. Re-source each: `penguins`→palmerpenguins (CC0), `tips`→`reshape2` (MIT), `mpg`→EPA (PD), `diamonds`→Zenodo (CC BY 4.0), `flights`→build from BTS, `titanic`→see caution below.
- 🟡 **plotly express (`plotly.express.data`)** — repo is **MIT**. `gapminder` (CC BY 4.0), `iris` (PD), `tips` (MIT) are clean. `carshare`, `election`, `wind`, `stocks`, `medals` have undocumented provenance — low-risk Plotly demo data but no explicit data license.
- 🟡 **vega-datasets** — code is **BSD-3**; **data is per-file**. Clean: `penguins` (CC0), `gapminder`/`co2_concentration` (CC BY 4.0), `seattle_weather`/`global_temp`/`earthquakes`/`birdstrikes`/`iowa_electricity` (US-Gov PD), `political_contributions` (CC0), `burtin`/synthetic (BSD).
  🔴 **AVOID:** **`movies`** (no license, no source — IMDB/box-office data), **`sp500`/`stocks`** (Yahoo Finance ToS), **`ohlc`** (CBOE), **`driving`** (NYT ©). 🟡 caution: `cars`/`barley`/`iris` ("notspecified," old/PD, low risk), `jobs`/`population` (IPUMS terms).
- 🟡 **R base `datasets`** — package is **GPL-2|3**; the *facts* aren't copyrightable. Extract `mtcars`, `faithful`, `airquality`, `ToothGrowth`, `PlantGrowth`, etc. to CSV and re-host; don't ship the `.rda`.
- 🟡 **ggplot2** — code is **MIT**. Clean: **`diamonds`** (CC BY 4.0 via Wickham's Zenodo upload *(hand-verified)*), **`mpg`** (EPA PD), **`midwest`** (Census PD), **`presidential`** (explicitly PD). 🔴 **`economics`/`economics_long`** come from **FRED**, which prohibits commercial redistribution of third-party series — **don't re-host**. 🟡 `msleep` (Wikipedia CC BY-**SA**), `txhousing` (TAMU, unstated).

🟡 **Titanic** — the *1912 manifest* is historical/PD, but the **Kaggle competition version is non-commercial** (Kaggle rules). For a commercial re-host, use the **Vanderbilt Biostatistics** version (`hbiostat.org/data`, permissive notice, attribution) or a CC0 re-release — not the Kaggle file.

---

## 12. Consolidated AVOID / CAUTION list

### 🔴 Do NOT re-host

| Item | Why |
| --- | --- |
| **Boston Housing** | Encodes racial bias in `B`; removed from scikit-learn 1.2. Use California/Ames Housing |
| **SILSO sunspot numbers** | CC BY-**NC** (non-commercial). Use `statsmodels.sunspots` (PD) |
| MySQL **`world`** DB | "Copyright Statistics Finland," no open license |
| **ClassicModels** DB | No license stated anywhere |
| **seaborn-data** (direct clone) | Repo has no license — re-source each file upstream |
| vega **`movies`** | No license, no source (IMDB/box-office data) |
| vega **`sp500` / `stocks` / `ohlc`** | Financial data (Yahoo Finance / CBOE) |
| vega **`driving`** | NYT-copyrighted graphic |
| ggplot2 **`economics`** | FRED prohibits commercial redistribution |
| IMDb / **Stanford Movie Reviews** | Non-commercial only |
| NLTK **`reuters` / `twitter_samples` / `movie_reviews`** | Reuters © / X-Twitter agreement / no license |
| **SpamAssassin** corpus, **Enron** email | Sender © retained / privacy + non-commercial mirrors |
| **Titanic (Kaggle competition file)** | Kaggle non-commercial rules — use Vanderbilt version |

### 🟡 Usable but with friction

| Item | Why / how to handle |
| --- | --- |
| Lahman Baseball, MySQL `employees`, HYG stars | **CC BY-SA / ShareAlike** copyleft — isolate in own subfolder + LICENSE (and they're large) |
| NIST CODATA constants (SRD 121) | SRD-Act copyright — link/fetch at runtime, don't host |
| AirPassengers | No clean license (IATA/R GPL) — prefer BTS data or `statsmodels` |
| mtcars, Old Faithful, R base datasets | GPL package; extract facts to CSV, don't ship `.rda` |
| Ames Housing, seaborn `tips` | Effectively open (public records / 30-yr MIT redistribution) but **no explicit grant** — cite origin |
| nycflights13, diamonds, California Housing | Clean license but **large** — down-sample for WASM |
| OWID / World Bank / Gapminder | CC BY 4.0 on their work, but **trace third-party indicators** |
| TidyTuesday / Kaggle / data.world | Mixed per-dataset — verify each before re-hosting |

---

## 13. Quick-reference: a "starter pack" per DataSlope course

| Course | Drop-in datasets (all 🟢 unless noted) |
| --- | --- |
| `data-analysis-python-pandas` | Palmer Penguins, Gapminder, SSA Baby Names, nycflights13 (sampled), Auto MPG, Wine Quality |
| `statistics-for-data-science-python` | Anscombe's Quartet, Datasaurus Dozen, Old Faithful, Wine Quality, NIST StRD, FiveThirtyEight US Births |
| `machine-learning-scikit-learn` | Palmer Penguins, Wine, Breast Cancer, Heart Disease, California Housing, Ames Housing *(not Boston!)* |
| `scientific-computing-python` | NOAA Mauna Loa CO₂, NIST StRD, USGS earthquakes, NASA GISS temps, NOAA Climate Normals |
| `time-series-analysis-python` | `statsmodels` co2 / sunspots / nile / elnino / macrodata *(not SILSO/AirPassengers)* |
| `natural-language-processing-python` | Gutenberg (header-stripped), NLTK inaugural/gutenberg/words, UCI SMS Spam & Sentiment Sentences |
| `seaborn-foundations` / `intro-data-viz-plotly` | Penguins, Gapminder, Diamonds, mpg, Seattle weather, Anscombe/Datasaurus *(re-source, don't clone seaborn-data)* |
| `mastering-ggplot2` / `practical-r-for-beginners` | Penguins, Gapminder (CC0 R pkg), diamonds (CC BY), mpg/midwest/presidential, mtcars (CSV) |
| `intro-sql-postgres` / `database-design-postgresql` | **Pagila**, Chinook, Northwind, Mondial |
| `sqlite-for-beginners` / `sql-analytics-duckdb` | **Chinook**, **Northwind** (SQLite ports), Sakila-SQLite, nycflights13 (CSV→DuckDB) |

**The five "no-asterisk, ship-today" picks:** **Chinook** (MIT), **Palmer Penguins** (CC0), **Gapminder** (CC BY 4.0), **NOAA Mauna Loa CO₂** (CC0), **NIST StRD** (public domain).

---

## 14. More standalone datasets by repository (second pass — Kaggle · UCI · Hugging Face · government · data hubs)

This pass targets datasets you'd find by **browsing the big repositories directly**, rather than the library-bundled classics in §2–§11. Same bar throughout: small, evergreen, **commercial + redistribution** OK.

### 14.1 The Kaggle reality — read this before using any Kaggle dataset

A Kaggle dataset's license tag is set by **whoever uploaded it** — and they frequently had no right to set it. If the data was **scraped** (IMDb, Netflix, Spotify, sports-reference) or comes from a **restricted source** (Gallup, a trade board), a "CC0" tag is **legally meaningless** against the real rights holder. *Mitigation:* trace every Kaggle dataset to its **primary source** and confirm the license there; prefer datasets uploaded by the official **`uciml`** account or tied to a published paper with a stated license.

🔴 **Three of the most-taught Kaggle datasets are NOT safe to re-host:**

| Dataset | Why |
| --- | --- |
| **World Happiness Report** | Underlying data is the **Gallup World Poll** — "noncommercial, personal use and education only"; no third-party redistribution |
| **Avocado Prices** | **Hass Avocado Board** terms forbid reproduction/redistribution |
| **120 Years of Olympic History** | **Scraped from sports-reference.com**, whose terms preclude redistribution → the CC0 tag is invalid |

Also avoid the whole **Pokémon / Netflix / Spotify / FIFA** cluster (Nintendo / Netflix / Spotify-API / EA-Sports IP; several are also stale).

🟢 **Safe Kaggle picks (clean, traceable provenance):**

| Dataset | Rows | License (verified at source) | Tier | Course |
| --- | --- | --- | --- | --- |
| Heart Failure Clinical Records | 299 | CC BY 4.0 (UCI #519) | 🟢B | ML, stats |
| Adult / Census Income (`uciml`) | 48,842 | CC BY 4.0 (UCI #2) | 🟢B | ML (+fairness), SQL |
| Bank Marketing (`uciml`) | 45,211 | CC BY 4.0 (UCI #222) | 🟢B | ML, SQL |
| Students Performance in Exams | 1,000 | CC BY (roycekimmons.com; synthetic) | 🟡C | Pandas, stats, viz |
| Mall Customer Segmentation | 200 | CC0 (uploader; synthetic) | 🟡C | clustering, viz |
| Medical Cost / `insurance.csv` | 1,338 | public-domain claim (synthetic; weak chain) | 🟡C | regression |

*The synthetic 🟡C sets carry low real-rights-holder risk but no clean grant — fine if you accept "almost certainly synthetic," otherwise skip.*

### 14.2 UCI ML Repository — 20+ more datasets, all CC BY 4.0

UCI is uniformly **CC BY 4.0** (re-confirmed on Adult/Mushroom/Bank Marketing). A broad sweep of small, evergreen classics beyond those in §3/§6:

| Dataset | Rows × Feats | Size | Task | Course |
| --- | --- | --- | --- | --- |
| **Mushroom** | 8,124 × 22 | 365 KB | Classification (edible/poison) | ML, Pandas |
| **Bike Sharing** | 17,389 × 13 | ~1 MB | Regression + seasonality | ML, stats, time series |
| **Banknote Authentication** | 1,372 × 4 | 45 KB | Binary classification | ML, stats |
| **Glass Identification** | 214 × 9 | 12 KB | Multiclass (forensic) | ML, stats |
| **Seeds** | 210 × 7 | 9 KB | Classification / clustering | ML, stats |
| **Zoo** | 101 × 16 | 4 KB | Multiclass (boolean attrs) | ML, Pandas |
| **Wholesale Customers** | 440 × 7 | 15 KB | Clustering | clustering, Pandas |
| Car Evaluation | 1,728 × 6 | 51 KB | Ordinal classification | ML |
| Student Performance | 649 × 30 | ~40 KB | Classification / regression | ML, stats |
| Raisin | 900 × 7 | 112 KB | Binary classification | ML, stats |
| Rice (Cammeo / Osmancik) | 3,810 × 7 | 168 KB | Binary classification | ML, stats |
| Yeast | 1,484 × 8 | 93 KB | Classification | ML |
| Ionosphere | 351 × 34 | 75 KB | Binary classification | ML |
| Energy Efficiency | 768 × 8 | 74 KB | Regression | ML, stats |
| Forest Fires | 517 × 12 | 25 KB | Regression | ML, stats |
| Concrete Compressive Strength | 1,030 × 8 | 122 KB (.xls) | Regression | ML, stats |
| Bank Marketing | 45,211 × 16 | 566 KB | Classification (imbalanced) | ML, SQL |
| Default of Credit Card Clients | 30,000 × 23 | 5.3 MB | Classification | ML |
| Letter Recognition | 20,000 × 16 | 696 KB | Classification | ML |
| Optical / Pen Digits | 5,620 / 10,992 | ~0.6 / 1.6 MB | Classification | ML |
| Adult / Census Income ⚠️ | 48,842 × 14 | ~4 MB | Classification (+fairness) | ML, SQL |
| Statlog German Credit ⚠️ | 1,000 × 20 | 100 KB | Classification (+fairness) | ML |

⚠️ **Sensitive-attribute / ethics flags (pedagogical, not license):** **Adult** (race, sex) and **German Credit** ("foreign worker," sex/marital status) are useful for fairness lessons but need framing. **Online Retail I/II** (CC BY 4.0) are great e-commerce sets but **too large (22–43 MB) — sample them**. The dataset historically named **"Pima Indians Diabetes" — avoid** (collected without modern consent; the name reduces a community to a disease label); use CDC BRFSS if a diabetes set is needed.

### 14.3 Hugging Face Hub — cleanly-licensed text & tabular

The Hub is license-murky; verify each card's `license:` tag. (Round 1 already covered UCI SMS Spam / Spambase / Sentiment Sentences.)

🟢 **Safe (commercial + redistribute):**

| Dataset | Rows | License | Tier | Course |
| --- | --- | --- | --- | --- |
| `PolyAI/banking77` | 13,083 | CC BY 4.0 | 🟢B | NLP (intent classification) |
| `google-research-datasets/poem_sentiment` | 1,101 | CC BY 4.0 | 🟢B | NLP (Gutenberg-sourced) |
| `leondz/wnut_17` | 5,690 | CC BY 4.0 | 🟢B | NLP (NER / token tagging) |
| `karpathy/tiny_shakespeare` | ~40K lines | public-domain text (no tag) | 🟢A | NLP (char-level LM) |
| `CFPB/consumer-finance-complaints` | 1M+ | CC0 | 🟢A (large→sample) | Pandas / stats |
| `google/civil_comments` | 2M | CC0 | 🟢A (large→sample) | stats (toxicity regression) |

🟡 **Copyleft (CC BY-SA — keep the SA license on re-host):** `Salesforce/wikitext`, `rajpurkar/squad` & `squad_v2`, `fancyzhx/dbpedia_14`.

🔴 **AVOID (don't assume these common ones are free):** `ag_news` (non-commercial source), `stanfordnlp/imdb` / `rotten_tomatoes` / `sst2` (scraped movie reviews / IMDb-NC), `yelp_*` (Yelp agreement: NC + no redistribution), `tweet_eval` (Twitter/X terms), `conll2003` (Reuters), `financial_phrasebank` (CC BY-NC-SA), `bookcorpus` (copyright), `openwebtext` (CC0 packaging only — scraped content), `Open-Orca/OpenOrca` (OpenAI ToS on GPT outputs), `dair-ai/emotion` (research-only), `common_voice` (moved off HF + huge).

### 14.4 Government & institutional — specific datasets

Mostly US-federal **public domain** or **CC BY**. Evergreen if you snapshot a fixed window.

| Dataset | What | Size | License | Tier | Course |
| --- | --- | --- | --- | --- | --- |
| **USDA FoodData Central — SR Legacy** ⭐ | Nutrient composition of 7,793 foods | 6.7 MB zip | US-gov public domain (frozen 2018) | 🟢A | Pandas, stats, viz, SQL |
| **Natural Earth** (countries, places) ⭐ | Cartographic vector data | 2.7–4.7 MB | **Public domain** (no attribution) | 🟢A | maps / choropleths |
| **OurAirports** ⭐ | Airports table (clean OpenFlights substitute) | few MB | **CC0** | 🟢A | SQL, geo |
| **GeoNames** (cities1000/5000/15000) | Global populated-places gazetteer | few MB | CC BY 4.0 | 🟢B | geo viz, SQL joins |
| **NASA Exoplanet Archive** | ~6,300 confirmed exoplanets | <10 MB | US-gov public domain | 🟢A | sci computing, stats |
| **Penn World Table 11.0** ⭐ | Macro/productivity, 185 countries 1950–2023 | small | CC BY 4.0 | 🟢B | stats, econ, time series |
| **UK STATS19 Road Safety** | Collisions + Vehicles + Casualties (multi-table) | ~50 MB/yr (sample) | OGL v3 (commercial OK) | 🟢B | SQL joins, stats |
| FBI UCR (SRS 1960–2014) | Crime counts by state/year | small–MB | US-gov public domain | 🟢A | stats, viz |
| US BTS T-100 | Domestic air traffic by route/month | MB/yr | US-gov public domain | 🟢A | SQL, Pandas |
| USGS NWIS water quality | Measurements (pH, DO, nutrients…) | filtered MB | US-gov public domain | 🟢A | sci computing |
| Eurostat (e.g. `une_rt_a_h`) | EU unemployment 1992–2020 | <1 MB | CC BY 4.0 (**EU data only**) | 🟡C | stats, time series |

🔴 **AVOID:** **GTD (Global Terrorism Database)** — explicitly non-commercial / non-redistributable. **CDC NHANES** — files are PD but a statutory clause limits use to "statistical reporting and analysis," which conflicts with re-hosting as a course asset (confirm with NCHS first). **ICPSR** deposits — registration + no redistribution.

### 14.5 Multi-table / relational additions (for the SQL courses)

Beyond Chinook / Sakila / Northwind (§2):

🟢 **Recommended:**
- **`unitedstates/congress-legislators`** ⭐ — **CC0**, genuinely relational (legislators, terms, committees, memberships); clean and small. <https://github.com/unitedstates/congress-legislators>
- **UK STATS19** ⭐ — 3 linked tables (Collisions / Vehicles / Casualties), OGL v3, commercial OK (see §14.4).
- **DataHub.io reference tables** ⭐ — `country-codes`, `language-codes`, `continent-codes` are **PDDL (public domain)** lookup tables; `gdp` / `inflation` are CC BY 4.0 (World Bank). Ideal small dimension tables to JOIN against. <https://datahub.io/core>
- **MusicBrainz core** — **CC0** (50+ tables: artists / releases / recordings / labels…); rich but multi-GB → host a curated subset and **exclude** the CC BY-NC-SA supplementary tables (ratings, tags, edit history).

🟡 **Caution / 🔴 avoid:**

| Dataset | Issue |
| --- | --- |
| 🔴 **MovieLens** (GroupLens) | **Non-commercial** — *"may not use… for any commercial or revenue-bearing purposes"*; redistribution must carry the same restriction *(hand-verified)*. The classic recommender dataset is **out**. |
| 🔴 **IMDb non-commercial datasets** | "personal and non-commercial use"; "must not be republished… to create any kind of database" |
| 🟡 **OpenFlights** (airports/airlines/routes) | ODbL **+ a separate commercial-license ask**, and route data frozen since 2014 → use **OurAirports (CC0)** for the airports table instead |
| 🟡 **goodbooks-10k** | CC BY-SA 4.0 (copyleft) + ~230 MB |
| 🟡 **Stack Exchange dump** | CC BY-SA 4.0, but ~92 GB (use one small site), per-post attribution, and **watermarking in post-2025-06 dumps** |
| 🟡 **Open Food Facts** | ODbL / DbCL copyleft + large; not natively relational |
| ❓ **Olist Brazilian E-Commerce** | Popular 9-table e-commerce set, but its **license could not be confirmed** (possibly CC BY-NC-SA) — **verify on the Kaggle page before any use** |
| 🟢 **Lichess** | CC0, but PGN games aren't relational; the Puzzles CSV (~250 MB) is a single flat table |

### 14.6 Where to find more — repositories & discovery tools

**Research-data repositories (filter by license):**
- **Dryad** ⭐ — *every* dataset is **CC0** (it accepts nothing else); curated, paper-linked, usually small tabular. Best default for guaranteed-clean data. <https://datadryad.org>
- **Zenodo** (CERN) — CC0 default; filter the search facet to `CC0-1.0` / `CC-BY-4.0`. **Harvard Dataverse** — CC0 default (e.g., US House elections 1976–2024, CC0). **Figshare** — CC BY 4.0 default. **Mendeley Data** — mixed; filter to CC0 / CC BY. **OSF** — mixed; verify per dataset.
- 🔴 **PhysioNet** (MIMIC, etc.) — credentialed, research-only, no redistribution.

**Discovery tools:**
- **Google Dataset Search** ⭐ — has a **"Usage rights → Commercial use allowed"** filter (the most license-aware discovery tool). <https://datasetsearch.research.google.com>
- **AWS Open Data Registry** (per-dataset license field; grep the YAML in `awslabs/open-data-registry`), **Awesome Public Datasets** (GitHub link list — verify each), **Data Is Plural** (Jeremy Singer-Vine's archive of niche datasets), **DataHub.io** (clean PDDL / CC-BY cores), **Rdatasets** (3,499 CSVs — but the maintainer can't guarantee individual licenses; verify case-by-case).

---

## 15. Quick-reference — second-pass picks & expanded AVOID

🟢 **New "ship-with-attribution" picks (cleanest of the second pass):**
USDA FoodData Central (PD) · Natural Earth (PD) · OurAirports (CC0) · `unitedstates/congress-legislators` (CC0) · DataHub `country-codes`/`language-codes` (PDDL) · NASA Exoplanet Archive (PD) · GeoNames (CC BY 4.0) · Penn World Table 11.0 (CC BY 4.0) · UK STATS19 (OGL) · `PolyAI/banking77`, `poem_sentiment`, `wnut_17` (CC BY 4.0) · `tiny_shakespeare` (PD) · Heart Failure Clinical Records (CC BY 4.0) · and the UCI sweep (Mushroom, Bike Sharing, Banknote, Glass, Seeds, Zoo, Wholesale Customers…).

🔴 **Expanded AVOID (added this pass):**

| Item | Reason |
| --- | --- |
| **MovieLens** (all versions) | Non-commercial (GroupLens) |
| **World Happiness Report** | Gallup non-commercial source |
| **Avocado Prices** | Hass Avocado Board prohibits redistribution |
| **120 Years of Olympic History** | Scraped (sports-reference); CC0 tag invalid |
| **Pokémon / Netflix / Spotify / FIFA** datasets | Third-party IP (Nintendo / Netflix / Spotify / EA); often stale |
| HF `ag_news`, `imdb`, `rotten_tomatoes`, `sst2`, `yelp_*`, `tweet_eval`, `conll2003`, `financial_phrasebank`, `bookcorpus`, `openwebtext`, `OpenOrca`, `dair-ai/emotion` | Non-commercial / scraped / provider-ToS / copyright |
| **IMDb** non-commercial datasets | Non-commercial; no DB republishing |
| **GTD** (Global Terrorism Database) | Explicitly non-commercial |
| **CDC NHANES** | Statutory "statistical analysis only" restriction |
| **PhysioNet** (MIMIC, …) | Credentialed, research-only |
| **OpenFlights** (as-is) | ODbL + commercial-license ask → use OurAirports |
| **Olist** Brazilian E-Commerce | License unconfirmed — verify first |

---

## 16. Scraped / gray-area datasets — for awareness only (NOT recommended for re-hosting)

> ⚠️ **Disclaimer — read first.** Everything in this section is **legally gray** and is listed for **awareness**, not as a recommendation. These datasets were **scraped from platforms whose Terms of Service typically forbid it**, and/or they contain **third-party-copyrighted content** (and sometimes **personal data**). A **CC0 / CC BY tag added by a Kaggle or Hugging Face uploader is legally void** against the real rights holder — *you cannot license what you do not own*. None of these should be re-hosted in DataSlope's public repo without legal review; **most should not be re-hosted at all**. This is not legal advice. Where a clean substitute exists, it is in the last column — **use that instead**.

**Four things that decide the risk:**
1. **Uploader licenses are void.** A CC0/CC-BY tag only covers the uploader's *own* contribution, never the underlying scraped content. (Exceptions: data the **rights holder** uploaded themselves, e.g. Olist; or genuinely open sources like Wikipedia.)
2. **"Academic / research use" is a norm, not a license.** It offers no protection to a *commercial* platform that sells courses.
3. **ToS ≠ copyright ≠ privacy.** Recent rulings (*Meta / X Corp v. Bright Data*, 2024) limited *CFAA* liability for scraping public pages — but they **do not** touch the **copyright** in the content or **privacy law** (GDPR/CCPA) over personal data. Those are separate, live risks.
4. **Stale, too.** Most scraped sets are frozen snapshots that also fail the evergreen test.

Treat every entry below as 🔴 (or the 🔴🔴 privacy tier in §16.8).

### 16.1 Movies / TV & music

| Dataset | Scraped from | The specific issue | Cleaner alternative |
| --- | --- | --- | --- |
| IMDB 5000 / Box Office Mojo | IMDb (Amazon) | No-scraping ToS; the IMDB 5000 set was **DMCA'd off Kaggle** | IMDb's **official non-commercial TSVs** (their terms); TMDB API; Wikidata box office (CC0) |
| TMDB 5000 / The Movies Dataset | TMDB API (+ MovieLens) | API ToS bars "archived/cached datasets" & commercial use; MovieLens part is **non-commercial** | TMDB API with attribution; MovieLens direct (research only) |
| Netflix titles | Netflix (no public API) | No-scraping ToS; catalog is Netflix's DB | TMDB "watch providers" endpoint |
| Rotten Tomatoes reviews | Fandango / RT | No-scraping ToS; reviewer copyright | Cornell movie-review / SST (research); **UCI Sentiment Sentences** (CC BY) |
| Spotify audio-feature sets (114k–600k tracks) | Spotify Web API | Policy bans standalone metadata, DBs, and ML training; **the `audio-features` endpoint was deprecated Nov 2024** | **MusicBrainz** (CC0) metadata; **FMA *metadata*** (CC BY 4.0; audio is per-track); compute features with **Essentia** |
| Million Song Dataset | Echo Nest → Spotify | Inherits Spotify terms; Taste Profile subset = user data (privacy) | **FMA** dataset; MusicBrainz |
| Genius / AZLyrics lyrics | Music publishers (via Genius/AZ) | **Highest copyright certainty** — lyrics are publisher-owned; no scraper holds a license (cf. *Genius v. Google*, preempted by copyright) | None at scale; license via Musixmatch/LyricFind; for NLP use Gutenberg poetry or **OpenSubtitles** |

### 16.2 Sports

| Dataset | Scraped from | The specific issue | Cleaner alternative |
| --- | --- | --- | --- |
| sports-reference family (NBA/NFL/MLB/NHL) | sports-reference.com (paid 3rd-party data) | Explicit "no scraping / no competing database"; rate-limited & IP-blocked | **Retrosheet** (commercial use OK + attribution ✓), **Lahman** (CC BY-SA) for baseball; **nflverse**, **StatsBomb Open Data**, `nba_api` |
| 120 Years of Olympic History | sports-reference (now Olympedia) | Scraped → CC0 tag invalid; IOC marks | **Olympedia** (check terms); IOC Olympic Data Feed |
| FIFA / EA FC players (SoFIFA) | EA Sports IP via SoFIFA | EA owns the in-game ratings; player attributes are group-licensed | **StatsBomb Open Data**; real match stats from openly-licensed providers |

### 16.3 Product reviews & e-commerce

| Dataset | Scraped from | The specific issue | Cleaner alternative |
| --- | --- | --- | --- |
| Amazon reviews (SNAP / McAuley / Amazon Reviews 2023) | Amazon | No-scraping ToS; no license; review pages behind login since Nov 2024 | **UCI Sentiment Sentences** (CC BY); MovieLens (research) |
| Yelp Open Dataset | Yelp (self-distributed) | **Explicitly non-commercial + no redistribution** (each user must accept Yelp's agreement) | Yelp Fusion API; UCI Sentiment Sentences |
| TripAdvisor (scraped) | TripAdvisor | No-scraping ToS; reviewer PII | None equivalent |
| Google Play / Apple App Store apps | Google / Apple | No-scraping ToS; developer copyrights | Official developer APIs |
| Olist Brazilian E-Commerce | **Olist (self-published)** | ✅ valid license — but **CC BY-NC-SA** (NC blocks commercial use) | This *is* the clean option; honor NC-SA, so still not for commercial re-host |

### 16.4 Social media

| Dataset | Scraped from | The specific issue | Cleaner alternative |
| --- | --- | --- | --- |
| Sentiment140, Twitter US Airline Sentiment | Twitter / X | Redistributing full tweet **text** violates X's ID-only policy; CC tag covers only the *annotations*; usernames = PII | **UCI SMS Spam** / Sentiment Sentences; **SST-2** (research) |
| Reddit / Pushshift | Reddit | Reddit **sanctioned Pushshift** (2023); bulk redistribution barred; posts contain PII | Reddit Academic API; ConvoKit (same upstream caveat) |

### 16.5 News

| Dataset | Scraped from | The specific issue | Cleaner alternative |
| --- | --- | --- | --- |
| News Category (HuffPost), All the News, A Million News Headlines (ABC) | News publishers | **A CC license on the *paper* ≠ a license on the headline/article text**; publisher copyright (full-article sets like *All the News* are the riskiest) | **GDELT** (open); Reuters / RCV1 (research license); **20 Newsgroups** (public-domain Usenet) |
| AG News | 2,000+ outlets via an academic engine | Source terms are **non-commercial**; HF license listed "unknown" | 20 Newsgroups; GDELT |

### 16.6 Web-scale text corpora (LLM pretraining)

> These power most "train an LLM" lessons but are the **highest commercial-risk** text data.

| Dataset | Scraped from | The specific issue | Cleaner alternative |
| --- | --- | --- | --- |
| Common Crawl | The open web | ToU **shifts AI-use indemnity onto you**; ~45% of derived C4 is ToS-restricted; copyrighted content; active publisher lawsuits | **Common Corpus** (2025), **Wikipedia**, **Gutenberg** |
| C4 | Common Crawl (2019) | ODC-BY covers Google's *curation*, not the underlying content | FineWeb (same base caveat); Common Corpus |
| OpenWebText | Reddit-linked web pages | CC0 covers *packaging only*; card states "we don't own the text" | Common Corpus; Gutenberg; Wikipedia |
| BookCorpus | Smashwords | **Documented copyright violations** — includes paid and "do not redistribute" books | **Project Gutenberg**, **Standard Ebooks** (public domain) |
| The Pile (**Books3**) | Bibliotik (pirate library) | **Books3 = pirated books**; active lawsuits + DMCA takedown | **Common Pile v0.1**, **Dolma** (clean rebuilds) |

### 16.7 Other commonly-scraped

| Dataset | Scraped from | The specific issue | Cleaner alternative |
| --- | --- | --- | --- |
| Goodreads books / reviews | Goodreads (Amazon) | No-scraping ToS; public API shut down 2022 | **Open Library** (CC0); Book-Crossing (research) |
| Zillow listings | Zillow | No-scraping ToS; cease-&-desist history; MLS rights; Zestimate IP | **Redfin Data Center** (free housing CSVs — confirm terms); **HUD** / **Census ACS** (public domain); **Ames Housing** (§3) |

### 16.8 🔴🔴 Privacy / PII tier — avoid entirely (GDPR/CCPA territory, not just licensing)

When a scraped set contains **identifiable people** — names, profiles, faces, health — the risk jumps from a licensing gamble to **privacy-law liability** (GDPR fines up to 4% of global revenue; CCPA; BIPA). Do **not** use these in any course, commercial or not.

- **MS-Celeb-1M** — 10M scraped faces of ~100k people; **withdrawn by Microsoft (2019)**; biometric special-category data.
- **Labeled Faces in the Wild (LFW)** — scraped *named* faces; fine to *discuss* as a historical benchmark, not to *use* the images.
- **Scraped LinkedIn / Indeed *profiles*** — names, employers, work history = PII; *hiQ v. LinkedIn* ended in a **judgment against the scraper**. → For jobs/skills use **O*NET** / **BLS OES** (public domain) or **ESCO** (CC BY); for salaries use the **Stack Overflow Developer Survey** (ODbL).
- **Health/location-linked posts** (mental-health subreddits, fitness exports) — GDPR Article 9 special-category data.

### 16.9 ✅ Not gray-area — use these freely instead

The obvious "big web" sources are **openly licensed**, not illegally scraped:

- **Wikipedia / Wikimedia dumps** — CC BY-SA (bulk download is the *intended* access); **Wikidata** — CC0.
- **Project Gutenberg / Standard Ebooks** — public domain (strip the PG header).
- **GDELT** (global news events) — open · **O*NET / BLS / US Census** — US-gov public domain · **Stack Overflow Developer Survey** — ODbL · **Redfin Data Center** — free housing CSVs.

### Clean-substitute cheat sheet

| If you reached for (scraped)… | Use instead |
| --- | --- |
| Movie metadata / recommender | TMDB API (attrib) · MovieLens (research) |
| Movie-review sentiment | UCI Sentiment Sentences (CC BY) · Cornell/SST (research) |
| Music metadata / features | MusicBrainz (CC0) · FMA metadata (CC BY 4.0) · Essentia |
| Baseball / sports stats | **Retrosheet** (commercial OK) · Lahman (CC BY-SA) · StatsBomb · nflverse |
| Product-review NLP | UCI Sentiment Sentences (CC BY) |
| Tweets / social sentiment | UCI SMS Spam · SST-2 (research) |
| News classification | GDELT (open) · 20 Newsgroups (public domain) |
| LLM text corpus | Common Corpus / Common Pile (clean) · Wikipedia · Gutenberg |
| Books (full text) | Project Gutenberg · Standard Ebooks · Open Library (CC0) |
| Housing prices | Redfin Data Center · Census ACS / HUD (PD) · Ames Housing (§3) |
| Jobs / salaries | O*NET · BLS OES (PD) · ESCO (CC BY) · SO Developer Survey (ODbL) |

---

## 17. Sources (primary, hand-verified in **bold**)

**SQL / multi-table**
- **Chinook — MIT:** <https://github.com/lerocha/chinook-database/blob/master/LICENSE.md>
- **Sakila — New BSD (schema+data):** <https://dev.mysql.com/doc/sakila/en/sakila-license.html>
- **Northwind (jpwhite3) — MIT, ships SQLite `.db`:** <https://github.com/jpwhite3/northwind-SQLite3>
- Pagila — PostgreSQL License: <https://github.com/devrimgunduz/pagila> · Microsoft samples (MIT): <https://github.com/microsoft/sql-server-samples> · Mondial (CC BY 3.0): <https://github.com/ullenboom/mondial-database> · MySQL `world` (no open license): <https://dev.mysql.com/doc/world-setup/en/world-setup-preface.html>

**Tabular / ML / stats**
- **UCI = CC BY 4.0 (verified on Iris):** <https://archive.ics.uci.edu/dataset/53/iris> · Wine <https://archive.ics.uci.edu/dataset/109/wine> · Wine Quality <https://archive.ics.uci.edu/dataset/186/wine+quality> · Auto MPG <https://archive.ics.uci.edu/dataset/9/auto+mpg> · Abalone <https://archive.ics.uci.edu/dataset/1/abalone> · Breast Cancer <https://archive.ics.uci.edu/dataset/17/breast+cancer+wisconsin+diagnostic> · Heart Disease <https://archive.ics.uci.edu/dataset/45/heart+disease> · Spambase <https://archive.ics.uci.edu/dataset/94/spambase> · SMS Spam <https://archive.ics.uci.edu/dataset/228/sms+spam+collection>
- **Palmer Penguins — CC0:** <https://allisonhorst.github.io/palmerpenguins/>
- **Diamonds — CC BY 4.0 (Zenodo):** <https://zenodo.org/records/3522106>
- Datasaurus — MIT: <https://github.com/jumpingrivers/datasauRus/blob/master/LICENSE.md> · Gapminder — CC BY 4.0: <https://www.gapminder.org/free-material/> · nycflights13 — CC0: <https://cran.r-project.org/web/packages/nycflights13/index.html> · California Housing: <https://scikit-learn.org/stable/modules/generated/sklearn.datasets.fetch_california_housing.html> · Ames Housing: <https://jse.amstat.org/v19n3/decock/DataDocumentation.txt> · Boston Housing removal: <https://fairlearn.org/main/user_guide/datasets/boston_housing_data.html>

**Viz-library bundled data**
- **seaborn-data — no license:** <https://github.com/mwaskom/seaborn-data> · vega-datasets (per-file): <https://github.com/vega/vega-datasets/blob/main/datapackage.md> · plotly/datasets (MIT): <https://github.com/plotly/datasets/blob/master/LICENSE> · ggplot2 (MIT): <https://ggplot2.tidyverse.org/LICENSE-text.html> · FRED terms: <https://fred.stlouisfed.org/docs/api/terms_of_use.html> · EPA license: <https://edg.epa.gov/epa_data_license.html>

**Scientific computing / time series**
- **SILSO sunspots — CC BY-NC (AVOID):** <https://www.sidc.be/SILSO/datafiles>
- NOAA Mauna Loa CO₂ — CC0: <https://gml.noaa.gov/data/dataset.php?item=mlo-co2-observatory-monthly> · Scripps CO₂ — CC BY 4.0: <https://keelingcurve.ucsd.edu/permissions-and-data-sources/> · USGS licensing — CC0/PD: <https://www.usgs.gov/data-management/data-licensing> · NOAA GHCN — CC0: <https://registry.opendata.aws/noaa-ghcn/> · NIST StRD: <https://www.itl.nist.gov/div898/strd/> · NIST licensing: <https://www.nist.gov/open/license> · statsmodels datasets: <https://github.com/statsmodels/statsmodels/tree/main/statsmodels/datasets> · HYG (CC BY-SA): <https://github.com/astronexus/HYG-Database/blob/main/LICENSE>

**NLP / portals**
- Project Gutenberg license: <https://www.gutenberg.org/policy/license.html> · NLTK dataset licenses: <https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/DATASET-LICENSES.md> · IMDb non-commercial: <https://developer.imdb.com/non-commercial-datasets/> · **FiveThirtyEight — CC BY 4.0 / MIT:** <https://github.com/fivethirtyeight/data/blob/master/README.md> · Our World in Data: <https://ourworldindata.org/faqs> · World Bank ToU: <https://data.worldbank.org/summary-terms-of-use> · SSA Baby Names (CC0): <https://catalog.data.gov/dataset/baby-names-from-social-security-card-applications-national-data> · TidyTuesday: <https://github.com/rfordatascience/tidytuesday>

**Second pass — Kaggle / UCI / Hugging Face / government / data hubs**
- **MovieLens — non-commercial (GroupLens):** <https://files.grouplens.org/datasets/movielens/ml-latest-small-README.html>
- **`PolyAI/banking77` — CC BY 4.0:** <https://huggingface.co/datasets/PolyAI/banking77> · `poem_sentiment` <https://huggingface.co/datasets/google-research-datasets/poem_sentiment> · `wnut_17` <https://huggingface.co/datasets/leondz/wnut_17> · `squad` (CC BY-SA) <https://huggingface.co/datasets/rajpurkar/squad>
- **Natural Earth — public domain:** <https://www.naturalearthdata.com/about/terms-of-use/> · GeoNames (CC BY 4.0): <https://www.geonames.org/export/> · OurAirports (CC0): <https://ourairports.com/data/>
- USDA FoodData Central: <https://fdc.nal.usda.gov/download-datasets/> · NASA Exoplanet Archive: <https://exoplanetarchive.ipac.caltech.edu/> · Penn World Table (CC BY 4.0): <https://www.rug.nl/ggdc/productivity/pwt/> · UK STATS19 / OGL v3: <https://www.gov.uk/government/statistical-data-sets/road-safety-open-data>
- UCI examples: Heart Failure <https://archive.ics.uci.edu/dataset/519/heart+failure+clinical+records> · Mushroom <https://archive.ics.uci.edu/dataset/73/mushroom> · Bike Sharing <https://archive.ics.uci.edu/dataset/275/bike+sharing+dataset>
- Multi-table / hubs: US Congress legislators (CC0): <https://github.com/unitedstates/congress-legislators> · DataHub core (PDDL / CC BY): <https://datahub.io/core> · MusicBrainz data license: <https://musicbrainz.org/doc/About/Data_License>
- Kaggle "avoid" provenance: Gallup terms <https://news.gallup.com/poll/105949/world-poll-terms-use.aspx> · Hass Avocado Board <https://hassavocadoboard.com/terms-of-use/> · Sports-Reference data use <https://www.sports-reference.com/data_use.html> · GTD non-commercial <https://www.start.umd.edu/gtd-terms>
- Discovery / repositories: Dryad (all CC0): <https://datadryad.org> · Google Dataset Search: <https://datasetsearch.research.google.com> · Data Is Plural: <https://www.data-is-plural.com>

**Third pass — scraped / gray-area datasets (§16) & their clean substitutes**
- **Retrosheet — commercial use OK with attribution:** <https://www.retrosheet.org/notice.txt>
- **FMA — code MIT / metadata CC BY 4.0 / audio per-track:** <https://github.com/mdeff/fma>
- Spotify Developer Policy: <https://developer.spotify.com/policy> · `audio-features` deprecation (Nov 2024): <https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api>
- IMDb Conditions of Use (no scraping): <https://www.imdb.com/conditions> · Sports-Reference data use: <https://www.sports-reference.com/data_use.html>
- Yelp dataset terms: <https://www.yelp.com/dataset> · Common Crawl ToU: <https://commoncrawl.org/terms-of-use> · BookCorpus datasheet (Bandy & Vincent): <https://arxiv.org/abs/2105.05241>
- Wikimedia dumps (CC BY-SA / Wikidata CC0): <https://dumps.wikimedia.org/legal.html> · Goodreads ToS: <https://www.goodreads.com/about/terms> · Zillow ToU: <https://www.zillow.com/z/corp/terms/>
- Clean substitutes: Redfin Data Center <https://www.redfin.com/news/data-center/> · Stack Overflow Developer Survey (ODbL) <https://survey.stackoverflow.co/> · O*NET (public domain) <https://www.onetcenter.org/license_db.html> · GDELT <https://www.gdeltproject.org/> · Common Pile / Common Corpus, Standard Ebooks <https://standardebooks.org/>
- Privacy tier: MS-Celeb-1M withdrawal (NYT/FT reporting) · *hiQ Labs v. LinkedIn* settlement (2022) · *Meta / X Corp v. Bright Data* (2024, CFAA ≠ copyright)

---

*Prepared for the DataSlope team. Before re-hosting any 🟡 item, isolate ShareAlike sets in their own licensed subfolder, down-sample oversized files, and keep an `ATTRIBUTION.md` for every CC BY / MIT / BSD dataset.*
