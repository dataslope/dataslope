"use client";

import Playground from "../../_components/Playground";
import { javascriptAdapter } from "../../_components/runtime/javascript";

export default function JavaScriptClient() {
  return <Playground adapter={javascriptAdapter} />;
}
