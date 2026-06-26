"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import {
  currentPermission,
  getLocalSubscription,
  isPushSupported,
  subscribeHere,
  unsubscribeHere,
} from "@/lib/push/client";
import { derivePushState, type PushState } from "@/lib/push/state";
import { registerSubscription, unregisterSubscription } from "@/app/actions/push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function NotificationSettings({ deviceCount }: { deviceCount: number }) {
  const router = useRouter();
  const [state, setState] = useState<PushState | null>(null); // null=判定前（SSR/初回）
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // マウント後にブラウザの事実を集めて状態判定（COM-003）。
  async function refresh() {
    const supported = isPushSupported();
    const sub = supported ? await getLocalSubscription() : null;
    setState(
      derivePushState({
        supported,
        permission: supported ? currentPermission() : "default",
        subscribedHere: !!sub,
      }),
    );
  }

  useEffect(() => {
    void refresh();
  }, []);

  function turnOn() {
    setMessage(null);
    if (!VAPID_PUBLIC_KEY) {
      setMessage({ ok: false, text: "通知キーが未設定です（VAPID）。管理者に連絡してください。" });
      return;
    }
    startTransition(async () => {
      const json = await subscribeHere(VAPID_PUBLIC_KEY);
      if (!json) {
        setMessage({ ok: false, text: "通知を許可できませんでした。" });
        await refresh();
        return;
      }
      const res = await registerSubscription(json, navigator.userAgent.slice(0, 120));
      if (res.ok) {
        setMessage({ ok: true, text: "このデバイスで通知をオンにしました。" });
        await refresh();
        router.refresh();
      } else {
        setMessage({ ok: false, text: res.message });
      }
    });
  }

  function turnOff() {
    setMessage(null);
    startTransition(async () => {
      const endpoint = await unsubscribeHere();
      if (endpoint) await unregisterSubscription(endpoint);
      setMessage({ ok: true, text: "このデバイスの通知をオフにしました。" });
      await refresh();
      router.refresh();
    });
  }

  return (
    <Card shadow="sm" radius="lg" p="lg">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={2} size="h4">
            通知
          </Title>
          {state === "on" && (
            <Badge color="success" variant="light">
              このデバイス: ON
            </Badge>
          )}
        </Group>

        <Text c="dimmed" size="sm">
          「そろそろ切れそう」をこのデバイスへお知らせします。1日1通にまとめて届きます。
        </Text>

        {message && (
          <Alert color={message.ok ? "success" : "alert"} variant="light">
            {message.text}
          </Alert>
        )}

        {state === null && (
          <Text c="dimmed" size="sm">
            状態を確認しています…
          </Text>
        )}

        {state === "default" && (
          <Button onClick={turnOn} loading={pending}>
            通知をオンにする
          </Button>
        )}

        {state === "off" && (
          <Button onClick={turnOn} loading={pending}>
            このデバイスで通知をオンにする
          </Button>
        )}

        {state === "on" && (
          <Group justify="flex-end">
            <Button variant="light" color="alert" onClick={turnOff} loading={pending}>
              このデバイスの通知をオフ
            </Button>
          </Group>
        )}

        {state === "denied" && (
          <Alert color="alert" variant="light">
            通知がブロックされています。ブラウザ／OS の設定で solosto の通知を許可してください。
          </Alert>
        )}

        {state === "unsupported" && (
          <Alert color="gray" variant="light">
            この環境では通知を利用できません。iPhone では Safari の「ホーム画面に追加」で
            アプリとして開くと通知を受け取れます。
          </Alert>
        )}

        {deviceCount > 0 && (
          <Text c="dimmed" size="xs">
            通知ONのデバイス: {deviceCount}台
          </Text>
        )}
      </Stack>
    </Card>
  );
}
