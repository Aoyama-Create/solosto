import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// middleware からセッションを更新する（Supabase 推奨パターン）。
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // セッションの更新（getUser でトークンをリフレッシュ）。
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // COM-001 認証ガード。
  const path = request.nextUrl.pathname;
  const isAuthPage = path === "/signin" || path === "/signup";

  // 未ログインで保護パス → /signin。
  if (!user && !isAuthPage) {
    return redirectWithCookies(request, "/signin", supabaseResponse);
  }
  // ログイン済みで認証ページ → トップ。
  if (user && isAuthPage) {
    return redirectWithCookies(request, "/", supabaseResponse);
  }

  return supabaseResponse;
}

// リダイレクト時はリフレッシュ済みセッションクッキーを必ず引き継ぐ（ループ/セッション喪失防止）。
function redirectWithCookies(
  request: NextRequest,
  to: string,
  from: NextResponse,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = to;
  url.search = "";
  const response = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}
