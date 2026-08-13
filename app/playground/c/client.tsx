"use client";

import Playground from "../../_components/Playground";
import { cAdapter } from "../../_components/runtime/c";

export default function CClient() {
  return <Playground adapter={cAdapter} />;
}
