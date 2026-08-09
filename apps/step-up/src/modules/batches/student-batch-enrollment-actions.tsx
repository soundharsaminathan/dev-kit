import { Checkbox } from "@dev-ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import { formatPrice } from "@/modules/payments/invoice-types";
import { AppSheet } from "@/modules/ui/app-sheet";
import { FormInput } from "@/modules/ui/form-input";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

type SwitchTarget = {
  id: string;
  name: string;
  category: string;
  remainingSeats: number;
  branchName: string;
  price: number | null;
};

type SwitchTargetsResponse = {
  studentId: string;
  subscription: { id: string; name: string } | null;
  includeAllPrices?: boolean;
  reason?: string;
  targets: SwitchTarget[];
};

type UnenrollPreview = {
  studentId: string;
  studentName: string;
  batchId: string;
  batchName: string;
  enrolledAt: string;
  futureBookings: number;
  pendingInvoice: { id: string; amount: number; status: string } | null;
  refundableInvoice: {
    id: string;
    amount: number;
    refundedAmount: number;
    refundableAmount: number;
    paymentMethod: string | null;
    paidAt: string | null;
  } | null;
};

type StudentBatchEnrollmentActionsProps = {
  studentId: string;
  studentName: string;
  batchId: string;
  batchName: string;
  onOpenBatch?: () => void;
};

