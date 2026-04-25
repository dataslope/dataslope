"use client";

import Playground from "../_components/Playground";
import { javascriptAdapter } from "../_components/runtime/javascript";

export default function JavaScriptPage() {
  return <Playground adapter={javascriptAdapter} />;
}
