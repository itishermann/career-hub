/**
 * Initial seed. Run on first boot (or via `bun prisma db seed`).
 *
 * 1. Ensures the bootstrap admin user (BOOTSTRAP_ADMIN_EMAIL) exists.
 * 2. If their profile is empty, loads structured data from `personality.md`
 *    via a pragmatic hardcoded mapping. The mapping mirrors the file rather
 *    than parsing markdown blindly, because the LLM-driven prompts depend on
 *    the structure being accurate.
 *
 * NB: per CLAUDE.md, the markdown file is only ever a *seed source*. Once the
 * DB is populated, the file is no longer authoritative.
 */

import "dotenv/config";
import { readFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { join } from "node:path";
import yaml from "js-yaml";

const DATABASE_URL = process.env.DATABASE_URL!;
const ADMIN_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL ?? "jean.dupont@example.com";
const DEFAULT_LOCALE = (process.env.DEFAULT_LOCALE ?? "fr") as "fr" | "en";

async function main() {
  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  const db = new PrismaClient({ adapter });

  console.log(`[seed] using DATABASE_URL=${DATABASE_URL.replace(/:[^@]*@/, ":***@")}`);
  console.log(`[seed] bootstrap admin email: ${ADMIN_EMAIL}`);

  // In a real deployment, onboardingCompleted starts at false so the user goes
  // through the wizard. For the seeded admin in dev we flip it to true so
  // `bun run dev` lands directly on the dashboard with the seeded profile.
  // Set ONBOARDING_COMPLETED=false on first prod boot if you want the wizard.
  const onboardingCompleted = (process.env.SEED_ONBOARDING_COMPLETED ?? "true") === "true";

  const user = await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { onboardingCompleted },
    create: {
      email: ADMIN_EMAIL,
      name: "Jean Dupont",
      role: "ADMIN",
      uiLocale: DEFAULT_LOCALE,
      onboardingCompleted,
      llmConfig: { mode: process.env.DEFAULT_LLM_MODE ?? "mock" },
    },
  });

  console.log(`[seed] admin user: ${user.email} (id=${user.id})`);

  const existingIdentity = await db.profileIdentity.findUnique({ where: { userId: user.id } });
  if (!existingIdentity) {
    await db.profileIdentity.create({
      data: {
        userId: user.id,
        fullName: "Jean Dupont",
        birthDate: new Date("1990-01-01"),
        birthPlace: "Paris, France",
        nationality: "Française",
        residencyStatus: "Citoyen français",
        address: "Lyon, France",
        email: ADMIN_EMAIL,
        phone: "06 00 00 00 00",
        linkedinUrl: "https://linkedin.com/in/jeandupont",
        githubUrl: "https://github.com/jeandupont",
        portfolioUrl: "https://jeandupont.example.com",
        handle: "@jeandupont",
        mobility: "Lyon, remote/hybride privilégié.",
        drivingLicence: "B",
      },
    });
    console.log("[seed] identity created");
  } else {
    console.log("[seed] identity already exists — skip");
  }

  const sectionCount = await db.profileSection.count({ where: { userId: user.id } });
  if (sectionCount === 0) {
    const sections: {
      sectionType: string;
      contentMd: { fr?: string | null; en?: string | null };
    }[] = [
      {
        sectionType: "pitch",
        contentMd: {
          fr: "Développeur fullstack senior avec 8 ans d'expérience sur React, Node, TypeScript et PostgreSQL. À l'aise sur l'ensemble de la chaîne — frontend, backend, infrastructure et architecture. Récemment tech lead sur une plateforme SaaS de gestion de flotte.",
          en: null,
        },
      },
      {
        sectionType: "voice",
        contentMd: {
          fr: "Direct, dense, factuel. Phrases courtes, anglicismes décomplexés dans le registre technique, première personne assumée. Sobre sur l'auto-promotion : je dis ce que j'ai fait, je laisse l'interlocuteur en tirer la conclusion.",
          en: null,
        },
      },
      {
        sectionType: "anti_patterns",
        contentMd: {
          fr: "Ne JAMAIS écrire : « passionné par l'innovation », « force de proposition », « esprit d'équipe », « polyvalent et autonome », « capacité d'adaptation », « méthodique et rigoureux ». Pas de photo CV. Pas de barres de progression sur les soft skills. Pas de « Je serais ravi de… ».",
          en: null,
        },
      },
      {
        sectionType: "preferences",
        contentMd: {
          fr: "Ouvert CDI direct, freelance via portage, mission ESN. 100% remote idéal, présentiel Lyon OK. TJM freelance min 450€, CDI min 50 k€ brut/an. Disponibilité nouvelle mission ou CDI : septembre 2026 sauf opportunité exceptionnelle.",
          en: null,
        },
      },
      {
        sectionType: "interests",
        contentMd: {
          fr: "À mettre sur CV : course à pied (semi-marathon), photographie de paysage, contribution open source. Hors CV : jeux de société, jardinage urbain, cuisine.",
          en: null,
        },
      },
      {
        sectionType: "soft_skills",
        contentMd: {
          fr: "Méthodique, pragmatique, attaché aux faits. Autodidacte solide, continue à apprendre seul. Travaille bien en autonomie complète (remote depuis 6 ans). Documente abondamment. Construit son propre outillage quand l'outil manque.",
          en: null,
        },
      },
      {
        sectionType: "differentiators",
        contentMd: {
          fr: "1) Polyvalence prouvée (front, back, devops, archi). 2) Expérience conformité RGPD sur des produits SaaS. 3) Architecture + delivery de bout en bout. 4) Outillage interne. 5) Capacité à former et faire monter des juniors. 6) Stack moderne maîtrisée + aisance sur les bases existantes.",
          en: null,
        },
      },
      {
        sectionType: "anecdotes",
        contentMd: {
          fr: "Tech/archi : 'Sur Atlas Mobility, j'ai conçu une architecture qui a permis de faire scaler un backend Node de quelques centaines à plusieurs milliers de véhicules suivis en temps réel.' — Mentorat : 'J'ai monté un programme interne de pair-programming qui a accéléré l'autonomie de trois développeurs juniors.' — Autodidacte : 'J'ai appris à coder en bricolant un mod sur un jeu vidéo open source.'",
          en: null,
        },
      },
      {
        sectionType: "instructions",
        contentMd: {
          fr: "CV : 1-2 pages max, anti-chronologique strict, adapter la sélection des expériences. Réalisations en verbes d'action au passé. Chiffrer dès que possible. LM : 3 paragraphes max (accroche → adéquation → motivation), pas de salaire, pas de 'Je me permets de'. Toujours mentionner disponibilité + modalité remote/présentiel.",
          en: null,
        },
      },
    ];

    for (const s of sections) {
      await db.profileSection.create({
        data: {
          userId: user.id,
          sectionType: s.sectionType,
          contentMd: s.contentMd as object,
          isCurrent: true,
          version: 1,
        },
      });
    }
    console.log(`[seed] ${sections.length} profile sections created`);
  } else {
    console.log(`[seed] ${sectionCount} profile sections already exist — skip`);
  }

  const expCount = await db.experience.count({ where: { userId: user.id } });
  if (expCount === 0) {
    const experiences = [
      {
        company: "Atlas Mobility",
        role: "Tech lead fullstack",
        status: "freelance",
        location: "Lyon (remote)",
        startDate: new Date("2024-02-01"),
        endDate: null,
        description: {
          fr: "Tech lead sur une plateforme SaaS de gestion de flotte, après avoir rejoint l'équipe comme développeur fullstack.",
          en: null,
        },
        achievements: {
          fr: [
            "Conception d'une architecture backend Node scalable pour le suivi temps réel de plusieurs milliers de véhicules",
            "Mise en place d'un scheduler de jobs custom (Node + PostgreSQL) pour orchestrer les traitements métier",
            "Cache partagé multi-instance pour une API Node déployée en plusieurs workers",
            "Outil React de matrice de permissions générant migrations SQL et constantes TypeScript",
            "Intégrations métier : passerelle de paiement, cartographie, notifications push, stockage objet avec URLs signées",
          ],
          en: null,
        },
        technologies: [
          "React",
          "Next.js",
          "Node.js",
          "TypeScript",
          "PostgreSQL",
          "AWS",
          "Docker",
          "Redis",
        ],
      },
      {
        company: "Studio Caravelle",
        role: "Développeur fullstack",
        status: "freelance",
        location: "Nantes (remote)",
        startDate: new Date("2022-09-01"),
        endDate: new Date("2024-01-31"),
        description: {
          fr: "Développement de produits web pour plusieurs clients du studio, via portage salarial.",
          en: null,
        },
        achievements: {
          fr: [
            "Création d'interfaces web pour la gestion documentaire d'organisations publiques",
            "Production de rapports d'activité PDF multi-projets générés automatiquement",
            "Mise en place de tableaux de bord de suivi à partir de l'activité Git et CI",
            "Formation de développeurs juniors sur les bonnes pratiques frontend",
          ],
          en: null,
        },
        technologies: ["React", "TypeScript", "Node.js", "GitLab CI"],
      },
      {
        company: "Helios Santé",
        role: "Développeur fullstack web TypeScript",
        status: "freelance",
        location: "Paris",
        startDate: new Date("2019-08-01"),
        endDate: new Date("2022-08-31"),
        description: {
          fr: "2 ans en alternance puis 1 an en freelance sur l'écosystème Helios (backoffice, funnel d'acquisition, applications web).",
          en: null,
        },
        achievements: {
          fr: [
            "Migration de plusieurs codebases vers des monorepos",
            "Création et maintenance d'un backoffice et d'un funnel d'acquisition client",
            "Optimisation des pipelines GitLab CI + Docker + Argo CD",
            "Migration des tests Selenium vers Playwright",
            "Mise en conformité RGPD des traitements de données",
          ],
          en: null,
        },
        technologies: [
          "React",
          "TypeScript",
          "Node.js",
          "NestJS",
          "GraphQL",
          "Kubernetes",
          "Argo CD",
          "GitLab CI",
          "PostgreSQL",
          "Prisma",
          "Playwright",
        ],
      },
      {
        company: "NordCloud SAS",
        role: "Administrateur système",
        status: "freelance",
        location: "Limoges",
        startDate: new Date("2019-01-01"),
        endDate: new Date("2020-06-30"),
        description: {
          fr: "Mise en place d'OpenStack et d'un cluster Kubernetes, VPN, CI de déploiement automatisé.",
          en: null,
        },
        achievements: {
          fr: [
            "Mise en place d'OpenStack + cluster Kubernetes",
            "Configuration d'un VPN pour les équipes distantes",
            "Architecture de sous-traitance d'hébergement web/VPS",
          ],
          en: null,
        },
        technologies: ["Python", "OpenStack", "Kubernetes", "GitLab", "Cloudflare", "SonarQube"],
      },
      {
        company: "Helios Santé",
        role: "Stagiaire fullstack JS + DevOps",
        status: "stage",
        location: "Boulogne-Billancourt",
        startDate: new Date("2018-04-01"),
        endDate: new Date("2018-09-30"),
        description: {
          fr: "Stage de 5 mois — stack ELK, CI/CD, dockerisation, audits sécurité.",
          en: null,
        },
        achievements: {
          fr: [
            "Migration des tests Selenium vers Playwright",
            "Mise en place d'une stack ELK",
            "CI/CD SonarQube/GitLab/Jenkins",
            "Audits sécurité automatisés",
          ],
          en: null,
        },
        technologies: ["Node.js", "Docker", "SonarQube", "GitLab", "Jenkins", "ELK"],
      },
    ];

    for (const exp of experiences) {
      await db.experience.create({
        data: {
          userId: user.id,
          company: exp.company,
          role: exp.role,
          status: exp.status,
          location: exp.location,
          startDate: exp.startDate,
          endDate: exp.endDate,
          description: exp.description as object,
          achievements: exp.achievements as object,
          technologies: exp.technologies,
        },
      });
    }
    console.log(`[seed] ${experiences.length} experiences created`);
  }

  const skillCount = await db.skill.count({ where: { userId: user.id } });
  if (skillCount === 0) {
    const skills: { category: string; name: string; level?: string }[] = [
      { category: "languages", name: "TypeScript", level: "expert" },
      { category: "languages", name: "JavaScript", level: "expert" },
      { category: "languages", name: "Python", level: "expert" },
      { category: "languages", name: "C#", level: "expert" },
      { category: "languages", name: "PHP", level: "advanced" },
      { category: "languages", name: "Swift", level: "intermediate" },
      { category: "languages", name: "Dart", level: "intermediate" },
      { category: "languages", name: "Rust", level: "learning" },
      { category: "frameworks", name: "React" },
      { category: "frameworks", name: "Next.js" },
      { category: "frameworks", name: "React Native" },
      { category: "frameworks", name: "Expo" },
      { category: "frameworks", name: "SvelteKit" },
      { category: "frameworks", name: "FastAPI" },
      { category: "frameworks", name: "NestJS" },
      { category: "frameworks", name: "Express" },
      { category: "frameworks", name: "ASP.NET" },
      { category: "frameworks", name: "Mantine" },
      { category: "frameworks", name: "Tailwind" },
      { category: "infrastructure", name: "Docker" },
      { category: "infrastructure", name: "Kubernetes" },
      { category: "infrastructure", name: "Argo CD" },
      { category: "infrastructure", name: "OpenStack" },
      { category: "infrastructure", name: "GitLab CI" },
      { category: "infrastructure", name: "GitHub Actions" },
      { category: "infrastructure", name: "Azure DevOps" },
      { category: "infrastructure", name: "Jenkins" },
      { category: "infrastructure", name: "Sentry" },
      { category: "infrastructure", name: "AWS" },
      { category: "infrastructure", name: "GCP" },
      { category: "infrastructure", name: "Cloudflare" },
      { category: "databases", name: "PostgreSQL" },
      { category: "databases", name: "MySQL" },
      { category: "databases", name: "SQLite" },
      { category: "databases", name: "Prisma" },
      { category: "databases", name: "MMKV" },
      { category: "testing", name: "Playwright" },
      { category: "testing", name: "Detox" },
      { category: "testing", name: "Selenium" },
      { category: "methodologies", name: "DDD" },
      { category: "methodologies", name: "CQRS" },
      { category: "methodologies", name: "Architecture hexagonale" },
      { category: "methodologies", name: "Monorepos" },
      { category: "compliance", name: "RGPD" },
      { category: "compliance", name: "HIPAA" },
      { category: "compliance", name: "SESAM-Vitale" },
      { category: "languages-spoken", name: "Français", level: "native" },
      { category: "languages-spoken", name: "Anglais", level: "C1" },
    ];

    for (const s of skills) {
      await db.skill.create({
        data: {
          userId: user.id,
          category: s.category,
          name: s.name,
          level: s.level ?? null,
        },
      });
    }
    console.log(`[seed] ${skills.length} skills created`);
  }

  const eduCount = await db.education.count({ where: { userId: user.id } });
  if (eduCount === 0) {
    const educations = [
      {
        school: "École Supérieure du Numérique",
        diploma: { fr: "Master of Science — Architecte logiciel, développeur d'application", en: "MSc — Software architect, application developer" },
        field: { fr: "Informatique", en: "Computer science" },
        location: "Lyon, France",
        startDate: new Date("2021-10-01"),
        endDate: new Date("2022-12-31"),
      },
      {
        school: "École Supérieure du Numérique",
        diploma: { fr: "Bachelor — Responsable projets web et mobile", en: "Bachelor — Web and mobile project lead" },
        field: { fr: "Informatique", en: "Computer science" },
        location: "Lyon, France",
        startDate: new Date("2019-08-01"),
        endDate: new Date("2021-10-31"),
      },
      {
        school: "IUT de Lyon",
        diploma: { fr: "DUT Informatique", en: "Two-year technical degree in Computer Science" },
        field: null,
        location: "Lyon, France",
        startDate: new Date("2016-09-01"),
        endDate: new Date("2018-06-30"),
      },
    ];

    for (const e of educations) {
      await db.education.create({
        data: {
          userId: user.id,
          school: e.school,
          diploma: e.diploma as object,
          field: e.field === null ? undefined : (e.field as object),
          location: e.location,
          startDate: e.startDate,
          endDate: e.endDate,
        },
      });
    }
    console.log(`[seed] ${educations.length} educations created`);
  }

  const projectCount = await db.project.count({ where: { userId: user.id } });
  if (projectCount === 0) {
    const projects = [
      {
        name: "Kanban Orchestrator",
        description: {
          fr: "Application desktop kanban pour orchestrer plusieurs tâches de build locales en parallèle. Streaming des logs en temps réel, isolation des tâches, persistance locale.",
          en: null,
        },
        technologies: ["Tauri", "Rust", "SQLite", "TypeScript"],
        url: null,
        year: 2026,
      },
      {
        name: "Error Message Translator",
        description: {
          fr: "Package NPM traduisant les exceptions techniques d'un BaaS en messages exploitables côté développeur.",
          en: null,
        },
        technologies: ["Bun", "TypeScript"],
        url: null,
        year: 2025,
      },
      {
        name: "Walk Route Generator",
        description: {
          fr: "Webapp générant des itinéraires de marche en boucle adaptés à un objectif de distance. Stockage local persistant, export GPX, carte interactive.",
          en: null,
        },
        technologies: ["Bun", "Next.js", "Leaflet", "DexieJS"],
        url: null,
        year: 2025,
      },
      {
        name: "DrawTogether",
        description: {
          fr: "Application mobile de Pictionary multi-joueurs en temps réel.",
          en: null,
        },
        technologies: ["React Native", "Firebase", "TypeScript"],
        url: null,
        year: 2024,
      },
    ];

    for (const p of projects) {
      await db.project.create({
        data: {
          userId: user.id,
          name: p.name,
          description: p.description as object,
          technologies: p.technologies,
          url: p.url,
          year: p.year,
        },
      });
    }
    console.log(`[seed] ${projects.length} projects created`);
  }

  // ---------------------------------------------------------------------------
  // Templates — installs any template found under /templates/{cv,lm}/*
  // ---------------------------------------------------------------------------
  await seedTemplates(db);

  await db.$disconnect();
  console.log("[seed] done.");
}

