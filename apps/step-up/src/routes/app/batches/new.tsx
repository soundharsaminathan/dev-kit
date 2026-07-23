import { Button } from "@dev-ui/components/button";
import { Checkbox } from "@dev-ui/components/checkbox";
import { Field, Label } from "@dev-ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { Switch } from "@dev-ui/components/switch";
import { TextArea } from "@dev-ui/components/text-area";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import { CertificatePreview } from "@/modules/certificates/certificate-preview";
import {
  type CertificateTemplate,
  createDefaultCertificateDocument,
  ensureCertificateDocument,
} from "@/modules/certificates/types";
import type { StudioBranch } from "@/modules/locations/types";
import { FormInput } from "@/modules/ui/form-input";
import { PageHeader } from "@/modules/ui/page-header";
import styles from "./new.module.scss";

type Batch = {
  id: string;
  name: string;
};

type StudioMember = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "STAFF" | "TRAINER" | "STUDENT" | "PARENT";
};

type DanceCategory = {
  id: number;
  name: string;
  description: string;
};

const steps = [
  "Basics",
  "Trainers",
  "Schedule",
  "Dance categories",
  "Certification",
] as const;

const weekdays = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const;

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthEndFor(dateValue: string) {
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  return toDateInputValue(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function formatIssuedAt(dateValue: string) {
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export const Route = createFileRoute("/app/batches/new")({
  component: NewBatchPage,
});

function NewBatchPage() {
  const api = useApi();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [category, setCategory] = useState<"KIDS" | "ADULTS">("KIDS");
  const [capacity, setCapacity] = useState("12");
  const [enrollmentMode, setEnrollmentMode] = useState<
    "STAFF_ONLY" | "SELF_JOIN"
  >("STAFF_ONLY");
  const [branchId, setBranchId] = useState<string | null>(null);
  const [trainerIds, setTrainerIds] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY">("WEEKLY");
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1]);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(monthEndFor(today));
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:00");
  const [nextCategoryId, setNextCategoryId] = useState(2);
  const [danceCategories, setDanceCategories] = useState<DanceCategory[]>([
    { id: 1, name: "", description: "" },
  ]);
  const [certificationEnabled, setCertificationEnabled] = useState(true);
  const [certificateTemplateId, setCertificateTemplateId] = useState<
    string | null
  >(null);

  const members = useQuery({
    queryKey: ["studio-members", STUDIO_ID],
    queryFn: () => api.get<StudioMember[]>(`/users/studio/${STUDIO_ID}`),
  });
  const branches = useQuery({
    queryKey: ["branches", STUDIO_ID],
    queryFn: () => api.get<StudioBranch[]>(`/studios/${STUDIO_ID}/branches`),
  });
  const templates = useQuery({
    queryKey: ["certificate-templates", STUDIO_ID],
    queryFn: () =>
      api.get<CertificateTemplate[]>(
        `/certificate-templates/studio/${STUDIO_ID}`,
      ),
  });

  const trainers = useMemo(
    () => members.data?.filter((member) => member.role === "TRAINER") ?? [],
    [members.data],
  );
  const availableBranches = branches.data ?? [];
  const availableTemplates = templates.data ?? [];
  const selectedTemplate =
    availableTemplates.find(
      (template) => template.id === certificateTemplateId,
    ) ?? availableTemplates[0];
  const selectedTrainers = trainers.filter((trainer) =>
    trainerIds.includes(trainer.id),
  );
  const filledDanceCategories = danceCategories.filter((danceCategory) =>
    danceCategory.name.trim(),
  );
  const certificateLayout = selectedTemplate
    ? ensureCertificateDocument(selectedTemplate.layoutJson)
    : createDefaultCertificateDocument();

  useEffect(() => {
    if (!certificateTemplateId && availableTemplates.length > 0) {
      const sample =
        availableTemplates.find((template) => template.isSample) ??
        availableTemplates[0];
      if (sample) {
        setCertificateTemplateId(sample.id);
      }
    }
  }, [availableTemplates, certificateTemplateId]);

  const stepIsValid = [
    Boolean(name.trim() && branchId && Number(capacity) >= 1),
    trainerIds.length > 0,
    Boolean(
      startDate &&
        endDate >= startDate &&
        startTime &&
        endTime > startTime &&
        (frequency === "DAILY" || selectedWeekdays.length > 0),
    ),
    danceCategories.length > 0 &&
      danceCategories.every(
        (danceCategory) =>
          danceCategory.name.trim() && danceCategory.description.trim(),
      ),
    !certificationEnabled || Boolean(certificateTemplateId),
  ];

  const createBatch = useMutation({
    mutationFn: () =>
      api.post<Batch>("/batches", {
        studioId: STUDIO_ID,
        name,
        coverImageUrl: coverImageUrl.trim() || undefined,
        category,
        branchId,
        trainerIds,
        danceCategories: danceCategories.map(
          ({ name: danceName, description }) => ({
            name: danceName,
            description,
          }),
        ),
        scheduleJson: {
          frequency,
          weekdays: frequency === "DAILY" ? [] : selectedWeekdays,
          startDate,
          endDate,
          startTime,
          endTime,
          utcOffsetMinutes: new Date(
            `${startDate}T${startTime}:00`,
          ).getTimezoneOffset(),
        },
        capacity: Number(capacity),
        enrollmentMode,
        active: true,
        certificationEnabled,
        certificateTemplateId: certificationEnabled
          ? certificateTemplateId
          : null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["batches", STUDIO_ID],
      });
      await navigate({ to: "/app/batches" });
    },
  });

  return (
    <section className="page stack">
      <PageHeader
        title="New batch"
        description="Add a class group for your studio."
        actions={
          <Button as={Link} to="/app/batches" variant="quiet">
            Cancel
          </Button>
        }
      />

      <div className={styles.wizard}>
        <nav className={styles.steps} aria-label="Batch creation progress">
          {steps.map((label, index) => (
            <div
              key={label}
              className={styles.step}
              data-active={index === step || undefined}
              data-complete={index < step || undefined}
            >
              <span>{index + 1}</span>
              <strong>{label}</strong>
            </div>
          ))}
        </nav>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <p className={styles.eyebrow}>
              Step {step + 1} of {steps.length}
            </p>
            <h2>{steps[step]}</h2>
          </div>

          {step === 0 && (
            <div className={styles.formGrid}>
              <FormInput label="Batch name" value={name} onChange={setName} />
              <FormInput
                label="Cover image URL (optional)"
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                placeholder="https://…"
              />
              <Select
                label="Student group"
                selectedKey={category}
                onSelectionChange={(key) =>
                  setCategory(key as "KIDS" | "ADULTS")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem id="KIDS">Kids</SelectItem>
                  <SelectItem id="ADULTS">Adults</SelectItem>
                </SelectContent>
              </Select>
              <FormInput
                label="Capacity"
                type="number"
                min="1"
                value={capacity}
                onChange={setCapacity}
              />
              <Select
                label="Enrollment"
                selectedKey={enrollmentMode}
                onSelectionChange={(key) =>
                  setEnrollmentMode(key as "STAFF_ONLY" | "SELF_JOIN")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem id="STAFF_ONLY" textValue="Staff only">
                    Staff only
                  </SelectItem>
                  <SelectItem id="SELF_JOIN" textValue="Self + Staff">
                    Self + Staff
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className={styles.fullWidth}>
                <Select
                  label="Location"
                  placeholder={
                    branches.isLoading
                      ? "Loading locations…"
                      : "Select a branch"
                  }
                  selectedKey={branchId}
                  onSelectionChange={(key) => setBranchId(key as string)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBranches.map((branch) => (
                      <SelectItem key={branch.id} id={branch.id}>
                        {branch.name} — {branch.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {branches.isError && (
                <p className={styles.error}>Locations could not be loaded.</p>
              )}
              {branches.isFetched && availableBranches.length === 0 && (
                <p className={styles.help}>
                  <Link to="/app/locations">Add a location</Link> before
                  creating this batch.
                </p>
              )}
            </div>
          )}

          {step === 1 && (
            <div className={styles.choiceList}>
              {trainers.map((trainer) => (
                <div key={trainer.id} className={styles.choice}>
                  <Checkbox
                    isSelected={trainerIds.includes(trainer.id)}
                    onChange={(selected) =>
                      setTrainerIds((current) =>
                        selected
                          ? [...current, trainer.id]
                          : current.filter((id) => id !== trainer.id),
                      )
                    }
                  >
                    {trainer.name}
                  </Checkbox>
                  <span>{trainer.email}</span>
                </div>
              ))}
              {members.isLoading && (
                <p className={styles.help}>Loading trainers…</p>
              )}
              {members.isError && (
                <p className={styles.error}>Trainers could not be loaded.</p>
              )}
              {members.isFetched && trainers.length === 0 && (
                <p className={styles.help}>
                  Add a trainer to this studio before creating a batch.
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className={styles.schedule}>
              <Select
                label="Repeats"
                selectedKey={frequency}
                onSelectionChange={(key) =>
                  setFrequency(key as "DAILY" | "WEEKLY")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem id="DAILY">Every day</SelectItem>
                  <SelectItem id="WEEKLY">Selected weekdays</SelectItem>
                </SelectContent>
              </Select>

              {frequency === "WEEKLY" && (
                <fieldset className={styles.weekdays}>
                  <legend>Class days</legend>
                  <div>
                    {weekdays.map((day) => (
                      <Checkbox
                        key={day.value}
                        isSelected={selectedWeekdays.includes(day.value)}
                        onChange={(selected) =>
                          setSelectedWeekdays((current) =>
                            selected
                              ? [...current, day.value]
                              : current.filter((value) => value !== day.value),
                          )
                        }
                      >
                        {day.label}
                      </Checkbox>
                    ))}
                  </div>
                </fieldset>
              )}

              <div className={styles.formGrid}>
                <FormInput
                  label="Starts on"
                  type="date"
                  min={today}
                  value={startDate}
                  onChange={setStartDate}
                />
                <div className={styles.endDate}>
                  <FormInput
                    label="Runs until"
                    type="date"
                    min={startDate}
                    value={endDate}
                    onChange={setEndDate}
                  />
                  <Button
                    size="sm"
                    variant="quiet"
                    onClick={() => setEndDate(monthEndFor(startDate))}
                  >
                    Until month end
                  </Button>
                </div>
                <FormInput
                  label="Starts at"
                  type="time"
                  value={startTime}
                  onChange={setStartTime}
                />
                <FormInput
                  label="Ends at"
                  type="time"
                  value={endTime}
                  onChange={setEndTime}
                />
              </div>
              {endTime <= startTime && (
                <p className={styles.error}>
                  End time must be later than start time.
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className={styles.categories}>
              {danceCategories.map((danceCategory, index) => (
                <div key={danceCategory.id} className={styles.category}>
                  <div className={styles.categoryHeader}>
                    <h3>Category {index + 1}</h3>
                    {danceCategories.length > 1 && (
                      <Button
                        size="sm"
                        variant="quiet"
                        onClick={() =>
                          setDanceCategories((current) =>
                            current.filter(
                              (item) => item.id !== danceCategory.id,
                            ),
                          )
                        }
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <FormInput
                    label="Dance category"
                    placeholder="For example, Hip-hop"
                    value={danceCategory.name}
                    onChange={(value) =>
                      setDanceCategories((current) =>
                        current.map((item) =>
                          item.id === danceCategory.id
                            ? { ...item, name: value }
                            : item,
                        ),
                      )
                    }
                  />
                  <Field>
                    <Label>Description</Label>
                    <TextArea
                      placeholder="What students will learn in this category"
                      value={danceCategory.description}
                      onChange={(event) =>
                        setDanceCategories((current) =>
                          current.map((item) =>
                            item.id === danceCategory.id
                              ? { ...item, description: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </Field>
                </div>
              ))}
              <Button
                variant="quiet"
                onClick={() => {
                  setDanceCategories((current) => [
                    ...current,
                    { id: nextCategoryId, name: "", description: "" },
                  ]);
                  setNextCategoryId((current) => current + 1);
                }}
              >
                Add another category
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className={styles.certification}>
              <div className={styles.certToggle}>
                <Switch
                  isSelected={certificationEnabled}
                  onChange={setCertificationEnabled}
                >
                  Issue certificates when students complete this batch
                </Switch>
                <p className={styles.help}>
                  Students can receive a completion certificate based on the
                  template you choose.
                </p>
              </div>

              {certificationEnabled && (
                <>
                  <Select
                    label="Certificate template"
                    placeholder={
                      templates.isLoading
                        ? "Loading templates…"
                        : "Select a template"
                    }
                    selectedKey={certificateTemplateId}
                    onSelectionChange={(key) =>
                      setCertificateTemplateId(key as string)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTemplates.map((template) => (
                        <SelectItem key={template.id} id={template.id}>
                          {template.name}
                          {template.isSample ? " (sample)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {templates.isError && (
                    <p className={styles.error}>
                      Certificate templates could not be loaded.
                    </p>
                  )}
                  {templates.isFetched && availableTemplates.length === 0 && (
                    <p className={styles.help}>
                      No templates yet.{" "}
                      <Link to="/app/certificates/new">
                        Create a certificate template
                      </Link>{" "}
                      to enable batch certification.
                    </p>
                  )}

                  {selectedTemplate && (
                    <CertificatePreview
                      layout={certificateLayout}
                      contextLabel={name.trim() || "Your batch name"}
                      danceCategories={filledDanceCategories.map(
                        (item) => item.name,
                      )}
                      trainers={selectedTrainers.map((trainer) => trainer.name)}
                      footer={`Step Up Dance Studio · ${formatIssuedAt(endDate)}`}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {createBatch.isError && (
            <p className={styles.error}>
              {createBatch.error instanceof Error
                ? createBatch.error.message
                : "The batch could not be created."}
            </p>
          )}

          <div className={styles.actions}>
            {step > 0 && (
              <Button variant="quiet" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button
                variant="primary"
                onClick={() => setStep(step + 1)}
                isDisabled={!stepIsValid[step]}
              >
                Continue
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => createBatch.mutate()}
                isPending={createBatch.isPending}
                isDisabled={!stepIsValid[step]}
              >
                Create batch
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
