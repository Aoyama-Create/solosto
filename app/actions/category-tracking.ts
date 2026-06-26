"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireGroupId } from "@/lib/common/authz";
import { AppError, ok, toResult, type Result } from "@/lib/common/errors";
import { assertPositive } from "@/lib/common/number";
import type { TrackingScope } from "@/lib/domain/tracking-scope";

export type CategoryTracking = {
  id: string;
  name: string;
  trackingScope: TrackingScope;
  isNotifyEnabled: boolean;
  notifySnoozedUntil: string | null;
  cycleMode: "auto" | "manual" | null;
  status: "pending" | "tracking" | "idle" | null;
};

// SCR-015 用。カテゴリ追跡設定を取得（name は見出し用）。
export async function getCategoryTracking(id: string): Promise<Result<CategoryTracking>> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select(
        "id, name, tracking_scope, is_notify_enabled, notify_snoozed_until, cycle_mode, status",
      )
      .eq("id", id)
      .eq("group_id", groupId)
      .is("deleted_at", null)
      .single();
    if (error || !data) throw new AppError("NOT_FOUND", "カテゴリが見つかりません");
    return ok({
      id: data.id,
      name: data.name,
      trackingScope: data.tracking_scope as TrackingScope,
      isNotifyEnabled: data.is_notify_enabled,
      notifySnoozedUntil: data.notify_snoozed_until,
      cycleMode: data.cycle_mode as "auto" | "manual" | null,
      status: data.status as "pending" | "tracking" | "idle" | null,
    });
  } catch (e) {
    return toResult(e);
  }
}

export type CategoryTrackingPatch = {
  trackingScope?: TrackingScope;
  isNotifyEnabled?: boolean;
  cycleMode?: "auto" | "manual";
  manualDays?: number | null;
  snoozeUntil?: string | null;
};

// API-019 カテゴリ追跡設定更新。trackingScope 変更時は pending をリセット。
// 返り値 data.pendingReset=true のとき、UI でリセット案内を出す。
export async function updateCategoryTracking(
  id: string,
  patch: CategoryTrackingPatch,
): Promise<Result<{ pendingReset: boolean }>> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();

    // 現在の scope を取得（切替判定用）。
    const { data: current, error: curErr } = await supabase
      .from("categories")
      .select("tracking_scope")
      .eq("id", id)
      .eq("group_id", groupId)
      .is("deleted_at", null)
      .single();
    if (curErr || !current) throw new AppError("NOT_FOUND", "カテゴリが見つかりません");

    const scopeChanged =
      patch.trackingScope != null && patch.trackingScope !== current.tracking_scope;

    // 更新カラムを組み立て。
    const update: Record<string, unknown> = {};
    if (patch.trackingScope != null) update.tracking_scope = patch.trackingScope;
    if (patch.isNotifyEnabled != null) update.is_notify_enabled = patch.isNotifyEnabled;
    if (patch.cycleMode != null) {
      update.cycle_mode = patch.cycleMode;
      if (patch.cycleMode === "manual") {
        if (patch.manualDays == null)
          throw new AppError("VALIDATION", "手動サイクルの日数を入力してください");
        assertPositive(patch.manualDays, "サイクル日数");
        // category 側の per_unit は集計優先のため列を持たない設計。手動値は将来 RPC/集計側で扱う。
      }
    }
    if (patch.snoozeUntil !== undefined) {
      if (patch.snoozeUntil !== null) {
        const d = new Date(`${patch.snoozeUntil}T00:00:00Z`);
        if (Number.isNaN(d.getTime())) throw new AppError("VALIDATION", "日付が不正です");
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        if (d <= today) throw new AppError("VALIDATION", "未来の日付を指定してください");
      }
      update.notify_snoozed_until = patch.snoozeUntil;
    }

    // scope 切替時は pending をリセット（pending のみ。tracking/idle は集計導出ゆえ不触）。
    if (scopeChanged) {
      update.status = null; // カテゴリ自身の pending を解除
      const { error: prodErr } = await supabase
        .from("products")
        .update({ status: "idle" })
        .eq("group_id", groupId)
        .eq("category_id", id)
        .eq("status", "pending")
        .is("deleted_at", null);
      if (prodErr) throw new AppError("INTERNAL", prodErr.message);
    }

    if (Object.keys(update).length > 0) {
      const { error } = await supabase
        .from("categories")
        .update(update)
        .eq("id", id)
        .eq("group_id", groupId);
      if (error) throw new AppError("INTERNAL", error.message);
    }

    revalidatePath("/categories");
    revalidatePath(`/categories/${id}/tracking`);
    revalidatePath("/products");
    return ok({ pendingReset: scopeChanged });
  } catch (e) {
    return toResult(e);
  }
}

// scope準拠の手動投入/スヌーズ（カテゴリ版）。Phase 4 のトップ買い物リストが COM-016 経由で使う。
export async function addCategoryToList(id: string): Promise<Result<null>> {
  return setCategoryStatus(id, "pending");
}
export async function withdrawCategory(id: string): Promise<Result<null>> {
  return setCategoryStatus(id, "idle");
}

async function setCategoryStatus(id: string, status: "pending" | "idle"): Promise<Result<null>> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();
    const { error } = await supabase
      .from("categories")
      .update({ status })
      .eq("id", id)
      .eq("group_id", groupId);
    if (error) throw new AppError("INTERNAL", error.message);
    revalidatePath("/products");
    return ok(null);
  } catch (e) {
    return toResult(e);
  }
}

export async function setCategorySnooze(id: string, until: string | null): Promise<Result<null>> {
  return updateCategoryTracking(id, { snoozeUntil: until }).then((r) => (r.ok ? ok(null) : r));
}

export async function setCategoryNotifyEnabled(
  id: string,
  enabled: boolean,
): Promise<Result<null>> {
  return updateCategoryTracking(id, { isNotifyEnabled: enabled }).then((r) =>
    r.ok ? ok(null) : r,
  );
}
