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
  SelectItemDescription,
  SelectItemLabel,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { Switch } from "@dev-ui/components/switch";
import { Tab, TabList, TabPanel, Tabs } from "@dev-ui/components/tabs";
import { TextArea } from "@dev-ui/components/text-area";
import { useToastContext } from "@dev-ui/components/toast";
import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import { occupiedSeatsForOverview } from "@/modules/batches/batch-overview";
import {
  BATCH_COVER_ASPECT,
  uploadBatchCover,
  validateBatchCover,
} from "@/modules/batches/upload";
import { CertificatePreview } from "@/modules/certificates/certificate-preview";
import type { CertificateTemplate } from "@/modules/certificates/types";
import { ApiState } from "@/modules/ui/api-state";
import { FormInput } from "@/modules/ui/form-input";
import { ImageCropSheet } from "@/modules/ui/image-crop-sheet";
import { PageHeader } from "@/modules/ui/page-header";
import { SkeletonBlock } from "@/modules/ui/skeleton-block";
import formStyles from "./new.module.scss";
import styles from "./settings.module.scss";

type BatchDayTime = {
  weekday: number;
  startTime: string;
  endTime: string;
};

type BatchSchedule = {
  frequency: "DAILY" | "WEEKLY";
  weekdays: number[];
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  dayTimes?: BatchDayTime[];
  utcOffsetMinutes: number;
};

type DayTiming = {
  startTime: string;
  endTime: string;
};

type DanceCategory = {
  id: number;
  name: string;
  description: string;
};

type CatalogSubscription = {
  id: string;
  name: string;
  kind: "INDIVIDUAL" | "FAMILY";
  individualAudience?: "ADULT" | "KID" | null;
  billingCadence: "MONTHLY" | "QUARTERLY";
  price: number | string;
  active: boolean;
};

type BatchPlan = {
  id: string;
  name: string;
  kind: "INDIVIDUAL" | "FAMILY";
  individualAudience?: "ADULT" | "KID" | null;
  billingCadence: "MONTHLY" | "QUARTERLY";
  price: number | string;
  active: boolean;
};

type Batch = {
  id: string;
  name: string;
  coverImageUrl?: string | null;
  category: "KIDS" | "ADULTS";
  capacity: number;
  enrollmentMode: "STAFF_ONLY" | "SELF_JOIN";
  enrollmentCount?: number;
  occupiedSeats?: number;
  remainingSeats?: number;
  enrollments?: Array<{ enrolledAt?: string }>;
  plans?: BatchPlan[];
  certificationEnabled?: boolean;
  certificateTemplateId?: string | null;
  certificateTemplate?: CertificateTemplate | null;
  active: boolean;
  branchId: string;
  scheduleJson: BatchSchedule;
  danceCategories: { name: string; description: string }[];
};

type StudioBranch = {
  id: string;
  name: string;
  address: string;
};

const weekdays = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const;

const DEFAULT_DAY_TIMING: DayTiming = {
  startTime: "18:00",
  endTime: "19:00",
};

function dayTimingsFromSchedule(
  schedule: BatchSchedule,
): Record<number, DayTiming> {
  const map: Record<number, DayTiming> = {};
  for (const slot of schedule.dayTimes ?? []) {
    map[slot.weekday] = {
      startTime: slot.startTime,
      endTime: slot.endTime,
    };
  }
  for (const day of schedule.weekdays) {
    if (!map[day]) {
      map[day] = {
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      };
    }
  }
  return map;
}

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

function danceCategoriesFromBatch(
  categories: { name: string; description: string }[],
): DanceCategory[] {
  return categories.map((category, index) => ({
    id: index + 1,
    name: category.name,
    description: category.description,
  }));
}

function formatPlanPrice(price: number | string, cadence: string) {
  const amount = Number(price);
  const suffix = cadence === "QUARTERLY" ? "/qtr" : "/mo";
  return `₹${Number.isFinite(amount) ? amount : price}${suffix}`;
}

