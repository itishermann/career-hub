# career-hub

**Hub de carrière personnel, auto-hébergé.** Centralise un profil structuré et un journal d'entrées brutes, puis génère à la demande des **CV** et **lettres de motivation** contextualisés via LLM — avec **scoring ATS**, historisation immuable, templates Typst versionnés, et le tout **bilingue FR/EN**.

> Conçu pour tourner sur une machine perso (Docker Compose, type Freebox/NAS/VPS), sans dépendance cloud propriétaire. Le LLM est **local par défaut** (endpoint OpenAI-compatible, ex. Ollama) ou **Anthropic**, au choix de chaque utilisateur.

---

## ✨ Fonctionnalités

- **Profil structuré bilingue** — identité, expériences, compétences, formation, projets, sections narratives (pitch, voix, anti-patterns…), chaque champ texte en FR **et** EN.
- **Journal append-only** — notes brutes ; en mode local, indexées sémantiquement (pgvector) et exploitées en RAG lors des générations.
- **Génération CV / LM** — produit du **Typst** compilé en PDF/UA-1 (ATS-friendly), calibré sur le profil + la description de poste de la campagne.
- **Scoring ATS en 4 étages** — extraction texte, heuristiques structurelles, match des mots-clés de l'offre (extraits par LLM, cachés par campagne), analyse contextuelle. Boucle d'amélioration : régénère en visant ≥ 80 de score / 80 % de couverture mots-clés.
- **Campagnes** — une offre d'emploi = une campagne (entreprise, poste, JD, langue cible) + ses générations + son cache de mots-clés.
- **Historisation** — chaque génération est immuable et reproductible (snapshot du profil figé au moment T).
- **Templates en code** — CV/LM sont du Typst paramétrable, modifiable à la main ou par le LLM.
- **Serveur MCP** — l'API métier est exposée en MCP (auth bearer) pour piloter le hub depuis Claude Code / Claude Desktop.

---

## 🧱 Stack

| Couche | Techno |
|---|---|
| Runtime | **Bun** 1.3 |
| Framework | **Next.js** 16 (App Router, Server Actions) |
| UI | **Mantine** 9 · i18n **next-intl** (FR/EN) |
| ORM / BDD | **Prisma** 7 · **PostgreSQL** 18 + **pgvector** |
| Auth | **Better Auth** (magic link + bearer) |
| LLM | **Vercel AI SDK** — Anthropic *ou* endpoint OpenAI-compatible local |
| Embeddings | `@huggingface/transformers` (local) ou endpoint local |
| Templates | **Typst** (compilateur natif embarqué via `@myriaddreamin/typst-ts-node-compiler`) |
| ATS | `pdfjs-dist` (extraction texte PDF) |
| Lint/format | **Biome** |

---

## ✅ Prérequis

