"use client";

import Playground from "../../_components/Playground";
import { javaAdapter } from "../../_components/runtime/java";

export default function JavaPage() {
  return <Playground adapter={javaAdapter} />;
}
