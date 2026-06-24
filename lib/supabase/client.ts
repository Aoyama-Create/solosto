import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

// ブラウザ用クライアント。クライアントコンポーネントから呼ぶ。
// 遅延生成（モジュール先頭で作らない）→ env 無しビルドでも壊れない。
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
