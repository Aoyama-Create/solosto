// COM-011 プラットフォーム判定。購入URLから EC プラットフォームを推定する（検索フィルタ・表示用）。
// 底値判断には使わない（platform 別底値比較はしない）。

export type Platform = "amazon" | "rakuten" | "temu" | "shein" | "other";

const HOST_RULES: { test: RegExp; platform: Platform }[] = [
  { test: /(^|\.)amazon\.|(^|\.)amzn\./i, platform: "amazon" },
  { test: /(^|\.)rakuten\.|(^|\.)r10\.to$/i, platform: "rakuten" },
  { test: /(^|\.)temu\./i, platform: "temu" },
  { test: /(^|\.)shein\./i, platform: "shein" },
];

export function detectPlatform(url: string | null | undefined): Platform {
  if (!url) return "other";
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return "other";
  }
  for (const rule of HOST_RULES) {
    if (rule.test.test(host)) return rule.platform;
  }
  return "other";
}

const LABELS: Record<Platform, string> = {
  amazon: "Amazon",
  rakuten: "楽天",
  temu: "Temu",
  shein: "Shein",
  other: "リンク",
};

export function platformLabel(platform: Platform): string {
  return LABELS[platform];
}
