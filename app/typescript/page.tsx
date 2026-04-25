"use client";

import Playground from "../_components/Playground";
import { typescriptAdapter } from "../_components/runtime/typescript";

export default function TypeScriptPage() {
  return <Playground adapter={typescriptAdapter} />;
}
