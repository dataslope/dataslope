import { describe, expect, it, vi } from "vitest";
import {
  notifyWorkspaceChanged,
  subscribeWorkspaceChanged,
} from "@/app/_components/workspace/workspaceChanges";

describe("workspaceChanges", () => {
  it("delivers pulses to every subscriber", () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = subscribeWorkspaceChanged(a);
    const offB = subscribeWorkspaceChanged(b);
    notifyWorkspaceChanged();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    offA();
    offB();
  });

  it("stops delivering after unsubscribe", () => {
    const a = vi.fn();
    const off = subscribeWorkspaceChanged(a);
    notifyWorkspaceChanged();
    off();
    notifyWorkspaceChanged();
    expect(a).toHaveBeenCalledTimes(1);
  });

  it("isolates a throwing subscriber from the others", () => {
    const boom = vi.fn(() => {
      throw new Error("boom");
    });
    const ok = vi.fn();
    const offBoom = subscribeWorkspaceChanged(boom);
    const offOk = subscribeWorkspaceChanged(ok);
    expect(() => notifyWorkspaceChanged()).not.toThrow();
    expect(ok).toHaveBeenCalledTimes(1);
    offBoom();
    offOk();
  });

  it("lets a subscriber unsubscribe mid-dispatch without skipping others", () => {
    const order: string[] = [];
    const offFirst = subscribeWorkspaceChanged(() => {
      order.push("first");
      offFirst();
    });
    const offSecond = subscribeWorkspaceChanged(() => order.push("second"));
    notifyWorkspaceChanged();
    expect(order).toEqual(["first", "second"]);
    offSecond();
  });
});
