/**
 * Mock LLM provider — canned, deterministic responses.
 *
 * Drives the full pipeline (CV/LM generation, ATS scoring, fact extraction,
 * translation) without any external API. Used as the default in dev and as a
 * fallback when real providers are not yet wired (phase 1).
 *
 * Each task tag produces a different shape of response. When the task is
 * unknown, a generic "lorem-ipsum style" plausible answer is returned.
 */

import type { z } from "zod";
import type {
  LlmCallContext,
  LlmJsonResult,
  LlmProvider,
  LlmStreamChunk,
  LlmTextResult,
} from "../client";

const MOCK_MODEL = "mock-1";

export function mockGenerator(ctx: LlmCallContext): LlmProvider {
  const task = ctx.task ?? "generic";

  return {
    mode: "mock",
    model: MOCK_MODEL,

    async generateText({ prompt }): Promise<LlmTextResult> {
      const start = Date.now();
      const text = mockTextForTask(task, prompt);
      return {
        text,
        provider: "mock",
        model: MOCK_MODEL,
        usage: {
          inputTokens: Math.ceil(prompt.length / 4),
          outputTokens: Math.ceil(text.length / 4),
          costCents: 0,
          durationMs: Date.now() - start,
        },
      };
    },

    async generateJson<T>({
      prompt,
      schema,
    }: {
      system?: string;
      prompt: string;
      schema: z.ZodType<T>;
    }): Promise<LlmJsonResult<T>> {
      const start = Date.now();
      const candidate = mockJsonForTask(task, prompt);
      const parsed = schema.safeParse(candidate);
      if (!parsed.success) {
        throw new Error(
          `mock provider: canned JSON for task=${task} does not match schema. Issues: ${JSON.stringify(parsed.error.issues)}`,
        );
      }
      const data = parsed.data;
      return {
        data,
        provider: "mock",
        model: MOCK_MODEL,
        usage: {
          inputTokens: Math.ceil(prompt.length / 4),
          outputTokens: Math.ceil(JSON.stringify(data).length / 4),
          costCents: 0,
          durationMs: Date.now() - start,
        },
      };
    },

    async *streamText({ prompt }): AsyncIterable<LlmStreamChunk> {
      const text = mockTextForTask(task, prompt);
      const chunks = text.match(/.{1,40}/gs) ?? [text];
      for (const chunk of chunks) {
        yield { type: "text", text: chunk };
        await new Promise((r) => setTimeout(r, 25));
      }
      yield { type: "done" };
    },

    async embed({ text }) {
      // Deterministic pseudo-embedding from text hash. Useful for in-dev RAG smoke tests.
      const dim = 768;
      const vec = new Array<number>(dim);
      let seed = 0;
      for (let i = 0; i < text.length; i++)
        seed = (seed * 31 + text.charCodeAt(i)) >>> 0;
      for (let i = 0; i < dim; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        vec[i] = (seed / 0xffffffff - 0.5) * 0.1;
      }
      return { vector: vec, model: "mock-embed-768" };
    },
  };
}

// ---------------------------------------------------------------------------
// Canned response banks
// ---------------------------------------------------------------------------

function mockTextForTask(task: string, prompt: string): string {
  if (task.startsWith("cv:typst")) {
    return MOCK_CV_TYPST;
  }
  if (task.startsWith("lm:typst")) {
    return MOCK_LM_TYPST;
  }
  if (task.startsWith("translate")) {
    return `[MOCK TRANSLATION]\n${prompt.slice(0, 600)}`;
  }
  if (task.startsWith("ats:contextual")) {
    return MOCK_ATS_CONTEXTUAL_NARRATIVE;
  }
  return `Mock response for task=${task}.\nPrompt preview: ${prompt.slice(0, 200)}`;
}

function mockJsonForTask(task: string, _prompt: string): unknown {
  if (task.startsWith("ats:keywords")) return MOCK_ATS_KEYWORDS;
  if (task.startsWith("ats:score")) return MOCK_ATS_SCORE;
  if (task.startsWith("journal:extract")) return MOCK_EXTRACTED_FACTS;
  return { mock: true, task };
}

// ---------------------------------------------------------------------------
// Canned content — kept short, plausible, language-aware enough for tests.
// ---------------------------------------------------------------------------

const MOCK_CV_TYPST = `#set page(paper: "a4", margin: (x: 1.6cm, y: 1.5cm))
#set text(font: "Inter", size: 10pt)

#align(center)[
  #text(size: 18pt, weight: 700)[Jean Dupont]
  #v(2pt)
  #text(size: 9pt, fill: rgb("#5c6370"))[
    Développeur fullstack senior · Lyon, France
  ]
]

== Pitch
Développeur fullstack avec 5 ans d'expérience — React, React Native, Node, Python, .NET.
Architecte logiciel sur une plateforme santé US, à l'aise du frontend à l'infrastructure.

== Expériences
*Helios Santé* — Architecte logiciel — avril 2026 → présent
- Mise en place d'une architecture backend Python scalable intégrant IA et Sentry
- Task scheduler custom Python (APScheduler + SQLModel + PostgreSQL)
- Cache mémoire partagé HIPAA-compliant pour FastAPI multi-worker
- _Stack : Python, FastAPI, React Native, PostgreSQL, AWS, Sentry_

*Studio Caravelle* — Développeur fullstack — juillet 2025 → juin 2026
- Interfaces de télétransmission de feuilles de soins
- Rapports d'activité PDF générés depuis Azure DevOps
- _Stack : React, TypeScript, Azure DevOps_

== Compétences
*Langages* : TypeScript, Python, C#, Rust (en cours)
*Frontend* : React, React Native, Next.js, SvelteKit, Mantine
*Backend* : Node.js, FastAPI, NestJS, ASP.NET, GraphQL
*Infra* : Docker, Kubernetes, Argo CD, AWS, Sentry, GitLab CI
`;

