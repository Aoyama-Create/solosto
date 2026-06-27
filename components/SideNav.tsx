"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS, isActive } from "@/components/nav-tabs";

// PC（≥768px）用の左サイドバー。モバイルでは globals.css の `.side-nav` が非表示＝ボトムタブへ切替。
// タブ定義は BottomNav と共通（components/nav-tabs.ts）。バッジは homeBadge/notifyBadge を流用。
export function SideNav({
  homeBadge = 0,
  notifyBadge = 0,
}: {
  homeBadge?: number;
  notifyBadge?: number;
}) {
  const pathname = usePathname();
  const badgeFor = (href: string): number =>
    href === "/" ? homeBadge : href === "/notifications" ? notifyBadge : 0;

  return (
    <nav className="side-nav" aria-label="メインナビゲーション">
      <div
        style={{
          fontFamily: "'Zen Maru Gothic', sans-serif",
          fontWeight: 700,
          fontSize: 22,
          color: "var(--mantine-color-brand-6)",
          padding: "20px 20px 12px",
        }}
      >
        solosto
      </div>
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href);
        const badge = badgeFor(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "2px 10px",
              padding: "10px 14px",
              borderRadius: 999,
              textDecoration: "none",
              fontSize: 15,
              color: active ? "var(--mantine-color-brand-7)" : "var(--mantine-color-dimmed)",
              fontWeight: active ? 700 : 500,
              background: active ? "var(--mantine-color-brand-0)" : "transparent",
            }}
          >
            <span style={{ position: "relative", fontSize: 20, lineHeight: 1 }}>
              {tab.icon}
              {badge > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -10,
                    minWidth: 16,
                    height: 16,
                    padding: "0 4px",
                    borderRadius: 999,
                    background: "var(--mantine-color-alert-6)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: "16px",
                    textAlign: "center",
                  }}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
