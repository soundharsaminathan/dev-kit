import type { AgeRange, ExperienceLevel, Gender } from "@/lib/constants";

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

export const GENDERS: Array<{
  id: Gender;
  title: string;
  description: string;
}> = [
  {
    id: "FEMALE",
    title: "Female",
    description: "Required for class matching",
  },
  {
    id: "MALE",
    title: "Male",
    description: "Required for class matching",
  },
];

export const AGE_RANGES: Array<{
  id: AgeRange;
  title: string;
  label: string;
  description: string;
}> = [
  {
    id: "UNDER_10",
    title: "Under 10",
    label: "Toddlers",
    description: "Little movers finding their feet",
  },
  {
    id: "TEN_TO_TWENTY",
    title: "10–20",
    label: "Teens",
    description: "Youth energy and growing technique",
  },
  {
    id: "TWENTY_TO_FORTY",
    title: "20–40",
    label: "Adults",
    description: "Prime years on the floor",
  },
  {
    id: "FORTY_PLUS",
    title: "40+",
    label: "Masters",
    description: "Experience in every step",
  },
];

export const GOAL_PRESETS = [4, 8, 12, 16] as const;

export const ONBOARDING_STEPS = [
  "profile",
  "level",
  "trialTime",
  "trainer",
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
    subtitle:
      "Name, photo, and a bit about you so coaches know who’s on the floor.",
  },
  level: {
    art: `/onboarding/level.png?${ART_V}`,
    title: "Where are",
    emphasis: "you at",
    subtitle: "We’ll match classes to your comfort zone.",
  },
  trialTime: {
    art: `/onboarding/vibe.png?${ART_V}`,
    title: "Pick a",
    emphasis: "trial time",
    subtitle:
      "Choose any date and time that works — we’ll confirm with your trainer.",
  },
  trainer: {
    art: `/onboarding/celebrate.png?${ART_V}`,
    title: "Any",
    emphasis: "trainer",
    subtitle: "Swipe or tap to pick who you want for the trial — or skip.",
  },
};
