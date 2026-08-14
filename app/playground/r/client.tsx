"use client";

import Playground from "../../_components/Playground";
import { rAdapter } from "../../_components/runtime/r";

export default function RClient() {
  return <Playground adapter={rAdapter} />;
}
