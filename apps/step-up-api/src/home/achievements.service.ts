import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type AchievementCriteria = {
  type: "SESSIONS_COMPLETED" | "STREAK" | "CONTEST_ENTRY";
  min: number;
};

export type AchievementProgressInput = {
  sessionsCompleted: number;
  streak: number;
  contestEntries: number;
};

function parseCriteria(raw: unknown): AchievementCriteria | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const type = record.type;
  const min = Number(record.min);
  if (
    (type !== "SESSIONS_COMPLETED" &&
      type !== "STREAK" &&
      type !== "CONTEST_ENTRY") ||
    !Number.isFinite(min)
  ) {
    return null;
  }
  return { type, min };
}

function meetsCriteria(
  criteria: AchievementCriteria,
  progress: AchievementProgressInput,
) {
  switch (criteria.type) {
    case "SESSIONS_COMPLETED":
      return progress.sessionsCompleted >= criteria.min;
    case "STREAK":
      return progress.streak >= criteria.min;
    case "CONTEST_ENTRY":
      return progress.contestEntries >= criteria.min;
    default:
      return false;
  }
}

@Injectable()
export class AchievementsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listForStudent(
    userId: string,
    studioId: string | null,
    progress: AchievementProgressInput,
  ) {
    const definitions = await this.prisma.achievement.findMany({
      where: {
        active: true,
        OR: [{ studioId: null }, ...(studioId ? [{ studioId }] : [])],
      },
      orderBy: { code: "asc" },
    });

    const earned = await this.prisma.studentAchievement.findMany({
      where: {
        userId,
        achievementId: { in: definitions.map((row) => row.id) },
      },
    });
    const earnedByAchievement = new Map(
      earned.map((row) => [row.achievementId, row]),
    );

    const newlyEarned: string[] = [];

    for (const definition of definitions) {
      if (earnedByAchievement.has(definition.id)) {
        continue;
      }
      const criteria = parseCriteria(definition.criteria);
      if (!criteria || !meetsCriteria(criteria, progress)) {
        continue;
      }
      try {
        const created = await this.prisma.studentAchievement.create({
          data: {
            userId,
            achievementId: definition.id,
            meta: {
              sessionsCompleted: progress.sessionsCompleted,
              streak: progress.streak,
              contestEntries: progress.contestEntries,
            },
          },
        });
        earnedByAchievement.set(definition.id, created);
        newlyEarned.push(definition.id);
      } catch {
        // unique race — ignore
      }
    }

    return definitions.map((definition) => {
      const earnedRow = earnedByAchievement.get(definition.id);
      return {
        id: definition.id,
        code: definition.code,
        title: definition.title,
        description: definition.description,
        icon: definition.icon,
        criteria: definition.criteria,
        earnedAt: earnedRow?.earnedAt?.toISOString() ?? null,
        newlyEarned: newlyEarned.includes(definition.id),
      };
    });
  }
}
