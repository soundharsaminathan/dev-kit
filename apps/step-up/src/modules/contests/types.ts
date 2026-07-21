export type ContestStatus =
  | "DRAFT"
  | "OPEN"
  | "CLOSED"
  | "COMPLETED"
  | "CANCELLED";

export type ContestEntryType = "INDIVIDUAL" | "GROUP";

export type ContestEntryStatus = "PENDING" | "CONFIRMED" | "WITHDRAWN";

export type ContestJudge = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type ContestCategory = {
  id: string;
  contestId: string;
  name: string;
  danceStyle: string;
  ageMin: number;
  ageMax: number;
  entryType: ContestEntryType;
  maxEntries: number | null;
  maxGroupSize: number | null;
  certificateTemplateId: string | null;
  judges: ContestJudge[];
  _count?: { entries: number };
};

export type Contest = {
  id: string;
  studioId: string;
  branchId: string | null;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  status: ContestStatus;
  certificationEnabled: boolean;
  certificateTemplateId: string | null;
  categories: ContestCategory[];
  branch?: { id: string; name: string } | null;
  certificateTemplate?: { id: string; name: string } | null;
};

export type ContestEntry = {
  id: string;
  categoryId: string;
  teamName: string | null;
  status: ContestEntryStatus;
  placement: number | null;
  registeredById: string;
  category?: ContestCategory;
  certificate?: {
    id: string;
    issuedAt: string;
    certificateNumber?: string;
  } | null;
  members: Array<{
    studentId: string;
    name: string;
    email: string;
  }>;
};

export type ContestScore = {
  id: string;
  entryId: string;
  judgeId: string;
  score: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  judge?: ContestJudge;
};

export type CategoryDraft = {
  key: string;
  name: string;
  danceStyle: string;
  ageMin: string;
  ageMax: string;
  entryType: ContestEntryType;
  maxEntries: string;
  maxGroupSize: string;
  judgeIds: string[];
};
