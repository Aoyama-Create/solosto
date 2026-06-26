"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppError, err, ok, toResult, type Result } from "@/lib/common/errors";
import { isValidEmail, isValidPassword, MIN_PASSWORD_LENGTH } from "@/lib/common/validation";

// API-001 サインアップ。確認オフ＝即セッション確立。成功は ok()、失敗は Result（遷移はクライアント側）。
export async function signUp(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<Result<null>> {
  try {
    const email = input.email.trim();
    if (!isValidEmail(email))
      throw new AppError("VALIDATION", "メールアドレスの形式が正しくありません");
    if (!isValidPassword(input.password))
      throw new AppError("VALIDATION", `パスワードは${MIN_PASSWORD_LENGTH}文字以上にしてください`);

    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: { data: { display_name: input.displayName?.trim() || null } },
    });
    if (error) return err("VALIDATION", translateAuthError(error.message));
    return ok(null);
  } catch (e) {
    return toResult(e);
  }
}

// API-002 サインイン。
export async function signIn(input: { email: string; password: string }): Promise<Result<null>> {
  try {
    const email = input.email.trim();
    if (!isValidEmail(email))
      throw new AppError("VALIDATION", "メールアドレスの形式が正しくありません");
    if (!input.password) throw new AppError("VALIDATION", "パスワードを入力してください");

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: input.password });
    if (error) return err("UNAUTHORIZED", "メールアドレスまたはパスワードが違います");
    return ok(null);
  } catch (e) {
    return toResult(e);
  }
}

// サインアウト → /signin（成功時はサーバ redirect で可）。
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/signin");
}

// Supabase の英語エラーを日本語へ（代表的なもの）。
function translateAuthError(message: string): string {
  if (/already registered|already exists/i.test(message))
    return "このメールアドレスは既に登録されています";
  return message;
}
