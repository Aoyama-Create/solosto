"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireGroupId, requireUser } from "@/lib/common/authz";
import { AppError, ok, toResult, type Result } from "@/lib/common/errors";

export type DeliveryStatus = "sent" | "failed" | "expired";

export type NotificationView = {
  id: string;
  title: string;
  message: string | null;
  isRead: boolean;
  deliveryStatus: DeliveryStatus | null;
  createdAt: string;
};

// 直近1週間の境界（ISO）。仕様: 通知センターは直近1週間のみ表示・7日超は物理削除（6b バッチ）。
// 削除前でも取得を7日内に絞ることで表示が崩れない。
function weekAgoIso(): string {
  return new Date(Date.now() - 7 * 86400000).toISOString();
}

// API-040 通知履歴取得。group-RLS＋認証ガード。直近1週間・新しい順。
export async function listNotifications(): Promise<Result<NotificationView[]>> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, is_read, delivery_status, created_at")
      .eq("group_id", groupId)
      .gte("created_at", weekAgoIso())
      .order("created_at", { ascending: false });
    if (error) throw new AppError("INTERNAL", error.message);
    return ok(
      (data ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        isRead: n.is_read,
        deliveryStatus: n.delivery_status as DeliveryStatus | null,
        createdAt: n.created_at,
      })),
    );
  } catch (e) {
    return toResult(e);
  }
}

// 未読件数（タブ未読バッジ用）。直近1週間で is_read=false。失敗は 0（バッジは欠けても致命でない）。
export async function getUnreadCount(): Promise<number> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId)
      .eq("is_read", false)
      .gte("created_at", weekAgoIso());
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

// API-041 既読更新。自グループの該当行のみ（RLS）。
export async function markNotificationRead(id: string): Promise<Result<null>> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("group_id", groupId);
    if (error) throw new AppError("INTERNAL", error.message);
    revalidatePath("/notifications");
    return ok(null);
  } catch (e) {
    return toResult(e);
  }
}

// 直近1週間の未読を一括既読。
export async function markAllNotificationsRead(): Promise<Result<null>> {
  try {
    const groupId = await requireGroupId();
    const supabase = await createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("group_id", groupId)
      .eq("is_read", false)
      .gte("created_at", weekAgoIso());
    if (error) throw new AppError("INTERNAL", error.message);
    revalidatePath("/notifications");
    return ok(null);
  } catch (e) {
    return toResult(e);
  }
}

// API-042 通知作成（アプリ文脈版＝requireGroupId）。6b バッチが本利用する保存部品。
// バッチ（service_role・RLS外）は別途直接 insert する場合あり。
export async function createNotification(input: {
  title: string;
  message?: string | null;
  deliveryStatus?: DeliveryStatus | null;
}): Promise<Result<null>> {
  try {
    const user = await requireUser();
    const groupId = await requireGroupId();
    const title = input.title.trim();
    if (!title) throw new AppError("VALIDATION", "タイトルが必要です");
    const supabase = await createClient();
    const { error } = await supabase.from("notifications").insert({
      user_id: user.id,
      group_id: groupId,
      title,
      message: input.message ?? null,
      delivery_status: input.deliveryStatus ?? null,
    });
    if (error) throw new AppError("INTERNAL", error.message);
    revalidatePath("/notifications");
    return ok(null);
  } catch (e) {
    return toResult(e);
  }
}
