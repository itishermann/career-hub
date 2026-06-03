# PROJECT_CONTEXT.md — career-hub

> **À lire avant tout autre fichier au début d'une nouvelle session.**
> Ce document est la **mémoire institutionnelle** du projet career-hub. Il consigne l'historique des décisions, l'état courant, les leçons apprises et les prompts réutilisables, pour que toute session Claude Code (ou autre LLM) puisse reprendre le contexte sans avoir besoin de la conversation d'origine.
>
> Si tu es un LLM qui découvre le projet : commence par ce fichier, puis lis dans cet ordre : `CLAUDE.md`, `personality.md`, `DESIGN_PROMPT.md`. Le reste est consultable au besoin.

---

## 1. Quick start (2 minutes)

**Le projet** : `career-hub`, application web auto-hébergée Next.js 16 + Bun + Mantine 9 + Postgres 18 + Better Auth. Permet à un développeur de centraliser son profil de carrière (en BDD), maintenir un journal d'entrées brutes, et générer à la demande CV + lettres de motivation via LLM, avec scoring ATS, historisation, et templates Typst extensibles. Bilingue FR/EN de bout en bout. Multi-user dès le départ. Tournera sur une Freebox Delta via Docker Compose. LLM local par défaut (Ollama sur PC Windows séparé), Anthropic en option.

**L'utilisateur** : Jean Dupont, développeur fullstack senior (profil de démonstration fictif). Profil détaillé dans `personality.md`. C'est lui le seul user humain pour le moment.

**État courant** (à mettre à jour à chaque jalon) : 
- Phase d'implémentation : à compléter au fil du temps
- Modèle LLM actif : `qwen2.5-coder:14b-instruct` (ou `qwen2.5:14b-instruct` selon résultats)
- Mode LLM actif : `local` (endpoint Ollama sur PC Windows)
- Dernier blocage résolu : reasoning models qui ignorent `/no_think`, contournés par num_ctx forcé + switch vers instruct
- Dernier refactor majeur : `src/server/llm/prompts/cv-generator.ts` (system prompt + structure user prompt)

**Fichiers de référence à connaître** (tous à la racine du repo) :
1. `CLAUDE.md` — spec technique exhaustive (stack, BDD, conventions, plan phasé). C'est la **bible**.
2. `personality.md` — profil utilisateur seed (ingéré une fois en BDD au bootstrap, plus jamais relu).
3. `DESIGN_PROMPT.md` — brief design (palette, composants signature, anti-patterns visuels).
4. `PROGRESS.md` / `DECISIONS.md` / `BLOCKERS.md` / `IDEAS.md` — fichiers de suivi maintenus par les agents au fil du dev.
5. `.design-reference/` (gitignored) — bundle Claude Design avec maquettes JSX + theme.css.

---

## 2. Vue d'ensemble du projet

### Mission

Hub personnel de carrière, self-hosted, qui :
- **Centralise** un profil professionnel structuré (identité, expériences, compétences, formation, projets, sections narratives type "voice", "anti-patterns")
- **Maintient** un journal append-only d'entrées brutes (vectorisées si mode local pour RAG sémantique, full-text Postgres sinon)
- **Génère** CV + lettres de motivation contextualisés à la demande
- **Score** chaque CV contre une description de poste (4 étages : extraction PDF, heuristiques structurelles, match keywords LLM-extraits, analyse contextuelle LLM)
- **Historise** chaque génération de façon immutable (snapshot du profil + template + prompt + output + score)
- **Expose** un serveur MCP pour interaction depuis Claude Code / Claude Desktop externes

### Principes directeurs (à ne pas oublier)

1. Self-hosted friendly, Docker Compose sur Freebox.
2. LLM unifié par utilisateur, **mode local par défaut**. Pas de routing par tâche.
3. **BDD = source unique de vérité** pour le profil. `personality.md` est un format de seed/export, jamais lu en runtime.
4. Historisation forte (snapshots reproductibles).
5. Templates en code Typst versionné, modifiables par humain ou LLM.
6. ATS-aware, keywords extraits dynamiquement par LLM (pas de liste curated), cachés par campagne.
7. Bilingue FR/EN explicite (jamais de détection auto de langue).
8. MCP-ready dès la conception.

