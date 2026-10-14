import { profile } from "../content/profile";
import {
  debugConfigs,
  experienceCommits,
  extensions,
  files,
} from "../content/workspace";

/**
 * Deterministic offline answers from portfolio data.
 * Used when GROQ_API_KEY is missing or the upstream call fails.
 */
export function answerFromPortfolio(question: string): string {
  const q = question.toLowerCase();

  if (
    matches(q, [
      "college",
      "education",
      "university",
      "school",
      "studied",
      "degree",
    ])
  ) {
    const college = files["education/college.md"];
    const years = college?.meta?.years ?? "2014–2018";
    return [
      `I completed college between ${years}.`,
      college?.meta?.institution
        ? `Institution (placeholder): ${college.meta.institution}.`
        : null,
      college?.meta?.degree
        ? `Degree (placeholder): ${college.meta.degree}.`
        : null,
      "Replace the institution/degree placeholders in the portfolio content when ready.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (
    matches(q, ["skill", "stack", "tech", "technology", "tools", "extension"])
  ) {
    const list = extensions
      .slice(0, 6)
      .map(
        (e) => `• ${e.name} — ${e.description}${e.sample ? " (sample)" : ""}`,
      )
      .join("\n");
    return `Here are the highlighted skills/tools from the portfolio:\n${list}`;
  }

  if (
    matches(q, [
      "experience",
      "work",
      "job",
      "career",
      "employ",
      "role",
      "company",
    ])
  ) {
    const lines = experienceCommits
      .filter((c) => c.company !== "College")
      .map(
        (c) =>
          `• ${c.company} (${c.period})${c.sample ? " [sample]" : ""} — ${c.bullets[0] ?? c.title}`,
      )
      .join("\n");
    return `Career timeline from the portfolio:\n${lines}\n\nSample roles are placeholders — replace them in src/content/.`;
  }

  if (
    matches(q, [
      "project",
      "built",
      "case study",
      "portfolio ide",
      "design system",
    ])
  ) {
    const lines = debugConfigs
      .map(
        (d) =>
          `• ${d.name}${d.sample ? " [sample]" : ""}\n  Problem: ${d.problem}\n  Outcome: ${d.outcome}`,
      )
      .join("\n\n");
    return `Case studies / projects:\n\n${lines}`;
  }

  if (
    matches(q, [
      "contact",
      "email",
      "reach",
      "hire",
      "linkedin",
      "social",
    ])
  ) {
    return [
      `You can reach ${profile.name} at ${profile.email}.`,
      `LinkedIn: ${profile.linkedin}`,
      `Availability: ${profile.availability}.`,
    ].join("\n");
  }

  if (matches(q, ["who", "about", "background", "yourself", "intro", "bio"])) {
    return [
      `I'm ${profile.fullName}, ${profile.role}.`,
      profile.tagline,
      `Location: ${profile.location}.`,
      `Currently learning: ${profile.currentlyLearning}.`,
      `College: 2014–2018.`,
    ].join(" ");
  }

  if (matches(q, ["hello", "hi ", "hey", "help"])) {
    return `Hi — I'm the free portfolio agent for ${profile.name}. Ask about background, education (2014–2018), skills, experience, projects, or contact info.`;
  }

  // Generic grounded summary
  return [
    `I can answer from ${profile.name}'s portfolio data only.`,
    `Try asking about: background, college (2014–2018), skills, experience, projects, or contact.`,
    `Role on file: ${profile.role}. Availability: ${profile.availability}.`,
  ].join(" ");
}

function matches(q: string, keywords: string[]): boolean {
  return keywords.some((k) => q.includes(k));
}
