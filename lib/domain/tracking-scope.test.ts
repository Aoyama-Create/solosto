import { describe, expect, it } from "vitest";
import {
  isCategoryScope,
  resolveTrackingSubjects,
  subjectForProduct,
} from "@/lib/domain/tracking-scope";

const cosme = { id: "c-cosme", trackingScope: "product" as const };
const wine = { id: "c-wine", trackingScope: "category" as const };

describe("COM-016 scope分岐解決", () => {
  it("category-scope はカテゴリが subject・配下商品は除外", () => {
    const subjects = resolveTrackingSubjects(
      [cosme, wine],
      [
        { id: "p-skii", categoryId: "c-cosme" },
        { id: "p-mapu", categoryId: "c-wine" },
        { id: "p-osco", categoryId: "c-wine" },
      ],
    );
    expect(subjects).toContainEqual({ kind: "category", categoryId: "c-wine" });
    expect(subjects).toContainEqual({ kind: "product", productId: "p-skii" });
    // ワイン配下の商品は subject にならない
    expect(subjects).not.toContainEqual({ kind: "product", productId: "p-mapu" });
    expect(subjects).not.toContainEqual({ kind: "product", productId: "p-osco" });
  });

  it("カテゴリ無し商品は product subject", () => {
    const subjects = resolveTrackingSubjects([cosme], [{ id: "p-x", categoryId: null }]);
    expect(subjects).toContainEqual({ kind: "product", productId: "p-x" });
  });

  it("削除カテゴリ（一覧に無い）の商品は product subject 扱い", () => {
    // categories に含まれない category_id を持つ商品 → scope 不明 → product subject。
    const subjects = resolveTrackingSubjects([cosme], [{ id: "p-y", categoryId: "c-deleted" }]);
    expect(subjects).toContainEqual({ kind: "product", productId: "p-y" });
  });

  it("subjectForProduct は所属 scope に従う", () => {
    expect(subjectForProduct({ id: "p-mapu", categoryId: "c-wine" }, wine)).toEqual({
      kind: "category",
      categoryId: "c-wine",
    });
    expect(subjectForProduct({ id: "p-skii", categoryId: "c-cosme" }, cosme)).toEqual({
      kind: "product",
      productId: "p-skii",
    });
    expect(subjectForProduct({ id: "p-x", categoryId: null }, null)).toEqual({
      kind: "product",
      productId: "p-x",
    });
  });

  it("isCategoryScope", () => {
    expect(isCategoryScope(wine)).toBe(true);
    expect(isCategoryScope(cosme)).toBe(false);
    expect(isCategoryScope(null)).toBe(false);
  });
});
