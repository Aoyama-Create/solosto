import { Container, Text } from "@mantine/core";
import { listCategories } from "@/app/actions/categories";
import { ProductForm } from "@/components/products/ProductForm";

export default async function NewProductPage() {
  const cats = await listCategories();
  return (
    <Container size="sm" py="lg">
      {cats.ok ? (
        <ProductForm categories={cats.data} />
      ) : (
        <Text c="alert">カテゴリの読み込みに失敗しました。</Text>
      )}
    </Container>
  );
}
