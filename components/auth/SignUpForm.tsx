"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Anchor,
  Button,
  Card,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { signUp } from "@/app/actions/auth";

export function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signUp({ email, password, displayName });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  }

  return (
    <Card shadow="sm" radius="lg" p="xl" w="100%" maw={400}>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <div>
            <Title order={1} size="h2">
              新規登録
            </Title>
            <Text c="dimmed" size="sm">
              メールアドレスとパスワードではじめる。
            </Text>
          </div>

          {error && (
            <Alert color="alert" variant="light">
              {error}
            </Alert>
          )}

          <TextInput
            label="表示名（任意）"
            placeholder="あとから設定でも変更できます"
            value={displayName}
            onChange={(e) => setDisplayName(e.currentTarget.value)}
          />
          <TextInput
            label="メールアドレス"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
          />
          <PasswordInput
            label="パスワード"
            description="6文字以上"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
          />

          <Button type="submit" loading={pending} fullWidth>
            登録する
          </Button>

          <Text size="sm" ta="center" c="dimmed">
            すでにアカウントをお持ちの方は{" "}
            <Anchor component={Link} href="/signin">
              ログイン
            </Anchor>
          </Text>
        </Stack>
      </form>
    </Card>
  );
}
