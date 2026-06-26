import { describe, expect, it } from "vitest";
import { derivePushState } from "@/lib/push/state";

describe("購読状態判定 (COM-003)", () => {
  it("非対応は unsupported（permission に関わらず）", () => {
    expect(derivePushState({ supported: false, permission: "granted", subscribedHere: true })).toBe(
      "unsupported",
    );
  });

  it("ブロック済みは denied", () => {
    expect(derivePushState({ supported: true, permission: "denied", subscribedHere: false })).toBe(
      "denied",
    );
  });

  it("未許可は default", () => {
    expect(derivePushState({ supported: true, permission: "default", subscribedHere: false })).toBe(
      "default",
    );
  });

  it("許可済み×購読済みは on", () => {
    expect(derivePushState({ supported: true, permission: "granted", subscribedHere: true })).toBe(
      "on",
    );
  });

  it("許可済み×未購読は off", () => {
    expect(derivePushState({ supported: true, permission: "granted", subscribedHere: false })).toBe(
      "off",
    );
  });
});
