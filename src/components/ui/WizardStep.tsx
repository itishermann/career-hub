"use client";

import { Button, Group, Stack, Stepper, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

export type WizardStepDef = {
  key: string;
  label: string;
  description?: string;
  body: ReactNode;
  canContinue?: boolean;
};

/**
 * Signature wizard container — used for /onboarding and any future multi-step
 * flows. Mantine `Stepper` carries the numeric breadcrumb; each step has its
 * own body and validation. Steps are uncomplicated by design: a fade-only
 * transition (per the DESIGN_PROMPT).
 */
export function WizardShell({
  currentStep,
  onStepChange,
  steps,
  title,
  subtitle,
  onBack,
  onNext,
  onFinish,
  backLabel,
  nextLabel,
  finishLabel,
  pending,
}: {
  currentStep: number;
  onStepChange?: (step: number) => void;
  steps: WizardStepDef[];
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onNext?: () => void;
  onFinish?: () => void;
  backLabel: string;
  nextLabel: string;
  finishLabel: string;
  pending?: boolean;
}) {
  const isLast = currentStep === steps.length - 1;
  const step = steps[currentStep]!;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 24px",
        background: "var(--ch-bg-0)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 720 }}>
        <Stack gap="xs" mb="xl">
          <Title order={1} style={{ fontSize: 22 }}>
            {title}
          </Title>
          {subtitle && (
            <Text c="dimmed" size="sm">
              {subtitle}
            </Text>
          )}
        </Stack>

        <Stepper
          active={currentStep}
          onStepClick={onStepChange}
          color="magenta"
          size="sm"
          allowNextStepsSelect={false}
          mb="xl"
        >
          {steps.map((s) => (
            <Stepper.Step key={s.key} label={s.label} description={s.description} />
          ))}
        </Stepper>

        <Stack gap="md">{step.body}</Stack>

        <Group justify="space-between" mt="xl">
          <Button
            variant="default"
            onClick={onBack}
            disabled={currentStep === 0 || pending}
          >
            {backLabel}
          </Button>
          {isLast ? (
            <Button color="magenta" onClick={onFinish} loading={pending} disabled={step.canContinue === false}>
              {finishLabel}
            </Button>
          ) : (
            <Button color="magenta" onClick={onNext} disabled={step.canContinue === false || pending}>
              {nextLabel}
            </Button>
          )}
        </Group>
      </div>
    </div>
  );
}
