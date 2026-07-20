import { profile } from "./profile";

export type FileKind =
  | "markdown"
  | "json"
  | "shell"
  | "experience"
  | "project"
  | "education";

export type WorkspaceFile = {
  id: string;
  path: string;
  name: string;
  kind: FileKind;
  language?: string;
  /** Soft badge when content is sample data */
  sample?: boolean;
  title: string;
  summary?: string;
  body: string;
  meta?: Record<string, string>;
};

export type TreeNode = {
  id: string;
  name: string;
  path?: string;
  children?: TreeNode[];
};

export type ExperienceCommit = {
  id: string;
  hash: string;
  fileId: string;
  title: string;
  company: string;
  period: string;
  sample: boolean;
  bullets: string[];
};

export type ExtensionItem = {
  id: string;
  name: string;
  publisher: string;
  description: string;
  category: string;
  installed: boolean;
  sample?: boolean;
};

export type DebugConfig = {
  id: string;
  name: string;
  type: string;
  fileId: string;
  problem: string;
  approach: string;
  outcome: string;
  sample: boolean;
};

export type ProblemItem = {
  id: string;
  severity: "info" | "warning" | "hint";
  message: string;
  source: string;
};

export const files: Record<string, WorkspaceFile> = {
  "README.md": {
    id: "README.md",
    path: "README.md",
    name: "README.md",
    kind: "markdown",
    language: "markdown",
    title: "Welcome",
    summary: "Start here",
    body: `# ${profile.name}

**${profile.role}**

${profile.tagline}

---

## Quick start

| Action | Shortcut |
| --- | --- |
| Command palette | \`⌘/Ctrl+Shift+P\` |
| Quick open | \`⌘/Ctrl+P\` |
| Toggle terminal | \`⌘/Ctrl+\`\` |
| Toggle theme | Status bar · or palette |

Open files from the **Explorer**, browse career history in **Source Control**, and reach out via the **Terminal**.

> Sample sections are marked — replace them in \`src/content/\`.
`,
  },
  "about.md": {
    id: "about.md",
    path: "about.md",
    name: "about.md",
    kind: "markdown",
    language: "markdown",
    sample: true,
    title: "About",
    body: `# About ${profile.name}

<!-- TODO: replace with real details -->

I'm a developer focused on **design systems**, accessible UI, and tooling that makes product teams faster.

I treat portfolios and component libraries as products: clear information architecture, thoughtful defaults, and interfaces that reward curiosity.

## What I care about

- Accessible primitives over one-off widgets
- Token-driven theming that scales across brands
- Developer experience that feels inevitable, not bolted on

## Outside work

<!-- TODO: replace with real details -->

Reading RFCs, sketching interaction models, and shipping side projects that scratch real itches.
`,
  },
  "skills.json": {
    id: "skills.json",
    path: "skills.json",
    name: "skills.json",
    kind: "json",
    language: "json",
    sample: true,
    title: "Skills",
    body: `{
  "_comment": "TODO: replace with real details",
  "languages": ["TypeScript", "JavaScript", "CSS/SCSS", "HTML"],
  "frameworks": ["React", "Vite", "Nx", "TanStack Router"],
  "designSystems": ["React Aria", "Design tokens", "Theming"],
  "practices": ["Accessibility (WCAG)", "Component APIs", "Monorepos"],
  "tooling": ["Storybook", "Playwright", "Vitest", "Biome"]
}
`,
  },
  "education/college.md": {
    id: "education/college.md",
    path: "education/college.md",
    name: "college.md",
    kind: "education",
    language: "markdown",
    title: "College",
    meta: {
      years: "2014–2018",
      /** TODO: replace with real details */
      institution: "Your College / University",
      /** TODO: replace with real details */
      degree: "Bachelor's degree (placeholder)",
    },
    body: `# College

**Years:** 2014–2018  
**Institution:** Your College / University *(TODO: replace with real details)*  
**Degree:** Bachelor's degree *(TODO: replace with real details)*

Completed college between **2014 and 2018**.

<!-- TODO: add coursework, honors, or relevant activities -->
`,
  },
  "experience/2024-present.md": {
    id: "experience/2024-present.md",
    path: "experience/2024-present.md",
    name: "2024-present.md",
    kind: "experience",
    language: "markdown",
    sample: true,
    title: "Senior Frontend Engineer",
    meta: {
      company: "Acme Labs",
      period: "2024 – Present",
    },
    body: `# Senior Frontend Engineer · Acme Labs

**2024 – Present** · *TODO: replace with real details*

- Led design-system adoption across product squads
- Shipped token pipelines and theme editor workflows
- Mentored engineers on accessible component patterns
`,
  },
  "experience/2020-2023.md": {
    id: "experience/2020-2023.md",
    path: "experience/2020-2023.md",
    name: "2020-2023.md",
    kind: "experience",
    language: "markdown",
    sample: true,
    title: "Frontend Engineer",
    meta: {
      company: "Pixel Forge",
      period: "2020 – 2023",
    },
    body: `# Frontend Engineer · Pixel Forge

**2020 – 2023** · *TODO: replace with real details*

- Built React product surfaces end-to-end
- Improved performance and accessibility scores
- Partnered with design on interaction specs
`,
  },
  "projects/design-system.md": {
    id: "projects/design-system.md",
    path: "projects/design-system.md",
    name: "design-system.md",
    kind: "project",
    language: "markdown",
    sample: true,
    title: "Design System (dev-kit)",
    body: `# Design System · dev-kit

*TODO: replace with real details*

A React Aria–based component library with theming, icons, Storybook, and a showcase app — the monorepo this portfolio lives in.

## Highlights

- Token-driven themes (including terminal aesthetics)
- Accessible primitives with React Aria
- Nx + pnpm monorepo with Vitest & Playwright
`,
  },
  "projects/portfolio-ide.md": {
    id: "projects/portfolio-ide.md",
    path: "projects/portfolio-ide.md",
    name: "portfolio-ide.md",
    kind: "project",
    language: "markdown",
    title: "Portfolio IDE",
    body: `# Portfolio IDE

This site — a VS Code–inspired workspace where Explorer, Git, Extensions, Debug, and Terminal map to About, Experience, Skills, Case Studies, and Contact.
`,
  },
  "contact.sh": {
    id: "contact.sh",
    path: "contact.sh",
    name: "contact.sh",
    kind: "shell",
    language: "shellscript",
    title: "Contact",
    body: `#!/usr/bin/env bash
# Opens the portfolio terminal for contact commands.
# Try: help | about | email | socials | clear
`,
  },
};

