"use client";

import Playground from "../../_components/Playground";
import { javaAdapter } from "../../_components/runtime/java";

export default function JavaClient() {
  return <Playground adapter={javaAdapter} />;
}
