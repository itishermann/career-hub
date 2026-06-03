"use client";

import { Button, Group } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Download, RefreshCw } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { regenerateFromSnapshot } from "@/server/actions/generations";

/**
 * Header actions for a generation: download the PDF, and regenerate from the
 * same immutable snapshot. Regeneration enqueues a background job and routes the
 * user to the tasks page where progress is tracked.
 */
export function GenerationActions({
  generationId,
  pdfAvailable,
}: {
  generationId: string;
  pdfAvailable: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function regenerate() {
    startTransition(async () => {
      try {
        await regenerateFromSnapshot(generationId);
        notifications.show({
          color: "green",
          message: "Régénération ajoutée à la file",
        });
        router.push("/tasks");
      } catch (e) {
        notifications.show({
          color: "red",
          message: e instanceof Error ? e.message : "Échec",
        });
      }
    });
  }

  return (
    <Group gap="xs">
      {pdfAvailable && (
        <Button
          component="a"
          href={`/api/generations/${generationId}/pdf`}
          variant="default"
          size="sm"
          leftSection={<Download size={14} />}
        >
          Télécharger PDF
        </Button>
      )}
      <Button
        color="magenta"
        size="sm"
        leftSection={<RefreshCw size={14} />}
        loading={pending}
        onClick={regenerate}
      >
        Régénérer
      </Button>
    </Group>
  );
}
