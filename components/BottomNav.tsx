"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS, isActive } from "@/components/nav-tabs";

// ボトムタブ5（design-system.md / モック準拠・モバイル）。アクティブ=primary、safe-area 確保。
// PC（≥768px）では globals.css の `.bottom-nav` が非表示＝サイドバー（SideNav）へ切替。
export function BottomNav({
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
    <nav
      aria-label="メインナビゲーション"
      className="bottom-nav"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        background: "var(--mantine-color-body)",
        borderTop: "1px solid var(--mantine-color-gray-2)",
        paddingBottom: "env(safe-area-inset-bottom)",
        zIndex: 100,
      }}
    >
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href);
        const badge = badgeFor(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "8px 0 10px",
              textDecoration: "none",
              fontSize: 11,
              color: active ? "var(--mantine-color-brand-6)" : "var(--mantine-color-dimmed)",
              fontWeight: active ? 700 : 500,
            }}
          >
            <span style={{ position: "relative", display: "inline-flex", lineHeight: 1 }}>
              <tab.Icon size={22} stroke={1.6} />
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
