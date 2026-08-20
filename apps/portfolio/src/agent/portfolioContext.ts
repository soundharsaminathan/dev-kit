import { profile } from "../content/profile";
import {
  debugConfigs,
  experienceCommits,
  extensions,
  files,
} from "../content/workspace";

/** Build grounded system prompt from portfolio content for the free agent. */
export function buildPortfolioSystemPrompt(): string {
  const fileSections = Object.values(files)
    .map((file) => {
      const sampleTag = file.sample ? " [SAMPLE / PLACEHOLDER]" : "";
      const meta =
        file.meta && Object.keys(file.meta).length > 0
          ? `\nMeta: ${JSON.stringify(file.meta)}`
          : "";
      return `### ${file.path}${sampleTag}\nTitle: ${file.title}${meta}\n${file.body.trim()}`;
    })
    .join("\n\n");

  const commits = experienceCommits
    .map((c) => {
      const sampleTag = c.sample ? " [SAMPLE]" : "";
      return `- ${c.hash} ${c.title}${sampleTag} (${c.company}, ${c.period})\n  ${c.bullets.map((b) => `• ${b}`).join("\n  ")}`;
    })
    .join("\n");

  const skills = extensions
    .map((e) => {
      const sampleTag = e.sample ? " [SAMPLE]" : "";
      return `- ${e.name}${sampleTag} (${e.category}): ${e.description}`;
    })
    .join("\n");

  const cases = debugConfigs
    .map((d) => {
      const sampleTag = d.sample ? " [SAMPLE]" : "";
      return `### ${d.name}${sampleTag}\nProblem: ${d.problem}\nApproach: ${d.approach}\nOutcome: ${d.outcome}`;
    })
    .join("\n\n");

  return `You are the portfolio assistant for ${profile.fullName} (${profile.name}).
You answer questions from visitors about this developer's background, skills, experience, education, and projects.

Rules:
- Answer ONLY using the portfolio data below.
- If the answer is not in the data, say you do not have that information.
- Items marked [SAMPLE] or [SAMPLE / PLACEHOLDER] are temporary examples — mention they are placeholders if relevant.
- Be concise, professional, and friendly.
- Do not invent employers, dates, or metrics.

## Identity
- Name: ${profile.fullName}
- Role: ${profile.role}
- Tagline: ${profile.tagline}
- Email: ${profile.email}
- LinkedIn: ${profile.linkedin}
- Location: ${profile.location}
- Availability: ${profile.availability}
- Currently learning: ${profile.currentlyLearning}

## Workspace files
${fileSections}

## Career commits (experience timeline)
${commits}

## Skills / extensions
${skills}

## Case studies
${cases}
`;
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};
