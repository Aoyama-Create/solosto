import { createTheme, type MantineColorsTuple } from "@mantine/core";

// デザイントークンは docs/design-system.md（モックの COLOR 凡例）が真実。
// ここはそれを Mantine テーマへ写像したもの。デフォルト青は使わない。

// primary（ブランドオレンジ）: index 6 = #F0883E, index 7 = #E2752B（hover/deep）
const brand: MantineColorsTuple = [
  "#fff4ec",
  "#fde7d6",
  "#f8c9a4",
  "#f3ab71",
  "#ef9249",
  "#ed8232",
  "#f0883e",
  "#e2752b",
  "#c9641f",
  "#a85217",
];

// success（底値・良好）: index 6 = #5BA672, index 7 = #3F8F58
const success: MantineColorsTuple = [
  "#ebf6ee",
  "#d7eddd",
  "#aedcbc",
  "#84cb9a",
  "#62bc7e",
  "#4db36d",
  "#5ba672",
  "#3f8f58",
  "#357c4b",
  "#28603a",
];

// alert（切れそう・緊急）: index 6 = #E0654E
const alert: MantineColorsTuple = [
  "#fcebe8",
  "#f8d3cc",
  "#f1a99d",
  "#ea8170",
  "#e4604c",
  "#e14e38",
  "#e0654e",
  "#c9472f",
  "#ab3b27",
  "#8e3120",
];

export const theme = createTheme({
  primaryColor: "brand",
  primaryShade: { light: 6, dark: 6 },
  colors: { brand, success, alert },

  // フォントは app/layout.tsx の <link>（Google Fonts）で読み込む。
  fontFamily: "'M PLUS Rounded 1c', sans-serif",
  headings: { fontFamily: "'Zen Maru Gothic', sans-serif" },

  defaultRadius: "lg",

  // モックの面/テキスト/影トークン（コンポーネントから theme.other で参照）。
  other: {
    surface: "#FBF7F1",
    surfaceCard: "#FFFFFF",
    surfaceSunken: "#F3ECE2",
    ink: "#3B342C",
    inkMuted: "#8C8377",
    inkFaint: "#A89E90",
    shadowCard: "0 18px 50px rgba(60,52,44,.18)",
    shadowSubtle: "0 2px 8px rgba(60,52,44,.06)",
    glowPrimary: "0 4px 12px rgba(240,136,62,.3)",
    gradientPrimary: "linear-gradient(135deg,#F0883E,#E2752B)",
  },

  components: {
    Button: {
      defaultProps: { radius: "xl" }, // ピル
    },
    Card: {
      defaultProps: { radius: "lg", shadow: "sm" },
    },
    Badge: {
      defaultProps: { radius: "xl" },
    },
  },
});
