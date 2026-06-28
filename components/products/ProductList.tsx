"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Button, Card, Chip, Group, Progress, Stack, Text, Title } from "@mantine/core";
import { METER_COLOR, remainingColor, remainingLabel } from "@/components/stock-meter-ui";
import { addProductToList, withdrawProduct, type ProductListItem } from "@/app/actions/products";
import type { CategoryView } from "@/app/actions/categories";
import type { ProductStatus, ProductType } from "@/lib/domain/product-state";
import { PurchaseModal } from "@/components/purchases/PurchaseModal";

const STATUS_LABEL: Record<ProductStatus, string> = {
  pending: "買うもの",
  tracking: "サイクル稼働",
  idle: "在庫あり",
};
const STATUS_COLOR: Record<ProductStatus, string> = {
  pending: "primary",
  tracking: "success",
  idle: "gray",
};

function typeLabel(t: ProductType): string {
  return t === "recurring" ? "定期" : "単発";
}

export function ProductList({
  products,
  categories,
}: {
  products: ProductListItem[];
  categories: CategoryView[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<string | null>(null); // null = すべて
  const [pending, startTransition] = useTransition();
  const [buying, setBuying] = useState<ProductListItem | null>(null); // 購入モーダル対象

  const filtered = useMemo(
    () => (filter ? products.filter((p) => p.categoryId === filter) : products),
    [products, filter],
  );

  function act(action: () => Promise<{ ok: boolean }>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={1} size="h2">
          商品
        </Title>
        <Group gap="xs">
          <Button component={Link} href="/categories" variant="subtle" size="xs">
            カテゴリ
          </Button>
          <Button component={Link} href="/products/new" size="xs">
            ＋ 追加
          </Button>
        </Group>
      </Group>

      <Chip.Group
        multiple={false}
        value={filter ?? "all"}
        onChange={(v) => setFilter(v === "all" ? null : (v as string))}
      >
        <Group gap="xs">
          <Chip value="all" radius="xl">
            すべて {products.length}
          </Chip>
          {categories.map((c) => (
            <Chip key={c.id} value={c.id} radius="xl">
              {c.name}
            </Chip>
          ))}
        </Group>
      </Chip.Group>

      <Stack gap="xs">
        {filtered.length === 0 && (
          <Text c="dimmed">商品がありません。「＋追加」から登録してください。</Text>
        )}
        {filtered.map((p) => (
          <Card key={p.id} shadow="xs" radius="md" p="sm">
            <Group justify="space-between" wrap="nowrap">
              <Stack gap={4} style={{ minWidth: 0 }}>
                <Group gap="xs" wrap="nowrap">
                  <Text fw={600} truncate>
                    {p.name}
                  </Text>
                </Group>
                <Group gap={6}>
                  <Badge size="sm" variant="light" color="gray">
                    {typeLabel(p.type)}
                  </Badge>
                  <Badge size="sm" variant="light" color={STATUS_COLOR[p.status]}>
                    {STATUS_LABEL[p.status]}
                  </Badge>
                  {!p.isNotifyEnabled && (
                    <Badge size="sm" variant="light" color="gray">
                      ミュート中
                    </Badge>
                  )}
                  {p.notifySnoozedUntil && (
                    <Badge size="sm" variant="light" color="gray">
                      スヌーズ中
                    </Badge>
                  )}
                  {p.categoryName && (
                    <Text size="xs" c="dimmed">
                      {p.categoryName}
                    </Text>
                  )}
                  {categories.find((c) => c.id === p.categoryId)?.trackingScope === "category" && (
                    <Badge size="sm" variant="light" color="primary">
                      銘柄横断
                    </Badge>
                  )}
                  {p.cycleWindowDays != null && (
                    <Text size="xs" c="dimmed">
                      約{p.cycleWindowDays}日サイクル
                    </Text>
                  )}
                  {p.daysRemaining != null && (
                    <Text size="xs" fw={600} c={remainingColor(p.level)}>
                      {remainingLabel(p.daysRemaining)}
                    </Text>
                  )}
                </Group>
                {p.fillRatio !== null && (
                  <Progress
                    value={p.fillRatio * 100}
                    color={METER_COLOR[p.level]}
                    size="sm"
                    radius="xl"
                  />
                )}
              </Stack>

              <Group gap="xs" wrap="nowrap">
                <Button size="xs" loading={pending} onClick={() => setBuying(p)}>
                  買った
                </Button>
                {p.status === "idle" && (
                  <Button
                    size="xs"
                    variant="light"
                    loading={pending}
                    onClick={() => act(() => addProductToList(p.id))}
                  >
                    リストに追加
                  </Button>
                )}
                {p.type === "spot" && p.status === "pending" && (
                  <Button
                    size="xs"
                    variant="subtle"
                    color="gray"
                    loading={pending}
                    onClick={() => act(() => withdrawProduct(p.id))}
                  >
                    引っ込める
                  </Button>
                )}
                <Button
                  component={Link}
                  href={`/products/${p.id}/history`}
                  size="xs"
                  variant="subtle"
                  color="gray"
                >
                  履歴
                </Button>
                <Button component={Link} href={`/products/${p.id}/edit`} size="xs" variant="subtle">
                  編集
                </Button>
              </Group>
            </Group>
          </Card>
        ))}
      </Stack>

      {buying && (
        <PurchaseModal
          opened={!!buying}
          onClose={() => setBuying(null)}
          product={{
            id: buying.id,
            name: buying.name,
            defaultUnitsPerPack: buying.defaultUnitsPerPack,
            purchaseUrl: buying.purchaseUrl,
            categoryId: buying.categoryId,
            categoryScope:
              categories.find((c) => c.id === buying.categoryId)?.trackingScope ?? "product",
          }}
        />
      )}
    </Stack>
  );
}
