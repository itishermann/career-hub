# Progress — career-hub overnight run

Légende: `[x]` done · `[~]` partial · `[m]` mocked · `[s]` skipped · `[ ]` pending

---

# ====== RUN 2 — Nuit du 2026-06-02 ======

**Démarrage** : 2026-06-02 ~18:30 GMT+2
**Périmètre** : (1) fix rendu PDF, (2) event system journal/profil→queue, (3) suite E2E Playwright totale, (4) pipeline GitLab lint/test/docker.

**Décisions cadre** (cf DECISIONS.md) :
- Traductions sur édition profil = **suggestions à valider** (modèle type ExtractedFact), respecte la règle CLAUDE.md.
- E2E flux LLM = **provider mock déterministe** (Ollama LAN absent en CI).
- Pipeline GitLab écrite mais **aucun push exécuté par l'agent** (CI pushera).

## Phase 1 — Fix rendu PDF — `[x] DONE`
Root cause confirmée : LLM (qwen2.5-coder:14b) enveloppe le Typst dans un fence markdown ` ```typst … ``` `. `compileTypst` reçoit le fence → Typst rend le contenu en bloc *raw* (code monospace). Gen `cmpwzu6kb0005fj59xdrftk2l` : outputTypst commence par ` ```typst\n `, finit par ` \n``` `.
- [x] Helper `extractTypstFromLlm()` + 8 tests unitaires (fence typst/typ/plain, prose autour, tronqué, sans fence)
- [x] Appliquer dans handlers cv.ts + lm.ts (avant guard "Typst vide")
- [x] Durcir prompts cv/lm (interdire fences + emails via #link + échapper @,#,<,>)
- [x] build green, 48 tests pass (+8), health OK
- [x] Vérif sur l'output réel cassé : fence retiré, compile OK une fois l'email échappé
Commits : `53100ae fix(generations): strip markdown code fences …`

**Bug secondaire découvert** : le modèle écrit l'email en texte brut → Typst parse `@outlook` comme une référence → `label <outlook.com> does not exist`. Post-process global d'échappement = DANGEREUX (casserait un `@` dans un literal string `#link("mailto:…")`). → mitigé par durcissement prompt + dégradation gracieuse (compile fail = warning + Typst sauvé, plus jamais de PDF "code source"). Régénération réelle en cours (job `cmpx0omsa…`) pour valider que le modèle suit la consigne email. Cf BLOCKERS si échec persistant.

## Phase 2 — Event system — `[x] DONE`
- [x] Migration `20260602191843_add_translation_suggestion` : `JobType += TRANSLATION` + modèle `TranslationSuggestion`
- [x] Dispatcher `src/server/events/domain-events.ts` (`publishDomainEvent` + `translationDirection`) + 7 tests
- [x] `addJournalEntry` → publie `journal.entry.created` → enqueue FACT_EXTRACTION
- [x] `upsertProfileSection/Experience/Education/Project` → publient `profile.localized.updated` → enqueue TRANSLATION (règle filled→empty)
- [x] Handler `translation.ts` → crée `TranslationSuggestion` PENDING (jamais d'auto-save), dédup par (entity,field,targetLang)
- [x] Server actions list/apply/reject + UI `TranslationSuggestionsPanel` sur /profile
- [x] i18n `translations.*` + `tasks.type.TRANSLATION` (fr/en)
- [x] build green, 55 tests pass, health OK
- [x] **Validation fonctionnelle réelle** : event → job TRANSLATION → worker → LLM local → suggestion EN du pitch créée (vérifié bout en bout)
Commits : `100fd10 feat(events): domain-event system …`

Note : 1 suggestion de démo conservée (traduction EN du pitch) — visible sur /profile pour review.
Scope : champs LocalizedText string (contentMd, description, diploma, field). `achievements` (array) → IDEAS.

## Phase 3 — Suite E2E Playwright — `[x] DONE`
- [x] Playwright installé + `playwright.config.ts` (webServer port 3100, AUTH_ENABLED=false, LLM_FORCE_MOCK=true)
- [x] BDD de test éphémère `docker-compose.e2e.yml` (pgvector pg18, tmpfs → jamais la BDD dev) + `scripts/e2e-db.sh` (up/wait/migrate/seed)
- [x] Override `LLM_FORCE_MOCK` dans `client.ts` (déterminisme CI, pas d'Ollama)
- [x] Specs : smoke, navigation (toutes routes), i18n (FR↔EN), profile (édition+persistance, tabs), journal (ajout), campaigns (vide+création wizard), generation (CV+LM bout en bout job→SUCCEEDED→détail), ats (scoring complet), tasks (sections+contrôles), settings (llm/tokens/préférences)
- [x] **28 tests, verts** (2 skips best-effort documentés : cancel trop rapide en mock, empty-state si BDD non vierge)
- [x] `bun test` scopé à `src/` (n'aspire plus les specs Playwright)
- [x] build green, unit 55 pass, health OK
Commits : `44c2038 test(e2e): comprehensive Playwright suite …`

Lacunes (cf IDEAS) : iframe PDF non assertée (tabs Typst à la place) ; retry job non exercé séparément.

## Phase 4 — Pipeline GitLab + Docker — `[~] PARTIAL`
- [x] Dockerfile multi-stage (Bun install + Node build/runtime, addon Typst natif élagué)
- [s] `output: "standalone"` — **abandonné** (bug Next 16.2.6 + proxy next-intl, cf BLOCKERS)
- [x] `.dockerignore` + `docker-entrypoint.sh` (migrate deploy au démarrage)
- [x] `.gitlab-ci.yml` : lint / test (service Postgres) / e2e (Playwright mock) / build+push registry (main only, $CI_REGISTRY_*)
- [x] **Image build OK + conteneur boot OK** (health ok:true, migrations appliquées, addon Typst chargé, /fr/login 200) — validé localement, **aucun push effectué**
- [~] « image la plus légère possible » : **non atteint** → 2.56 GB (next start + prod deps, faute de standalone). Élagage sûr fait (typst musl + web-compiler + swc non-cibles). Cf BLOCKERS + IDEAS.
- [~] Pipeline CI **non exécutée** (pas de runner local) — écrite, à lancer par le mainteneur.
Commits : `6492e7c ci(docker): GitLab pipeline + Docker image`

### Journal RUN 2
- 18:30 — Démarrage, root cause PDF identifiée, questions répondues, fichiers de suivi initialisés.

---

# ====== RUN 1 — Nuit du 2026-05-28 ======

**Démarrage** : 2026-05-28 22:25 GMT+2

---

## Phase 1 — Fondations + i18n UI — `[x] DONE`

- [x] Setup deps (Mantine 9, Prisma 7, next-intl 4, Better Auth, Zod, nodemailer, AI SDK, lucide-react)
- [x] Remove Tailwind, switch to Mantine + theme.css → Mantine theme
- [x] docker-compose.yml (Postgres + pgvector pg18) — Caddy/app omis du dev compose
- [x] Prisma schema initial + first migration (`20260528205048_init`)
- [x] `src/lib/env.ts` (Zod-validated env + prod hard-fails)
- [x] Better Auth + magic link + `AUTH_ENABLED` bypass (503 in dev, prod hard-fail)
- [x] `src/server/mail.ts` (nodemailer)
- [x] next-intl v4 routing `[locale]` + fr.json/en.json (250+ keys)
- [x] Mantine theme + dark/light + density tokens (port de `design/project/theme.css`)
- [x] App shell (sidebar + header + LanguageSwitcher + ColorSchemeToggle)
- [x] `LocalizedTextInput` composant signature (FR/EN tabs + filled badges + translate button)
- [x] Profile page editor (identity header, pitch card, sections grid, skills card, experiences list)
- [x] CRUD Server Actions (profile sections, identity, experiences, skills, education, projects)
- [x] Seed: données du profil de référence (identity, 9 sections, 5 experiences, 48 skills, 3 educations, 4 projects, 4 templates)
- [x] `src/server/llm/client.ts` (factory + mock provider, canned CV/LM/ATS/extraction)
- [x] **Validation** : `bun run build` green, `bun test` 19/19, `bun run dev` boots, /api/health OK

## Phase 2 — Wizard onboarding + génération CV FR — `[x] DONE`

- [x] `User.onboardingCompleted` au schema
- [x] `/onboarding` wizard 4 steps via Mantine Stepper + `WizardShell`
- [x] Middleware redirect via layout `(app)` (skip /onboarding par placement hors group)
- [x] `/settings/llm` (toggle mock | local | anthropic, models, endpoint, embedding dim)
- [m] Test connexion LLM — mocké
- [s] Typst binary dans Dockerfile (installé via brew localement)
- [x] `src/server/typst/compile.ts` (Bun.spawn + isTypstAvailable() + graceful fallback)
- [x] Templates `cv/sobre-fr` + meta.yaml (ATS-compliant)
- [x] Prompt `cv-generator.ts` (FR + EN, anti-pattern enforcement)
- [x] `/campaigns/new` + `/campaigns/[id]`
- [x] Server Action `generateCv()` — snapshot → prompt → mock LLM → Typst → PDF
- [x] `/generations/[id]` tabs (preview/code/prompt/snapshot) + iframe PDF + métriques

## Phase 3 — i18n contenu + templates EN — `[x] DONE` (pendant phases 2/4)

- [x] `translator.ts` server action via LLM provider
- [x] UI Translate button per LocalizedText field
- [x] Template `cv/sobre-en` + `lm/classic-en`
- [x] Pipeline CV EN (langue héritée de campaign.targetLanguage)
- [x] Fallback handling (pickLocalized avec fallback explicite)

## Phase 4 — Lettre de motivation bilingue + historisation — `[x] DONE`

- [x] Templates `lm/classique-fr` + `lm/classic-en`
- [x] Prompt `lm-generator.ts` (3 paragraphes, voix de l'utilisateur, anti-patterns LM)
- [x] Server Action `generateLm()`
- [m] UI historique générations — liste OK, comparaison versions à raffiner
- [x] Régénération depuis snapshot via `regenerateFromSnapshot()`

## Phase 5 — Journal + RAG — `[~] PARTIAL`

- [x] Modèle JournalEntry + migration pgvector (`contentEmbedding` nullable)
- [m] Service embeddings — `provider.embed()` exposé par le mock, pas câblé pgvector
- [x] `/journal` page + add entry + search (ILIKE pour l'instant)
- [m] Indexation à l'écriture — warm-up embedding sans persistance vector
- [s] Agent `extractor.ts` — stubbé (`applyExtractedFact` throw « not implemented »)
- [s] UI réconciliation — placeholder
- [s] RAG dans génération CV/LM — snapshot accepte `journalExcerpts`, branchement à finir

## Phase 6 — Scoring ATS — `[x] DONE`

- [x] `extract.ts` (pdfjs-dist legacy build + extractTypstText fallback)
- [x] `heuristics.ts` (email/phone/pages/bullets/PDF-UA + warnings bilingues)
- [x] Migration `CampaignAtsKeywords` (au schema initial)
- [x] Agent `ats-keyword-extractor.ts` + cache jdHash SHA-256
- [x] `keywords.ts` matching (synonyms, weighted score, 4 unit tests)
- [x] `score.ts` orchestrator 4 étages + fallback déterministe si LLM down
- [x] UI `AtsScoreCard` (RingProgress, sub-score bars, accordion strengths/weaknesses/suggestions, keyword chips)

## Phase 7 — Export markdown + MCP — `[x] DONE`

- [x] `src/server/export/markdown.ts` (symétrique au seed personality.md, bilingue)
- [x] UI export buttons (FR + EN) sur `/profile`
- [x] `/settings/api-tokens` CRUD avec génération token sha256-hashé
- [x] MCP server `/api/mcp` JSON-RPC + bearer auth
- [x] MCP tools : profile_get_consolidated, campaign_list, generation_list, journal_list, template_list (gated par scopes)

## Phase 8 — Polish — `[s] DEFERRED`

- [s] Template gallery + inline Typst editor — `/templates` affiche la liste
- [s] Backup automation — `scripts/backup-db.sh` à créer
- [x] Healthcheck — `/api/health` retourne DB latency
- [s] Pino structured logs — encore `console.log`
- [s] Caddy + TLS — Dockerfile prod et Caddyfile à produire
- [s] Docs déploiement
- [s] Tests E2E (Playwright)

---

## Commits

1. `chore: initial project setup, design reference ingested`
2. `feat(phase1): bootstrap Mantine 9, next-intl 4, Prisma 7, Better Auth + app shell`
3. `feat(phase1): seed reference profile from personality.md + Postgres up`
4. `feat(phase1): profile page, CRUD actions, stub pages, smoke tests`
5. `feat(phase2): CV generation pipeline + wizard + LLM settings`
6. `feat(phase4): LM bilingue + cv/sobre-en + regenerate-from-snapshot`
7. `feat(phase6): 4-stage ATS scoring (extract → heuristics → keywords → contextual)`
8. `feat(phase7): markdown export + MCP server (JSON-RPC) + api-tokens UI`
9. `feat(phase5): journal add/search/list + UI (RAG/extractor stubbed)`
