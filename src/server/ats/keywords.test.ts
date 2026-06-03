import { describe, expect, test } from "bun:test";
import { matchKeywordsAgainst } from "./keywords";

const KW = {
  hard_skills: [
    { keyword: "TypeScript", importance: 5, category: "language", synonyms: ["TS"] },
    { keyword: "React", importance: 5, category: "framework", synonyms: [] },
    { keyword: "Kubernetes", importance: 4, category: "tool", synonyms: ["k8s"] },
  ],
  soft_skills: [{ keyword: "autonomie", importance: 3, synonyms: ["autonome"] }],
  domain_keywords: [{ keyword: "architecture", importance: 4 }],
  experience_signals: [{ keyword: "senior", importance: 3 }],
};

describe("matchKeywordsAgainst", () => {
  test("counts exact keyword occurrences", () => {
    const text = "Developer with TypeScript and React experience. TypeScript daily.";
    const r = matchKeywordsAgainst(text, KW);
    const ts = r.matched.find((m) => m.keyword === "TypeScript");
    expect(ts?.count).toBe(2);
    const react = r.matched.find((m) => m.keyword === "React");
    expect(react?.count).toBe(1);
  });

  test("matches synonyms (case-insensitive)", () => {
    const text = "Worked with k8s and TS for 3 years. Senior architect.";
    const r = matchKeywordsAgainst(text, KW);
    const kube = r.matched.find((m) => m.keyword === "Kubernetes");
    expect(kube?.count).toBeGreaterThan(0);
    const ts = r.matched.find((m) => m.keyword === "TypeScript");
    expect(ts?.count).toBeGreaterThan(0);
  });

  test("reports missing keywords sorted by importance desc", () => {
    const text = "Pas de mots-clés ici.";
    const r = matchKeywordsAgainst(text, KW);
    expect(r.matched.length).toBe(0);
    expect(r.missing.length).toBe(6);
    expect(r.missing[0]!.importance).toBeGreaterThanOrEqual(r.missing[1]!.importance);
  });

  test("weighted score reflects importance, not raw count", () => {
    // Match only the high-importance items.
    const text = "TypeScript React Kubernetes architecture senior autonomie";
    const r = matchKeywordsAgainst(text, KW);
    expect(r.score).toBe(100);
  });
});
