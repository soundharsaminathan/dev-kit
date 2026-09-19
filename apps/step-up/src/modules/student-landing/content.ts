/** Student landing copy — no hyphens in body text. */

export const STUDENT_HERO = {
  headline: (city: string) => `Dance classes in ${city}`,
  support: "Search by style or area, then request a trial.",
  searchPlaceholder: "Style or studio",
  areaPlaceholder: "Area",
  nearMe: "Use my location",
  searchCta: "Search studios",
  proof: "Browse without an account",
  kids: "Kids",
  adults: "Adults",
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
    { label: "For studios", to: "/for-studios" },
  ],
  findStudio: "Search studios",
  joinStudio: "For studios",
  login: "Log in",
};

export const STUDENT_TAGLINE = {
  line1: "Find the right floor in Chennai.",
  line2: "Book a trial in a few taps.",
} as const;

export const STUDENT_STYLES = {
  headline: "Browse by style",
  support: "Start from the dance you want to learn.",
} as const;

export const STUDENT_AREAS = {
  headline: "Browse by area",
  support: "Pick a neighbourhood or search near you.",
  nearMe: "Near me",
} as const;

export const STUDENT_NEARBY = {
  headline: (city: string) => `Dance studios in ${city}`,
  support: "Compare batches, timings, and starting fees.",
  empty: "No dance studios match these filters yet. Try another area or style.",
  emptyCity: "Dance studios here are coming soon. Browse Chennai for now.",
  viewStudio: "View studio",
  seeAll: "See all studios",
  kids: "Kids",
  adults: "Adults",
  evening: "Evening",
  weekend: "Weekend",
} as const;

export const STUDENT_HOW = {
  headline: "How classa works",
  steps: [
    {
      id: "search",
      number: "01",
      title: "Search",
      body: "Find dance classes by style, area, or studio name.",
    },
    {
      id: "compare",
      number: "02",
      title: "Compare",
      body: "Open a studio to see batches, timings, and starting fees.",
    },
    {
      id: "trial",
      number: "03",
      title: "Request a trial",
      body: "Pick a slot, then leave your name and phone. No account needed to browse.",
    },
  ],
} as const;

export const STUDENT_FAQ = {
  headline: "Questions students and parents ask",
  items: [
    {
      q: "Do I need an account to browse studios?",
      a: "No. You can search Chennai dance studios without signing in. You create an account when you request a trial.",
    },
    {
      q: "When do I register?",
      a: "When you request a trial. We ask for your name and phone, plus an email so you can come back to the booking.",
    },
    {
      q: "Can a parent book for a child?",
      a: "Yes. Request the trial with your name and phone, and add the child’s first name if the class is for them.",
    },
    {
      q: "Is pricing shown before I join?",
      a: "When a studio publishes plans, we show a starting fee on the listing. Some studios may list classes without a public price yet.",
    },
    {
      q: "What if my area has no studio?",
      a: "We show nearby Chennai floors, or you can browse all dance studios in the city.",
    },
    {
      q: "Are other cities live?",
      a: "Chennai is live. Bengaluru, Hyderabad, Mumbai, Delhi, and Coimbatore are coming soon.",
    },
    {
      q: "How do I find Bharatanatyam classes in Chennai?",
      a: "Tap Bharatanatyam on the homepage, or search that style and pick an area such as Mylapore or Adyar.",
    },
    {
      q: "How do studios get listed?",
      a: "Studio owners join classa and run their floor on the platform. Listed studios appear in discover once they are active.",
    },
  ],
} as const;

export const STUDENT_FINAL_CTA = {
  headline: "Ready to find a class in Chennai?",
  support: "Search by style or area, then request a trial.",
  primary: "Search studios",
  secondary: "See how it works",
} as const;

export const STUDENT_FOOTER = {
  tagline: "Dance studios across Chennai, in one search.",
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
  styles: "Styles",
  areas: "Areas",
} as const;

export const STUDIO_NAV_EXTRA = {
  forStudents: "For students",
} as const;

export const STUDENT_CITY = {
  label: "City",
  comingSoon: "Coming soon",
  pickerTitle: "Choose your city",
  liveHint: "Chennai is live. Other cities are on the way.",
} as const;

export const STUDENT_TRIAL = {
  cta: "Book a trial",
  signIn: "Already on classa? Sign in",
  back: "Back to discover",
  sheetTitle: "Book a trial",
  pickSlot: "Pick a slot",
  noSlots:
    "This studio has no open trial slots right now. Leave your details and they can follow up.",
  yourDetails: "Your details",
  name: "Your name",
  phone: "Phone",
  email: "Email",
  password: "Password",
  childToggle: "This is for my child",
  childName: "Child first name",
  submit: "Request this trial",
  google: "Continue with Google",
  success: "Trial requested. The studio will confirm the slot.",
} as const;
