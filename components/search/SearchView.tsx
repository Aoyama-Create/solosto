"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Chip, Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { searchProducts, type SearchResultItem } from "@/app/actions/search";
import type { CategoryView } from "@/app/actions/categories";
import { platformLabel, type Platform } from "@/lib/domain/platform";

// フィルタ用プラットフォーム（other は「その他」＝URL無し/未認識）。
const FILTER_PLATFORMS: { value: Platform; label: string }[] = [
  { value: "amazon", label: "Amazon" },
  { value: "rakuten", label: "楽天" },
  { value: "temu", label: "Temu" },
  { value: "shein", label: "Shein" },
  { value: "other", label: "その他" },
];

function formatMd(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function SearchView({ categories }: { categories: CategoryView[] }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<SearchResultItem[]>([]);
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();

  // フィルタ変更で都度検索（小規模データ）。keyword はタイプ中の負荷軽減に軽くデバウンス。
  useEffect(() => {
    const run = () =>
      startTransition(async () => {
        const res = await searchProducts({
          keyword,
          categoryIds,
          platforms,
          from: from || null,
          to: to || null,
        });
        if (res.ok) setItems(res.data.items);
        setSearched(true);
      });
    const t = setTimeout(run, keyword ? 250 : 0);
    return () => clearTimeout(t);
  }, [keyword, categoryIds, platforms, from, to]);

  return (
    <Stack gap="md">
      <Title order={1} size="h2">
        検索
      </Title>

      <TextInput
        placeholder="商品名で検索（例: 洗剤）"
        value={keyword}
        onChange={(e) => setKeyword(e.currentTarget.value)}
        radius="xl"
      />

      <Stack gap={6}>
        <Text size="xs" c="dimmed">
          カテゴリ
        </Text>
        <Chip.Group multiple value={categoryIds} onChange={setCategoryIds}>
          <Group gap="xs">
            {categories.length === 0 && (
              <Text size="xs" c="dimmed">
                カテゴリがありません
              </Text>
            )}
            {categories.map((c) => (
              <Chip key={c.id} value={c.id} radius="xl" size="sm">
                {c.name}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      </Stack>

      <Stack gap={6}>
        <Text size="xs" c="dimmed">
          プラットフォーム
        </Text>
        <Chip.Group multiple value={platforms} onChange={setPlatforms}>
          <Group gap="xs">
            {FILTER_PLATFORMS.map((p) => (
              <Chip key={p.value} value={p.value} radius="xl" size="sm">
                {p.label}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
      </Stack>

      <Group grow>
        <TextInput
          type="date"
          label="期間（開始）"
          value={from}
          onChange={(e) => setFrom(e.currentTarget.value)}
          max={to || undefined}
        />
        <TextInput
          type="date"
          label="期間（終了）"
          value={to}
          onChange={(e) => setTo(e.currentTarget.value)}
          min={from || undefined}
        />
      </Group>

      <Text size="sm" c="dimmed">
        {pending ? "検索中…" : `${items.length}件 見つかりました`}
      </Text>

      <Stack gap="xs">
        {searched && !pending && items.length === 0 && (
          <Text c="dimmed">該当する商品がありません。条件を変えてください。</Text>
        )}
        {items.map((it) => (
          <Card
            key={it.id}
            shadow="xs"
            radius="md"
            p="sm"
            withBorder
            style={{ cursor: "pointer" }}
            onClick={() => router.push(`/products/${it.id}/edit`)}
          >
            <Stack gap={4}>
              <Text fw={600} truncate>
                {it.name}
              </Text>
              <Text size="xs" c="dimmed">
                {[
                  it.categoryName,
                  it.lastPlatform ? platformLabel(it.lastPlatform) : null,
                  it.lastPurchasedAt ? `直近 ${formatMd(it.lastPurchasedAt)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "購入履歴なし"}
              </Text>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
