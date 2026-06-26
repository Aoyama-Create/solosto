"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ActionIcon, Anchor, Card, Group, Stack, Text, Title } from "@mantine/core";
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
                  ¥{l.price.toLocaleString()} / {l.packQuantity}×{l.unitsPerPack}＝{l.totalUnits}個
                  ・ 単価 ¥{l.unitPrice.toFixed(1)}/個
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
    </Stack>
  );
}
