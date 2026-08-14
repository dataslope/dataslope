"use client";

import Playground from "../../_components/Playground";
import { csharpAdapter } from "../../_components/runtime/csharp";

export default function CSharpClient() {
  return <Playground adapter={csharpAdapter} />;
}
