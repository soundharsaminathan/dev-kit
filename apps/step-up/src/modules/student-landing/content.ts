/** Student landing copy — no hyphens in body text. */

export const STUDENT_HERO = {
  headline: "Find a dance class you’ll love.",
  support:
    "Discover dance studios and classes near you, then find the right place to learn, grow, and have fun.",
  searchPlaceholder: "Search dance classes or studios",
  locationPlaceholder: "Your location",
  searchCta: "Search classes",
  proof: "Explore studios near you",
} as const;

export const STUDENT_NAV: {
  links: Array<
    { label: string; href: string } | { label: string; to: "/for-studios" }
  >;
  findStudio: string;
  joinStudio: string;
  login: string;
} = {
  links: [
    { label: "Discover", href: "#discover" },
    { label: "How it works", href: "#how-it-works" },
    { label: "For students", href: "#for-students" },
    { label: "For studios", to: "/for-studios" },
  ],
  findStudio: "Find a studio",
  joinStudio: "Join as studio",
  login: "Log in",
};

export const STUDENT_TAGLINE = {
  line1: "Find the right class.",
  line2: "Discover studios near you.",
} as const;

export const STUDENT_NEARBY = {
  headline: "Studios near you",
  support: "Explore classes and studios around your area.",
  empty: "No studios in this city yet. Try another city or browse all.",
  viewStudio: "View studio",
} as const;

export const STUDENT_HOW = {
  headline: "How classa works",
  steps: [
    {
      id: "search",
      number: "01",
      title: "Search",
      body: "Find dance classes near you by style, location, age group, or preferred time.",
    },
    {
      id: "explore",
      number: "02",
      title: "Explore",
      body: "Compare studios and classes. View schedules, pricing, locations, and available batches.",
    },
    {
      id: "join",
      number: "03",
      title: "Join",
      body: "Enroll with confidence. Choose a batch and start your learning journey.",
    },
  ],
} as const;

export const STUDENT_PERSONALIZED = {
  headline: "Something for every learner",
  support:
    "classa helps you narrow the search so finding the right class takes less effort.",
} as const;

export const STUDENT_LOCATIONS = {
  headline: "Find classes wherever you are",
  support: "Pick a city and explore studios nearby.",
  comingSoon: "Coming soon",
} as const;

export const STUDENT_BENEFITS = {
  headline: "Everything you need to choose the right class",
  items: [
    {
      id: "discovery",
      title: "Easy discovery",
      body: "Find studios and classes around you.",
    },
    {
      id: "schedules",
      title: "Clear schedules",
      body: "See available batches and timings.",
    },
    {
      id: "pricing",
      title: "Transparent pricing",
      body: "Understand plans and fees before joining.",
    },
    {
      id: "enrollment",
      title: "Simple enrollment",
      body: "Start your enrollment without unnecessary steps.",
    },
    {
      id: "journey",
      title: "Track your journey",
      body: "Keep your classes, attendance, and invoices in one place.",
    },
  ],
} as const;

export const STUDENT_PREVIEW = {
  headline: "Your classes, all in one place.",
  support:
    "From discovering your next class to keeping track of your schedule, classa keeps everything simple.",
  home: "Home",
  discover: "Discover",
  profile: "Profile",
} as const;

export const STUDENT_TRUST = {
  headline: "Learners discovering better ways to learn",
  studios: "Studios",
  classes: "Classes",
  learners: "Learners",
} as const;

export const STUDENT_FAQ = {
  headline: "Questions students and parents ask",
  items: [
    {
      q: "What is classa for students?",
      a: "classa helps you discover studios and classes near you, compare schedules and pricing, then join and manage your learning in one place.",
    },
    {
      q: "Do I need an account to browse studios?",
      a: "No. You can search and explore public studio listings without signing in. You create an account when you join a studio.",
    },
    {
      q: "How do I join a class?",
      a: "Open a studio page, create a student account for that studio, then book a trial or enroll in a batch from the member app.",
    },
    {
      q: "Can I compare more than one studio?",
      a: "Yes. Browse listings by city and filters, then open each studio to compare styles, batches, and pricing.",
    },
    {
      q: "Is pricing shown before I join?",
      a: "When a studio publishes plans, we show a starting price on the listing. Some studios may list classes without a public price yet.",
    },
    {
      q: "What if my city has no studios yet?",
      a: "Browse other cities or check back soon. Studios join classa over time, and empty cities are marked clearly.",
    },
    {
      q: "Can parents manage a child’s classes?",
      a: "Yes. Parents can create an account, link children, and follow schedules, attendance, and invoices from the member app.",
    },
    {
      q: "How do studios get listed?",
      a: "Studio owners join classa and run their floor on the platform. Listed studios appear in discover once they are active.",
    },
  ],
} as const;

export const STUDENT_FINAL_CTA = {
  headline: "Ready to find your next class?",
  support: "Discover studios and classes near you.",
  primary: "Find a studio",
  secondary: "Explore classes",
} as const;

export const STUDENT_FOOTER = {
  tagline: "Dance studio operations, beautifully simple.",
  copyright: "classa",
  forStudents: "For students",
  forStudios: "For studios",
  company: "Company",
  discoverStudios: "Discover studios",
  findClasses: "Find classes",
  howItWorks: "How it works",
  joinAsStudio: "Join as studio",
  studioLogin: "Studio login",
  features: "Features",
  about: "About",
  contact: "Contact",
  privacy: "Privacy",
  terms: "Terms",
} as const;

/** Studio landing nav addition */
export const STUDIO_NAV_EXTRA = {
  forStudents: "For students",
} as const;
