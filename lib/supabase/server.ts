import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// サーバ用クライアント（cookie ベース）。Server Component / Server Action / Route Handler から。
// 遅延生成。RLS が効くので anon key を使う（service_role はバッチ専用＝別途）。
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component から呼ばれた場合 set は無視される（middleware がセッションを更新する）。
          }
        },
      },
    },
  );
}
