import { describe, expect, it } from "vitest";
import {
  buildReminderNotification,
  selectFiringNames,
  userFiresNow,
  type FiringCategory,
  type FiringProduct,
} from "@/lib/domain/notify";

const product = (over: Partial<FiringProduct>): FiringProduct => ({
  name: "商品",
  type: "recurring",
  isNotifyEnabled: true,
  notifySnoozedUntil: null,
  nextOrderDate: "2026-06-20",
  categoryId: null,
  ...over,
});

describe("通知タイミング (BAT-001)", () => {
  it("UTC を tz 変換して notify_time の時と一致で発火", () => {
    // 2026-06-21T23:00:00Z は Asia/Tokyo で 08:00。
    const now = new Date("2026-06-21T23:00:00Z");
    expect(userFiresNow("08:00:00", "Asia/Tokyo", now)).toBe(true);
    expect(userFiresNow("09:00:00", "Asia/Tokyo", now)).toBe(false);
    expect(userFiresNow(null, "Asia/Tokyo", now)).toBe(false);
  });
});

describe("通知対象抽出 COM-050", () => {
  const today = "2026-06-26";

  it("recurring・enabled・スヌーズ外・期日到来のみ拾う", () => {
    const products = [
      product({ name: "醤油", nextOrderDate: "2026-06-25" }), // 到来 → 拾う
      product({ name: "未来", nextOrderDate: "2026-06-30" }), // 未来 → 除外
      product({ name: "単発", type: "spot", nextOrderDate: "2026-06-01" }), // spot → 除外
      product({ name: "ミュート", isNotifyEnabled: false, nextOrderDate: "2026-06-01" }), // 除外
      product({
        name: "スヌーズ中",
        notifySnoozedUntil: "2026-06-30",
        nextOrderDate: "2026-06-01",
      }), // 除外
      product({
        name: "スヌーズ明け",
        notifySnoozedUntil: "2026-06-25",
        nextOrderDate: "2026-06-01",
      }), // today>snooze → 拾う
    ];
    expect(selectFiringNames({ products, categories: [], today })).toEqual([
      "醤油",
      "スヌーズ明け",
    ]);
  });

  it("category-scope はカテゴリ名で拾い、配下商品は除外", () => {
    const categories: FiringCategory[] = [
      {
        id: "wine",
        name: "赤ワイン",
        trackingScope: "category",
        isNotifyEnabled: true,
        notifySnoozedUntil: null,
        nextOrderDate: "2026-06-20",
      },
    ];
    const products = [
      product({ name: "赤ワイン（MAPU）", categoryId: "wine", nextOrderDate: "2026-06-01" }),
    ];
    expect(selectFiringNames({ products, categories, today })).toEqual(["赤ワイン"]);
  });

  it("category-scope がミュートなら拾わない", () => {
    const categories: FiringCategory[] = [
      {
        id: "wine",
        name: "赤ワイン",
        trackingScope: "category",
        isNotifyEnabled: false,
        notifySnoozedUntil: null,
        nextOrderDate: "2026-06-20",
      },
    ];
    expect(selectFiringNames({ products: [], categories, today })).toEqual([]);
  });
});

describe("通知生成 COM-041", () => {
  it("件数タイトル・3件以内はそのまま連結", () => {
    expect(buildReminderNotification(["醤油", "洗剤"])).toEqual({
      title: "買うべきもの 2件",
      body: "醤油・洗剤",
    });
  });

  it("4件以上は先頭3件＋ほかN件", () => {
    const r = buildReminderNotification(["A", "B", "C", "D", "E"]);
    expect(r.title).toBe("買うべきもの 5件");
    expect(r.body).toBe("A・B・C ほか2件");
  });
});
