// COM-012/014 ディープリンク。Phase 2a は購入URLをそのままリンク表示する
// （iOS はユニバーサルリンクでアプリが自動起動。独自URLスキームは後続）。
import { detectPlatform, platformLabel } from "@/lib/domain/platform";

export type PurchaseLink = { href: string; label: string };

export function buildPurchaseLink(url: string | null | undefined): PurchaseLink | null {
  if (!url) return null;
  try {
    // 妥当な URL のみ（http/https）。
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  } catch {
    return null;
  }
  const platform = detectPlatform(url);
  return { href: url, label: `${platformLabel(platform)} ↗` };
}
