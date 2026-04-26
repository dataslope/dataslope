# ScriptRunner (C# WASM Script Runner)

This directory contains the source for the .NET 10 WebAssembly ScriptRunner
that powers the `/csharp` playground. The compiled output lives in
`public/_dotnet/`.

## Building

Requires .NET 10 SDK with the `wasm-tools` workload:

```bash
dotnet workload install wasm-tools
dotnet publish -c Release -o ../public/_dotnet/
python3 generate_boot.py  # regenerates dotnet.boot.js from deps.json
```

## Architecture

- `Runner.cs` — exposes `[JSExport] RunScript(string code)` which uses
  `Microsoft.CodeAnalysis.CSharp.Scripting.CSharpScript.RunAsync` to
  compile and execute C# top-level statements in the browser via Mono WASM.
- `ScriptRunner.csproj` — targets `browser-wasm` (Mono interpreter mode,
  no AOT) with Roslyn scripting.
- `main.mjs` — required WasmMainJSPath entry point (no-op; API is via JSExport).
