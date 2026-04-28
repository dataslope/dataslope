"use client";

import Playground from "../../_components/Playground";
import { pythonAdapter } from "../../_components/runtime/python";

export default function PythonPage() {
  return <Playground adapter={pythonAdapter} />;
}
