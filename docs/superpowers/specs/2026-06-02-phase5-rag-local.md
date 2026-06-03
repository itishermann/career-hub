# Phase 5 — RAG local (slice 1) — Design

*Date : 2026-06-02 · Statut : approuvé*

## Contexte

La Phase 5 du projet (journal + RAG) était partielle : CRUD journal + recherche ILIKE,
colonne `JournalEntry.contentEmbedding vector(768)` présente mais jamais remplie, modes
LLM `local`/`anthropic` retombant sur le provider `mock`. Ce slice câble **le RAG réel** :
un provider LLM local (Ollama, endpoint OpenAI-compatible sur le LAN), des embeddings
persistés en pgvector, une recherche sémantique, et l'injection des entrées de journal
pertinentes dans la génération de CV/LM.

Hors de ce slice (slice 2 ultérieur) : agent extracteur de faits + UI de réconciliation,
upgrade tsvector du full-text anthropic, provider Anthropic réel.

Environnement cible validé : Ollama sur `192.168.1.196:11434`, chat `qwen3.5:9b`,
embeddings `nomic-embed-text` (dim **768**, matche le schéma → aucune migration de colonne).

## Architecture

```
addJournalEntry ─► create row ─► embed(content) ─► UPDATE contentEmbedding   (best-effort)
searchJournal    ─► embed(query) ─► ORDER BY contentEmbedding <=> q LIMIT k   (local/mock)
                 └► ILIKE                                                     (anthropic)
generateCv/Lm    ─► retrieveJournalContext(role+JD) ─► top-K ─► journalExcerpts ─► prompt
```

### Modules (une responsabilité chacun)

| Module | Rôle | Dépend de |
|---|---|---|
| `src/server/llm/providers/local.ts` | Provider `LlmProvider` réel via `@ai-sdk/openai-compatible` (chat, generateObject, stream, embed). `embed()` assert dim == config. | `ai`, `@ai-sdk/openai-compatible` |
| `src/server/rag/pgvector.ts` | **Tout** le SQL brut pgvector : `toVectorLiteral`, `storeEntryEmbedding`, `semanticSearchEntries`, `entriesMissingEmbedding`. | `db` ($queryRaw/$executeRaw) |
| `src/server/rag/retrieve.ts` | `retrieveJournalContext({userId, queryText, k, mode, llmConfig})` : sémantique (local/mock) ou full-text (anthropic). | pgvector, llm client |

### Édits

- `client.ts` : `case "local"` → `localProvider(ctx)` (retire le fallback mock). Anthropic reste mock (hors scope).
- `actions/journal.ts` : embed best-effort à l'écriture ; `searchJournal` sémantique ; `reindexJournal()` backfill.
- `actions/generations.ts` : `generateCv`/`generateLm` injectent `journalExcerpts` (top-10).
- `llm/prompts/lm-generator.ts` : accepte `journalExcerpts` (le CV l'a déjà).
- `actions/settings.ts` (ou nouveau `actions/llm-test.ts`) : `testLocalConnection`.
- `components/settings/LlmSettingsForm.tsx` + onboarding : bouton "Tester la connexion".
- Migration `add_journal_hnsw_index`.

## Décisions

1. **AI SDK openai-compatible** (vs fetch brut) : streaming + generateObject + cohérence.
2. **Embed inline best-effort** : pas de queue (contrainte v1). L'écriture réussit toujours ;
   échec d'embed loggé, entrée retrouvable en full-text, rattrapable via `reindexJournal`.
3. **Mode mock stocke des vecteurs déterministes** → chemin pgvector testable sans la box LAN.
   Mode anthropic = aucun embedding (RAG dégradé = full-text), conforme au spec produit.
4. **Pas de chunking** : entrée ≤ 8000 chars = 1 vecteur. YAGNI.
5. **Dim figée 768** ; `local.embed()` throw clair si le modèle renvoie une autre dim.
6. **SQL pgvector isolé** dans un seul module ; le reste de l'app reste typé Prisma.
7. Colonne réelle = `"contentEmbedding"` (camelCase quoté, pas snake_case).

## Vérification

- **Unit** : `toVectorLiteral` (format `[a,b,c]`), sélection du fallback par mode dans `retrieve`.
- **Dev sans box** (mode mock) : add entry → vecteur déterministe stocké → search via pgvector
  (plomberie) → build + tests verts.
- **E2E avec box LAN** (mode local) : `/settings/llm` test connexion OK ; add entry → `psql`
  montre `contentEmbedding` non-null ; recherche sémantique rankée ; onglet *Prompt* d'une
  génération contient les `journalExcerpts`.

## Guide d'installation — Ollama sur la box LAN

```bash
# Sur la machine LAN (192.168.1.196) :
curl -fsSL https://ollama.com/install.sh | sh         # Linux ; ou l'app Ollama sur Mac
ollama pull nomic-embed-text                           # embeddings 768d
ollama pull qwen3.5:9b                                 # chat (ajuster selon VRAM)

# Exposer sur le LAN (sinon Ollama n'écoute que 127.0.0.1) :
#   - Linux systemd : Environment="OLLAMA_HOST=0.0.0.0:11434" dans le service, puis restart
#   - lancement manuel : OLLAMA_HOST=0.0.0.0:11434 ollama serve
# Firewall : autoriser le port 11434/tcp entrant.

# Vérifier depuis le Mac :
curl http://192.168.1.196:11434/v1/models
curl http://192.168.1.196:11434/v1/embeddings \
  -H 'Content-Type: application/json' \
  -d '{"model":"nomic-embed-text","input":"test"}'   # data[0].embedding doit faire 768

# Côté career-hub : /settings/llm → mode Local
#   endpoint        = http://192.168.1.196:11434/v1
#   chat model      = qwen3.5:9b
#   embedding model = nomic-embed-text
#   embedding dim   = 768
```

Notes : l'app tourne en `bun run dev` sur le Mac et joint l'endpoint directement (la base
Postgres en Docker n'a rien à voir avec le LLM). Si l'endpoint est down, les écritures de
journal réussissent sans vecteur ; relancer `reindexJournal` une fois la box revenue.
