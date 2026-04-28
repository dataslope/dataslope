"use client";

import Playground from "../../_components/Playground";
import { csharpAdapter } from "../../_components/runtime/csharp";

export default function CSharpPage() {
  return <Playground adapter={csharpAdapter} />;
}
