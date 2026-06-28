"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Menu,
  Progress,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import type { BuyList as BuyListData, BuyListItem, BrandProduct } from "@/app/actions/buy-list";
import { PurchaseModal } from "@/components/purchases/PurchaseModal";
import { METER_COLOR, remainingColor, remainingLabel } from "@/components/stock-meter-ui";

type BuyTarget = {
  id: string;
  name: string;
  defaultUnitsPerPack: number | null;
  purchaseUrl: string | null;
  categoryId: string | null;
  categoryScope: "product" | "category";
};

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

  // 「買った」/銘柄選ぶの導線。カード（モバイル）・テーブル（PC）双方で共有。
  function renderAction(item: BuyListItem) {
    if (item.kind === "product") {
      return (
        <Button size="xs" onClick={() => buyProduct(item)}>
          買った
        </Button>
      );
    }
    if (item.brandProducts.length === 1) {
      return (
        <Button size="xs" onClick={() => buyBrand(item, item.brandProducts[0])}>
          買った
        </Button>
      );
    }
    return (
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
    );
  }

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
        <>
          {/* モバイル: カード */}
          <Box hiddenFrom="sm">
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
                      <Text size="sm" fw={600} c={remainingColor(item.level)}>
                        {remainingLabel(item.daysRemaining)}
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
                        {item.lowestUnitPrice != null && (
                          <Text size="xs" c="success" fw={600}>
                            底値 ¥{item.lowestUnitPrice.toFixed(1)}/個
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
                      {renderAction(item)}
                    </Group>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Box>

          {/* PC: テーブル */}
          <Box visibleFrom="sm">
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>商品</Table.Th>
                  <Table.Th>残り</Table.Th>
                  <Table.Th>サイクル</Table.Th>
                  <Table.Th style={{ textAlign: "right" }}>底値/個</Table.Th>
                  <Table.Th>カテゴリ</Table.Th>
                  <Table.Th>購入先</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.items.map((item) => (
                  <Table.Tr key={`${item.kind}:${item.id}`}>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Text fw={600}>{item.name}</Text>
                        {item.isCategoryScope && (
                          <Badge size="sm" variant="light" color="primary">
                            銘柄横断
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={4} style={{ minWidth: 120 }}>
                        <Text size="sm" fw={600} c={remainingColor(item.level)}>
                          {remainingLabel(item.daysRemaining)}
                        </Text>
                        {item.fillRatio !== null && (
                          <Progress
                            value={item.fillRatio * 100}
                            color={METER_COLOR[item.level]}
                            size="sm"
                            radius="xl"
                          />
                        )}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {item.cycleWindowDays != null ? `約${item.cycleWindowDays}日` : "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: "right" }}>
                      {item.lowestUnitPrice != null ? (
                        <Text size="sm" fw={600} c="success">
                          ¥{item.lowestUnitPrice.toFixed(1)}
                        </Text>
                      ) : (
                        <Text size="sm" c="dimmed">
                          —
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {item.isCategoryScope ? "—" : (item.categoryName ?? "—")}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {item.link ? (
                        <Anchor
                          href={item.link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="sm"
                        >
                          {item.link.label}
                        </Anchor>
                      ) : (
                        <Text size="sm" c="dimmed">
                          —
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: "right" }}>{renderAction(item)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        </>
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