function occupiedSeatsForBatch(batch: Batch) {
  return occupiedSeatsForOverview({
    occupiedSeats: batch.occupiedSeats,
    remainingSeats: batch.remainingSeats,
    capacity: batch.capacity,
    enrollmentCount: batch.enrollmentCount,
    enrollmentsLength: batch.enrollments?.length,
  });
}

async function invalidateBatchQueries(
  queryClient: QueryClient,
  studioId: string,
  batchId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["batches", studioId] }),
    queryClient.invalidateQueries({ queryKey: ["batch", batchId] }),
    queryClient.invalidateQueries({
      queryKey: ["batch-revenue", batchId],
      exact: false,
    }),
  ]);
}

export const Route = createFileRoute("/app/batches/$id_/settings")({
  component: BatchSettingsPage,
});

function BatchSettingsPage() {
  const { id } = Route.useParams();
  const api = useApi();
  const navigate = useNavigate({ from: Route.fullPath });

  const query = useQuery({
    queryKey: ["batch", id],
    queryFn: () => api.get<Batch>(`/batches/${id}`),
  });

  return (
    <section className="page stack">
      <PageHeader
        title={query.data?.name ? `${query.data.name} · Settings` : "Settings"}
        description="Update batch details by section. Each tab saves independently."
        actions={
          <Button
            variant="quiet"
            onClick={() =>
              void navigate({
                to: "/app/batches/$id",
                params: { id },
              })
            }
          >
            Back
          </Button>
        }
      />

      {query.isLoading ? (
        <SkeletonBlock height="24rem" />
      ) : (
        <ApiState
          isLoading={false}
          isError={query.isError}
          error={query.error}
          data={query.data}
          emptyTitle="Batch not found"
          emptyDescription="This batch is unavailable."
        >
          {(batch) => (
            <Tabs
              defaultSelectedKey="basics"
              aria-label="Batch settings"
              className={styles.tabs}
            >
              <TabList className={styles.tabList}>
                <Tab id="basics" className={styles.tab}>
                  Basics
                </Tab>
                <Tab id="schedule" className={styles.tab}>
                  Schedule
                </Tab>
                <Tab id="categories" className={styles.tab}>
                  Categories
                </Tab>
                <Tab id="plans" className={styles.tab}>
                  Plans
                </Tab>
                <Tab id="certification" className={styles.tab}>
                  Certification
                </Tab>
              </TabList>

              <TabPanel id="basics" className={styles.tabPanel}>
                <BasicsTab batch={batch} />
              </TabPanel>
              <TabPanel id="schedule" className={styles.tabPanel}>
                <ScheduleTab batch={batch} />
              </TabPanel>
              <TabPanel id="categories" className={styles.tabPanel}>
                <CategoriesTab batch={batch} />
              </TabPanel>
              <TabPanel id="plans" className={styles.tabPanel}>
                <PlansTab batch={batch} />
              </TabPanel>
              <TabPanel id="certification" className={styles.tabPanel}>
                <CertificationTab batch={batch} />
              </TabPanel>
            </Tabs>
          )}
        </ApiState>
      )}
    </section>
  );
}

