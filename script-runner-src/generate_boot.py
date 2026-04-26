#!/usr/bin/env python3
"""
Regenerate public/_dotnet/dotnet.boot.js from the published ScriptRunner.deps.json.

Usage:
    cd script-runner-src
    python3 generate_boot.py

Or after a fresh publish:
    python3 generate_boot.py --deps ../public/_dotnet/ScriptRunner.deps.json \
                              --out  ../public/_dotnet/dotnet.boot.js
"""
import json
import sys
import argparse
import os

parser = argparse.ArgumentParser()
parser.add_argument(
    "--deps",
    default=os.path.join(os.path.dirname(__file__), "..", "public", "_dotnet", "ScriptRunner.deps.json"),
)
parser.add_argument(
    "--out",
    default=os.path.join(os.path.dirname(__file__), "..", "public", "_dotnet", "dotnet.boot.js"),
)
args = parser.parse_args()

with open(args.deps) as f:
    deps = json.load(f)

core_assemblies = []
user_assemblies = []

for target_name, target in deps.get("targets", {}).items():
    if "browser-wasm" not in target_name:
        continue
    for pkg_name, pkg_info in target.items():
        is_runtime_pack = "runtimepack." in pkg_name
        for runtime_lib in list(pkg_info.get("runtime", {}).keys()) + list(pkg_info.get("native", {}).keys()):
            basename = runtime_lib.split("/")[-1]
            if not basename.endswith(".dll"):
                continue
            entry = {"name": basename, "virtualPath": basename}
            target_list = core_assemblies if is_runtime_pack else user_assemblies
            if any(e["name"] == basename for e in target_list):
                continue
            target_list.append(entry)

boot_config = {
    "mainAssemblyName": "ScriptRunner.dll",
    "globalizationMode": "Invariant",
    "disableIntegrityCheck": True,
    "resources": {
        "jsModuleNative": [{"name": "dotnet.native.js"}],
        "jsModuleRuntime": [{"name": "dotnet.runtime.js"}],
        "wasmNative": [{"name": "dotnet.native.wasm"}],
        "coreAssembly": core_assemblies,
        "assembly": user_assemblies,
    },
}

boot_js = f"export const config = {json.dumps(boot_config, indent=2)};\n"
with open(args.out, "w") as f:
    f.write(boot_js)

print(f"Written {args.out}")
print(f"  coreAssembly: {len(core_assemblies)} entries")
print(f"  assembly:     {len(user_assemblies)} entries")
