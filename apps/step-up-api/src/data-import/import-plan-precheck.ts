import {
  type BatchCategory,
  BillingCadence,
  type IndividualAudience,
} from "@prisma/client";
import type {
  ImportBatchDto,
  ImportEnrollmentDto,
  ImportInvoiceDto,
} from "./dto/import-studio-data.dto";

export type ImportPlanCatalogRow = {
  id: string;
  name: string;
  billingCadence: BillingCadence;
  individualAudience: IndividualAudience | null;
};

export type ImportPlanPrecheckBatchRow = {
  id: string;
  name: string;
  category: BatchCategory;
};

export type ImportPlanPrecheckInput = {
  batches: ImportBatchDto[];
  enrollments: ImportEnrollmentDto[];
  invoices: ImportInvoiceDto[];
  catalog: ImportPlanCatalogRow[];
  existingBatches: ImportPlanPrecheckBatchRow[];
  batchPlanSubscriptionIdsByBatchId: Map<string, Set<string>>;
  audienceForBatchCategory: (category: BatchCategory) => IndividualAudience;
};

function collectReferencedPlanNames(input: {
  batches: ImportBatchDto[];
  enrollments: ImportEnrollmentDto[];
  invoices: ImportInvoiceDto[];
}): Set<string> {
  const names = new Set<string>();
  for (const batch of input.batches) {
    const monthly = batch.monthlyPlanName?.trim();
    const quarterly = batch.quarterlyPlanName?.trim();
    if (monthly) {
      names.add(monthly.toLowerCase());
    }
    if (quarterly) {
      names.add(quarterly.toLowerCase());
    }
  }
  for (const row of input.enrollments) {
    const planName = row.planName?.trim();
    if (planName) {
      names.add(planName.toLowerCase());
    }
  }
  for (const row of input.invoices) {
    const planName = row.planName?.trim();
    if (planName) {
      names.add(planName.toLowerCase());
    }
  }
  return names;
}

/** Validate import plan names against the studio catalog before the job runs. */
export function collectImportPlanPrecheckErrors(
  input: ImportPlanPrecheckInput,
): string[] {
  const referenced = collectReferencedPlanNames(input);
  if (referenced.size === 0) {
    return [];
  }

  const errors: string[] = [];
  const catalogByLowerName = new Map(
    input.catalog.map((sub) => [sub.name.trim().toLowerCase(), sub]),
  );

  for (const name of referenced) {
    if (!catalogByLowerName.has(name)) {
      errors.push(`Plan "${name}" was not found in this studio catalog.`);
    }
  }

  const importBatchPlansByName = new Map<string, Set<string>>();
  for (const batch of input.batches) {
    const monthlyName = batch.monthlyPlanName?.trim() ?? "";
    const quarterlyName = batch.quarterlyPlanName?.trim() ?? "";
    if (!monthlyName && !quarterlyName) {
      continue;
    }
    if (!monthlyName || !quarterlyName) {
      errors.push(
        `Batch "${batch.name.trim()}" needs both Monthly and Quarterly plan names.`,
      );
      continue;
    }

    const expectedAudience = input.audienceForBatchCategory(batch.category);
    const monthly = catalogByLowerName.get(monthlyName.toLowerCase());
    const quarterly = catalogByLowerName.get(quarterlyName.toLowerCase());
    if (monthly && monthly.individualAudience !== expectedAudience) {
      errors.push(
        `Monthly plan "${monthlyName}" was not found for this studio (Individual ${expectedAudience}).`,
      );
    }
    if (quarterly && quarterly.individualAudience !== expectedAudience) {
      errors.push(
        `Quarterly plan "${quarterlyName}" was not found for this studio (Individual ${expectedAudience}).`,
      );
    }
    if (monthly && monthly.billingCadence !== BillingCadence.MONTHLY) {
      errors.push(`Plan "${monthly.name}" must be a monthly Individual plan.`);
    }
    if (quarterly && quarterly.billingCadence !== BillingCadence.QUARTERLY) {
      errors.push(`Plan "${quarterly.name}" must be a quarterly Individual plan.`);
    }

    const allowed = new Set<string>();
    if (monthly) {
      allowed.add(monthly.id);
    }
    if (quarterly) {
      allowed.add(quarterly.id);
    }
    importBatchPlansByName.set(batch.name.trim().toLowerCase(), allowed);
  }

  const enrollmentsWithPlan = input.enrollments.filter((row) =>
    Boolean(row.planName?.trim()),
  );
  for (const row of enrollmentsWithPlan) {
    const batchLower = row.batchName.trim().toLowerCase();
    const planLower = row.planName!.trim().toLowerCase();
    const subscription = catalogByLowerName.get(planLower);
    if (!subscription) {
      continue;
    }

    const allowed = new Set<string>();
    const importPlans = importBatchPlansByName.get(batchLower);
    if (importPlans) {
      for (const id of importPlans) {
        allowed.add(id);
      }
    }
    const existingBatch = input.existingBatches.find(
      (candidate) => candidate.name.trim().toLowerCase() === batchLower,
    );
    if (existingBatch) {
      const linked = input.batchPlanSubscriptionIdsByBatchId.get(
        existingBatch.id,
      );
      if (linked) {
        for (const id of linked) {
          allowed.add(id);
        }
      }
    }

    if (!allowed.has(subscription.id)) {
      errors.push(
        `Plan "${row.planName!.trim()}" is not attached to batch "${row.batchName.trim()}". Add Monthly/Quarterly plan names on the Batches sheet (or batch settings) first.`,
      );
    }
  }

  return errors;
}
