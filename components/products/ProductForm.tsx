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
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  createProduct,
  deleteProduct,
  setCycle,
  setNotifyEnabled,
  setSnooze,
  updateProduct,
  type ProductDetail,
  type ProductInput,
} from "@/app/actions/products";
import type { CategoryView } from "@/app/actions/categories";
import type { ProductType } from "@/lib/domain/product-state";
import { addDays } from "@/lib/common/date";
import { buildPurchaseLink } from "@/lib/domain/deeplink";
import { PurchaseModal } from "@/components/purchases/PurchaseModal";

type Props = {
  categories: CategoryView[];
  product?: ProductDetail; // 指定で編集モード
};

function toDateStr(daysFromNow: number): string {
  return addDays(new Date(), daysFromNow).toISOString().slice(0, 10);
}

export function ProductForm({ categories, product }: Props) {
  const router = useRouter();
  const isEdit = !!product;

  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(product?.categoryId ?? null);
  const [type, setType] = useState<ProductType>(product?.type ?? "recurring");
  const [purchaseUrl, setPurchaseUrl] = useState(product?.purchaseUrl ?? "");
  const [baseUnit, setBaseUnit] = useState(product?.baseUnit ?? "");
  const [unitsPerPack, setUnitsPerPack] = useState<number | "">(product?.defaultUnitsPerPack ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  function buildInput(): ProductInput {
    return {
      name,
      categoryId,
      type,
      purchaseUrl: purchaseUrl || null,
      baseUnit: baseUnit || null,
      defaultUnitsPerPack: unitsPerPack === "" ? null : Number(unitsPerPack),
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      if (isEdit) {
        const res = await updateProduct(product!.id, buildInput());
        if (res.ok) router.refresh();
        else setError(res.message);
      } else {
        const res = await createProduct(buildInput());
        if (res.ok) {
          router.push("/products");
          router.refresh();
        } else {
          setError(res.message);
        }
      }
    });
  }

  return (
    <Stack gap="lg">
      <Title order={1} size="h2">
        {isEdit ? "商品を編集" : "商品を登録"}
      </Title>

      {error && (
        <Alert color="alert" variant="light">
          {error}
        </Alert>
      )}

      <Card shadow="sm" radius="lg" p="lg">
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="商品名"
              required
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="例: トイレットペーパー"
            />
            {!isEdit && (
              <Text size="xs" c="dimmed">
                ✓ 名前だけ入力して、あとから編集でもOK
              </Text>
            )}

            <Select
              label="カテゴリ"
              data={categoryOptions}
              value={categoryId}
              onChange={setCategoryId}
              clearable
              placeholder="未分類"
            />

            <div>
              <Text size="sm" fw={500} mb={4}>
                種別
              </Text>
              <SegmentedControl
                value={type}
                onChange={(v) => setType(v as ProductType)}
                data={[
                  { value: "recurring", label: "定期" },
                  { value: "spot", label: "単発" },
                ]}
              />
              <Text size="xs" c="dimmed" mt={4}>
                定期にすると、2回目の購入から自動でサイクルを学習します。
              </Text>
            </div>

            <Group grow>
              <TextInput
                label="購入単位"
                value={baseUnit}
                onChange={(e) => setBaseUnit(e.currentTarget.value)}
                placeholder="個 / 本 / ロール"
              />
              <NumberInput
                label="標準入数"
                value={unitsPerPack}
                onChange={(v) => setUnitsPerPack(typeof v === "number" ? v : "")}
                min={0}
                allowDecimal={false}
              />
            </Group>

            <TextInput
              label="購入先URL"
              value={purchaseUrl}
              onChange={(e) => setPurchaseUrl(e.currentTarget.value)}
              placeholder="https://..."
            />
            {isEdit &&
              (() => {
                const link = buildPurchaseLink(product!.purchaseUrl);
                return link ? (
                  <Anchor href={link.href} target="_blank" rel="noopener noreferrer" size="sm">
                    {link.label}
                  </Anchor>
                ) : null;
              })()}

            <Group justify="flex-end">
              <Button component={Link} href="/products" variant="subtle" color="gray">
                {isEdit ? "戻る" : "キャンセル"}
              </Button>
              <Button type="submit" loading={pending} disabled={!name.trim()}>
                {isEdit ? "保存" : "登録する"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      {isEdit && <EditExtras product={product!} />}
    </Stack>
  );
}

// 編集モード専用: 購入 / サイクル / スヌーズ / 通知ON-OFF / 削除（各々が個別に保存）。
function EditExtras({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [buying, setBuying] = useState(false);

  const [cycleMode, setCycleMode] = useState<"auto" | "manual">(product.cycleMode);
  const [manualDays, setManualDays] = useState<number | "">(product.perUnitCycleDays ?? "");
  const [notify, setNotify] = useState(product.isNotifyEnabled);

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

  return (
    <Stack gap="md">
      {msg && (
        <Alert color={msg.ok ? "success" : "alert"} variant="light">
          {msg.text}
        </Alert>
      )}

      <Card shadow="xs" radius="md" p="md">
        <Group justify="space-between">
          <div>
            <Text fw={500}>購入</Text>
            <Text size="xs" c="dimmed">
              「買った」で履歴に記録し、サイクルを更新します。
            </Text>
          </div>
          <Group gap="xs">
            <Button
              component={Link}
              href={`/products/${product.id}/history`}
              size="xs"
              variant="subtle"
              color="gray"
            >
              履歴
            </Button>
            <Button size="xs" onClick={() => setBuying(true)}>
              買った
            </Button>
          </Group>
        </Group>
      </Card>
      {buying && (
        <PurchaseModal
          opened={buying}
          onClose={() => setBuying(false)}
          product={{
            id: product.id,
            name: product.name,
            defaultUnitsPerPack: product.defaultUnitsPerPack,
            purchaseUrl: product.purchaseUrl,
          }}
        />
      )}

      <Card shadow="xs" radius="md" p="md">
        <Stack gap="sm">
          <Text fw={500}>次回購入サイクル</Text>
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
          <Group justify="flex-end">
            <Button
              size="xs"
              loading={pending}
              onClick={() =>
                run(
                  () =>
                    setCycle(
                      product.id,
                      cycleMode,
                      cycleMode === "manual" ? Number(manualDays) : null,
                    ),
                  "サイクル設定を保存しました",
                )
              }
            >
              保存
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card shadow="xs" radius="md" p="md">
        <Stack gap="sm">
          <Text fw={500}>スヌーズ（しばらく通知を止める）</Text>
          {product.notifySnoozedUntil && (
            <Text size="sm" c="dimmed">
              現在: {product.notifySnoozedUntil} まで停止中
            </Text>
          )}
          <Group>
            <Button
              size="xs"
              variant="light"
              loading={pending}
              onClick={() =>
                run(() => setSnooze(product.id, toDateStr(7)), "1週間スヌーズしました")
              }
            >
              1週間
            </Button>
            <Button
              size="xs"
              variant="light"
              loading={pending}
              onClick={() =>
                run(() => setSnooze(product.id, toDateStr(30)), "1ヶ月スヌーズしました")
              }
            >
              1ヶ月
            </Button>
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              loading={pending}
              onClick={() => run(() => setSnooze(product.id, null), "スヌーズを解除しました")}
            >
              解除
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card shadow="xs" radius="md" p="md">
        <Group justify="space-between">
          <div>
            <Text fw={500}>この商品のリマインドを受け取る</Text>
            <Text size="xs" c="dimmed">
              恒久ミュート（種別を変えても保たれます）
            </Text>
          </div>
          <Switch
            checked={notify}
            onChange={(e) => {
              const next = e.currentTarget.checked;
              setNotify(next);
              run(() => setNotifyEnabled(product.id, next), "通知設定を保存しました");
            }}
          />
        </Group>
      </Card>

      <Card shadow="xs" radius="md" p="md">
        <Group justify="space-between">
          <Text c="dimmed" size="sm">
            この商品を削除します（履歴は論理削除）。
          </Text>
          <Button
            variant="light"
            color="alert"
            loading={pending}
            onClick={() => {
              if (confirm(`「${product.name}」を削除しますか？`)) {
                startTransition(async () => {
                  const res = await deleteProduct(product.id);
                  if (res.ok) {
                    router.push("/products");
                    router.refresh();
                  } else {
                    setMsg({ ok: false, text: res.message });
                  }
                });
              }
            }}
          >
            削除
          </Button>
        </Group>
      </Card>
    </Stack>
  );
}
