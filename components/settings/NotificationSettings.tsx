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
import {
  listMyDevices,
  registerSubscription,
  sendTestNotification,
  unregisterSubscription,
  type MyDevice,
} from "@/app/actions/push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function relativeTime(iso: string | null): string {
  if (!iso) return "未受信";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間前`;
  return `${Math.floor(hour / 24)}日前`;
}

export function NotificationSettings() {
  const router = useRouter();
  const [state, setState] = useState<PushState | null>(null); // null=判定前（SSR/初回）
  const [devices, setDevices] = useState<MyDevice[]>([]);
  const [localEndpoint, setLocalEndpoint] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // マウント後にブラウザの事実とサーバ購読一覧を集める（COM-003 ＋ 失効検知）。
  async function refresh() {
    const supported = isPushSupported();
    const sub = supported ? await getLocalSubscription() : null;
    setLocalEndpoint(sub?.endpoint ?? null);
    setDevices(await listMyDevices());
    setState(
      derivePushState({
        supported,
        permission: supported ? currentPermission() : "default",
        subscribedHere: !!sub,
      }),
    );
  }

  // 失効検知: ローカルは購読中なのにサーバ一覧に当該 endpoint が無い＝サーバ側で失効掃除済み。
  const stalled =
    !!localEndpoint && devices.length > 0 && !devices.some((d) => d.endpoint === localEndpoint);
  // ローカル購読ありだがサーバが全消滅（0件）も止まっている扱い。
  const allGone = !!localEndpoint && devices.length === 0;

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

  function sendTest() {
    setMessage(null);
    startTransition(async () => {
      const res = await sendTestNotification();
      if (!res.ok) {
        setMessage({ ok: false, text: res.message });
        return;
      }
      const { sent, expired, remaining } = res.data;
      if (remaining === 0) {
        setMessage({
          ok: false,
          text: "購読が無効化されていました。もう一度オンにしてください。",
        });
        await refresh();
        router.refresh();
        return;
      }
      setMessage({
        ok: true,
        text: `${sent}台へ送信しました${expired > 0 ? `（失効 ${expired}台を整理）` : ""}。`,
      });
      if (expired > 0) router.refresh();
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

        {(stalled || allGone) && (
          <Alert color="alert" variant="light" title="通知が止まっています">
            <Stack gap="xs">
              <Text size="sm">
                このデバイスの購読が無効になりました。もう一度オンにしてください。
              </Text>
              <Button
                size="xs"
                onClick={turnOn}
                loading={pending}
                style={{ alignSelf: "flex-start" }}
              >
                通知を再開する
              </Button>
            </Stack>
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
          <Group justify="space-between">
            <Button variant="subtle" onClick={sendTest} loading={pending}>
              テスト通知を送る
            </Button>
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

        {devices.length > 0 && (
          <Stack gap={6}>
            <Text size="xs" c="dimmed">
              通知ONのデバイス（{devices.length}台）
            </Text>
            {devices.map((d) => (
              <Group key={d.id} justify="space-between" wrap="nowrap">
                <Text size="sm" truncate style={{ minWidth: 0 }}>
                  {d.deviceLabel || "不明なデバイス"}
                </Text>
                <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
                  {d.endpoint === localEndpoint && (
                    <Badge size="xs" color="success" variant="light">
                      このデバイス
                    </Badge>
                  )}
                  <Text size="xs" c="dimmed">
                    {relativeTime(d.lastUsedAt)}
                  </Text>
                </Group>
              </Group>
            ))}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
