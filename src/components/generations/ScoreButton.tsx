"use client";

import { Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Activity } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { enqueueAtsScoringJob } from "@/server/actions/jobs";

export function ScoreButton({ generationId }: { generationId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="default"
      size="xs"
      leftSection={<Activity size={12} />}
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await enqueueAtsScoringJob(generationId);
            notifications.show({
              color: "blue",
              message: "Scoring ajouté à la file",
            });
            router.refresh();
          } catch (err) {
            notifications.show({
              color: "red",
              message: err instanceof Error ? err.message : "Scoring échoué",
            });
          }
        })
      }
    >
      Scorer ATS
    </Button>
  );
}
