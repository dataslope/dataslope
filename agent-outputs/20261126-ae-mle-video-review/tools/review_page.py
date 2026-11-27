"""The owner-facing page for this review: every before/after comparison, by video.

    python3 -I review_page.py <compare-dir> <gallery-img-dir> <out-dir>

Reads each video's compare.json (the comparisons), its review report in the
review folder (finding counts), the before and after beats.json (lengths),
and the per-video notes below (re-voiced characters, the headline fix), and
writes <out>/index.html plus <out>/img/ (the JPEGs gallery.py made).
"""
import json
import os
import re
import shutil
import sys

src, imgs, out = sys.argv[1:4]
HERE = os.path.dirname(os.path.abspath(__file__))
REVIEW = os.path.dirname(HERE)
S = "/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad"

# Re-voiced characters (from each fixer's report) and the change worth reading first.
NOTES = {
    "MachineLearningEngineer-0-Interview": (238, "“When not to use an LLM” now says why it is asked and when a smaller model or a rule wins."),
    "MachineLearningEngineer-1-Generalization": (73, "The confusion matrix’s column headers sat half a column off; class weights now state their precision cost."),
    "MachineLearningEngineer-2-Models": (81, "The learning-rate range test is read where the loss still falls steeply, not at its minimum."),
    "MachineLearningEngineer-3-Coding": (82, "A false “0 / 0 = 0” shown in green is gone; “thirty times slower” now matches the ×38 bar."),
    "MachineLearningEngineer-4-Statistics": (174, "The video no longer reads p = 0.62 as “nothing there”, the misreading it warns against later."),
    "MachineLearningEngineer-5-DeepLearning": (120, "The max-pooling grid kept the largest magnitude, so four cells were wrong; gradient checkpointing added."),
    "MachineLearningEngineer-6-NlpAndLlms": (355, "Attention’s cost is drawn over the whole context, where it really is quadratic; heads are no longer slices."),
    "MachineLearningEngineer-7-SystemDesign": (0, "A new all-null column now fails the schema check; the autoscaling spike waits in the queue it names."),
    "MachineLearningEngineer-8-Mlops": (0, "“No user exposed” no longer sits beside the canary; concept drift draws the model’s stale boundary."),
    "MachineLearningEngineer-9-ServingLlms": (106, "Speculative decoding’s verify step is explained; why 500 GB holds 186 requests, not 200."),
    "MachineLearningEngineer-10-LlmEvals": (313, "An online loss blames the eval set only if the guardrails held; a judge’s calibration bar."),
    "AnalyticsEngineer-0-Interview": (0, "Four small wording and layout fixes; every earlier fix holds."),
    "AnalyticsEngineer-1-FactsAndGrain": (0, "Two correct sums are no longer struck through; an unread note holds long enough to read."),
    "AnalyticsEngineer-2-ChangingDimensions": (0, "Question 5’s load joined a Type 2 dimension on the ID alone, the trap question 2 names."),
    "AnalyticsEngineer-3-Dbt": (141, "An unpinned ref follows latest_version, so adding v2 moves every consumer that did not pin."),
    "AnalyticsEngineer-4-Incremental": (105, "on_schema_change can add a column but leaves it empty in rows already loaded."),
    "AnalyticsEngineer-5-AdvancedSql": (0, "The “not allowed in WHERE” error now holds, on one line."),
    "AnalyticsEngineer-6-Warehousing": (102, "A warehouse’s size sets its rate: bigger costs no more only if it finishes twice as fast."),
    "AnalyticsEngineer-7-Testing": (0, "The severity dial names warn_if and error_if at the severity that uses both."),
    "AnalyticsEngineer-8-Metrics": (173, "Month-to-date is a window from the 1st, not a trailing one; the COALESCE behind 0.00 is named."),
    "AnalyticsEngineer-9-AiSemanticLayer": (0, "“Last week” is a filter; the time grain is “week”."),
}
NAMES = {}
for vid in NOTES:
    m = re.match(r"(MachineLearningEngineer|AnalyticsEngineer)-(\d+)-(.+)", vid)
    NAMES[vid] = (m.group(1), int(m.group(2)))


def findings(vid):
    c = {"P1": 0, "P2": 0, "P3": 0}
    for m in re.finditer(r"^###\s+\d+\.\s*\[(P[123])\]", open(os.path.join(REVIEW, f"{vid}.md")).read(), re.M):
        c[m.group(1)] += 1
    return c


def dur(root, vid):
    return json.load(open(os.path.join(root, vid, "beats.json")))["duration"]


# Each video's title, as its series opener shows it (video/src/series.ts).
SERIES_TS = open(os.path.join(REVIEW, "..", "..", "video", "src", "series.ts")).read()
TITLES = {v: t for t, v in re.findall(r'title: "([^"]+)", videos: \["([A-Za-z0-9-]+)"', SERIES_TS)}
order = re.findall(r'\["([A-Za-z0-9-]+)", "([a-z0-9-]+)", "[A-Za-z]+"\]', open(os.path.join(HERE, "videos.mjs")).read())
os.makedirs(os.path.join(out, "i"), exist_ok=True)
videos = []
for vid, folder in order:
    spec = json.load(open(os.path.join(src, vid, "compare.json")))
    head = open(os.path.join(REVIEW, f"{vid}.md")).readline().strip("# \n")
    items = []
    for k, item in enumerate(spec["items"]):
        n = int(item.get("n", k + 1))
        slug = re.sub(r"[^a-z0-9]+", "-", item.get("title", "item").lower()).strip("-")[:48]
        jpg = f"{vid}-{n:02d}-{slug}.jpg"
        if not os.path.exists(os.path.join(imgs, jpg)):
            print("missing", jpg, file=sys.stderr)
            continue
        short = f"i/{'mle' if vid.startswith('Machine') else 'ae'}-{vid.split('-')[1]}-{len(items) + 1:02d}.jpg"
        shutil.copyfile(os.path.join(imgs, jpg), os.path.join(out, short))
        items.append({"n": n, "sev": item.get("severity", ""), "title": item.get("title", ""), "img": short})
    series, part = NAMES[vid]
    chars, headline = NOTES[vid]
    videos.append({
        "id": vid, "anchor": ("mle-" if series.startswith("Machine") else "ae-") + str(part),
        "series": "mle" if series.startswith("Machine") else "ae", "part": part,
        "name": TITLES[vid],
        "findings": findings(vid), "before": round(dur(f"{S}/review/frames", vid), 1),
        "after": round(dur(f"{S}/final/frames", vid), 1), "chars": chars, "headline": headline, "items": items,
    })

total_chars = sum(len(b["text"]) for v in videos for b in json.load(open(f"{S}/final/frames/{v['id']}/beats.json"))["beats"])
data = json.dumps(videos, ensure_ascii=False).replace("</", "<\\/")
tpl = open(os.path.join(HERE, "review_page.html")).read()
open(os.path.join(out, "index.html"), "w").write(tpl.replace("/*DATA*/[]", data).replace("/*CHARS*/0", str(total_chars)))
print(sum(len(v["items"]) for v in videos), "comparisons,", len(videos), "videos ->", os.path.join(out, "index.html"))
