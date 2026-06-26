"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/common/authz";
import { AppError, ok, toResult, type Result } from "@/lib/common/errors";
import type { Json } from "@/lib/supabase/database.types";

// PushSubscription の JSON（endpoint 必須）。フロントの sub.toJSON() を受ける。
type SubscriptionJSON = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

// jsonb カラムへ書く際の型合わせ（DOM の PushSubscriptionJSON は index signature を持たないため明示変換）。
function asJson(subscription: SubscriptionJSON): Json {
  return subscription as unknown as Json;
}

// API-005 購読登録（デバイス単位）。endpoint をキーに重複排除（同一デバイス再購読で行を増やさない）。
// push_subscriptions は user_id 紐付け → 認証ガード（COM-001）のみ。RLS が自分の行に限定。
export async function registerSubscription(
  subscription: SubscriptionJSON,
  deviceLabel?: string | null,
): Promise<Result<null>> {
  try {
    const user = await requireUser();
    const endpoint = subscription?.endpoint;
    if (!endpoint) throw new AppError("VALIDATION", "購読情報が不正です");
    const supabase = await createClient();

    const { data: existing, error: selErr } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("subscription->>endpoint", endpoint)
      .maybeSingle();
    if (selErr) throw new AppError("INTERNAL", selErr.message);

    if (existing) {
      const { error } = await supabase
        .from("push_subscriptions")
        .update({ subscription: asJson(subscription), last_used_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw new AppError("INTERNAL", error.message);
    } else {
      const { error } = await supabase.from("push_subscriptions").insert({
        user_id: user.id,
        subscription: asJson(subscription),
        device_label: deviceLabel ?? null,
        last_used_at: new Date().toISOString(),
      });
      if (error) throw new AppError("INTERNAL", error.message);
    }
    return ok(null);
  } catch (e) {
    return toResult(e);
  }
}

// API-006 購読解除。自分の該当 endpoint 行を削除（物理）。
export async function unregisterSubscription(endpoint: string): Promise<Result<null>> {
  try {
    const user = await requireUser();
    if (!endpoint) throw new AppError("VALIDATION", "endpoint が必要です");
    const supabase = await createClient();
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("subscription->>endpoint", endpoint);
    if (error) throw new AppError("INTERNAL", error.message);
    return ok(null);
  } catch (e) {
    return toResult(e);
  }
}

// 購読デバイス数（設定の「N台で通知ON」表示用）。
export async function getMyDeviceCount(): Promise<number> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
