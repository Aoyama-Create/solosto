import { BottomNav } from "@/components/BottomNav";
import { getBuyListCount } from "@/app/actions/buy-list";

// モバイルファーストのアプリシェル: コンテンツ + 固定ボトムタブ。
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // ホームタブの画面内バッジ（買うもの件数＝API-030）。OS App バッジ/Push は Phase 5。
  const buyCount = await getBuyListCount();
  return (
    <div style={{ minHeight: "100dvh", paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
      {children}
      <BottomNav homeBadge={buyCount} />
    </div>
  );
}
