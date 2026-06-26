"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Group, Select, Stack, Text, TextInput, Title } from "@mantine/core";
import { updateProfile, type ProfileView } from "@/app/actions/profile";
import { signOut } from "@/app/actions/auth";

const HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: `${String(h).padStart(2, "0")}:00`,
}));

const TIMEZONES = [
  { value: "Asia/Tokyo", label: "Asia/Tokyo（日本）" },
  { value: "Asia/Seoul", label: "Asia/Seoul" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles" },
  { value: "UTC", label: "UTC" },
];

export function SettingsForm({ profile }: { profile: ProfileView }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [notifyHour, setNotifyHour] = useState(String(profile.notifyHour));
  const [timezone, setTimezone] = useState(profile.timezone);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await updateProfile({
        displayName,
        notifyHour: Number(notifyHour),
        timezone,
      });
      if (res.ok) {
        setMessage({ ok: true, text: "保存しました" });
        router.refresh();
      } else {
        setMessage({ ok: false, text: res.message });
      }
    });
  }

  return (
    <Stack gap="lg">
      <Title order={1} size="h2">
        設定
      </Title>

      <Card shadow="sm" radius="lg" p="lg">
        <form onSubmit={handleSave}>
          <Stack gap="md">
            {message && (
              <Alert color={message.ok ? "success" : "alert"} variant="light">
                {message.text}
              </Alert>
            )}

            <TextInput
              label="表示名"
              value={displayName}
              onChange={(e) => setDisplayName(e.currentTarget.value)}
            />

            <Select
              label="通知時刻"
              description="1日1通にまとめて届きます"
              data={HOURS}
              value={notifyHour}
              onChange={(v) => setNotifyHour(v ?? "8")}
              allowDeselect={false}
            />

            <Select
              label="タイムゾーン"
              data={TIMEZONES}
              value={timezone}
              onChange={(v) => setTimezone(v ?? "Asia/Tokyo")}
              allowDeselect={false}
            />

            <Group justify="flex-end">
              <Button type="submit" loading={pending}>
                保存
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      <Card shadow="sm" radius="lg" p="lg">
        <Group justify="space-between" align="center">
          <Text c="dimmed" size="sm">
            このデバイスからログアウトします。
          </Text>
          <form action={signOut}>
            <Button type="submit" variant="light" color="alert">
              ログアウト
            </Button>
          </form>
        </Group>
      </Card>
    </Stack>
  );
}