export const explorerTree: TreeNode[] = [
  {
    id: "root",
    name: profile.workspaceName,
    children: [
      { id: "README.md", name: "README.md", path: "README.md" },
      { id: "about.md", name: "about.md", path: "about.md" },
      { id: "skills.json", name: "skills.json", path: "skills.json" },
      {
        id: "education",
        name: "education",
        children: [
          {
            id: "education/college.md",
            name: "college.md",
            path: "education/college.md",
          },
        ],
      },
      {
        id: "experience",
        name: "experience",
        children: [
          {
            id: "experience/2024-present.md",
            name: "2024-present.md",
            path: "experience/2024-present.md",
          },
          {
            id: "experience/2020-2023.md",
            name: "2020-2023.md",
            path: "experience/2020-2023.md",
          },
        ],
      },
      {
        id: "projects",
        name: "projects",
        children: [
          {
            id: "projects/design-system.md",
            name: "projects/design-system.md",
            path: "projects/design-system.md",
          },
          {
            id: "projects/portfolio-ide.md",
            name: "portfolio-ide.md",
            path: "projects/portfolio-ide.md",
          },
        ],
      },
      { id: "contact.sh", name: "contact.sh", path: "contact.sh" },
    ],
  },
];

export const experienceCommits: ExperienceCommit[] = [
  {
    id: "c1",
    hash: "a3f91c2",
    fileId: "experience/2024-present.md",
    title: "feat(career): Senior Frontend Engineer @ Acme Labs",
    company: "Acme Labs",
    period: "2024 – Present",
    sample: true,
    bullets: [
      "Led design-system adoption across product squads",
      "Shipped token pipelines and theme editor workflows",
      "Mentored engineers on accessible component patterns",
    ],
  },
  {
    id: "c2",
    hash: "8e2b104",
    fileId: "experience/2020-2023.md",
    title: "feat(career): Frontend Engineer @ Pixel Forge",
    company: "Pixel Forge",
    period: "2020 – 2023",
    sample: true,
    bullets: [
      "Built React product surfaces end-to-end",
      "Improved performance and accessibility scores",
      "Partnered with design on interaction specs",
    ],
  },
  {
    id: "c3",
    hash: "c01e9d4",
    fileId: "education/college.md",
    title: "chore(education): complete college 2014–2018",
    company: "College",
    period: "2014 – 2018",
    sample: false,
    bullets: ["Completed college education (2014–2018)"],
  },
];

