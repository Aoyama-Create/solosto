import { Container, Text } from "@mantine/core";
import { listProducts } from "@/app/actions/products";
import { listCategories } from "@/app/actions/categories";
import { ProductList } from "@/components/products/ProductList";

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([listProducts(), listCategories()]);

  return (
    <Container size="sm" py="lg">
      {products.ok && categories.ok ? (
        <ProductList products={products.data} categories={categories.data} />
      ) : (
        <Text c="alert">商品の読み込みに失敗しました。</Text>
      )}
    </Container>
  );
}
