import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import { theme } from "@/lib/theme";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "solosto",
  description: "そろそろ在庫が切れる、を防ぐ在庫リマインダー",
};

export const viewport: Viewport = {
  themeColor: "#F0883E",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;500;700;800&family=Zen+Maru+Gothic:wght@500;700;900&display=swap"
        />
      </head>
      <body>
        <MantineProvider theme={theme}>
          <ServiceWorkerRegister />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
