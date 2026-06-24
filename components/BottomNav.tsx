"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ボトムタブ5（design-system.md / モック準拠）。アクティブ=primary、safe-area 確保。
const TABS = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/products", label: "商品", icon: "📦" },
  { href: "/search", label: "検索", icon: "🔍" },
  { href: "/notifications", label: "通知", icon: "🔔" },
  { href: "/settings", label: "設定", icon: "⚙️" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="メインナビゲーション"
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
            <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
