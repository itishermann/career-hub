"use client";

import { Button, Group } from "@mantine/core";
import { FileText, Sparkles } from "lucide-react";
import { useState } from "react";
import { GenerateModal, type TemplateChoice } from "./GenerateModal";

/**
 * Campaign generation entry point: the two CTA buttons + the generate modal
 * (template picker → enqueue background job). Client component so it owns the
 * modal state and the next-intl router used after enqueuing.
 */
export function CampaignGenerate({
  campaignId,
  language,
  cvTemplates,
  lmTemplates,
  subtitle,
}: {
  campaignId: string;
  language: "fr" | "en";
  cvTemplates: TemplateChoice[];
  lmTemplates: TemplateChoice[];
  subtitle?: string;
}) {
  const [open, setOpen] = useState<null | "CV" | "COVER_LETTER">(null);

  return (
    <>
      <Group gap="xs">
        <Button
          variant="default"
          leftSection={<FileText size={14} />}
          onClick={() => setOpen("COVER_LETTER")}
          disabled={lmTemplates.length === 0}
        >
          Générer une LM
        </Button>
        <Button
          color="magenta"
          leftSection={<Sparkles size={14} />}
          onClick={() => setOpen("CV")}
          disabled={cvTemplates.length === 0}
        >
          Générer un CV
        </Button>
      </Group>

      <GenerateModal
        opened={open !== null}
        onClose={() => setOpen(null)}
        type={open ?? "CV"}
        templates={open === "COVER_LETTER" ? lmTemplates : cvTemplates}
        campaignId={campaignId}
        language={language}
        subtitle={subtitle}
      />
    </>
  );
}
