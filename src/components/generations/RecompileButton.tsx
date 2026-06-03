"use client";

import { Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Hammer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { recompileGeneration } from "@/server/actions/generations";

/**
 * User-triggered recompilation of a generation whose Typst failed to compile.
 * Explicit action only — runs the deterministic source repair + (if needed)
 * LLM-assisted fix server-side, then refreshes so the PDF preview appears.
 */
export function RecompileButton({ generationId }: { generationId: string }) {
  const t = useTranslations("generation");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      color="magenta"
      size="sm"
      leftSection={<Hammer size={14} />}
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            const res = await recompileGeneration(generationId);
            if (res.ok) {
              notifications.show({
                color: "green",
                message: t("recompileSuccess"),
              });
              router.refresh();
            } else {
              notifications.show({
                color: "red",
                title: t("recompileFailed"),
                message: res.error?.slice(0, 200) ?? "",
              });
              router.refresh();
            }
          } catch (err) {
            notifications.show({
              color: "red",
              message:
                err instanceof Error ? err.message : t("recompileFailed"),
            });
          }
        })
      }
    >
      {pending ? t("recompiling") : t("recompile")}
    </Button>
  );
}
