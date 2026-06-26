import { BottomNav } from "@/components/BottomNav";
import { BadgeSync } from "@/components/BadgeSync";
import { getBuyListCount } from "@/app/actions/buy-list";

// モバイルファーストのアプリシェル: コンテンツ + 固定ボトムタブ。
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // ホームタブの画面内バッジ（買うもの件数＝API-030）。OS App バッジ（COM-043）は BadgeSync で同期。
  const buyCount = await getBuyListCount();
  return (
    <div style={{ minHeight: "100dvh", paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
      <BadgeSync count={buyCount} />
      {children}
      <BottomNav homeBadge={buyCount} />
    </div>
  );
}
