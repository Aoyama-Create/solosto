import { Center } from "@mantine/core";

// 認証画面のシェル: ボトムタブ無し・中央寄せ。
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Center mih="100dvh" p="md">
      {children}
    </Center>
  );
}
