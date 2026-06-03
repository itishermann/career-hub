/**
 * Lightweight domain-event system.
 *
 * Server Actions publish semantic events ("a journal entry was created", "a
 * localized profile field changed") via `publishDomainEvent`. The dispatcher
 * maps each event to durable background work by enqueueing jobs. This decouples
 * the write path from the long-running side effects, which all flow through the
 * Postgres job queue.
 *
 * Dispatch is synchronous within the publishing request (it only INSERTs job
 * rows — cheap); the actual work runs later in the worker.
 */

import type { Locale, LocalizedText } from "@/lib/i18n";
import { enqueueJob } from "@/server/jobs/queue";
import type { TranslatableEntityType } from "@/server/jobs/types";

export type DomainEvent =
  | {
      type: "journal.entry.created";
      userId: string;
      journalEntryId: string;
    }
  | {
      type: "profile.localized.updated";
      userId: string;
      entityType: TranslatableEntityType;
      entityId: string;
      /** Localized fields that may need a translation suggestion. */
      fields: Record<string, LocalizedText>;
    };

/**
 * Decide which way to translate a localized field: only when exactly one
 * language has content and the other is empty (the "wrote it in FR, suggest EN"
 * case). Both-filled or both-empty → no suggestion (avoids noise; refreshing an
 * existing translation is done via the per-field manual Translate button).
 */
export function translationDirection(
  value: LocalizedText,
): { source: Locale; target: Locale } | null {
  const fr = (value.fr ?? "").trim();
  const en = (value.en ?? "").trim();
  if (fr && !en) return { source: "fr", target: "en" };
  if (en && !fr) return { source: "en", target: "fr" };
  return null;
}

export async function publishDomainEvent(event: DomainEvent): Promise<void> {
  switch (event.type) {
    case "journal.entry.created": {
      await enqueueJob(event.userId, "FACT_EXTRACTION", {
        journalEntryId: event.journalEntryId,
      });
      return;
    }
    case "profile.localized.updated": {
      for (const [field, value] of Object.entries(event.fields)) {
        const dir = translationDirection(value);
        if (!dir) continue;
        await enqueueJob(event.userId, "TRANSLATION", {
          entityType: event.entityType,
          entityId: event.entityId,
          field,
          sourceLang: dir.source,
          targetLang: dir.target,
        });
      }
      return;
    }
  }
}
