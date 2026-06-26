import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/common/errors";
import {
  computeCycleOnPurchase,
  nextOrderDate,
  perUnitCycleDays,
  type CycleInput,
} from "@/lib/domain/cycle";
import { totalUnits, unitPrice } from "@/lib/domain/pricing";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const ymd = (date: Date) => date.toISOString().slice(0, 10);

describe("単価 (COM-020)", () => {
  it("総個数・単価", () => {
    expect(totalUnits(1, 12)).toBe(12);
    expect(unitPrice(398, 12)).toBeCloseTo(33.1667, 3);
  });
  it("0/負はガード", () => {
    expect(() => totalUnits(0, 12)).toThrowError(AppError);
    expect(() => unitPrice(100, 0)).toThrowError(AppError);
  });
});

describe("サイクル算出 (COM-021/010)", () => {
  it("perUnitCycleDays = 間隔 ÷ 前回total", () => {
    expect(perUnitCycleDays(45, 1)).toBe(45);
    expect(perUnitCycleDays(60, 12)).toBe(5);
  });

  it("next_order_date は今回購入日が起点", () => {
    // per_unit=5, 今回total=12 → +60日
    expect(ymd(nextOrderDate(d("2026-06-01"), 5, 12))).toBe(ymd(d("2026-07-31")));
  });

  it("spot は走らせない（idle・サイクルなし）", () => {
    const r = computeCycleOnPurchase({
      type: "spot",
      cycleMode: "auto",
      prev: { purchasedAt: d("2026-05-01"), totalUnits: 1 },
      current: { purchasedAt: d("2026-06-01"), totalUnits: 1 },
    });
    expect(r).toEqual({ status: "idle", perUnitCycleDays: null, nextOrderDate: null });
  });

  it("初回(prev=null)は idle・サイクル未確定", () => {
    const r = computeCycleOnPurchase({
      type: "recurring",
      cycleMode: "auto",
      prev: null,
      current: { purchasedAt: d("2026-06-01"), totalUnits: 1 },
    });
    expect(r.status).toBe("idle");
    expect(r.nextOrderDate).toBeNull();
  });

  it("2回目(auto)で tracking 確定・next は今回購入日基準", () => {
    // 前回 6/1 に 1個、今回 7/16 に 1個 → interval=45, perUnit=45, next=7/16+45
    const r = computeCycleOnPurchase({
      type: "recurring",
      cycleMode: "auto",
      prev: { purchasedAt: d("2026-06-01"), totalUnits: 1 },
      current: { purchasedAt: d("2026-07-16"), totalUnits: 1 },
    });
    expect(r.status).toBe("tracking");
    expect(r.perUnitCycleDays).toBe(45);
    expect(ymd(r.nextOrderDate!)).toBe(ymd(d("2026-08-30")));
  });

  it("ロット差を吸収（前回12個→今回6個）", () => {
    // 前回 6/1 に 12個（60日で消費）→ perUnit = 60/12 = 5日/個
    // 今回 7/31 に 6個 → next = 7/31 + 5×6 = +30日 = 8/30
    const r = computeCycleOnPurchase({
      type: "recurring",
      cycleMode: "auto",
      prev: { purchasedAt: d("2026-06-01"), totalUnits: 12 },
      current: { purchasedAt: d("2026-07-31"), totalUnits: 6 },
    });
    expect(r.perUnitCycleDays).toBe(5);
    expect(ymd(r.nextOrderDate!)).toBe(ymd(d("2026-08-30")));
  });

  it("manual は手動値固定・per_unit は上書きしない", () => {
    const base: CycleInput = {
      type: "recurring",
      cycleMode: "manual",
      manualPerUnitDays: 4,
      prev: { purchasedAt: d("2026-06-01"), totalUnits: 1 },
      current: { purchasedAt: d("2026-07-01"), totalUnits: 10 },
    };
    const r = computeCycleOnPurchase(base);
    expect(r.status).toBe("tracking");
    expect(r.perUnitCycleDays).toBeNull(); // 手動値を保持（上書きしない）
    expect(ymd(r.nextOrderDate!)).toBe(ymd(d("2026-08-10"))); // 7/1 + 4×10 = +40日
  });
});
