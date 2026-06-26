import { Container, Text } from "@mantine/core";
import { listCategories } from "@/app/actions/categories";
import { SearchView } from "@/components/search/SearchView";

// SCR-031 商品検索。カテゴリチップ用に一覧を server で取得して渡す。
export default async function SearchPage() {
  const categories = await listCategories();

  return (
    <Container size="sm" py="lg">
      {categories.ok ? (
        <SearchView categories={categories.data} />
      ) : (
        <Text c="alert">検索画面の読み込みに失敗しました。</Text>
      )}
    </Container>
  );
}
