"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Menu,
  Progress,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import type { BuyList as BuyListData, BuyListItem, BrandProduct } from "@/app/actions/buy-list";
import { PurchaseModal } from "@/components/purchases/PurchaseModal";

type BuyTarget = {
  id: string;
  name: string;
  defaultUnitsPerPack: number | null;
  purchaseUrl: string | null;
  categoryId: string | null;
  categoryScope: "product" | "category";
};

const METER_COLOR = { overdue: "alert", soon: "primary", ok: "success", manual: "gray" } as const;

function remainingLabel(item: BuyListItem): string {
  if (item.daysRemaining === null) return "リストに追加済み";
  if (item.daysRemaining < 0) return `予定を${-item.daysRemaining}日超過`;
  if (item.daysRemaining === 0) return "今日まで";
  return `あと${item.daysRemaining}日`;
}

export function BuyList({ todayLabel, data }: { todayLabel: string; data: BuyListData }) {
  const [target, setTarget] = useState<BuyTarget | null>(null);

  function buyProduct(item: BuyListItem) {
    setTarget({
      id: item.id,
      name: item.name,
      defaultUnitsPerPack: item.defaultUnitsPerPack,
      purchaseUrl: item.purchaseUrl,
      categoryId: item.categoryId,
      categoryScope: "product",
    });
  }
  function buyBrand(item: BuyListItem, brand: BrandProduct) {
    setTarget({
      id: brand.id,
      name: brand.name,
      defaultUnitsPerPack: brand.defaultUnitsPerPack,
      purchaseUrl: brand.purchaseUrl,
      categoryId: item.categoryId,
      categoryScope: "category",
    });
  }

  const urgent = data.items.filter((i) => i.level === "overdue" || i.level === "soon");

  return (
    <Stack gap="md">
      <div>
        <Text size="sm" c="dimmed">
          {todayLabel}
        </Text>
        <Title order={1} size="h2">
          そろそろ切れるもの {data.count}件
        </Title>
      </div>

      {data.count === 0 ? (
        <Card shadow="sm" radius="lg" p="xl">
          <Stack gap={4} align="center">
            <Text fw={700} size="lg">
              今は買うものなし
            </Text>
            <Text c="dimmed" size="sm" ta="center">
              ストックは十分そろっています。いいペースで管理できています。
            </Text>
          </Stack>
        </Card>
      ) : (
        <Stack gap="xs">
          {urgent.length > 0 && (
            <Text size="sm" fw={600} c="alert">
              もう切れてる・切れる直前
            </Text>
          )}
          {data.items.map((item) => (
            <Card key={`${item.kind}:${item.id}`} shadow="xs" radius="md" p="sm">
              <Stack gap={8}>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="xs" style={{ minWidth: 0 }}>
                    <Text fw={600} truncate>
                      {item.name}
                    </Text>
                    {item.isCategoryScope && (
                      <Badge size="sm" variant="light" color="primary">
                        銘柄横断
                      </Badge>
                    )}
                  </Group>
                  <Text
                    size="sm"
                    fw={600}
                    c={
                      item.level === "overdue"
                        ? "alert"
                        : item.level === "soon"
                          ? "primary"
                          : "dimmed"
                    }
                  >
                    {remainingLabel(item)}
                  </Text>
                </Group>

                {item.fillRatio !== null && (
                  <Progress
                    value={item.fillRatio * 100}
                    color={METER_COLOR[item.level]}
                    size="md"
                    radius="xl"
                  />
                )}

                <Group justify="space-between">
                  <Group gap="sm">
                    {item.cycleWindowDays != null && (
                      <Text size="xs" c="dimmed">
                        サイクル 約{item.cycleWindowDays}日
                      </Text>
                    )}
                    {item.categoryName && !item.isCategoryScope && (
                      <Text size="xs" c="dimmed">
                        {item.categoryName}
                      </Text>
                    )}
                    {item.link && (
                      <Anchor
                        href={item.link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="xs"
                      >
                        {item.link.label}
                      </Anchor>
                    )}
                  </Group>

                  {item.kind === "product" ? (
                    <Button size="xs" onClick={() => buyProduct(item)}>
                      買った
                    </Button>
                  ) : item.brandProducts.length === 1 ? (
                    <Button size="xs" onClick={() => buyBrand(item, item.brandProducts[0])}>
                      買った
                    </Button>
                  ) : (
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target>
                        <Button size="xs">銘柄を選ぶ</Button>
                      </Menu.Target>
                      <Menu.Dropdown>
                        {item.brandProducts.map((b) => (
                          <Menu.Item key={b.id} onClick={() => buyBrand(item, b)}>
                            {b.name} を買った
                          </Menu.Item>
                        ))}
                        <Menu.Divider />
                        <Menu.Item component={Link} href="/products/new">
                          別の銘柄を追加…
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  )}
                </Group>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}

      {target && (
        <PurchaseModal
          opened={!!target}
          onClose={() => setTarget(null)}
          product={{
            id: target.id,
            name: target.name,
            defaultUnitsPerPack: target.defaultUnitsPerPack,
            purchaseUrl: target.purchaseUrl,
            categoryId: target.categoryId,
            categoryScope: target.categoryScope,
          }}
        />
      )}
    </Stack>
  );
}
