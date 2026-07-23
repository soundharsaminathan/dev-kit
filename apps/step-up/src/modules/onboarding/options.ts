import type { ExperienceLevel } from "@/lib/constants";

export const EXPERIENCE_LEVELS: Array<{
  id: ExperienceLevel;
  title: string;
  description: string;
}> = [
  {
    id: "BEGINNER",
    title: "Brand new",
    description: "First classes — start from the basics.",
  },
  {
    id: "SOME_EXPERIENCE",
    title: "Some moves",
    description: "Tried a few styles and ready for more.",
  },
  {
    id: "INTERMEDIATE",
    title: "Intermediate",
    description: "Comfortable with foundations and combos.",
  },
  {
    id: "ADVANCED",
    title: "Advanced",
    description: "Training hard — push technique and performance.",
  },
];

export const SCHEDULE_VIBES: Array<{
  id: string;
  label: string;
  description: string;
}> = [
  {
    id: "weekday_evenings",
    label: "Weekday evenings",
    description: "After work or school",
  },
  {
    id: "weekends",
    label: "Weekends",
    description: "Saturday and Sunday sessions",
  },
  {
    id: "mornings",
    label: "Mornings",
    description: "Early energy before the day",
  },
  {
    id: "flexible",
    label: "Flexible",
    description: "Open to whatever fits",
  },
];

export const GOAL_PRESETS = [4, 8, 12, 16] as const;

export const ONBOARDING_STEPS = [
  "profile",
  "styles",
  "level",
  "vibe",
  "branch",
  "celebrate",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type OnboardingStepMeta = {
  art: string;
  title: string;
  emphasis: string;
  subtitle: string;
};

const ART_V = "v3";

export const STEP_META: Record<OnboardingStep, OnboardingStepMeta> = {
  profile: {
    art: `/onboarding/profile.png?${ART_V}`,
    title: "Show up",
    emphasis: "as you",
    subtitle: "A name and photo so coaches recognize you on the floor.",
  },
  styles: {
    art: `/onboarding/styles.png?${ART_V}`,
    title: "Pick your",
    emphasis: "vibe",
    subtitle: "What do you want to dance?",
  },
  level: {
    art: `/onboarding/level.png?${ART_V}`,
    title: "Where are",
    emphasis: "you at",
    subtitle: "We’ll match classes to your comfort zone.",
  },
  vibe: {
    art: `/onboarding/vibe.png?${ART_V}`,
    title: "When do you",
    emphasis: "move",
    subtitle: "Pick the times you love to train.",
  },
  branch: {
    art: `/onboarding/branch.png?${ART_V}`,
    title: "Your home",
    emphasis: "floor",
    subtitle: "Choose the studio you’ll visit most.",
  },
  celebrate: {
    art: `/onboarding/celebrate.png?${ART_V}`,
    title: "You’re",
    emphasis: "in",
    subtitle: "Set a monthly goal, then book your free trial.",
  },
};