const MOCK_LM_TYPST = `#set page(paper: "a4", margin: (x: 1.8cm, y: 2cm))
#set text(font: "Inter", size: 10.5pt)

Jean Dupont
Lyon, France
jean.dupont\\@example.com

#v(20pt)

*Objet : candidature au poste — réf. mock*

Bonjour,

Votre annonce m'a interpellé : l'architecture, la scalabilité et la conformité santé sont précisément les sujets sur lesquels j'ai construit mes cinq dernières années — chez Helios Santé comme architecte logiciel sur une plateforme santé, et chez Studio Caravelle sur des systèmes de gestion patient hospitaliers.

À Helios Santé, j'ai mis en place une architecture backend Python intégrant IA et Sentry — la résolution d'incidents est devenue quasi-automatique. C'est exactement le type de levier d'autonomie opérationnelle que vous décrivez.

Disponible à partir de juillet 2026, je travaille en remote depuis la région lyonnaise et accepte les déplacements ponctuels.

Bien à vous,
Jean Dupont
`;

const MOCK_ATS_CONTEXTUAL_NARRATIVE = `Le CV est solide sur la dimension architecture et stack moderne. Manque toutefois une mention explicite des projets de scalabilité chiffrée (utilisateurs, volume), à intégrer pour les rôles seniors. Les compétences en sécurité/conformité (HIPAA, RGPD) gagnent à être plus visibles si le poste cible un domaine régulé.`;

const MOCK_ATS_KEYWORDS = {
  hard_skills: [
    {
      keyword: "TypeScript",
      importance: 5,
      category: "language",
      synonyms: ["TS"],
    },
    { keyword: "React", importance: 5, category: "framework", synonyms: [] },
    {
      keyword: "Node.js",
      importance: 4,
      category: "framework",
      synonyms: ["Node"],
    },
    {
      keyword: "PostgreSQL",
      importance: 4,
      category: "tool",
      synonyms: ["Postgres"],
    },
    { keyword: "Docker", importance: 3, category: "tool", synonyms: [] },
    {
      keyword: "Kubernetes",
      importance: 4,
      category: "tool",
      synonyms: ["k8s"],
    },
    { keyword: "FastAPI", importance: 3, category: "framework", synonyms: [] },
  ],
  soft_skills: [
    { keyword: "autonomie", importance: 4, synonyms: ["autonome"] },
    { keyword: "rigueur", importance: 3, synonyms: ["rigoureux"] },
  ],
  domain_keywords: [
    { keyword: "architecture", importance: 5 },
    { keyword: "scalabilité", importance: 4 },
    { keyword: "RGPD", importance: 3 },
  ],
  experience_signals: [
    { keyword: "senior", importance: 4 },
    { keyword: "5 ans", importance: 3 },
  ],
};

const MOCK_ATS_SCORE = {
  global: 78,
  breakdown: {
    extraction: 95,
    structure: 88,
    keywords: 72,
    contextual: 70,
  },
  warnings: [],
  strengths: [
    {
      title: "Stack pertinente",
      detail:
        "TypeScript, React, Node, PostgreSQL — tous présents avec des réalisations.",
    },
    {
      title: "Architecture lisible",
      detail:
        "Mises en avant claires des choix d'architecture sur Helios Santé.",
    },
  ],
  weaknesses: [
    {
      title: "Manque de métriques",
      detail: "Peu de chiffres de scale (utilisateurs, volume, gain perf).",
    },
    {
      title: "Mots-clés JD partiels",
      detail: "Quelques signaux faibles non couverts (ex: SRE, observabilité).",
    },
  ],
  suggestions: [
    {
      priority: "high",
      section: "experiences",
      suggestion: "Ajouter une métrique chiffrée à au moins 3 réalisations.",
      rationale:
        "Les ATS et recruteurs filtrent fortement sur les chiffres concrets pour qualifier l'expérience.",
    },
    {
      priority: "medium",
      section: "skills",
      suggestion:
        "Mentionner explicitement SRE et observabilité (Sentry est cité, élargir).",
      rationale:
        "La JD contient ces mots ; les rendre explicites améliore le match.",
    },
    {
      priority: "low",
      section: "pitch",
      suggestion: "Renforcer le verbe d'action initial du pitch.",
      rationale:
        "Le pitch ouvre par 'Développeur' — alterner avec un verbe d'action calibre mieux l'attaque.",
    },
  ],
  matchedKeywords: [
    { keyword: "TypeScript", count: 3, category: "language", importance: 5 },
    { keyword: "React", count: 4, category: "framework", importance: 5 },
    { keyword: "PostgreSQL", count: 2, category: "tool", importance: 4 },
  ],
  missingKeywords: [
    { keyword: "Kubernetes", importance: 4, category: "tool" },
    { keyword: "FastAPI", importance: 3, category: "framework" },
  ],
};

const MOCK_EXTRACTED_FACTS = {
  facts: [
    {
      factType: "skill",
      factContent: { name: "Bun", category: "tool", level: "intermediate" },
      summary: "Compétence repérée : Bun (runtime).",
    },
  ],
};
