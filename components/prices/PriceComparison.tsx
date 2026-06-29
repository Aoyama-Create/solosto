"use client";

import Link from "next/link";
import { Anchor, Badge, Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { LineChart } from "@mantine/charts";
import { IconChevronLeft } from "@tabler/icons-react";
import type { PriceComparison as PriceComparisonData } from "@/app/actions/price";

function yen(n: number): string {
  return `¥${n.toFixed(1)}`;
}

export function PriceComparison({
  productId,
  data,
}: {
  productId: string;
  data: PriceComparisonData;
}) {
  const { stats } = data;

  return (
    <Stack gap="lg">
      <div>
        <Anchor
          component={Link}
          href={`/products/${productId}/edit`}
          size="sm"
          style={{ display: "inline-flex", alignItems: "center", gap: 2 }}
        >
          <IconChevronLeft size={16} /> 商品へ
        </Anchor>
        <Group gap="xs" mt="xs">
          <Title order={1} size="h2">
            {data.productName} · 価格
          </Title>
          {data.scope === "category" && (
            <Badge variant="light" color="primary">
              銘柄横断{data.scopeLabel ? `（${data.scopeLabel}）` : ""}
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          自分の過去の買値の中での相対評価です。
        </Text>
      </div>

      {!stats ? (
        <Text c="dimmed">購入記録がまだありません。購入を登録すると価格が比較できます。</Text>
      ) : (
        <>
          <SimpleGrid cols={3} spacing="sm">
            <Card shadow="xs" radius="md" p="md">
              <Text size="xs" c="dimmed">
                底値 / 個
              </Text>
              <Text fw={700} size="lg" c="success">
                {yen(stats.lowest.unitPrice)}
              </Text>
              <Text size="xs" c="dimmed">
                {stats.lowest.purchasedAt.slice(0, 10)} に記録
              </Text>
            </Card>
            <Card shadow="xs" radius="md" p="md">
              <Text size="xs" c="dimmed">
                平均 / 個
              </Text>
              <Text fw={700} size="lg">
                {yen(stats.average)}
              </Text>
              <Text size="xs" c="dimmed">
                全{stats.count}回の平均
              </Text>
            </Card>
            <Card shadow="xs" radius="md" p="md">
              <Text size="xs" c="dimmed">
                直近の購入
              </Text>
              <Text fw={700} size="lg">
                {yen(stats.latest.unitPrice)}
              </Text>
              <Text size="xs" c={stats.latestVsLowestPct === 0 ? "success" : "alert"}>
                {stats.latestVsLowestPct === 0
                  ? "底値と同じ"
                  : `底値より +${stats.latestVsLowestPct}%`}
              </Text>
            </Card>
          </SimpleGrid>

          {stats.series.length >= 2 && (
            <Card shadow="xs" radius="md" p="md">
              <Text fw={500} mb="sm">
                単価の推移
              </Text>
              <LineChart
                h={220}
                data={stats.series}
                dataKey="date"
                series={[{ name: "unitPrice", label: "単価/個", color: "brand.6" }]}
                curveType="linear"
                withDots
                valueFormatter={(v) => `¥${v}`}
              />
            </Card>
          )}
        </>
      )}
    </Stack>
  );
}
