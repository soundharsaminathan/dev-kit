import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";
import { FileTrigger } from "@dev-ui/components/file-trigger";
import { useToastContext } from "@dev-ui/components/toast";
import { Icon } from "@dev-ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { default as readXlsxFile } from "read-excel-file/browser";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import { ImportComplete } from "@/modules/import/import-complete";
import styles from "@/modules/import/import-pipeline.module.scss";
import { ImportPipeline } from "@/modules/import/import-pipeline";
import type { ImportJobSnapshot } from "@/modules/import/import-types";
import {
  formatImportRowList,
  type ParseStudioImportResult,
  parseStudioImportSheets,
} from "@/modules/import/parse-studio-import";
import { RequireStudioFeature } from "@/modules/studio-features/require-studio-feature";
import { Screen } from "@/modules/ui/screen";
import staff from "@/modules/ui/staff.module.scss";
import { StickyCtaBar, TouchButton } from "@/modules/ui/touch-button";

type SheetCounts = {
  students: number;
  locations: number;
  batches: number;
  enrollments: number;
  sessions: number;
  invoices: number;
  attendance: number;
};

type ImportPhase = "upload" | "analyze" | "create" | "complete" | "failed";

const SHEET_LABELS = {
  students: "Students",
  locations: "Locations",
  batches: "Batches",
  enrollments: "Enrollments",
  sessions: "Sessions",
  invoices: "Invoices & payments",
  attendance: "Attendance",
} as const;

const EMPTY_RESULT: ParseStudioImportResult = {
  found: {
    students: false,
    locations: false,
    batches: false,
    enrollments: false,
    sessions: false,
    invoices: false,
    attendance: false,
  },
  sheetErrors: {},
  crossSheetErrors: [],
  students: [],
  studentsInvalidRows: [],
  locations: [],
  locationsInvalidRows: [],
  batches: [],
  batchesInvalidRows: [],
  enrollments: [],
  enrollmentsInvalidRows: [],
  sessions: [],
  sessionsInvalidRows: [],
  invoices: [],
  invoicesInvalidRows: [],
  attendance: [],
  attendanceInvalidRows: [],
};

export const Route = createFileRoute("/app/import")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: () => (
    <RequireStudioFeature feature="data_import">
      <ImportDataPage />
    </RequireStudioFeature>
  ),
});

