import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import eslintConfigPrettier from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "supabase/**",
      "lib/supabase/database.types.ts",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // App Router の root layout でフォントを <link> で読むのは公式手法（全ページに適用）。
      // このルールは Pages Router の _document 向けで、ここでは誤検知のため無効化。
      "@next/next/no-page-custom-font": "off",
    },
  },
  eslintConfigPrettier,
];

export default eslintConfig;
