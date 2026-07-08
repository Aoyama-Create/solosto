import { Card, Container, Group, SimpleGrid, Skeleton, Stack } from "@mantine/core";

// ローディング用スケルトン（loading.tsx から使用）。本文構造に近似しレイアウトシフトを抑える。
// 一過性表示なので aria は付けず（Next の loading.tsx が region を担う）。

type ContainerSize = "sm" | "lg";

// リスト系（ホーム/商品/通知/履歴/検索）。ヘッダ＋カード風の行。
export function ListSkeleton({
  container = "sm",
  rows = 4,
}: {
  container?: ContainerSize;
  rows?: number;
}) {
  return (
    <Container size={container} py="lg">
      <Stack gap="md">
        <Skeleton height={28} width="45%" radius="sm" />
        <Stack gap="xs">
          {Array.from({ length: rows }).map((_, i) => (
            <Card key={i} shadow="xs" radius="md" p="sm">
              <Stack gap={8}>
                <Skeleton height={16} width="55%" radius="sm" />
                <Group gap={6}>
                  <Skeleton height={12} width={48} radius="xl" />
                  <Skeleton height={12} width={64} radius="xl" />
                </Group>
                <Skeleton height={8} radius="xl" />
              </Stack>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}

// フォーム系（設定/登録/編集/カテゴリ追跡）。カード内に入力行。
export function FormSkeleton({ container = "sm" }: { container?: ContainerSize }) {
  return (
    <Container size={container} py="lg">
      <Stack gap="lg">
        <Skeleton height={28} width="40%" radius="sm" />
        <Card shadow="sm" radius="lg" p="lg">
          <Stack gap="md">
            {Array.from({ length: 4 }).map((_, i) => (
              <Stack key={i} gap={6}>
                <Skeleton height={12} width="30%" radius="sm" />
                <Skeleton height={36} radius="sm" />
              </Stack>
            ))}
            <Group justify="flex-end">
              <Skeleton height={36} width={96} radius="xl" />
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}

// 価格ビュー。3スタッツ＋チャート領域。
export function PriceSkeleton({ container = "sm" }: { container?: ContainerSize }) {
  return (
    <Container size={container} py="lg">
      <Stack gap="lg">
        <Skeleton height={28} width="55%" radius="sm" />
        <SimpleGrid cols={3} spacing="sm">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} shadow="xs" radius="md" p="md">
              <Stack gap={6}>
                <Skeleton height={10} width="60%" radius="sm" />
                <Skeleton height={20} width="70%" radius="sm" />
                <Skeleton height={10} width="50%" radius="sm" />
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
        <Card shadow="xs" radius="md" p="md">
          <Skeleton height={220} radius="sm" />
        </Card>
      </Stack>
    </Container>
  );
}
