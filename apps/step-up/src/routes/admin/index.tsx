import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";
import { Label } from "@dev-ui/components/field";
import { Input } from "@dev-ui/components/input";
import { TextField } from "@dev-ui/components/text-field";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { Screen } from "@/modules/ui/screen";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import staff from "@/modules/ui/staff.module.scss";
import { EmptyState, ErrorState } from "@/modules/ui/states";
import { TouchButton } from "@/modules/ui/touch-button";

type StudioListItem = {
  id: string;
  name: string;
  address: string | null;
  contact: string | null;
  memberCount: number;
  owner: { id: string; email: string; name: string };
};

type CreateStudioResult = {
  id: string;
  name: string;
  owner: { id: string; email: string; name: string };
  ownerProvisioned: boolean;
  setupHint: string | null;
};

export const Route = createFileRoute("/admin/")({
  component: AdminStudiosPage,
});

function AdminStudiosPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("AdminStudiosPage");
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [createdHint, setCreatedHint] = useState<string | null>(null);

  const studiosQuery = useQuery({
    queryKey: ["admin", "studios"],
    queryFn: () => api.get<StudioListItem[]>("/studios"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post<CreateStudioResult>("/studios", {
        name: name.trim(),
        ownerEmail: ownerEmail.trim(),
        ...(ownerName.trim() ? { ownerName: ownerName.trim() } : {}),
        ...(address.trim() ? { address: address.trim() } : {}),
        ...(contact.trim() ? { contact: contact.trim() } : {}),
      }),
    onSuccess: (result) => {
      setName("");
      setOwnerEmail("");
      setOwnerName("");
      setAddress("");
      setContact("");
      setFormError(null);
      setCreatedHint(result.setupHint);
      void queryClient.invalidateQueries({ queryKey: ["admin", "studios"] });
      toast({
        title: "Studio created",
        description: `${result.name} was provisioned successfully.`,
        variant: "success",
      });
    },
    onError: (error) => {
      setFormError(
        error instanceof Error ? error.message : "Could not create studio",
      );
      toast({
        title: "Couldn’t create studio",
        description:
          error instanceof Error ? error.message : "Could not create studio.",
        variant: "error",
      });
    },
  });

  return (
    <Screen
      title="Studios"
      subtitle="Provision tenant studios. Owners manage their own teams."
    >
      <section className={staff.section}>
        <h2 className={staff.sectionTitle}>Create studio</h2>
        {formError ? (
          <Alert variant="danger">
            <AlertTitle>Create failed</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}
        {createdHint ? (
          <Alert variant="neutral">
            <AlertTitle>Studio created</AlertTitle>
            <AlertDescription>{createdHint}</AlertDescription>
          </Alert>
        ) : null}
        <form
          className={staff.section}
          onSubmit={(event) => {
            event.preventDefault();
            setFormError(null);
            setCreatedHint(null);
            if (!name.trim() || !ownerEmail.trim()) {
              setFormError("Name and owner email are required");
              return;
            }
            createMutation.mutate();
          }}
        >
          <TextField>
            <Label data-required="true">Studio name</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </TextField>
          <TextField>
            <Label data-required="true">Owner email</Label>
            <Input
              type="email"
              value={ownerEmail}
              onChange={(event) => setOwnerEmail(event.target.value)}
              required
            />
          </TextField>
          <TextField>
            <Label>Owner name</Label>
            <Input
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
            />
          </TextField>
          <TextField>
            <Label>Address</Label>
            <Input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </TextField>
          <TextField>
            <Label>Contact</Label>
            <Input
              value={contact}
              onChange={(event) => setContact(event.target.value)}
            />
          </TextField>
          <TouchButton
            type="submit"
            variant="primary"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create studio"}
          </TouchButton>
        </form>
      </section>

      <section className={staff.section}>
        <h2 className={staff.sectionTitle}>All studios</h2>
        {studiosQuery.isLoading ? <SkeletonBlock height="8rem" /> : null}
        {studiosQuery.isError ? (
          <ErrorState
            description={
              studiosQuery.error instanceof Error
                ? studiosQuery.error.message
                : "Could not load studios."
            }
          />
        ) : null}
        {studiosQuery.data?.length === 0 ? (
          <EmptyState
            title="No studios yet"
            description="Create the first tenant studio above."
          />
        ) : null}
        {studiosQuery.data && studiosQuery.data.length > 0 ? (
          <ul className={staff.list}>
            {studiosQuery.data.map((studio) => (
              <li key={studio.id} className={staff.metricCard}>
                <p className={staff.metricLabel}>{studio.name}</p>
                <p>
                  Owner {studio.owner.name} · {studio.owner.email}
                </p>
                <p>
                  {studio.memberCount} members · {studio.id}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </Screen>
  );
}
