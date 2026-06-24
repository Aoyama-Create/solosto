import { Container, Stack, Text, Title } from "@mantine/core";

// 各タブの暫定プレースホルダ。実画面は各 Phase で置き換える。
export function Placeholder({ title, scr }: { title: string; scr?: string }) {
  return (
    <Container size="sm" py="xl">
      <Stack gap="xs">
        <Title order={1} size="h2">
          {title}
        </Title>
        <Text c="dimmed">
          準備中（Phase 0 のシェル）。{scr ? `${scr} は今後のフェーズで実装。` : ""}
        </Text>
      </Stack>
    </Container>
  );
}
