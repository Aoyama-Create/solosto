"use server";

import { createClient } from "@/lib/supabase/server";
import { requireGroupId } from "@/lib/common/authz";
import { AppError, ok, toResult, type Result } from "@/lib/common/errors";
import { computePriceStats, type PriceStats } from "@/lib/domain/price-stats";

export type PriceComparison = {
  productName: string;
  scope: "product" | "category";
  scopeLabel: string | null; // category scope時のカテゴリ名（銘柄横断）
  stats: PriceStats | null;
};

// SCR-022 価格比較。所属カテゴリの scope に応じ、商品 or カテゴリ銘柄横断で集計（COM-016/022/023）。
export async function getPriceComparison(productId: string): Promise<Result<PriceComparison>> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();

    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("id, name, category_id, categories(id, name, tracking_scope, deleted_at)")
      .eq("id", productId)
      .eq("group_id", groupId)
      .is("deleted_at", null)
      .single();
    if (pErr || !product) throw new AppError("NOT_FOUND", "商品が見つかりません");

    const cat = product.categories as {
      id: string;
      name: string;
      tracking_scope: string;
      deleted_at: string | null;
    } | null;
    const isCategoryScope = !!cat && !cat.deleted_at && cat.tracking_scope === "category";

    // 集計対象 product_id 群を決める（COM-016 の集計単位切替）。
    let productIds: string[] = [productId];
    if (isCategoryScope) {
      const { data: siblings, error: sErr } = await supabase
        .from("products")
        .select("id")
        .eq("group_id", groupId)
        .eq("category_id", cat!.id)
        .is("deleted_at", null);
      if (sErr) throw new AppError("INTERNAL", sErr.message);
      productIds = (siblings ?? []).map((s) => s.id);
    }

    let logs: { unit_price: number; purchased_at: string }[] = [];
    if (productIds.length > 0) {
      const { data, error } = await supabase
        .from("purchase_logs")
        .select("unit_price, purchased_at")
        .in("product_id", productIds);
      if (error) throw new AppError("INTERNAL", error.message);
      logs = data ?? [];
    }

    const stats = computePriceStats(
      logs.map((l) => ({ unitPrice: Number(l.unit_price), purchasedAt: l.purchased_at })),
    );

    return ok({
      productName: product.name,
      scope: isCategoryScope ? "category" : "product",
      scopeLabel: isCategoryScope ? cat!.name : null,
      stats,
    });
  } catch (e) {
    return toResult(e);
  }
}

export type BrandHistoryItem = {
  brand: string;
  lastPurchasedAt: string;
  lastPrice: number;
  lastUnitPrice: number;
  lastPlatform: string | null; // 最新購入のプラットフォーム（other/URL無しは null）
  purchaseUrl: string | null;
  count: number;
};

// API-023 銘柄一覧取得。category scope の買い足し用に、カテゴリ配下ログを brand でグルーピング。
export async function getBrandHistory(categoryId: string): Promise<Result<BrandHistoryItem[]>> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();

    const { data: prods, error: prodErr } = await supabase
      .from("products")
      .select("id")
      .eq("group_id", groupId)
      .eq("category_id", categoryId)
      .is("deleted_at", null);
    if (prodErr) throw new AppError("INTERNAL", prodErr.message);
    const ids = (prods ?? []).map((p) => p.id);
    if (ids.length === 0) return ok([]);

    const { data: logs, error } = await supabase
      .from("purchase_logs")
      .select("brand, price, unit_price, platform, purchase_url, purchased_at")
      .in("product_id", ids)
      .order("purchased_at", { ascending: false });
    if (error) throw new AppError("INTERNAL", error.message);

    // brand ごとに最新購入を代表として集約。
    const map = new Map<string, BrandHistoryItem>();
    for (const l of logs ?? []) {
      const brand = l.brand ?? "（銘柄なし）";
      const existing = map.get(brand);
      if (!existing) {
        map.set(brand, {
          brand,
          lastPurchasedAt: l.purchased_at,
          lastPrice: Number(l.price),
          lastUnitPrice: Number(l.unit_price),
          lastPlatform: l.platform,
          purchaseUrl: l.purchase_url,
          count: 1,
        });
      } else {
        existing.count += 1;
      }
    }
    return ok([...map.values()]);
  } catch (e) {
    return toResult(e);
  }
}
