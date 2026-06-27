// ナビゲーションのタブ定義（ボトムタブ＝モバイル / サイドバー＝PC で共通）。
// design-system.md / モック準拠の5タブ。二重管理を避けるためここに一元化。

export type NavTab = { href: string; label: string; icon: string };

export const TABS: readonly NavTab[] = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/products", label: "商品", icon: "📦" },
  { href: "/search", label: "検索", icon: "🔍" },
  { href: "/notifications", label: "通知", icon: "🔔" },
  { href: "/settings", label: "設定", icon: "⚙️" },
] as const;

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
