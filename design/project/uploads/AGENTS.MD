# CLAUDE.md — career-hub

> Instructions destinées à Claude Code pour le développement du projet **career-hub**.
> Ce fichier doit être lu en intégralité au début de chaque session de travail sur le projet.

---

## 1. Vision et périmètre

### Mission

Application web auto-hébergée servant de **hub personnel de carrière** : centralise un profil structuré + un journal d'entrées brutes, et génère à la demande des CV et lettres de motivation contextualisés via LLM, avec scoring ATS, historisation et bibliothèque de templates extensibles. Bilingue **français + anglais** côté UI et côté contenus générés.

### Utilisateur cible

Conçu d'abord pour **Jean Dupont** (développeur fullstack senior — son profil de référence est ingéré en BDD lors du seed initial à partir d'un fichier `personality.md` fourni au bootstrap). Architecture **multi-user dès le départ** pour partager l'outil avec d'autres personnes ultérieurement.

### Principes directeurs

1. **Self-hosted friendly** — déploiement Docker Compose sur Freebox Delta. Pas de dépendance cloud propriétaire.
2. **LLM unifié par utilisateur, local par défaut** — chaque utilisateur choisit UN mode au premier lancement (via wizard d'onboarding) : soit tout via un endpoint local OpenAI-compatible (défaut, recommandé pour la confidentialité), soit tout Anthropic. Pas de routing par tâche.
3. **BDD = source unique de vérité** pour le profil. Le fichier `personality.md` n'est qu'un format de **bootstrap** (seed initial) et d'**export**, jamais lu en runtime.
4. **Historisation forte** — chaque génération est immutable et reproductible. Snapshots du profil au moment T conservés.
5. **Templates en code** — les templates CV/LM sont du code Typst versionné, modifiable par l'humain ou le LLM.
6. **ATS-aware** — chaque CV généré est scoré contre une description de poste si fournie. L'extraction des mots-clés est **dynamique via LLM** (pas de liste curated), cachée par campagne.
7. **Bilingue de bout en bout** — UI, profil, templates et générations supportent FR et EN. La langue est explicite (préférence user pour l'UI, choix par campagne pour les générations). Pas de détection auto.
8. **MCP-ready** — l'API métier est aussi exposée via un serveur MCP pour que des LLMs externes (Claude Code, Claude Desktop) puissent interagir avec le hub.

---

## 2. Stack technique (versions arrêtées en mai 2026)

| Couche | Techno | Version | Raison |
|---|---|---|---|
| Runtime | **Bun** | 1.3.14 | Démarrage rapide, package manager intégré, runtime moderne |
| Framework | **Next.js** | 16.2.6 LTS | App Router, Server Actions, streaming natif |
| i18n | **next-intl** | 4.x | Standard de facto Next.js App Router, routing localisé |
| UI | **Mantine** | 9.2.x | 120+ composants, hooks riches, perf SSR (CSS modules) |
| ORM | **Prisma** | 7.4.x | Type-safe, rust-free depuis v7 |
| BDD | **PostgreSQL** | 18.4 | Stable, intégration pgvector |
| Vector | **pgvector** | 0.8.2 | Vector search dans Postgres |
| Auth | **Better Auth** | latest | Magic link natif, bearer tokens natifs (pour MCP) |
| LLM SDK | **Vercel AI SDK** | 6.0.x | Multi-provider, streaming, agent loops |
| LLM cloud | **Anthropic** | via `@ai-sdk/anthropic` | Mode "anthropic" |
| LLM local | endpoint OpenAI-compatible | configurable | Mode "local" (Ollama, LM Studio, llama.cpp server) |
| Validation | **Zod** | 3.x | Schémas IO partout |
| Templates | **Typst** | 0.14.2 | PDF/UA-1 natif (ATS-friendly), syntaxe propre |
| Compilation | binaire `typst-cli` | 0.14.2 | Appelé en subprocess depuis Bun |
| PDF parsing | **pdfjs-dist** | latest | Pour scoring ATS (extraction texte) |
| MCP | **@modelcontextprotocol/sdk** | latest | Serveur MCP TypeScript |
| Mail | **nodemailer** + SMTP custom | latest | Magic link Better Auth — SMTP fourni par l'utilisateur |
| Linter/Formatter | **Biome** | 2.x | Remplace ESLint + Prettier |
| Reverse proxy | **Caddy** | 2.x | HTTPS automatique sur Freebox |
| Container | **Docker Compose** | v2 | Orchestration locale |

### Décisions structurantes

- **TypeScript strict mode** partout. Pas de `any` toléré sauf cas exceptionnels documentés.
- **Server Actions Next.js** pour les mutations côté serveur, pas d'API REST sauf MCP et endpoints publics nécessaires.
- **tRPC non utilisé** — les Server Actions + types Prisma suffisent.
- **Pas de Redis** en v1 — `unstable_cache` Next.js + `revalidateTag` sur invalidation BDD.
- **Pas de queue système** en v1 — Server Actions avec streaming.
- **LLM mode unifié** : `User.llmConfig.mode` vaut `"anthropic"` OU `"local"`. Toutes les tâches d'un utilisateur passent par le mode actif. Switch possible à tout moment.
- **Endpoint LLM local externe** : pas de container Ollama géré par l'app. L'utilisateur configure une URL dans `/settings/llm`.
- **SMTP custom** : l'utilisateur fournit son propre SMTP (Freebox, Gmail relay, Mailcow, etc.). Pas de service tiers managé.

---

## 3. Structure des dossiers

```
career-hub/
├── CLAUDE.md
├── README.md
├── docker-compose.yml
├── Dockerfile
├── Caddyfile
├── .env.example
├── package.json
├── bun.lock
├── tsconfig.json
├── biome.json
├── next.config.ts
├── personality.md             # SEED initial UNIQUEMENT
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                # Importe personality.md → BDD au premier démarrage
├── messages/
│   ├── fr.json
│   └── en.json
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── verify/
│   │   │   ├── (app)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── profile/
│   │   │   │   ├── journal/
│   │   │   │   ├── campaigns/
│   │   │   │   ├── generations/
│   │   │   │   ├── templates/
│   │   │   │   └── settings/
│   │   │   │       ├── llm/        # Config mode + endpoint local
│   │   │   │       ├── api-tokens/ # Tokens MCP
│   │   │   │       └── profile/    # Préférences user (langue UI, etc.)
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── auth/[...all]/route.ts
│   │   │   ├── mcp/route.ts
│   │   │   └── health/route.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── profile/
│   │   ├── journal/
│   │   ├── templates/
│   │   └── generations/
│   ├── server/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── mail.ts            # nodemailer wrapper
│   │   ├── i18n/
│   │   │   ├── config.ts
│   │   │   └── translator.ts
│   │   ├── llm/
│   │   │   ├── client.ts      # Factory : retourne le client LLM selon User.llmConfig.mode
│   │   │   ├── embeddings.ts
│   │   │   └── prompts/
│   │   │       ├── cv-generator.ts
│   │   │       ├── lm-generator.ts
│   │   │       ├── ats-scorer.ts
│   │   │       ├── ats-keyword-extractor.ts
│   │   │       ├── extractor.ts
│   │   │       ├── reconciler.ts
│   │   │       └── translator.ts
│   │   ├── typst/
│   │   │   ├── compile.ts
│   │   │   └── render.ts
│   │   ├── ats/
│   │   │   ├── extract.ts
│   │   │   ├── heuristics.ts
│   │   │   ├── keywords.ts
│   │   │   └── score.ts
│   │   ├── export/
│   │   │   └── markdown.ts    # Export profil → personality.md
│   │   ├── mcp/
│   │   │   ├── server.ts
│   │   │   ├── tools/
│   │   │   └── auth.ts
│   │   └── actions/
│   │       ├── profile.ts
│   │       ├── journal.ts
│   │       ├── campaigns.ts
│   │       ├── generations.ts
│   │       ├── templates.ts
│   │       ├── settings.ts
│   │       └── export.ts
│   ├── lib/
│   │   ├── env.ts
│   │   ├── types.ts
│   │   ├── i18n.ts            # Types LocalizedText, helpers
│   │   └── utils.ts
│   └── styles/
├── templates/
│   ├── cv/
│   │   ├── sobre-fr/
│   │   │   ├── template.typ
│   │   │   ├── meta.yaml
│   │   │   └── preview.png
│   │   ├── sobre-en/
│   │   └── sobre-fr-ats/
│   └── lm/
│       ├── classique-fr/
│       └── classic-en/
├── docs/
│   ├── architecture.md
│   ├── database.md
│   ├── templates.md
│   ├── mcp.md
│   ├── agents.md
│   ├── i18n.md
│   └── deployment.md
└── scripts/
    ├── backup-db.sh
    └── restore-db.sh
```

---

## 4. Internationalisation (i18n)

### Périmètre

Deux dimensions :

1. **Langue d'interface** : labels UI, messages, formulaires. Gérée par `next-intl`. Fichiers `messages/fr.json` + `messages/en.json`.
2. **Langue de contenu** : profil, templates, générations. Stockée en BDD via `LocalizedText`.

### Locales supportées

- `fr` (défaut)
- `en`

Architecture extensible : ajouter une locale = ajouter `messages/<locale>.json` + déclarer dans `src/server/i18n/config.ts`.

### Routing

- URLs préfixées : `/fr/profile`, `/en/profile`.
- **Pas de détection auto** au premier visit. Langue de l'UI = `fr` par défaut, l'utilisateur change manuellement via le sélecteur.
- Persistance : `User.uiLocale` (BDD) — utilisé pour les redirections post-login.
- Utilisateur non authentifié : préférence stockée en cookie.

### Type LocalizedText

```typescript
// src/lib/i18n.ts
import { z } from "zod";

export const LocalizedTextSchema = z.object({
  fr: z.string().nullable().optional(),
  en: z.string().nullable().optional(),
});
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const LocalizedStringArraySchema = z.object({
  fr: z.array(z.string()).nullable().optional(),
  en: z.array(z.string()).nullable().optional(),
});
export type LocalizedStringArray = z.infer<typeof LocalizedStringArraySchema>;

// Helper : récupère le contenu dans une locale donnée, avec fallback configurable
export function pickLocalized(
  text: LocalizedText,
  preferred: "fr" | "en",
  options?: { fallback?: "fr" | "en" | null }
): string | null { /* ... */ }
```

Stocké en `Json` côté Prisma, validé Zod côté code.

### Données multilingues — règles

- **`ProfileSection.contentMd`** : `LocalizedText`.
- **`Experience.description`** et **`Experience.achievements`** : `LocalizedText` / `LocalizedStringArray`. Les champs structurels (company, role, dates, technos) ne sont pas localisés.
- **`Skill.name`** : non localisé. `category` est traduit côté UI via next-intl.
- **`Project.description`** : `LocalizedText`.
- **`Education.diploma`** et **`Education.field`** : `LocalizedText`.
- **`Template`** : un template a une langue native (`templateLanguage`) + une liste de langues supportées (`supportedLanguages[]`).
- **`Campaign.targetLanguage`** : choisie explicitement par l'utilisateur. Détermine la langue de TOUTES les générations associées à cette campagne.

### Assistance LLM à la traduction

Service `src/server/i18n/translator.ts` :
- `translateLocalizedField(text, sourceLang, targetLang, context)` — utilise le LLM actif (Anthropic OU local selon mode user) pour traduire avec respect du registre.
- Le contexte (type de champ : achievement, pitch, etc.) est passé pour calibrer le ton.

UI : sur chaque champ `LocalizedText`, un bouton "Traduire vers EN" / "Translate to FR" qui pré-remplit l'autre langue. L'utilisateur peut éditer avant de valider.

### Génération multilingue

Chaque `Generation` a un champ `language` hérité de `Campaign.targetLanguage`. Pipeline :

1. Récupérer le profil et picker les contenus dans la langue cible.
2. Pour chaque champ vide dans la langue cible → fallback sur l'autre langue (marqué explicitement dans le prompt LLM pour traduction à la volée).
3. Le LLM génère le Typst dans la langue cible.
4. Le template utilisé doit supporter la langue cible (sinon erreur explicite).

### Anti-patterns d'i18n

- ❌ Ne JAMAIS mettre des strings UI hardcodées — toujours passer par next-intl.
- ❌ Ne JAMAIS supposer qu'un champ `LocalizedText` a une langue particulière remplie — toujours utiliser `pickLocalized()` avec fallback explicite.
- ❌ Ne JAMAIS sauvegarder une traduction LLM automatique sans validation user.
- ❌ Ne JAMAIS mélanger les langues dans une même génération.
- ❌ Ne JAMAIS chercher à détecter la langue automatiquement — toujours utiliser un champ explicite (`uiLocale`, `targetLanguage`).

---

## 5. Modèle de données

### Tables principales

```prisma
// prisma/schema.prisma — extraits significatifs

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  role          UserRole @default(USER)
  uiLocale      String   @default("fr")
  llmConfig     Json     @default("{}")  // LlmConfig (cf. section 7)
  onboardingCompleted Boolean @default(false)
  createdAt     DateTime @default(now())
  
  apiTokens         ApiToken[]
  profileSections   ProfileSection[]
  experiences       Experience[]
  skills            Skill[]
  education         Education[]
  projects          Project[]
  journalEntries    JournalEntry[]
  templates         Template[]
  campaigns         Campaign[]
  generations       Generation[]
  profileSnapshots  ProfileSnapshot[]
}

enum UserRole {
  USER
  ADMIN
}

model ApiToken {
  id          String   @id @default(cuid())
  userId      String
  name        String
  tokenHash   String   @unique
  scopes      String[]
  expiresAt   DateTime?
  lastUsedAt  DateTime?
  createdAt   DateTime @default(now())
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
}

model ProfileSection {
  id          String   @id @default(cuid())
  userId      String
  sectionType String   // "pitch", "soft_skills", "preferences", "anti_patterns", "voice", "interests"
  contentMd   Json     // LocalizedText
  metadata    Json?
  isCurrent   Boolean  @default(true)
  version     Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, sectionType, version])
  @@index([userId, isCurrent])
}

model Experience {
  id            String   @id @default(cuid())
  userId        String
  company       String
  role          String
  status        String   // "freelance", "salarie", "alternance", "stage"
  location      String?
  startDate     DateTime
  endDate       DateTime?
  description   Json     // LocalizedText
  achievements  Json     // LocalizedStringArray
  technologies  String[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, endDate])
}

model Skill {
  id              String   @id @default(cuid())
  userId          String
  category        String   // clé UI traduite via next-intl
  name            String   // non localisé
  level           String
  yearsExperience Float?
  
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, category, name])
}

model Education {
  id          String   @id @default(cuid())
  userId      String
  school      String
  diploma     Json     // LocalizedText
  field       Json?    // LocalizedText
  location    String?
  startDate   DateTime
  endDate     DateTime?
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Project {
  id            String   @id @default(cuid())
  userId        String
  name          String
  description   Json     // LocalizedText
  technologies  String[]
  url           String?
  year          Int
  
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model JournalEntry {
  id              String   @id @default(cuid())
  userId          String
  content         String   @db.Text
  language        String   // "fr" ou "en" — choisie par l'utilisateur, défaut = uiLocale
  contentEmbedding Unsupported("vector(768)")?  // null si mode anthropic (pas d'indexation)
  reconciled      Boolean  @default(false)
  reconciledAt    DateTime?
  createdAt       DateTime @default(now())
  
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  extractedFacts  ExtractedFact[]
  
  @@index([userId, createdAt])
  @@index([userId, reconciled])
}

model ExtractedFact {
  id              String   @id @default(cuid())
  journalEntryId  String
  factType        String
  factContent     Json
  applied         Boolean  @default(false)
  appliedAt       DateTime?
  rejectedAt      DateTime?
  rejectionReason String?
  createdAt       DateTime @default(now())
  
  journalEntry    JournalEntry @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)
  
  @@index([journalEntryId])
  @@index([applied])
}

model Template {
  id                  String   @id @default(cuid())
  userId              String?  // null = template global
  name                String   @unique
  type                TemplateType
  templateLanguage    String   // langue native : "fr", "en"
  supportedLanguages  String[] // ex: ["fr", "en"]
  description         Json?    // LocalizedText
  typstSource         String   @db.Text
  meta                Json
  isDefault           Boolean  @default(false)
  version             Int      @default(1)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  user                User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  versions            TemplateVersion[]
  generations         Generation[]
}

enum TemplateType {
  CV
  COVER_LETTER
}

model TemplateVersion {
  id          String   @id @default(cuid())
  templateId  String
  typstSource String   @db.Text
  meta        Json
  version     Int
  createdAt   DateTime @default(now())
  
  template    Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
  
  @@unique([templateId, version])
}

model Campaign {
  id              String   @id @default(cuid())
  userId          String
  name            String
  targetCompany   String?
  targetRole      String?
  targetLanguage  String   @default("fr")  // détermine la langue des générations
  jobDescription  String?  @db.Text
  contactEmail    String?
  contactName     String?
  status          CampaignStatus @default(DRAFT)
  notes           String?  @db.Text
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  generations     Generation[]
  atsKeywords     CampaignAtsKeywords?  // 1-1 — cache des keywords extraits
}

enum CampaignStatus {
  DRAFT
  SENT
  RESPONDED
  INTERVIEWING
  REJECTED
  ACCEPTED
  WITHDRAWN
}

model CampaignAtsKeywords {
  id            String   @id @default(cuid())
  campaignId    String   @unique
  jdHash        String   // SHA256 de la JD pour invalidation si la JD change
  keywords      Json     // { hard_skills, soft_skills, domain_keywords, experience_signals }
  llmProvider   String   // "anthropic" ou "local"
  llmModel      String
  extractedAt   DateTime @default(now())
  
  campaign      Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
}

model ProfileSnapshot {
  id          String   @id @default(cuid())
  userId      String
  snapshot    Json     // état complet du profil sérialisé
  reason      String   // "generation:cv:xxx", "manual", "export"
  createdAt   DateTime @default(now())
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  generations Generation[]
  
  @@index([userId, createdAt])
}

model Generation {
  id                String   @id @default(cuid())
  userId            String
  campaignId        String?
  templateId        String
  profileSnapshotId String
  type              TemplateType
  language          String   // hérité de campaign.targetLanguage
  llmProvider       String   // "anthropic" ou "local"
  llmModel          String
  llmPrompt         String   @db.Text
  outputTypst       String   @db.Text
  outputPdfPath     String
  atsScore          Json?
  durationMs        Int
  inputTokens       Int?
  outputTokens      Int?
  costCents         Float?
  createdAt         DateTime @default(now())
  
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  campaign          Campaign? @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  template          Template @relation(fields: [templateId], references: [id])
  profileSnapshot   ProfileSnapshot @relation(fields: [profileSnapshotId], references: [id])
  
  @@index([userId, createdAt])
  @@index([campaignId])
}
```

### Notes sur le modèle

- **`personality.md` n'apparaît pas en BDD**. Format de seed initial uniquement. Source de vérité = BDD. L'export markdown produit le format inverse pour backup/partage.
- **`User.llmConfig`** : un seul JSON avec un `mode` (`"anthropic"` | `"local"`) et la config associée. Cf. section 7.
- **`CampaignAtsKeywords`** en 1-1 avec `Campaign` : cache des keywords extraits depuis `jobDescription`. Invalidé si `jdHash` change.
- **`JournalEntry.contentEmbedding`** : nullable. En mode "anthropic" l'indexation sémantique est désactivée, la colonne reste à `null`.
- **Snapshots immutables** : reproductibilité totale d'une génération.

### Index pgvector (migration custom)

```sql
CREATE INDEX journal_entries_embedding_idx
ON "JournalEntry"
USING hnsw (content_embedding vector_cosine_ops)
WHERE content_embedding IS NOT NULL;
```

---

## 6. Conventions de code

### Général

- **Bun** pour tout. Jamais `npm`/`yarn`/`pnpm`.
- **Biome** pour lint + format. Config dans `biome.json`.
- **Imports absolus** depuis `src/` (`@/components/...`, `@/server/...`, `@/lib/...`).
- **Pas de barrel files**.

### Nommage

- Fichiers : `kebab-case.ts` (composants React : `PascalCase.tsx`)
- Composants React : `PascalCase`
- Hooks : `useCamelCase`
- Server Actions : verbe en préfixe (`createCampaign`, `updateProfileSection`)
- Types : `PascalCase`, suffixe `Input`/`Output` pour les schémas d'IO
- Constantes globales : `SCREAMING_SNAKE_CASE`
- Clés de traduction : `namespace.kebab-case-key`

### Patterns à respecter

- **Server Actions** validées avec **Zod** systématiquement.
- **Validation env** au démarrage : `src/lib/env.ts` parse `process.env` avec Zod, crash si invalide.
- **Prisma client singleton** dans `src/server/db.ts`.
- **Erreurs métier typées** : classe `AppError` avec un `code` string.
- **Server Components par défaut**, `'use client'` uniquement quand interactivité nécessaire.
- **Toutes les UI strings** passent par next-intl.
- **Tout champ `LocalizedText`** est lu/écrit via les helpers `src/lib/i18n.ts`.
- **Toute interaction LLM** passe par `src/server/llm/client.ts` qui résout le mode actif de l'utilisateur.

### Patterns à éviter

- ❌ `useEffect` pour fetcher — Server Components ou Server Actions.
- ❌ `getServerSideProps` (Pages Router).
- ❌ `tRPC`.
- ❌ `Redux`/`Zustand` global.
- ❌ `axios` — `fetch` natif.
- ❌ `moment`/`dayjs` lourd — `date-fns` ou `Intl` natif.
- ❌ Strings UI hardcodées.
- ❌ Appels LLM directs depuis ailleurs que `src/server/llm/client.ts`.
- ❌ Détection de langue auto sur du contenu utilisateur.

### Tests

- **Bun test** comme runner.
- Tests unitaires colocalisés : `foo.ts` → `foo.test.ts`.
- Tests d'intégration dans `tests/integration/`.
- Prompts d'agents LLM testés en snapshot sur cas de référence.

---

## 7. Workflow LLM

### Modèle unifié — deux modes mutuellement exclusifs

Chaque utilisateur choisit UN mode dans `/settings/llm`. Toutes les tâches LLM passent par ce mode.

```typescript
// LlmConfig (validée Zod)
type LlmConfig = {
  mode: "anthropic" | "local";
  
  anthropic?: {
    chatModel: string;       // ex: "claude-opus-4-7", "claude-sonnet-4-6"
  };
  
  local?: {
    endpoint: string;        // ex: "http://192.168.1.42:11434/v1"
    apiKey?: string;
    chatModel: string;       // ex: "llama3.3:70b"
    embeddingModel: string;  // ex: "nomic-embed-text"
    embeddingDim: number;    // ex: 768 — doit matcher le modèle
  };
};
```

### Implications du mode

| Capacité | Mode Anthropic | Mode local |
|---|---|---|
| Génération CV/LM | ✅ | ✅ (qualité dépend du modèle) |
| Scoring ATS contextuel | ✅ | ✅ |
| Extraction keywords ATS | ✅ | ✅ |
| Extraction de faits depuis journal | ✅ | ✅ |
| Réconciliation profil | ✅ | ✅ |
| Traduction assistée | ✅ | ✅ |
| **Embeddings (RAG journal)** | ❌ | ✅ |
| **Coût** | Tokens facturés | 0€ (matériel et électricité hors champ) |
| **Latence** | Réseau internet | LAN ou local |
| **Confidentialité** | Données envoyées à Anthropic | Tout reste local |

### Mode Anthropic — RAG dégradé

Anthropic ne fournit pas d'embeddings natifs. En mode anthropic :
- **Indexation sémantique du journal désactivée**.
- Le champ `content_embedding` reste `null`.
- Recherche dans le journal = full-text search PostgreSQL (`tsvector`) — utile mais sémantique limitée.
- Bannière d'info sur la page journal expliquant le mode dégradé.

### Switch de mode

L'utilisateur peut basculer de mode à tout moment depuis `/settings/llm`. Au switch :
- **Anthropic → Local** : si journal non vide, proposer une réindexation en arrière-plan (génère les embeddings pour les entrées existantes).
- **Local → Anthropic** : warning explicite ("la recherche sémantique sera désactivée, vos embeddings seront conservés au cas où vous reviendriez"). Les embeddings ne sont PAS supprimés (économie de réindexation au retour).

### Page `/settings/llm` — UI

- **Toggle Mode** : `Anthropic` ↔ `Local`
- **Section Anthropic** (visible si mode = anthropic) :
  - Clé API (validée au save par un appel `/v1/messages` de test)
  - Select : modèle de chat (Opus 4.7, Sonnet 4.6, Haiku 4.5)
- **Section Local** (visible si mode = local) :
  - URL endpoint (validée au save)
  - API key optionnelle
  - Bouton "Tester la connexion" → appel `GET /models`, affichage des modèles dispos
  - Select chat model (rempli depuis `/models`)
  - Select embedding model
  - Champ dimension (validation : appel test `/embeddings` avec un texte court, vérification de la dim retournée)
- Les deux configs sont conservées même quand non actives (switch facile).

### Mode par défaut

Lors de la création d'un user (admin bootstrap ou inscription), `llmConfig.mode` est initialisé à `"local"` par défaut — choix orienté confidentialité, cohérent avec le positionnement self-hosted de l'app. L'utilisateur peut basculer vers Anthropic via le wizard ou plus tard dans `/settings/llm`.

### Wizard d'onboarding

Déclenché automatiquement après le premier login d'un utilisateur dont `onboardingCompleted = false`. Bloque l'accès au reste de l'app tant qu'il n'est pas complété (middleware sur les routes `(app)`).

**Étapes** :

1. **Bienvenue + langue UI** — sélecteur FR/EN (défaut FR), explication brève du produit.
2. **Mode LLM** — toggle Local (sélectionné) / Anthropic, avec courte explication des implications (RAG sémantique vs full-text, confidentialité vs coût Anthropic).
3. **Config LLM détaillée** selon le mode choisi :
   - **Local** : URL endpoint, API key optionnelle, bouton "Tester la connexion" qui fetch `/models` et affiche la liste, sélecteurs chat model + embedding model + dim. Validation par un appel de test `/embeddings`.
   - **Anthropic** : clé API (champ masqué), test par appel `/v1/messages` minimal, sélecteur modèle chat (Opus 4.7 / Sonnet 4.6 / Haiku 4.5). Bannière d'info : "Le RAG sémantique sera désactivé. Vos données seront envoyées à Anthropic."
4. **Profil minimal** — nom, ville (déjà pré-rempli pour l'admin bootstrap depuis le seed `personality.md`, vide sinon). Possibilité de skip si on veut tout configurer plus tard.
5. **Récapitulatif** — résumé des choix, bouton "Terminer" qui set `onboardingCompleted = true` et redirige vers `/profile`.

Le wizard est **rejouable** depuis `/settings` (bouton "Relancer le wizard") — utile si on veut tout reconfigurer. Le rejouer ne reset pas les données, juste les paramètres de config.

### Routage des modèles

Mode Anthropic — modèle recommandé : `claude-opus-4-7` pour CV/LM (qualité critique), `claude-sonnet-4-6` peut suffire pour le reste. L'utilisateur choisit dans le select.

Mode Local — exemples de modèles qui fonctionnent bien :
- Chat : `llama3.3:70b`, `qwen2.5-coder:32b`, `mistral-large`
- Embeddings : `nomic-embed-text` (768d), `mxbai-embed-large` (1024d), `bge-large-en-v1.5` (1024d)

### Hybride entrées/profil

1. **Append-only sur le journal** — entrées brutes intactes.
2. **Extraction asynchrone** post-écriture : agent (Anthropic OU local selon mode) extrait des `ExtractedFact`.
3. **Suggestion de réconciliation** : UI dédiée → l'utilisateur applique/rejette/édite.
4. **Profil consolidé** (tables structurées + sections markdown) = source de vérité.
5. **RAG sur le journal** : en mode local, top K entrées sémantiquement liées sont injectées en contexte. En mode anthropic, top K via full-text search.

### Pipeline de génération CV

```
1. Validate input (campaignId, templateId, options) — Zod
2. Récupérer language depuis campaign.targetLanguage
3. Snapshot du profil → ProfileSnapshot
4. Récupérer template + vérifier qu'il supporte la langue cible
5. Picker contenus localisés (fallback marqué si vide)
6. RAG sur journal : top 10 entrées liées à targetRole/jobDescription
   - Mode local : recherche sémantique pgvector
   - Mode anthropic : recherche full-text
7. Construire prompt système :
   - Profil consolidé sérialisé (langue cible + fallbacks marqués)
   - Job description
   - Entrées journal pertinentes
   - Contraintes template
   - Anti-patterns du profil (section "anti_patterns" + "voice")
   - Instruction explicite sur la langue de sortie
8. Stream LLM (via client.ts qui résout le mode) → Typst source
9. Compile typst-cli → PDF
10. Si jobDescription : scoring ATS (cf. section 9)
11. Persist Generation (provider/modèle utilisés enregistrés)
12. Retour client avec streaming des étapes
```

---

## 8. Templates Typst

### Structure d'un template

```
templates/cv/sobre-fr/
├── template.typ
├── meta.yaml
└── preview.png
```

### `meta.yaml` — schéma

```yaml
name: "Sobre FR"
type: cv
description:
  fr: "Format classique français, mono-colonne, ATS-friendly"
  en: "Classic French format, single-column, ATS-friendly"
template_language: fr
supported_languages: [fr]
version: 1
ats_compliant: true
variables:
  - name: accent_color
    type: color
    default: "#c4006d"
  - name: show_photo
    type: boolean
    default: false
  - name: page_size
    type: enum
    values: [a4, letter]
    default: a4
sections_supported:
  - identity
  - pitch
  - experiences
  - education
  - skills
  - languages
  - projects
  - interests
labels:
  fr:
    experiences: "Expériences"
    education: "Formation"
    skills: "Compétences"
    languages: "Langues"
    projects: "Projets"
    interests: "Centres d'intérêt"
  en:
    experiences: "Experience"
    education: "Education"
    skills: "Skills"
    languages: "Languages"
    projects: "Projects"
    interests: "Interests"
```

### Règles ATS pour les templates

1. **Une seule colonne** pour le contenu principal.
2. **PDF/UA-1** activé (Typst 0.14 par défaut).
3. **Polices système standard** ou intégrées dans Typst.
4. **Pas de texte dans des images**.
5. **Headings sémantiques** (`#heading[]`).
6. **Bullets standards** (`- item`).
7. **Email/téléphone en texte brut** dans une zone identifiable.
8. **Pas de tableaux** pour la mise en page.
9. **Labels via `meta.yaml`** — jamais hardcodés.

### Compilation

```typescript
// src/server/typst/compile.ts
import { spawn } from "bun";

export async function compileTypst(source: string, outputPath: string): Promise<void> {
  // Écrit source dans un tmp file, lance `typst compile`, attend la fin.
  // Validation : binaire typst doit être PATH (vérifié au démarrage du container).
}
```

---

## 9. Scoring ATS (4 étages)

### Étage 1 : Extraction texte PDF

`src/server/ats/extract.ts` :
- `pdfjs-dist` extrait le texte page par page.
- Échec immédiat (score 0) si `text.length === 0`.
- Récupère structure et tags PDF/UA.
- Retourne `{ text, structure, hasAccessibilityTags, pageCount }`.

### Étage 2 : Heuristiques structurelles

`src/server/ats/heuristics.ts` retourne sous-score `0-100` :
- Présence des sections obligatoires (regex sur titres dans la langue cible)
- Email valide détecté
- Téléphone valide détecté
- Nombre de pages ≤ 2
- Ratio caractères / page
- Tags PDF/UA présents → bonus
- Absence de tableaux complexes

### Étage 3 : Match keywords vs job description (cache par campagne)

**Approche : extraction dynamique par LLM, cache en BDD au niveau de la campagne.**

`src/server/ats/keywords.ts` :

1. Si pas de `jobDescription` (campagne sans JD) → ce sous-score est `null`.
2. **Lookup cache** : table `CampaignAtsKeywords` avec `campaignId`. Si présent ET `jdHash === sha256(currentJd)` → utiliser le cache.
3. Sinon, **agent `ats-keyword-extractor`** (LLM actif) extrait depuis la JD un JSON structuré :
   ```typescript
   {
     hard_skills: [{ keyword, importance: 1-5, category: "language"|"framework"|"tool"|"methodology", synonyms: [] }],
     soft_skills: [{ keyword, importance: 1-5, synonyms: [] }],
     domain_keywords: [{ keyword, importance: 1-5 }],
     experience_signals: [{ keyword, importance: 1-5 }]
   }
   ```
4. Persist dans `CampaignAtsKeywords` (upsert) avec `jdHash`, `llmProvider`, `llmModel`.
5. Recherche de chaque keyword dans le CV (exact + lowercased + synonyms + fuzzy match léger).
6. Score pondéré par importance.

### Étage 4 : Analyse LLM contextuelle

`src/server/ats/score.ts` orchestre. Le LLM (mode actif) reçoit :
- CV texte
- jobDescription
- Sous-scores des étages 1-3
- Keywords extraits (étage 3)

Et produit :
- Score global pondéré (0-100)
- Top 5 forces, top 5 faiblesses
- Suggestions actionables priorisées

### Schéma `AtsScore`

```typescript
type AtsScore = {
  global: number;
  breakdown: {
    extraction: number;
    structure: number;
    keywords: number | null;
    contextual: number;
  };
  warnings: string[];
  strengths: { title: string; detail: string }[];
  weaknesses: { title: string; detail: string }[];
  suggestions: {
    priority: "high" | "medium" | "low";
    section: string;
    suggestion: string;
    rationale: string;
  }[];
  matchedKeywords: { keyword: string; count: number; category: string; importance: number }[];
  missingKeywords: { keyword: string; importance: number; category: string }[];
};
```

### Loop optionnelle score-target

`generate_cv(..., { atsTargetScore: 80, maxIterations: 3 })`. Le LLM regénère en intégrant ses suggestions jusqu'à atteindre le score ou sortir après `maxIterations`.

---

## 10. Export markdown du profil

Feature secondaire mais utile (backup hors-BDD, partage, lecture rapide, archivage).

### Module

`src/server/export/markdown.ts` expose :

```typescript
export async function exportProfileToMarkdown(
  userId: string,
  language: "fr" | "en"
): Promise<string>
```

### Format

Reproduit la structure du `personality.md` original :
1. Identité & contact (depuis user + ProfileSection identity)
2. Pitch professionnel (ProfileSection pitch, dans la langue demandée)
3. Parcours professionnel (Experience, triés anti-chronologique)
4. Compétences techniques (Skill, groupées par category)
5. Formation (Education)
6. Langues (extraites des skills category=languages)
7. Projets personnels (Project)
8. Engagements associatifs (Project filtrés ou section dédiée)
9. Soft skills & style de travail (ProfileSection soft_skills)
10. Préférences & critères de recherche (ProfileSection preferences)
11. Différenciateurs clés (ProfileSection)
12. Anecdotes signature (ProfileSection)
13. Centres d'intérêt (ProfileSection interests)
14. Voix de l'utilisateur (ProfileSection voice)
15. Anti-patterns (ProfileSection anti_patterns)
16. Instructions LLM (ProfileSection)

### UI

Page `/profile` : bouton "Exporter en Markdown (FR/EN)" qui télécharge un `personality.md` formaté.

### MCP

Tool `profile_export_markdown(language)` retourne le markdown.

### Note sur la symétrie

L'**import** depuis markdown n'est pas symétrique en runtime — le seed initial parse le fichier mais l'application n'est pas conçue pour réimporter à chaud (risque d'écraser des données BDD). L'import-on-bootstrap est un cas unique.

---

## 11. Serveur MCP

### Auth

- **Bearer token** géré par Better Auth (plugin `bearer`).
- Génération via UI `/settings/api-tokens`.
- Stockage hashé (`ApiToken.tokenHash`).
- Validation middleware.

### Tools exposés (v1)

#### Profile
- `profile_get_section(section_type, language?)`
- `profile_list_sections(language?)`
- `profile_update_section(section_type, content_md, language)`
- `profile_get_consolidated(language?)`
- `profile_translate_section(section_type, source_language, target_language)`
- `profile_export_markdown(language)`

#### Experiences / Skills / Projects / Education
- `*_list(filters?, language?)`
- `*_create(data)`
- `*_update(id, data)`
- `*_delete(id)`
- `*_translate_field(id, field, source_language, target_language)`

#### Journal
- `journal_add_entry(content, language)` — langue explicite, défaut = uiLocale
- `journal_search(query, limit?, language?)` — sémantique si mode local, full-text sinon
- `journal_list(filters?)`
- `journal_get_facts(entry_id?)`
- `journal_apply_fact(fact_id)`
- `journal_reject_fact(fact_id, reason?)`

#### Templates
- `template_list(type?, language?)`
- `template_read(name)`
- `template_create(name, type, template_language, supported_languages, typst_source, meta)`
- `template_update(name, typst_source?, meta?)`
- `template_delete(name)`

#### Campaigns & Generations
- `campaign_create(data)` — incluant `target_language`
- `campaign_list(filters?)`
- `campaign_get(id)`
- `campaign_update(id, data)`
- `generate_cv(template_name, campaign_id?, options?)` — `language` hérité de campaign
- `generate_lm(template_name, campaign_id, options?)`
- `generation_list(filters?)`
- `generation_get(id)`
- `generation_get_pdf(id)`

#### ATS
- `ats_score(generation_id)` — utilise la JD de la campagne associée
- `ats_get_score(generation_id)`
- `ats_extract_keywords(campaign_id)` — déclenche extraction + cache
- `ats_get_cached_keywords(campaign_id)` — relit cache

### Implémentation

`@modelcontextprotocol/sdk`, monté sur `/api/mcp`. Tools dans `src/server/mcp/tools/<tool>.ts`.

---

## 12. Authentification (Better Auth)

### Configuration

```typescript
// src/server/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink, bearer } from "better-auth/plugins";
import { db } from "@/server/db";
import { env } from "@/lib/env";
import { sendMail } from "@/server/mail";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: false },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMail({
          to: email,
          subject: "Your career-hub login link",
          html: `<a href="${url}">Sign in to career-hub</a>`,
        });
      },
      expiresIn: 60 * 15,
    }),
    bearer(),
  ],
  trustedOrigins: env.TRUSTED_ORIGINS,
});

export const isAuthEnabled = env.AUTH_ENABLED;
```

### SMTP custom — `src/server/mail.ts`

```typescript
import nodemailer from "nodemailer";
import { env } from "@/lib/env";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,  // true pour port 465, false pour 587 STARTTLS
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
});

export async function sendMail(input: { to: string; subject: string; html: string }) {
  await transporter.sendMail({ from: env.SMTP_FROM, ...input });
}
```

### Désactivation via env

```bash
AUTH_ENABLED=true  # ou false
```

Si `AUTH_ENABLED=false` :
- Middleware bypass : user mock injecté (`id="dev-user"`, `email="dev@local"`).
- MCP accepte tout (uniquement local).
- **WARNING au démarrage** si `AUTH_ENABLED=false` ET `NODE_ENV=production`.

Wrapper `getCurrentUser()` centralise. **Aucun** autre bypass dans le code applicatif.

---

## 13. Déploiement Freebox (Docker Compose)

### Services

```yaml
# docker-compose.yml (simplifié)
services:
  app:
    build: .
    environment:
      DATABASE_URL: postgres://career:${DB_PASSWORD}@db:5432/career_hub
      AUTH_ENABLED: ${AUTH_ENABLED:-true}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      BETTER_AUTH_URL: ${BETTER_AUTH_URL}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_SECURE: ${SMTP_SECURE}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
      SMTP_FROM: ${SMTP_FROM}
      TRUSTED_ORIGINS: ${TRUSTED_ORIGINS}
      DEFAULT_LOCALE: ${DEFAULT_LOCALE:-fr}
      BOOTSTRAP_ADMIN_EMAIL: ${BOOTSTRAP_ADMIN_EMAIL}
      SEED_PERSONALITY_FILE: /app/personality.md
    volumes:
      - ./templates:/app/templates:ro
      - ./personality.md:/app/personality.md:ro
      - generated-pdfs:/app/storage/pdfs
    depends_on: [db]
  
  db:
    image: pgvector/pgvector:pg18
    environment:
      POSTGRES_DB: career_hub
      POSTGRES_USER: career
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - db-data:/var/lib/postgresql/data
  
  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
    depends_on: [app]

volumes:
  db-data:
  generated-pdfs:
  caddy-data:
```

**Note** : pas de container Ollama. L'utilisateur configure son endpoint LLM local via l'UI (peut tourner sur une autre machine du LAN, dans un autre stack, ou en direct sur la Freebox via un autre container).

**Note** : pas de service tiers SMTP managé. L'utilisateur configure son SMTP custom via les variables d'env (peut être : Freebox SMTP, Gmail relay avec app password, serveur Mailcow/Mailu perso, etc.).

### Variables d'environnement principales

- `DATABASE_URL`
- `AUTH_ENABLED`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
- `TRUSTED_ORIGINS`
- `STORAGE_PATH`
- `DEFAULT_LOCALE` (`fr` ou `en`)
- `SEED_PERSONALITY_FILE` (chemin vers `personality.md` à ingérer, optionnel)
- `BOOTSTRAP_ADMIN_EMAIL` (email à qui envoyer le magic link initial après le premier seed)

### Backup

Script `scripts/backup-db.sh` lancé en cron :
- `pg_dump` complet → fichier daté dans `/backups/`
- Rotation : 7 quotidiens + 4 hebdomadaires + 6 mensuels

### Premier démarrage

1. `docker compose up -d`
2. Migrations Prisma exécutées (entrypoint).
3. Seed : si `SEED_PERSONALITY_FILE` défini et BDD vide → parse + ingestion en sections + tables structurées. Création de l'utilisateur `BOOTSTRAP_ADMIN_EMAIL` en `role=ADMIN` avec `onboardingCompleted=false`. Ensuite le fichier n'est plus relu.
4. L'admin se connecte via magic link envoyé sur son email.
5. **Wizard d'onboarding obligatoire** : choix langue UI, mode LLM (local par défaut), config endpoint + test, sélection modèles, validation profil minimal. Set `onboardingCompleted=true` à la fin.
6. Accès complet à l'app.

---

## 14. Plan d'implémentation phasé

### Phase 1 — Fondations + i18n UI (1-2 semaines)

**Livrable** : App authentifiée bilingue où je peux éditer mon profil multilingue.

- [ ] Init projet : `bun create next-app`, Next.js 16, TS strict, Biome
- [ ] Docker Compose : app + Postgres + Caddy
- [ ] Schéma Prisma initial + migration
- [ ] Better Auth + magic link + flag `AUTH_ENABLED`
- [ ] Wrapper SMTP custom (`src/server/mail.ts`)
- [ ] Setup next-intl avec routes `/[locale]/...` (fr + en)
- [ ] Fichiers `messages/fr.json` + `messages/en.json` initiaux
- [ ] Layout Mantine + dark mode + sélecteur de langue (manuel, pas d'auto-détection)
- [ ] Pages `/profile` avec sections markdown éditables par langue (FR/EN tabs)
- [ ] CRUD pour `Experience`, `Skill`, `Education`, `Project` avec champs `LocalizedText`
- [ ] Helpers `LocalizedText` + composants UI dédiés
- [ ] Seed initial qui ingère `personality.md` (FR) → BDD
- [ ] Page `/settings/profile` (langue UI par défaut)
- [ ] **Validation** : profil lisible/modifiable en FR ET EN

### Phase 2 — Config LLM + wizard d'onboarding + génération CV FR (1-2 semaines)

**Livrable** : Onboarding fluide + génération de CV FR depuis profil + brief campagne.

- [ ] Migration : ajout `User.onboardingCompleted`
- [ ] Page `/onboarding` avec wizard multi-étapes (langue, mode LLM, config LLM, profil minimal, récap)
- [ ] Middleware redirigeant vers `/onboarding` si `onboardingCompleted=false`
- [ ] Page `/settings/llm` avec toggle mode (local par défaut / anthropic)
- [ ] `src/server/llm/client.ts` : factory résolvant le mode actif
- [ ] Validation des configs au save (test API Anthropic / test endpoint local)
- [ ] Installation binaire Typst dans le Dockerfile
- [ ] Wrapper `src/server/typst/compile.ts`
- [ ] Template `cv/sobre-fr` reproduisant fidèlement le CV PDF de référence de l'utilisateur
- [ ] Prompt `cv-generator.ts` (FR uniquement pour cette phase)
- [ ] Page `/campaigns/new` + `/campaigns/:id` avec `targetLanguage` sélectionnable
- [ ] Server Action `generateCv()` complète
- [ ] Page `/generations` avec preview PDF et téléchargement
- [ ] **Validation** : génération d'un CV pour une vraie offre, PDF exploitable

### Phase 3 — i18n contenu + templates EN (1 semaine)

- [ ] Service `translator.ts` (traduction assistée LLM)
- [ ] UI : bouton "Traduire" par champ `LocalizedText`
- [ ] Template `cv/sobre-en` (adaptation anglo-saxonne)
- [ ] Génération CV en EN à partir du profil (heritée de campaign.targetLanguage)
- [ ] Gestion des fallbacks (FR vide → utiliser EN ou inversement, marqueur dans le prompt)
- [ ] **Validation** : générer un CV EN à partir d'un profil principalement FR

### Phase 4 — Lettre de motivation bilingue + historisation (1 semaine)

- [ ] Templates `lm/classique-fr` + `lm/classic-en`
- [ ] Prompt `lm-generator.ts` calibré sur la voix
- [ ] Server Action `generateLm()`
- [ ] UI historique : filtres par campagne / langue, comparaison de versions
- [ ] Régénération depuis un `ProfileSnapshot` ancien

### Phase 5 — Journal + RAG (1-2 semaines)

- [ ] Modèle `JournalEntry` + migration pgvector
- [ ] Service embeddings (mode local uniquement)
- [ ] Page `/journal` : input avec sélecteur de langue + liste anti-chronologique
- [ ] Indexation à l'écriture (mode local) — full-text uniquement en mode anthropic
- [ ] Recherche (sémantique si mode local, full-text sinon) + bannière d'info en mode anthropic
- [ ] Agent `extractor.ts`
- [ ] UI réconciliation : faits proposés, application/rejet
- [ ] Intégration RAG dans génération CV/LM

### Phase 6 — Scoring ATS + cache keywords (1 semaine)

- [ ] Module `extract.ts` (pdfjs-dist)
- [ ] Module `heuristics.ts`
- [ ] Migration : table `CampaignAtsKeywords`
- [ ] Agent `ats-keyword-extractor.ts` + lookup/save cache par campagne
- [ ] Module `keywords.ts` (match + scoring)
- [ ] Module `score.ts` (orchestrateur + LLM contextuel)
- [ ] UI sur génération : visualisation scores, suggestions cliquables
- [ ] Loop optionnelle `atsTargetScore`

### Phase 7 — Export markdown + MCP Server (1 semaine)

- [ ] Module `src/server/export/markdown.ts`
- [ ] Page `/profile` : bouton "Exporter Markdown (FR/EN)"
- [ ] Page `/settings/api-tokens` (CRUD)
- [ ] Serveur MCP sur `/api/mcp` avec auth bearer
- [ ] Implémentation des tools (avec support `language` partout)
- [ ] Documentation `docs/mcp.md` + exemple Claude Desktop / Claude Code
- [ ] Tests d'intégration end-to-end

### Phase 8 — Polish & ops

- [ ] Gallery de templates avec preview + édition Typst inline
- [ ] Backup automatique testé
- [ ] Healthcheck + logs structurés (Pino)
- [ ] Caddy + TLS auto
- [ ] Doc déploiement Freebox (`docs/deployment.md`)
- [ ] Tests E2E (Playwright) des parcours critiques

---

## 15. Instructions opérationnelles pour Claude Code

### Avant toute modification

1. **Lire ce CLAUDE.md** intégralement (au minimum sections 1, 2, 4, 5, 6, 7, 15 si trop long).
2. **Vérifier la phase courante** — pas de feature de phase N+2 sans accord explicite.
3. **Vérifier les versions** dans `package.json` — pas de bump majeur sans validation.
4. **Confirmer l'i18n** — toute nouvelle UI string passe par next-intl, tout nouveau champ utilisateur textuel évalue si `LocalizedText` est pertinent.
5. **Confirmer le mode LLM** — toute interaction LLM passe par `src/server/llm/client.ts`. Jamais d'appel direct au SDK Anthropic/OpenAI.

### Workflow pour une nouvelle feature

1. Si touche au modèle de données → migration Prisma d'abord, validation puis go.
2. Implémenter le code serveur (Server Action ou tool MCP) avec validation Zod.
3. Si applicable → ajouter les clés de traduction dans `messages/fr.json` ET `messages/en.json`.
4. Test unitaire minimal (cas nominal + 1 erreur).
5. UI Mantine.
6. Test manuel du flow complet en dev (dans les deux locales pour les features UI).
7. Commit conventionnel.

### Quand demander au mainteneur

- Ajout d'une dépendance non listée dans la stack.
- Architecture ambiguë (deux approches viables).
- Migration BDD destructrice.
- Modification du seed `personality.md`.
- Décision de coût LLM significative.
- Ajout d'une nouvelle locale (au-delà de FR/EN).

### Conventions de commits

`<type>(<scope>): <description>`
- `type` : `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `perf`, `i18n`
- `scope` : `profile`, `journal`, `ats`, `mcp`, `auth`, `db`, `i18n`, `templates`, `llm`, `mail`
- Impératif, court.

### Tests et validation

- Avant de marquer terminé : `bun run build` OK, `bun test` OK, app démarre.
- En cas d'incertitude → **doc officielle**, jamais inférer.

---

## 16. Prompts système des agents internes

Stockés dans `src/server/llm/prompts/<agent>.ts` sous forme de fonctions templatées. Versionnés. Tout changement testé sur cas de référence.

### Agents

1. **`cv-generator.ts`** — produit Typst d'un CV. Reçoit profil + brief campagne + template + langue cible.
2. **`lm-generator.ts`** — produit Typst d'une LM. Calibré sur la voix profil section "voice", respecte les "anti_patterns".
3. **`ats-keyword-extractor.ts`** — extrait keywords structurés depuis une JD. Cache par campagne.
4. **`ats-scorer.ts`** — analyse contextuelle d'un CV vs JD.
5. **`extractor.ts`** — extrait faits structurés depuis entrée journal. Prompt directif pour modèles plus petits.
6. **`reconciler.ts`** — propose updates de profil cohérents.
7. **`translator.ts`** — traduit un champ `LocalizedText` avec respect du registre métier.

### Principes communs

- Toujours inclure une section "ANTI-PATTERNS" listant ce que l'agent ne doit PAS faire.
- Format de sortie strict (Typst valide, JSON conforme à Zod, etc.).
- Pour générateurs : injecter snapshot profil + contexte, jamais hardcoder.
- Pour modèles locaux (plus petits) : prompts plus courts et plus directifs.
- **Langue de sortie explicite** dans toutes les instructions des générateurs et du traducteur.

---

## 17. Glossaire

- **Profil consolidé** : sections markdown + tables structurées en BDD. Source de vérité unique.
- **`personality.md`** : fichier de **seed initial** uniquement. Parsé une fois au bootstrap, jamais relu en runtime. Aussi format d'**export** disponible.
- **Journal** : flux append-only d'entrées brutes. Vectorisées en mode local. Exploitées en RAG.
- **Fait extrait** (`ExtractedFact`) : candidat de mise à jour du profil dérivé d'une entrée journal.
- **Snapshot** : état figé du profil à un instant T, attaché à chaque génération.
- **Campagne** : contexte d'une candidature (entreprise, poste, JD, langue cible). Une campagne = une offre d'emploi + ses générations associées + son cache de keywords ATS.
- **Génération** : production immutable d'un CV/LM avec template + snapshot + prompt + output. Hérite de la langue de sa campagne.
- **Template** : code Typst paramétrable produisant un PDF. Une langue native + langues supportées.
- **ATS** : Applicant Tracking System.
- **`LocalizedText`** : objet `{ fr?, en? }` représentant un texte multilingue.
- **Wizard d'onboarding** : flow multi-étapes obligatoire au premier login (langue UI, mode LLM, config détaillée, profil minimal). Set `User.onboardingCompleted = true` à la fin. Rejouable depuis `/settings`.
- **Mode LLM** : `"anthropic"` (tout via Anthropic API) ou `"local"` (tout via endpoint OpenAI-compatible). Choisi par utilisateur, exclusif. **Défaut : `"local"`**.
- **Endpoint LLM local** : URL OpenAI-compatible configurée par l'utilisateur (Ollama, LM Studio, llama.cpp server).

---

*Dernière mise à jour : 26 mai 2026*
