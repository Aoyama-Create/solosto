"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireGroupId } from "@/lib/common/authz";
import { AppError, ok, toResult, type Result } from "@/lib/common/errors";

export type CategoryView = {
  id: string;
  name: string;
  trackingScope: "product" | "category";
};

// API-014 カテゴリ一覧。読み取り系も認証ガード（COM-001/102）。未削除のみ。
export async function listCategories(): Promise<Result<CategoryView[]>> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, tracking_scope")
      .eq("group_id", groupId)
      .is("deleted_at", null)
      .order("name");
    if (error) throw new AppError("INTERNAL", error.message);
    return ok(
      (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        trackingScope: c.tracking_scope as "product" | "category",
      })),
    );
  } catch (e) {
    return toResult(e);
  }
}

// API-014 カテゴリ作成（2a は tracking_scope='product' 既定）。
export async function createCategory(name: string): Promise<Result<null>> {
  try {
    const groupId = await requireGroupId();
    const trimmed = name.trim();
    if (!trimmed) throw new AppError("VALIDATION", "カテゴリ名を入力してください");
    const supabase = await createClient();
    const { error } = await supabase
      .from("categories")
      .insert({ group_id: groupId, name: trimmed });
    if (error) throw new AppError("INTERNAL", error.message);
    revalidatePath("/categories");
    return ok(null);
  } catch (e) {
    return toResult(e);
  }
}

// API-014 カテゴリ名変更。
export async function updateCategory(id: string, name: string): Promise<Result<null>> {
  try {
    const groupId = await requireGroupId();
    const trimmed = name.trim();
    if (!trimmed) throw new AppError("VALIDATION", "カテゴリ名を入力してください");
    const supabase = await createClient();
    const { error } = await supabase
      .from("categories")
      .update({ name: trimmed })
      .eq("id", id)
      .eq("group_id", groupId);
    if (error) throw new AppError("INTERNAL", error.message);
    revalidatePath("/categories");
    return ok(null);
  } catch (e) {
    return toResult(e);
  }
}

// API-014 カテゴリ論理削除。
export async function deleteCategory(id: string): Promise<Result<null>> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();
    const { error } = await supabase
      .from("categories")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("group_id", groupId);
    if (error) throw new AppError("INTERNAL", error.message);
    revalidatePath("/categories");
    revalidatePath("/products");
    return ok(null);
  } catch (e) {
    return toResult(e);
  }
}
