"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/common/authz";
import { AppError, ok, toResult, type Result } from "@/lib/common/errors";
import { hourToNotifyTime, isValidTimeZone, notifyTimeToHour } from "@/lib/common/validation";

export type ProfileView = {
  displayName: string;
  notifyHour: number;
  timezone: string;
};

// API-003 プロファイル取得。読み取り系も認証ガード（COM-102）を通す。
export async function getProfile(): Promise<Result<ProfileView>> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, notify_time, timezone")
      .eq("id", user.id)
      .single();
    if (error || !data) throw new AppError("NOT_FOUND", "プロファイルが見つかりません");
    return ok({
      displayName: data.display_name ?? "",
      notifyHour: notifyTimeToHour(data.notify_time),
      timezone: data.timezone,
    });
  } catch (e) {
    return toResult(e);
  }
}

// API-004 プロファイル更新（表示名・通知時刻・タイムゾーン）。
export async function updateProfile(input: {
  displayName: string;
  notifyHour: number;
  timezone: string;
}): Promise<Result<null>> {
  try {
    const user = await requireUser();
    if (!isValidTimeZone(input.timezone))
      throw new AppError("VALIDATION", "タイムゾーンが不正です");
    const notifyTime = hourToNotifyTime(input.notifyHour); // 0-23 を 'HH:00:00' へ（範囲外は throw）

    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: input.displayName.trim() || null,
        notify_time: notifyTime,
        timezone: input.timezone,
      })
      .eq("id", user.id);
    if (error) throw new AppError("INTERNAL", error.message);

    revalidatePath("/settings");
    return ok(null);
  } catch (e) {
    return toResult(e);
  }
}