export function StudentBatchEnrollmentActions({
  studentId,
  studentName,
  batchId,
  batchName,
  onOpenBatch,
}: StudentBatchEnrollmentActionsProps) {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("StudentBatchEnrollmentActions");
  const [switchOpen, setSwitchOpen] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [includeAllPrices, setIncludeAllPrices] = useState(false);
  const [unenrollOpen, setUnenrollOpen] = useState(false);
  const [issueRefund, setIssueRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundAmountInvoiceId, setRefundAmountInvoiceId] = useState<
    string | null
  >(null);

  const switchTargetsQuery = useQuery({
    queryKey: [
      "batch-switch-targets",
      batchId,
      studentId,
      includeAllPrices,
    ],
    queryFn: () => {
      const params = new URLSearchParams({ studentId });
      if (includeAllPrices) {
        params.set("includeAllPrices", "true");
      }
      return api.get<SwitchTargetsResponse>(
        `/batches/${batchId}/switch-targets?${params.toString()}`,
      );
    },
    enabled: switchOpen,
  });

  const unenrollPreviewQuery = useQuery({
    queryKey: ["batch-unenroll-preview", batchId, studentId],
    queryFn: () =>
      api.get<UnenrollPreview>(
        `/batches/${batchId}/unenroll-preview?studentId=${encodeURIComponent(studentId)}`,
      ),
    enabled: unenrollOpen,
  });

  const switchBatch = useMutation({
    mutationFn: (toBatchId: string) =>
      api.post(`/batches/${batchId}/switch`, {
        studentId,
        toBatchId,
        ...(includeAllPrices ? { includeAllPrices: true } : {}),
      }),
    onSuccess: (_data, toBatchId) => {
      const targetName =
        switchTargetsQuery.data?.targets.find((t) => t.id === toBatchId)
          ?.name ?? "the new batch";
      toast({
        title: "Batch switched",
        description: `Moved to ${targetName}.`,
        variant: "success",
      });
      closeSwitch();
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t switch batch",
        description:
          error instanceof Error ? error.message : "Could not switch batch.",
        variant: "error",
      });
    },
    onSettled: async (_data, _error, toBatchId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["batch", batchId] }),
        queryClient.invalidateQueries({ queryKey: ["batch", toBatchId] }),
        queryClient.invalidateQueries({
          queryKey: ["student-profile", studioId, studentId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["batches", studioId],
        }),
      ]);
    },
  });

  const unenroll = useMutation({
    mutationFn: (input: { refund: boolean; refundAmount?: number }) =>
      api.post(`/batches/${batchId}/unenroll`, {
        studentId,
        refund: input.refund,
        ...(input.refundAmount !== undefined
          ? { refundAmount: input.refundAmount }
          : {}),
      }),
    onSuccess: (_data, { refund }) => {
      toast({
        title: "Student unenrolled",
        description: refund
          ? "Removed from this batch and future sessions. Refund recorded."
          : "Removed from this batch and future sessions. Past attendance is kept.",
        variant: "success",
      });
      closeUnenroll();
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t unenroll student",
        description:
          error instanceof Error
            ? error.message
            : "Could not unenroll student.",
        variant: "error",
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["batch", batchId] }),
        queryClient.invalidateQueries({
          queryKey: ["student-profile", studioId, studentId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["batches", studioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["invoices", studioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["billing", "trainer-analytics"],
        }),
      ]);
    },
  });

  function openSwitch() {
    setSelectedTargetId(null);
    setIncludeAllPrices(false);
    setSwitchOpen(true);
  }

  function closeSwitch() {
    setSwitchOpen(false);
    setSelectedTargetId(null);
    setIncludeAllPrices(false);
  }

  function switchTargetLabel(target: SwitchTarget) {
    const category = target.category === "KIDS" ? "Kids" : "Adults";
    const price =
      includeAllPrices && target.price != null
        ? ` · ${formatPrice(target.price)}`
        : "";
    return `${target.name} · ${target.branchName} · ${category}${price} · ${target.remainingSeats} left`;
  }

  function openUnenroll() {
    setIssueRefund(false);
    setRefundAmount("");
    setRefundAmountInvoiceId(null);
    setUnenrollOpen(true);
  }

  function closeUnenroll() {
    setUnenrollOpen(false);
    setIssueRefund(false);
    setRefundAmount("");
    setRefundAmountInvoiceId(null);
  }

  return (
    <>
      <div className={staff.rowActions}>
        {onOpenBatch ? (
          <TouchButton
            size="sm"
            variant="default"
            data-testid={`open-batch-${batchId}`}
            onClick={onOpenBatch}
          >
            Open
          </TouchButton>
        ) : null}
        <TouchButton
          size="sm"
          variant="default"
          data-testid={`switch-batch-${batchId}`}
          onClick={openSwitch}
        >
          Switch
        </TouchButton>
        <TouchButton
          size="sm"
          variant="danger"
          data-testid={`unenroll-batch-${batchId}`}
          onClick={openUnenroll}
        >
          Unenroll
        </TouchButton>
      </div>

      <AppSheet
        isOpen={switchOpen}
        onOpenChange={(open) => {
          if (!open) closeSwitch();
        }}
        title={`Switch batch · ${batchName}`}
      >
        <div className={staff.sheetStack}>
          <p className={staff.rowMeta}>Moving {studentName} to another batch.</p>
          {switchTargetsQuery.data?.subscription ? (
            <p className={staff.rowMeta}>
              Plan: {switchTargetsQuery.data.subscription.name}
            </p>
          ) : null}
          {switchTargetsQuery.isLoading ? (
            <p className={staff.rowMeta}>Loading batches…</p>
          ) : null}
          {switchTargetsQuery.isError ? (
            <ErrorState
              description={
                switchTargetsQuery.error instanceof Error
                  ? switchTargetsQuery.error.message
                  : "Could not load target batches."
              }
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => switchTargetsQuery.refetch()}
                >
                  Try again
                </TouchButton>
              }
            />
          ) : null}
          {switchTargetsQuery.data &&
          switchTargetsQuery.data.targets.length === 0 ? (
            <EmptyState
              title="No eligible batches"
              description={
                switchTargetsQuery.data.reason ??
                (includeAllPrices
                  ? "No other open batches match this student’s category."
                  : "No other batches offer this student’s current plan with open seats.")
              }
            />
          ) : null}
          {switchTargetsQuery.data &&
          switchTargetsQuery.data.targets.length > 0 ? (
            <Select
              aria-label="Target batch"
              placeholder="Select a batch"
              selectedKey={selectedTargetId}
              onSelectionChange={(key) => {
                setSelectedTargetId(key == null ? null : String(key));
              }}
            >
              <SelectTrigger data-testid="switch-batch-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {switchTargetsQuery.data.targets.map((target) => (
                  <SelectItem
                    key={target.id}
                    id={target.id}
                    textValue={switchTargetLabel(target)}
                    data-testid={`switch-target-${target.id}`}
                  >
                    {switchTargetLabel(target)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Checkbox
            isSelected={includeAllPrices}
            onChange={(checked) => {
              setIncludeAllPrices(checked);
              setSelectedTargetId(null);
            }}
            data-testid="switch-include-all-prices"
          >
            Include all batches irrespective of price
          </Checkbox>
          {switchBatch.isError ? (
            <ErrorState
              description={
                switchBatch.error instanceof Error
                  ? switchBatch.error.message
                  : "Could not switch batch."
              }
            />
          ) : null}
          <div className={staff.sheetActions}>
            <TouchButton
              variant="primary"
              fullWidth
              isDisabled={!selectedTargetId}
              isPending={switchBatch.isPending}
              data-testid="confirm-switch-batch"
              onClick={() => {
                if (selectedTargetId) {
                  switchBatch.mutate(selectedTargetId);
                }
              }}
            >
              Confirm switch
            </TouchButton>
            <TouchButton
              variant="default"
              fullWidth
              isDisabled={switchBatch.isPending}
              onClick={closeSwitch}
            >
              Cancel
            </TouchButton>
          </div>
        </div>
      </AppSheet>

      <AppSheet
        isOpen={unenrollOpen}
        onOpenChange={(open) => {
          if (!open) closeUnenroll();
        }}
        title={`Unenroll · ${batchName}`}
      >
        <div className={staff.sheetStack}>
          <p className={staff.rowMeta}>
            Removes {studentName} from this batch and cancels future sessions.
            Past attendance and journey history stay for analytics.
          </p>
          {unenrollPreviewQuery.isLoading ? (
            <p className={staff.rowMeta}>Checking refund options…</p>
          ) : null}
          {unenrollPreviewQuery.isError ? (
            <ErrorState
              description={
                unenrollPreviewQuery.error instanceof Error
                  ? unenrollPreviewQuery.error.message
                  : "Could not load unenroll details."
              }
              action={
                <TouchButton
                  variant="primary"
                  onClick={() => unenrollPreviewQuery.refetch()}
                >
                  Try again
                </TouchButton>
              }
            />
          ) : null}
          {unenrollPreviewQuery.data?.pendingInvoice ? (
            <p className={staff.rowMeta}>
              Pending invoice of{" "}
              {formatPrice(unenrollPreviewQuery.data.pendingInvoice.amount)}{" "}
              will be voided.
            </p>
          ) : null}
          {unenrollPreviewQuery.data?.futureBookings ? (
            <p className={staff.rowMeta}>
              {unenrollPreviewQuery.data.futureBookings} upcoming booking
              {unenrollPreviewQuery.data.futureBookings === 1 ? "" : "s"} will
              be cancelled.
            </p>
          ) : null}
          {unenrollPreviewQuery.data?.refundableInvoice ? (
            <>
              <Checkbox
                isSelected={issueRefund}
                onChange={setIssueRefund}
                data-testid="unenroll-refund-toggle"
              >
                Refund payment (
                {formatPrice(
                  unenrollPreviewQuery.data.refundableInvoice.refundableAmount,
                )}{" "}
                remaining)
              </Checkbox>
              {issueRefund ? (
                <FormInput
                  label="Refund amount"
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  step="0.01"
                  max={
                    unenrollPreviewQuery.data.refundableInvoice.refundableAmount
                  }
                  value={
                    refundAmountInvoiceId ===
                    unenrollPreviewQuery.data.refundableInvoice.id
                      ? refundAmount
                      : ""
                  }
                  onChange={(value) => {
                    const invoice =
                      unenrollPreviewQuery.data?.refundableInvoice;
                    if (!invoice) return;
                    setRefundAmountInvoiceId(invoice.id);
                    setRefundAmount(value);
                  }}
                  placeholder={`Up to ${formatPrice(
                    unenrollPreviewQuery.data.refundableInvoice
                      .refundableAmount,
                  )}`}
                  data-testid="unenroll-refund-amount"
                />
              ) : null}
            </>
          ) : unenrollPreviewQuery.data ? (
            <p className={staff.rowMeta}>
              No paid invoice available to refund.
            </p>
          ) : null}
          {unenroll.isError ? (
            <ErrorState
              description={
                unenroll.error instanceof Error
                  ? unenroll.error.message
                  : "Could not unenroll student."
              }
            />
          ) : null}
          <div className={staff.sheetActions}>
            <TouchButton
              variant="danger"
              fullWidth
              isDisabled={unenrollPreviewQuery.isLoading}
              isPending={unenroll.isPending}
              data-testid="confirm-unenroll-batch"
              onClick={() => {
                const refundable =
                  unenrollPreviewQuery.data?.refundableInvoice ?? null;
                let parsedRefundAmount: number | undefined;
                if (issueRefund) {
                  if (!refundable) {
                    toast({
                      title: "No refundable invoice",
                      description:
                        "No paid invoice is available to refund for this enrollment.",
                      variant: "error",
                    });
                    return;
                  }
                  const raw =
                    refundAmountInvoiceId === refundable.id
                      ? refundAmount
                      : "";
                  parsedRefundAmount = Number(raw);
                  if (
                    !Number.isFinite(parsedRefundAmount) ||
                    parsedRefundAmount <= 0
                  ) {
                    toast({
                      title: "Invalid refund amount",
                      description: "Enter a refund amount greater than 0.",
                      variant: "error",
                    });
                    return;
                  }
                  if (parsedRefundAmount > refundable.refundableAmount) {
                    toast({
                      title: "Refund too high",
                      description: `Maximum refundable is ${formatPrice(refundable.refundableAmount)}.`,
                      variant: "error",
                    });
                    return;
                  }
                }
                unenroll.mutate({
                  refund: issueRefund,
                  ...(parsedRefundAmount !== undefined
                    ? { refundAmount: parsedRefundAmount }
                    : {}),
                });
              }}
            >
              {issueRefund ? "Unenroll and refund" : "Confirm unenroll"}
            </TouchButton>
            <TouchButton
              variant="default"
              fullWidth
              isDisabled={unenroll.isPending}
              onClick={closeUnenroll}
            >
              Cancel
            </TouchButton>
          </div>
        </div>
      </AppSheet>
    </>
  );
}
