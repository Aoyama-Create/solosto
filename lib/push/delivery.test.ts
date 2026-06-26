import { describe, expect, it } from "vitest";
import { buildNotificationPayload, isExpiredStatus } from "@/lib/push/delivery";

describe("失効判定 (COM-042)", () => {
  it("404 / 410 は失効", () => {
    expect(isExpiredStatus(404)).toBe(true);
    expect(isExpiredStatus(410)).toBe(true);
  });

  it("一時障害(401/429/500)や undefined は失効ではない", () => {
    expect(isExpiredStatus(401)).toBe(false);
    expect(isExpiredStatus(429)).toBe(false);
    expect(isExpiredStatus(500)).toBe(false);
    expect(isExpiredStatus(undefined)).toBe(false);
  });
});

describe("通知ペイロード整形 (COM-043)", () => {
  it("badgeCount は数値のときだけ載る、url 既定は /", () => {
    const p = buildNotificationPayload({ title: "在庫", body: "切れそう", badgeCount: 3 });
    expect(p).toEqual({ title: "在庫", body: "切れそう", url: "/", badgeCount: 3 });
  });

  it("badgeCount 未指定なら付かない、body 未指定は空", () => {
    const p = buildNotificationPayload({ title: "x", url: "/products" });
    expect(p).toEqual({ title: "x", body: "", url: "/products" });
    expect("badgeCount" in p).toBe(false);
  });

  it("badgeCount=0 も載る（バッジ0で送る用途）", () => {
    const p = buildNotificationPayload({ title: "x", badgeCount: 0 });
    expect(p.badgeCount).toBe(0);
  });
});
