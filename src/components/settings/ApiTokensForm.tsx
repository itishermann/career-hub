"use client";

import {
  Alert,
  Button,
  Card,
  CopyButton,
  Group,
  MultiSelect,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Copy, Key, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { KNOWN_SCOPES } from "@/lib/scopes";
import { createApiToken } from "@/server/actions/tokens";

const SCOPES: readonly string[] = KNOWN_SCOPES;

export function ApiTokensForm() {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([
    "profile:read",
    "generations:read",
  ]);
  const [pending, startTransition] = useTransition();
  const [created, setCreated] = useState<string | null>(null);

  function submit() {
    if (!name) return;
    if (scopes.length === 0) {
      notifications.show({
        color: "red",
        message: "Sélectionne au moins un scope.",
      });
      return;
    }
    startTransition(async () => {
      try {
        const plain = await createApiToken({
          name,
          scopes: scopes as Parameters<typeof createApiToken>[0]["scopes"],
        });
        setCreated(plain);
        setName("");
        notifications.show({ color: "green", message: "Token créé." });
      } catch (err) {
        notifications.show({
          color: "red",
          message: err instanceof Error ? err.message : "Création échouée",
        });
      }
    });
  }

  return (
    <Card>
      <Stack gap="sm">
        <Group gap={8}>
          <Key size={14} />
          <Title order={3}>Nouveau token MCP</Title>
        </Group>
        <TextInput
          label="Nom"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="claude-desktop-prod"
        />
        <MultiSelect
          label="Scopes"
          data={SCOPES}
          value={scopes}
          onChange={setScopes}
        />
        <Button
          color="magenta"
          leftSection={<Plus size={14} />}
          onClick={submit}
          loading={pending}
          disabled={!name || scopes.length === 0}
        >
          Créer
        </Button>
        {created && (
          <Alert color="green" variant="light">
            <Stack gap={6}>
              <span style={{ fontSize: 12 }}>
                Copie-le maintenant — il ne sera plus affiché. Stocke-le dans le
                secrets manager de ton client MCP.
              </span>
              <Group gap="xs">
                <code
                  style={{
                    fontSize: 11,
                    padding: "4px 6px",
                    background: "var(--ch-bg-0)",
                    borderRadius: 4,
                  }}
                >
                  {created}
                </code>
                <CopyButton value={created}>
                  {({ copied, copy }) => (
                    <Button
                      size="compact-xs"
                      variant="default"
                      leftSection={<Copy size={10} />}
                      onClick={copy}
                    >
                      {copied ? "Copié" : "Copier"}
                    </Button>
                  )}
                </CopyButton>
              </Group>
            </Stack>
          </Alert>
        )}
      </Stack>
    </Card>
  );
}