function ImportDataPage() {
  const api = useApi();
  const studioId = useStudioId();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { toast } = useToastContext("ImportDataPage");
  const [phase, setPhase] = useState<ImportPhase>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ParseStudioImportResult>(EMPTY_RESULT);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const startImport = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>("/import/jobs", buildImportPayload(result)),
    onSuccess: (data) => {
      setJobId(data.id);
      setPhase("create");
      setStartError(null);
    },
    onError: (error) => {
      setStartError(
        error instanceof Error ? error.message : "Unable to start import.",
      );
    },
  });

  const jobQuery = useQuery({
    queryKey: ["import-job", studioId, jobId],
    queryFn: () => api.get<ImportJobSnapshot>(`/import/jobs/${jobId}`),
    enabled: Boolean(jobId) && phase === "create",
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "PENDING" || status === "RUNNING") {
        return 750;
      }
      return false;
    },
  });

  useEffect(() => {
    const job = jobQuery.data;
    if (!job || phase !== "create") {
      return;
    }
    if (job.status === "SUCCEEDED") {
      setPhase("complete");
      void queryClient.invalidateQueries({ queryKey: ["studio-members"] });
      void queryClient.invalidateQueries({ queryKey: ["student-funnel"] });
      void queryClient.invalidateQueries({ queryKey: ["student-directory"] });
      void queryClient.invalidateQueries({ queryKey: ["batches"] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: "Import complete",
        description: "Your studio data has been created.",
      });
    }
    if (job.status === "FAILED") {
      setPhase("failed");
    }
  }, [jobQuery.data, phase, queryClient, toast]);

  const selectFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      setFileName(null);
      setResult(EMPTY_RESULT);
      setFileError(null);
      setPhase("upload");
      setJobId(null);
      return;
    }

    setIsReading(true);
    setFileError(null);
    setFileName(file.name);
    setJobId(null);
    setStartError(null);

    try {
      const sheets = await readXlsxFile(file, {
        getSheets: true,
      } as Parameters<typeof readXlsxFile>[1]);
      const parsed = await parseStudioImportSheets(sheets);
      setResult(parsed);
      setPhase(
        totalCounts(parsed) > 0 && parsed.crossSheetErrors.length === 0
          ? "analyze"
          : "analyze",
      );
    } catch (error) {
      setResult(EMPTY_RESULT);
      setPhase("upload");
      setFileError(
        error instanceof Error
          ? error.message
          : "Unable to read the spreadsheet.",
      );
    } finally {
      setIsReading(false);
    }
  };

  const counts: SheetCounts = {
    students: result.students.length,
    locations: result.locations.length,
    batches: result.batches.length,
    enrollments: result.enrollments.length,
    sessions: result.sessions.length,
    invoices: result.invoices.length,
    attendance: result.attendance.length,
  };
  const totalRecords = totalCounts(result);
  const hasBlockingErrors = result.crossSheetErrors.length > 0;
  const canStartImport = totalRecords > 0 && !hasBlockingErrors;
  const job = jobQuery.data;
  const showAnalyzeCta = phase === "analyze" && canStartImport;

  const screenTitle =
    phase === "upload"
      ? "Import studio data"
      : phase === "analyze"
        ? "Review import"
        : phase === "create"
          ? "Importing your studio"
          : phase === "complete"
            ? "Import complete"
            : "Import failed";

  const screenSubtitle =
    phase === "upload"
      ? "Upload your Excel workbook and Step Up will create your studio data automatically."
      : phase === "analyze"
        ? "Confirm the records below, then start creating studio data."
        : phase === "create"
          ? "Step Up is creating your studio data in real time."
          : phase === "complete"
            ? "Your studio data is ready to use."
            : "Some records could not be created.";

  return (
    <>
      <Screen
        title={screenTitle}
        subtitle={screenSubtitle}
        showBack
        backTo="/app/students"
        paddedCta={showAnalyzeCta}
      >
        {phase === "upload" ? (
          <div className={staff.softPanel}>
            <FileTrigger
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              allowsClearing
              clearLabel="Clear spreadsheet"
              onSelect={(files) => void selectFile(files)}
            >
              <div className={styles.uploadZone}>
                <Icon name="upload" aria-hidden />
                <p className={styles.uploadTitle}>
                  {fileName ?? "Drop Excel file"}
                </p>
                <p className={styles.uploadHint}>
                  {fileName
                    ? "Choose another file to replace"
                    : "or choose from computer"}
                </p>
                <p className={styles.uploadExt}>.xlsx</p>
              </div>
            </FileTrigger>

            <TouchButton
              as="a"
              href="/templates/studio-import-template.xlsx"
              download="studio-import-template.xlsx"
              variant="quiet"
              fullWidth
            >
              Download template
            </TouchButton>

            {fileError ? (
              <Alert variant="danger">
                <AlertTitle>Unable to read this file</AlertTitle>
                <AlertDescription>{fileError}</AlertDescription>
              </Alert>
            ) : null}

            {isReading ? (
              <p className={staff.panelDesc} role="status">Reading workbook…</p>
            ) : null}
          </div>
        ) : null}

        {phase === "analyze" ? (
          <div className={staff.softPanel}>
            {fileName ? (
              <p className={staff.panelDesc}>
                File: <strong>{fileName}</strong>
              </p>
            ) : null}

            <TouchButton
              variant="quiet"
              fullWidth
              onClick={() => void selectFile(null)}
            >
              Choose a different file
            </TouchButton>

            {result.crossSheetErrors.map((message) => (
              <Alert key={message} variant="danger">
                <AlertTitle>Fix before importing</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ))}

            {Object.entries(result.sheetErrors).map(([kind, message]) => (
              <Alert key={kind} variant="warning">
                <AlertTitle>
                  {SHEET_LABELS[kind as keyof typeof SHEET_LABELS]} sheet
                  skipped
                </AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ))}

            {fileName && totalRecords === 0 && !hasBlockingErrors ? (
              <Alert variant="warning">
                <AlertTitle>No records ready to import</AlertTitle>
                <AlertDescription>
                  No valid rows were found. Add sheets with the template headers
                  and fill in at least one row.
                </AlertDescription>
              </Alert>
            ) : null}

            {totalRecords > 0 ? (
              <div className={staff.section}>
                <p className={staff.panelTitle}>{totalRecords} records ready</p>
                <p className={staff.panelDesc}>Previewing the first rows</p>
                <div className={staff.list}>
                  {(
                    [
                      ["students", counts.students],
                      ["locations", counts.locations],
                      ["batches", counts.batches],
                      ["sessions", counts.sessions],
                      ["enrollments", counts.enrollments],
                      ["invoices", counts.invoices],
                      ["attendance", counts.attendance],
                    ] as const
                  ).map(([kind, count]) =>
                    count > 0 ? (
                      <div key={kind} className={staff.attentionCard}>
                        <span className={staff.attentionTitle}>
                          {SHEET_LABELS[kind]} · {count}
                        </span>
                        <p className={staff.attentionMeta}>
                          {sheetPreview(kind, result)}
                        </p>
                      </div>
                    ) : null,
                  )}
                </div>
                {invalidRowSummary(result) ? (
                  <p className={staff.panelDesc} role="status">
                    {invalidRowSummary(result)}
                  </p>
                ) : null}
              </div>
            ) : null}

            {startError ? (
              <Alert variant="danger">
                <AlertTitle>Import failed to start</AlertTitle>
                <AlertDescription>{startError}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}

        {phase === "create" && job ? (
          <ImportPipeline entities={job.entities} />
        ) : null}

        {phase === "create" && !job && jobQuery.isError ? (
          <Alert variant="danger">
            <AlertTitle>Unable to load import status</AlertTitle>
            <AlertDescription>
              {jobQuery.error instanceof Error
                ? jobQuery.error.message
                : "Please try again."}
            </AlertDescription>
          </Alert>
        ) : null}

        {phase === "complete" && job ? (
          <ImportComplete
            entities={job.entities}
            onViewStudio={() => void navigate({ to: "/app/students" })}
          />
        ) : null}

        {phase === "failed" && job ? (
          <div className={staff.softPanel}>
            <Alert variant="danger">
              <AlertTitle>Import failed</AlertTitle>
              <AlertDescription>
                {job.error ?? "Something went wrong while creating studio data."}
              </AlertDescription>
            </Alert>
            <ImportPipeline entities={job.entities} />
            <TouchButton
              variant="quiet"
              fullWidth
              onClick={() => {
                setPhase("analyze");
                setJobId(null);
              }}
            >
              Back to review
            </TouchButton>
          </div>
        ) : null}
      </Screen>

      {showAnalyzeCta ? (
        <StickyCtaBar
          secondary={
            <TouchButton
              variant="quiet"
              fullWidth
              onClick={() => void navigate({ to: "/app/students" })}
            >
              Cancel
            </TouchButton>
          }
        >
          <TouchButton
            variant="primary"
            fullWidth
            isPending={startImport.isPending}
            onClick={() => startImport.mutate()}
          >
            Start import
          </TouchButton>
        </StickyCtaBar>
      ) : null}
    </>
  );
}

function buildImportPayload(result: ParseStudioImportResult) {
  return {
    students: result.students.map(
      ({
        name,
        email,
        gender,
        age,
        dateOfBirth,
        phone,
        guardianName,
        alternateMobile,
      }) => ({
        name,
        email,
        gender,
        ...(age !== undefined && age !== null ? { age } : {}),
        ...(dateOfBirth !== undefined && dateOfBirth !== null
          ? { dateOfBirth }
          : {}),
        ...(guardianName !== undefined && guardianName !== null
          ? { guardianName }
          : {}),
        ...(alternateMobile !== undefined && alternateMobile !== null
          ? { alternateMobile }
          : {}),
        ...(phone !== undefined && phone !== null ? { phone } : {}),
      }),
    ),
    locations: result.locations,
    batches: result.batches,
    enrollments: result.enrollments,
    sessions: result.sessions,
    invoices: result.invoices,
    attendance: result.attendance,
  };
}

function sheetPreview(
  kind: keyof SheetCounts,
  result: ParseStudioImportResult,
) {
  switch (kind) {
    case "students":
      return result.students
        .slice(0, 3)
        .map((student) => `${student.name} · ${student.email}`)
        .join(" / ");
    case "locations":
      return result.locations
        .slice(0, 3)
        .map((row) => `${row.name}${row.address ? ` · ${row.address}` : ""}`)
        .join(" / ");
    case "batches":
      return result.batches
        .slice(0, 3)
        .map((batch) => `${batch.name} · ${batch.category}`)
        .join(" / ");
    case "enrollments":
      return result.enrollments
        .slice(0, 3)
        .map((row) => `${row.studentEmail} → ${row.batchName}`)
        .join(" / ");
    case "sessions":
      return result.sessions
        .slice(0, 3)
        .map((row) => `${row.batchName} · ${row.date} · ${row.startTime}`)
        .join(" / ");
    case "invoices":
      return result.invoices
        .slice(0, 3)
        .map(
          (row) =>
            `${row.studentEmail} · ${row.status} · ${row.amount.toFixed(2)}`,
        )
        .join(" / ");
    case "attendance":
      return result.attendance
        .slice(0, 3)
        .map(
          (row) =>
            `${row.studentEmail} → ${row.batchName} · ${row.date}${row.startTime ? ` · ${row.startTime}` : ""}`,
        )
        .join(" / ");
  }
}

function invalidRowSummary(result: ParseStudioImportResult): string | null {
  const parts: string[] = [];
  const rows = {
    students: result.studentsInvalidRows,
    locations: result.locationsInvalidRows,
    batches: result.batchesInvalidRows,
    sessions: result.sessionsInvalidRows,
    enrollments: result.enrollmentsInvalidRows,
    invoices: result.invoicesInvalidRows,
    attendance: result.attendanceInvalidRows,
  };
  for (const [kind, list] of Object.entries(rows)) {
    if (list.length > 0) {
      parts.push(
        `${SHEET_LABELS[kind as keyof typeof SHEET_LABELS]}: skipped ${formatImportRowList(list)}`,
      );
    }
  }
  return parts.length > 0
    ? `Some rows were skipped and won’t be imported: ${parts.join(" · ")}. Fix them and re-upload, or import the valid rows below.`
    : null;
}

function totalCounts(result: ParseStudioImportResult) {
  return (
    result.students.length +
    result.locations.length +
    result.batches.length +
    result.enrollments.length +
    result.sessions.length +
    result.invoices.length +
    result.attendance.length
  );
}
