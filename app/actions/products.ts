"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireGroupId } from "@/lib/common/authz";
import { AppError, ok, toResult, type Result } from "@/lib/common/errors";
import { assertPositive } from "@/lib/common/number";
import { addToList, changeType, withdrawToIdle } from "@/lib/domain/product-state";
import type { ProductStatus, ProductType } from "@/lib/domain/product-state";

export type ProductListItem = {
  id: string;
  name: string;
  type: ProductType;
  status: ProductStatus;
  isNotifyEnabled: boolean;
  notifySnoozedUntil: string | null;
  nextOrderDate: string | null; // Phase 3a で購入により入る
  categoryId: string | null;
  categoryName: string | null; // 論理削除済みカテゴリは null 扱い
  defaultUnitsPerPack: number | null; // 購入モーダルの初期値用
  purchaseUrl: string | null;
};

export type ProductDetail = ProductListItem & {
  baseUnit: string | null;
  cycleMode: "auto" | "manual";
  perUnitCycleDays: number | null;
};

export type ProductInput = {
  name: string;
  categoryId: string | null;
  type: ProductType;
  purchaseUrl: string | null;
  baseUnit: string | null;
  defaultUnitsPerPack: number | null;
};

function validateInput(input: ProductInput): string {
  const name = input.name.trim();
  if (!name) throw new AppError("VALIDATION", "商品名を入力してください");
  if (input.defaultUnitsPerPack != null) assertPositive(input.defaultUnitsPerPack, "標準入数");
  return name;
}

// API-010 商品一覧。未削除のみ。カテゴリ名 join（削除済みカテゴリは null 扱い）。
export async function listProducts(filter?: {
  categoryId?: string | null;
}): Promise<Result<ProductListItem[]>> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();
    let query = supabase
      .from("products")
      .select(
        "id, name, type, status, is_notify_enabled, notify_snoozed_until, next_order_date, default_units_per_pack, purchase_url, category_id, categories(name, deleted_at)",
      )
      .eq("group_id", groupId)
      .is("deleted_at", null)
      .order("name");
    if (filter?.categoryId) query = query.eq("category_id", filter.categoryId);

    const { data, error } = await query;
    if (error) throw new AppError("INTERNAL", error.message);

    return ok(
      (data ?? []).map((p) => {
        const cat = p.categories as { name: string; deleted_at: string | null } | null;
        return {
          id: p.id,
          name: p.name,
          type: p.type as ProductType,
          status: p.status as ProductStatus,
          isNotifyEnabled: p.is_notify_enabled,
          notifySnoozedUntil: p.notify_snoozed_until,
          nextOrderDate: p.next_order_date,
          categoryId: p.category_id,
          categoryName: cat && !cat.deleted_at ? cat.name : null,
          defaultUnitsPerPack: p.default_units_per_pack,
          purchaseUrl: p.purchase_url,
        };
      }),
    );
  } catch (e) {
    return toResult(e);
  }
}

// 編集画面用の単一取得。
export async function getProduct(id: string): Promise<Result<ProductDetail>> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(name, deleted_at)")
      .eq("id", id)
      .eq("group_id", groupId)
      .is("deleted_at", null)
      .single();
    if (error || !data) throw new AppError("NOT_FOUND", "商品が見つかりません");
    const cat = data.categories as { name: string; deleted_at: string | null } | null;
    return ok({
      id: data.id,
      name: data.name,
      type: data.type as ProductType,
      status: data.status as ProductStatus,
      isNotifyEnabled: data.is_notify_enabled,
      notifySnoozedUntil: data.notify_snoozed_until,
      nextOrderDate: data.next_order_date,
      categoryId: data.category_id,
      categoryName: cat && !cat.deleted_at ? cat.name : null,
      defaultUnitsPerPack: data.default_units_per_pack,
      purchaseUrl: data.purchase_url,
      baseUnit: data.base_unit,
      cycleMode: data.cycle_mode as "auto" | "manual",
      perUnitCycleDays: data.per_unit_cycle_days,
    });
  } catch (e) {
    return toResult(e);
  }
}

// API-011 商品登録。新規は status='pending'（DB既定。state_diagram の [*]→pending）。
export async function createProduct(input: ProductInput): Promise<Result<{ id: string }>> {
  try {
    const groupId = await requireGroupId();
    const name = validateInput(input);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .insert({
        group_id: groupId,
        name,
        category_id: input.categoryId,
        type: input.type,
        purchase_url: input.purchaseUrl?.trim() || null,
        base_unit: input.baseUnit?.trim() || null,
        default_units_per_pack: input.defaultUnitsPerPack,
      })
      .select("id")
      .single();
    if (error || !data) throw new AppError("INTERNAL", error?.message ?? "登録に失敗しました");
    revalidatePath("/products");
    return ok({ id: data.id });
  } catch (e) {
    return toResult(e);
  }
}