- [**Bun**](https://bun.sh) ≥ 1.3
- **Docker** + Docker Compose (pour PostgreSQL ; pas besoin d'installer Postgres soi-même)
- *(optionnel)* un **endpoint LLM local** OpenAI-compatible (ex. [Ollama](https://ollama.com)) si tu veux le mode local. Pour juste essayer, le **mode `mock`** ne demande rien.

> Le compilateur Typst est fourni par un paquet npm natif — **aucune installation séparée** de Typst n'est nécessaire.

---

## 🚀 Installation & premier lancement (dev)

```bash
# 1. Dépendances
bun install

# 2. Configuration : copie le fichier d'exemple et ajuste
cp .env.example .env
#   → au minimum, pour un essai local rapide :
#     AUTH_ENABLED=false           (bypass auth : un utilisateur de dev est injecté)
#     DEFAULT_LLM_MODE=mock        (génération sans clé ni endpoint)
#     DATABASE_URL=postgres://career:dev-password@localhost:5432/career_hub
#     BETTER_AUTH_SECRET=<une chaîne aléatoire>

# 3. Base de données (Postgres + pgvector dans Docker)
bun run db:up          # démarre le conteneur Postgres
bun run db:migrate     # applique les migrations Prisma
bun run db:seed        # installe les templates + un profil de démo (Jean Dupont)

# 4. Lancement
bun run dev            # → http://localhost:3000
```

Ouvre **http://localhost:3000**. Avec `AUTH_ENABLED=false`, tu es connecté automatiquement sur l'admin de démo ; sinon, un lien magique est envoyé par email (voir SMTP plus bas).

> 💡 **Essai express** : `AUTH_ENABLED=false` + `DEFAULT_LLM_MODE=mock` te permet de parcourir toute l'app et de générer un CV/LM (sortie canned) **sans aucune clé d'API ni endpoint LLM**.

---

## ⚙️ Configuration (`.env`)

Les variables clés (voir `.env.example` pour la liste complète) :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion Postgres (`postgres://career:<pwd>@localhost:5432/career_hub`) |
| `DB_PASSWORD` | Mot de passe du conteneur Postgres (défaut `dev-password`) |
| `AUTH_ENABLED` | `false` = bypass auth (dev) ; `true` = magic link obligatoire |
| `BETTER_AUTH_SECRET` | Secret de session Better Auth (obligatoire) |
| `BETTER_AUTH_URL` | URL publique de l'app (ex. `http://localhost:3000`) |
| `TRUSTED_ORIGINS` | Origines autorisées (CSRF / CORS) |
| `BOOTSTRAP_ADMIN_EMAIL` | Email de l'admin créé au seed |
| `DEFAULT_LOCALE` | Langue UI par défaut (`fr` / `en`) |
| `DEFAULT_LLM_MODE` | Mode LLM initial du seed (`mock` / `local` / `anthropic`) |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASSWORD` `SMTP_FROM` | SMTP perso pour le magic link (requis si `AUTH_ENABLED=true`) |

> ⚠️ Aucun service tiers managé : tu fournis ton **propre SMTP** (Freebox, relais Gmail, Mailcow…) et ton **propre endpoint LLM** si tu choisis le mode local.

---

## 🧭 Onboarding (premier login)

Au premier login d'un utilisateur dont l'onboarding n'est pas terminé, un **wizard** bloque l'accès au reste de l'app tant qu'il n'est pas complété :

1. **Bienvenue + langue UI** — sélecteur FR/EN (défaut FR).
2. **Mode LLM** — toggle **Local** (sélectionné par défaut, orienté confidentialité) / **Anthropic**, avec les implications :
   - *Local* : RAG sémantique du journal activé, tout reste sur ton réseau, coût nul.
   - *Anthropic* : RAG dégradé en recherche plein-texte, données envoyées à Anthropic, tokens facturés.
3. **Config LLM détaillée** selon le mode :
   - *Local* : URL de l'endpoint, clé API optionnelle, bouton **« Tester la connexion »** (liste les modèles via `/models`), sélection du modèle de chat + du modèle d'embeddings + dimension (validée par un appel test `/embeddings`).
   - *Anthropic* : clé API (champ masqué, validée par un appel `/v1/messages` minimal), sélection du modèle de chat (Opus / Sonnet / Haiku).
4. **Profil minimal** — nom, ville (skippable).
5. **Récapitulatif** — bouton « Terminer » → `onboardingCompleted = true` → redirection vers `/profile`.

Le wizard est **rejouable** depuis `/settings` (« Relancer le wizard ») sans perte de données.

> Après l'onboarding : édite ton profil dans `/profile`, crée une campagne dans `/campaigns`, puis génère un CV/LM et score-le contre l'offre.

---

## 🛠️ Scripts utiles

| Commande | Action |
|---|---|
| `bun run dev` | Serveur de dev (http://localhost:3000) |
| `bun run build` / `bun run start` | Build & run production |
| `bun run db:up` / `db:down` | Démarrer / arrêter Postgres (Docker) |
| `bun run db:migrate` | Appliquer les migrations (dev) |
| `bun run db:seed` | Seed templates + profil de démo |
| `bun run db:reset` | Reset complet de la BDD |
| `bun run db:studio` | Prisma Studio |
| `bun test` | Tests unitaires |
| `bun run e2e` | Tests end-to-end (Playwright) |
| `bun run lint` / `format` | Biome |

---

## 🚢 Déploiement

Le `docker-compose.yml` à la racine ne lance que **Postgres** (pour le dev). La topologie de production visée — **app + base + reverse-proxy Caddy (HTTPS auto)** sur Docker Compose — est décrite dans **`AGENTS.md` § 13**. En production, l'entrypoint (`docker-entrypoint.sh`) applique les migrations (`prisma migrate deploy`) au démarrage ; le seed reste une opération ponctuelle.

---

## 📚 Documentation

- **`AGENTS.md`** — spécification complète du projet : vision, modèle de données, conventions de code, workflow LLM, templates Typst, scoring ATS, serveur MCP, déploiement, plan d'implémentation.
- `docs/superpowers/` — specs & plans techniques (file de jobs en arrière-plan, RAG local…).
