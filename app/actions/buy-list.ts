"use server";

import { createClient } from "@/lib/supabase/server";
import { requireGroupId } from "@/lib/common/authz";
import { ok, toResult, type Result } from "@/lib/common/errors";
import { compareUrgency, computeStockMeter, type UrgencyLevel } from "@/lib/domain/stock-meter";
import { buildPurchaseLink, type PurchaseLink } from "@/lib/domain/deeplink";

export type BrandProduct = {
  id: string;
  name: string;
  defaultUnitsPerPack: number | null;
  purchaseUrl: string | null;
};

export type BuyListItem = {
  kind: "product" | "category";
  id: string;
  name: string;
  categoryName: string | null;
  categoryId: string | null;
  isCategoryScope: boolean;
  daysRemaining: number | null;
  fillRatio: number | null;
  cycleWindowDays: number | null;
  level: UrgencyLevel;
  link: PurchaseLink | null;
  // product subject の購入対象（自身）。
  defaultUnitsPerPack: number | null;
  purchaseUrl: string | null;
  // category subject の銘柄候補（配下 products）。
  brandProducts: BrandProduct[];
};

export type BuyList = { items: BuyListItem[]; count: number };

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
function asDate(ymd: string | null): Date | null {
  return ymd ? new Date(`${ymd.slice(0, 10)}T00:00:00Z`) : null;
}

// API-030 買うべき対象取得（商品単位・カテゴリ単位を統合・緊急度順）。status は mutate しない読み取り集計。
export async function getBuyList(): Promise<Result<BuyList>> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();
    const today = todayStr();
    const todayDate = asDate(today)!;

    // 商品（カテゴリ情報込み）。
    const { data: products } = await supabase
      .from("products")
      .select(
        "id, name, type, status, next_order_date, purchase_url, default_units_per_pack, category_id, categories(name, tracking_scope, deleted_at)",
      )
      .eq("group_id", groupId)
      .is("deleted_at", null);

    // category-scope カテゴリ（subject）。
    const { data: cats } = await supabase
      .from("categories")
      .select("id, name, status, next_order_date")
      .eq("group_id", groupId)
      .eq("tracking_scope", "category")
      .is("deleted_at", null);

    type Cat = { name: string; tracking_scope: string; deleted_at: string | null } | null;

    // product subject 候補（category-scope 配下は除外＝カテゴリ側で代表）。
    const productSubjects = (products ?? []).filter((p) => {
      const cat = p.categories as Cat;
      const inCategoryScope = !!cat && !cat.deleted_at && cat.tracking_scope === "category";
      if (inCategoryScope) return false;
      const due = p.type === "recurring" && p.next_order_date && p.next_order_date <= today;
      return p.status === "pending" || due;
    });

    // category subject 候補。
    const categorySubjects = (cats ?? []).filter(
      (c) => c.status === "pending" || (c.next_order_date && c.next_order_date <= today),
    );

    // メーター用の最終購入日をまとめて取得（N+1 回避）。
    const productIdsForLogs = new Set<string>(productSubjects.map((p) => p.id));
    // category subject の配下商品 id も集める。
    const catProductIds = new Map<string, string[]>(); // categoryId -> productIds
    for (const c of categorySubjects) {
      const ids = (products ?? []).filter((p) => p.category_id === c.id).map((p) => p.id);
      catProductIds.set(c.id, ids);
      ids.forEach((id) => productIdsForLogs.add(id));
    }

    const lastByProduct = new Map<string, { purchasedAt: string; purchaseUrl: string | null }>();
    if (productIdsForLogs.size > 0) {
      const { data: logs } = await supabase
        .from("purchase_logs")
        .select("product_id, purchased_at, purchase_url")
        .in("product_id", [...productIdsForLogs])
        .order("purchased_at", { ascending: false });
      for (const l of logs ?? []) {
        if (!lastByProduct.has(l.product_id)) {
          lastByProduct.set(l.product_id, {
            purchasedAt: l.purchased_at,
            purchaseUrl: l.purchase_url,
          });
        }
      }
    }

    const items: (BuyListItem & { _sortKey: ReturnType<typeof computeStockMeter> })[] = [];

    // product subjects
    for (const p of productSubjects) {
      const cat = p.categories as Cat;
      const last = lastByProduct.get(p.id) ?? null;
      const meter = computeStockMeter({
        nextOrderDate: asDate(p.next_order_date),
        lastPurchasedAt: last ? new Date(last.purchasedAt) : null,
        today: todayDate,
      });
      items.push({
        kind: "product",
        id: p.id,
        name: p.name,
        categoryName: cat && !cat.deleted_at ? cat.name : null,
        categoryId: p.category_id,
        isCategoryScope: false,
        daysRemaining: meter.daysRemaining,
        fillRatio: meter.fillRatio,
        cycleWindowDays: meter.cycleWindowDays,
        level: meter.level,
        link: buildPurchaseLink(p.purchase_url ?? last?.purchaseUrl ?? null),
        defaultUnitsPerPack: p.default_units_per_pack,
        purchaseUrl: p.purchase_url,
        brandProducts: [],
        _sortKey: meter,
      });
    }

    // category subjects（銘柄横断）。最終購入＝配下ログ最新。
    for (const c of categorySubjects) {
      const ids = catProductIds.get(c.id) ?? [];
      let last: { purchasedAt: string; purchaseUrl: string | null } | null = null;
      for (const id of ids) {
        const l = lastByProduct.get(id);
        if (l && (!last || l.purchasedAt > last.purchasedAt)) last = l;
      }
      const meter = computeStockMeter({
        nextOrderDate: asDate(c.next_order_date),
        lastPurchasedAt: last ? new Date(last.purchasedAt) : null,
        today: todayDate,
      });
      const brandProducts: BrandProduct[] = (products ?? [])
        .filter((p) => p.category_id === c.id)
        .map((p) => ({
          id: p.id,
          name: p.name,
          defaultUnitsPerPack: p.default_units_per_pack,
          purchaseUrl: p.purchase_url,
        }));
      items.push({
        kind: "category",
        id: c.id,
        name: c.name,
        categoryName: c.name,
        categoryId: c.id,
        isCategoryScope: true,
        daysRemaining: meter.daysRemaining,
        fillRatio: meter.fillRatio,
        cycleWindowDays: meter.cycleWindowDays,
        level: meter.level,
        link: buildPurchaseLink(last?.purchaseUrl ?? null),
        defaultUnitsPerPack: null,
        purchaseUrl: null,
        brandProducts,
        _sortKey: meter,
      });
    }

    items.sort((a, b) => compareUrgency(a._sortKey, b._sortKey));
    const cleaned: BuyListItem[] = items.map((it) => {
      const rest = { ...it } as BuyListItem & { _sortKey?: unknown };
      delete rest._sortKey;
      return rest;
    });
    return ok({ items: cleaned, count: cleaned.length });
  } catch (e) {
    return toResult(e);
  }
}

// ボトムタブ バッジ用の件数（COM-043 流用）。
export async function getBuyListCount(): Promise<number> {
  const res = await getBuyList();
  return res.ok ? res.data.count : 0;
}
