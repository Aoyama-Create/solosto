"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Group, Modal, NumberInput, Stack, Text, TextInput } from "@mantine/core";
import { registerPurchase } from "@/app/actions/purchases";
import { BrandPicker } from "@/components/prices/BrandPicker";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

type Props = {
  opened: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    defaultUnitsPerPack: number | null;
    purchaseUrl: string | null;
    categoryId: string | null;
    categoryScope: "product" | "category";
  };
};

export function PurchaseModal({ opened, onClose, product }: Props) {
  const router = useRouter();
  const [price, setPrice] = useState<number | "">("");
  const [packQuantity, setPackQuantity] = useState<number | "">(1);
  const [unitsPerPack, setUnitsPerPack] = useState<number | "">(product.defaultUnitsPerPack ?? 1);
  const [purchasedAt, setPurchasedAt] = useState(today());
  const [brand, setBrand] = useState("");
  const [purchaseUrl, setPurchaseUrl] = useState(product.purchaseUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = useMemo(() => {
    const pq = Number(packQuantity);
    const up = Number(unitsPerPack);
    return pq > 0 && up > 0 ? pq * up : 0;
  }, [packQuantity, unitsPerPack]);

  const unit = useMemo(() => {
    const p = Number(price);
    return total > 0 && p >= 0 ? p / total : null;
  }, [price, total]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await registerPurchase({
        productId: product.id,
        price: Number(price),
        packQuantity: Number(packQuantity),
        unitsPerPack: Number(unitsPerPack),
        purchasedAt,
        brand: brand || null,
        purchaseUrl: purchaseUrl || null,
      });
      if (res.ok) {
        onClose();
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  }

  return (
    <Modal opened={opened} onClose={onClose} title={`「${product.name}」の購入を記録`} radius="lg">
      <Stack gap="md">
        {error && (
          <Alert color="alert" variant="light">
            {error}
          </Alert>
        )}

        {product.categoryScope === "category" && product.categoryId && (
          <BrandPicker
            categoryId={product.categoryId}
            onPick={(b, url) => {
              setBrand(b);
              if (url) setPurchaseUrl(url);
            }}
          />
        )}

        <NumberInput
          label="購入金額"
          required
          value={price}
          onChange={(v) => setPrice(typeof v === "number" ? v : "")}
          min={0}
          prefix="¥"
          thousandSeparator=","
        />
        <TextInput
          label="購入日"
          type="date"
          value={purchasedAt}
          onChange={(e) => setPurchasedAt(e.currentTarget.value)}
        />
        <Group grow>
          <NumberInput
            label="パック数"
            value={packQuantity}
            onChange={(v) => setPackQuantity(typeof v === "number" ? v : "")}
            min={1}
            allowDecimal={false}
          />
          <NumberInput
            label="入数（個/パック）"
            value={unitsPerPack}
            onChange={(v) => setUnitsPerPack(typeof v === "number" ? v : "")}
            min={1}
            allowDecimal={false}
          />
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            総個数 <b>{total || "—"}</b>
          </Text>
          <Text size="sm" c="dimmed">
            単価 <b>{unit != null ? `¥${unit.toFixed(1)}/個` : "—"}</b>（自動計算）
          </Text>
        </Group>

        <TextInput
          label="銘柄（任意）"
          placeholder="未入力なら商品名で記録"
          value={brand}
          onChange={(e) => setBrand(e.currentTarget.value)}
        />
        <TextInput
          label="購入先URL（任意）"
          value={purchaseUrl}
          onChange={(e) => setPurchaseUrl(e.currentTarget.value)}
          placeholder="https://..."
        />

        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={submit} loading={pending} disabled={price === "" || total <= 0}>
            記録して完了
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
