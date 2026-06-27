import { describe, expect, it } from "vitest";
import { shouldPromptInstall } from "@/lib/pwa/install";

describe("PWA インストール誘導 (shouldPromptInstall)", () => {
  it("iOS・未インストール・未dismiss なら表示", () => {
    expect(shouldPromptInstall({ standalone: false, ios: true, dismissed: false })).toBe(true);
  });

  it("standalone（インストール済）は出さない", () => {
    expect(shouldPromptInstall({ standalone: true, ios: true, dismissed: false })).toBe(false);
  });

  it("非iOS は出さない（A2HS 手動導線が主目的）", () => {
    expect(shouldPromptInstall({ standalone: false, ios: false, dismissed: false })).toBe(false);
  });

  it("dismiss 済みは出さない", () => {
    expect(shouldPromptInstall({ standalone: false, ios: true, dismissed: true })).toBe(false);
  });
});
