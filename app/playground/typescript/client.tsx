"use client";

import Playground from "../../_components/Playground";
import { typescriptAdapter } from "../../_components/runtime/typescript";

export default function TypeScriptClient() {
  return <Playground adapter={typescriptAdapter} />;
}
