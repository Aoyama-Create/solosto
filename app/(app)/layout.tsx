import { BottomNav } from "@/components/BottomNav";

// モバイルファーストのアプリシェル: コンテンツ + 固定ボトムタブ。
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100dvh", paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
      {children}
      <BottomNav />
    </div>
  );
}
