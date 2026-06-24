import { describe, expect, it } from "vitest";
import { addDays, diffInDays, formatDateInTimeZone, getHourInTimeZone } from "@/lib/common/date";

describe("date/TZ ユーティリティ (COM-101)", () => {
  it("diffInDays は暦日差を返す", () => {
    expect(diffInDays(new Date("2026-06-01T00:00:00Z"), new Date("2026-06-01T23:00:00Z"))).toBe(0);
    expect(diffInDays(new Date("2026-06-01T00:00:00Z"), new Date("2026-06-15T00:00:00Z"))).toBe(14);
    expect(diffInDays(new Date("2026-06-15T00:00:00Z"), new Date("2026-06-01T00:00:00Z"))).toBe(
      -14,
    );
  });

  it("addDays は元を変更せず n 日後を返す", () => {
    const base = new Date("2026-06-01T00:00:00Z");
    expect(addDays(base, 45).toISOString().slice(0, 10)).toBe("2026-07-16");
    expect(base.toISOString().slice(0, 10)).toBe("2026-06-01"); // 不変
  });

  it("getHourInTimeZone は UTC を Asia/Tokyo の時に変換する", () => {
    // 23:00 UTC = 翌 08:00 JST
    expect(getHourInTimeZone(new Date("2026-06-21T23:00:00Z"), "Asia/Tokyo")).toBe(8);
    expect(getHourInTimeZone(new Date("2026-06-21T15:00:00Z"), "Asia/Tokyo")).toBe(0);
  });

  it("formatDateInTimeZone は tz の暦日を返す", () => {
    // 23:00 UTC は JST では翌日
    expect(formatDateInTimeZone(new Date("2026-06-21T23:00:00Z"), "Asia/Tokyo")).toBe("2026-06-22");
  });
});
