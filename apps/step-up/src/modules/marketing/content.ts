/** Landing page copy — swap strings here without touching JSX. */

export const HERO = {
  headlineLine1: "Collect every fee",
  headlineLine2: "without chasing parents",
  support:
    "classa is the workspace for dance studio owners. Students, batches, attendance, and payments live in one place so you can teach instead of chase.",
  primaryCta: "Get started",
  proof:
    "Studios mark attendance in 38 seconds, between songs, not after class.",
} as const;

export const TAGLINE = {
  // \u00A0 keeps "the fillings" together so mobile wraps after "forgot"
  lines: ["follow the fashion,", "forgot the\u00A0fillings"],
} as const;

export const PROBLEM = {
  headline: "Your studio should not run on spreadsheets, WhatsApp, and memory.",
  fragments: [
    { label: "Students", tool: "WhatsApp" },
    { label: "Attendance", tool: "Sheets" },
    { label: "Payments", tool: "Messages" },
    { label: "Schedules", tool: "Calendars" },
    { label: "Certificates", tool: "Manual work" },
  ],
  resolution: "One studio. One workspace.",
  resolutionSupport:
    "classa brings students, classes, and money into one view.",
} as const;

export const FEATURES = {
  headline: "What changes once the studio is in one place",
  items: [
    {
      id: "leads",
      title: "Turn interest into enrollment",
      body: "Capture an inquiry the moment it lands, then walk each lead from first message to signed up student. Nothing sits in a buried chat.",
      shot: "leads" as const,
    },
    {
      id: "batches",
      title: "Organize your classes",
      body: "Set up batches with trainers, schedules, and capacity. See who is enrolled, who has seats left, and keep every class running on time.",
      shot: "batches" as const,
    },
    {
      id: "attendance",
      title: "Know who showed up",
      body: "Mark attendance between songs, not after class. Spot absences the same day and keep every batch visible at a glance.",
      shot: "attendance" as const,
    },
    {
      id: "invoices",
      title: "Collect dues without the chase",
      body: "Invoices, reminders, and outstanding balances live together. Follow through becomes a workflow instead of another WhatsApp thread.",
      shot: "invoice" as const,
    },
    {
      id: "analytics",
      title: "See where the money flows",
      body: "Track collections, spot overdue payments, and watch revenue trends so you know exactly where the studio stands before the month ends.",
      shot: "paymentAnalytics" as const,
    },
  ],
} as const;

export const HOW_IT_WORKS = {
  headline: "Up and running in three steps",
  steps: [
    {
      id: "create",
      title: "Create your studio",
      body: "Add batches, trainers, and plans. Invite staff. Your floor already has a system, classa just records it.",
    },
    {
      id: "run",
      title: "Run the class",
      body: "Mark attendance, take trial bookings, and send invoices from the same workspace you open between songs.",
    },
    {
      id: "current",
      title: "Stay current",
      body: "Dues, absences, and who still needs a reply sit in one view. The week stays visible without another spreadsheet.",
    },
  ],
} as const;

export const TESTIMONIALS = {
  headline: "Built for studios that are busy teaching",
  items: [
    {
      quote:
        "We stopped chasing payments on WhatsApp. Attendance and dues finally live in one place.",
      name: "Thenmozhi",
      role: "Studio owner",
      studio: "Rhythm House, Chennai",
      initials: "TH",
      tone: "lilac" as const,
    },
    {
      quote:
        "Marking attendance between classes used to take the whole break. Now it is done before the next song.",
      name: "Magizhan",
      role: "Lead instructor",
      studio: "Rhythm House, Madurai",
      initials: "MA",
      tone: "mint" as const,
    },
    {
      quote:
        "Parents know when fees are due and what is coming up, without us sending the same message every week.",
      name: "Iniya",
      role: "Studio manager",
      studio: "Rhythm House, Coimbatore",
      initials: "IN",
      tone: "sand" as const,
    },
  ],
} as const;

export const PRICING = {
  headline: "Simple plans for a busy floor",
  support:
    "Pick the size that fits your studio. Limits are guidance for billing, not walls on day one.",
  note: "Billed monthly to the studio owner. Cancel anytime.",
  plans: [
    {
      id: "basic",
      name: "Basic",
      price: "₹999",
      cadence: "per month",
      pitch: "Run one floor and collect dues.",
      cta: "Start with Basic",
      featured: false,
      limits: [
        "200 active students",
        "10 batches",
        "3 trainers",
        "1 owner, 1 staff",
      ],
      includes: [
        "Batches, calendar, and attendance",
        "Individual and family packs",
        "Cash and UPI invoices",
        "Certificates",
        "Trial caller and class bookings",
        "Member app for students and parents",
      ],
    },
    {
      id: "advanced",
      name: "Advanced",
      price: "₹1,499",
      cadence: "per month",
      pitch: "Grow the books and the rooms.",
      cta: "Choose Advanced",
      featured: true,
      badge: "Most studios",
      limits: [
        "500 active students",
        "20 batches",
        "10 trainers",
        "1 owner, 10 staff",
      ],
      includes: [
        "Everything in Basic",
        "Online payments with Razorpay",
        "Expenses and trainer payouts",
        "Excel roster import",
        "Retention and revenue views",
        "Contests, chat, feed, and AI agent",
      ],
    },
  ],
} as const;

