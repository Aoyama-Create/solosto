"use server";

import { createClient } from "@/lib/supabase/server";
import { requireGroupId } from "@/lib/common/authz";
import { AppError, ok, toResult, type Result } from "@/lib/common/errors";
import { addDays } from "@/lib/common/date";
import type { Platform } from "@/lib/domain/platform";
import {
  needsPurchaseLogFilter,
  normalizeSearchFilters,
  type RawSearchFilters,
} from "@/lib/domain/search-query";

export type SearchResultItem = {
  id: string;
  name: string;
  categoryName: string | null;
  lastPlatform: Platform | null; // 直近購入のプラットフォーム（other/URL無しは null）
  lastPurchasedAt: string | null; // 'YYYY-MM-DD'
};

export type SearchResult = { items: SearchResultItem[]; count: number };

// purchased_at(timestamptz) を YMD で範囲指定するための境界。to は翌日 0時 未満（その日いっぱいを含む）。
function endExclusive(to: string): string {
  return addDays(new Date(`${to}T00:00:00Z`), 1).toISOString();
}

// API-031 商品検索。商品名（部分一致・大小無視）/ カテゴリ / プラットフォーム / 期間で絞り込む。
// platform・期間は purchase_logs 側の属性 → 有効なら先に該当 product_id を引いてから products を絞る（2段）。
// 読み取り専用だが認証ガード（COM-001/102）必須。RLS と二重防御。
export async function searchProducts(raw: RawSearchFilters): Promise<Result<SearchResult>> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();
    const filters = normalizeSearchFilters(raw);

    // 1) platform/期間が有効なら purchase_logs から該当 product_id 集合を先引き。
    let logFilteredIds: string[] | null = null;
    if (needsPurchaseLogFilter(filters)) {
      let logQuery = supabase
        .from("purchase_logs")
        .select("product_id, products!inner(group_id, deleted_at)")
        .eq("products.group_id", groupId)
        .is("products.deleted_at", null);

      if (filters.platforms.length > 0) {
        const named = filters.platforms.filter((p) => p !== "other");
        const includeOther = filters.platforms.includes("other");
        // "other" は登録時 null 保存。null と 名前付き platform を OR で拾う。
        const ors: string[] = [];
        if (named.length > 0) ors.push(`platform.in.(${named.join(",")})`);
        if (includeOther) ors.push("platform.is.null");
        if (ors.length > 0) logQuery = logQuery.or(ors.join(","));
      }
      if (filters.from) logQuery = logQuery.gte("purchased_at", `${filters.from}T00:00:00Z`);
      if (filters.to) logQuery = logQuery.lt("purchased_at", endExclusive(filters.to));

      const { data: logs, error: logErr } = await logQuery;
      if (logErr) throw new AppError("INTERNAL", logErr.message);
      logFilteredIds = [...new Set((logs ?? []).map((l) => l.product_id))];
      // 該当購入が無ければ結果ゼロ確定。
      if (logFilteredIds.length === 0) return ok({ items: [], count: 0 });
    }

    // 2) products を絞り込み（group・未削除・name 部分一致・カテゴリ・ログ集合）。
    let query = supabase
      .from("products")
      .select("id, name, category_id, categories(name, deleted_at)")
      .eq("group_id", groupId)
      .is("deleted_at", null)
      .order("name");
    if (filters.keyword) query = query.ilike("name", `%${filters.keyword}%`);
    if (filters.categoryIds.length > 0) query = query.in("category_id", filters.categoryIds);
    if (logFilteredIds) query = query.in("id", logFilteredIds);

    const { data: products, error } = await query;
    if (error) throw new AppError("INTERNAL", error.message);

    const productList = products ?? [];
    if (productList.length === 0) return ok({ items: [], count: 0 });

    // 3) 直近購入（platform・purchased_at）をまとめ取得（N+1 回避）。最新を JS で集約。
    const ids = productList.map((p) => p.id);
    const { data: logs, error: logErr } = await supabase
      .from("purchase_logs")
      .select("product_id, platform, purchased_at")
      .in("product_id", ids)
      .order("purchased_at", { ascending: false });
    if (logErr) throw new AppError("INTERNAL", logErr.message);

    const lastByProduct = new Map<string, { platform: Platform | null; purchasedAt: string }>();
    for (const l of logs ?? []) {
      if (!lastByProduct.has(l.product_id)) {
        lastByProduct.set(l.product_id, {
          platform: (l.platform as Platform | null) ?? null,
          purchasedAt: l.purchased_at,
        });
      }
    }

    const items: SearchResultItem[] = productList.map((p) => {
      const cat = p.categories as { name: string; deleted_at: string | null } | null;
      const last = lastByProduct.get(p.id) ?? null;
      return {
        id: p.id,
        name: p.name,
        categoryName: cat && !cat.deleted_at ? cat.name : null,
        lastPlatform: last?.platform ?? null,
        lastPurchasedAt: last ? last.purchasedAt.slice(0, 10) : null,
      };
    });

    return ok({ items, count: items.length });
  } catch (e) {
    return toResult(e);
  }
}
