import { Container, Text } from "@mantine/core";
import { getProfile } from "@/app/actions/profile";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const res = await getProfile();

  return (
    <Container size="sm" py="lg">
      {res.ok ? (
        <SettingsForm profile={res.data} />
      ) : (
        <Text c="alert">設定の読み込みに失敗しました（{res.message}）。</Text>
      )}
    </Container>
  );
}
