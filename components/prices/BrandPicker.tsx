"use client";

import { useEffect, useState } from "react";
import { Anchor, Button, Card, Group, Stack, Text } from "@mantine/core";
import { getBrandHistory, type BrandHistoryItem } from "@/app/actions/price";
import { buildPurchaseLink } from "@/lib/domain/deeplink";
import { platformLabel, type Platform } from "@/lib/domain/platform";

// SCR-023 銘柄選択（買い足し）。category scope の購入時、過去銘柄から選んで brand/url を prefill。
export function BrandPicker({
  categoryId,
  onPick,
}: {
  categoryId: string;
  onPick: (brand: string, url: string | null) => void;
}) {
  const [items, setItems] = useState<BrandHistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getBrandHistory(categoryId).then((res) => {
      if (active && res.ok) setItems(res.data);
      if (active) setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [categoryId]);

  if (!loaded || items.length === 0) return null;

  return (
    <Card shadow="xs" radius="md" p="sm" bg="var(--mantine-color-gray-0)">
      <Stack gap="xs">
        <Text fw={500} size="sm">
          過去に買った銘柄から選ぶ
        </Text>
        {items.map((it) => {
          const link = buildPurchaseLink(it.purchaseUrl);
          return (
            <Group key={it.brand} justify="space-between" wrap="nowrap">
              <div style={{ minWidth: 0 }}>
                <Text size="sm" fw={500} truncate>
                  {it.brand}
                </Text>
                <Text size="xs" c="dimmed">
                  {[
                    `前回 ${it.lastPurchasedAt.slice(5, 10)}`,
                    `¥${it.lastPrice.toLocaleString()}`,
                    it.lastPlatform ? platformLabel(it.lastPlatform as Platform) : null,
                    `${it.count}回`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </div>
              <Group gap="xs" wrap="nowrap">
                {link && (
                  <Anchor href={link.href} target="_blank" rel="noopener noreferrer" size="sm">
                    {link.label}
                  </Anchor>
                )}
                <Button size="xs" variant="light" onClick={() => onPick(it.brand, it.purchaseUrl)}>
                  選ぶ
                </Button>
              </Group>
            </Group>
          );
        })}
        <Text size="xs" c="dimmed">
          一覧に無い銘柄は、下の「銘柄」欄に直接入力すれば新しい銘柄として記録されます。
        </Text>
      </Stack>
    </Card>
  );
}
