"use client";

import Playground from "../../_components/Playground";
import { webAdapter } from "../../_components/runtime/web";

export default function WebClient() {
  return <Playground adapter={webAdapter} />;
}
