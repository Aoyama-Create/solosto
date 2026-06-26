import { NextResponse } from "next/server";
import type { PushSubscription } from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateInTimeZone } from "@/lib/common/date";
import {
  buildReminderNotification,
  selectFiringNames,
  userFiresNow,
  type FiringCategory,
  type FiringProduct,
} from "@/lib/domain/notify";
import { sendToSubscriptions } from "@/lib/push/send";
import { buildNotificationPayload } from "@/lib/push/delivery";
import type { DeliveryStatus } from "@/app/actions/notifications";

// BAT-001（毎時リマインド）＋ BAT-002（7日超クリーンアップ）を1つの Cron に統合（Vercel 無料枠1本制限）。
// web-push が Node 依存のため Node ランタイム必須。
export const runtime = "nodejs";

// 失効/送信結果から notifications.delivery_status の代表値を決める。
function representativeStatus(results: { ok: boolean; expired: boolean }[]): DeliveryStatus | null {
  if (results.length === 0) return null;
  if (results.some((r) => r.ok)) return "sent";
  if (results.some((r) => r.expired)) return "expired";
  return "failed";
}

export async function GET(request: Request) {
  // CRON_SECRET 認証（Vercel Cron は Authorization: Bearer ${CRON_SECRET} を送る）。
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const supabase = createAdminClient();

  // 1) 通知時刻が「今」のユーザーを抽出。
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, group_id, timezone, notify_time")
    .not("notify_time", "is", null);
  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }
  const targets = (profiles ?? []).filter((p) => userFiresNow(p.notify_time, p.timezone, now));

  let notified = 0;
  let totalSent = 0;
  let totalExpired = 0;

  // 2) 各対象ユーザーで抽出 → 生成 → 送信 → 保存 → 失効掃除。
  for (const profile of targets) {
    const today = formatDateInTimeZone(now, profile.timezone);

    const [{ data: products }, { data: cats }] = await Promise.all([
      supabase
        .from("products")
        .select("name, type, is_notify_enabled, notify_snoozed_until, next_order_date, category_id")
        .eq("group_id", profile.group_id)
        .is("deleted_at", null),
      supabase
        .from("categories")
        .select(
          "id, name, tracking_scope, is_notify_enabled, notify_snoozed_until, next_order_date",
        )
        .eq("group_id", profile.group_id)
        .is("deleted_at", null),
    ]);

    const firingProducts: FiringProduct[] = (products ?? []).map((p) => ({
      name: p.name,
      type: p.type as "recurring" | "spot",
      isNotifyEnabled: p.is_notify_enabled,
      notifySnoozedUntil: p.notify_snoozed_until,
      nextOrderDate: p.next_order_date,
      categoryId: p.category_id,
    }));
    const firingCategories: FiringCategory[] = (cats ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      trackingScope: c.tracking_scope as "product" | "category",
      isNotifyEnabled: c.is_notify_enabled,
      notifySnoozedUntil: c.notify_snoozed_until,
      nextOrderDate: c.next_order_date,
    }));

    const names = selectFiringNames({
      products: firingProducts,
      categories: firingCategories,
      today,
    });
    if (names.length === 0) continue; // 対象なしはスキップ（1日1通・空通知は出さない）。

    const { title, body } = buildReminderNotification(names);

    // 送信（VAPID 未設定など送信不能でも、保存・掃除は続行する）。
    let status: DeliveryStatus | null = null;
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", profile.id);
    const subList = (subs ?? []).map((s) => ({
      endpoint: (s.subscription as { endpoint: string }).endpoint,
      subscription: s.subscription as unknown as PushSubscription,
    }));
    try {
      const payload = buildNotificationPayload({ title, body, url: "/", badgeCount: names.length });
      const results = await sendToSubscriptions(subList, payload);
      status = representativeStatus(results);
      totalSent += results.filter((r) => r.ok).length;
      const expired = results.filter((r) => r.expired).map((r) => r.endpoint);
      totalExpired += expired.length;
      for (const endpoint of expired) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", profile.id)
          .eq("subscription->>endpoint", endpoint);
      }
    } catch {
      status = "failed"; // 送信基盤エラー（VAPID 未設定等）。通知は記録して後で気づけるように。
    }

    // 保存（通知センターに残す）。
    await supabase.from("notifications").insert({
      user_id: profile.id,
      group_id: profile.group_id,
      title,
      message: body,
      delivery_status: status,
    });
    notified += 1;
  }

  // 3) BAT-002 クリーンアップ: 7日超の通知を物理削除（毎回・keepalive 兼用）。
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const { count: deleted } = await supabase
    .from("notifications")
    .delete({ count: "exact" })
    .lt("created_at", weekAgo);

  return NextResponse.json({
    ok: true,
    candidates: targets.length,
    notified,
    sent: totalSent,
    expired: totalExpired,
    cleaned: deleted ?? 0,
  });
}
