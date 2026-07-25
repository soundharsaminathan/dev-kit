import { Button } from "@dev-ui/components/button";
import { Checkbox } from "@dev-ui/components/checkbox";
import { Field, Label } from "@dev-ui/components/field";
import { FileTrigger } from "@dev-ui/components/file-trigger";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dev-ui/components/select";
import { Tab, TabList, TabPanel, Tabs } from "@dev-ui/components/tabs";
import { TextArea } from "@dev-ui/components/text-area";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import {
  BatchOverview,
  occupiedSeatsForOverview,
} from "@/modules/batches/batch-overview";
import { BatchRoster } from "@/modules/batches/batch-roster";
import { BatchSessionsLane } from "@/modules/batches/batch-sessions-lane";
import { BatchTrainers } from "@/modules/batches/batch-trainers";
import {
  BATCH_COVER_ASPECT,
  uploadBatchCover,
  validateBatchCover,
} from "@/modules/batches/upload";
import { BatchChat } from "@/modules/chat/batch-chat";
import type { ChatConversation } from "@/modules/chat/types";
import { ApiState } from "@/modules/ui/api-state";
import { AppBottomSheet } from "@/modules/ui/app-bottom-sheet";
import { FormInput } from "@/modules/ui/form-input";
import { ImageCropSheet } from "@/modules/ui/image-crop-sheet";
import { PageHeader } from "@/modules/ui/page-header";
import styles from "./new.module.scss";

type BatchSchedule = {
  frequency: "DAILY" | "WEEKLY";
  weekdays: number[];
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  utcOffsetMinutes: number;
};

type DanceCategory = {
  id: number;
  name: string;
  description: string;
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
  scheduleLabel?: string | null;
  enrollments?: Array<{ isTrial?: boolean }>;
  sessions?: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    status?: string;
  }>;
  active: boolean;
  branchId: string;
  branch?: {
    id: string;
    name: string;
    address: string;
  } | null;
  scheduleJson: BatchSchedule;
  danceCategories: { name: string; description: string }[];
  trainers: {
    trainerId: string;
    trainer: {
      id: string;
      name: string;
      email: string;
      photoUrl?: string | null;
    };
  }[];
};

function occupiedSeatsForBatch(batch: Batch) {
  return occupiedSeatsForOverview({
    occupiedSeats: batch.occupiedSeats,
    remainingSeats: batch.remainingSeats,
    capacity: batch.capacity,
    enrollmentCount: batch.enrollmentCount,
    enrollmentsLength: batch.enrollments?.length,
  });
}

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

export const Route = createFileRoute("/app/batches/$id")({
  component: EditBatchPage,
});

