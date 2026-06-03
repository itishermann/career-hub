"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  Drawer,
  Group,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  BookOpen,
  Brain,
  Check,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import {
  addJournalEntry,
  applyExtractedFact,
  extractFactsFromEntry,
  type PendingFact,
  rejectExtractedFact,
  searchJournal,
} from "@/server/actions/journal";

type Entry = {
  id: string;
  content: string;
  language: string;
  createdAt: string;
  reconciled: boolean;
  factsCount: number;
};

export function JournalView({
  initialEntries,
  initialPendingFacts,
  defaultLanguage,
  semanticEnabled,
}: {
  initialEntries: Entry[];
  initialPendingFacts: PendingFact[];
  defaultLanguage: "fr" | "en";
  /** Whether journal embeddings are configured (decoupled from the chat mode). */
  semanticEnabled: boolean;
}) {
  const t = useTranslations("journal");
  const tAct = useTranslations("actions");
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [facts, setFacts] = useState<PendingFact[]>(initialPendingFacts);
  const [text, setText] = useState("");
  const [language, setLanguage] = useState<"fr" | "en">(defaultLanguage);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function add() {
    if (!text.trim()) return;
    startTransition(async () => {
      const id = await addJournalEntry({ content: text.trim(), language });
      setEntries((prev) => [
        {
          id,
          content: text.trim(),
          language,
          createdAt: new Date().toISOString(),
          reconciled: false,
          factsCount: 0,
        },
        ...prev,
      ]);
      setText("");
    });
  }

  async function runSearch() {
    if (!query.trim()) {
      setEntries(initialEntries);
      return;
    }
    setSearching(true);
    try {
      const results = await searchJournal({ query: query.trim(), limit: 20 });
      setEntries(
        results.map((e) => ({
          id: e.id,
          content: e.content,
          language: e.language,
          createdAt: e.createdAt.toString(),
          reconciled: e.reconciled,
          factsCount: 0,
        })),
      );
    } finally {
      setSearching(false);
    }
  }

  async function extract(entryId: string) {
    setExtractingId(entryId);
    try {
      await extractFactsFromEntry(entryId);
      notifications.show({
        color: "blue",
        message: "Extraction ajoutée à la file",
      });
    } catch (err) {
      notifications.show({
        color: "red",
        message: err instanceof Error ? err.message : "Extraction échouée",
      });
    } finally {
      setExtractingId(null);
    }
  }

  function act(factId: string, kind: "apply" | "reject") {
    startTransition(async () => {
      try {
        const result =
          kind === "apply"
            ? await applyExtractedFact(factId)
            : await rejectExtractedFact(factId);
        setFacts((prev) => prev.filter((f) => f.id !== factId));
        // Reflect the reconciliation on the concerned entry row: one fewer
        // pending fact, and flip to "réconcilié" once the server says so.
        setEntries((prev) =>
          prev.map((e) =>
            e.id === result.journalEntryId
              ? {
                  ...e,
                  factsCount: Math.max(0, e.factsCount - 1),
                  reconciled: result.entryReconciled || e.reconciled,
                }
              : e,
          ),
        );
        notifications.show({
          color: "green",
          message:
            kind === "apply" ? "Fait appliqué au profil." : "Fait rejeté.",
        });
      } catch (err) {
        notifications.show({
          color: "red",
          message: err instanceof Error ? err.message : "Action échouée",
        });
      }
    });
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Text c="dimmed" size="sm">
          {entries.length} entrée{entries.length > 1 ? "s" : ""}
        </Text>
        <Button
          variant={facts.length > 0 ? "light" : "default"}
          color={facts.length > 0 ? "magenta" : "gray"}
          size="sm"
          leftSection={<Brain size={14} />}
          onClick={() => setDrawerOpen(true)}
        >
          À réconcilier
          {facts.length > 0 && (
            <Badge ml={6} size="xs" color="magenta" variant="filled">
              {facts.length}
            </Badge>
          )}
        </Button>
      </Group>

      {!semanticEnabled && (
        <Alert color="yellow" variant="light">
          {t("modeAnthropicNotice")}
        </Alert>
      )}

      <Card>
        <Stack gap="sm">
          <Group gap={8}>
            <BookOpen size={14} />
            <Text fw={600} size="sm">
              {t("addEntry")}
            </Text>
          </Group>
          <Textarea
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
            placeholder={t("entryPlaceholder")}
            autosize
            minRows={3}
          />
          <Group justify="space-between" align="center">
            <Select
              data={[
                { value: "fr", label: "FR" },
                { value: "en", label: "EN" },
              ]}
              value={language}
              onChange={(v) => v && setLanguage(v as "fr" | "en")}
              w={90}
            />
            <Button
              color="magenta"
              leftSection={<Plus size={14} />}
              onClick={add}
              loading={pending}
              disabled={!text.trim()}
            >
              {tAct("add")}
            </Button>
          </Group>
        </Stack>
      </Card>

      <Group gap="xs">
        <TextInput
          style={{ flex: 1 }}
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          leftSection={<Search size={14} />}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
        />
        <Button variant="default" onClick={runSearch} loading={searching}>
          {tAct("search")}
        </Button>
      </Group>

      {entries.length === 0 ? (
        <Card>
          <Text c="dimmed" size="sm" ta="center" py="xl">
            {t("empty")}
          </Text>
        </Card>
      ) : (
        <Stack gap="xs">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <Group justify="space-between" mb={4}>
                <Group gap="xs">
                  <Badge variant="default" size="xs">
                    {entry.language.toUpperCase()}
                  </Badge>
                  <Text size="xs" c="dimmed" className="mono">
                    {relTime(entry.createdAt)}
                  </Text>
                </Group>
                <Group gap="xs">
                  {entry.factsCount > 0 && (
                    <Badge
                      variant="light"
                      size="xs"
                      leftSection={<Sparkles size={9} />}
                    >
                      {t("factsCount", { count: entry.factsCount })}
                    </Badge>
                  )}
                  <Badge
                    variant="light"
                    color={entry.reconciled ? "green" : "yellow"}
                    size="xs"
                  >
                    {entry.reconciled ? t("reconciled") : t("toReconcile")}
                  </Badge>
                </Group>
              </Group>
              <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                {entry.content}
              </Text>
              {!entry.id.startsWith("tmp-") && (
                <Group justify="flex-end" mt="xs">
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    color="gray"
                    leftSection={<Brain size={12} />}
                    loading={extractingId === entry.id}
                    onClick={() => extract(entry.id)}
                  >
                    Extraire les faits
                  </Button>
                </Group>
              )}
            </Card>
          ))}
        </Stack>
      )}

      <Drawer
        opened={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        position="right"
        size="md"
        title={`Faits à réconcilier (${facts.length})`}
      >
        {facts.length === 0 ? (
          <Text c="dimmed" size="sm" py="xl" ta="center">
            Rien à réconcilier. Lance « Extraire les faits » sur une entrée pour
            proposer des mises à jour de profil.
          </Text>
        ) : (
          <Stack gap="xs">
            {facts.map((f) => (
              <Card key={f.id} padding="sm">
                <Group gap={6} mb={4}>
                  <Badge size="xs" variant="light" color="magenta">
                    {f.factType}
                  </Badge>
                </Group>
                <Text size="sm">{f.summary}</Text>
                <Text
                  size="xs"
                  c="dimmed"
                  mt={4}
                  lineClamp={1}
                  className="mono"
                >
                  « {f.entryExcerpt}… »
                </Text>
                <Group gap="xs" mt="sm">
                  <Button
                    size="compact-xs"
                    color="green"
                    variant="light"
                    leftSection={<Check size={12} />}
                    onClick={() => act(f.id, "apply")}
                  >
                    Appliquer
                  </Button>
                  <Button
                    size="compact-xs"
                    color="red"
                    variant="subtle"
                    leftSection={<X size={12} />}
                    onClick={() => act(f.id, "reject")}
                  >
                    Rejeter
                  </Button>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Drawer>
    </Stack>
  );
}

function relTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem`;
  return `il y a ${Math.floor(days / 30)} mois`;
}
