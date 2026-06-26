// COM-016 scope分岐解決。tracking_scope に応じて「追跡の主体（subject）」を商品⇄カテゴリで出し分ける。
// サイクル/状態/通知判定の集計単位を決める土台（実集計は Phase 3、通知抽出は Phase 6）。
// ここは純粋関数のみ（DB に触れない）。

export type TrackingScope = "product" | "category";

export type TrackingSubject =
  | { kind: "product"; productId: string }
  | { kind: "category"; categoryId: string };

type CategoryLike = { id: string; trackingScope: TrackingScope };
type ProductLike = { id: string; categoryId: string | null };

// category-scope か。
export function isCategoryScope(
  category: { trackingScope: TrackingScope } | null | undefined,
): boolean {
  return category?.trackingScope === "category";
}

// 追跡 subject の一覧を解決する。
// - category-scope のカテゴリ → カテゴリ1件が subject（配下商品は subject にしない＝銘柄候補）。
// - product-scope のカテゴリ配下商品／カテゴリ無し商品／削除カテゴリの商品 → 商品が subject。
export function resolveTrackingSubjects(
  categories: CategoryLike[],
  products: ProductLike[],
): TrackingSubject[] {
  const scopeById = new Map(categories.map((c) => [c.id, c.trackingScope]));
  const subjects: TrackingSubject[] = [];

  // category-scope のカテゴリを subject に。
  for (const c of categories) {
    if (c.trackingScope === "category") subjects.push({ kind: "category", categoryId: c.id });
  }

  // 商品: 所属カテゴリが category-scope なら subject にしない（カテゴリ側で代表）。
  for (const p of products) {
    const scope = p.categoryId ? scopeById.get(p.categoryId) : undefined;
    if (scope === "category") continue; // カテゴリが代表
    subjects.push({ kind: "product", productId: p.id });
  }

  return subjects;
}

// 商品の操作（手動投入/スヌーズ）が商品・カテゴリどちらに向かうか。
// 所属カテゴリが category-scope なら category subject、それ以外（product-scope/無し/削除）は product subject。
export function subjectForProduct(
  product: ProductLike,
  category: CategoryLike | null | undefined,
): TrackingSubject {
  if (category && category.id === product.categoryId && category.trackingScope === "category") {
    return { kind: "category", categoryId: category.id };
  }
  return { kind: "product", productId: product.id };
}
