"use client";

import Playground from "../../_components/Playground";
import { cppAdapter } from "../../_components/runtime/cpp";

export default function CppClient() {
  return <Playground adapter={cppAdapter} />;
}
