import { Container, Text } from "@mantine/core";
import { getCategoryTracking } from "@/app/actions/category-tracking";
import { CategoryTrackingForm } from "@/components/categories/CategoryTrackingForm";

export default async function CategoryTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getCategoryTracking(id);

  return (
    <Container size="sm" py="lg">
      {res.ok ? (
        <CategoryTrackingForm category={res.data} />
      ) : (
        <Text c="alert">カテゴリの読み込みに失敗しました（{res.message}）。</Text>
      )}
    </Container>
  );
}
