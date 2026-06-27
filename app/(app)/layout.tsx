import { BottomNav } from "@/components/BottomNav";
import { SideNav } from "@/components/SideNav";
import { BadgeSync } from "@/components/BadgeSync";
import { InstallGuide } from "@/components/pwa/InstallGuide";
import { getBuyListCount } from "@/app/actions/buy-list";
import { getUnreadCount } from "@/app/actions/notifications";

// レスポンシブシェル: モバイル=ボトムタブ5 / PC(≥768px)=左サイドバー（globals.css のメディアクエリで切替）。
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // ホームタブ=買うもの件数（API-030）、通知タブ=未読件数（API-040）。OS App バッジ（COM-043）は BadgeSync。
  const [buyCount, unreadCount] = await Promise.all([getBuyListCount(), getUnreadCount()]);
  return (
    <div style={{ minHeight: "100dvh" }}>
      <BadgeSync count={buyCount} />
      <SideNav homeBadge={buyCount} notifyBadge={unreadCount} />
      <div className="app-shell-main">
        <InstallGuide />
        {children}
      </div>
      <BottomNav homeBadge={buyCount} notifyBadge={unreadCount} />
    </div>
  );
}
