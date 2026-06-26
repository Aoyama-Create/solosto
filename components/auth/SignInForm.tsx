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
import { signIn } from "@/app/actions/auth";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signIn({ email, password });
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
              solosto
            </Title>
            <Text c="dimmed" size="sm">
              「そろそろ切れる」を、もう忘れない。
            </Text>
          </div>

          {error && (
            <Alert color="alert" variant="light">
              {error}
            </Alert>
          )}

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
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
          />

          <Button type="submit" loading={pending} fullWidth>
            ログイン
          </Button>

          <Text size="sm" ta="center" c="dimmed">
            アカウントをお持ちでない？{" "}
            <Anchor component={Link} href="/signup">
              新規登録
            </Anchor>
          </Text>
        </Stack>
      </form>
    </Card>
  );
}
