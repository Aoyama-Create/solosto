"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  createCategory,
  deleteCategory,
  updateCategory,
  type CategoryView,
} from "@/app/actions/categories";

export function CategoryManager({ categories }: { categories: CategoryView[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        after?.();
        router.refresh();
      } else {
        setError(res.message ?? "失敗しました");
      }
    });
  }

  return (
    <Stack gap="lg">
      <Title order={1} size="h2">
        カテゴリ管理
      </Title>

      {error && (
        <Alert color="alert" variant="light">
          {error}
        </Alert>
      )}

      <Card shadow="sm" radius="lg" p="md">
        <Group>
          <TextInput
            flex={1}
            placeholder="新しいカテゴリ名"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
          />
          <Button
            loading={pending}
            disabled={!newName.trim()}
            onClick={() =>
              run(
                () => createCategory(newName),
                () => setNewName(""),
              )
            }
          >
            追加
          </Button>
        </Group>
      </Card>

      <Stack gap="xs">
        {categories.length === 0 && <Text c="dimmed">カテゴリはまだありません。</Text>}
        {categories.map((c) => (
          <Card key={c.id} shadow="xs" radius="md" p="sm">
            {editingId === c.id ? (
              <Group>
                <TextInput
                  flex={1}
                  value={editingName}
                  onChange={(e) => setEditingName(e.currentTarget.value)}
                />
                <Button
                  size="xs"
                  loading={pending}
                  onClick={() =>
                    run(
                      () => updateCategory(c.id, editingName),
                      () => setEditingId(null),
                    )
                  }
                >
                  保存
                </Button>
                <Button size="xs" variant="subtle" color="gray" onClick={() => setEditingId(null)}>
                  取消
                </Button>
              </Group>
            ) : (
              <Group justify="space-between">
                <Text>{c.name}</Text>
                <Group gap="xs">
                  <ActionIcon
                    variant="subtle"
                    aria-label="編集"
                    onClick={() => {
                      setEditingId(c.id);
                      setEditingName(c.name);
                    }}
                  >
                    ✏️
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="alert"
                    aria-label="削除"
                    onClick={() => {
                      if (confirm(`「${c.name}」を削除しますか？`)) {
                        run(() => deleteCategory(c.id));
                      }
                    }}
                  >
                    🗑️
                  </ActionIcon>
                </Group>
              </Group>
            )}
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
