import { describe, expect, it } from "vitest";
import {
  hourToNotifyTime,
  isValidEmail,
  isValidNotifyTime,
  isValidPassword,
  isValidTimeZone,
  notifyTimeToHour,
} from "@/lib/common/validation";

describe("validation (認証・プロファイル)", () => {
  it("isValidEmail", () => {
    expect(isValidEmail("you@example.com")).toBe(true);
    expect(isValidEmail(" a@b.co ")).toBe(true); // trim される
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
  });

  it("isValidPassword は6文字以上", () => {
    expect(isValidPassword("123456")).toBe(true);
    expect(isValidPassword("12345")).toBe(false);
  });

  it("notify_time 変換は往復で一致", () => {
    expect(hourToNotifyTime(8)).toBe("08:00:00");
    expect(hourToNotifyTime(0)).toBe("00:00:00");
    expect(hourToNotifyTime(23)).toBe("23:00:00");
    expect(notifyTimeToHour("08:00:00")).toBe(8);
    expect(notifyTimeToHour(null)).toBe(8); // 既定
    expect(() => hourToNotifyTime(24)).toThrowError();
  });

  it("isValidNotifyTime", () => {
    expect(isValidNotifyTime("08:00:00")).toBe(true);
    expect(isValidNotifyTime("23:00:00")).toBe(true);
    expect(isValidNotifyTime("08:30:00")).toBe(false);
    expect(isValidNotifyTime("24:00:00")).toBe(false);
  });

  it("isValidTimeZone", () => {
    expect(isValidTimeZone("Asia/Tokyo")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});
