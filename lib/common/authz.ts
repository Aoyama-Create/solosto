// COM-102 権限ガード（Server Action 用の雛形）。
// 全 API は読み取り系も含めこのガードを通す（RLS とアプリ層の二重防御）。
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/common/errors";

// ログイン中の user を返す。未ログインなら UNAUTHORIZED。
// React cache() で 1リクエスト内メモ化 → 同一レンダーで複数アクションが呼んでも getUser() は1回だけ。
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new AppError("UNAUTHORIZED", "ログインが必要です");
  }
  return user;
});

// ログイン中ユーザーの group_id を返す（profiles 経由）。
// cache() で 1リクエスト内メモ化（profiles 取得も1回に集約）。
export const requireGroupId = cache(async (): Promise<string> => {
  const supabase = await createClient();
  const user = await requireUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("group_id")
    .eq("id", user.id)
    .single();
  if (error || !data) {
    throw new AppError("FORBIDDEN", "グループが見つかりません");
  }
  return data.group_id;
});
