"""Compile and run Equality.java, and write what it printed to measurements.json.

Every listing, output and range in the video comes from here:

  - the listing lines between each "figN:begin" / "figN:end" marker, exactly
    as they are in the source that ran;
  - what each listing printed, line by line;
  - the comparisons Fig. 2 annotates (a == c and so on);
  - the range of ints for which two autoboxings give one object, scanned
    from -100,000 to 100,000 with the default settings and again with
    -XX:AutoBoxCacheMax=1000, which moves only the upper end;
  - the javap disassembly of fig3, to show autoboxing is a call to
    Integer.valueOf.

Run from anywhere:  python3 src/videos/java-equality/measure.py [build dir]
"""

import json
import pathlib
import re
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
SOURCE = HERE / "Equality.java"
BUILD = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(tempfile.mkdtemp())
BUILD.mkdir(parents=True, exist_ok=True)


def run(*cmd: str) -> str:
    return subprocess.run(cmd, check=True, capture_output=True, text=True).stdout


def listing(name: str) -> list[str]:
    text = SOURCE.read_text()
    body = re.search(rf"// {name}:begin\n(.*?)\n\s*// {name}:end", text, re.S)
    assert body, name
    lines = body.group(1).split("\n")
    indent = min(len(l) - len(l.lstrip()) for l in lines if l.strip())
    return [l[indent:] for l in lines]


def sections(out: str) -> dict[str, list[str]]:
    result: dict[str, list[str]] = {}
    current = None
    for line in out.splitlines():
        if line.startswith("#") and "\t" not in line:
            current = line[1:]
            result[current] = []
        elif line.startswith("#"):
            key, value = line[1:].split("\t", 1)
            result[key] = [value]
        else:
            assert current, line
            result[current].append(line)
    return result


def pairs(lines: list[str]) -> list[dict]:
    out = []
    for line in lines:
        expr, value = line.split("\t")
        out.append({"expr": expr, "value": value})
    return out


def as_bool(v: str) -> bool:
    assert v in ("true", "false"), v
    return v == "true"


run("javac", "-d", str(BUILD), str(SOURCE))
default = sections(run("java", "-cp", str(BUILD), "Equality"))
raised = sections(run("java", "-XX:AutoBoxCacheMax=1000", "-cp", str(BUILD), "Equality"))

cache = {k: int(v) for k, v in (l.split("\t") for l in default["cache"])}
cache_raised = {k: int(v) for k, v in (l.split("\t") for l in raised["cache"])}

# Autoboxing compiles to Integer.valueOf: count the calls in fig3.
javap = run("javap", "-c", "-cp", str(BUILD), "Equality")
fig3_code = re.search(r"static void fig3\(\);\n(.*?)\n\n", javap, re.S).group(1)
value_of_calls = len(re.findall(r"java/lang/Integer\.valueOf:\(I\)Ljava/lang/Integer;", fig3_code))

measurements = {
    "meta": {
        "javaVersion": default["version"][0],
        "vm": default["vm"][0],
        "javapFig3ValueOfCalls": value_of_calls,
    },
    "fig1": {"lines": listing("fig1"), "printed": [as_bool(v) for v in default["fig1"]]},
    "fig2": {
        "lines": listing("fig2"),
        "compare": [{"expr": p["expr"], "value": as_bool(p["value"])} for p in pairs(default["fig2"])],
    },
    "fig3": {
        "lines": listing("fig3"),
        "printed": [as_bool(v) for v in default["fig3"]],
        "printedWithCacheMax1000": [as_bool(v) for v in raised["fig3"]],
    },
    "cache": {"low": cache["lo"], "high": cache["hi"], "shared": cache["shared"]},
    "cacheWithCacheMax1000": {"low": cache_raised["lo"], "high": cache_raised["hi"]},
    "pool": {p["expr"]: as_bool(p["value"]) for p in pairs(default["pool"])},
}

(HERE / "measurements.json").write_text(json.dumps(measurements, indent=2) + "\n")
print(json.dumps(measurements, indent=2))
