import "dotenv/config";
import { ConfigService } from "@nestjs/config";
import {
  AttendanceSource,
  AttendanceStatus,
  BillingCadence,
  BookingStatus,
  BookingType,
  EnrollmentMode,
  FamilyPack,
  IndividualAudience,
  InvoiceStatus,
  MembershipSeatRole,
  MembershipStatus,
  type Prisma,
  PrismaClient,
  ProfileVisibility,
  SessionStatus,
  SessionType,
  SubscriptionKind,
  UserRole,
} from "@prisma/client";
import { UserCryptoService } from "../src/users/user-crypto.service";

const prisma = new PrismaClient();
const crypto = new UserCryptoService(new ConfigService());

const STUDIO_ID = "studio-seed-1";

const AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80",
  "https://images.unsplash.com/photo-1522075469751-3840a4f0e8b9?w=400&q=80",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80",
];

function squarePortrait(photoId: string) {
  return `https://images.unsplash.com/${photoId}?w=400&h=400&fit=crop&crop=faces&auto=format&q=80`;
}

const TRAINER_AVATARS = {
  "trainer-1": squarePortrait("photo-1507003211169-0a1dd7228f2d"),
  "trainer-2": squarePortrait("photo-1534528741775-53994a69daeb"),
  "trainer-3": squarePortrait("photo-1500648767791-00dcc994a43e"),
  "trainer-4": squarePortrait("photo-1524504388940-b1c1722653e1"),
  "trainer-5": squarePortrait("photo-1539571696357-5a69c17a67c6"),
} as const;

type SeedUser = {
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
  phone: string;
  bio: string;
  instagramUrl: string;
  photoUrl: string;
  styles: string[];
  profileVisibility: ProfileVisibility;
  role: UserRole;
};

