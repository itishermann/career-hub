"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  Collapse,
  Group,
  Progress,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { AlertCircle, Ban, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useJobs } from "@/components/jobs/JobsProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { useRouter } from "@/i18n/navigation";
import { cancelJobAction, retryJobAction } from "@/server/actions/jobs";
import type { JobStatus, JobSummary } from "@/server/jobs/types";

export function TasksView({ initialJobs }: { initialJobs: JobSummary[] }) {
  const t = useTranslations("tasks");
  const live = useJobs();
  // Prefer live SSE data once it has loaded; fall back to SSR snapshot.
  const jobs = live.jobs.length ? live.jobs : initialJobs;

  const running = jobs.filter((j) => j.status === "RUNNING");
  const queued = jobs.filter((j) => j.status === "QUEUED");
  const finished = jobs
    .filter(
      (j) =>
        j.status === "SUCCEEDED" ||
        j.status === "FAILED" ||
        j.status === "CANCELLED",
    )
    .slice(0, 20);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <PageHeader title={t("title")} />
      <Stack gap="lg">
        <Section
          title={t("running")}
          empty={t("none-running")}
          jobs={running}
          t={t}
        />
        <Section
          title={t("queued")}
          empty={t("none-queued")}
          jobs={queued}
          t={t}
        />
        <Section
          title={t("finished")}
          empty={t("none-finished")}
          jobs={finished}
          t={t}
        />
      </Stack>
    </div>
  );
}

function Section({
  title,
  empty,
  jobs,
  t,
}: {
  title: string;
  empty: string;
  jobs: JobSummary[];
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <Stack gap="xs">
      <Text fw={600} size="sm" tt="uppercase" c="dimmed">
        {title}
      </Text>
      {jobs.length === 0 ? (
        <Text size="sm" c="dimmed">
          {empty}
        </Text>
      ) : (
        jobs.map((job) => <JobRow key={job.id} job={job} t={t} />)
      )}
    </Stack>
  );
}

const STATUS_COLOR: Record<JobStatus, string> = {
  QUEUED: "gray",
  RUNNING: "blue",
  SUCCEEDED: "green",
  FAILED: "red",
  CANCELLED: "gray",
};

function JobRow({
  job,
  t,
}: {
  job: JobSummary;
  t: ReturnType<typeof useTranslations>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showError, setShowError] = useState(false);

  const cancellable = job.status === "QUEUED" || job.status === "RUNNING";
  const retryable = job.status === "FAILED" || job.status === "CANCELLED";
  const result = job.result as { generationId?: string } | null;

  return (
    <Card withBorder padding="sm" radius="md">
      <Group justify="space-between" wrap="nowrap">
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Group gap={8}>
            <Badge size="sm" color={STATUS_COLOR[job.status]} variant="light">
              {t(`status.${job.status}`)}
            </Badge>
            <Text size="sm" fw={500}>
              {t(`type.${job.type}`)}
            </Text>
            {job.attempts > 1 && (
              <Text size="xs" c="dimmed">
                {t("attempt", { n: job.attempts, max: job.maxAttempts })}
              </Text>
            )}
          </Group>
          {job.status === "RUNNING" && (
            <>
              <Progress value={job.progress} size="sm" animated />
              {job.step && (
                <Text size="xs" c="dimmed">
                  {job.step}
                </Text>
              )}
            </>
          )}
          {job.status === "SUCCEEDED" && result?.generationId && (
            <Button
              size="xs"
              variant="subtle"
              w="fit-content"
              onClick={() => router.push(`/generations/${result.generationId}`)}
            >
              {t("view-result")}
            </Button>
          )}
        </Stack>

        <Group gap="xs">
          {job.status === "FAILED" && job.error && (
            <Button
              size="xs"
              variant="subtle"
              color="red"
              leftSection={<AlertCircle size={12} />}
              onClick={() => setShowError((v) => !v)}
            >
              {t("view-error")}
            </Button>
          )}
          {retryable && (
            <Button
              size="xs"
              variant="default"
              leftSection={<RotateCcw size={12} />}
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await retryJobAction(job.id);
                  } catch (e) {
                    notifications.show({
                      color: "red",
                      message: e instanceof Error ? e.message : "Retry failed",
                    });
                  }
                })
              }
            >
              {t("retry")}
            </Button>
          )}
          {cancellable && (
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              leftSection={<Ban size={12} />}
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await cancelJobAction(job.id);
                  } catch (e) {
                    notifications.show({
                      color: "red",
                      message: e instanceof Error ? e.message : "Cancel failed",
                    });
                  }
                })
              }
            >
              {t("cancel")}
            </Button>
          )}
        </Group>
      </Group>

      {job.error && (
        <Collapse expanded={showError}>
          <Alert mt="sm" color="red" variant="light">
            <Text size="xs" style={{ whiteSpace: "pre-wrap" }}>
              {job.error}
            </Text>
          </Alert>
        </Collapse>
      )}
    </Card>
  );
}
