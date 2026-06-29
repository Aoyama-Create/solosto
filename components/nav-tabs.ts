// ナビゲーションのタブ定義（ボトムタブ＝モバイル / サイドバー＝PC で共通）。
// design-system.md / モック準拠の5タブ。二重管理を避けるためここに一元化。
// アイコンは @tabler/icons-react（装飾・currentColor 追従）。

import {
  IconBell,
  IconBox,
  IconHome,
  IconSearch,
  IconSettings,
  type Icon,
} from "@tabler/icons-react";

export type NavTab = { href: string; label: string; Icon: Icon };

export const TABS: readonly NavTab[] = [
  { href: "/", label: "ホーム", Icon: IconHome },
  { href: "/products", label: "商品", Icon: IconBox },
  { href: "/search", label: "検索", Icon: IconSearch },
  { href: "/notifications", label: "通知", Icon: IconBell },
  { href: "/settings", label: "設定", Icon: IconSettings },
] as const;

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
