"use client";

import Playground from "../_components/Playground";
import { cppAdapter } from "../_components/runtime/cpp";

export default function CppPage() {
  return <Playground adapter={cppAdapter} />;
}
