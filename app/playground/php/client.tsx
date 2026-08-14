"use client";

import Playground from "../../_components/Playground";
import { phpAdapter } from "../../_components/runtime/php";

export default function PhpClient() {
  return <Playground adapter={phpAdapter} />;
}
