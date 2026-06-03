import { z } from "zod";
import { LocaleSchema } from "@/lib/i18n";

export const JOB_TYPES = [
  "CV_GENERATION",
  "LM_GENERATION",
  "CV_IMPROVEMENT",
  "FACT_EXTRACTION",
  "ATS_SCORING",
  "TRANSLATION",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const TRANSLATABLE_ENTITY_TYPES = [
  "section",
  "experience",
  "education",
  "project",
] as const;
export type TranslatableEntityType = (typeof TRANSLATABLE_ENTITY_TYPES)[number];

export const JOB_STATUSES = [
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const CvJobPayload = z.object({
  templateName: z.string().min(1),
  campaignId: z.string().optional(),
  language: LocaleSchema.optional(),
});
export const LmJobPayload = z.object({
  templateName: z.string().min(1),
  campaignId: z.string().min(1),
  language: LocaleSchema.optional(),
});
export const FactExtractionJobPayload = z.object({
  journalEntryId: z.string().min(1),
});
export const AtsScoringJobPayload = z.object({
  generationId: z.string().min(1),
});
export const CvImprovementJobPayload = z.object({
  // The low-scoring source generation to improve upon. Must be a CV tied to a
  // campaign with a job description and already carry an ATS score.
  generationId: z.string().min(1),
  targetScore: z.number().int().min(1).max(100).optional(),
  maxIterations: z.number().int().min(1).max(5).optional(),
});
export const TranslationJobPayload = z.object({
  entityType: z.enum(TRANSLATABLE_ENTITY_TYPES),
  entityId: z.string().min(1),
  field: z.string().min(1),
  sourceLang: LocaleSchema,
  targetLang: LocaleSchema,
});

export const JOB_PAYLOAD_SCHEMAS = {
  CV_GENERATION: CvJobPayload,
  LM_GENERATION: LmJobPayload,
  CV_IMPROVEMENT: CvImprovementJobPayload,
  FACT_EXTRACTION: FactExtractionJobPayload,
  ATS_SCORING: AtsScoringJobPayload,
  TRANSLATION: TranslationJobPayload,
} as const;

export type JobPayloadFor<T extends JobType> = z.infer<
  (typeof JOB_PAYLOAD_SCHEMAS)[T]
>;

export function parseJobPayload<T extends JobType>(
  type: T,
  raw: unknown,
): JobPayloadFor<T> {
  return JOB_PAYLOAD_SCHEMAS[type].parse(raw) as JobPayloadFor<T>;
}

/** UI/SSE-facing projection of a Job row (no heavy prompt/result blobs). */
export type JobSummary = {
  id: string;
  userId: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  step: string | null;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  result: unknown;
  queuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

/** Thrown by handlers (via ctx.throwIfCancelled) to end a job as CANCELLED. */
export class JobCancelledError extends Error {
  constructor() {
    super("JOB_CANCELLED");
    this.name = "JobCancelledError";
  }
}
