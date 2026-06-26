import { BottomNav } from "@/components/BottomNav";
import { BadgeSync } from "@/components/BadgeSync";
import { getBuyListCount } from "@/app/actions/buy-list";
import { getUnreadCount } from "@/app/actions/notifications";

// モバイルファーストのアプリシェル: コンテンツ + 固定ボトムタブ。
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // ホームタブ=買うもの件数（API-030）、通知タブ=未読件数（API-040）。OS App バッジ（COM-043）は BadgeSync。
  const [buyCount, unreadCount] = await Promise.all([getBuyListCount(), getUnreadCount()]);
  return (
    <div style={{ minHeight: "100dvh", paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
      <BadgeSync count={buyCount} />
      {children}
      <BottomNav homeBadge={buyCount} notifyBadge={unreadCount} />
    </div>
  );
}
