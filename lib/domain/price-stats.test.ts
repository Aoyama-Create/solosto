import { describe, expect, it } from "vitest";
import { computePriceStats } from "@/lib/domain/price-stats";

describe("価格指標 (COM-022/023)", () => {
  it("空は null", () => {
    expect(computePriceStats([])).toBeNull();
  });

  it("底値=MIN・平均=AVG・直近=最新・直近比%", () => {
    const s = computePriceStats([
      { unitPrice: 100, purchasedAt: "2026-02-03T00:00:00Z" },
      { unitPrice: 120, purchasedAt: "2026-05-18T00:00:00Z" }, // 最新
      { unitPrice: 110, purchasedAt: "2026-04-01T00:00:00Z" },
    ])!;
    expect(s.count).toBe(3);
    expect(s.lowest.unitPrice).toBe(100);
    expect(s.lowest.purchasedAt.slice(0, 10)).toBe("2026-02-03");
    expect(s.average).toBeCloseTo(110, 5);
    expect(s.latest.unitPrice).toBe(120);
    expect(s.latestVsLowestPct).toBe(20); // (120-100)/100
  });

  it("直近が底値なら 0%", () => {
    const s = computePriceStats([
      { unitPrice: 120, purchasedAt: "2026-01-01T00:00:00Z" },
      { unitPrice: 100, purchasedAt: "2026-02-01T00:00:00Z" }, // 最新かつ底値
    ])!;
    expect(s.latestVsLowestPct).toBe(0);
  });

  it("series は日付昇順", () => {
    const s = computePriceStats([
      { unitPrice: 120, purchasedAt: "2026-05-18T00:00:00Z" },
      { unitPrice: 100, purchasedAt: "2026-02-03T00:00:00Z" },
    ])!;
    expect(s.series.map((p) => p.date)).toEqual(["2026-02-03", "2026-05-18"]);
  });
});
