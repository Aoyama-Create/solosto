import { Container, Text } from "@mantine/core";
import { listCategories } from "@/app/actions/categories";
import { CategoryManager } from "@/components/categories/CategoryManager";

export default async function CategoriesPage() {
  const res = await listCategories();
  return (
    <Container size="sm" py="lg">
      {res.ok ? (
        <CategoryManager categories={res.data} />
      ) : (
        <Text c="alert">カテゴリの読み込みに失敗しました（{res.message}）。</Text>
      )}
    </Container>
  );
}
