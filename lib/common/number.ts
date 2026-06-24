// COM-104 数値バリデーション。0除算・負値を防ぐ共通ガード。
import { AppError } from "@/lib/common/errors";

export function isPositive(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

export function isNonNegative(n: number): boolean {
  return Number.isFinite(n) && n >= 0;
}

export function assertPositive(n: number, label: string): number {
  if (!isPositive(n)) {
    throw new AppError("VALIDATION", `${label}は正の数である必要があります（受領: ${n}）`);
  }
  return n;
}

export function assertNonNegative(n: number, label: string): number {
  if (!isNonNegative(n)) {
    throw new AppError("VALIDATION", `${label}は0以上である必要があります（受領: ${n}）`);
  }
  return n;
}

// 0除算を防ぐ安全な除算（分母が正でなければ VALIDATION エラー）。
export function safeDivide(numerator: number, denominator: number, label = "除算"): number {
  assertNonNegative(numerator, `${label}の分子`);
  assertPositive(denominator, `${label}の分母`);
  return numerator / denominator;
}
