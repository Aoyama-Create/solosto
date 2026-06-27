"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ActionIcon, Anchor, Box, Card, Group, Stack, Table, Text, Title } from "@mantine/core";
import { deletePurchase, type PurchaseLogView } from "@/app/actions/purchases";

export function PurchaseHistory({
  productId,
  productName,
  logs,
}: {
  productId: string;
  productName: string;
  logs: PurchaseLogView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(id: string) {
    if (!confirm("この購入記録を削除しますか？（サイクルは再計算されます）")) return;
    startTransition(async () => {
      await deletePurchase(id);
      router.refresh();
    });
  }

  return (
    <Stack gap="md">
      <div>
        <Anchor component={Link} href={`/products/${productId}/edit`} size="sm">
          ← 商品へ
        </Anchor>
        <Title order={1} size="h2" mt="xs">
          {productName} の購入履歴
        </Title>
      </div>

      {logs.length === 0 && <Text c="dimmed">購入記録はまだありません。</Text>}

      {/* モバイル: カード */}
      <Box hiddenFrom="sm">
        <Stack gap="xs">
          {logs.map((l) => (
            <Card key={l.id} shadow="xs" radius="md" p="sm">
              <Group justify="space-between" wrap="nowrap">
                <Stack gap={2} style={{ minWidth: 0 }}>
                  <Group gap="xs">
                    <Text fw={600}>{l.purchasedAt.slice(0, 10)}</Text>
                    {l.brand && (
                      <Text size="sm" c="dimmed">
                        {l.brand}
                      </Text>
                    )}
                    {l.platform && (
                      <Text size="xs" c="dimmed">
                        {l.platform}
                      </Text>
                    )}
                  </Group>
                  <Text size="sm" c="dimmed">
                    ¥{l.price.toLocaleString()} / {l.packQuantity}×{l.unitsPerPack}＝{l.totalUnits}
                    個 ・ 単価 ¥{l.unitPrice.toFixed(1)}/個
                  </Text>
                </Stack>
                <ActionIcon
                  variant="subtle"
                  color="alert"
                  aria-label="削除"
                  loading={pending}
                  onClick={() => remove(l.id)}
                >
                  🗑️
                </ActionIcon>
              </Group>
            </Card>
          ))}
        </Stack>
      </Box>

      {/* PC: テーブル */}
      {logs.length > 0 && (
        <Box visibleFrom="sm">
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>日付</Table.Th>
                <Table.Th>銘柄</Table.Th>
                <Table.Th>購入先</Table.Th>
                <Table.Th>数量</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>金額</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>単価/個</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {logs.map((l) => (
                <Table.Tr key={l.id}>
                  <Table.Td>{l.purchasedAt.slice(0, 10)}</Table.Td>
                  <Table.Td>{l.brand ?? "—"}</Table.Td>
                  <Table.Td>{l.platform ?? "—"}</Table.Td>
                  <Table.Td>
                    {l.packQuantity}×{l.unitsPerPack}＝{l.totalUnits}個
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>¥{l.price.toLocaleString()}</Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>¥{l.unitPrice.toFixed(1)}</Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <ActionIcon
                      variant="subtle"
                      color="alert"
                      aria-label="削除"
                      loading={pending}
                      onClick={() => remove(l.id)}
                    >
                      🗑️
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      )}
    </Stack>
  );
}
