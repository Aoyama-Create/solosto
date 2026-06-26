// COM-020 単価設計。ロット差を吸収するため総個数ベースで単価を出す。
import { assertPositive, safeDivide } from "@/lib/common/number";

// total_units = pack_quantity × units_per_pack
export function totalUnits(packQuantity: number, unitsPerPack: number): number {
  assertPositive(packQuantity, "パック数");
  assertPositive(unitsPerPack, "入数");
  return packQuantity * unitsPerPack;
}

// unit_price = price ÷ total_units（pack_quantity では割らない）。
export function unitPrice(price: number, total: number): number {
  return safeDivide(price, total, "単価");
}
