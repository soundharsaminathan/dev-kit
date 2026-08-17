import { Inject, Injectable } from "@nestjs/common";
import type { EnrollmentMode, Prisma } from "@prisma/client";
import type { CoveredStudentInput } from "../../memberships/memberships.service";
import type { DecryptedUser } from "../../users/user-crypto.service";
import { BatchesService } from "../batches.service";
import { BatchRepository } from "../persistence/batch.repository";

@Injectable()
export class BatchCommandsService {
  constructor(
    @Inject(BatchesService) private readonly batches: BatchesService,
    @Inject(BatchRepository) private readonly repository: BatchRepository,
  ) {}

  async create(
    creatorId: string,
    data: {
      studioId: string;
      name: string;
      category: Prisma.BatchCreateInput["category"];
      branchId: string;
      trainerIds: string[];
      danceCategories: { name: string; description: string }[];
      scheduleJson: Prisma.InputJsonValue;
      capacity: number;
      enrollmentMode: EnrollmentMode;
      subscriptionIds: string[];
      active?: boolean;
      certificationEnabled?: boolean;
      certificateTemplateId?: string | null;
      coverImageUrl?: string | null;
      ratingAvg?: number | null;
      ratingCount?: number;
    },
  ) {
    const created = await this.batches.create(creatorId, data);
    await this.repository.refreshSummaryAfterMutation(created.id);
    return created;
  }

  async update(
    id: string,
    data: {
      name?: string;
      branchId?: string;
      trainerIds?: string[];
      danceCategories?: { name: string; description: string }[];
      scheduleJson?: Prisma.InputJsonValue;
      capacity?: number;
      enrollmentMode?: EnrollmentMode;
      active?: boolean;
      subscriptionIds?: string[];
      certificationEnabled?: boolean;
      certificateTemplateId?: string | null;
      coverImageUrl?: string | null;
      ratingAvg?: number | null;
      ratingCount?: number;
    },
  ) {
    const updated = await this.batches.update(id, data);
    await this.repository.refreshSummaryAfterMutation(id);
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.batches.remove(id);
    return deleted;
  }

  async enroll(
    batchId: string,
    studentId: string,
    actor: DecryptedUser,
    subscriptionId: string,
  ) {
    const result = await this.batches.enroll(
      batchId,
      studentId,
      actor,
      subscriptionId,
    );
    await this.repository.refreshSummaryAfterMutation(batchId);
    return result;
  }

  async enrollBulk(
    batchId: string,
    studentIds: string[],
    actor: DecryptedUser,
    subscriptionId: string,
  ) {
    const result = await this.batches.enrollBulk(
      batchId,
      studentIds,
      actor,
      subscriptionId,
    );
    await this.repository.refreshSummaryAfterMutation(batchId);
    return result;
  }

  async unenroll(
    batchId: string,
    studentId: string,
    options: {
      refund?: boolean;
      refundAmount?: number;
      endNote?: string | null;
    } = {},
  ) {
    const result = await this.batches.unenroll(batchId, studentId, options);
    await this.repository.refreshSummaryAfterMutation(batchId);
    return result;
  }

  async switchBatch(
    fromBatchId: string,
    studentId: string,
    toBatchId: string,
    options: {
      includeAllPrices?: boolean;
      includeAllAges?: boolean;
      endNote?: string | null;
    } = {},
  ) {
    const result = await this.batches.switchBatch(
      fromBatchId,
      studentId,
      toBatchId,
      options,
    );
    await Promise.all([
      this.repository.refreshSummaryAfterMutation(fromBatchId),
      this.repository.refreshSummaryAfterMutation(toBatchId),
    ]);
    return result;
  }

  async purchase(
    batchId: string,
    args: {
      subscriptionId: string;
      purchaserUserId: string;
      coveredStudents: CoveredStudentInput[];
    },
  ) {
    const result = await this.batches.purchase(batchId, args);
    await this.repository.refreshSummaryAfterMutation(batchId);
    return result;
  }

  async rate(
    batchId: string,
    studentId: string,
    rating: number,
    actor: DecryptedUser,
  ) {
    return this.batches.rate(batchId, studentId, rating, actor);
  }
}