function EditBatchPage() {
  const { id } = Route.useParams();
  const api = useApi();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const query = useQuery({
    queryKey: ["batch", id],
    queryFn: () => api.get<Batch>(`/batches/${id}`),
  });

  const chatQuery = useQuery({
    queryKey: ["batch-conversation", id],
    queryFn: () =>
      api.get<ChatConversation>(`/chat/batches/${id}/conversation`),
  });

  const deleteBatch = useMutation({
    mutationFn: () => api.delete(`/batches/${id}`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["batches", STUDIO_ID] }),
        queryClient.removeQueries({ queryKey: ["batch", id] }),
      ]);
      await navigate({ to: "/app/batches" });
    },
  });

  const audienceCount =
    query.data?.enrollmentCount ?? query.data?.enrollments?.length ?? 0;
  const canDelete = Boolean(query.data) && audienceCount === 0;
  const chatUnread = chatQuery.data?.unreadCount ?? 0;

  return (
    <section className="page stack">
      <PageHeader
        title={query.data?.name ?? "Batch"}
        description="Roster, instructors, and class chat."
        actions={
          <div className={styles.headerActions}>
            {query.data ? (
              <Button
                variant="quiet"
                onClick={() => setSettingsOpen(true)}
                data-testid="batch-settings"
              >
                Settings
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                variant="danger"
                isPending={deleteBatch.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete “${query.data?.name}”? This cannot be undone.`,
                    )
                  ) {
                    deleteBatch.mutate();
                  }
                }}
              >
                Delete
              </Button>
            ) : null}
            <Button as={Link} to="/app/batches" variant="quiet">
              Back
            </Button>
          </div>
        }
      />

      {deleteBatch.isError ? (
        <p className={styles.error} role="alert">
          {deleteBatch.error instanceof Error
            ? deleteBatch.error.message
            : "The batch could not be deleted."}
        </p>
      ) : null}

      <ApiState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        data={query.data}
        emptyTitle="Batch not found"
        emptyDescription="This batch is unavailable."
      >
        {(batch) => (
          <div className="stack">
            <BatchOverview
              name={batch.name}
              coverImageUrl={batch.coverImageUrl}
              active={batch.active}
              capacity={batch.capacity}
              enrollmentMode={batch.enrollmentMode}
              occupiedSeats={batch.occupiedSeats}
              remainingSeats={batch.remainingSeats}
              enrollmentCount={batch.enrollmentCount}
              enrollments={batch.enrollments}
              scheduleLabel={batch.scheduleLabel}
              branchName={batch.branch?.name}
              sessions={batch.sessions}
              trainers={batch.trainers.map((row) => ({
                id: row.trainer.id,
                name: row.trainer.name,
                photoUrl: row.trainer.photoUrl ?? null,
              }))}
            />
            <BatchSessionsLane sessions={batch.sessions} />
            <Tabs defaultSelectedKey="students" aria-label="Batch sections">
              <TabList>
                <Tab id="students">Students</Tab>
                <Tab id="trainers">Trainers</Tab>
                <Tab id="chat">
                  <span className={styles.chatTab}>
                    Chat
                    {chatUnread > 0 ? (
                      <span className={styles.tabUnread}>
                        {chatUnread > 99 ? "99+" : chatUnread}
                      </span>
                    ) : null}
                  </span>
                </Tab>
              </TabList>
              <TabPanel id="students">
                <BatchRoster
                  batchId={batch.id}
                  capacity={batch.capacity}
                  active={batch.active}
                />
              </TabPanel>
              <TabPanel id="trainers">
                <BatchTrainers batchId={batch.id} trainers={batch.trainers} />
              </TabPanel>
              <TabPanel id="chat">
                <BatchChat batchId={batch.id} />
              </TabPanel>
            </Tabs>

            <AppBottomSheet
              isOpen={settingsOpen}
              onOpenChange={setSettingsOpen}
              title="Batch settings"
              size="tall"
            >
              <EditBatchForm
                key={batch.id}
                batch={batch}
                onSaved={() => setSettingsOpen(false)}
              />
            </AppBottomSheet>
          </div>
        )}
      </ApiState>
    </section>
  );
}

function EditBatchForm({
  batch,
  onSaved,
}: {
  batch: Batch;
  onSaved?: () => void;
}) {
  const api = useApi();
  const queryClient = useQueryClient();
  const schedule = batch.scheduleJson;

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
  const [frequency, setFrequency] = useState(schedule.frequency);
  const [selectedWeekdays, setSelectedWeekdays] = useState(schedule.weekdays);
  const [startDate, setStartDate] = useState(schedule.startDate);
  const [endDate, setEndDate] = useState(schedule.endDate);
  const [startTime, setStartTime] = useState(schedule.startTime);
  const [endTime, setEndTime] = useState(schedule.endTime);
  const [nextCategoryId, setNextCategoryId] = useState(
    batch.danceCategories.length + 1,
  );
  const [danceCategories, setDanceCategories] = useState(() =>
    danceCategoriesFromBatch(batch.danceCategories),
  );

  const branches = useQuery({
    queryKey: ["branches", STUDIO_ID],
    queryFn: () => api.get<StudioBranch[]>(`/studios/${STUDIO_ID}/branches`),
  });

  const occupiedSeats = occupiedSeatsForBatch(batch);
  const minCapacity = Math.max(1, occupiedSeats);
  const capacityValue = Number(capacity);
  const capacityTooLow =
    Number.isFinite(capacityValue) && capacityValue < minCapacity;

  const isValid =
    Boolean(name.trim() && branchId && capacityValue >= minCapacity) &&
    !capacityTooLow &&
    Boolean(
      startDate &&
        endDate >= startDate &&
        startTime &&
        endTime > startTime &&
        (frequency === "DAILY" || selectedWeekdays.length > 0),
    ) &&
    danceCategories.length > 0 &&
    danceCategories.every(
      (danceCategory) =>
        danceCategory.name.trim() && danceCategory.description.trim(),
    );

  const updateBatch = useMutation({
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
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["batches", STUDIO_ID] }),
        queryClient.invalidateQueries({ queryKey: ["batch", batch.id] }),
      ]);
      onSaved?.();
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
    <div className="stack">
      <div className={styles.formGrid}>
        <FormInput label="Name" value={name} onChange={setName} />
        <div className={`${styles.coverField} ${styles.fullWidth}`}>
          <span className={styles.coverLabel}>Cover image (optional)</span>
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
            {(branches.data ?? []).map((branch) => (
              <SelectItem key={branch.id} id={branch.id}>
                {branch.name} — {branch.address}
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
            <p className={styles.error} role="alert">
              Capacity cannot be below {occupiedSeats} occupied seat
              {occupiedSeats === 1 ? "" : "s"} (enrollments and active
              bookings).
            </p>
          ) : occupiedSeats > 0 ? (
            <p className={styles.help}>
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

      <section className={styles.schedule}>
        <h3>Schedule</h3>
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
      </section>

      <section className={styles.categories}>
        <h3>Dance categories</h3>
        {danceCategories.map((danceCategory, index) => (
          <div key={danceCategory.id} className={styles.category}>
            <div className={styles.categoryHeader}>
              <h4>Category {index + 1}</h4>
              {danceCategories.length > 1 && (
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
      </section>

      <p className={styles.help}>
        Membership plans are studio-wide via{" "}
        <Link to="/app/subscriptions">Subscriptions</Link>, not per batch.
      </p>

      {updateBatch.isError && (
        <p className={styles.error}>
          {updateBatch.error instanceof Error
            ? updateBatch.error.message
            : "The batch could not be updated."}
        </p>
      )}

      <Button
        variant="primary"
        onClick={() => updateBatch.mutate()}
        isPending={updateBatch.isPending}
        isDisabled={!isValid}
      >
        Save changes
      </Button>

      <ImageCropSheet
        file={pendingCropFile}
        aspect={BATCH_COVER_ASPECT}
        cropShape="rect"
        title="Crop cover image"
        onCancel={() => setPendingCropFile(null)}
        onCropDone={handleCropDone}
      />
    </div>
  );
}
