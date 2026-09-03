# ScriptRunner (C# WASM Script Runner)

This directory contains the source for the .NET 10 WebAssembly ScriptRunner
that powers the `/csharp` playground. The compiled output lives in
`cdn-assets/_dotnet/` (served via jsDelivr, see `app/_components/runtime/cdn.ts`).

## Building

Requires .NET 10 SDK with the `wasm-tools` workload:

```bash
dotnet workload install wasm-tools
dotnet publish -c Release -o ../cdn-assets/_dotnet/
python3 generate_boot.py  # regenerates dotnet.boot.js from deps.json
```

## Architecture

- `Runner.cs`, exposes `[JSExport] RunScript(string code)` which uses
  `Microsoft.CodeAnalysis.CSharp.Scripting.CSharpScript.RunAsync` to
  compile and execute C# top-level statements in the browser via Mono WASM,
  and `[JSExport] Complete(string code, int position, string otherFilesJson)`,
  which answers the editor's completion popup from the semantic model
  (`SemanticModel.LookupSymbols`, no Workspaces/Features assemblies) over
  the same cached reference assemblies.

## After changing `Runner.cs`

The editor discovers `Complete` at boot (`dotnet.ts` looks the export up)
and keeps its static completion tier when the published bundle predates
it. Shipping a change therefore means republishing the bundle: run the
build above, commit the new `cdn-assets/_dotnet/` output, bump
`CDN_ASSETS_TAG` in `app/_components/runtime/cdn.ts`, and push the
matching Git tag as that file describes.
- `ScriptRunner.csproj`, targets `browser-wasm` (Mono interpreter mode,
  no AOT) with Roslyn scripting.
- `main.mjs`, required WasmMainJSPath entry point (no-op; API is via JSExport).
