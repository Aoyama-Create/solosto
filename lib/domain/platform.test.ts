import { describe, expect, it } from "vitest";
import { detectPlatform, platformLabel } from "@/lib/domain/platform";
import { buildPurchaseLink } from "@/lib/domain/deeplink";

describe("platform 判定 (COM-011)", () => {
  it("代表的な EC を判定", () => {
    expect(detectPlatform("https://www.amazon.co.jp/dp/B000")).toBe("amazon");
    expect(detectPlatform("https://amzn.to/abc")).toBe("amazon");
    expect(detectPlatform("https://item.rakuten.co.jp/shop/x/")).toBe("rakuten");
    expect(detectPlatform("https://www.temu.com/x.html")).toBe("temu");
    expect(detectPlatform("https://jp.shein.com/x")).toBe("shein");
    expect(detectPlatform("https://example.com/x")).toBe("other");
  });

  it("空・不正 URL は other", () => {
    expect(detectPlatform(null)).toBe("other");
    expect(detectPlatform("")).toBe("other");
    expect(detectPlatform("not a url")).toBe("other");
  });

  it("platformLabel", () => {
    expect(platformLabel("amazon")).toBe("Amazon");
    expect(platformLabel("rakuten")).toBe("楽天");
    expect(platformLabel("other")).toBe("リンク");
  });
});

describe("ディープリンク (COM-012/014)", () => {
  it("URL からリンクを作る", () => {
    expect(buildPurchaseLink("https://www.amazon.co.jp/dp/B000")).toEqual({
      href: "https://www.amazon.co.jp/dp/B000",
      label: "Amazon ↗",
    });
  });
  it("空・非http は null", () => {
    expect(buildPurchaseLink(null)).toBeNull();
    expect(buildPurchaseLink("javascript:alert(1)")).toBeNull();
  });
});
