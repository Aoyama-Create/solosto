// COM-022 / COM-023 価格指標。purchase_logs から都度集計（専用カラムは持たない）。
// 自分の過去買値の中での相対評価。判定ラベル（買い時！等）は出さない。
// 底値は全体の MIN(unit_price)（プラットフォーム別比較はしない）。

export type PriceLog = { unitPrice: number; purchasedAt: string };

export type PriceStats = {
  count: number;
  lowest: { unitPrice: number; purchasedAt: string };
  average: number;
  latest: { unitPrice: number; purchasedAt: string };
  latestVsLowestPct: number; // (latest - lowest) / lowest × 100、四捨五入。底値=0%
  series: { date: string; unitPrice: number }[]; // 日付昇順（チャート用）
};

// ログが空なら null。
export function computePriceStats(logs: PriceLog[]): PriceStats | null {
  if (logs.length === 0) return null;

  const byDateAsc = [...logs].sort(
    (a, b) => new Date(a.purchasedAt).getTime() - new Date(b.purchasedAt).getTime(),
  );

  let lowest = byDateAsc[0];
  let sum = 0;
  for (const l of byDateAsc) {
    if (l.unitPrice < lowest.unitPrice) lowest = l;
    sum += l.unitPrice;
  }
  const latest = byDateAsc[byDateAsc.length - 1];
  const average = sum / byDateAsc.length;
  const latestVsLowestPct =
    lowest.unitPrice > 0
      ? Math.round(((latest.unitPrice - lowest.unitPrice) / lowest.unitPrice) * 100)
      : 0;

  return {
    count: byDateAsc.length,
    lowest: { unitPrice: lowest.unitPrice, purchasedAt: lowest.purchasedAt },
    average,
    latest: { unitPrice: latest.unitPrice, purchasedAt: latest.purchasedAt },
    latestVsLowestPct,
    series: byDateAsc.map((l) => ({ date: l.purchasedAt.slice(0, 10), unitPrice: l.unitPrice })),
  };
}