async function seedTemplates(db: PrismaClient) {
  const templatesRoot = join(process.cwd(), "templates");
  const buckets: { dir: string; type: "CV" | "COVER_LETTER" }[] = [
    { dir: "cv", type: "CV" },
    { dir: "lm", type: "COVER_LETTER" },
  ];

  for (const bucket of buckets) {
    const bucketDir = join(templatesRoot, bucket.dir);
    let entries: string[] = [];
    try {
      const fs = await import("node:fs/promises");
      entries = await fs.readdir(bucketDir);
    } catch {
      continue;
    }
    for (const name of entries) {
      const dir = join(bucketDir, name);
      try {
        const tpl = await readFile(join(dir, "template.typ"), "utf8");
        const metaRaw = await readFile(join(dir, "meta.yaml"), "utf8");
        // js-yaml v4 `load` uses the safe DEFAULT_SCHEMA — no js/function execution.
        const meta = yaml.load(metaRaw, { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>;
        const supported = (meta.supported_languages as string[]) ?? ["fr"];
        await db.template.upsert({
          where: { name: name },
          update: {
            typstSource: tpl,
            meta: meta as object,
            type: bucket.type,
            templateLanguage: (meta.template_language as string) ?? "fr",
            supportedLanguages: supported,
            description: (meta.description as object) ?? undefined,
          },
          create: {
            name,
            typstSource: tpl,
            meta: meta as object,
            type: bucket.type,
            templateLanguage: (meta.template_language as string) ?? "fr",
            supportedLanguages: supported,
            description: (meta.description as object) ?? undefined,
            isDefault: true,
          },
        });
        console.log(`[seed] template installed: ${name} (${bucket.type})`);
      } catch (err) {
        console.warn(`[seed] skip template ${name}: ${(err as Error).message}`);
      }
    }
  }
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
