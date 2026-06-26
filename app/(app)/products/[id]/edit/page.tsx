import { Container, Text } from "@mantine/core";
import { listCategories } from "@/app/actions/categories";
import { getProduct } from "@/app/actions/products";
import { ProductForm } from "@/components/products/ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, cats] = await Promise.all([getProduct(id), listCategories()]);

  return (
    <Container size="sm" py="lg">
      {product.ok && cats.ok ? (
        <ProductForm categories={cats.data} product={product.data} />
      ) : (
        <Text c="alert">商品の読み込みに失敗しました。</Text>
      )}
    </Container>
  );
}
