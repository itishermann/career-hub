-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('CV', 'COVER_LETTER');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SENT', 'RESPONDED', 'INTERVIEWING', 'REJECTED', 'ACCEPTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "uiLocale" TEXT NOT NULL DEFAULT 'fr',
    "density" TEXT NOT NULL DEFAULT 'dense',
    "colorScheme" TEXT NOT NULL DEFAULT 'dark',
    "llmConfig" JSONB NOT NULL DEFAULT '{}',
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "scopes" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "birthPlace" TEXT,
    "nationality" TEXT,
    "residencyStatus" TEXT,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedinUrl" TEXT,
    "githubUrl" TEXT,
    "portfolioUrl" TEXT,
    "handle" TEXT,
    "mobility" TEXT,
    "drivingLicence" TEXT,

    CONSTRAINT "ProfileIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileSection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "contentMd" JSONB NOT NULL,
    "metadata" JSONB,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "description" JSONB NOT NULL,
    "achievements" JSONB NOT NULL,
    "technologies" TEXT[],
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT,
    "yearsExperience" DOUBLE PRECISION,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Education" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "diploma" JSONB NOT NULL,
    "field" JSONB,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" JSONB NOT NULL,
    "technologies" TEXT[],
    "url" TEXT,
    "year" INTEGER NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "contentEmbedding" vector(768),
    "reconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedFact" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "factType" TEXT NOT NULL,
    "factContent" JSONB NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "appliedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractedFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "type" "TemplateType" NOT NULL,
    "templateLanguage" TEXT NOT NULL,
    "supportedLanguages" TEXT[],
    "description" JSONB,
    "typstSource" TEXT NOT NULL,
    "meta" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "typstSource" TEXT NOT NULL,
    "meta" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetCompany" TEXT,
    "targetRole" TEXT,
    "targetLanguage" TEXT NOT NULL DEFAULT 'fr',
    "jobDescription" TEXT,
    "contactEmail" TEXT,
    "contactName" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAtsKeywords" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "jdHash" TEXT NOT NULL,
    "keywords" JSONB NOT NULL,
    "llmProvider" TEXT NOT NULL,
    "llmModel" TEXT NOT NULL,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignAtsKeywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Generation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT,
    "templateId" TEXT NOT NULL,
    "profileSnapshotId" TEXT NOT NULL,
    "type" "TemplateType" NOT NULL,
    "language" TEXT NOT NULL,
    "llmProvider" TEXT NOT NULL,
    "llmModel" TEXT NOT NULL,
    "llmPrompt" TEXT NOT NULL,
    "outputTypst" TEXT NOT NULL,
    "outputPdfPath" TEXT,
    "atsScore" JSONB,
    "durationMs" INTEGER NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "costCents" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Generation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiToken_userId_idx" ON "ApiToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileIdentity_userId_key" ON "ProfileIdentity"("userId");

-- CreateIndex
CREATE INDEX "ProfileSection_userId_isCurrent_idx" ON "ProfileSection"("userId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileSection_userId_sectionType_version_key" ON "ProfileSection"("userId", "sectionType", "version");

-- CreateIndex
CREATE INDEX "Experience_userId_endDate_idx" ON "Experience"("userId", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_userId_category_name_key" ON "Skill"("userId", "category", "name");

-- CreateIndex
CREATE INDEX "JournalEntry_userId_createdAt_idx" ON "JournalEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "JournalEntry_userId_reconciled_idx" ON "JournalEntry"("userId", "reconciled");

-- CreateIndex
CREATE INDEX "ExtractedFact_journalEntryId_idx" ON "ExtractedFact"("journalEntryId");

-- CreateIndex
CREATE INDEX "ExtractedFact_applied_idx" ON "ExtractedFact"("applied");

-- CreateIndex
CREATE UNIQUE INDEX "Template_name_key" ON "Template"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateVersion_templateId_version_key" ON "TemplateVersion"("templateId", "version");

-- CreateIndex
CREATE INDEX "Campaign_userId_updatedAt_idx" ON "Campaign"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignAtsKeywords_campaignId_key" ON "CampaignAtsKeywords"("campaignId");

-- CreateIndex
CREATE INDEX "ProfileSnapshot_userId_createdAt_idx" ON "ProfileSnapshot"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Generation_userId_createdAt_idx" ON "Generation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Generation_campaignId_idx" ON "Generation"("campaignId");

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileIdentity" ADD CONSTRAINT "ProfileIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileSection" ADD CONSTRAINT "ProfileSection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Education" ADD CONSTRAINT "Education_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedFact" ADD CONSTRAINT "ExtractedFact_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAtsKeywords" ADD CONSTRAINT "CampaignAtsKeywords_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileSnapshot" ADD CONSTRAINT "ProfileSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_profileSnapshotId_fkey" FOREIGN KEY ("profileSnapshotId") REFERENCES "ProfileSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
