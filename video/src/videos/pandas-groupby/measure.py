"""Every table and number in the pandas groupby video, computed by pandas.

The data is the lesson's own frame, from
content/courses/data-analysis-python-pandas/groupby-operations.mdx ("The basic
shape"): seven employees, a department and a salary each.

Run from video/:

    python3 src/videos/pandas-groupby/measure.py

It prints what pandas prints, checks the claims the narration makes, and
writes measurements.json beside itself, which data.ts imports as it is.
"""

import json
from pathlib import Path

import pandas as pd

df = pd.DataFrame(
    {
        "dept": ["Eng", "Sales", "Eng", "Ops", "Eng", "Sales", "Ops"],
        "salary": [120, 95, 140, 80, 128, 110, 92],
    }
)

grouped = df.groupby("dept")["salary"]

# 1. Split: one piece per key, in the order groupby sorts its keys.
pieces = {key: piece for key, piece in grouped}

# 2 and 3. Apply sum to each piece, combine the answers: one row per group.
agg = grouped.agg("sum")

# The same sum, handed back to every original row.
transform = grouped.transform("sum")
share = df["salary"] / transform

print(f"pandas {pd.__version__}\n")
print("df\n", df, "\n", sep="")
for key, piece in pieces.items():
    print(f"piece {key!r}: index {list(piece.index)}, salaries {list(piece)}")
print("\nagg('sum')\n", agg, "\n", sep="")
print("transform('sum')\n", transform, "\n", sep="")
print("salary / transform('sum')\n", share.round(3), "\n", sep="")

# The claims the narration makes, checked here rather than by eye.
assert len(df) == 7
assert list(pieces) == ["Eng", "Ops", "Sales"]
assert [len(p) for p in pieces.values()] == [3, 2, 2]
assert len(agg) == 3 and list(agg.index) == ["Eng", "Ops", "Sales"]
assert agg["Eng"] == 388
assert len(transform) == len(df) and transform.index.equals(df.index)
for i, row in df.iterrows():
    assert transform[i] == agg[row["dept"]]
# Each group's shares add up to one.
assert (share.groupby(df["dept"]).sum().round(12) == 1).all()

out = {
    "meta": {
        "pandas": pd.__version__,
        "source": "content/courses/data-analysis-python-pandas/groupby-operations.mdx",
    },
    "rows": [
        {"index": int(i), "dept": r["dept"], "salary": int(r["salary"])}
        for i, r in df.iterrows()
    ],
    "pieces": [
        {"dept": key, "index": [int(i) for i in piece.index], "salary": [int(v) for v in piece]}
        for key, piece in pieces.items()
    ],
    "agg": [{"dept": key, "salary": int(v)} for key, v in agg.items()],
    "transform": [{"index": int(i), "salary": int(v)} for i, v in transform.items()],
    "share": [{"index": int(i), "share": float(v)} for i, v in share.items()],
}
path = Path(__file__).with_name("measurements.json")
path.write_text(json.dumps(out, indent=2) + "\n")
print(f"wrote {path.name}")
