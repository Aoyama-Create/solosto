import { Container, Text } from "@mantine/core";
import { getProduct } from "@/app/actions/products";
import { listPurchases } from "@/app/actions/purchases";
import { PurchaseHistory } from "@/components/purchases/PurchaseHistory";

export default async function PurchaseHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, logs] = await Promise.all([getProduct(id), listPurchases(id)]);

  return (
    <Container size="lg" py="lg">
      {product.ok && logs.ok ? (
        <PurchaseHistory productId={id} productName={product.data.name} logs={logs.data} />
      ) : (
        <Text c="alert">購入履歴の読み込みに失敗しました。</Text>
      )}
    </Container>
  );
}
