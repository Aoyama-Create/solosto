import { describe, expect, it } from "vitest";
import {
  addToList,
  changeType,
  isImpossible,
  withdrawToIdle,
  type ProductState,
} from "@/lib/domain/product-state";

describe("状態遷移 (COM-015)", () => {
  it("種別変更: recurring/tracking → spot は idle 着地（spot×tracking を作らない）", () => {
    const next = changeType({ type: "recurring", status: "tracking" }, "spot");
    expect(next).toEqual({ type: "spot", status: "idle" });
    expect(isImpossible(next)).toBe(false);
  });

  it("種別変更: tracking 以外は status 保持", () => {
    expect(changeType({ type: "recurring", status: "pending" }, "spot")).toEqual({
      type: "spot",
      status: "pending",
    });
    expect(changeType({ type: "recurring", status: "idle" }, "spot")).toEqual({
      type: "spot",
      status: "idle",
    });
    expect(changeType({ type: "spot", status: "idle" }, "recurring")).toEqual({
      type: "recurring",
      status: "idle",
    });
  });

  it("同種別への変更は no-op", () => {
    const s: ProductState = { type: "recurring", status: "tracking" };
    expect(changeType(s, "recurring")).toEqual(s);
  });

  it("どの種別変更でも spot×tracking は生成されない", () => {
    const states: ProductState[] = [
      { type: "recurring", status: "pending" },
      { type: "recurring", status: "tracking" },
      { type: "recurring", status: "idle" },
      { type: "spot", status: "pending" },
      { type: "spot", status: "idle" },
    ];
    for (const s of states) {
      expect(isImpossible(changeType(s, "spot"))).toBe(false);
      expect(isImpossible(changeType(s, "recurring"))).toBe(false);
    }
  });

  it("手動投入 idle→pending / 引っ込め pending→idle", () => {
    expect(addToList({ type: "recurring", status: "idle" }).status).toBe("pending");
    expect(withdrawToIdle({ type: "spot", status: "pending" }).status).toBe("idle");
  });

  it("is_notify_enabled に相当する独立フラグはここで扱わない（型に含めない）", () => {
    // ProductState に通知フラグを含めないことで「巻き込まない」を構造的に保証。
    const next = changeType({ type: "recurring", status: "idle" }, "spot");
    expect(Object.keys(next).sort()).toEqual(["status", "type"]);
  });
});
