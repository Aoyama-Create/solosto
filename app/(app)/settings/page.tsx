import { Container, Stack, Text } from "@mantine/core";
import { getProfile } from "@/app/actions/profile";
import { getMyDeviceCount } from "@/app/actions/push";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { NotificationSettings } from "@/components/settings/NotificationSettings";

export default async function SettingsPage() {
  const [res, deviceCount] = await Promise.all([getProfile(), getMyDeviceCount()]);

  return (
    <Container size="sm" py="lg">
      {res.ok ? (
        <Stack gap="lg">
          <SettingsForm profile={res.data} />
          <NotificationSettings deviceCount={deviceCount} />
        </Stack>
      ) : (
        <Text c="alert">設定の読み込みに失敗しました（{res.message}）。</Text>
      )}
    </Container>
  );
}
