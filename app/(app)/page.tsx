import { Container, Text } from "@mantine/core";
import { getBuyList } from "@/app/actions/buy-list";
import { BuyList } from "@/components/home/BuyList";

export default async function HomePage() {
  const res = await getBuyList();
  const todayLabel = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date());

  return (
    <Container size="lg" py="lg">
      {res.ok ? (
        <BuyList todayLabel={todayLabel} data={res.data} />
      ) : (
        <Text c="alert">買うものリストの読み込みに失敗しました（{res.message}）。</Text>
      )}
    </Container>
  );
}
