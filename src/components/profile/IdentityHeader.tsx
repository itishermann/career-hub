"use client";

import {
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  Briefcase,
  Code2,
  Globe2,
  Link2,
  Mail,
  Pencil,
  Plus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { updateIdentity } from "@/server/actions/profile";

export type IdentityData = {
  fullName: string;
  location: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  handle: string | null;
};

type Props = IdentityData & {
  yearsExperience: number;
  role: string | null;
};

export function IdentityHeader({
  fullName,
  yearsExperience,
  location,
  role,
  handle,
  email,
  phone,
  linkedinUrl,
  githubUrl,
  portfolioUrl,
}: Props) {
  const t = useTranslations("profile");
  const tAct = useTranslations("actions");
  const [opened, { open, close }] = useDisclosure(false);
  const [pending, startTransition] = useTransition();
  const initials = getInitials(fullName);

  const [form, setForm] = useState({
    fullName,
    address: location ?? "",
    email: email ?? "",
    phone: phone ?? "",
    handle: handle ?? "",
    linkedinUrl: linkedinUrl ?? "",
    githubUrl: githubUrl ?? "",
    portfolioUrl: portfolioUrl ?? "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      try {
        await updateIdentity({
          fullName: form.fullName.trim() || undefined,
          address: form.address.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          handle: form.handle.trim() || null,
          linkedinUrl: form.linkedinUrl.trim() || null,
          githubUrl: form.githubUrl.trim() || null,
          portfolioUrl: form.portfolioUrl.trim() || null,
        });
        notifications.show({ color: "green", message: t("identitySaved") });
        close();
      } catch (e) {
        notifications.show({
          color: "red",
          message: e instanceof Error ? e.message : "Échec",
        });
      }
    });
  }

  return (
    <>
      <Group justify="space-between" align="flex-start" wrap="wrap" mb="xl">
        <Group
          gap="md"
          wrap="nowrap"
          align="center"
          style={{ flex: 1, minWidth: 0 }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, var(--ch-accent), #7e1450)",
              color: "white",
              fontFamily: "var(--ch-font-head)",
              fontWeight: 600,
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <Stack gap={4} style={{ minWidth: 0 }}>
            <Group gap="xs" align="center">
              <Title order={1} style={{ fontSize: 22, lineHeight: 1.2 }}>
                {fullName}
              </Title>
              <Badge color="magenta" variant="light" size="sm">
                {t("yearsExperience", { years: yearsExperience })}
              </Badge>
              <Button
                variant="subtle"
                color="gray"
                size="compact-xs"
                leftSection={<Pencil size={12} />}
                onClick={open}
              >
                {tAct("edit")}
              </Button>
            </Group>
            <Group gap="md" wrap="wrap" c="dimmed" style={{ fontSize: 13 }}>
              {role && (
                <Group gap={5}>
                  <Briefcase size={12} />
                  <span>{role}</span>
                </Group>
              )}
              {location && (
                <Group gap={5}>
                  <Globe2 size={12} />
                  <span>{location}</span>
                </Group>
              )}
              {handle && (
                <span className="mono" style={{ fontSize: 12 }}>
                  {handle}
                </span>
              )}
            </Group>
            <Group gap="sm" wrap="wrap" mt={2}>
              {email && (
                <LinkChip
                  icon={<Mail size={11} />}
                  label={email}
                  href={`mailto:${email}`}
                />
              )}
              {portfolioUrl && (
                <LinkChip
                  icon={<Globe2 size={11} />}
                  label={hostOf(portfolioUrl)}
                  href={withProto(portfolioUrl)}
                />
              )}
              {linkedinUrl && (
                <LinkChip
                  icon={<Link2 size={11} />}
                  label={hostOf(linkedinUrl)}
                  href={withProto(linkedinUrl)}
                />
              )}
              {githubUrl && (
                <LinkChip
                  icon={<Code2 size={11} />}
                  label={hostOf(githubUrl)}
                  href={withProto(githubUrl)}
                />
              )}
            </Group>
          </Stack>
        </Group>

        <Group gap="xs">
          <Button
            component="a"
            href="/api/profile/export?lang=fr"
            variant="default"
            size="sm"
          >
            {t("exportMarkdown")} (FR)
          </Button>
          <Button
            component="a"
            href="/api/profile/export?lang=en"
            variant="default"
            size="sm"
          >
            EN
          </Button>
          <Button
            component={Link}
            href="/campaigns/new"
            color="magenta"
            leftSection={<Plus size={14} />}
            size="sm"
          >
            {t("newCampaign")}
          </Button>
        </Group>
      </Group>

      <Modal
        opened={opened}
        onClose={close}
        title={t("editIdentity")}
        size="lg"
        centered
      >
        <Stack gap="sm">
          <TextInput
            label={t("fullName")}
            value={form.fullName}
            onChange={(e) => set("fullName", e.currentTarget.value)}
          />
          <Group grow>
            <TextInput
              label={t("location")}
              value={form.address}
              onChange={(e) => set("address", e.currentTarget.value)}
              placeholder="Lyon, France"
            />
            <TextInput
              label={t("handle")}
              value={form.handle}
              onChange={(e) => set("handle", e.currentTarget.value)}
              placeholder="@jeandupont"
            />
          </Group>
          <Group grow>
            <TextInput
              label="Email"
              value={form.email}
              onChange={(e) => set("email", e.currentTarget.value)}
              placeholder="jean.dupont@example.com"
            />
            <TextInput
              label={t("phone")}
              value={form.phone}
              onChange={(e) => set("phone", e.currentTarget.value)}
              placeholder="06 00 00 00 00"
            />
          </Group>
          <TextInput
            label="Portfolio"
            value={form.portfolioUrl}
            onChange={(e) => set("portfolioUrl", e.currentTarget.value)}
            placeholder="jeandupont.example.com"
          />
          <TextInput
            label="LinkedIn"
            value={form.linkedinUrl}
            onChange={(e) => set("linkedinUrl", e.currentTarget.value)}
            placeholder="linkedin.com/in/jeandupont"
          />
          <TextInput
            label="GitHub"
            value={form.githubUrl}
            onChange={(e) => set("githubUrl", e.currentTarget.value)}
            placeholder="github.com/jeandupont"
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={close}>
              {tAct("cancel")}
            </Button>
            <Button color="magenta" onClick={save} loading={pending}>
              {tAct("save")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

function LinkChip({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11.5,
        color: "var(--ch-accent-2)",
        textDecoration: "none",
        padding: "2px 8px",
        borderRadius: 999,
        border: "1px solid var(--ch-border-s)",
        background: "var(--ch-bg-1)",
      }}
    >
      {icon}
      {label}
    </a>
  );
}

function hostOf(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
function withProto(url: string): string {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

function getInitials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
