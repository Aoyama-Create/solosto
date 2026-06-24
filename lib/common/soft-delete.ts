// COM-100 論理削除の共通ヘルパ。削除は deleted_at に統一（purchase_logs を除く）。

// 論理削除時に UPDATE する値。
export function softDeleteValues(now: Date = new Date()): { deleted_at: string } {
  return { deleted_at: now.toISOString() };
}

// 行が論理削除済みか。
export function isDeleted(row: { deleted_at: string | null }): boolean {
  return row.deleted_at !== null;
}

// Supabase クエリで未削除のみに絞る共通フィルタ。
//   query = notDeleted(supabase.from("products").select("*"))
export function notDeleted<T extends { is: (col: string, val: null) => T }>(query: T): T {
  return query.is("deleted_at", null);
}
