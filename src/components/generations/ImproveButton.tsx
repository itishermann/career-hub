"use client";

import { Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { enqueueCvImprovementJob } from "@/server/actions/jobs";

/**
 * "Améliorer" — user-triggered ATS improvement loop. Enqueues a CV_IMPROVEMENT
 * job (up to `maxIterations` regenerate+score cycles, stopping at `targetScore`)
 * and routes to /tasks where progress is tracked. Each attempt becomes its own
 * generation; the job result links to the best one. Shown only when the current
 * generation scored below the target.
 */
export function ImproveButton({
  generationId,
  targetScore,
}: {
  generationId: string;
  targetScore: number;
}) {
  const t = useTranslations("generation");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      fullWidth
      color="magenta"
      size="sm"
      leftSection={<TrendingUp size={14} />}
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await enqueueCvImprovementJob({ generationId, targetScore });
            notifications.show({
              color: "green",
              message: t("improveQueued", { target: targetScore }),
            });
            router.push("/tasks");
          } catch (err) {
            notifications.show({
              color: "red",
              message: err instanceof Error ? err.message : t("improveFailed"),
            });
          }
        })
      }
    >
      {t("improve", { target: targetScore })}
    </Button>
  );
}
