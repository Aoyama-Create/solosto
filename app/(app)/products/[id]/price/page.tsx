import { Container, Text } from "@mantine/core";
import { getPriceComparison } from "@/app/actions/price";
import { PriceComparison } from "@/components/prices/PriceComparison";

export default async function PricePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getPriceComparison(id);

  return (
    <Container size="sm" py="lg">
      {res.ok ? (
        <PriceComparison productId={id} data={res.data} />
      ) : (
        <Text c="alert">価格の読み込みに失敗しました（{res.message}）。</Text>
      )}
    </Container>
  );
}