---

## 3. Stack technique (versions arrêtées en mai 2026)

Reprend les versions actées dans `CLAUDE.md` section 2. À ne pas reverifier sans bonne raison.

| Couche | Techno | Version |
|---|---|---|
| Runtime | Bun | 1.3.14 |
| Framework | Next.js | 16.2.6 LTS |
| i18n | next-intl | 4.x |
| UI | Mantine | 9.2.x |
| ORM | Prisma | 7.4.x (rust-free) |
| BDD | PostgreSQL | 18.4 |
| Vector | pgvector | 0.8.2 |
| Auth | Better Auth (pas NextAuth) | latest |
| LLM SDK | Vercel AI SDK | 6.0.x |
| LLM cloud | Anthropic (optionnel) | via `@ai-sdk/anthropic` |
| LLM local | endpoint OpenAI-compatible | Ollama sur PC Windows |
| Templates | Typst | 0.14.2 (PDF/UA-1 natif) |
| Mail | nodemailer + SMTP custom | latest |
| Lint/Format | Biome | 2.x (pas ESLint/Prettier) |
| Reverse proxy | Caddy | 2.x |

**Pourquoi Better Auth et pas NextAuth** : Auth.js / NextAuth a fusionné avec Better Auth début 2026, et le repo officiel recommande désormais Better Auth pour les nouveaux projets. Magic link natif, bearer tokens natifs pour MCP, Edge-compatible.

