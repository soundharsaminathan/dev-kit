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
import { AppSheet } from "@/modules/ui/app-sheet";
import { FormInput } from "@/modules/ui/form-input";
import staff from "@/modules/ui/staff.module.scss";
import { ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

type StudioMember = {
  id: string;
  name: string;
  role: "OWNER" | "STAFF" | "TRAINER" | "STUDENT" | "PARENT";
};

type CreateInvoiceSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateInvoiceSheet({
  isOpen,
  onOpenChange,
}: CreateInvoiceSheetProps) {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("CreateInvoiceSheet");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");

  const membersQuery = useQuery({
    queryKey: ["studio-members", studioId],
    queryFn: () => api.get<StudioMember[]>(`/users/studio/${studioId}`),
    enabled: isOpen,
  });

  const students =
    membersQuery.data?.filter((member) => member.role === "STUDENT") ?? [];

  const createInvoice = useMutation({
    mutationFn: () =>
      api.post("/billing", {
        studioId,
        studentId,
        amount: Number(amount),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["billing"] });
      void queryClient.invalidateQueries({ queryKey: ["invoices", studioId] });
      toast({
        title: "Invoice created",
        description: "Pending invoice is ready to collect.",
        variant: "success",
      });
      setStudentId(null);
      setAmount("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Couldn’t create invoice",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
    },
  });

  const amountValue = Number(amount);
  const canSubmit =
    Boolean(studentId) && Number.isFinite(amountValue) && amountValue > 0;

  return (
    <AppSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Create invoice"
    >
      <div className={staff.sheetStack}>
        <Select
          label="Student"
          placeholder="Select a student"
          selectedKey={studentId}
          onSelectionChange={(key) => setStudentId(key as string)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {students.map((student) => (
              <SelectItem key={student.id} id={student.id}>
                {student.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormInput
          label="Amount (INR)"
          type="number"
          min={1}
          step="1"
          value={amount}
          onChange={setAmount}
        />
        {createInvoice.isError ? (
          <ErrorState
            description={
              createInvoice.error instanceof Error
                ? createInvoice.error.message
                : "Could not create invoice."
            }
          />
        ) : null}
        <div className={staff.sheetActions}>
          <TouchButton
            variant="primary"
            fullWidth
            isDisabled={!canSubmit}
            isPending={createInvoice.isPending}
            data-testid="confirm-create-invoice"
            onClick={() => createInvoice.mutate()}
          >
            Create invoice
          </TouchButton>
        </div>
      </div>
    </AppSheet>
  );
}
