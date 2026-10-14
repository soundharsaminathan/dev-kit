/** Shared studio data for decorative product shots. */

export const STUDIO = "Rhythm House";
export const OWNER = "Thenmozhi";

export const BATCHES = [
  {
    id: "hiphop",
    name: "Hip Hop Intermediate",
    schedule: "Mon · Wed · Fri · 6:00 PM",
    branch: "Studio A",
    enrolled: 18,
    capacity: 20,
    trainer: "Ezhilan",
    style: "Hip Hop",
    category: "Adults",
  },
  {
    id: "ballet",
    name: "Ballet Foundations",
    schedule: "Tue · Thu · 7:15 PM",
    branch: "Studio B",
    enrolled: 12,
    capacity: 15,
    trainer: "Kuyili",
    style: "Ballet",
    category: "Adults",
  },
  {
    id: "contemp",
    name: "Contemporary Open",
    schedule: "Sat · 10:00 AM",
    branch: "Studio A",
    enrolled: 16,
    capacity: 16,
    trainer: "Thenmozhi",
    style: "Contemporary",
    category: "Adults",
  },
  {
    id: "kids",
    name: "Kids Creative",
    schedule: "Sun · 11:00 AM",
    branch: "Studio B",
    enrolled: 11,
    capacity: 20,
    trainer: "Magizhan",
    style: "Creative",
    category: "Kids",
  },
] as const;

export const STUDENTS = [
  { id: "iniya", name: "Iniya", initials: "IN", status: "present" },
  { id: "kuyili", name: "Kuyili", initials: "KU", status: "present" },
  { id: "ezhilan", name: "Ezhilan", initials: "EZ", status: "absent" },
  { id: "kaniyan", name: "Kaniyan", initials: "KA", status: "present" },
  { id: "magizhan", name: "Magizhan", initials: "MA", status: "unmarked" },
  { id: "thenmozhi", name: "Thenmozhi", initials: "TH", status: "present" },
] as const;

export const INVOICES = [
  {
    id: "inv-iniya",
    name: "Iniya",
    plan: "Quarterly · Hip Hop Intermediate",
    amount: "₹9,000",
    status: "PAID" as const,
  },
  {
    id: "inv-kaniyan",
    name: "Kaniyan",
    plan: "Monthly · Ballet Foundations",
    amount: "₹3,500",
    status: "PENDING" as const,
  },
  {
    id: "inv-ezhilan",
    name: "Ezhilan",
    plan: "Monthly · Contemporary Open",
    amount: "₹3,500",
    status: "OVERDUE" as const,
  },
] as const;

export const WEEK_DAYS = [
  { id: "mon", label: "Mon", date: "25", today: false },
  { id: "tue", label: "Tue", date: "26", today: false },
  { id: "wed", label: "Wed", date: "27", today: true },
  { id: "thu", label: "Thu", date: "28", today: false },
  { id: "fri", label: "Fri", date: "29", today: false },
  { id: "sat", label: "Sat", date: "30", today: false },
  { id: "sun", label: "Sun", date: "31", today: false },
] as const;

export const WEEK_EVENTS = [
  { id: "e1", day: 0, top: "18%", height: "22%", label: "Hip Hop Int." },
  { id: "e2", day: 1, top: "42%", height: "22%", label: "Ballet" },
  { id: "e3", day: 2, top: "18%", height: "22%", label: "Hip Hop Int." },
  { id: "e4", day: 2, top: "48%", height: "22%", label: "Ballet" },
  { id: "e5", day: 4, top: "18%", height: "22%", label: "Hip Hop Int." },
  { id: "e6", day: 5, top: "8%", height: "28%", label: "Contemporary" },
] as const;
