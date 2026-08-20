/** Profile + contact identity. Replace placeholders marked TODO. */

export const profile = {
  name: "Soundhar",
  fullName: "Soundhar Saminathan",
  /** TODO: replace with real details */
  role: "Frontend Engineer · Design Systems",
  /** TODO: replace with real details */
  tagline:
    "I build accessible component libraries and developer experiences that feel like product.",
  email: "soundhar.saminathan.dev@gmail.com",
  github: "https://github.com/soundharsaminathan",
  githubHandle: "soundharsaminathan",
  /** TODO: replace with real details */
  linkedin: "https://linkedin.com/in/soundhar-saminathan",
  /** TODO: replace with real details */
  location: "Remote · Earth",
  /** TODO: replace with real details */
  availability: "Open to opportunities",
  /** TODO: replace with real details */
  currentlyLearning: "Advanced motion systems & design-token pipelines",
  workspaceName: "soundhar-portfolio",
  workspacePath: "~/code/soundhar-portfolio",
} as const;

export type Profile = typeof profile;