// API-012 商品更新。種別変更は COM-015（is_notify_enabled は不変）。
export async function updateProduct(id: string, input: ProductInput): Promise<Result<null>> {
  try {
    const groupId = await requireGroupId();
    const name = validateInput(input);
    const supabase = await createClient();

    // 種別変更のために現在の type/status を取得し、COM-015 で次状態を算出。
    const { data: current, error: curErr } = await supabase
      .from("products")
      .select("type, status")
      .eq("id", id)
      .eq("group_id", groupId)
      .is("deleted_at", null)
      .single();
    if (curErr || !current) throw new AppError("NOT_FOUND", "商品が見つかりません");

    const next = changeType(
      { type: current.type as ProductType, status: current.status as ProductStatus },
      input.type,
    );

    const { error } = await supabase
      .from("products")
      .update({
        name,
        category_id: input.categoryId,
        type: next.type,
        status: next.status,
        purchase_url: input.purchaseUrl?.trim() || null,
        base_unit: input.baseUnit?.trim() || null,
        default_units_per_pack: input.defaultUnitsPerPack,
      })
      .eq("id", id)
      .eq("group_id", groupId);
    if (error) throw new AppError("INTERNAL", error.message);

    revalidatePath("/products");
    revalidatePath(`/products/${id}/edit`);
    return ok(null);
  } catch (e) {
    return toResult(e);
  }
}

// API-013 論理削除。
export async function deleteProduct(id: string): Promise<Result<null>> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();
    const { error } = await supabase
      .from("products")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("group_id", groupId);
    if (error) throw new AppError("INTERNAL", error.message);
    revalidatePath("/products");
    return ok(null);
  } catch (e) {
    return toResult(e);
  }
}

// 内部: 現在状態を取得して status を更新するヘルパ（COM-015 経由）。
async function transition(
  id: string,
  fn: (s: { type: ProductType; status: ProductStatus }) => { status: ProductStatus },
): Promise<Result<null>> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();
    const { data: current, error: curErr } = await supabase
      .from("products")
      .select("type, status")
      .eq("id", id)
      .eq("group_id", groupId)
      .is("deleted_at", null)
      .single();
    if (curErr || !current) throw new AppError("NOT_FOUND", "商品が見つかりません");
    const next = fn({ type: current.type as ProductType, status: current.status as ProductStatus });
    const { error } = await supabase
      .from("products")
      .update({ status: next.status })
      .eq("id", id)
      .eq("group_id", groupId);
    if (error) throw new AppError("INTERNAL", error.message);
    revalidatePath("/products");
    return ok(null);
  } catch (e) {
    return toResult(e);
  }
}

// API-016 手動投入（買うものリストへ）。
export async function addProductToList(id: string): Promise<Result<null>> {
  return transition(id, (s) => addToList(s));
}

// API-016 引っ込め（買わずに idle へ）。
export async function withdrawProduct(id: string): Promise<Result<null>> {
  return transition(id, (s) => withdrawToIdle(s));
}

// API-017 スヌーズ設定。until は 'YYYY-MM-DD'（未来）/ null=解除。恒久ミュートとは別物。
export async function setSnooze(id: string, until: string | null): Promise<Result<null>> {
  try {
    const groupId = await requireGroupId();
    if (until !== null) {
      const d = new Date(`${until}T00:00:00Z`);
      if (Number.isNaN(d.getTime())) throw new AppError("VALIDATION", "日付が不正です");
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (d <= today) throw new AppError("VALIDATION", "未来の日付を指定してください");
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("products")
      .update({ notify_snoozed_until: until })
      .eq("id", id)
      .eq("group_id", groupId);
    if (error) throw new AppError("INTERNAL", error.message);
    revalidatePath("/products");
    revalidatePath(`/products/${id}/edit`);
    return ok(null);
  } catch (e) {
    return toResult(e);
  }
}

// 通知 ON/OFF（恒久ミュート is_notify_enabled）。独立フラグ。
export async function setNotifyEnabled(id: string, enabled: boolean): Promise<Result<null>> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();
    const { error } = await supabase
      .from("products")
      .update({ is_notify_enabled: enabled })
      .eq("id", id)
      .eq("group_id", groupId);
    if (error) throw new AppError("INTERNAL", error.message);
    revalidatePath("/products");
    revalidatePath(`/products/${id}/edit`);
    return ok(null);
  } catch (e) {
    return toResult(e);
  }
}

// API-018 サイクル設定。manual時は per_unit_cycle_days を固定値に。再計算は Phase 3。
export async function setCycle(
  id: string,
  mode: "auto" | "manual",
  perUnitDays?: number | null,
): Promise<Result<null>> {
  try {
    const groupId = await requireGroupId();
    const update: { cycle_mode: "auto" | "manual"; per_unit_cycle_days?: number } = {
      cycle_mode: mode,
    };
    if (mode === "manual") {
      if (perUnitDays == null)
        throw new AppError("VALIDATION", "手動サイクルの日数を入力してください");
      assertPositive(perUnitDays, "サイクル日数");
      update.per_unit_cycle_days = perUnitDays;
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("products")
      .update(update)
      .eq("id", id)
      .eq("group_id", groupId);
    if (error) throw new AppError("INTERNAL", error.message);
    revalidatePath(`/products/${id}/edit`);
    return ok(null);
  } catch (e) {
    return toResult(e);
  }
}
