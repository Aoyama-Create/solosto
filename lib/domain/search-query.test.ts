import { describe, expect, it } from "vitest";
import {
  hasAnyFilter,
  needsPurchaseLogFilter,
  normalizeSearchFilters,
} from "@/lib/domain/search-query";

describe("検索クエリビルダー (COM-030)", () => {
  it("keyword は trim し、空白のみは undefined", () => {
    expect(normalizeSearchFilters({ keyword: "  洗剤 " }).keyword).toBe("洗剤");
    expect(normalizeSearchFilters({ keyword: "   " }).keyword).toBeUndefined();
    expect(normalizeSearchFilters({}).keyword).toBeUndefined();
  });

  it("categoryIds / platforms は dedupe・空値除去", () => {
    const f = normalizeSearchFilters({
      categoryIds: ["a", "a", "", null, "b"],
      platforms: ["amazon", "amazon", "bogus", null, "rakuten"],
    });
    expect(f.categoryIds).toEqual(["a", "b"]);
    expect(f.platforms).toEqual(["amazon", "rakuten"]);
  });

  it("不正な platform 値は捨てる", () => {
    expect(normalizeSearchFilters({ platforms: ["yahoo", "x"] }).platforms).toEqual([]);
    expect(normalizeSearchFilters({ platforms: ["other"] }).platforms).toEqual(["other"]);
  });

  it("日付は妥当な YMD のみ採用", () => {
    expect(normalizeSearchFilters({ from: "2026-06-01" }).from).toBe("2026-06-01");
    expect(normalizeSearchFilters({ from: "2026-13-99" }).from).toBeUndefined();
    expect(normalizeSearchFilters({ from: "2026/06/01" }).from).toBeUndefined();
    expect(normalizeSearchFilters({ to: "" }).to).toBeUndefined();
  });

  it("from > to の逆転は入れ替える", () => {
    const f = normalizeSearchFilters({ from: "2026-06-30", to: "2026-06-01" });
    expect(f.from).toBe("2026-06-01");
    expect(f.to).toBe("2026-06-30");
  });

  it("hasAnyFilter は何かあれば true、空なら false", () => {
    expect(hasAnyFilter(normalizeSearchFilters({}))).toBe(false);
    expect(hasAnyFilter(normalizeSearchFilters({ keyword: "x" }))).toBe(true);
    expect(hasAnyFilter(normalizeSearchFilters({ categoryIds: ["a"] }))).toBe(true);
  });

  it("needsPurchaseLogFilter は platform/期間があるときだけ true", () => {
    expect(needsPurchaseLogFilter(normalizeSearchFilters({ keyword: "x" }))).toBe(false);
    expect(needsPurchaseLogFilter(normalizeSearchFilters({ categoryIds: ["a"] }))).toBe(false);
    expect(needsPurchaseLogFilter(normalizeSearchFilters({ platforms: ["amazon"] }))).toBe(true);
    expect(needsPurchaseLogFilter(normalizeSearchFilters({ from: "2026-06-01" }))).toBe(true);
  });
});
