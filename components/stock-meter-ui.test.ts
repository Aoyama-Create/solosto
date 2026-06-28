import { describe, expect, it } from "vitest";
import { remainingColor, remainingLabel } from "@/components/stock-meter-ui";

describe("在庫メーター表示ヘルパ", () => {
  it("remainingLabel: null=追加済み / 負=超過 / 0=今日 / 正=あとN日", () => {
    expect(remainingLabel(null)).toBe("リストに追加済み");
    expect(remainingLabel(-3)).toBe("予定を3日超過");
    expect(remainingLabel(0)).toBe("今日まで");
    expect(remainingLabel(5)).toBe("あと5日");
  });

  it("remainingColor: overdue=alert / soon=primary / それ以外=dimmed", () => {
    expect(remainingColor("overdue")).toBe("alert");
    expect(remainingColor("soon")).toBe("primary");
    expect(remainingColor("ok")).toBe("dimmed");
    expect(remainingColor("manual")).toBe("dimmed");
  });
});
