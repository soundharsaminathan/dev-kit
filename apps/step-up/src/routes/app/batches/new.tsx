import { Button } from "@dev-ui/components/button";
import {
  Checkbox,
  CheckboxControl,
  CheckboxIndicator,
} from "@dev-ui/components/checkbox";
import { Field, Label } from "@dev-ui/components/field";
import { FileTrigger } from "@dev-ui/components/file-trigger";
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
import { useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import {
  BATCH_COVER_ASPECT,
  uploadBatchCover,
  validateBatchCover,
} from "@/modules/batches/upload";
import { CertificatePreview } from "@/modules/certificates/certificate-preview";
import {
  type CertificateTemplate,
  createDefaultCertificateDocument,
  ensureCertificateDocument,
} from "@/modules/certificates/types";
import type { StudioBranch } from "@/modules/locations/types";
import { FormInput } from "@/modules/ui/form-input";
import { ImageCropSheet } from "@/modules/ui/image-crop-sheet";
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
  "Plans",
  "Certification",
] as const;

type CatalogSubscription = {
  id: string;
  name: string;
  kind: "INDIVIDUAL" | "FAMILY";
  individualAudience?: "ADULT" | "KID" | null;
  familyPack?: string | null;
  billingCadence: "MONTHLY" | "QUARTERLY";
  adultSeats: number;
  kidSeats: number;
  price: number | string;
  active: boolean;
};

