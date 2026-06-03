"use client";

import {
  Button,
  Card,
  Group,
  Select,
  Stack,
  Stepper,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { Check, ChevronLeft, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { createCampaign } from "@/server/actions/campaigns";

type Data = {
  name: string;
  company: string;
  role: string;
  language: "fr" | "en";
  status: "DRAFT" | "SENT" | "INTERVIEWING";
  jd: string;
  contactName: string;
  contactEmail: string;
  notes: string;
};

export function NewCampaignWizard({
  initialLocale,
}: {
  initialLocale: "fr" | "en";
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState<Data>({
    name: "",
    company: "",
    role: "",
    language: initialLocale,
    status: "DRAFT",
    jd: "",
    contactName: "",
    contactEmail: "",
    notes: "",
  });
  const set = <K extends keyof Data>(k: K, v: Data[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const canTarget = !!(
    data.name.trim() &&
    data.company.trim() &&
    data.role.trim()
  );
  const canJd = data.jd.trim().length >= 50;
  const wordCount = data.jd.split(/\s+/).filter(Boolean).length;

  const steps = [
    {
      key: "target",
      label: "Cible",
      canContinue: canTarget,
      body: (
        <StepCard
          title="Quel poste vises-tu ?"
          subtitle="On garde la cible nette : entreprise, poste, langue de génération. La langue choisie ici fixe la langue de tous les CV et LM de cette campagne."
        >
          <Stack gap="md">
            <TextInput
              label="Nom de la campagne"
              value={data.name}
              onChange={(e) => set("name", e.currentTarget.value)}
              placeholder="ex. Lead Dev — Doctolib"
              description="Sert juste à t'y retrouver. Convention : Rôle — Entreprise."
            />
            <Group grow>
              <TextInput
                label="Entreprise cible"
                value={data.company}
                onChange={(e) => set("company", e.currentTarget.value)}
                placeholder="Doctolib"
              />
              <TextInput
                label="Intitulé du poste"
                value={data.role}
                onChange={(e) => set("role", e.currentTarget.value)}
                placeholder="Senior Software Engineer"
              />
            </Group>
            <div>
              <Text size="sm" fw={500} mb={6}>
                Langue de génération
              </Text>
              <Group grow>
                {(
                  [
                    { v: "fr", t: "Français", sub: "CV et LM en FR" },
                    {
                      v: "en",
                      t: "English",
                      sub: "CV and cover letters in EN",
                    },
                  ] as const
                ).map((o) => {
                  const active = data.language === o.v;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => set("language", o.v)}
                      style={{
                        textAlign: "left",
                        padding: "12px 14px",
                        background: active
                          ? "var(--ch-accent-bg)"
                          : "var(--ch-bg-0)",
                        border: active
                          ? "1px solid var(--ch-accent)"
                          : "1px solid var(--ch-border-m)",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      <Group gap={8}>
                        <Text size="sm" fw={500}>
                          {o.t}
                        </Text>
                        <span
                          className="mono"
                          style={{
                            fontSize: 10.5,
                            padding: "1px 6px",
                            borderRadius: 999,
                            border: "1px solid var(--ch-border-s)",
                            color: "var(--ch-fg-3)",
                          }}
                        >
                          {o.v.toUpperCase()}
                        </span>
                        {active && (
                          <Check
                            size={14}
                            color="var(--ch-accent-2)"
                            style={{ marginLeft: "auto" }}
                          />
                        )}
                      </Group>
                      <Text size="xs" c="dimmed" mt={4}>
                        {o.sub}
                      </Text>
                    </button>
                  );
                })}
              </Group>
            </div>
            <Select
              label="Statut initial"
              data={[
                { value: "DRAFT", label: "Brouillon (par défaut)" },
                { value: "SENT", label: "Déjà envoyée" },
                { value: "INTERVIEWING", label: "Déjà en entretien" },
              ]}
              value={data.status}
              onChange={(v) => v && set("status", v as Data["status"])}
              style={{ maxWidth: 260 }}
            />
          </Stack>
        </StepCard>
      ),
    },
    {
      key: "jd",
      label: "Description",
      canContinue: canJd,
      body: (
        <StepCard
          title="La description du poste"
          subtitle="Colle le texte de l'annonce. Tu pourras extraire les mots-clés ATS depuis la page de la campagne."
        >
          <Stack gap="sm">
            <Textarea
              label="Description du poste"
              value={data.jd}
              onChange={(e) => set("jd", e.currentTarget.value)}
              autosize
              minRows={10}
              maxRows={22}
              placeholder="Colle le texte complet de l'annonce. Plus c'est dense, mieux le scoring ATS sera calibré."
              styles={{
                input: {
                  fontFamily: "var(--ch-font-mono)",
                  fontSize: 12,
                  lineHeight: 1.6,
                },
              }}
            />
            <Group justify="space-between">
              <Text size="xs" c={canJd ? "green" : "dimmed"}>
                {canJd
                  ? "✓ assez de matière"
                  : `${50 - data.jd.trim().length} caractères minimum`}
              </Text>
              <Text size="xs" c="dimmed" className="mono">
                {data.jd.length} caractères · {wordCount} mots
              </Text>
            </Group>
            <Group
              gap={10}
              align="flex-start"
              p="sm"
              style={{
                background: "var(--ch-bg-0)",
                border: "1px solid var(--ch-border-s)",
                borderRadius: 6,
              }}
            >
              <Sparkles
                size={14}
                color="var(--ch-accent-2)"
                style={{ marginTop: 2 }}
              />
              <Text size="xs" c="dimmed">
                Une fois la campagne créée, l'extraction des mots-clés ATS
                (hard/soft skills, signaux d'expérience) est disponible sur la
                carte « Description du poste », mise en cache et invalidée
                seulement si la JD change.
              </Text>
            </Group>
          </Stack>
        </StepCard>
      ),
    },
    {
      key: "contact",
      label: "Contact",
      canContinue: true,
      body: (
        <StepCard
          title="Suivi de la candidature"
          subtitle="Optionnel mais pratique : qui contacter et tes notes perso. Tu pourras tout éditer plus tard."
        >
          <Stack gap="sm">
            <Group grow>
              <TextInput
                label="Contact (optionnel)"
                value={data.contactName}
                onChange={(e) => set("contactName", e.currentTarget.value)}
                placeholder="Marie Lefèvre"
              />
              <TextInput
                type="email"
                label="Email (optionnel)"
                value={data.contactEmail}
                onChange={(e) => set("contactEmail", e.currentTarget.value)}
                placeholder="m.lefevre@doctolib.com"
              />
            </Group>
            <Textarea
              label="Notes"
              value={data.notes}
              onChange={(e) => set("notes", e.currentTarget.value)}
              autosize
              minRows={5}
              placeholder="Référence, contexte du contact, points d'attention pour l'entretien…"
            />
          </Stack>
        </StepCard>
      ),
    },
    {
      key: "recap",
      label: "Récap",
      canContinue: true,
      body: (
        <StepCard
          title="Vérifie avant de créer"
          subtitle="Si quelque chose cloche, retourne en arrière. Sinon, on crée la campagne et on file sur sa page."
        >
          <Card padding={0}>
            <RecapRow k="Campagne" v={data.name || "(sans nom)"} first />
            <RecapRow k="Entreprise" v={data.company || "—"} />
            <RecapRow k="Poste" v={data.role || "—"} />
            <RecapRow
              k="Langue génération"
              v={data.language.toUpperCase()}
              mono
            />
            <RecapRow k="Statut initial" v={data.status} />
            <RecapRow k="JD" v={`${wordCount} mots`} mono />
            {data.contactName && (
              <RecapRow
                k="Contact"
                v={`${data.contactName}${data.contactEmail ? ` · ${data.contactEmail}` : ""}`}
              />
            )}
            {data.notes && (
              <RecapRow k="Notes" v={`${data.notes.length} caractères`} mono />
            )}
          </Card>
        </StepCard>
      ),
    },
  ];

  function onFinish() {
    startTransition(async () => {
      const id = await createCampaign({
        name: data.name.trim(),
        targetCompany: data.company.trim() || null,
        targetRole: data.role.trim() || null,
        targetLanguage: data.language,
        jobDescription: data.jd.trim() || null,
        contactName: data.contactName.trim() || null,
        contactEmail: data.contactEmail.trim() || null,
        notes: data.notes.trim() || null,
      });
      router.push(`/campaigns/${id}`);
    });
  }

  const isLast = step === steps.length - 1;
  const current = steps[step];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 840, margin: "0 auto" }}>
      <Group gap={6} mb="md">
        <Button
          component={Link}
          href="/campaigns"
          variant="subtle"
          color="gray"
          size="compact-sm"
          leftSection={<ChevronLeft size={14} />}
        >
          Annuler
        </Button>
        <Text size="xs" c="dimmed">
          · retour aux campagnes
        </Text>
      </Group>

      <Stepper
        active={step}
        onStepClick={(s) => s <= step && setStep(s)}
        color="magenta"
        size="sm"
        mb="xl"
        allowNextStepsSelect={false}
      >
        {steps.map((s) => (
          <Stepper.Step key={s.key} label={s.label} />
        ))}
      </Stepper>

      {current.body}

      <Group justify="space-between" mt="xl">
        <Button
          variant="default"
          disabled={step === 0 || pending}
          onClick={() => setStep(Math.max(0, step - 1))}
        >
          Précédent
        </Button>
        {isLast ? (
          <Button
            color="magenta"
            loading={pending}
            disabled={!current.canContinue}
            onClick={onFinish}
          >
            Créer la campagne
          </Button>
        ) : (
          <Button
            color="magenta"
            disabled={!current.canContinue}
            onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
          >
            Suivant
          </Button>
        )}
      </Group>
    </div>
  );
}

function StepCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap="md">
      <div>
        <Title order={3}>{title}</Title>
        <Text size="sm" c="dimmed" mt={4}>
          {subtitle}
        </Text>
      </div>
      {children}
    </Stack>
  );
}

function RecapRow({
  k,
  v,
  mono,
  first,
}: {
  k: string;
  v: string;
  mono?: boolean;
  first?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(120px, 180px) 1fr",
        padding: "11px 16px",
        borderTop: first ? "none" : "1px solid var(--ch-border-s)",
        fontSize: 13,
      }}
    >
      <span style={{ color: "var(--ch-fg-3)" }}>{k}</span>
      <span
        className={mono ? "mono" : undefined}
        style={{ color: "var(--ch-fg-1)" }}
      >
        {v}
      </span>
    </div>
  );
}