**Pourquoi Typst et pas LaTeX/HTML→PDF** : PDF/UA-1 natif (tags d'accessibilité = ATS-friendly de base), compilation native rapide (50-200ms), syntaxe claire que les LLMs gèrent bien, système de helpers (`#let experience(...)`) réutilisable.

**Pourquoi Bun et pas Node** : démarrage plus rapide, package manager intégré, runtime moderne. Utilisé exclusivement (`bun install`, `bun run dev`, `bun test`).

**Pourquoi pas tRPC, Redis, BullMQ** : pas de besoin en v1. Server Actions Next.js + `unstable_cache` + `revalidateTag` suffisent. À revoir si goulot d'étranglement réel.

---

## 4. Architecture clé à connaître

### Modèle LLM unifié (mode anthropic OU mode local — pas les deux)

Chaque user a un `User.llmConfig` JSON avec un `mode` exclusif. Toutes les tâches LLM passent par le mode actif. **Pas de routing par tâche**. Si `mode = "local"`, tout passe par l'endpoint local (Ollama). Si `mode = "anthropic"`, tout passe par Anthropic API.

**Conséquence importante** : en mode anthropic, **les embeddings sont désactivés** (Anthropic ne fournit pas d'API embeddings native). Le RAG du journal tombe en **full-text Postgres** dégradé. Banière d'info à afficher sur la page journal dans ce cas.

**Toute interaction LLM** passe par `src/server/llm/client.ts`. Pas d'appel direct au SDK Anthropic ou OpenAI ailleurs dans le code. Jamais.

### Profil consolidé vs journal (système hybride)

- **Profil consolidé** = tables structurées (`Experience`, `Skill`, `Education`, `Project`) + sections markdown (`ProfileSection` avec `sectionType` = "pitch" / "voice" / "anti_patterns" / etc.). C'est la source de vérité pour les générations.
- **Journal** = `JournalEntry` append-only, vectorisé si mode local. Stocke les entrées brutes du quotidien.
- **Extraction de faits** : un agent LLM lit les entrées de journal et propose des `ExtractedFact` (candidats de mise à jour du profil). L'utilisateur valide/rejette via UI dédiée.
- **RAG à la génération** : à la création d'un CV/LM, le pipeline injecte top K entrées de journal sémantiquement liées à la JD dans le prompt LLM.

### i18n — deux dimensions distinctes

1. **Langue d'interface** : `next-intl`, fichiers `messages/fr.json` + `messages/en.json`. Routes `/[locale]/...`. `User.uiLocale` pour la préférence.
2. **Langue de contenu** : type `LocalizedText = { fr?: string; en?: string }` sur les champs utilisateur multilingues (`ProfileSection.contentMd`, `Experience.description`, `Project.description`, `Education.diploma`, etc.). Helper `pickLocalized()` avec fallback.

Toute génération a un `Generation.language` hérité de `Campaign.targetLanguage`. **Pas de détection auto** de langue, jamais.

### Snapshots immutables

Chaque `Generation` référence un `ProfileSnapshot` (JSON figé de l'état du profil au moment T). Permet la reproductibilité parfaite : régénérer un CV 6 mois plus tard donne exactement le même résultat si on garde le même snapshot + template + prompt + seed LLM.

### Campagne = offre d'emploi + ses générations

Une `Campaign` regroupe un poste cible (entreprise, role, JD), sa langue cible, et toutes les générations CV/LM associées. Elle a aussi une `CampaignAtsKeywords` (1-1) qui cache les keywords ATS extraits depuis la JD (invalidés si `jdHash` change).

### Templates Typst

Stockés dans `templates/<type>/<name>/` :
- `template.typ` — code Typst avec helpers exposés (`#let experience(...)`, etc.)
- `meta.yaml` — métadonnées : nom, type (CV / cover_letter), langue native, langues supportées, variables exposées, labels par langue
- `preview.png` — capture

Les templates sont **aussi** versionnés en BDD (`Template` + `TemplateVersion`). Le LLM peut les modifier via MCP.

### Wizard d'onboarding obligatoire

Au premier login d'un user dont `onboardingCompleted = false`, redirection forcée vers `/onboarding`. 5 étapes : langue UI, mode LLM, config LLM détaillée, profil minimal, récap. Bloque l'accès au reste de l'app tant qu'il n'est pas complété. Rejouable depuis `/settings`.

---

## 5. Historique des décisions structurantes

Tracé chronologique des choix importants faits dans la conception. Si tu as une idée qui contredit l'un d'eux, **commence par lire pourquoi avant de proposer un changement**.

### Décision : LLM unifié, pas de routing par tâche
**Quand** : conception initiale.
**Choix** : un seul mode actif (`anthropic` ou `local`) couvre toutes les tâches LLM de l'utilisateur. Pas de table de routing par tâche (génération sur Opus, extraction sur Haiku, etc.).
**Raison** : simplicité opérationnelle + cohérence des résultats (un seul modèle = comportement homogène).
**Conséquence** : en mode anthropic, RAG sémantique désactivé (pas d'embeddings Anthropic) → fallback full-text Postgres.

### Décision : mode local par défaut
**Quand** : après définition du mode unifié.
**Choix** : `User.llmConfig.mode` initialisé à `"local"` pour tout nouveau user.
**Raison** : positionnement self-hosted + confidentialité prioritaire. L'utilisateur peut basculer vers Anthropic au wizard ou plus tard.

### Décision : `personality.md` n'est pas une source de vérité runtime
**Quand** : conception du modèle de données.
**Choix** : le fichier `personality.md` est ingéré une fois au bootstrap (seed initial) dans `prisma/seed.ts`. Ensuite jamais relu. La BDD est la source unique.
**Raison** : éviter la dérive entre fichier et BDD ; permettre l'édition fine depuis l'UI sans risquer un overwrite par le seed.
**Conséquence** : feature d'export markdown ajoutée (l'utilisateur peut exporter sa BDD vers un nouveau `personality.md` à tout moment).

### Décision : SMTP custom, pas de service managé
**Quand** : choix auth.
**Choix** : `nodemailer` + SMTP fourni par l'utilisateur (Freebox SMTP, Gmail relay, Mailcow, etc.), pas de Resend/SendGrid managé.
**Raison** : cohérence avec le positionnement self-hosted.

### Décision : table dédiée pour le cache ATS keywords, liée à Campaign
**Quand** : conception du scoring ATS.
**Choix** : `CampaignAtsKeywords` en relation 1-1 avec `Campaign`. Invalidé si `jdHash` (SHA256 de la JD) change.
**Raison** : une campagne = une offre d'emploi + ses générations. Le cache vit naturellement au niveau de la campagne, pas en cache global.

### Décision : pas de détection auto de langue
**Quand** : conception i18n.
**Choix** : `Campaign.targetLanguage` choisie explicitement par l'user. `JournalEntry.language` défaut = `User.uiLocale`, modifiable manuellement. Pas de lib type `franc` ou `cld3`.
**Raison** : déterminisme et simplicité. La détection auto introduit des bugs subtils (mauvaise langue détectée sur un texte court).

### Décision : multi-user dès le départ
**Quand** : conception initiale.
**Choix** : tables `User` + `user_id` partout, même si seul l'utilisateur principal utilisera l'app en pratique.
**Raison** : architecture propre, coût marginal de l'ajouter dès le départ vs refactor douloureux plus tard.

### Décision : Mantine 9 + CSS Modules, pas de Tailwind
**Quand** : choix UI.
**Choix** : Mantine 9 (CSS Modules natifs) couvre 95% des composants. Wrappers thématisés au besoin.
**Raison** : composants UI riches déjà disponibles, perf SSR meilleure que Tailwind sur Next 16, cohérence avec le design fourni.

### Décision : palette magenta `#c4006d` comme accent unique
**Quand** : design.
**Choix** : un seul accent coloré, calque du CV PDF de référence de l'utilisateur.
**Raison** : sobriété + identité visuelle cohérente avec sa marque perso. Utilisé avec parcimonie (CTAs primaires, états actifs).

### Décision : Geist Sans + Geist Mono (ou Inter + JetBrains Mono en fallback)
**Quand** : design.
**Choix** : polices modernes sans serif. Pas de serif, pas de display.
**Raison** : densité d'info + lisibilité dark mode + esthétique alignée Linear/Vercel/Anthropic Console.

### Décision : abandonner qwen3.5:9b au profit de qwen2.5-coder:14b ou qwen2.5:14b
**Quand** : après premier essai de génération CV.
**Choix** : ne plus utiliser de reasoning model pour la génération.
**Raison** : qwen3.5 (reasoning hybride) ignore `/no_think` et `enable_thinking:false`, génère 3000+ tokens de `<think>` par CV (3 min gaspillées), et produit du Typst syntaxiquement faux (`margin-horizontal`, `## titre`).
**Solution** : passage à un modèle **instruct non-reasoning**. qwen2.5-coder:14b en premier (le Typst est code-like), qwen2.5:14b en fallback. Plus le fix défensif `num_ctx` forcé.

### Décision : refactor du cv-generator avec balises XML et anti-patterns syntaxiques explicites
**Quand** : suite au problème qwen3.5.
**Choix** : restructurer le prompt en balises `<template>`, `<profile>`, `<campaign>`, `<journal_context>`, `<task>` au lieu de headers Markdown. System prompt nomme explicitement les confusions à éviter (Markdown `## Title`, CSS `margin-horizontal`, HTML `<br>`, LaTeX `\section{}`) avec corrections Typst.
**Raison** : les balises XML sont sans ambiguïté pour les LLMs (Anthropic les recommande, les Qwen/Llama les gèrent aussi). Nommer les pièges réduit drastiquement les hallucinations syntaxiques.

---

## 6. Setup LLM local — état actuel

### Hardware

- **PC Windows** : Ryzen 7 5700G + 32GB RAM + RTX 3060 Ti (8GB VRAM)
- **Serveur app** : Freebox Delta via Docker Compose
- **Communication** : LAN privé, app appelle l'endpoint Ollama via `http://<IP_PC_Windows>:11434/v1`

### Logiciel

- **Ollama** sur Windows, exposé sur `0.0.0.0:11434` (variable env `OLLAMA_HOST`), firewall port 11434 ouvert
- Démarrage automatique au boot Windows (service par défaut)

### Modèles installés

| Usage | Modèle | Taille VRAM | Commande pull |
|---|---|---|---|
| Chat principal (générations, scoring ATS, traduction) | `qwen2.5-coder:14b-instruct` | ~9GB (partial offload 1-3 layers CPU) | `ollama pull qwen2.5-coder:14b-instruct` |
| Fallback chat si qualité moindre en français | `qwen2.5:14b-instruct` | ~9GB | `ollama pull qwen2.5:14b-instruct` |
| Tâches courtes (extraction faits journal) | `llama3.2:3b` | ~4GB (full GPU) | `ollama pull llama3.2:3b` |
| Embeddings (RAG journal) | `nomic-embed-text` | ~300MB, 768 dims | `ollama pull nomic-embed-text` |

**Contrainte clé** : contexte LLM ≤ 8K tokens pour éviter le spill VRAM → RAM système (5x perte de perf). Le code career-hub tronque agressivement le profil sérialisé et limite à 10 entrées de journal max en RAG.

**Performance estimée** : ~15-20 tokens/sec sur qwen2.5-coder:14b-instruct Q4 avec 1-3 layers offload CPU. Une génération CV ≈ 1500-2500 tokens output, soit ~2 minutes par CV. Acceptable pour usage non temps réel.

### Points d'attention

- **PC Windows toujours allumé** sinon génération impossible. Si l'utilisateur préfère éteindre la nuit : Wake-on-LAN + magic packet avant chaque appel LLM (30s cold start), OU acheter un mini-PC dédié type Mac Mini M4 (20W au repos).
- **Pas d'auth sur Ollama par défaut**. OK en LAN privé. Si exposition externe un jour : reverse proxy Caddy avec bearer token (career-hub supporte déjà `apiKey` optionnel sur l'endpoint local).
- **Monitoring VRAM** : `nvidia-smi` ou Task Manager > Performance > GPU pour vérifier qu'il n'y a pas de spill RAM système.

---

## 7. Méthodologie de travail avec Claude Code

### Principe général

Le projet est ambitieux (8 phases : fondations, génération, i18n contenu, LM, journal+RAG, ATS, MCP, polish). Trop pour une seule run autonome aveugle. Travailler **phase par phase**, avec **commits fréquents** pour permettre review/rollback.

### Au début de chaque session Claude Code

1. **Lire les fichiers de suivi** : `PROGRESS.md`, `DECISIONS.md`, `BLOCKERS.md`, `IDEAS.md`. État courant du projet.
2. **Lire ce `PROJECT_CONTEXT.md`** intégralement.
3. **Lire `CLAUDE.md`** au minimum sections 1, 2, 4, 5, 6, 7, 15. Si tâche touche une zone spécifique, lire la section correspondante.
4. **Confirmer en une phrase ce qui est compris** et ce qui va être fait dans cette session.

### Pendant le travail

- Toute interaction LLM passe par `src/server/llm/client.ts`. Pas d'appel direct ailleurs.
- Toute UI string passe par `next-intl`. Pas d'exception.
- Tout champ utilisateur textuel évalue si `LocalizedText` est pertinent.
- Validation Zod systématique sur toutes les Server Actions.
- Commits conventionnels (`feat(scope):`, `fix(scope):`, `refactor(scope):`, `chore(scope):`, `docs(scope):`, `test(scope):`, `i18n(scope):`). Scope : `profile`, `journal`, `ats`, `mcp`, `auth`, `db`, `i18n`, `templates`, `llm`, `mail`, `design`.
- Avant chaque commit : `bun run build` doit passer. Si rouge, soit corriger, soit retirer le changement.

### Quand bloqué

- Si bloqué > 4 tentatives sur un problème : stub propre + entrée dans `BLOCKERS.md` + continuer sur autre chose.
- Si une décision technique est ambiguë : choisir l'option la plus simple/standard, documenter dans `DECISIONS.md`, continuer sans bloquer.
- **Ne jamais inventer une vraie clé API/secret.** Toujours placeholder dans `.env.example` + valeur factice dans `.env` local.

### Fin de session

- Mettre à jour `PROGRESS.md`.
- Si décisions structurantes prises pendant la session : les ajouter dans `DECISIONS.md` ET dans ce `PROJECT_CONTEXT.md` section 5 (Historique).
- Commit final propre, build vert.
- Ne **pas** push remote sans accord explicite.

---

## 8. Prompts réutilisables

Templates copiables-collables pour démarrer une session Claude Code rapidement.

### A. Démarrage de session standard

```
Lis PROJECT_CONTEXT.md, PROGRESS.md, DECISIONS.md, BLOCKERS.md à la racine.
Lis CLAUDE.md (sections 1, 2, 4, 5, 6, 7, 15 minimum).
Confirme-moi en une phrase l'état du projet et ce que je peux te demander aujourd'hui.
```

### B. Continuer la phase en cours

```
Lis PROJECT_CONTEXT.md et PROGRESS.md. Continue la phase courante là où elle s'est arrêtée, en respectant les conventions de CLAUDE.md (section 15) et les règles de méthodologie de PROJECT_CONTEXT.md (section 7). Commit conventionnel après chaque sous-tâche, build vert obligatoire.
```

### C. Implémenter une feature spécifique

```
Lis PROJECT_CONTEXT.md et la section pertinente de CLAUDE.md.

Je veux implémenter : [DÉCRIRE LA FEATURE]

Avant d'écrire du code :
1. Confirme-moi quels fichiers tu vas créer/modifier
2. Identifie les impacts sur le modèle de données et l'i18n
3. Liste les décisions de design que tu vas devoir prendre

Une fois ce plan validé, implémente proprement avec tests, validation Zod, et commits conventionnels.
```

### D. Debug d'un problème

```
Lis PROJECT_CONTEXT.md (notamment section 5 "Historique des décisions" pour ne pas remettre en cause un choix déjà documenté).

Problème : [DÉCRIRE LE BUG]

Reproduction : [ÉTAPES]

Logs / erreurs : [COLLER]

Diagnostique d'abord, propose une correction minimale, puis applique-la avec un test qui couvre le cas. Commit conventionnel `fix(<scope>):`.
```

### E. Refactor d'un agent LLM (prompts)

```
Lis le fichier src/server/llm/prompts/<agent>.ts.
Lis PROJECT_CONTEXT.md section 5 (décisions sur les prompts) et la version refactorisée de cv-generator.ts pour le pattern de référence (balises XML, anti-patterns syntaxiques nommés, anti-think guard).

Refactore <agent>.ts dans le même esprit :
- System prompt structuré en sections nommées
- Anti-thinking explicite si applicable
- User prompt en balises XML-like
- Sections narratives extraites du profil si pertinent

Garde l'API publique stable. Test snapshot sur un cas de référence.
```

### F. Ajouter une décision au registre

```
Une décision structurante a été prise : [DÉCISION].

Ajoute-la dans :
1. DECISIONS.md (entrée datée standard)
2. PROJECT_CONTEXT.md section 5 (entrée narrative avec : Quand, Choix, Raison, Conséquence)

Commit `docs(decisions): add <slug>`.
```

### G. Review de session précédente

```
Lis le git log des 20 derniers commits.
Lis PROGRESS.md, DECISIONS.md, BLOCKERS.md mis à jour récemment.

Donne-moi un récap en 5 points :
1. Ce qui a été terminé
2. Ce qui est partiel/mocked
3. Décisions à valider (DECISIONS.md récent)
4. Blockers à résoudre
5. Suggestion d'action prioritaire suivante
```

---

## 9. Anti-patterns globaux (rappel)

À ne JAMAIS faire dans le projet, peu importe la phase ou le contexte.

### Code

- ❌ Appels LLM directs depuis ailleurs que `src/server/llm/client.ts`
- ❌ Strings UI hardcodées (toujours next-intl)
- ❌ `useEffect` pour fetcher des données (Server Components / Server Actions)
- ❌ `tRPC`, `Redux`, `Zustand` global, `axios`, `moment`/`dayjs` lourd
- ❌ Détection auto de langue
- ❌ `getServerSideProps` (Pages Router obsolète)
- ❌ Appels API REST custom quand une Server Action suffit
- ❌ Push remote sans demande explicite

### LLM / prompts

- ❌ Reasoning models (`qwen3:thinking`, `o1`, etc.) pour la génération de CV/LM (cf. décision section 5)
- ❌ Markdown headers `##` dans le user prompt (utiliser balises XML)
- ❌ Backticks Markdown autour du code Typst (utiliser balises XML)
- ❌ JSON brut massif sans extraction des sections narratives (voice, anti_patterns)

### Design

- ❌ Gradients colorés en arrière-plan large
- ❌ Animations entrantes de cards en cascade
- ❌ Glassmorphism / blur excessif
- ❌ Dark mode avec noir absolu `#000`
- ❌ Couleur accent en couleur de fond de bloc large
- ❌ Photo sur CV, barres de progression sur compétences
- ❌ Emojis dans la chrome

### Contenu (CV/LM générés)

- ❌ Phrases-types creuses ("passionné par", "force de proposition", "esprit d'équipe")
- ❌ Adjectifs auto-déclaratifs sur soft skills (les démontrer par les faits)
- ❌ Invention de la moindre donnée (expérience, techno, date, chiffre)
- ❌ Verbes au passé pour des expériences en cours

---

## 10. Décisions encore ouvertes

État à mai 2026. À mettre à jour quand l'une est tranchée.

- [ ] **PC Windows toujours allumé ?** Conso ~80W au repos. Alternatives : Wake-on-LAN + magic packet avant appel LLM (30s cold start) OU mini-PC dédié (Mac Mini M4 = 20W) OU passage temporaire mode Anthropic.
- [ ] **Reranking RAG ?** Infinity ou TEI en complément d'Ollama. Pas pour V1 (over-engineering au volume personnel).
- [ ] **Stratégie SMTP exacte** : Freebox SMTP, Gmail app password, ou Mailcow perso ? À configurer au moment d'activer `AUTH_ENABLED=true`.
- [ ] **Modèle chat final** : qwen2.5-coder:14b-instruct vs qwen2.5:14b-instruct, à arbitrer après quelques générations comparées.
- [ ] **Backup automatique BDD** : cron `pg_dump` quotidien + rotation. À implémenter en phase 8.

---

## 11. Glossaire (termes propres au projet)

- **Profil consolidé** : sections markdown + tables structurées en BDD. Source de vérité unique.
- **`personality.md`** : fichier de seed initial uniquement. Aussi format d'export disponible.
- **Journal** : flux append-only d'entrées brutes. Vectorisé en mode local.
- **Fait extrait** (`ExtractedFact`) : candidat de mise à jour du profil dérivé d'une entrée journal. Doit être validé.
- **Snapshot** : état figé du profil à un instant T, attaché à chaque génération.
- **Campagne** : contexte d'une candidature (entreprise, poste, JD, langue cible). Une campagne = une offre d'emploi + ses générations associées + son cache de keywords ATS.
- **Génération** : production immutable d'un CV/LM avec template + snapshot + prompt + output. Hérite de la langue de sa campagne.
- **Template** : code Typst paramétrable produisant un PDF. Une langue native + langues supportées.
- **ATS** : Applicant Tracking System. Logiciel de filtrage automatique des CV.
- **`LocalizedText`** : objet `{ fr?, en? }` représentant un texte multilingue.
- **Mode LLM** : `"anthropic"` (tout via Anthropic API) ou `"local"` (tout via endpoint OpenAI-compatible). Choisi par utilisateur, exclusif. **Défaut : `"local"`**.
- **Endpoint LLM local** : URL OpenAI-compatible configurée par l'utilisateur (Ollama, LM Studio, llama.cpp server).
- **Wizard d'onboarding** : flow multi-étapes obligatoire au premier login. Set `User.onboardingCompleted = true` à la fin. Rejouable depuis `/settings`.

---

## 12. Méta-info de ce document

**À mettre à jour** :
- Section 1 "État courant" — à chaque jalon significatif (fin de phase, changement de modèle LLM, gros refactor)
- Section 5 "Historique des décisions" — à chaque décision structurante (un nouvel item dans la liste, daté)
- Section 6 "Setup LLM local" — si hardware/modèles changent
- Section 10 "Décisions encore ouvertes" — quand une décision est tranchée (la retirer) ou apparaît (l'ajouter)

**À ne pas modifier sans réflexion** :
- Section 2 "Vue d'ensemble"
- Section 3 "Stack technique" (sauf bump de version)
- Section 4 "Architecture clé"
- Section 9 "Anti-patterns globaux"

**Propriétaire** : le mainteneur du projet. Toute modification structurante de l'architecture doit passer par lui (cf. `CLAUDE.md` section 15 "Quand demander au mainteneur").

---

*Document créé pour servir de mémoire institutionnelle du projet career-hub. Dernière mise à jour : juin 2026.*