function formatPlanPrice(price: number | string, cadence: string) {
  const amount = Number(price);
  const suffix = cadence === "QUARTERLY" ? "/3 mo" : "/mo";
  return `₹${Number.isFinite(amount) ? amount : price}${suffix}`;
}

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
  const studioId = useStudioId();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { toast } = useToastContext("NewBatchPage");
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
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
  const [subscriptionIds, setSubscriptionIds] = useState<string[]>([]);

  const members = useQuery({
    queryKey: ["studio-members", studioId],
    queryFn: () => api.get<StudioMember[]>(`/users/studio/${studioId}`),
  });
  const branches = useQuery({
    queryKey: ["branches", studioId],
    queryFn: () => api.get<StudioBranch[]>(`/studios/${studioId}/branches`),
  });
  const templates = useQuery({
    queryKey: ["certificate-templates", studioId],
    queryFn: () =>
      api.get<CertificateTemplate[]>(
        `/certificate-templates/studio/${studioId}`,
      ),
  });
  const subscriptionsQuery = useQuery({
    queryKey: ["subscriptions", studioId],
    queryFn: () =>
      api.get<CatalogSubscription[]>(`/subscriptions/studio/${studioId}`),
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
  const expectedAudience = category === "KIDS" ? "KID" : "ADULT";
  const catalog = useMemo(
    () => (subscriptionsQuery.data ?? []).filter((plan) => plan.active),
    [subscriptionsQuery.data],
  );
  const individualPlans = useMemo(
    () =>
      catalog.filter(
        (plan) =>
          plan.kind === "INDIVIDUAL" &&
          plan.individualAudience === expectedAudience,
      ),
    [catalog, expectedAudience],
  );
  const familyPlans = useMemo(
    () => catalog.filter((plan) => plan.kind === "FAMILY"),
    [catalog],
  );
  const hasIndividualMonthly = individualPlans.some(
    (plan) =>
      plan.billingCadence === "MONTHLY" && subscriptionIds.includes(plan.id),
  );
  const hasIndividualQuarterly = individualPlans.some(
    (plan) =>
      plan.billingCadence === "QUARTERLY" && subscriptionIds.includes(plan.id),
  );

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

  useEffect(() => {
    setSubscriptionIds((current) =>
      current.filter((id) => {
        const plan = catalog.find((entry) => entry.id === id);
        if (!plan) return false;
        if (plan.kind === "FAMILY") return true;
        return plan.individualAudience === expectedAudience;
      }),
    );
  }, [category, catalog, expectedAudience]);

  const stepIsValid = [
    Boolean(name.trim() && branchId && Number(capacity) >= 1 && coverFile),
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
    hasIndividualMonthly && hasIndividualQuarterly,
    !certificationEnabled || Boolean(certificateTemplateId),
  ];

  function togglePlan(planId: string, selected: boolean) {
    setSubscriptionIds((current) =>
      selected
        ? current.includes(planId)
          ? current
          : [...current, planId]
        : current.filter((id) => id !== planId),
    );
  }

  function handleCoverSelect(files: FileList | null) {
    const file = files?.[0] ?? null;
    if (!file) return;
    try {
      validateBatchCover(file);
    } catch (error) {
      setCoverError(error instanceof Error ? error.message : "Invalid image.");
      return;
    }
    setCoverError(null);
    setPendingCropFile(file);
  }

  function handleCropDone(file: File) {
    try {
      validateBatchCover(file);
    } catch (error) {
      setCoverError(error instanceof Error ? error.message : "Invalid image.");
      setPendingCropFile(null);
      return;
    }
    if (coverPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreview);
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setPendingCropFile(null);
    setCoverError(null);
  }

  function clearCover() {
    if (coverPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreview);
    }
    setCoverFile(null);
    setCoverPreview(null);
    setCoverError(null);
  }

  const createBatch = useMutation({
    mutationFn: async () => {
      if (!coverFile) {
        throw new Error("A cover image is required.");
      }
      const coverImageUrl = await uploadBatchCover(api, coverFile);
      return api.post<Batch>("/batches", {
        studioId,
        name,
        coverImageUrl,
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
        subscriptionIds,
        active: true,
        certificationEnabled,
        certificateTemplateId: !certificationEnabled
          ? null
          : certificateTemplateId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["batches", studioId],
      });
      toast({
        title: "Batch created",
        description: "Your batch is live on the schedule.",
        variant: "success",
      });
      await navigate({ to: "/app/batches" });
    },
    onError: (error) => {
      toast({
        title: "Couldn’t create batch",
        description:
          error instanceof Error
            ? error.message
            : "The batch could not be created.",
        variant: "error",
      });
    },
  });

  const progressPct = ((step + 1) / steps.length) * 100;

  return (
    <section className={`page stack ${styles.create}`}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.brandMark}>
            <span className={styles.brandDot} aria-hidden />
            Step Up · Studio
          </p>
          <h1 className={styles.heroTitle}>New batch</h1>
          <p className={styles.heroDescription}>
            Shape a class group — cover, trainers, schedule, and plans — in a
            focused few steps.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Button as={Link} to="/app/batches" variant="quiet">
            Cancel
          </Button>
        </div>
      </header>

      <div
        className={styles.progressMeter}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={step + 1}
        aria-label="Batch creation progress"
      >
        <div
          className={styles.progressFill}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className={styles.wizard}>
        <nav className={styles.steps} aria-label="Batch creation steps">
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
              <div className={`${styles.coverField} ${styles.fullWidth}`}>
                <span className={styles.coverLabel}>Cover image</span>
                <div className={styles.coverPreview}>
                  {coverPreview ? (
                    <img src={coverPreview} alt="Batch cover preview" />
                  ) : (
                    <span className={styles.coverEmpty}>No cover selected</span>
                  )}
                </div>
                <div className={styles.coverActions}>
                  <FileTrigger
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onSelect={handleCoverSelect}
                  >
                    <Button variant="default" type="button">
                      {coverPreview ? "Replace image" : "Upload image"}
                    </Button>
                  </FileTrigger>
                  {coverPreview ? (
                    <Button variant="quiet" type="button" onClick={clearCover}>
                      Remove
                    </Button>
                  ) : null}
                </div>
                {coverError ? (
                  <p className={styles.coverError}>{coverError}</p>
                ) : null}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className={styles.choiceList}>
              {trainers.map((trainer) => (
                <CheckboxControl
                  key={trainer.id}
                  className={styles.choice}
                  isSelected={trainerIds.includes(trainer.id)}
                  onChange={(selected) =>
                    setTrainerIds((current) =>
                      selected
                        ? [...current, trainer.id]
                        : current.filter((id) => id !== trainer.id),
                    )
                  }
                >
                  <span className={styles.choiceMain}>
                    <CheckboxIndicator />
                    <span className={styles.choiceTitle}>{trainer.name}</span>
                  </span>
                  <span className={styles.choiceMeta}>{trainer.email}</span>
                </CheckboxControl>
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
            <div className={styles.choiceList}>
              <p className={styles.help}>
                Students buy these plans on the batch screen. Individual 1-month
                and 3-month plans for{" "}
                {expectedAudience === "KID" ? "kids" : "adults"} are required.
                Family packs are optional.
              </p>
              <h3 className={styles.planGroupTitle}>
                Individual · {expectedAudience === "KID" ? "Kid" : "Adult"}
              </h3>
              {individualPlans.map((plan) => (
                <CheckboxControl
                  key={plan.id}
                  className={styles.choice}
                  isSelected={subscriptionIds.includes(plan.id)}
                  onChange={(selected) => togglePlan(plan.id, selected)}
                >
                  <span className={styles.choiceMain}>
                    <CheckboxIndicator />
                    <span className={styles.choiceTitle}>{plan.name}</span>
                  </span>
                  <span className={styles.choiceMeta}>
                    {plan.billingCadence === "MONTHLY" ? "1 month" : "3 months"}{" "}
                    · {formatPlanPrice(plan.price, plan.billingCadence)}
                  </span>
                </CheckboxControl>
              ))}
              {subscriptionsQuery.isLoading && (
                <p className={styles.help}>Loading plans…</p>
              )}
              {!subscriptionsQuery.isLoading &&
                individualPlans.length === 0 && (
                  <p className={styles.help}>
                    No matching Individual plans.{" "}
                    <Link to="/app/subscriptions/new">
                      Create subscription plans
                    </Link>{" "}
                    first.
                  </p>
                )}
              <h3 className={styles.planGroupTitle}>Family packs (optional)</h3>
              {familyPlans.map((plan) => (
                <CheckboxControl
                  key={plan.id}
                  className={styles.choice}
                  isSelected={subscriptionIds.includes(plan.id)}
                  onChange={(selected) => togglePlan(plan.id, selected)}
                >
                  <span className={styles.choiceMain}>
                    <CheckboxIndicator />
                    <span className={styles.choiceTitle}>{plan.name}</span>
                  </span>
                  <span className={styles.choiceMeta}>
                    {plan.billingCadence === "MONTHLY" ? "1 month" : "3 months"}{" "}
                    · {formatPlanPrice(plan.price, plan.billingCadence)}
                  </span>
                </CheckboxControl>
              ))}
              {!hasIndividualMonthly || !hasIndividualQuarterly ? (
                <p className={styles.error}>
                  Select both a 1-month and a 3-month Individual plan.
                </p>
              ) : null}
            </div>
          )}

          {step === 5 && (
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
                data-testid="create-batch"
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

      <ImageCropSheet
        file={pendingCropFile}
        aspect={BATCH_COVER_ASPECT}
        cropShape="rect"
        title="Crop cover image"
        onCancel={() => setPendingCropFile(null)}
        onCropDone={handleCropDone}
      />
    </section>
  );
}