function BasicsTab({ batch }: { batch: Batch }) {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("BatchSettingsBasics");

  const [name, setName] = useState(batch.name);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    batch.coverImageUrl ?? null,
  );
  const [coverError, setCoverError] = useState<string | null>(null);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [branchId, setBranchId] = useState(batch.branchId);
  const [capacity, setCapacity] = useState(String(batch.capacity));
  const [enrollmentMode, setEnrollmentMode] = useState(batch.enrollmentMode);
  const [active, setActive] = useState(batch.active ? "true" : "false");

  const branches = useQuery({
    queryKey: ["branches", studioId],
    queryFn: () => api.get<StudioBranch[]>(`/studios/${studioId}/branches`),
  });

  const branchOptions: StudioBranch[] = branches.data ?? [];
  const occupiedSeats = occupiedSeatsForBatch(batch);
  const minCapacity = Math.max(1, occupiedSeats);
  const capacityValue = Number(capacity);
  const capacityTooLow =
    Number.isFinite(capacityValue) && capacityValue < minCapacity;

  const isValid =
    Boolean(name.trim() && branchId && capacityValue >= minCapacity) &&
    !capacityTooLow;

  const save = useMutation({
    mutationFn: async () => {
      let coverImageUrl: string | null | undefined;
      if (coverFile) {
        coverImageUrl = await uploadBatchCover(api, coverFile);
      } else if (removeCover) {
        coverImageUrl = null;
      }

      return api.patch<Batch>(`/batches/${batch.id}`, {
        name,
        ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
        branchId,
        capacity: Number(capacity),
        enrollmentMode,
        active: active === "true",
      });
    },
    onSuccess: async (updated) => {
      setCoverFile(null);
      setRemoveCover(false);
      setCoverPreview(updated.coverImageUrl ?? null);
      await invalidateBatchQueries(queryClient, studioId, batch.id);
      toast({
        title: "Basics saved",
        description: "Name, cover, location, and status updated.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t save basics",
        description:
          error instanceof Error
            ? error.message
            : "The batch could not be updated.",
        variant: "error",
      });
    },
  });

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
    setRemoveCover(false);
    setCoverError(null);
  }

  function clearCover() {
    if (coverPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreview);
    }
    setCoverFile(null);
    setCoverPreview(null);
    setRemoveCover(true);
    setCoverError(null);
  }

  return (
    <>
      <div className={formStyles.formGrid}>
        <FormInput label="Name" value={name} onChange={setName} />
        <div className={`${formStyles.coverField} ${formStyles.fullWidth}`}>
          <span className={formStyles.coverLabel}>Cover image (optional)</span>
          <div className={formStyles.coverPreview}>
            {coverPreview ? (
              <img src={coverPreview} alt="Batch cover preview" />
            ) : (
              <span className={formStyles.coverEmpty}>No cover selected</span>
            )}
          </div>
          <div className={formStyles.coverActions}>
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
            <p className={formStyles.coverError}>{coverError}</p>
          ) : null}
        </div>
        <Select label="Category" value={batch.category} isDisabled>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem id="KIDS">Kids</SelectItem>
            <SelectItem id="ADULTS">Adults</SelectItem>
          </SelectContent>
        </Select>
        <Select
          label="Location"
          value={branchId}
          onChange={(key) => setBranchId(key as string)}
          placeholder={
            branches.isLoading ? "Loading locations…" : "Select a branch"
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {branchOptions.map((branch) => (
              <SelectItem
                key={branch.id}
                id={branch.id}
                textValue={branch.name}
              >
                <SelectItemLabel>{branch.name}</SelectItemLabel>
                <SelectItemDescription>{branch.address}</SelectItemDescription>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div>
          <FormInput
            label="Capacity"
            type="number"
            min={String(minCapacity)}
            value={capacity}
            onChange={setCapacity}
          />
          {capacityTooLow ? (
            <p className={formStyles.error} role="alert">
              Capacity cannot be below {occupiedSeats} occupied seat
              {occupiedSeats === 1 ? "" : "s"} (enrollments and active
              bookings).
            </p>
          ) : occupiedSeats > 0 ? (
            <p className={formStyles.help}>
              {occupiedSeats} seat{occupiedSeats === 1 ? "" : "s"} currently
              occupied.
            </p>
          ) : null}
        </div>
        <Select
          label="Enrollment"
          value={enrollmentMode}
          onChange={(key) =>
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
        <Select
          label="Status"
          value={active}
          onChange={(key) => setActive(key as string)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem id="true">Active</SelectItem>
            <SelectItem id="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {save.isError ? (
        <p className={formStyles.error}>
          {save.error instanceof Error
            ? save.error.message
            : "The batch could not be updated."}
        </p>
      ) : null}

      <div className={styles.saveRow}>
        <Button
          variant="primary"
          onClick={() => save.mutate()}
          isPending={save.isPending}
          isDisabled={!isValid}
          data-testid="save-batch-basics"
        >
          Save basics
        </Button>
      </div>

      <ImageCropSheet
        file={pendingCropFile}
        aspect={BATCH_COVER_ASPECT}
        cropShape="rect"
        title="Crop cover image"
        onCancel={() => setPendingCropFile(null)}
        onCropDone={handleCropDone}
      />
    </>
  );
}

function ScheduleTab({ batch }: { batch: Batch }) {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("BatchSettingsSchedule");
  const schedule = batch.scheduleJson;

  const [frequency, setFrequency] = useState(schedule.frequency);
  const [selectedWeekdays, setSelectedWeekdays] = useState(schedule.weekdays);
  const [startDate, setStartDate] = useState(schedule.startDate);
  const [endDate, setEndDate] = useState(schedule.endDate);
  const [startTime, setStartTime] = useState(schedule.startTime);
  const [endTime, setEndTime] = useState(schedule.endTime);
  const [dayTimings, setDayTimings] = useState(() =>
    dayTimingsFromSchedule(schedule),
  );

  const weekdaysScheduleValid =
    frequency === "DAILY"
      ? Boolean(startTime && endTime > startTime)
      : selectedWeekdays.length > 0 &&
        selectedWeekdays.every((day) => {
          const timing = dayTimings[day] ?? {
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          };
          return timing.endTime > timing.startTime;
        });

  const isValid = Boolean(
    startDate && endDate >= startDate && weekdaysScheduleValid,
  );

  function toggleWeekday(day: number, selected: boolean) {
    setSelectedWeekdays((current) =>
      selected
        ? current.includes(day)
          ? current
          : [...current, day]
        : current.filter((value) => value !== day),
    );
    if (selected) {
      setDayTimings((current) => ({
        ...current,
        [day]: current[day] ?? {
          startTime,
          endTime: endTime > startTime ? endTime : DEFAULT_DAY_TIMING.endTime,
        },
      }));
    }
  }

  function updateDayTiming(
    day: number,
    field: keyof DayTiming,
    value: string,
  ) {
    setDayTimings((current) => ({
      ...current,
      [day]: {
        ...(current[day] ?? DEFAULT_DAY_TIMING),
        [field]: value,
      },
    }));
  }

  function buildScheduleJson() {
    const orderedWeekdays =
      frequency === "DAILY"
        ? []
        : [...selectedWeekdays].sort((a, b) => a - b);
    const dayTimes =
      frequency === "WEEKLY"
        ? orderedWeekdays.map((weekday) => {
            const timing =
              dayTimings[weekday] ??
              ({
                startTime,
                endTime,
              } satisfies DayTiming);
            return {
              weekday,
              startTime: timing.startTime,
              endTime: timing.endTime,
            };
          })
        : undefined;
    const primaryStart =
      frequency === "DAILY"
        ? startTime
        : (dayTimes?.[0]?.startTime ?? startTime);
    const primaryEnd =
      frequency === "DAILY" ? endTime : (dayTimes?.[0]?.endTime ?? endTime);
    return {
      frequency,
      weekdays: orderedWeekdays,
      startDate,
      endDate,
      startTime: primaryStart,
      endTime: primaryEnd,
      ...(dayTimes ? { dayTimes } : {}),
      utcOffsetMinutes: new Date(
        `${startDate}T${primaryStart}:00`,
      ).getTimezoneOffset(),
    };
  }

  const save = useMutation({
    mutationFn: () =>
      api.patch<Batch>(`/batches/${batch.id}`, {
        scheduleJson: buildScheduleJson(),
      }),
    onSuccess: async () => {
      await invalidateBatchQueries(queryClient, studioId, batch.id);
      toast({
        title: "Schedule saved",
        description: "Class schedule updated.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t save schedule",
        description:
          error instanceof Error
            ? error.message
            : "The schedule could not be updated.",
        variant: "error",
      });
    },
  });

  return (
    <>
      <section className={formStyles.schedule}>
        <Select
          label="Repeats"
          value={frequency}
          onChange={(key) => setFrequency(key as "DAILY" | "WEEKLY")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem id="DAILY">Every day</SelectItem>
            <SelectItem id="WEEKLY">Selected weekdays</SelectItem>
          </SelectContent>
        </Select>

        {frequency === "WEEKLY" ? (
          <fieldset className={formStyles.weekdays}>
            <legend>Class days</legend>
            <div>
              {weekdays.map((day) => (
                <Checkbox
                  key={day.value}
                  isSelected={selectedWeekdays.includes(day.value)}
                  onChange={(selected) => toggleWeekday(day.value, selected)}
                >
                  {day.label}
                </Checkbox>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className={formStyles.formGrid}>
          <FormInput
            label="Starts on"
            type="date"
            value={startDate}
            onChange={setStartDate}
          />
          <div className={formStyles.endDate}>
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
          {frequency === "DAILY" ? (
            <>
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
            </>
          ) : null}
        </div>
        {frequency === "DAILY" && endTime <= startTime ? (
          <p className={formStyles.error}>
            End time must be later than start time.
          </p>
        ) : null}
        {frequency === "WEEKLY" && selectedWeekdays.length > 0 ? (
          <div className={formStyles.dayTimings}>
            <p className={formStyles.dayTimingsHint}>
              Set a start and end time for each selected day.
            </p>
            {[...selectedWeekdays]
              .sort((a, b) => a - b)
              .map((day) => {
                const timing =
                  dayTimings[day] ??
                  ({
                    startTime,
                    endTime,
                  } satisfies DayTiming);
                const label =
                  weekdays.find((entry) => entry.value === day)?.label ?? "Day";
                return (
                  <div key={day} className={formStyles.dayTimingRow}>
                    <span className={formStyles.dayTimingLabel}>{label}</span>
                    <FormInput
                      label="Starts at"
                      type="time"
                      value={timing.startTime}
                      onChange={(value) =>
                        updateDayTiming(day, "startTime", value)
                      }
                    />
                    <FormInput
                      label="Ends at"
                      type="time"
                      value={timing.endTime}
                      onChange={(value) =>
                        updateDayTiming(day, "endTime", value)
                      }
                    />
                    {timing.endTime <= timing.startTime ? (
                      <p className={formStyles.dayTimingError}>
                        End must be later than start.
                      </p>
                    ) : null}
                  </div>
                );
              })}
          </div>
        ) : null}
      </section>

      {save.isError ? (
        <p className={formStyles.error}>
          {save.error instanceof Error
            ? save.error.message
            : "The schedule could not be updated."}
        </p>
      ) : null}

      <div className={styles.saveRow}>
        <Button
          variant="primary"
          onClick={() => save.mutate()}
          isPending={save.isPending}
          isDisabled={!isValid}
          data-testid="save-batch-schedule"
        >
          Save schedule
        </Button>
      </div>
    </>
  );
}

function CategoriesTab({ batch }: { batch: Batch }) {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("BatchSettingsCategories");

  const [nextCategoryId, setNextCategoryId] = useState(
    batch.danceCategories.length + 1,
  );
  const [danceCategories, setDanceCategories] = useState(() =>
    danceCategoriesFromBatch(batch.danceCategories),
  );

  const isValid =
    danceCategories.length > 0 &&
    danceCategories.every(
      (danceCategory) =>
        danceCategory.name.trim() && danceCategory.description.trim(),
    );

  const save = useMutation({
    mutationFn: () =>
      api.patch<Batch>(`/batches/${batch.id}`, {
        danceCategories: danceCategories.map(
          ({ name: danceName, description }) => ({
            name: danceName,
            description,
          }),
        ),
      }),
    onSuccess: async () => {
      await invalidateBatchQueries(queryClient, studioId, batch.id);
      toast({
        title: "Categories saved",
        description: "Dance categories updated.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t save categories",
        description:
          error instanceof Error
            ? error.message
            : "Categories could not be updated.",
        variant: "error",
      });
    },
  });

  return (
    <>
      <section className={formStyles.categories}>
        {danceCategories.map((danceCategory, index) => (
          <div key={danceCategory.id} className={formStyles.category}>
            <div className={formStyles.categoryHeader}>
              <h4>Category {index + 1}</h4>
              {danceCategories.length > 1 ? (
                <Button
                  size="sm"
                  variant="quiet"
                  onClick={() =>
                    setDanceCategories((current) =>
                      current.filter((item) => item.id !== danceCategory.id),
                    )
                  }
                >
                  Remove
                </Button>
              ) : null}
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
      </section>

      {save.isError ? (
        <p className={formStyles.error}>
          {save.error instanceof Error
            ? save.error.message
            : "Categories could not be updated."}
        </p>
      ) : null}

      <div className={styles.saveRow}>
        <Button
          variant="primary"
          onClick={() => save.mutate()}
          isPending={save.isPending}
          isDisabled={!isValid}
          data-testid="save-batch-categories"
        >
          Save categories
        </Button>
      </div>
    </>
  );
}

function PlansTab({ batch }: { batch: Batch }) {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("BatchSettingsPlans");

  const [subscriptionIds, setSubscriptionIds] = useState(() =>
    (batch.plans ?? []).map((plan) => plan.id),
  );

  const subscriptionsQuery = useQuery({
    queryKey: ["subscriptions", studioId],
    queryFn: () =>
      api.get<CatalogSubscription[]>(`/subscriptions/studio/${studioId}`),
  });

  const expectedAudience = batch.category === "KIDS" ? "KID" : "ADULT";
  const subscriptionCatalog: CatalogSubscription[] =
    subscriptionsQuery.data ?? [];
  const availablePlans = subscriptionCatalog.filter((plan) => plan.active);
  const individualPlans = availablePlans.filter(
    (plan) =>
      plan.kind === "INDIVIDUAL" &&
      plan.individualAudience === expectedAudience,
  );
  const hasIndividualMonthly = individualPlans.some(
    (plan) =>
      plan.billingCadence === "MONTHLY" && subscriptionIds.includes(plan.id),
  );
  const hasIndividualQuarterly = individualPlans.some(
    (plan) =>
      plan.billingCadence === "QUARTERLY" && subscriptionIds.includes(plan.id),
  );
  const plansValid = hasIndividualMonthly && hasIndividualQuarterly;

  const save = useMutation({
    mutationFn: () =>
      api.patch<Batch>(`/batches/${batch.id}`, {
        subscriptionIds,
      }),
    onSuccess: async () => {
      await invalidateBatchQueries(queryClient, studioId, batch.id);
      toast({
        title: "Plans saved",
        description: "Subscription plans updated.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t save plans",
        description:
          error instanceof Error
            ? error.message
            : "Plans could not be updated.",
        variant: "error",
      });
    },
  });

  function togglePlan(planId: string, selected: boolean) {
    setSubscriptionIds((current) =>
      selected
        ? [...current, planId]
        : current.filter((value) => value !== planId),
    );
  }

  return (
    <>
      <section className={formStyles.choiceList}>
        <p className={formStyles.help}>
          Students buy these plans on the batch screen. Individual 1-month and
          3-month plans for {expectedAudience === "KID" ? "kids" : "adults"} are
          required. Family packs are studio-wide (Invoices). Manage the catalog
          in <Link to="/app/subscriptions">Subscriptions</Link>.
        </p>
        <h4 className={formStyles.planGroupTitle}>
          Individual · {expectedAudience === "KID" ? "Kid" : "Adult"}
        </h4>
        {individualPlans.map((plan) => (
          <CheckboxControl
            key={plan.id}
            className={formStyles.choice}
            isSelected={subscriptionIds.includes(plan.id)}
            onChange={(selected) => togglePlan(plan.id, selected)}
          >
            <span className={formStyles.choiceMain}>
              <CheckboxIndicator />
              <span className={formStyles.choiceTitle}>{plan.name}</span>
            </span>
            <span className={formStyles.choiceMeta}>
              {plan.billingCadence === "MONTHLY" ? "1 month" : "3 months"} ·{" "}
              {formatPlanPrice(plan.price, plan.billingCadence)}
            </span>
          </CheckboxControl>
        ))}
        {subscriptionsQuery.isLoading ? (
          <p className={formStyles.help}>Loading plans…</p>
        ) : null}
        {!subscriptionsQuery.isLoading && individualPlans.length === 0 ? (
          <p className={formStyles.help}>
            No matching Individual plans.{" "}
            <Link to="/app/subscriptions/new">Create subscription plans</Link>{" "}
            first.
          </p>
        ) : null}
        {!plansValid ? (
          <p className={formStyles.error}>
            Select both a 1-month and a 3-month Individual plan.
          </p>
        ) : null}
      </section>

      {save.isError ? (
        <p className={formStyles.error}>
          {save.error instanceof Error
            ? save.error.message
            : "Plans could not be updated."}
        </p>
      ) : null}

      <div className={styles.saveRow}>
        <Button
          variant="primary"
          onClick={() => save.mutate()}
          isPending={save.isPending}
          isDisabled={!plansValid}
          data-testid="save-batch-plans"
        >
          Save plans
        </Button>
      </div>
    </>
  );
}

function CertificationTab({ batch }: { batch: Batch }) {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("BatchSettingsCertification");

  const [certificationEnabled, setCertificationEnabled] = useState(
    batch.certificationEnabled ?? false,
  );
  const [certificateTemplateId, setCertificateTemplateId] = useState<
    string | null
  >(batch.certificateTemplateId ?? batch.certificateTemplate?.id ?? null);

  const templatesQuery = useQuery({
    queryKey: ["certificate-templates", studioId],
    queryFn: () =>
      api.get<CertificateTemplate[]>(
        `/certificate-templates/studio/${studioId}`,
      ),
  });

  const availableTemplates: CertificateTemplate[] = templatesQuery.data ?? [];
  const selectedTemplate = useMemo(
    () =>
      availableTemplates.find(
        (template) => template.id === certificateTemplateId,
      ) ?? null,
    [availableTemplates, certificateTemplateId],
  );

  const certsValid = !certificationEnabled || Boolean(certificateTemplateId);

  const save = useMutation({
    mutationFn: () =>
      api.patch<Batch>(`/batches/${batch.id}`, {
        certificationEnabled,
        certificateTemplateId: certificationEnabled
          ? certificateTemplateId
          : null,
      }),
    onSuccess: async () => {
      await invalidateBatchQueries(queryClient, studioId, batch.id);
      toast({
        title: "Certification saved",
        description: "Certificate settings updated.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t save certification",
        description:
          error instanceof Error
            ? error.message
            : "Certification could not be updated.",
        variant: "error",
      });
    },
  });

  return (
    <>
      <section className={formStyles.certification}>
        <div className={formStyles.certToggle}>
          <Switch
            isSelected={certificationEnabled}
            onChange={setCertificationEnabled}
          >
            Issue certificates when students complete this batch
          </Switch>
          <p className={formStyles.help}>
            Students can receive a completion certificate based on the template
            you choose.
          </p>
        </div>
        {certificationEnabled ? (
          <>
            <Select
              label="Certificate template"
              selectedKey={certificateTemplateId}
              onSelectionChange={(key) =>
                setCertificateTemplateId(key as string)
              }
              placeholder={
                templatesQuery.isLoading
                  ? "Loading templates…"
                  : "Select a template"
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTemplates.map((template) => (
                  <SelectItem
                    key={template.id}
                    id={template.id}
                    textValue={template.name}
                  >
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate ? (
              <CertificatePreview
                layout={selectedTemplate.layoutJson}
                contextLabel={batch.name}
              />
            ) : null}
            {!certificateTemplateId ? (
              <p className={formStyles.error}>Select a certificate template.</p>
            ) : null}
          </>
        ) : null}
      </section>

      {save.isError ? (
        <p className={formStyles.error}>
          {save.error instanceof Error
            ? save.error.message
            : "Certification could not be updated."}
        </p>
      ) : null}

      <div className={styles.saveRow}>
        <Button
          variant="primary"
          onClick={() => save.mutate()}
          isPending={save.isPending}
          isDisabled={!certsValid}
          data-testid="save-batch-certification"
        >
          Save certification
        </Button>
      </div>
    </>
  );
}
