"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/common/authz";
import { AppError, ok, toResult, type Result } from "@/lib/common/errors";
import type { Json } from "@/lib/supabase/database.types";
import { sendToSubscriptions } from "@/lib/push/send";
import { buildNotificationPayload } from "@/lib/push/delivery";
import { getBuyListCount } from "@/app/actions/buy-list";
import type { PushSubscription } from "web-push";

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

export type MyDevice = {
  id: string;
  deviceLabel: string | null;
  lastUsedAt: string | null;
  endpoint: string;
};

// 自分の購読デバイス一覧（SCR-003/006 デバイス一覧・失効検知用）。最終受信が新しい順。
// endpoint は本人データ＝「このデバイス」判定にクライアントへ返してよい。
export async function listMyDevices(): Promise<MyDevice[]> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id, device_label, last_used_at, subscription")
      .eq("user_id", user.id)
      .order("last_used_at", { ascending: false, nullsFirst: false });
    if (error) return [];
    return (data ?? []).map((r) => ({
      id: r.id,
      deviceLabel: r.device_label,
      lastUsedAt: r.last_used_at,
      endpoint: (r.subscription as { endpoint: string }).endpoint,
    }));
  } catch {
    return [];
  }
}

export type TestSendResult = { sent: number; failed: number; expired: number; remaining: number };

// COM-040 テスト送信。自分の全購読デバイスへ Push を送り、失効（410/404）行を掃除（COM-042）する。
// バッジ件数は買うべき件数（COM-043 源）を載せる。Phase 6 のバッチはこの送信部品を service_role で再利用する。
export async function sendTestNotification(): Promise<Result<TestSendResult>> {
  try {
    const user = await requireUser();
    const supabase = await createClient();

    const { data: rows, error } = await supabase
      .from("push_subscriptions")
      .select("id, subscription")
      .eq("user_id", user.id);
    if (error) throw new AppError("INTERNAL", error.message);
    if (!rows || rows.length === 0) {
      throw new AppError("VALIDATION", "通知ONのデバイスがありません");
    }

    const badgeCount = await getBuyListCount();
    const payload = buildNotificationPayload({
      title: "solosto テスト通知",
      body: badgeCount > 0 ? `買うべきものが ${badgeCount} 件あります` : "通知が正しく届いています",
      url: "/",
      badgeCount,
    });

    const subs = rows.map((r) => ({
      endpoint: (r.subscription as { endpoint: string }).endpoint,
      subscription: r.subscription as unknown as PushSubscription,
    }));

    const results = await sendToSubscriptions(subs, payload);
    const expiredEndpoints = results.filter((r) => r.expired).map((r) => r.endpoint);

    // 失効した購読行を削除（自分の行のみ・RLS）。
    for (const endpoint of expiredEndpoints) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("subscription->>endpoint", endpoint);
    }

    const sent = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok && !r.expired).length;
    const remaining = rows.length - expiredEndpoints.length;

    return ok({ sent, failed, expired: expiredEndpoints.length, remaining });
  } catch (e) {
    return toResult(e);
  }
}
