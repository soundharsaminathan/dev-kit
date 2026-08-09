import { Button } from "@dev-ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dev-ui/components/card";
import { Checkbox } from "@dev-ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { Switch } from "@dev-ui/components/switch";
import { TextArea } from "@dev-ui/components/text-area";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import type { CertificateTemplate } from "@/modules/certificates/types";
import type {
  CategoryDraft,
  ContestEntryType,
  ContestStatus,
} from "@/modules/contests/types";
import { FormInput } from "@/modules/ui/form-input";
import { PageHeader } from "@/modules/ui/page-header";

type StudioMember = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "STAFF" | "TRAINER" | "STUDENT" | "PARENT";
};

function newCategoryDraft(): CategoryDraft {
  return {
    key: crypto.randomUUID(),
    name: "",
    danceStyle: "",
    ageMin: "8",
    ageMax: "12",
    entryType: "INDIVIDUAL",
    maxEntries: "",
    maxGroupSize: "8",
    judgeIds: [],
  };
}

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const Route = createFileRoute("/app/contests/new")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: NewContestPage,
});

function NewContestPage() {
  const api = useApi();
  const studioId = useStudioId();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { toast } = useToastContext("NewContestPage");

  const startsDefault = new Date();
  startsDefault.setDate(startsDefault.getDate() + 14);
  startsDefault.setHours(10, 0, 0, 0);
  const endsDefault = new Date(startsDefault);
  endsDefault.setHours(18, 0, 0, 0);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(toLocalInputValue(startsDefault));
  const [endsAt, setEndsAt] = useState(toLocalInputValue(endsDefault));
  const [status, setStatus] = useState<ContestStatus>("DRAFT");
  const [certificationEnabled, setCertificationEnabled] = useState(true);
  const [certificateTemplateId, setCertificateTemplateId] = useState("");
  const [categories, setCategories] = useState<CategoryDraft[]>([
    newCategoryDraft(),
  ]);

  const members = useQuery({
    queryKey: ["users", studioId],
    queryFn: () => api.get<StudioMember[]>(`/users/studio/${studioId}`),
  });

  const templates = useQuery({
    queryKey: ["certificate-templates", studioId],
    queryFn: () =>
      api.get<CertificateTemplate[]>(
        `/certificate-templates/studio/${studioId}`,
      ),
  });

  const judges =
    members.data?.filter(
      (member) => member.role === "STAFF" || member.role === "TRAINER",
    ) ?? [];

  const createContest = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>("/contests", {
        studioId,
        title: title.trim(),
        description: description.trim() || null,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        status,
        certificationEnabled,
        certificateTemplateId: certificationEnabled
          ? certificateTemplateId || null
          : null,
        categories: categories.map((category) => ({
          name: category.name.trim(),
          danceStyle: category.danceStyle.trim(),
          ageMin: Number(category.ageMin),
          ageMax: Number(category.ageMax),
          entryType: category.entryType,
          maxEntries: category.maxEntries ? Number(category.maxEntries) : null,
          maxGroupSize:
            category.entryType === "GROUP" && category.maxGroupSize
              ? Number(category.maxGroupSize)
              : null,
          judgeIds: category.judgeIds,
        })),
      }),
    onSuccess: (contest) => {
      void queryClient.invalidateQueries({ queryKey: ["contests", studioId] });
      toast({
        title: "Contest created",
        description: "The contest is ready to manage.",
        variant: "success",
      });
      void navigate({ to: "/app/contests/$id", params: { id: contest.id } });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t create contest",
        description:
          error instanceof Error ? error.message : "Could not create contest.",
        variant: "error",
      });
    },
  });

  function updateCategory(key: string, patch: Partial<CategoryDraft>) {
    setCategories((current) =>
      current.map((category) =>
        category.key === key ? { ...category, ...patch } : category,
      ),
    );
  }

  function toggleJudge(key: string, judgeId: string) {
    setCategories((current) =>
      current.map((category) => {
        if (category.key !== key) {
          return category;
        }
        const next = category.judgeIds.includes(judgeId)
          ? category.judgeIds.filter((id) => id !== judgeId)
          : [...category.judgeIds, judgeId];
        return { ...category, judgeIds: next };
      }),
    );
  }

  const canSubmit =
    title.trim() &&
    startsAt &&
    endsAt &&
    categories.every(
      (category) =>
        category.name.trim() &&
        category.danceStyle.trim() &&
        Number(category.ageMin) >= 0 &&
        Number(category.ageMax) >= Number(category.ageMin),
    ) &&
    (!certificationEnabled || Boolean(certificateTemplateId));

  return (
    <section className="page stack">
      <PageHeader
        title="New contest"
        description="Add categories for dance styles, ages, and solo or group entries."
        actions={
          <Button as={Link} to="/app/contests" variant="quiet">
            Cancel
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
          <CardDescription>
            Contest schedule and certificate setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="stack">
          <FormInput
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="Summer Dance Showcase"
          />
          <div className="stack-sm">
            <span>Description</span>
            <TextArea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional details for students and parents"
            />
          </div>
          <FormInput
            label="Starts"
            type="datetime-local"
            value={startsAt}
            onChange={setStartsAt}
          />
          <FormInput
            label="Ends"
            type="datetime-local"
            value={endsAt}
            onChange={setEndsAt}
          />
          <Select
            label="Status"
            selectedKey={status}
            onSelectionChange={(key) => setStatus(key as ContestStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem id="DRAFT">Draft</SelectItem>
              <SelectItem id="OPEN">Open</SelectItem>
              <SelectItem id="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Switch
            isSelected={certificationEnabled}
            onChange={setCertificationEnabled}
          >
            Enable certificates
          </Switch>
          {certificationEnabled ? (
            <>
              <Select
                label="Certificate template"
                selectedKey={certificateTemplateId || null}
                onSelectionChange={(key) =>
                  setCertificateTemplateId(String(key ?? ""))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {(templates.data ?? []).map((template) => (
                    <SelectItem key={template.id} id={template.id}>
                      {template.name}
                      {template.isSample ? " (sample)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(templates.data ?? []).length === 0 && templates.isFetched ? (
                <p>
                  No templates yet.{" "}
                  <Link to="/app/certificates/new">
                    Create a certificate template
                  </Link>
                  .
                </p>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>

      {categories.map((category, index) => (
        <Card key={category.key}>
          <CardHeader>
            <CardTitle>Category {index + 1}</CardTitle>
            <CardDescription>
              Style, age band, entry type, and judges.
            </CardDescription>
          </CardHeader>
          <CardContent className="stack">
            <FormInput
              label="Name"
              value={category.name}
              onChange={(value) =>
                updateCategory(category.key, { name: value })
              }
              placeholder="Hip Hop Juniors Solo"
            />
            <FormInput
              label="Dance style"
              value={category.danceStyle}
              onChange={(value) =>
                updateCategory(category.key, { danceStyle: value })
              }
              placeholder="Hip Hop"
            />
            <div className="grid-cards">
              <FormInput
                label="Age min"
                type="number"
                value={category.ageMin}
                onChange={(value) =>
                  updateCategory(category.key, { ageMin: value })
                }
              />
              <FormInput
                label="Age max"
                type="number"
                value={category.ageMax}
                onChange={(value) =>
                  updateCategory(category.key, { ageMax: value })
                }
              />
            </div>
            <Select
              label="Entry type"
              selectedKey={category.entryType}
              onSelectionChange={(key) =>
                updateCategory(category.key, {
                  entryType: key as ContestEntryType,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="INDIVIDUAL">Individual</SelectItem>
                <SelectItem id="GROUP">Group</SelectItem>
              </SelectContent>
            </Select>
            <FormInput
              label="Max entries (optional)"
              type="number"
              value={category.maxEntries}
              onChange={(value) =>
                updateCategory(category.key, { maxEntries: value })
              }
            />
            {category.entryType === "GROUP" ? (
              <FormInput
                label="Max group size"
                type="number"
                value={category.maxGroupSize}
                onChange={(value) =>
                  updateCategory(category.key, { maxGroupSize: value })
                }
              />
            ) : null}
            <div className="stack-sm">
              <span>Judges</span>
              {judges.map((judge) => (
                <Checkbox
                  key={judge.id}
                  isSelected={category.judgeIds.includes(judge.id)}
                  onChange={() => toggleJudge(category.key, judge.id)}
                >
                  {judge.name} ({judge.role})
                </Checkbox>
              ))}
            </div>
            {categories.length > 1 ? (
              <Button
                variant="quiet"
                onClick={() =>
                  setCategories((current) =>
                    current.filter((item) => item.key !== category.key),
                  )
                }
              >
                Remove category
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ))}

      <div className="row" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
        <Button
          variant="quiet"
          onClick={() =>
            setCategories((current) => [...current, newCategoryDraft()])
          }
        >
          Add category
        </Button>
        <Button
          variant="primary"
          isDisabled={!canSubmit}
          isPending={createContest.isPending}
          onClick={() => createContest.mutate()}
        >
          Create contest
        </Button>
      </div>
      {createContest.isError ? (
        <p role="alert">{(createContest.error as Error).message}</p>
      ) : null}
    </section>
  );
}
