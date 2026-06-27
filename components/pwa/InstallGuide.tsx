"use client";

import { useEffect, useState } from "react";
import { Alert, Text } from "@mantine/core";
import { isIos, isStandalone, shouldPromptInstall } from "@/lib/pwa/install";

const DISMISS_KEY = "solosto.installGuide.dismissed";

// iOS Safari で「ホーム画面に追加」していない人に、A2HS を促す常設バナー（dismissible）。
// standalone / 非iOS / dismiss 済みでは出さない。判定は lib/pwa/install。
export function InstallGuide() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    setShow(shouldPromptInstall({ standalone: isStandalone(), ios: isIos(), dismissed }));
  }, []);

  if (!show) return null;

  return (
    <Alert
      color="primary"
      variant="light"
      radius="lg"
      title="ホーム画面に追加すると便利です"
      withCloseButton
      onClose={() => {
        localStorage.setItem(DISMISS_KEY, "1");
        setShow(false);
      }}
      m="md"
    >
      <Text size="sm">
        共有ボタン <span aria-hidden>□↑</span> →「ホーム画面に追加」で、アプリのように開けて通知も
        受け取れます。
      </Text>
    </Alert>
  );
}
