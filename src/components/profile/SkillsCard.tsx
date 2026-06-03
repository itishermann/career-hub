"use client";

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Select,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { deleteSkill, upsertSkill } from "@/server/actions/profile";

type Skill = {
  id: string;
  category: string;
  name: string;
  level: string | null;
};

const ORDER = [
  "languages",
  "frameworks",
  "infrastructure",
  "databases",
  "testing",
  "methodologies",
  "compliance",
];

// Spoken languages have their own dedicated editor (EducationLanguages), so we
// hide that category here to avoid duplicate, conflicting controls.
const HIDDEN_CATEGORY = "languages-spoken";

const CATEGORY_LABELS: Record<string, string> = {
  languages: "Languages",
  frameworks: "Frameworks & libs",
  infrastructure: "Infrastructure",
  databases: "Databases",
  testing: "Testing",
  methodologies: "Methodologies",
  compliance: "Compliance",
  "languages-spoken": "Languages spoken",
};

export function SkillsCard({ skills }: { skills: Skill[] }) {
  const t = useTranslations("profile");
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [newCategory, setNewCategory] = useState<string>("languages");
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState("");

  const grouped = new Map<string, Skill[]>();
  for (const s of skills) {
    if (s.category === HIDDEN_CATEGORY) continue;
    if (!grouped.has(s.category)) grouped.set(s.category, []);
    grouped.get(s.category)!.push(s);
  }
  const visibleCount = skills.filter(
    (s) => s.category !== HIDDEN_CATEGORY,
  ).length;
  const categories = Array.from(
    new Set([...ORDER, ...skills.map((s) => s.category)]),
  ).filter((c) => c !== HIDDEN_CATEGORY);

  function add() {
    if (!newName.trim()) return;
    startTransition(async () => {
      await upsertSkill({
        category: newCategory,
        name: newName.trim(),
        level: newLevel.trim() || undefined,
      });
      notifications.show({ color: "green", message: "Compétence ajoutée." });
      setNewName("");
      setNewLevel("");
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteSkill(id);
    });
  }

  return (
    <Card>
      <Group justify="space-between" align="center" mb="sm">
        <Title order={3}>{t("skills")}</Title>
        <Group gap="xs">
          <Badge variant="default" size="sm" className="mono">
            {visibleCount}
          </Badge>
          <Button
            size="compact-xs"
            variant="subtle"
            color="magenta"
            leftSection={<Plus size={13} />}
            onClick={() => setAdding((v) => !v)}
          >
            {t("addSkill")}
          </Button>
        </Group>
      </Group>

      {adding && (
        <Group gap="xs" mb="md" align="flex-end">
          <Select
            label="Catégorie"
            size="xs"
            data={categories.map((c) => ({
              value: c,
              label: CATEGORY_LABELS[c] ?? c,
            }))}
            value={newCategory}
            onChange={(v) => v && setNewCategory(v)}
            style={{ width: 180 }}
            searchable
          />
          <TextInput
            label="Nom"
            size="xs"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            style={{ flex: 1 }}
            placeholder="ex: Rust"
          />
          <TextInput
            label="Niveau"
            size="xs"
            value={newLevel}
            onChange={(e) => setNewLevel(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            style={{ width: 130 }}
            placeholder="expert…"
          />
          <Button
            size="xs"
            color="magenta"
            onClick={add}
            loading={pending}
            disabled={!newName.trim()}
          >
            Ajouter
          </Button>
        </Group>
      )}

      <Stack gap="md">
        {ORDER.filter((c) => grouped.has(c))
          .concat(Array.from(grouped.keys()).filter((c) => !ORDER.includes(c)))
          .map((category) => (
            <div key={category}>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--ch-fg-3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 8,
                }}
              >
                {CATEGORY_LABELS[category] ?? category}
              </div>
              <Group gap={6} wrap="wrap">
                {(grouped.get(category) ?? []).map((s, i) => (
                  <Badge
                    key={s.id}
                    variant={
                      category === "languages" && i < 2 ? "light" : "default"
                    }
                    color={
                      category === "languages" && i < 2 ? "magenta" : "gray"
                    }
                    size="sm"
                    rightSection={
                      <ActionIcon
                        size={12}
                        variant="transparent"
                        color="gray"
                        aria-label={`Retirer ${s.name}`}
                        onClick={() => remove(s.id)}
                      >
                        <X size={10} />
                      </ActionIcon>
                    }
                  >
                    {s.name}
                    {s.level && (
                      <span
                        style={{ opacity: 0.5, marginLeft: 4, fontSize: 9 }}
                      >
                        · {s.level}
                      </span>
                    )}
                  </Badge>
                ))}
              </Group>
            </div>
          ))}
      </Stack>
    </Card>
  );
}
