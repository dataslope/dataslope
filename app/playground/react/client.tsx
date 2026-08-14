"use client";

import Playground from "../../_components/Playground";
import { reactAdapter } from "../../_components/runtime/react";

export default function ReactClient() {
  return <Playground adapter={reactAdapter} />;
}
