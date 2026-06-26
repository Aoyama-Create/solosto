import { describe, expect, it } from "vitest";
import { compareUrgency, computeStockMeter, type StockMeter } from "@/lib/domain/stock-meter";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const today = d("2026-06-26");

describe("在庫メーター (SCR-030)", () => {
  it("余裕あり: あと数日・残量比率", () => {
    // 最終購入 6/1、次回 7/16（窓45日）。今日 6/26 → 残り20日、残量 20/45。
    const m = computeStockMeter({
      nextOrderDate: d("2026-07-16"),
      lastPurchasedAt: d("2026-06-01"),
      today,
    });
    expect(m.daysRemaining).toBe(20);
    expect(m.cycleWindowDays).toBe(45);
    expect(m.fillRatio).toBeCloseTo(20 / 45, 3);
    expect(m.level).toBe("ok");
  });

  it("切れる直前: soon", () => {
    const m = computeStockMeter({
      nextOrderDate: d("2026-06-28"),
      lastPurchasedAt: d("2026-06-01"),
      today,
    });
    expect(m.daysRemaining).toBe(2);
    expect(m.level).toBe("soon");
  });

  it("超過: overdue・残量0", () => {
    const m = computeStockMeter({
      nextOrderDate: d("2026-06-23"),
      lastPurchasedAt: d("2026-06-01"),
      today,
    });
    expect(m.daysRemaining).toBe(-3);
    expect(m.level).toBe("overdue");
    expect(m.fillRatio).toBe(0);
  });

  it("手動投入（next無し）→ manual・メーター無し", () => {
    const m = computeStockMeter({ nextOrderDate: null, lastPurchasedAt: null, today });
    expect(m).toEqual({
      level: "manual",
      daysRemaining: null,
      fillRatio: null,
      cycleWindowDays: null,
    });
  });

  it("緊急度ソート: overdue→soon→ok→manual、同レベルは残り昇順", () => {
    const items: StockMeter[] = [
      { level: "ok", daysRemaining: 20, fillRatio: 0.4, cycleWindowDays: 45 },
      { level: "overdue", daysRemaining: -3, fillRatio: 0, cycleWindowDays: 45 },
      { level: "manual", daysRemaining: null, fillRatio: null, cycleWindowDays: null },
      { level: "soon", daysRemaining: 2, fillRatio: 0.05, cycleWindowDays: 40 },
      { level: "overdue", daysRemaining: -5, fillRatio: 0, cycleWindowDays: 30 },
    ];
    const sorted = [...items].sort(compareUrgency).map((m) => m.level);
    expect(sorted).toEqual(["overdue", "overdue", "soon", "ok", "manual"]);
    // 同 overdue は -5 が先（より超過）
    const overdues = [...items].sort(compareUrgency).filter((m) => m.level === "overdue");
    expect(overdues[0].daysRemaining).toBe(-5);
  });
});
