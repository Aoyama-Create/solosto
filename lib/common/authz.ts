// COM-102 権限ガード（Server Action 用の雛形）。
// 全 API は読み取り系も含めこのガードを通す（RLS とアプリ層の二重防御）。
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/common/errors";

// ログイン中の user を返す。未ログインなら UNAUTHORIZED。
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new AppError("UNAUTHORIZED", "ログインが必要です");
  }
  return user;
}

// ログイン中ユーザーの group_id を返す（profiles 経由）。
// グループ自動生成（COM-002）は Phase 1 で実装。それまで profile 未作成なら FORBIDDEN。
export async function requireGroupId(): Promise<string> {
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
}
