"use client";

import Playground from "../../_components/Playground";
import { pythonAdapter } from "../../_components/runtime/python";

export default function PythonClient() {
  return <Playground adapter={pythonAdapter} />;
}