function mondayOfWeek(from = new Date()): Date {
  const d = new Date(from);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function utcAt(base: Date, dayOffset: number, hour: number, minute = 0): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

function nextWeekdayOccurrences(
  weekday: number,
  count: number,
  hour: number,
  minute = 0,
  from = new Date(),
): Date[] {
  const results: Date[] = [];
  const cursor = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );
  while (results.length < count) {
    if (cursor.getUTCDay() === weekday) {
      const startsAt = new Date(cursor);
      startsAt.setUTCHours(hour, minute, 0, 0);
      if (startsAt.getTime() > from.getTime()) {
        results.push(new Date(startsAt));
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return results;
}

async function upsertUser(user: SeedUser) {
  const sealed = crypto.sealPii({
    email: user.email,
    name: user.name,
    phone: user.phone,
    bio: user.bio,
    instagramUrl: user.instagramUrl,
  });
  const studentOnboarding =
    user.role === UserRole.STUDENT && user.styles.length > 0
      ? {
          experienceLevel: "BEGINNER" as const,
          scheduleVibe: ["weekday_evenings", "weekends"],
          gender: "FEMALE" as const,
          ageRange: "TWENTY_TO_FORTY" as const,
          onboardingCompletedAt: new Date(),
        }
      : {};
  await prisma.user.upsert({
    where: { firebaseUid: user.firebaseUid },
    update: {
      ...sealed,
      photoUrl: user.photoUrl,
      styles: user.styles,
      profileVisibility: user.profileVisibility,
      studioId: STUDIO_ID,
      role: user.role,
      ...studentOnboarding,
    },
    create: {
      id: user.id,
      firebaseUid: user.firebaseUid,
      ...sealed,
      photoUrl: user.photoUrl,
      styles: user.styles,
      profileVisibility: user.profileVisibility,
      role: user.role,
      studioId: STUDIO_ID,
      ...studentOnboarding,
    },
  });
}

async function main() {
  const ownerSealed = crypto.sealPii({
    email: "owner@stepup.dev",
    name: "Studio Owner",
    phone: "+91 98000 00001",
    bio: "Founder of Step Up Dance Studio. Building community through movement.",
    instagramUrl: "https://instagram.com/stepup.owner",
  });

  const owner = await prisma.user.upsert({
    where: { firebaseUid: "dev-owner-1" },
    update: {
      ...ownerSealed,
      photoUrl: AVATARS[0],
      styles: ["Hip Hop", "Contemporary"],
      profileVisibility: ProfileVisibility.PUBLIC,
    },
    create: {
      id: "owner-1",
      firebaseUid: "dev-owner-1",
      ...ownerSealed,
      photoUrl: AVATARS[0],
      role: UserRole.OWNER,
      styles: ["Hip Hop", "Contemporary"],
      profileVisibility: ProfileVisibility.PUBLIC,
    },
  });

  await prisma.studio.upsert({
    where: { id: STUDIO_ID },
    update: {},
    create: {
      id: STUDIO_ID,
      name: "Step Up Dance Studio",
      address: "123 Main St",
      photos: [],
      contact: "owner@stepup.dev",
      ownerId: owner.id,
    },
  });

  await prisma.studioSettings.upsert({
    where: { studioId: STUDIO_ID },
    update: {},
    create: {
      studioId: STUDIO_ID,
      graceDays: 3,
      expireAlertDays: 7,
      platformFeePercent: 5,
    },
  });

  await prisma.user.update({
    where: { id: owner.id },
    data: { studioId: STUDIO_ID },
  });

  const trainers: SeedUser[] = [
    {
      id: "trainer-1",
      firebaseUid: "dev-trainer-1",
      email: "trainer@stepup.dev",
      name: "Lead Trainer",
      phone: "+91 98765 43210",
      bio: "Lead instructor with 12 years in hip-hop and freestyle. Competition coach.",
      instagramUrl: "https://instagram.com/lead.trainer",
      photoUrl: TRAINER_AVATARS["trainer-1"],
      styles: ["Hip Hop", "Freestyle", "Breaking"],
      profileVisibility: ProfileVisibility.PUBLIC,
      role: UserRole.TRAINER,
    },
    {
      id: "trainer-2",
      firebaseUid: "dev-trainer-2",
      email: "nadia@stepup.dev",
      name: "Nadia Rossi",
      phone: "+91 98765 43211",
      bio: "Contemporary and lyrical specialist. Former company dancer.",
      instagramUrl: "https://instagram.com/nadia.rossi.dance",
      photoUrl: TRAINER_AVATARS["trainer-2"],
      styles: ["Contemporary", "Lyrical"],
      profileVisibility: ProfileVisibility.PUBLIC,
      role: UserRole.TRAINER,
    },
    {
      id: "trainer-3",
      firebaseUid: "dev-trainer-3",
      email: "marcus@stepup.dev",
      name: "Marcus Lee",
      phone: "+91 98765 43212",
      bio: "House and locking foundations. Weekend workshop host.",
      instagramUrl: "https://instagram.com/marcuslee.move",
      photoUrl: TRAINER_AVATARS["trainer-3"],
      styles: ["House", "Locking", "Hip Hop"],
      profileVisibility: ProfileVisibility.PUBLIC,
      role: UserRole.TRAINER,
    },
    {
      id: "trainer-4",
      firebaseUid: "dev-trainer-4",
      email: "aisha@stepup.dev",
      name: "Aisha Khan",
      phone: "+91 98765 43213",
      bio: "Bollywood and commercial choreographer for kids and teens.",
      instagramUrl: "https://instagram.com/aisha.khan.choreo",
      photoUrl: TRAINER_AVATARS["trainer-4"],
      styles: ["Bollywood", "Commercial"],
      profileVisibility: ProfileVisibility.PUBLIC,
      role: UserRole.TRAINER,
    },
    {
      id: "trainer-5",
      firebaseUid: "dev-trainer-5",
      email: "jordan@stepup.dev",
      name: "Jordan Blake",
      phone: "+91 98765 43214",
      bio: "Private lesson specialist — technique, musicality, and stage presence.",
      instagramUrl: "https://instagram.com/jordanblake.dance",
      photoUrl: TRAINER_AVATARS["trainer-5"],
      styles: ["Jazz", "Contemporary", "Commercial"],
      profileVisibility: ProfileVisibility.PUBLIC,
      role: UserRole.TRAINER,
    },
  ];

  const staffAndParent: SeedUser[] = [
    {
      id: "staff-1",
      firebaseUid: "dev-staff-1",
      email: "staff@stepup.dev",
      name: "Front Desk Staff",
      phone: "+91 98000 00002",
      bio: "Studio front desk — schedules, check-ins, and memberships.",
      instagramUrl: "https://instagram.com/stepup.frontdesk",
      photoUrl: AVATARS[6],
      styles: [],
      profileVisibility: ProfileVisibility.PUBLIC,
      role: UserRole.STAFF,
    },
    {
      id: "parent-1",
      firebaseUid: "dev-parent-1",
      email: "parent@stepup.dev",
      name: "Jamie Parent",
      phone: "+91 98000 00003",
      bio: "Parent of Alex. Happy to coordinate carpools.",
      instagramUrl: "https://instagram.com/jamie.parent",
      photoUrl: AVATARS[7],
      styles: [],
      profileVisibility: ProfileVisibility.PRIVATE,
      role: UserRole.PARENT,
    },
  ];

  const studentProfiles: Array<Omit<SeedUser, "role" | "profileVisibility">> = [
    {
      id: "student-1",
      firebaseUid: "dev-student-1",
      email: "student@stepup.dev",
      name: "Alex Student",
      phone: "+91 91234 56789",
      bio: "Kids batch regular. Working on freestyle confidence.",
      instagramUrl: "https://instagram.com/alex.steps",
      photoUrl: AVATARS[0],
      styles: ["Hip Hop"],
    },
    {
      id: "student-2",
      firebaseUid: "dev-student-2",
      email: "priya@stepup.dev",
      name: "Priya Nair",
      phone: "+91 91234 56701",
      bio: "Loves contemporary floorwork and slow lyric pieces.",
      instagramUrl: "https://instagram.com/priya.nair.moves",
      photoUrl: AVATARS[1],
      styles: ["Contemporary", "Lyrical"],
    },
    {
      id: "student-3",
      firebaseUid: "dev-student-3",
      email: "diego@stepup.dev",
      name: "Diego Fernandez",
      phone: "+91 91234 56702",
      bio: "Breaking and power moves. Competition hopeful.",
      instagramUrl: "https://instagram.com/diego.breaks",
      photoUrl: AVATARS[2],
      styles: ["Breaking", "Hip Hop"],
    },
    {
      id: "student-4",
      firebaseUid: "dev-student-4",
      email: "mei@stepup.dev",
      name: "Mei Tanaka",
      phone: "+91 91234 56703",
      bio: "Jazz technique focus with weekend workshops.",
      instagramUrl: "https://instagram.com/mei.tanaka.dance",
      photoUrl: AVATARS[3],
      styles: ["Jazz", "Commercial"],
    },
    {
      id: "student-5",
      firebaseUid: "dev-student-5",
      email: "sam@stepup.dev",
      name: "Sam Okoye",
      phone: "+91 91234 56704",
      bio: "Adult beginner — strength and rhythm first.",
      instagramUrl: "https://instagram.com/sam.okoye",
      photoUrl: AVATARS[4],
      styles: ["Hip Hop"],
    },
    {
      id: "student-6",
      firebaseUid: "dev-student-6",
      email: "lena@stepup.dev",
      name: "Lena Müller",
      phone: "+91 91234 56705",
      bio: "House grooves and social freestyle nights.",
      instagramUrl: "https://instagram.com/lena.mueller.moves",
      photoUrl: AVATARS[5],
      styles: ["House", "Hip Hop"],
    },
    {
      id: "student-7",
      firebaseUid: "dev-student-7",
      email: "arjun@stepup.dev",
      name: "Arjun Mehta",
      phone: "+91 91234 56706",
      bio: "Bollywood choreo fan. Performing arts school student.",
      instagramUrl: "https://instagram.com/arjun.mehta.dance",
      photoUrl: AVATARS[6],
      styles: ["Bollywood", "Commercial"],
    },
    {
      id: "student-8",
      firebaseUid: "dev-student-8",
      email: "sofia@stepup.dev",
      name: "Sofia Alvarez",
      phone: "+91 91234 56707",
      bio: "Kids hip-hop — energy and stage smiles.",
      instagramUrl: "https://instagram.com/sofia.alvarez.dance",
      photoUrl: AVATARS[7],
      styles: ["Hip Hop"],
    },
    {
      id: "student-9",
      firebaseUid: "dev-student-9",
      email: "noah@stepup.dev",
      name: "Noah Kim",
      phone: "+91 91234 56708",
      bio: "Adult intermediate locking and popping.",
      instagramUrl: "https://instagram.com/noah.kim.moves",
      photoUrl: AVATARS[8],
      styles: ["Locking", "Popping"],
    },
    {
      id: "student-10",
      firebaseUid: "dev-student-10",
      email: "zara@stepup.dev",
      name: "Zara Ahmed",
      phone: "+91 91234 56709",
      bio: "Commercial choreography and music video looks.",
      instagramUrl: "https://instagram.com/zara.ahmed.choreo",
      photoUrl: AVATARS[9],
      styles: ["Commercial", "Hip Hop"],
    },
    {
      id: "student-11",
      firebaseUid: "dev-student-11",
      email: "lucas@stepup.dev",
      name: "Lucas Berg",
      phone: "+91 91234 56710",
      bio: "Contemporary partnering practice seeker.",
      instagramUrl: "https://instagram.com/lucas.berg.dance",
      photoUrl: AVATARS[0],
      styles: ["Contemporary"],
    },
    {
      id: "student-12",
      firebaseUid: "dev-student-12",
      email: "amara@stepup.dev",
      name: "Amara Okafor",
      phone: "+91 91234 56711",
      bio: "Afrobeats and open-style freestyle.",
      instagramUrl: "https://instagram.com/amara.okafor",
      photoUrl: AVATARS[1],
      styles: ["Afrobeats", "Hip Hop"],
    },
    {
      id: "student-13",
      firebaseUid: "dev-student-13",
      email: "ethan@stepup.dev",
      name: "Ethan Brooks",
      phone: "+91 91234 56712",
      bio: "Kids batch — loves battles and cyphers.",
      instagramUrl: "https://instagram.com/ethan.brooks.moves",
      photoUrl: AVATARS[2],
      styles: ["Hip Hop", "Breaking"],
    },
    {
      id: "student-14",
      firebaseUid: "dev-student-14",
      email: "isla@stepup.dev",
      name: "Isla Chen",
      phone: "+91 91234 56713",
      bio: "Ballet-informed contemporary. Clean lines.",
      instagramUrl: "https://instagram.com/isla.chen.dance",
      photoUrl: AVATARS[3],
      styles: ["Contemporary", "Ballet"],
    },
    {
      id: "student-15",
      firebaseUid: "dev-student-15",
      email: "omar@stepup.dev",
      name: "Omar Hassan",
      phone: "+91 91234 56714",
      bio: "Trial-to-member pipeline. Exploring styles.",
      instagramUrl: "https://instagram.com/omar.hassan.move",
      photoUrl: AVATARS[4],
      styles: ["Hip Hop"],
    },
    {
      id: "student-16",
      firebaseUid: "dev-student-16",
      email: "ruby@stepup.dev",
      name: "Ruby Santos",
      phone: "+91 91234 56715",
      bio: "Adult unlimited — trains 4x a week.",
      instagramUrl: "https://instagram.com/ruby.santos.dance",
      photoUrl: AVATARS[5],
      styles: ["Commercial", "Jazz"],
    },
    {
      id: "student-17",
      firebaseUid: "dev-student-17",
      email: "kai@stepup.dev",
      name: "Kai Nakamura",
      phone: "+91 91234 56716",
      bio: "Popping and animation drills after school.",
      instagramUrl: "https://instagram.com/kai.nakamura.moves",
      photoUrl: AVATARS[6],
      styles: ["Popping", "Hip Hop"],
    },
    {
      id: "student-18",
      firebaseUid: "dev-student-18",
      email: "freya@stepup.dev",
      name: "Freya Olsen",
      phone: "+91 91234 56717",
      bio: "Lyrical storytelling and improv circles.",
      instagramUrl: "https://instagram.com/freya.olsen.dance",
      photoUrl: AVATARS[7],
      styles: ["Lyrical", "Contemporary"],
    },
    {
      id: "student-19",
      firebaseUid: "dev-student-19",
      email: "dev@stepup.dev",
      name: "Dev Patel",
      phone: "+91 91234 56718",
      bio: "Bollywood group routines and festival prep.",
      instagramUrl: "https://instagram.com/dev.patel.choreo",
      photoUrl: AVATARS[8],
      styles: ["Bollywood"],
    },
    {
      id: "student-20",
      firebaseUid: "dev-student-20",
      email: "nina@stepup.dev",
      name: "Nina Volkov",
      phone: "+91 91234 56719",
      bio: "Private lesson regular with Jordan.",
      instagramUrl: "https://instagram.com/nina.volkov.moves",
      photoUrl: AVATARS[9],
      styles: ["Jazz", "Contemporary"],
    },
  ];

  for (const trainer of trainers) {
    await upsertUser(trainer);
  }
  for (const user of staffAndParent) {
    await upsertUser(user);
  }
  for (const [index, profile] of studentProfiles.entries()) {
    await upsertUser({
      ...profile,
      role: UserRole.STUDENT,
      profileVisibility:
        index % 3 === 0 ? ProfileVisibility.PUBLIC : ProfileVisibility.PRIVATE,
    });
  }

  await prisma.parentChild.upsert({
    where: {
      parentUserId_childUserId: {
        parentUserId: "parent-1",
        childUserId: "student-1",
      },
    },
    update: {},
    create: {
      parentUserId: "parent-1",
      childUserId: "student-1",
    },
  });

  type SubscriptionCatalogSeed = {
    id: string;
    name: string;
    kind: SubscriptionKind;
    individualAudience: IndividualAudience | null;
    familyPack: FamilyPack | null;
    billingCadence: BillingCadence;
    adultSeats: number;
    kidSeats: number;
    price: number;
  };

  const subscriptionCatalog: SubscriptionCatalogSeed[] = [
    {
      id: "sub-individual-adult-monthly",
      name: "Individual Adult Monthly",
      kind: SubscriptionKind.INDIVIDUAL,
      individualAudience: IndividualAudience.ADULT,
      familyPack: null,
      billingCadence: BillingCadence.MONTHLY,
      adultSeats: 1,
      kidSeats: 0,
      price: 3500,
    },
    {
      id: "sub-individual-adult-quarterly",
      name: "Individual Adult Quarterly",
      kind: SubscriptionKind.INDIVIDUAL,
      individualAudience: IndividualAudience.ADULT,
      familyPack: null,
      billingCadence: BillingCadence.QUARTERLY,
      adultSeats: 1,
      kidSeats: 0,
      price: 9000,
    },
    {
      id: "sub-individual-kid-monthly",
      name: "Individual Kid Monthly",
      kind: SubscriptionKind.INDIVIDUAL,
      individualAudience: IndividualAudience.KID,
      familyPack: null,
      billingCadence: BillingCadence.MONTHLY,
      adultSeats: 0,
      kidSeats: 1,
      price: 2500,
    },
    {
      id: "sub-individual-kid-quarterly",
      name: "Individual Kid Quarterly",
      kind: SubscriptionKind.INDIVIDUAL,
      individualAudience: IndividualAudience.KID,
      familyPack: null,
      billingCadence: BillingCadence.QUARTERLY,
      adultSeats: 0,
      kidSeats: 1,
      price: 6500,
    },
    {
      id: "sub-family-two-kids-monthly",
      name: "Family Two Kids Monthly",
      kind: SubscriptionKind.FAMILY,
      individualAudience: null,
      familyPack: FamilyPack.TWO_KIDS,
      billingCadence: BillingCadence.MONTHLY,
      adultSeats: 0,
      kidSeats: 2,
      price: 4000,
    },
    {
      id: "sub-family-two-kids-quarterly",
      name: "Family Two Kids Quarterly",
      kind: SubscriptionKind.FAMILY,
      individualAudience: null,
      familyPack: FamilyPack.TWO_KIDS,
      billingCadence: BillingCadence.QUARTERLY,
      adultSeats: 0,
      kidSeats: 2,
      price: 10500,
    },
    {
      id: "sub-family-one-adult-one-kid-monthly",
      name: "Family One Adult One Kid Monthly",
      kind: SubscriptionKind.FAMILY,
      individualAudience: null,
      familyPack: FamilyPack.ONE_ADULT_ONE_KID,
      billingCadence: BillingCadence.MONTHLY,
      adultSeats: 1,
      kidSeats: 1,
      price: 4500,
    },
    {
      id: "sub-family-one-adult-one-kid-quarterly",
      name: "Family One Adult One Kid Quarterly",
      kind: SubscriptionKind.FAMILY,
      individualAudience: null,
      familyPack: FamilyPack.ONE_ADULT_ONE_KID,
      billingCadence: BillingCadence.QUARTERLY,
      adultSeats: 1,
      kidSeats: 1,
      price: 12000,
    },
    {
      id: "sub-family-two-adults-monthly",
      name: "Family Two Adults Monthly",
      kind: SubscriptionKind.FAMILY,
      individualAudience: null,
      familyPack: FamilyPack.TWO_ADULTS,
      billingCadence: BillingCadence.MONTHLY,
      adultSeats: 2,
      kidSeats: 0,
      price: 5500,
    },
    {
      id: "sub-family-two-adults-quarterly",
      name: "Family Two Adults Quarterly",
      kind: SubscriptionKind.FAMILY,
      individualAudience: null,
      familyPack: FamilyPack.TWO_ADULTS,
      billingCadence: BillingCadence.QUARTERLY,
      adultSeats: 2,
      kidSeats: 0,
      price: 14500,
    },
    {
      id: "sub-family-one-adult-two-kids-monthly",
      name: "Family One Adult Two Kids Monthly",
      kind: SubscriptionKind.FAMILY,
      individualAudience: null,
      familyPack: FamilyPack.ONE_ADULT_TWO_KIDS,
      billingCadence: BillingCadence.MONTHLY,
      adultSeats: 1,
      kidSeats: 2,
      price: 5500,
    },
    {
      id: "sub-family-one-adult-two-kids-quarterly",
      name: "Family One Adult Two Kids Quarterly",
      kind: SubscriptionKind.FAMILY,
      individualAudience: null,
      familyPack: FamilyPack.ONE_ADULT_TWO_KIDS,
      billingCadence: BillingCadence.QUARTERLY,
      adultSeats: 1,
      kidSeats: 2,
      price: 14500,
    },
    {
      id: "sub-family-two-adults-one-kid-monthly",
      name: "Family Two Adults One Kid Monthly",
      kind: SubscriptionKind.FAMILY,
      individualAudience: null,
      familyPack: FamilyPack.TWO_ADULTS_ONE_KID,
      billingCadence: BillingCadence.MONTHLY,
      adultSeats: 2,
      kidSeats: 1,
      price: 6500,
    },
    {
      id: "sub-family-two-adults-one-kid-quarterly",
      name: "Family Two Adults One Kid Quarterly",
      kind: SubscriptionKind.FAMILY,
      individualAudience: null,
      familyPack: FamilyPack.TWO_ADULTS_ONE_KID,
      billingCadence: BillingCadence.QUARTERLY,
      adultSeats: 2,
      kidSeats: 1,
      price: 17000,
    },
    {
      id: "sub-family-two-adults-two-kids-monthly",
      name: "Family Two Adults Two Kids Monthly",
      kind: SubscriptionKind.FAMILY,
      individualAudience: null,
      familyPack: FamilyPack.TWO_ADULTS_TWO_KIDS,
      billingCadence: BillingCadence.MONTHLY,
      adultSeats: 2,
      kidSeats: 2,
      price: 7500,
    },
    {
      id: "sub-family-two-adults-two-kids-quarterly",
      name: "Family Two Adults Two Kids Quarterly",
      kind: SubscriptionKind.FAMILY,
      individualAudience: null,
      familyPack: FamilyPack.TWO_ADULTS_TWO_KIDS,
      billingCadence: BillingCadence.QUARTERLY,
      adultSeats: 2,
      kidSeats: 2,
      price: 19500,
    },
  ];

  for (const sub of subscriptionCatalog) {
    await prisma.subscription.upsert({
      where: { id: sub.id },
      update: {
        name: sub.name,
        kind: sub.kind,
        individualAudience: sub.individualAudience,
        familyPack: sub.familyPack,
        billingCadence: sub.billingCadence,
        adultSeats: sub.adultSeats,
        kidSeats: sub.kidSeats,
        price: sub.price,
        active: true,
        studioId: STUDIO_ID,
        creatorId: owner.id,
      },
      create: {
        id: sub.id,
        studioId: STUDIO_ID,
        creatorId: owner.id,
        name: sub.name,
        kind: sub.kind,
        individualAudience: sub.individualAudience,
        familyPack: sub.familyPack,
        billingCadence: sub.billingCadence,
        adultSeats: sub.adultSeats,
        kidSeats: sub.kidSeats,
        price: sub.price,
        active: true,
      },
    });
  }

  const mainBranch = await prisma.studioBranch.upsert({
    where: { id: "branch-main-1" },
    update: {},
    create: {
      id: "branch-main-1",
      studioId: STUDIO_ID,
      name: "Main studio",
      address: "123 Main St",
      latitude: 12.9716,
      longitude: 77.5946,
      description: "Our flagship studio with two practice halls.",
      amenities: ["parking", "ac", "lockers", "wifi"],
    },
  });

  const eastBranch = await prisma.studioBranch.upsert({
    where: { id: "branch-east-1" },
    update: {},
    create: {
      id: "branch-east-1",
      studioId: STUDIO_ID,
      name: "East wing",
      address: "45 Lake Road",
      latitude: 12.978,
      longitude: 77.64,
      description: "Bright lakeside space for evening batches.",
      amenities: ["ac", "wifi"],
    },
  });

  await prisma.user.updateMany({
    where: {
      studioId: STUDIO_ID,
      role: UserRole.STUDENT,
      preferredBranchId: null,
    },
    data: {
      preferredBranchId: mainBranch.id,
    },
  });

  const sampleCertificate = await prisma.certificateTemplate.upsert({
    where: { id: `cert-sample-${STUDIO_ID}` },
    update: {},
    create: {
      id: `cert-sample-${STUDIO_ID}`,
      studioId: STUDIO_ID,
      name: "Classic completion",
      isSample: true,
      layoutJson: {
        style: "classic",
        title: "Certificate of Completion",
        subtitle: "This is to certify that",
        achievement: "has successfully completed",
        signOff: "Awarded in recognition of dedication and progress",
        showDanceCategories: true,
        showTrainers: true,
      },
    },
  });

  type BatchSeed = {
    id: string;
    name: string;
    category: "KIDS" | "ADULTS";
    branchId: string;
    danceCategories: Array<{ name: string; description: string }>;
    scheduleJson: Prisma.InputJsonValue;
    capacity: number;
    enrollmentMode: EnrollmentMode;
    creatorId: string;
    active: boolean;
    certificationEnabled: boolean;
    coverImageUrl: string;
    ratingAvg: number | null;
    ratingCount: number;
    trainerIds: string[];
  };

  const batches: BatchSeed[] = [
    {
      id: "batch-kids-1",
      name: "SS School Kids",
      category: "KIDS",
      branchId: mainBranch.id,
      danceCategories: [
        {
          name: "Hip-hop",
          description:
            "Foundations, grooves, and age-appropriate choreography.",
        },
      ],
      scheduleJson: { days: ["Mon", "Wed"], time: "17:00" },
      capacity: 20,
      enrollmentMode: EnrollmentMode.STAFF_ONLY,
      creatorId: "trainer-1",
      active: true,
      certificationEnabled: true,
      coverImageUrl:
        "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
      ratingAvg: 4.8,
      ratingCount: 24,
      trainerIds: ["trainer-1", "trainer-4"],
    },
    {
      id: "batch-adults-1",
      name: "Adult Hip-Hop Intermediate",
      category: "ADULTS",
      branchId: mainBranch.id,
      danceCategories: [
        {
          name: "Hip-hop",
          description: "Intermediate grooves, freestyle lab, combo clean-up.",
        },
      ],
      scheduleJson: { days: ["Tue", "Thu"], time: "19:00" },
      capacity: 18,
      enrollmentMode: EnrollmentMode.STAFF_ONLY,
      creatorId: "trainer-1",
      active: true,
      certificationEnabled: false,
      coverImageUrl:
        "https://images.unsplash.com/photo-1535525153412-5a42439a210d?w=800&q=80",
      ratingAvg: 4.6,
      ratingCount: 31,
      trainerIds: ["trainer-1", "trainer-3"],
    },
    {
      id: "batch-contemporary-1",
      name: "Contemporary Open Floor",
      category: "ADULTS",
      branchId: eastBranch.id,
      danceCategories: [
        {
          name: "Contemporary",
          description: "Floorwork, release technique, and phrase work.",
        },
      ],
      scheduleJson: { days: ["Wed", "Fri"], time: "18:30" },
      capacity: 16,
      enrollmentMode: EnrollmentMode.SELF_JOIN,
      creatorId: "trainer-2",
      active: true,
      certificationEnabled: true,
      coverImageUrl:
        "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800&q=80",
      ratingAvg: 4.9,
      ratingCount: 18,
      trainerIds: ["trainer-2", "trainer-5"],
    },
    {
      id: "batch-beginner-1",
      name: "Adult Beginner Drop-in",
      category: "ADULTS",
      branchId: eastBranch.id,
      danceCategories: [
        {
          name: "Hip-hop",
          description: "No experience required — basics and musicality.",
        },
      ],
      scheduleJson: { days: ["Sat"], time: "10:00" },
      capacity: 25,
      enrollmentMode: EnrollmentMode.SELF_JOIN,
      creatorId: "trainer-3",
      active: true,
      certificationEnabled: false,
      coverImageUrl:
        "https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=80",
      ratingAvg: 4.4,
      ratingCount: 12,
      trainerIds: ["trainer-3"],
    },
    {
      id: "batch-trial-1",
      name: "Open Beginner Class",
      category: "ADULTS",
      branchId: mainBranch.id,
      danceCategories: [
        {
          name: "Hip-hop",
          description: "Open beginner class — try sessions before you commit.",
        },
      ],
      scheduleJson: { days: ["Sat"], time: "11:00" },
      capacity: 20,
      enrollmentMode: EnrollmentMode.SELF_JOIN,
      creatorId: "trainer-3",
      active: true,
      certificationEnabled: false,
      coverImageUrl:
        "https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=800&q=80",
      ratingAvg: null,
      ratingCount: 0,
      trainerIds: ["trainer-3", "trainer-1"],
    },
    {
      id: "batch-inactive-1",
      name: "Summer Intensive 2025 (archived)",
      category: "ADULTS",
      branchId: mainBranch.id,
      danceCategories: [
        {
          name: "Commercial",
          description: "Past summer intensive — kept for history.",
        },
      ],
      scheduleJson: {
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        time: "11:00",
      },
      capacity: 20,
      enrollmentMode: EnrollmentMode.STAFF_ONLY,
      creatorId: "trainer-4",
      active: false,
      certificationEnabled: true,
      coverImageUrl:
        "https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?w=800&q=80",
      ratingAvg: 4.7,
      ratingCount: 40,
      trainerIds: ["trainer-4", "trainer-5"],
    },
  ];

  for (const batch of batches) {
    const { trainerIds, ...data } = batch;
    await prisma.batch.upsert({
      where: { id: batch.id },
      update: {
        name: data.name,
        category: data.category,
        branchId: data.branchId,
        danceCategories: data.danceCategories,
        scheduleJson: data.scheduleJson,
        capacity: data.capacity,
        enrollmentMode: data.enrollmentMode,
        active: data.active,
        certificationEnabled: data.certificationEnabled,
        certificateTemplateId: data.certificationEnabled
          ? sampleCertificate.id
          : null,
        coverImageUrl: data.coverImageUrl,
        ratingAvg: data.ratingAvg,
        ratingCount: data.ratingCount,
      },
      create: {
        id: data.id,
        studioId: STUDIO_ID,
        branchId: data.branchId,
        name: data.name,
        category: data.category,
        danceCategories: data.danceCategories,
        scheduleJson: data.scheduleJson,
        capacity: data.capacity,
        enrollmentMode: data.enrollmentMode,
        creatorId: data.creatorId,
        active: data.active,
        certificationEnabled: data.certificationEnabled,
        certificateTemplateId: data.certificationEnabled
          ? sampleCertificate.id
          : null,
        coverImageUrl: data.coverImageUrl,
        ratingAvg: data.ratingAvg,
        ratingCount: data.ratingCount,
      },
    });

    for (const trainerId of trainerIds) {
      await prisma.batchTrainer.upsert({
        where: {
          batchId_trainerId: { batchId: batch.id, trainerId },
        },
        update: {},
        create: { batchId: batch.id, trainerId },
      });
    }
  }

  const kidsEnrollees = [
    "student-1",
    "student-2",
    "student-3",
    "student-7",
    "student-8",
    "student-13",
    "student-17",
  ];
  const adultsEnrollees = [
    "student-4",
    "student-5",
    "student-6",
    "student-9",
    "student-10",
    "student-12",
    "student-16",
  ];
  const contemporaryEnrollees = [
    "student-2",
    "student-11",
    "student-14",
    "student-16",
    "student-18",
    "student-20",
  ];
  const beginnerEnrollees = ["student-5", "student-15", "student-19"];

  async function enroll(batchId: string, studentIds: string[]) {
    for (const studentId of studentIds) {
      await prisma.batchEnrollment.upsert({
        where: {
          batchId_studentId: { batchId, studentId },
        },
        update: {},
        create: { batchId, studentId },
      });
    }
  }

  await enroll("batch-kids-1", kidsEnrollees);
  await enroll("batch-adults-1", adultsEnrollees);
  await enroll("batch-contemporary-1", contemporaryEnrollees);
  await enroll("batch-beginner-1", beginnerEnrollees);

  await prisma.batchEnrollment.upsert({
    where: {
      batchId_studentId: {
        batchId: "batch-trial-1",
        studentId: "student-15",
      },
    },
    update: {
      isTrial: true,
      trialSessionIds: ["session-trial-w0", "session-trial-w1"],
    },
    create: {
      batchId: "batch-trial-1",
      studentId: "student-15",
      isTrial: true,
      trialSessionIds: ["session-trial-w0", "session-trial-w1"],
    },
  });

  const adultPlanIds = [
    "sub-individual-adult-monthly",
    "sub-individual-adult-quarterly",
  ] as const;
  const kidPlanIds = [
    "sub-individual-kid-monthly",
    "sub-individual-kid-quarterly",
  ] as const;
  const batchPlans: Array<{ batchId: string; subscriptionId: string }> = [
    ...["batch-kids-1"].flatMap((batchId) =>
      kidPlanIds.map((subscriptionId) => ({ batchId, subscriptionId })),
    ),
    ...[
      "batch-adults-1",
      "batch-contemporary-1",
      "batch-beginner-1",
      "batch-trial-1",
    ].flatMap((batchId) =>
      adultPlanIds.map((subscriptionId) => ({ batchId, subscriptionId })),
    ),
  ];

  for (const plan of batchPlans) {
    await prisma.batchPlan.upsert({
      where: {
        batchId_subscriptionId: {
          batchId: plan.batchId,
          subscriptionId: plan.subscriptionId,
        },
      },
      update: {},
      create: {
        batchId: plan.batchId,
        subscriptionId: plan.subscriptionId,
      },
    });
  }

  // Drop stale enrollments from older seeds so attendance rosters match intent.
  await prisma.batchEnrollment.deleteMany({
    where: {
      OR: [
        {
          batchId: "batch-kids-1",
          studentId: { notIn: [...kidsEnrollees] },
        },
        {
          batchId: "batch-adults-1",
          studentId: { notIn: [...adultsEnrollees] },
        },
        {
          batchId: "batch-contemporary-1",
          studentId: { notIn: [...contemporaryEnrollees] },
        },
        {
          batchId: "batch-beginner-1",
          studentId: { notIn: [...beginnerEnrollees] },
        },
        {
          batchId: "batch-trial-1",
          studentId: { notIn: ["student-15"] },
        },
      ],
    },
  });

  const now = new Date();
  // Sessions are anchored to mondayOfWeek(); when "today" is Sunday UTC the
  // week starts in the prior month, so memberships must cover that Monday.
  const weekStartForMembership = mondayOfWeek(now);
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const periodStart =
    weekStartForMembership < monthStart ? weekStartForMembership : monthStart;
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );

  async function ensureIndividualMembership(args: {
    id: string;
    studentId: string;
    subscriptionId: string;
    seatRole: MembershipSeatRole;
    purchaserUserId: string;
  }) {
    await prisma.membership.upsert({
      where: { id: args.id },
      update: {
        subscriptionId: args.subscriptionId,
        purchaserUserId: args.purchaserUserId,
        periodStart,
        periodEnd,
        status: MembershipStatus.ACTIVE,
      },
      create: {
        id: args.id,
        subscriptionId: args.subscriptionId,
        purchaserUserId: args.purchaserUserId,
        periodStart,
        periodEnd,
        status: MembershipStatus.ACTIVE,
      },
    });
    await prisma.membershipCoveredStudent.upsert({
      where: {
        membershipId_studentId: {
          membershipId: args.id,
          studentId: args.studentId,
        },
      },
      update: { seatRole: args.seatRole },
      create: {
        membershipId: args.id,
        studentId: args.studentId,
        seatRole: args.seatRole,
      },
    });
  }

  // Every enrolled student used by attendance journeys needs an active
  // membership covering their batch category (markAttendance enforces this).
  for (const studentId of kidsEnrollees) {
    await ensureIndividualMembership({
      id: `membership-kid-${studentId}`,
      studentId,
      subscriptionId: "sub-individual-kid-monthly",
      seatRole: MembershipSeatRole.KID,
      purchaserUserId: "parent-1",
    });
  }

  for (const studentId of adultsEnrollees) {
    await ensureIndividualMembership({
      id: `membership-adult-${studentId}`,
      studentId,
      subscriptionId: "sub-individual-adult-monthly",
      seatRole: MembershipSeatRole.ADULT,
      purchaserUserId: studentId,
    });
  }

  for (const studentId of contemporaryEnrollees) {
    await ensureIndividualMembership({
      id: `membership-contemp-${studentId}`,
      studentId,
      subscriptionId: "sub-individual-adult-monthly",
      seatRole: MembershipSeatRole.ADULT,
      purchaserUserId: studentId,
    });
  }

  for (const studentId of beginnerEnrollees) {
    await ensureIndividualMembership({
      id: `membership-beginner-${studentId}`,
      studentId,
      subscriptionId: "sub-individual-adult-monthly",
      seatRole: MembershipSeatRole.ADULT,
      purchaserUserId: studentId,
    });
  }

  await prisma.membership.upsert({
    where: { id: "membership-individual-kid-1" },
    update: {
      subscriptionId: "sub-individual-kid-monthly",
      purchaserUserId: "parent-1",
      periodStart,
      periodEnd,
      status: MembershipStatus.ACTIVE,
    },
    create: {
      id: "membership-individual-kid-1",
      subscriptionId: "sub-individual-kid-monthly",
      purchaserUserId: "parent-1",
      periodStart,
      periodEnd,
      status: MembershipStatus.ACTIVE,
    },
  });

  await prisma.membershipCoveredStudent.upsert({
    where: {
      membershipId_studentId: {
        membershipId: "membership-individual-kid-1",
        studentId: "student-1",
      },
    },
    update: { seatRole: MembershipSeatRole.KID },
    create: {
      membershipId: "membership-individual-kid-1",
      studentId: "student-1",
      seatRole: MembershipSeatRole.KID,
    },
  });

  await prisma.membership.upsert({
    where: { id: "membership-family-1" },
    update: {
      subscriptionId: "sub-family-one-adult-one-kid-monthly",
      purchaserUserId: "parent-1",
      periodStart,
      periodEnd,
      status: MembershipStatus.ACTIVE,
    },
    create: {
      id: "membership-family-1",
      subscriptionId: "sub-family-one-adult-one-kid-monthly",
      purchaserUserId: "parent-1",
      periodStart,
      periodEnd,
      status: MembershipStatus.ACTIVE,
    },
  });

  await prisma.membershipCoveredStudent.upsert({
    where: {
      membershipId_studentId: {
        membershipId: "membership-family-1",
        studentId: "parent-1",
      },
    },
    update: { seatRole: MembershipSeatRole.ADULT },
    create: {
      membershipId: "membership-family-1",
      studentId: "parent-1",
      seatRole: MembershipSeatRole.ADULT,
    },
  });

  await prisma.membershipCoveredStudent.upsert({
    where: {
      membershipId_studentId: {
        membershipId: "membership-family-1",
        studentId: "student-1",
      },
    },
    update: { seatRole: MembershipSeatRole.KID },
    create: {
      membershipId: "membership-family-1",
      studentId: "student-1",
      seatRole: MembershipSeatRole.KID,
    },
  });

  // Reset to PENDING on every seed so mark-paid e2e/HTTP journeys stay repeatable.
  for (const invoice of [
    {
      id: "invoice-e2e-unpaid-1",
      amount: 1500,
    },
    {
      id: "invoice-e2e-unpaid-2",
      amount: 2200,
    },
  ] as const) {
    await prisma.invoice.upsert({
      where: { id: invoice.id },
      update: {
        studentId: "student-1",
        membershipId: "membership-individual-kid-1",
        amount: invoice.amount,
        status: InvoiceStatus.PENDING,
        paymentMethod: null,
        paidAt: null,
        platformFeePercent: 5,
        studioId: STUDIO_ID,
      },
      create: {
        id: invoice.id,
        studentId: "student-1",
        membershipId: "membership-individual-kid-1",
        amount: invoice.amount,
        status: InvoiceStatus.PENDING,
        platformFeePercent: 5,
        studioId: STUDIO_ID,
      },
    });
  }

  const weekStart = mondayOfWeek();

  type SessionSeed = {
    id: string;
    batchId: string;
    startsAt: Date;
    endsAt: Date;
    status: SessionStatus;
    type?: SessionType;
  };

  const sessions: SessionSeed[] = [
    // Kids — last week completed (attendance ready)
    {
      id: "session-kids-past-1",
      batchId: "batch-kids-1",
      startsAt: utcAt(weekStart, -7, 17),
      endsAt: utcAt(weekStart, -7, 18),
      status: SessionStatus.COMPLETED,
    },
    {
      id: "session-kids-past-2",
      batchId: "batch-kids-1",
      startsAt: utcAt(weekStart, -5, 17),
      endsAt: utcAt(weekStart, -5, 18),
      status: SessionStatus.COMPLETED,
    },
    // Kids — this week
    {
      id: "session-kids-mon",
      batchId: "batch-kids-1",
      startsAt: utcAt(weekStart, 0, 17),
      endsAt: utcAt(weekStart, 0, 18),
      status: SessionStatus.SCHEDULED,
    },
    {
      id: "session-kids-wed",
      batchId: "batch-kids-1",
      startsAt: utcAt(weekStart, 2, 17),
      endsAt: utcAt(weekStart, 2, 18),
      status: SessionStatus.SCHEDULED,
    },
    // Adults — past + this week
    {
      id: "session-adults-past-1",
      batchId: "batch-adults-1",
      startsAt: utcAt(weekStart, -6, 19),
      endsAt: utcAt(weekStart, -6, 20),
      status: SessionStatus.COMPLETED,
    },
    {
      id: "session-adults-tue",
      batchId: "batch-adults-1",
      startsAt: utcAt(weekStart, 1, 19),
      endsAt: utcAt(weekStart, 1, 20),
      status: SessionStatus.SCHEDULED,
    },
    {
      id: "session-adults-thu",
      batchId: "batch-adults-1",
      startsAt: utcAt(weekStart, 3, 19),
      endsAt: utcAt(weekStart, 3, 20),
      status: SessionStatus.SCHEDULED,
    },
    {
      id: "session-adults-cancelled",
      batchId: "batch-adults-1",
      startsAt: utcAt(weekStart, 5, 19),
      endsAt: utcAt(weekStart, 5, 20),
      status: SessionStatus.CANCELLED,
    },
    // Contemporary — this week (may be past) + rolling future Wed/Fri
    {
      id: "session-contemp-wed",
      batchId: "batch-contemporary-1",
      startsAt: utcAt(weekStart, 2, 18, 30),
      endsAt: utcAt(weekStart, 2, 19, 30),
      status: SessionStatus.SCHEDULED,
    },
    {
      id: "session-contemp-fri",
      batchId: "batch-contemporary-1",
      startsAt: utcAt(weekStart, 4, 18, 30),
      endsAt: utcAt(weekStart, 4, 19, 30),
      status: SessionStatus.SCHEDULED,
    },
    ...nextWeekdayOccurrences(3, 4, 18, 30).map((startsAt, index) => {
      const endsAt = new Date(startsAt);
      endsAt.setUTCHours(19, 30, 0, 0);
      return {
        id: `session-contemp-future-wed-${index}`,
        batchId: "batch-contemporary-1",
        startsAt,
        endsAt,
        status: SessionStatus.SCHEDULED,
        type: SessionType.REGULAR,
      };
    }),
    ...nextWeekdayOccurrences(5, 4, 18, 30).map((startsAt, index) => {
      const endsAt = new Date(startsAt);
      endsAt.setUTCHours(19, 30, 0, 0);
      return {
        id: `session-contemp-future-fri-${index}`,
        batchId: "batch-contemporary-1",
        startsAt,
        endsAt,
        status: SessionStatus.SCHEDULED,
        type: SessionType.REGULAR,
      };
    }),
    // Beginner Saturday — this week + rolling future
    {
      id: "session-beginner-sat",
      batchId: "batch-beginner-1",
      startsAt: utcAt(weekStart, 5, 10),
      endsAt: utcAt(weekStart, 5, 11),
      status: SessionStatus.SCHEDULED,
    },
    ...nextWeekdayOccurrences(6, 5, 10).map((startsAt, index) => {
      const endsAt = new Date(startsAt);
      endsAt.setUTCHours(11, 0, 0, 0);
      return {
        id: `session-beginner-future-w${index}`,
        batchId: "batch-beginner-1",
        startsAt,
        endsAt,
        status: SessionStatus.SCHEDULED,
        type: SessionType.REGULAR,
      };
    }),
    // Open beginner — next 5 Saturdays @ 11:00 UTC
    ...nextWeekdayOccurrences(6, 5, 11).map((startsAt, index) => {
      const endsAt = new Date(startsAt);
      endsAt.setUTCHours(12, 0, 0, 0);
      return {
        id: `session-trial-w${index}`,
        batchId: "batch-trial-1",
        startsAt,
        endsAt,
        status: SessionStatus.SCHEDULED,
        type: SessionType.REGULAR,
      };
    }),
    // Kids / adults — rolling future so staff trial enroll stays available
    ...nextWeekdayOccurrences(1, 4, 17).map((startsAt, index) => {
      const endsAt = new Date(startsAt);
      endsAt.setUTCHours(18, 0, 0, 0);
      return {
        id: `session-kids-future-mon-${index}`,
        batchId: "batch-kids-1",
        startsAt,
        endsAt,
        status: SessionStatus.SCHEDULED,
        type: SessionType.REGULAR,
      };
    }),
    ...nextWeekdayOccurrences(3, 4, 17).map((startsAt, index) => {
      const endsAt = new Date(startsAt);
      endsAt.setUTCHours(18, 0, 0, 0);
      return {
        id: `session-kids-future-wed-${index}`,
        batchId: "batch-kids-1",
        startsAt,
        endsAt,
        status: SessionStatus.SCHEDULED,
        type: SessionType.REGULAR,
      };
    }),
    ...nextWeekdayOccurrences(2, 4, 19).map((startsAt, index) => {
      const endsAt = new Date(startsAt);
      endsAt.setUTCHours(20, 0, 0, 0);
      return {
        id: `session-adults-future-tue-${index}`,
        batchId: "batch-adults-1",
        startsAt,
        endsAt,
        status: SessionStatus.SCHEDULED,
        type: SessionType.REGULAR,
      };
    }),
    ...nextWeekdayOccurrences(4, 4, 19).map((startsAt, index) => {
      const endsAt = new Date(startsAt);
      endsAt.setUTCHours(20, 0, 0, 0);
      return {
        id: `session-adults-future-thu-${index}`,
        batchId: "batch-adults-1",
        startsAt,
        endsAt,
        status: SessionStatus.SCHEDULED,
        type: SessionType.REGULAR,
      };
    }),
  ];

  for (const session of sessions) {
    await prisma.session.upsert({
      where: { id: session.id },
      update: {
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        status: session.status,
        batchId: session.batchId,
        type: session.type ?? SessionType.REGULAR,
      },
      create: {
        id: session.id,
        batchId: session.batchId,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        status: session.status,
        type: session.type ?? SessionType.REGULAR,
      },
    });
  }

  const pastAttendance: Array<{
    sessionId: string;
    studentId: string;
    status: AttendanceStatus;
  }> = [
    ...kidsEnrollees.slice(0, 5).map((studentId, i) => ({
      sessionId: "session-kids-past-1",
      studentId,
      status: i % 4 === 0 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
    })),
    ...kidsEnrollees.slice(0, 6).map((studentId, i) => ({
      sessionId: "session-kids-past-2",
      studentId,
      status: i === 2 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
    })),
    ...adultsEnrollees.slice(0, 5).map((studentId, i) => ({
      sessionId: "session-adults-past-1",
      studentId,
      status: i === 1 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
    })),
  ];

  for (const row of pastAttendance) {
    await prisma.attendance.upsert({
      where: {
        sessionId_studentId: {
          sessionId: row.sessionId,
          studentId: row.studentId,
        },
      },
      update: {
        status: row.status,
        markedById: "trainer-1",
        source: AttendanceSource.TRAINER,
      },
      create: {
        sessionId: row.sessionId,
        studentId: row.studentId,
        status: row.status,
        markedById: "trainer-1",
        source: AttendanceSource.TRAINER,
      },
    });
  }

  // Pending booking requests (trials, open seats, private)
  const bookingRequests: Array<{
    id: string;
    studentId: string;
    type: BookingType;
    batchId?: string;
    trainerId?: string;
    notes: string;
    startsAt?: Date;
    endsAt?: Date;
  }> = [
    {
      id: "booking-req-trial-1",
      studentId: "student-15",
      type: BookingType.TRIAL,
      batchId: "batch-kids-1",
      notes: "Trial for kids hip-hop — parent inquiry",
      startsAt: utcAt(weekStart, 2, 17),
      endsAt: utcAt(weekStart, 2, 18),
    },
    {
      id: "booking-req-trial-2",
      studentId: "student-19",
      type: BookingType.TRIAL,
      batchId: "batch-beginner-1",
      notes: "First class trial — Saturday beginner",
      startsAt: utcAt(weekStart, 5, 10),
      endsAt: utcAt(weekStart, 5, 11),
    },
    {
      id: "booking-req-open-1",
      studentId: "student-11",
      type: BookingType.OPEN_SEAT,
      batchId: "batch-adults-1",
      notes: "Open seat request for Thursday adults",
      startsAt: utcAt(weekStart, 3, 19),
      endsAt: utcAt(weekStart, 3, 20),
    },
    {
      id: "booking-req-open-2",
      studentId: "student-18",
      type: BookingType.OPEN_SEAT,
      batchId: "batch-contemporary-1",
      notes: "Drop into contemporary Friday",
      startsAt: utcAt(weekStart, 4, 18, 30),
      endsAt: utcAt(weekStart, 4, 19, 30),
    },
    {
      id: "booking-req-private-1",
      studentId: "student-20",
      type: BookingType.PRIVATE,
      trainerId: "trainer-5",
      notes: "Private jazz technique — pending confirmation",
      startsAt: utcAt(weekStart, 4, 15),
      endsAt: utcAt(weekStart, 4, 16),
    },
    {
      id: "booking-req-private-2",
      studentId: "student-14",
      type: BookingType.PRIVATE,
      trainerId: "trainer-2",
      notes: "Contemporary private — waiting on schedule",
      startsAt: utcAt(weekStart, 1, 16),
      endsAt: utcAt(weekStart, 1, 17),
    },
  ];

  for (const req of bookingRequests) {
    await prisma.booking.upsert({
      where: { id: req.id },
      update: {
        type: req.type,
        batchId: req.batchId ?? null,
        trainerId: req.trainerId ?? null,
        notes: req.notes,
        startsAt: req.startsAt ?? null,
        endsAt: req.endsAt ?? null,
        status: BookingStatus.PENDING,
      },
      create: {
        id: req.id,
        studioId: STUDIO_ID,
        studentId: req.studentId,
        type: req.type,
        batchId: req.batchId,
        trainerId: req.trainerId,
        notes: req.notes,
        startsAt: req.startsAt,
        endsAt: req.endsAt,
        status: BookingStatus.PENDING,
      },
    });
  }

  // 15 confirmed private bookings this week with Lead Trainer (trainer-1)
  const privateStudents = [
    "student-4",
    "student-5",
    "student-6",
    "student-9",
    "student-10",
    "student-11",
    "student-12",
    "student-14",
    "student-16",
    "student-18",
    "student-20",
    "student-2",
    "student-3",
    "student-7",
    "student-17",
  ];

  // Spread across Mon–Fri: 3 per day
  const privateSlots: Array<{ dayOffset: number; hour: number }> = [
    { dayOffset: 0, hour: 9 },
    { dayOffset: 0, hour: 11 },
    { dayOffset: 0, hour: 14 },
    { dayOffset: 1, hour: 9 },
    { dayOffset: 1, hour: 11 },
    { dayOffset: 1, hour: 15 },
    { dayOffset: 2, hour: 9 },
    { dayOffset: 2, hour: 11 },
    { dayOffset: 2, hour: 14 },
    { dayOffset: 3, hour: 9 },
    { dayOffset: 3, hour: 12 },
    { dayOffset: 3, hour: 15 },
    { dayOffset: 4, hour: 9 },
    { dayOffset: 4, hour: 11 },
    { dayOffset: 4, hour: 14 },
  ];

  for (let i = 0; i < 15; i++) {
    const slot = privateSlots[i]!;
    const studentId = privateStudents[i]!;
    const startsAt = utcAt(weekStart, slot.dayOffset, slot.hour);
    const endsAt = utcAt(weekStart, slot.dayOffset, slot.hour + 1);
    const id = `booking-trainer1-week-${i + 1}`;

    await prisma.booking.upsert({
      where: { id },
      update: {
        studentId,
        type: BookingType.PRIVATE,
        trainerId: "trainer-1",
        status: BookingStatus.CONFIRMED,
        notes: `Private lesson with Lead Trainer #${i + 1}`,
        startsAt,
        endsAt,
      },
      create: {
        id,
        studioId: STUDIO_ID,
        studentId,
        type: BookingType.PRIVATE,
        trainerId: "trainer-1",
        status: BookingStatus.CONFIRMED,
        notes: `Private lesson with Lead Trainer #${i + 1}`,
        startsAt,
        endsAt,
      },
    });
  }

  // A couple completed / cancelled bookings for status variety
  await prisma.booking.upsert({
    where: { id: "booking-completed-1" },
    update: {
      status: BookingStatus.COMPLETED,
      startsAt: utcAt(weekStart, -2, 10),
      endsAt: utcAt(weekStart, -2, 11),
    },
    create: {
      id: "booking-completed-1",
      studioId: STUDIO_ID,
      studentId: "student-20",
      type: BookingType.PRIVATE,
      trainerId: "trainer-5",
      status: BookingStatus.COMPLETED,
      notes: "Completed private last week",
      startsAt: utcAt(weekStart, -2, 10),
      endsAt: utcAt(weekStart, -2, 11),
    },
  });

  await prisma.booking.upsert({
    where: { id: "booking-cancelled-1" },
    update: {
      status: BookingStatus.CANCELLED,
    },
    create: {
      id: "booking-cancelled-1",
      studioId: STUDIO_ID,
      studentId: "student-9",
      type: BookingType.OPEN_SEAT,
      batchId: "batch-adults-1",
      status: BookingStatus.CANCELLED,
      notes: "Cancelled open-seat request",
      startsAt: utcAt(weekStart, -1, 19),
      endsAt: utcAt(weekStart, -1, 20),
    },
  });

  const contestStarts = new Date();
  contestStarts.setUTCDate(contestStarts.getUTCDate() + 14);
  contestStarts.setUTCHours(10, 0, 0, 0);
  const contestEnds = new Date(contestStarts);
  contestEnds.setUTCHours(18, 0, 0, 0);
  const registrationOpens = new Date();
  registrationOpens.setUTCHours(0, 0, 0, 0);
  const registrationCloses = new Date(contestStarts);
  registrationCloses.setUTCDate(registrationCloses.getUTCDate() - 1);

  await prisma.contest.upsert({
    where: { id: "contest-seed-1" },
    update: {},
    create: {
      id: "contest-seed-1",
      studioId: STUDIO_ID,
      branchId: mainBranch.id,
      title: "Summer Dance Showcase",
      description:
        "Annual studio contest across styles and age groups. Certificates for placed entries.",
      startsAt: contestStarts,
      endsAt: contestEnds,
      registrationOpensAt: registrationOpens,
      registrationClosesAt: registrationCloses,
      status: "OPEN",
      creatorId: owner.id,
      certificationEnabled: true,
      certificateTemplateId: sampleCertificate.id,
      categories: {
        create: [
          {
            id: "contest-cat-hiphop-1",
            name: "Hip Hop Juniors Solo",
            danceStyle: "Hip Hop",
            ageMin: 8,
            ageMax: 12,
            entryType: "INDIVIDUAL",
            maxEntries: 40,
            judges: {
              create: [{ judgeId: "trainer-1" }, { judgeId: "trainer-2" }],
            },
            entries: {
              create: {
                id: "contest-entry-1",
                status: "CONFIRMED",
                registeredById: "student-1",
                members: {
                  create: { studentId: "student-1" },
                },
              },
            },
          },
          {
            id: "contest-cat-contemporary-1",
            name: "Contemporary Teens Group",
            danceStyle: "Contemporary",
            ageMin: 13,
            ageMax: 17,
            entryType: "GROUP",
            maxEntries: 20,
            maxGroupSize: 8,
            judges: {
              create: [{ judgeId: "trainer-3" }, { judgeId: "trainer-4" }],
            },
          },
        ],
      },
    },
  });

  const achievements = [
    {
      id: "ach-first-class",
      code: "FIRST_CLASS",
      title: "First Class",
      description: "Attend your first dance session",
      icon: "zap",
      criteria: { type: "SESSIONS_COMPLETED", min: 1 },
    },
    {
      id: "ach-sessions-10",
      code: "SESSIONS_10",
      title: "10 Sessions",
      description: "Complete 10 dance sessions",
      icon: "sparkles",
      criteria: { type: "SESSIONS_COMPLETED", min: 10 },
    },
    {
      id: "ach-streak-7",
      code: "STREAK_7",
      title: "7-Day Streak",
      description: "Attend classes 7 days in a row",
      icon: "zap",
      criteria: { type: "STREAK", min: 7 },
    },
    {
      id: "ach-contest-entrant",
      code: "CONTEST_ENTRANT",
      title: "Contest Entrant",
      description: "Register for a studio contest",
      icon: "star",
      criteria: { type: "CONTEST_ENTRY", min: 1 },
    },
  ] as const;

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      update: {
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        criteria: achievement.criteria,
        active: true,
      },
      create: {
        id: achievement.id,
        code: achievement.code,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        criteria: achievement.criteria,
        active: true,
      },
    });
  }

  console.log("Seed complete.");
  console.log(
    "  5 trainers (trainer-1 … trainer-5), 20 students (student-1 … student-20)",
  );
  console.log(
    "  Batches: kids/adults/contemporary/beginner (active) + archived intensive",
  );
  console.log(
    "  Active memberships for kids/adults/contemporary/beginner enrollees",
  );
  console.log(
    "  Sessions + past attendance for kids/adults; pending booking requests",
  );
  console.log(
    "  15 confirmed private bookings this week for trainer-1 (Lead Trainer)",
  );
  console.log(
    "  Achievements: FIRST_CLASS, SESSIONS_10, STREAK_7, CONTEST_ENTRANT",
  );
  console.log(
    "  Auth bypass: Bearer dev:<ROLE>:<userId> with AUTH_BYPASS=true",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
