import { describe, expect, test } from "bun:test";
import type { AtsKeywords } from "./ats-keyword-extractor";
import {
  buildCvPrompt,
  type CvPromptInput,
  type ProfileSnapshotShape,
} from "./cv-generator";

const PROFILE: ProfileSnapshotShape = {
  identity: {
    fullName: "Jean Dupont",
    email: "jean.dupont@example.com",
    phone: null,
    address: null,
    linkedinUrl: null,
    githubUrl: null,
    portfolioUrl: null,
  },
  pitch: "Dev fullstack senior.",
  experiences: [],
  skillsByCategory: {},
  education: [],
  languages: [],
  sections: {},
};

const TEMPLATE: CvPromptInput["template"] = {
  name: "sobre-fr",
  typstSource: "#let cv() = []",
  meta: {},
};

const KEYWORDS: AtsKeywords = {
  hard_skills: [
    {
      keyword: "TypeScript",
      importance: 5,
      category: "language",
      synonyms: ["TS"],
    },
    { keyword: "Kubernetes", importance: 3, category: "tool", synonyms: [] },
  ],
  soft_skills: [{ keyword: "Communication", importance: 2, synonyms: [] }],
  domain_keywords: [{ keyword: "Fintech", importance: 4 }],
  experience_signals: [{ keyword: "5 ans d'expérience", importance: 4 }],
};

describe("buildCvPrompt — ATS keyword front-loading", () => {
  test("omits the keyword block when no keywords are provided", () => {
    const { prompt } = buildCvPrompt({
      language: "fr",
      template: TEMPLATE,
      profileSnapshot: PROFILE,
    });
    expect(prompt).not.toContain("<ats_keywords>");
  });

  test("includes extracted keywords sorted by importance when provided", () => {
    const { prompt } = buildCvPrompt({
      language: "fr",
      template: TEMPLATE,
      profileSnapshot: PROFILE,
      campaign: { targetRole: "Lead", jobDescription: "..." },
      atsKeywords: KEYWORDS,
    });
    expect(prompt).toContain("<ats_keywords>");
    expect(prompt).toContain("TypeScript");
    expect(prompt).toContain("Kubernetes");
    expect(prompt).toContain("Fintech");
    // Highest-importance hard skill (TypeScript, 5) appears before the lower
    // one (Kubernetes, 3).
    expect(prompt.indexOf("TypeScript")).toBeLessThan(
      prompt.indexOf("Kubernetes"),
    );
    // Synonyms are surfaced so the model can use the exact JD spelling.
    expect(prompt).toContain("TS");
  });

  test("sets an 80% coverage target while keeping the no-invention floor", () => {
    const { prompt } = buildCvPrompt({
      language: "en",
      template: TEMPLATE,
      profileSnapshot: PROFILE,
      atsKeywords: KEYWORDS,
    });
    expect(prompt).toContain("80%");
    // The honesty floor must remain: untrue keywords are never invented.
    expect(prompt.toLowerCase()).toContain("never invent");
  });
});

describe("buildCvPrompt — improvement feedback", () => {
  test("omits the improvement block by default", () => {
    const { prompt } = buildCvPrompt({
      language: "fr",
      template: TEMPLATE,
      profileSnapshot: PROFILE,
    });
    expect(prompt).not.toContain("<improvement_feedback>");
  });

  test("surfaces the previous score, weaknesses and missing keywords", () => {
    const { prompt } = buildCvPrompt({
      language: "fr",
      template: TEMPLATE,
      profileSnapshot: PROFILE,
      campaign: { jobDescription: "..." },
      improvement: {
        previousScore: 72,
        targetScore: 80,
        keywordCoverage: 50,
        weaknesses: [
          { title: "Manque de mots-clés", detail: "Kubernetes absent." },
        ],
        suggestions: [
          {
            priority: "high",
            section: "skills",
            suggestion: "Ajouter Kubernetes si réel",
            rationale: "Mot-clé critique de la JD",
          },
        ],
        missingKeywords: [
          { keyword: "Kubernetes", importance: 3, category: "tool" },
        ],
      },
    });
    expect(prompt).toContain("<improvement_feedback>");
    expect(prompt).toContain("72");
    expect(prompt).toContain("80");
    expect(prompt).toContain("Manque de mots-clés");
    expect(prompt).toContain("Kubernetes");
    // Feedback is mandatory and the 80% keyword-coverage target + current
    // coverage are surfaced so the model knows the gap to close.
    expect(prompt).toContain("OBLIGATOIRES");
    expect(prompt).toContain("80%");
    expect(prompt).toContain("50%");
  });
});
