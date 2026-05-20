# Multi-File Support for C and C++ Playgrounds

**Date:** 2026-05-20  
**Status:** ✅ Implemented and verified (build passes)

---

## Summary

Implemented multi-file compilation support for the C and C++ browser-based playgrounds. Users can now create multi-file projects (e.g., `main.c`, `dog.c`, `dog.h`) and the playground will correctly compile all source files together, resolving `#include "..."` directives for user-defined headers.

---

## Problem

### Issue 1: C multi-file execution
When a C workspace contained multiple files (`main.c`, `dog.c`, `dog.h`), running `main.c` produced:
```
main.c:1:10: fatal error: 'dog.h' file not found
    1 | #include "dog.h"
      |          ^~~~~~~
1 error generated.
```

### Issue 2: C++ multi-file execution
Same issue for C++ workspaces (`main.cpp`, `dog.cpp`, `dog.h`):
```
main.cpp:1:10: fatal error: 'dog.h' file not found
    1 | #include "dog.h"
      |          ^~~~~~~
1 error generated.
```

**Root cause:** The `CWorkerRuntime` and `CppWorkerRuntime` classes did not implement `prepareFileSystem`, so workspace files other than the active editor tab were never passed to the browsercc compiler. The compiler only saw the entry point file's source code and had no access to any other files.

---

## Changes Made

### 1. `app/_components/runtime/browsercc-worker.ts`

- Updated the `InMessage` type for the `run` message to include an optional `files?: Array<[string, string]>` field — an array of `[path, content]` pairs for all non-entry-point workspace files.
- Updated `runCode()` signature to accept the `files` array.
- Updated compilation logic in `runCode()`:
  - All files in `files` are added to `extraFiles` so the compiler VFS contains them (enabling `#include "dog.h"` resolution).
  - Additional C source files (`.c`) or C++ source files (`.cpp`, `.cc`, `.cxx`) are also appended to the compiler `flags` so they are compiled as separate translation units and linked into the final binary.
- Fixed a subtle bug: the C compile flags were previously assigned by reference (`flags = C_COMPILE_FLAGS`). With multi-file support pushing extra source file paths, this was changed to a spread copy (`flags = [...C_COMPILE_FLAGS]`) to avoid mutating the constant.
- Updated the `run` message handler to extract `files` with a default of `[]`.

### 2. `app/_components/runtime/c.tsx`

Added `prepareFileSystem` and updated `run` in `CWorkerRuntime`:

- `prepareFileSystem(files)`: Decodes all `.c` and `.h` files from the workspace file map (passed as `Uint8Array`) into strings and stores them in `this.stagedFiles`.
- `run(code, emit)`: 
  - Prefers `stagedFiles.get("main.c")` as the entry point source (so the correct content is compiled even if the user has another file open). Falls back to `code` for single-file workspaces where `prepareFileSystem` was not called.
  - Builds a `files` array of all staged files except `main.c` and passes it to the worker via `postMessage`.

### 3. `app/_components/runtime/cpp.tsx`

Same changes as `c.tsx` for `CppWorkerRuntime`:

- `prepareFileSystem(files)`: Stages `.cpp`, `.cc`, `.cxx`, `.h`, and `.hpp` files.
- `run(code, emit)`: Prefers `stagedFiles.get("main.cpp")` as the entry point. Passes all other staged files to the worker.

---

## How It Works

The `Playground` component already had the infrastructure:
1. Before each run, it calls `runtime.prepareFileSystem(fileMap)` with all workspace files (code tabs + uploaded data files), if the runtime supports it.
2. Then it calls `runtime.run(code, emit)` with the currently active file's content.

The new `prepareFileSystem` implementation stores the relevant C/C++ files in memory on the runtime instance. When `run()` is called, it packages those files and sends them to the browsercc Web Worker alongside the entry point source code.

In the worker, the extra files are added to `extraFiles` in the `browsercc.compile()` call:
- **Headers** (`.h`, `.hpp`): placed in the compiler's virtual filesystem so `#include "dog.h"` resolves.
- **Source files** (`.c`, `.cpp`, `.cc`, `.cxx`): also added to the compiler flags so clang compiles them as additional translation units in the same pass.

Example effective compile command for the problem statement's C example:
```
clang --driver-mode=gcc -O2 -Wall -std=gnu17 main.c dog.c
```
With `dog.h` available in the VFS.

---

## Verification

- `npx tsc --noEmit` — passes with no errors.
- `npm run build` — passes successfully (Compiled successfully in 2.4min).

---

## Remaining Tasks / Known Limitations

1. **Subdirectory support**: The implementation passes workspace-relative paths as keys in `extraFiles` (e.g., `"utils/helper.h"`). This should work for nested headers via `#include "utils/helper.h"`, but it depends on browsercc correctly mapping these paths in its VFS. This could not be verified without a live browser environment.

2. **Non-standard entry points**: The current implementation hardcodes `main.c` / `main.cpp` as the entry point filename. Projects with a different entry point name (e.g., `app.c`) would not benefit from the "prefer staged entry point" logic — though the single-file fallback via `code` still works.

3. **Binary/asset extra files**: The `prepareFileSystem` method filters to text-based C/C++ source files only. Binary data files uploaded to the workspace (e.g., `.csv`, `.bin`) are not staged for the C/C++ compiler (they're not relevant to compilation).

4. **Live browser testing**: Changes were validated via TypeScript type checking and a full Next.js production build. End-to-end verification in the browser (actually running a multi-file C/C++ project) requires a running dev server, which was not available in this environment.
