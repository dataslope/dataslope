"use client";

import Playground from "../_components/Playground";
import { cAdapter } from "../_components/runtime/c";

export default function CPage() {
  return <Playground adapter={cAdapter} />;
}