export const FAQ = {
  headline: "Questions owners ask before they start",
  items: [
    {
      q: "What is classa?",
      a: "classa is a workspace for dance studios. It holds students, batches, attendance, invoices, bookings, and the member app in one place so you are not stitching the week together in chats and sheets.",
    },
    {
      q: "Who is it for?",
      a: "Studio owners and staff who run classes every week, plus the trainers, students, and parents around them. If you teach dance and still chase fees by hand, this is for you.",
    },
    {
      q: "How much does classa cost?",
      a: "Basic is ₹999 a month for one floor. Advanced is ₹1,499 a month when you need online payments, import, payouts, and higher caps. classa invoices the studio owner.",
    },
    {
      q: "Can parents and students use it?",
      a: "Yes. Students and parents get a member view for schedules, attendance, invoices, and studio updates. Parents can switch between linked children.",
    },
    {
      q: "Does it work for more than one branch?",
      a: "Yes. Add locations, put batches on the right floor, and keep roster and billing together so a second branch does not mean a second spreadsheet.",
    },
    {
      q: "How do payments work?",
      a: "Mark cash or UPI paid in studio, or collect online with Razorpay on Advanced. Invoices stay tied to plans and batches so families see what is due.",
    },
    {
      q: "Can I bring existing students in?",
      a: "Yes. On Advanced you can import a roster from Excel, then attach batches and plans instead of retyping every family by hand.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. There is no lock in term. Use classa with your team and leave if it is not the right fit.",
    },
  ],
} as const;

export const FINAL_CTA = {
  headlineLine1: "Spend less time managing.",
  headlineLine2: "More time teaching.",
  support:
    "Start with Basic or Advanced this week. Cancel anytime. Your studio can live in one workspace.",
  primaryCta: "Get started",
  risk: "Monthly billing. Cancel anytime.",
} as const;

export const NAV = {
  links: [
    { label: "Product", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ],
  login: "Log in",
  start: "Get started",
} as const;

export const FOOTER = {
  tagline: "The workspace for dance studio owners.",
  copyright: "classa",
  privacy: "Privacy",
  terms: "Terms",
} as const;

export const LEGAL = {
  privacyTitle: "Privacy policy",
  termsTitle: "Terms of use",
  updated: "Last updated 30 August 2026",
} as const;

export const COMPARISON = {
  headline: "Less admin. More dance.",
  oldWay: {
    title: "The old way",
    items: [
      "Multiple spreadsheets",
      "WhatsApp follow ups",
      "Manual attendance",
      "Payment tracking",
      "Scattered student information",
      "Repetitive admin work",
    ],
  },
  withStepUp: {
    title: "With classa",
    items: [
      "One studio workspace",
      "Automated workflows",
      "Fast attendance",
      "Clear payment status",
      "Centralized student data",
      "Simple daily operations",
    ],
  },
} as const;

export const SHOWCASE = {
  headline: "A workspace built for the studio floor.",
  support: "Every screen designed around how dance studios actually run.",
} as const;

export const PERSONAS = {
  headline: "Built for everyone in the studio",
  items: [
    {
      id: "owners",
      title: "Owners",
      body: "See the studio clearly. Manage operations, payments and growth.",
      shot: "dashboard" as const,
    },
    {
      id: "staff",
      title: "Staff",
      body: "Handle everyday studio work quickly without jumping between tools.",
      shot: "attendance" as const,
    },
    {
      id: "members",
      title: "Students and parents",
      body: "View schedules, attendance, payments and studio updates from a simple member experience.",
      shot: "schedule" as const,
    },
  ],
} as const;

export const JOURNEY = {
  eyebrow: "The studio week",
  headlineLine1: "From first enquiry",
  headlineLine2: "to a class that runs",
  support:
    "classa holds the path from lead to paid student so the floor stays full.",
  student: "Iniya",
  closingHeadlineLine1: "Ready when you are",
  closingHeadlineLine2: "Start this week",
  closingSupport: "Create a studio, invite your team, and run the next class.",
  closingCta: "Get started",
  nodes: [
    {
      id: "lead",
      label: "Lead",
      titleLine1: "Catch the enquiry",
      titleLine2: "before it goes cold",
      shot: "leads",
    },
    {
      id: "batch",
      label: "Batch",
      titleLine1: "Put them in a class",
      titleLine2: "with a trainer and a time",
      shot: "batches",
    },
    {
      id: "attend",
      label: "Attendance",
      titleLine1: "Mark who showed up",
      titleLine2: "between songs",
      shot: "attendance",
    },
    {
      id: "pay",
      label: "Payments",
      titleLine1: "Send what is due",
      titleLine2: "and see who paid",
      shot: "invoice",
    },
  ],
} as const;
