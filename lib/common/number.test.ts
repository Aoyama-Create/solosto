import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/common/errors";
import { assertPositive, isPositive, safeDivide } from "@/lib/common/number";

describe("number ガード (COM-104)", () => {
  it("isPositive", () => {
    expect(isPositive(1)).toBe(true);
    expect(isPositive(0)).toBe(false);
    expect(isPositive(-1)).toBe(false);
    expect(isPositive(NaN)).toBe(false);
  });

  it("safeDivide は単価を計算できる（price ÷ total_units）", () => {
    expect(safeDivide(398, 12)).toBeCloseTo(33.1667, 3);
  });

  it("safeDivide は 0除算を VALIDATION で弾く", () => {
    expect(() => safeDivide(100, 0)).toThrowError(AppError);
  });

  it("assertPositive は負値を弾く", () => {
    expect(() => assertPositive(-5, "数量")).toThrowError(AppError);
    expect(assertPositive(3, "数量")).toBe(3);
  });
});
