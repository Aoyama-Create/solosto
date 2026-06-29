"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Anchor,
  Button,
  Card,
  Group,
  NumberInput,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import {
  setCategoryNotifyEnabled,
  setCategorySnooze,
  updateCategoryTracking,
  type CategoryTracking,
} from "@/app/actions/category-tracking";
import type { TrackingScope } from "@/lib/domain/tracking-scope";
import { addDays } from "@/lib/common/date";
import { IconChevronLeft } from "@tabler/icons-react";

function toDateStr(days: number): string {
  return addDays(new Date(), days).toISOString().slice(0, 10);
}

export function CategoryTrackingForm({ category }: { category: CategoryTracking }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [scope, setScope] = useState<TrackingScope>(category.trackingScope);
  const [notify, setNotify] = useState(category.isNotifyEnabled);
  const [cycleMode, setCycleMode] = useState<"auto" | "manual">(category.cycleMode ?? "auto");
  const [manualDays, setManualDays] = useState<number | "">("");

  function run(action: () => Promise<{ ok: boolean; message?: string }>, okText: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        setMsg({ ok: true, text: okText });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.message ?? "失敗しました" });
      }
    });
  }

  // 追跡方法の切替（pending リセットを伴う）。
  function changeScope(next: TrackingScope) {
    if (next === scope) return;
    const ok = confirm(
      "追跡方法を変えると、このカテゴリの未購入分（買い物リスト）はリセットされます。よろしいですか？",
    );
    if (!ok) return;
    setScope(next);
    startTransition(async () => {
      const res = await updateCategoryTracking(category.id, { trackingScope: next });
      if (res.ok) {
        setMsg({
          ok: true,
          text: res.data.pendingReset
            ? "追跡方法を変更しました。買い物リストの未購入分はリセットされました。"
            : "追跡方法を変更しました。",
        });
        router.refresh();
      } else {
        setScope(scope); // 失敗時は戻す
        setMsg({ ok: false, text: res.message });
      }
    });
  }

  const isCategoryScope = scope === "category";

  return (
    <Stack gap="lg">
      <div>
        <Anchor
          component={Link}
          href="/categories"
          size="sm"
          style={{ display: "inline-flex", alignItems: "center", gap: 2 }}
        >
          <IconChevronLeft size={16} /> カテゴリ管理へ
        </Anchor>
        <Title order={1} size="h2" mt="xs">
          {category.name} の追跡設定
        </Title>
      </div>

      {msg && (
        <Alert color={msg.ok ? "success" : "alert"} variant="light">
          {msg.text}
        </Alert>
      )}

      <Card shadow="sm" radius="lg" p="lg">
        <Stack gap="sm">
          <Text fw={500}>カテゴリの追跡方法</Text>
          <SegmentedControl
            value={scope}
            onChange={(v) => changeScope(v as TrackingScope)}
            disabled={pending}
            data={[
              { value: "product", label: "商品単位" },
              { value: "category", label: "カテゴリ単位（銘柄横断）" },
            ]}
          />
          <Text size="xs" c="dimmed">
            銘柄が毎回変わるもの（ワインなど）は「カテゴリ単位」にすると、銘柄をまたいで1つの買い時を通知します。
            切り替えると未購入分（買い物リスト）はリセットされます。
          </Text>
        </Stack>
      </Card>

      {isCategoryScope ? (
        <Stack gap="md">
          <Card shadow="xs" radius="md" p="md">
            <Group justify="space-between">
              <div>
                <Text fw={500}>このカテゴリの通知</Text>
                <Text size="xs" c="dimmed">
                  恒久ミュート（商品側とは独立）
                </Text>
              </div>
              <Switch
                checked={notify}
                disabled={pending}
                onChange={(e) => {
                  const next = e.currentTarget.checked;
                  setNotify(next);
                  run(() => setCategoryNotifyEnabled(category.id, next), "通知設定を保存しました");
                }}
              />
            </Group>
          </Card>

          <Card shadow="xs" radius="md" p="md">
            <Stack gap="sm">
              <Text fw={500}>スヌーズ</Text>
              {category.notifySnoozedUntil && (
                <Text size="sm" c="dimmed">
                  現在: {category.notifySnoozedUntil} まで停止中
                </Text>
              )}
              <Group>
                <Button
                  size="xs"
                  variant="light"
                  loading={pending}
                  onClick={() =>
                    run(() => setCategorySnooze(category.id, toDateStr(7)), "1週間スヌーズしました")
                  }
                >
                  1週間
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  loading={pending}
                  onClick={() =>
                    run(
                      () => setCategorySnooze(category.id, toDateStr(30)),
                      "1ヶ月スヌーズしました",
                    )
                  }
                >
                  1ヶ月
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  loading={pending}
                  onClick={() =>
                    run(() => setCategorySnooze(category.id, null), "スヌーズを解除しました")
                  }
                >
                  解除
                </Button>
              </Group>
            </Stack>
          </Card>

          <Card shadow="xs" radius="md" p="md">
            <Stack gap="sm">
              <Text fw={500}>サイクル</Text>
              <SegmentedControl
                value={cycleMode}
                onChange={(v) => setCycleMode(v as "auto" | "manual")}
                data={[
                  { value: "auto", label: "自動" },
                  { value: "manual", label: "手動で指定" },
                ]}
              />
              {cycleMode === "manual" && (
                <NumberInput
                  label="サイクル日数"
                  value={manualDays}
                  onChange={(v) => setManualDays(typeof v === "number" ? v : "")}
                  min={1}
                  suffix=" 日"
                />
              )}
              <Text size="xs" c="dimmed">
                自動は購入履歴（銘柄横断）から算出します。算出値の表示は今後のフェーズで対応。
              </Text>
              <Group justify="flex-end">
                <Button
                  size="xs"
                  loading={pending}
                  onClick={() =>
                    run(
                      () =>
                        updateCategoryTracking(category.id, {
                          cycleMode,
                          manualDays: cycleMode === "manual" ? Number(manualDays) : null,
                        }),
                      "サイクル設定を保存しました",
                    )
                  }
                >
                  保存
                </Button>
              </Group>
            </Stack>
          </Card>
        </Stack>
      ) : (
        <Text c="dimmed" size="sm">
          商品単位では、通知・スヌーズ・サイクルは各商品の編集画面で設定します。
        </Text>
      )}
    </Stack>
  );
}
