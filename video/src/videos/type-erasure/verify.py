"""Compile and run every example the video shows, with the real tools.

    python3 src/videos/type-erasure/verify.py [build-dir]

Writes each example to `build-dir` (a fresh temp dir by default), compiles it
with the repo's own TypeScript (node_modules/.bin/tsc at the repo root) and
runs what tsc emitted with node. Everything the video prints on screen, the
listings, the emitted JavaScript, tsc's error messages and node's output and
stack trace, is read from compiled.json, which this script writes next to
itself. Nothing on screen is typed in by hand.

Each source is written with its type syntax marked «like this». The marks are
stripped before the file is written, so tsc compiles the plain source; the
video uses them to strike out what the compiler erases, and the check at the
bottom proves the marks are right: deleting the marked text from the source
leaves exactly the JavaScript tsc emitted, up to whitespace.
"""

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
TSC = REPO / "node_modules" / ".bin" / "tsc"
LIB_ES5 = REPO / "node_modules" / "typescript" / "lib" / "lib.es5.d.ts"
LIB_DOM = REPO / "node_modules" / "typescript" / "lib" / "lib.dom.d.ts"

# The flag the video's command line shows. Without it tsc 5.9 targets ES5 and
# rewrites `const` as `var`, which is down-levelling, not erasure.
TARGET = ["--target", "es2022"]

MARKED = {
    # Fig. 1: the same file before and after tsc.
    "user": [
        "«interface User { id: number; name: string }»",
        "",
        "function first«<T>»(items«: T[]»)«: T» {",
        "  return items[0];",
        "}",
        "",
        'const users«: User[]» = [{ id: 7, name: "ada" }];',
        "const user«: User» = first(users);",
        "console.log(user.name.toUpperCase());",
    ],
    # Fig. 2: instanceof against an interface. tsc reports the error and
    # still writes check.js, so the call at the bottom runs it.
    "check": [
        "interface User { id: number; name: string }",
        "",
        "function isUser(x: unknown) {",
        "  return x instanceof User;",
        "}",
        "",
        "isUser({});",
    ],
    # Fig. 3: a type on parsed data is only a claim.
    "crash": [
        "interface User { id: number; name: string }",
        "",
        "const text = '{\"id\": 7, \"name\": null}';",
        "const user: User = JSON.parse(text);",
        "console.log(user.name.toUpperCase());",
    ],
    # Fig. 4: parse into unknown, then check at runtime.
    "guard": [
        "interface User { id: number; name: string }",
        "",
        "function isUser(x: unknown): x is User {",
        '  return typeof x === "object" && x !== null',
        '    && "id" in x && typeof x.id === "number"',
        '    && "name" in x && typeof x.name === "string";',
        "}",
        "",
        "const text = '{\"id\": 7, \"name\": null}';",
        "const data: unknown = JSON.parse(text);",
        "if (isUser(data)) {",
        "  console.log(data.name.toUpperCase());",
        "} else {",
        '  console.log("Not a user:", text);',
        "}",
    ],
    # Fig. 4's note: the same value used before any check.
    "unguarded": [
        "interface User { id: number; name: string }",
        "",
        "const text = '{\"id\": 7, \"name\": null}';",
        "const data: unknown = JSON.parse(text);",
        "console.log(data.name.toUpperCase());",
    ],
}

MARK = re.compile(r"«([^»]*)»")


def run(cmd, cwd):
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    return p.returncode, p.stdout, p.stderr


def squash(s):
    return re.sub(r"\s+", "", s)


def main():
    build = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(tempfile.mkdtemp(prefix="type-erasure-"))
    build.mkdir(parents=True, exist_ok=True)
    out = {
        "tsc": run([str(TSC), "--version"], build)[1].strip(),
        "node": run(["node", "--version"], build)[1].strip(),
        "target": TARGET[1],
        "jsonParse": next(l.strip() for l in LIB_ES5.read_text().splitlines() if "parse(text: string" in l),
        "responseJson": next(l.strip() for l in LIB_DOM.read_text().splitlines() if "json(): Promise" in l),
        "files": {},
    }
    for name, marked in MARKED.items():
        source = "\n".join(MARK.sub(r"\1", l) for l in marked) + "\n"
        ts = build / f"{name}.ts"
        js = build / f"{name}.js"
        js.unlink(missing_ok=True)
        ts.write_text(source)
        tsc_exit, tsc_out, tsc_err = run([str(TSC), *TARGET, ts.name], build)
        emitted = js.read_text() if js.exists() else None
        node = run(["node", js.name], build) if emitted is not None else (None, "", "")
        out["files"][name] = {
            "marked": marked,
            "source": source,
            "tscExit": tsc_exit,
            "tscOut": tsc_out + tsc_err,
            "emitted": emitted,
            "nodeExit": node[0],
            "nodeOut": node[1],
            "nodeErr": node[2].replace(str(build) + "/", ""),
        }

    # The marks are exactly what tsc erased.
    user = out["files"]["user"]
    erased = "\n".join(MARK.sub("", l) for l in user["marked"])
    assert squash(erased) == squash(user["emitted"]), (erased, user["emitted"])

    (HERE / "compiled.json").write_text(json.dumps(out, indent=2) + "\n")
    for name, f in out["files"].items():
        print(f"== {name}.ts: tsc exit {f['tscExit']}, node exit {f['nodeExit']}")
        if f["tscOut"]:
            print(f["tscOut"].rstrip())
        print(f"-- {name}.js\n{f['emitted']}-- node stdout\n{f['nodeOut']}-- node stderr\n{f['nodeErr']}")
    print(out["tsc"], out["node"])
    print(out["jsonParse"])
    print(out["responseJson"])


if __name__ == "__main__":
    main()
