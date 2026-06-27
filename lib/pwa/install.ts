// PWA「ホーム画面に追加」オンボーディングの判定。
// 純粋判定（shouldPromptInstall）は Vitest 可能。ブラウザ事実の取得はクライアント関数で行う。

// 表示すべきか: PWA 未インストール（standalone でない）＆ iOS（A2HS が必要な環境）＆ 未 dismiss。
// Android/PC は beforeinstallprompt 等があり本MVPでは対象外（iOS Safari の手動追加導線が主目的）。
export function shouldPromptInstall(input: {
  standalone: boolean;
  ios: boolean;
  dismissed: boolean;
}): boolean {
  if (input.standalone) return false;
  if (!input.ios) return false;
  if (input.dismissed) return false;
  return true;
}

// ホーム画面から開いている（standalone）か。
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia?.("(display-mode: standalone)");
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return !!mql?.matches || iosStandalone === true;
}

// iOS（iPhone/iPad/iPod）か。iPadOS 13+ は Mac UA を名乗るため touch も見る。
export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = ua.includes("Macintosh") && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}