export const extensions: ExtensionItem[] = [
  {
    id: "ext-react",
    name: "React",
    publisher: "soundhar",
    description: "Component architecture, hooks, and composition patterns",
    category: "Frameworks",
    installed: true,
    sample: true,
  },
  {
    id: "ext-ts",
    name: "TypeScript",
    publisher: "soundhar",
    description: "Typed APIs, strict configs, and maintainable boundaries",
    category: "Languages",
    installed: true,
    sample: true,
  },
  {
    id: "ext-a11y",
    name: "Accessibility",
    publisher: "soundhar",
    description: "WCAG-minded UI with React Aria primitives",
    category: "Practices",
    installed: true,
    sample: true,
  },
  {
    id: "ext-tokens",
    name: "Design Tokens",
    publisher: "soundhar",
    description: "Themeable systems, CSS variables, multi-brand surfaces",
    category: "Design Systems",
    installed: true,
    sample: true,
  },
  {
    id: "ext-nx",
    name: "Monorepo Tooling",
    publisher: "soundhar",
    description: "Nx, pnpm workspaces, Storybook, Vitest, Playwright",
    category: "Tooling",
    installed: true,
    sample: true,
  },
  {
    id: "ext-dx",
    name: "Developer Experience",
    publisher: "soundhar",
    description: "Playgrounds, docs, and APIs that feel intentional",
    category: "Practices",
    installed: true,
    sample: true,
  },
];

export const debugConfigs: DebugConfig[] = [
  {
    id: "debug-ds",
    name: "Launch: Design System Adoption",
    type: "case-study",
    fileId: "projects/design-system.md",
    problem:
      "Product teams were reinventing UI with inconsistent accessibility and theming.",
    approach:
      "Built a shared React Aria component library with tokens, docs, and adoption playbooks.",
    outcome:
      "Faster feature delivery and a single source of truth for UI primitives. *(TODO: replace with real metrics)*",
    sample: true,
  },
  {
    id: "debug-portfolio",
    name: "Launch: Portfolio as IDE",
    type: "case-study",
    fileId: "projects/portfolio-ide.md",
    problem:
      "Standard portfolio templates do not show how a frontend engineer thinks about product surfaces.",
    approach:
      "Mapped VS Code chrome to portfolio sections so navigation itself demonstrates product craft.",
    outcome:
      "A memorable, interactive resume that doubles as a working product demo.",
    sample: false,
  },
];

export const problems: ProblemItem[] = [
  {
    id: "p1",
    severity: "info",
    message: `${profile.availability}`,
    source: "status",
  },
  {
    id: "p2",
    severity: "hint",
    message: `Currently learning: ${profile.currentlyLearning}`,
    source: "learning",
  },
  {
    id: "p3",
    severity: "warning",
    message: "Sample experience/project data present — replace in src/content/",
    source: "portfolio",
  },
];

export const allFileIds = Object.keys(files);

export function getFile(id: string): WorkspaceFile | undefined {
  return files[id];
}
