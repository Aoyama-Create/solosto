"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import {
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationView,
} from "@/app/actions/notifications";

// 相対時刻の簡易表記（今/分/時間/日前）。1週間内のみ表示するので日までで十分。
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間前`;
  const day = Math.floor(hour / 24);
  return `${day}日前`;
}

export function NotificationCenter({ notifications }: { notifications: NotificationView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const unread = notifications.filter((n) => !n.isRead).length;

  function act(action: () => Promise<{ ok: boolean }>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Title order={1} size="h2">
          通知
        </Title>
        {unread > 0 && (
          <Button
            variant="subtle"
            size="xs"
            loading={pending}
            onClick={() => act(markAllNotificationsRead)}
          >
            すべて既読
          </Button>
        )}
      </Group>

      <Text c="dimmed" size="xs">
        1週間より前の通知は自動で消えます。
      </Text>

      {notifications.length === 0 && (
        <Text c="dimmed" py="xl" ta="center">
          通知はまだありません。
        </Text>
      )}

      <Stack gap="xs">
        {notifications.map((n) => (
          <Card
            key={n.id}
            radius="lg"
            p="md"
            shadow="xs"
            withBorder
            style={{
              cursor: n.isRead ? "default" : "pointer",
              background: n.isRead ? undefined : "var(--mantine-color-surface-0, #FBF7F1)",
            }}
            onClick={() => {
              if (!n.isRead) act(() => markNotificationRead(n.id));
            }}
          >
            <Group wrap="nowrap" align="flex-start" gap="sm">
              <span
                aria-hidden
                style={{
                  marginTop: 6,
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  flexShrink: 0,
                  background: n.isRead ? "transparent" : "var(--mantine-color-brand-6)",
                }}
              />
              <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
                <Group justify="space-between" wrap="nowrap" gap="xs">
                  <Text fw={n.isRead ? 500 : 700} truncate>
                    {n.title}
                  </Text>
                  <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                    {relativeTime(n.createdAt)}
                  </Text>
                </Group>
                {n.message && (
                  <Text size="sm" c="dimmed">
                    {n.message}
                  </Text>
                )}
                {(n.deliveryStatus === "failed" || n.deliveryStatus === "expired") && (
                  <Badge size="xs" variant="light" color="gray">
                    {n.deliveryStatus === "failed" ? "送信失敗" : "購読失効"}
                  </Badge>
                )}
              </Stack>
            </Group>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
