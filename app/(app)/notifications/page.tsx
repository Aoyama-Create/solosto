import { Container, Text } from "@mantine/core";
import { listNotifications } from "@/app/actions/notifications";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

// SCR-040 通知センター。直近1週間の通知履歴・既読/未読。
export default async function NotificationsPage() {
  const res = await listNotifications();

  return (
    <Container size="sm" py="lg">
      {res.ok ? (
        <NotificationCenter notifications={res.data} />
      ) : (
        <Text c="alert">通知の読み込みに失敗しました（{res.message}）。</Text>
      )}
    </Container>
  );
}
