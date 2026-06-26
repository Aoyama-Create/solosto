// COM-030 検索クエリビルダー（純粋）。SCR-031 のフィルタ入力を正規化し、API-031 が安全に使える形に整える。
// 正規化のみを担い、DB アクセスはしない（真実の源は purchase_logs / products・集計は API 側）。

import type { Platform } from "@/lib/domain/platform";

const PLATFORM_VALUES: Platform[] = ["amazon", "rakuten", "temu", "shein", "other"];

export type SearchFilters = {
  keyword?: string;
  categoryIds: string[];
  platforms: Platform[];
  from?: string; // 'YYYY-MM-DD' 以降（直近購入日の下限）
  to?: string; // 'YYYY-MM-DD' 以前（直近購入日の上限）
};

export type RawSearchFilters = {
  keyword?: string | null;
  categoryIds?: (string | null | undefined)[] | null;
  platforms?: (string | null | undefined)[] | null;
  from?: string | null;
  to?: string | null;
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function isValidYmd(s: string): boolean {
  if (!YMD.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function dedupe<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

// 入力を正規化: keyword trim（空は undefined）/ 配列 dedupe・空除去 / 日付は妥当な YMD のみ採用し
// from>to の逆転は入れ替えて吸収（「ありえない状態を作らない」方針＝静かに直す）。
export function normalizeSearchFilters(raw: RawSearchFilters | null | undefined): SearchFilters {
  const r = raw ?? {};

  const keywordTrimmed = (r.keyword ?? "").trim();
  const keyword = keywordTrimmed.length > 0 ? keywordTrimmed : undefined;

  const categoryIds = dedupe(
    (r.categoryIds ?? []).filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  const platforms = dedupe(
    (r.platforms ?? []).filter(
      (p): p is Platform => typeof p === "string" && (PLATFORM_VALUES as string[]).includes(p),
    ),
  );

  let from = r.from && isValidYmd(r.from) ? r.from : undefined;
  let to = r.to && isValidYmd(r.to) ? r.to : undefined;
  if (from && to && from > to) [from, to] = [to, from]; // 逆転は入れ替え

  return { keyword, categoryIds, platforms, from, to };
}

// 何らかの絞り込みがあるか。purchase_logs を先引きする必要があるか（platform/期間）は needsPurchaseLogFilter で別判定。
export function hasAnyFilter(f: SearchFilters): boolean {
  return !!f.keyword || f.categoryIds.length > 0 || f.platforms.length > 0 || !!f.from || !!f.to;
}

// platform / 期間は purchase_logs 側の属性 → これらが有効なら先に該当 product_id を引いて products を絞る。
export function needsPurchaseLogFilter(f: SearchFilters): boolean {
  return f.platforms.length > 0 || !!f.from || !!f.to;
}
