"use client";

import { useEffect } from "react";

// /sw.js を登録（対応ブラウザのみ）。Push 受信・通知表示・バッジに必要。
// 表示要素を持たない副作用専用コンポーネント。ルート layout に1つ置く。
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // 登録失敗（非対応/非secure context 等）は致命ではないので握りつぶす。
    });
  }, []);
  return null;
}
