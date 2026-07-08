import { ListSkeleton } from "@/components/skeletons";

// (app) 配下ページの既定ローディング（ホーム/商品/通知/履歴/検索など）。フォーム/価格は各セグメントで個別化。
export default function Loading() {
  return <ListSkeleton />;
}
