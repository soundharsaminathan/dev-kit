import { Checkbox } from "@dev-ui/components/checkbox";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import { AppSheet } from "@/modules/ui/app-sheet";
import { FormInput } from "@/modules/ui/form-input";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";
import {
  allocateFamilyDiscount,
  formatPrice,
  type Invoice,
  type StudioFamily,
} from "./invoice-types";
import { parseDiscountInput } from "./print-invoice";

type FamilyCombineSheetProps = {
  family: StudioFamily | null;
  invoices: Invoice[];
  onOpenChange: (open: boolean) => void;
  onCombined: (invoice: Invoice) => void;
};

function isUnpaid(status: Invoice["status"]) {
  return status === "PENDING" || status === "OVERDUE";
}

export function FamilyCombineSheet({
  family,
  invoices,
  onOpenChange,
  onCombined,
}: FamilyCombineSheetProps) {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("FamilyCombineSheet");

  const isOpen = Boolean(family);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [familyDiscount, setFamilyDiscount] = useState("");
  const familyKey = family?.ownerId ?? null;
  const [lastFamilyKey, setLastFamilyKey] = useState(familyKey);
  if (familyKey !== lastFamilyKey) {
    setLastFamilyKey(familyKey);
    setSelectedIds([]);
    setFamilyDiscount("");
  }

  const memberIds = useMemo(() => {
    if (!family) return new Set<string>();
    const ids = new Set<string>([family.ownerId]);
    for (const member of family.members) {
      ids.add(member.id);
    }
    return ids;
  }, [family]);

  const unpaid = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          isUnpaid(invoice.status) &&
          invoice.kind !== "COMBINED" &&
          !invoice.combineMeta &&
          memberIds.has(invoice.studentId),
      ),
    [invoices, memberIds],
  );

  const selected = unpaid.filter((invoice) => selectedIds.includes(invoice.id));
  const subtotal = selected.reduce((sum, invoice) => sum + invoice.amount, 0);
  const discountValue = parseDiscountInput(familyDiscount);
  const discountValid =
    !Number.isNaN(discountValue) &&
    discountValue >= 0 &&
    discountValue <= subtotal;

  const allocations = useMemo(() => {
    if (!discountValid || selected.length === 0) return [];
    try {
      const shares = allocateFamilyDiscount(
        selected.map((invoice) => invoice.amount),
        discountValue,
      );
      return selected.map((invoice, index) => ({
        invoice,
        discount: shares[index]!,
        net: Math.round((invoice.amount - shares[index]!) * 100) / 100,
      }));
    } catch {
      return [];
    }
  }, [selected, discountValid, discountValue]);

  const netDue = discountValid
    ? Math.round((subtotal - discountValue) * 100) / 100
    : null;

  const canConfirm =
    selected.length >= 2 && discountValid && netDue != null && netDue >= 0;

  const combine = useMutation({
    mutationFn: () => {
      if (!family || !canConfirm) {
        throw new Error("Select at least two invoices and a valid discount.");
      }
      return api.post<Invoice>("/billing/family-combine", {
        studioId,
        purchaserUserId: family.ownerId,
        invoiceIds: selected.map((invoice) => invoice.id),
        familyDiscount: discountValue,
      });
    },
    onSuccess: (invoice) => {
      void queryClient.invalidateQueries({ queryKey: ["invoices", studioId] });
      toast({
        title: "Invoices combined",
        description: "Collect payment on the combined invoice.",
        variant: "success",
      });
      onOpenChange(false);
      onCombined(invoice);
    },
    onError: (error) => {
      toast({
        title: "Couldn’t combine invoices",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
    },
  });

  function toggleInvoice(invoiceId: string, selectedNext: boolean) {
    setSelectedIds((current) =>
      selectedNext
        ? current.includes(invoiceId)
          ? current
          : [...current, invoiceId]
        : current.filter((id) => id !== invoiceId),
    );
  }

  return (
    <AppSheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
      title={
        family ? `Combine · ${family.ownerName}’s family` : "Combine invoices"
      }
      size="tall"
    >
      {family ? (
        <div className={staff.sheetStack}>
          <p className={staff.rowMeta}>
            Check unpaid invoices to merge into one bill. Family discount is
            split proportionally across the selected invoices.
          </p>

          {unpaid.length === 0 ? (
            <EmptyState
              title="No unpaid invoices"
              description="Household members need unpaid individual invoices before you can combine."
            />
          ) : (
            <div className={staff.list}>
              {unpaid.map((invoice) => {
                const checked = selectedIds.includes(invoice.id);
                return (
                  <div
                    key={invoice.id}
                    className={staff.rowCard}
                    data-testid={`combine-invoice-${invoice.id}`}
                  >
                    <div className={staff.attentionTop}>
                      <span className={staff.rowTitle}>
                        {invoice.student?.name ?? invoice.studentId}
                      </span>
                      <span className={staff.rowMeta}>
                        {formatPrice(invoice.amount)}
                      </span>
                    </div>
                    <p className={staff.rowMeta}>
                      {[
                        invoice.batchName,
                        invoice.status,
                        invoice.id.slice(-6).toUpperCase(),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <Checkbox
                      isSelected={checked}
                      onChange={(value) => toggleInvoice(invoice.id, value)}
                    >
                      Include in combined invoice
                    </Checkbox>
                  </div>
                );
              })}
            </div>
          )}

          <FormInput
            label="Family discount"
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            data-testid="family-combine-discount"
            value={familyDiscount}
            onChange={setFamilyDiscount}
            placeholder="0"
          />

          {allocations.length > 0 ? (
            <div className={staff.list}>
              {allocations.map((row) => (
                <p key={row.invoice.id} className={staff.rowMeta}>
                  {row.invoice.student?.name ?? row.invoice.studentId}: −
                  {formatPrice(row.discount)} → {formatPrice(row.net)}
                </p>
              ))}
            </div>
          ) : null}

          <p className={staff.rowMeta}>
            {selected.length} selected · Subtotal {formatPrice(subtotal)}
            {netDue != null ? ` · Net ${formatPrice(netDue)}` : ""}
          </p>

          {combine.isError ? (
            <ErrorState
              description={
                combine.error instanceof Error
                  ? combine.error.message
                  : "Combine failed."
              }
            />
          ) : null}

          <div className={staff.sheetActions}>
            <TouchButton
              variant="primary"
              fullWidth
              isDisabled={!canConfirm}
              isPending={combine.isPending}
              data-testid="confirm-family-combine"
              onClick={() => combine.mutate()}
            >
              {netDue != null
                ? `Combine · ${formatPrice(netDue)}`
                : "Combine invoices"}
            </TouchButton>
          </div>
        </div>
      ) : null}
    </AppSheet>
  );
}
