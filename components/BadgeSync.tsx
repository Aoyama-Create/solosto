"use client";

import { useEffect } from "react";

// COM-043 バッジ同期。アプリを開くたび、現在の「買うべき件数」を App アイコンのバッジへ反映。
// 0 ならクリア。Push 受信時（public/sw.js の setAppBadge）と合わせて両面でバッジを正しく保つ。
// 表示要素を持たない副作用専用コンポーネント。
export function BadgeSync({ count }: { count: number }) {
  useEffect(() => {
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (!nav) return;
    try {
      if (count > 0 && "setAppBadge" in nav) {
        void nav.setAppBadge(count);
      } else if ("clearAppBadge" in nav) {
        void nav.clearAppBadge();
      }
    } catch {
      // バッジ非対応環境は無視。
    }
  }, [count]);
  return null;
}
