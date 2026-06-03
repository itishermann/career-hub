import { db } from "@/server/db";
import { getLlmProviderForUser } from "@/server/llm/client";
import {
  buildExtractorPrompt,
  ExtractedFactsSchema,
} from "@/server/llm/prompts/extractor";
import type { JobContext, JobUser } from "./context";

export async function runFactExtraction(
  user: JobUser,
  payload: { journalEntryId: string },
  ctx: JobContext,
): Promise<{ count: number }> {
  // 1. Load the entry (scoped to the user).
  await ctx.reportProgress("load", 10);
  const entry = await db.journalEntry.findFirst({
    where: { id: payload.journalEntryId, userId: user.id },
  });
  if (!entry) throw new Error("Entry not found");

  // 2. Run the extractor agent.
  await ctx.reportProgress("llm", 30);
  await ctx.throwIfCancelled();
  const provider = getLlmProviderForUser(user.llmConfig, "journal:extract");
  const { system, prompt } = buildExtractorPrompt(
    entry.content,
    entry.language as "fr" | "en",
  );
  const result = await provider.generateJson({
    system,
    prompt,
    schema: ExtractedFactsSchema,
  });

  // 3. Replace any still-pending facts for this entry so re-running is idempotent.
  await ctx.reportProgress("store", 80);
  await db.extractedFact.deleteMany({
    where: { journalEntryId: entry.id, applied: false, rejectedAt: null },
  });
  for (const f of result.data.facts) {
    await db.extractedFact.create({
      data: {
        journalEntryId: entry.id,
        factType: f.factType,
        factContent: { ...f.factContent, _summary: f.summary } as object,
      },
    });
  }

  await ctx.reportProgress("done", 100);
  return { count: result.data.facts.length };
}
