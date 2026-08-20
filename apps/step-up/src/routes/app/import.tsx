import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";
import { FileTrigger } from "@dev-ui/components/file-trigger";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { default as readXlsxFile } from "read-excel-file/browser";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import {
  formatImportRowList,
  type ParseStudioImportResult,
  parseStudioImportSheets,
} from "@/modules/import/parse-studio-import";
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

type StudioDataImportResult = {
  students: { created: number; skipped: number };
  locations: { created: number; skipped: number };
  batches: { created: number; skipped: number };
  enrollments: { created: number; skipped: number };
  sessions: { created: number; skipped: number };
  invoices: { created: number; skipped: number };
  attendance: { created: number; skipped: number };
};

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
  component: ImportDataPage,
});

function ImportDataPage() {
  const api = useApi();
  const studioId = useStudioId();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { toast } = useToastContext("ImportDataPage");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ParseStudioImportResult>(EMPTY_RESULT);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  const importData = useMutation({
    mutationFn: () =>
      api.post<StudioDataImportResult>("/import/studio-data", {
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
            ...(age !== null ? { age } : {}),
            ...(dateOfBirth ? { dateOfBirth } : {}),
            ...(phone ? { phone } : {}),
            ...(guardianName ? { guardianName } : {}),
            ...(alternateMobile ? { alternateMobile } : {}),
          }),
        ),
        batches: result.batches.map(({ danceStyles, ...batch }) => ({
          ...batch,
          danceStyles: danceStyles.join(", "),
        })),
        locations: result.locations,
        enrollments: result.enrollments,
        sessions: result.sessions,
        invoices: result.invoices,
        attendance: result.attendance,
      }),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["studio-members", studioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["student-funnel", studioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["student-directory", studioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["batches", studioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["invoices", studioId],
        }),
      ]);
      const totals = totalCounts(result);
      toast({
        title: "Batch imported",
        description: `Imported ${data.students.created} students, ${data.locations.created} locations, ${data.batches.created} batches, ${data.enrollments.created} enrollments, ${data.sessions.created} sessions, ${data.invoices.created} invoices, and ${data.attendance.created} attendance records (${totals} records in the file).`,
        variant: "success",
      });
      clearSelection();
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t import the data",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
    },
  });

  const clearSelection = () => {
    setResult(EMPTY_RESULT);
    setFileError(null);
    setFileName(null);
    importData.reset();
  };

  const selectFile = async (files: FileList | null) => {
    const file = files?.[0];

    if (!file) {
      clearSelection();
      return;
    }

    setFileError(null);
    setFileName(file.name);
    importData.reset();
    setIsReading(true);

    try {
      const sheets = await readXlsxFile(file);
      setResult(parseStudioImportSheets(sheets));
    } catch (error) {
      setResult(EMPTY_RESULT);
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
  const canImport = totalRecords > 0 && !hasBlockingErrors;

  return (
    <>
      <Screen
        title="Import studio data"
        subtitle="Import one batch at a time — that batch’s sessions, enrollments, payments, and attendance in one workbook. Times use your studio timezone (Chennai / Asia/Kolkata by default)."
        showBack
        backTo="/app/students"
        paddedCta={canImport}
      >
        <div className={staff.softPanel}>
          <FileTrigger
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            allowsClearing
            clearLabel="Clear spreadsheet"
            onSelect={(files) => void selectFile(files)}
          >
            <TouchButton isPending={isReading} fullWidth>
              {fileName ?? "Choose Excel file"}
            </TouchButton>
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

          <p className={staff.panelDesc}>
            One batch per file. Sheets: Students, Locations, Batches (single
            row), Sessions, Enrollments, Invoices &amp; payments, and
            Attendance. All rows must use the same batch name. On Batches, set
            Monthly plan name and Quarterly plan name to attach catalog plans.
            On Enrollments and Invoices, set Plan name to link that subscription
            (enrollment also starts a membership; invoices are not billed
            twice). Attendance needs a Start time that matches a Sessions row.
            Dates and times are local wall clock in your studio timezone
            (Billing settings). Blank and duplicate rows are skipped.
          </p>

          {fileError ? (
            <Alert variant="danger">
              <AlertTitle>Unable to import this file</AlertTitle>
              <AlertDescription>{fileError}</AlertDescription>
            </Alert>
          ) : null}

          {importData.isError ? (
            <Alert variant="danger">
              <AlertTitle>Import failed</AlertTitle>
              <AlertDescription>
                {importData.error instanceof Error
                  ? importData.error.message
                  : "Please try again."}
              </AlertDescription>
            </Alert>
          ) : null}

          {result.crossSheetErrors.map((message) => (
            <Alert key={message} variant="danger">
              <AlertTitle>Fix before importing</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ))}

          {Object.entries(result.sheetErrors).map(([kind, message]) => (
            <Alert key={kind} variant="warning">
              <AlertTitle>
                {SHEET_LABELS[kind as keyof typeof SHEET_LABELS]} sheet skipped
              </AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ))}

          {fileName && totalRecords === 0 && !hasBlockingErrors ? (
            <Alert variant="warning">
              <AlertTitle>No records ready to import</AlertTitle>
              <AlertDescription>
                No valid rows were found. Add sheets with the template headers,
                fill in at least one row, and choose the file again to refresh
                the preview.
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
        </div>
      </Screen>

      {canImport ? (
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
            isPending={importData.isPending}
            onClick={() => importData.mutate()}
          >
            Import {totalRecords} records
          </TouchButton>
        </StickyCtaBar>
      ) : null}
    </>
  );
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
