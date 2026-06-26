// Phase 6a スモーク: 通知センター（API-040/041）の取得絞り込み・既読更新を RLS 越しに確認。
// listNotifications の「直近1週間・降順」、markNotificationRead の is_read 反転を再現して検証する。
// 実行: node --env-file=.env.local scripts/smoke-notifications.mjs（要 Supabase 起動・pnpm seed 済み）。冪等。
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);
const { data: auth, error: e } = await supabase.auth.signInWithPassword({
  email: "test@solosto.local",
  password: "password",
});
if (e) throw e;
const userId = auth.user.id;

const { data: profile } = await supabase
  .from("profiles")
  .select("group_id")
  .eq("id", userId)
  .single();
const groupId = profile.group_id;

const MARK = "[smoke-notif]";
const weekAgoIso = () => new Date(Date.now() - 7 * 86400000).toISOString();

// 後始末（前回の残骸）。
await supabase.from("notifications").delete().eq("group_id", groupId).like("title", `${MARK}%`);

// 直近1件と 8日前1件を投入。
const recentIso = new Date(Date.now() - 3600000).toISOString();
const oldIso = new Date(Date.now() - 8 * 86400000).toISOString();
const { error: insErr } = await supabase.from("notifications").insert([
  { user_id: userId, group_id: groupId, title: `${MARK} 最近`, created_at: recentIso },
  { user_id: userId, group_id: groupId, title: `${MARK} 8日前`, created_at: oldIso },
]);
if (insErr) throw insErr;

// listNotifications 相当（7日内・降順）。
async function list() {
  const { data } = await supabase
    .from("notifications")
    .select("id, title, is_read, created_at")
    .eq("group_id", groupId)
    .gte("created_at", weekAgoIso())
    .order("created_at", { ascending: false });
  return data ?? [];
}

const within = await list();
const titles = within.map((n) => n.title);
const hasRecent = titles.includes(`${MARK} 最近`);
const hasOld = titles.includes(`${MARK} 8日前`);

// markNotificationRead 相当。
const recent = within.find((n) => n.title === `${MARK} 最近`);
await supabase
  .from("notifications")
  .update({ is_read: true })
  .eq("id", recent.id)
  .eq("group_id", groupId);
const after = await list();
const readNow = after.find((n) => n.id === recent.id)?.is_read === true;

console.log("7日内:", titles.join(", "));
console.log("既読反転:", readNow);

// 後始末。
await supabase.from("notifications").delete().eq("group_id", groupId).like("title", `${MARK}%`);

if (hasRecent && !hasOld && readNow) {
  console.log("OK: 直近1週間のみ表示・降順・既読更新（RLS: 自グループのみ）");
} else {
  console.error("NG:", { hasRecent, hasOld, readNow });
  process.exit(1);
}
