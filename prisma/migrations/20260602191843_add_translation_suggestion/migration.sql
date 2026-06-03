-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'TRANSLATION';

-- CreateTable
CREATE TABLE "TranslationSuggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "sourceLang" TEXT NOT NULL,
    "targetLang" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "suggestedText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),

    CONSTRAINT "TranslationSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TranslationSuggestion_userId_status_idx" ON "TranslationSuggestion"("userId", "status");

-- CreateIndex
CREATE INDEX "TranslationSuggestion_entityType_entityId_field_targetLang_idx" ON "TranslationSuggestion"("entityType", "entityId", "field", "targetLang");

-- AddForeignKey
ALTER TABLE "TranslationSuggestion" ADD CONSTRAINT "TranslationSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
