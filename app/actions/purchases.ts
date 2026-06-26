"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireGroupId } from "@/lib/common/authz";
import { AppError, ok, toResult, type Result } from "@/lib/common/errors";
import { totalUnits as calcTotalUnits, unitPrice as calcUnitPrice } from "@/lib/domain/pricing";
import { computeCycleOnPurchase } from "@/lib/domain/cycle";
import { detectPlatform } from "@/lib/domain/platform";
import type { ProductType } from "@/lib/domain/product-state";

export type PurchaseInput = {
  productId: string;
  price: number;
  packQuantity: number;
  unitsPerPack: number;
  purchasedAt: string; // 'YYYY-MM-DD'
  brand?: string | null;
  purchaseUrl?: string | null;
};

export type PurchaseLogView = {
  id: string;
  price: number;
  packQuantity: number;
  unitsPerPack: number;
  totalUnits: number;
  unitPrice: number;
  brand: string | null;
  platform: string | null;
  purchasedAt: string;
};

function parseDate(ymd: string): Date {
  const d = new Date(`${ymd}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new AppError("VALIDATION", "購入日が不正です");
  return d;
}

// 親 product が自グループか検証しつつ取得（COM-102 二重防御）。
async function getOwnedProduct(
  supabase: Awaited<ReturnType<typeof createClient>>,
  groupId: string,
  productId: string,
) {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, type, cycle_mode, per_unit_cycle_days")
    .eq("id", productId)
    .eq("group_id", groupId)
    .is("deleted_at", null)
    .single();
  if (error || !data) throw new AppError("NOT_FOUND", "商品が見つかりません");
  return data;
}

// 商品の最新2件の購入ログからサイクル/状態を再計算して products を更新する（product scope）。
// 購入登録後・履歴削除後の両方から呼ぶ。category-scope の銘柄横断集計は Phase 3b。
async function recomputeProductCycle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  groupId: string,
  product: { id: string; type: string; cycle_mode: string; per_unit_cycle_days: number | null },
) {
  const { data: logs, error } = await supabase
    .from("purchase_logs")
    .select("purchased_at, total_units")
    .eq("product_id", product.id)
    .order("purchased_at", { ascending: false })
    .limit(2);
  if (error) throw new AppError("INTERNAL", error.message);

  const list = logs ?? [];
  const current =
    list.length >= 1
      ? { purchasedAt: new Date(list[0].purchased_at), totalUnits: Number(list[0].total_units) }
      : null;

  // 購入ログが無い（全削除）→ idle・サイクルクリア。
  if (!current) {
    const { error: upErr } = await supabase
      .from("products")
      .update({ status: "idle", next_order_date: null })
      .eq("id", product.id)
      .eq("group_id", groupId);
    if (upErr) throw new AppError("INTERNAL", upErr.message);
    return;
  }

  const prev =
    list.length >= 2
      ? { purchasedAt: new Date(list[1].purchased_at), totalUnits: Number(list[1].total_units) }
      : null;

  const result = computeCycleOnPurchase({
    type: product.type as ProductType,
    cycleMode: product.cycle_mode as "auto" | "manual",
    manualPerUnitDays: product.per_unit_cycle_days,
    prev,
    current,
  });

  const update: Record<string, unknown> = {
    status: result.status,
    next_order_date: result.nextOrderDate ? result.nextOrderDate.toISOString().slice(0, 10) : null,
  };
  // auto時のみ参考自動値を per_unit_cycle_days に保存（manual は手動値を保持）。
  if (product.cycle_mode === "auto" && result.perUnitCycleDays != null) {
    update.per_unit_cycle_days = result.perUnitCycleDays;
  }

  const { error: upErr } = await supabase
    .from("products")
    .update(update)
    .eq("id", product.id)
    .eq("group_id", groupId);
  if (upErr) throw new AppError("INTERNAL", upErr.message);
}

// API-021 購入登録。total_units/unit_price 算出 → ログ記録 → サイクル更新 → status 遷移を駆動。
export async function registerPurchase(input: PurchaseInput): Promise<Result<null>> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();

    const purchasedAt = parseDate(input.purchasedAt);
    const total = calcTotalUnits(input.packQuantity, input.unitsPerPack); // 正値ガード込み
    const unit = calcUnitPrice(input.price, total);

    const product = await getOwnedProduct(supabase, groupId, input.productId);
    const platform = input.purchaseUrl ? detectPlatform(input.purchaseUrl) : null;

    const { error: insErr } = await supabase.from("purchase_logs").insert({
      product_id: input.productId,
      price: input.price,
      pack_quantity: input.packQuantity,
      units_per_pack: input.unitsPerPack, // 記録時点をコピー保存
      total_units: total,
      unit_price: unit,
      brand: input.brand?.trim() || product.name, // 未指定は商品名で補完
      purchase_url: input.purchaseUrl?.trim() || null,
      platform: platform === "other" ? null : platform,
      purchased_at: purchasedAt.toISOString(),
    });
    if (insErr) throw new AppError("INTERNAL", insErr.message);

    await recomputeProductCycle(supabase, groupId, product);

    revalidatePath("/products");
    revalidatePath(`/products/${input.productId}/edit`);
    revalidatePath(`/products/${input.productId}/history`);
    return ok(null);
  } catch (e) {
    return toResult(e);
  }
}

// API-020 購入履歴取得（新しい順）。
export async function listPurchases(productId: string): Promise<Result<PurchaseLogView[]>> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();
    await getOwnedProduct(supabase, groupId, productId); // 所有チェック

    const { data, error } = await supabase
      .from("purchase_logs")
      .select(
        "id, price, pack_quantity, units_per_pack, total_units, unit_price, brand, platform, purchased_at",
      )
      .eq("product_id", productId)
      .order("purchased_at", { ascending: false });
    if (error) throw new AppError("INTERNAL", error.message);

    return ok(
      (data ?? []).map((l) => ({
        id: l.id,
        price: Number(l.price),
        packQuantity: Number(l.pack_quantity),
        unitsPerPack: Number(l.units_per_pack),
        totalUnits: Number(l.total_units),
        unitPrice: Number(l.unit_price),
        brand: l.brand,
        platform: l.platform,
        purchasedAt: l.purchased_at,
      })),
    );
  } catch (e) {
    return toResult(e);
  }
}

// API-022 購入削除（物理削除）。削除後にサイクル再計算。
export async function deletePurchase(id: string): Promise<Result<null>> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();

    // 親 product を特定（所有チェック込み）。
    const { data: log, error: logErr } = await supabase
      .from("purchase_logs")
      .select("product_id")
      .eq("id", id)
      .single();
    if (logErr || !log) throw new AppError("NOT_FOUND", "購入履歴が見つかりません");

    const product = await getOwnedProduct(supabase, groupId, log.product_id);

    const { error: delErr } = await supabase.from("purchase_logs").delete().eq("id", id);
    if (delErr) throw new AppError("INTERNAL", delErr.message);

    await recomputeProductCycle(supabase, groupId, product);

    revalidatePath("/products");
    revalidatePath(`/products/${log.product_id}/history`);
    revalidatePath(`/products/${log.product_id}/edit`);
    return ok(null);
  } catch (e) {
    return toResult(e);
  }
}
