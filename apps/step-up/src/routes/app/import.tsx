import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { default as readXlsxFile } from "read-excel-file/browser";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useImportJob } from "@/modules/import/import-job-provider";
import {
  ImportWorkspace,
  type ImportWorkspacePhase,
} from "@/modules/import/import-workspace";
import {
  type ParseStudioImportResult,
  parseStudioImportSheets,
} from "@/modules/import/parse-studio-import";
import { RequireStudioFeature } from "@/modules/studio-features/require-studio-feature";

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

const IMPORT_HISTORY_KEY = "step-up-import-history";

function persistImportHistory(
  id: string,
  fileName: string,
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED",
) {
  try {
    const raw = localStorage.getItem(IMPORT_HISTORY_KEY);
    const existing = raw ? (JSON.parse(raw) as Array<{ id: string }>) : [];
    const next = [
      {
        id,
        fileName,
        startedAt: new Date().toISOString(),
        status,
      },
      ...existing.filter((entry) => entry.id !== id),
    ].slice(0, 20);
    localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Ignore local storage failures.
  }
}

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

function resolveImportBatchName(result: ParseStudioImportResult): string | null {
  if (result.batches[0]?.name?.trim()) {
    return result.batches[0].name.trim();
  }
  return null;
}

function ImportDataPage() {
  const api = useApi();
  const { job, isActive, isComplete, isFailed, trackImport, clearImport } =
    useImportJob();
  const [phase, setPhase] = useState<ImportWorkspacePhase>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ParseStudioImportResult>(EMPTY_RESULT);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [precheckErrors, setPrecheckErrors] = useState<string[]>([]);
  const [isPrechecking, setIsPrechecking] = useState(false);

  useEffect(() => {
    if (isActive) {
      setPhase("create");
      return;
    }
    if (isComplete) {
      setPhase("complete");
      return;
    }
    if (isFailed) {
      setPhase("failed");
    }
  }, [isActive, isComplete, isFailed]);

  const startImport = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>("/import/jobs", buildImportPayload(result)),
    onSuccess: (data) => {
      const batchName = resolveImportBatchName(result);
      if (fileName) {
        persistImportHistory(data.id, fileName, "PENDING");
      }
      trackImport({
        jobId: data.id,
        batchName,
        fileName,
      });
      setPhase("create");
      setStartError(null);
    },
    onError: (error) => {
      setStartError(
        error instanceof Error ? error.message : "Unable to start import.",
      );
    },
  });

  const selectFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      setFileName(null);
      setResult(EMPTY_RESULT);
      setFileError(null);
      setPhase("upload");
      clearImport();
      setStartError(null);
      setPrecheckErrors([]);
      setIsPrechecking(false);
      return;
    }

    setIsReading(true);
    setFileError(null);
    setFileName(file.name);
    clearImport();
    setStartError(null);
    setPrecheckErrors([]);

    try {
      const sheets = await readXlsxFile(file, {
        getSheets: true,
      } as Parameters<typeof readXlsxFile>[1]);
      const parsed = await parseStudioImportSheets(sheets);
      setResult(parsed);
      setPhase("analyze");
      setIsPrechecking(true);
      try {
        const precheck = await api.post<{ errors: string[] }>(
          "/import/precheck",
          buildImportPayload(parsed),
        );
        setPrecheckErrors(precheck.errors);
      } catch (error) {
        setPrecheckErrors([
          error instanceof Error
            ? error.message
            : "Unable to validate plan names for this workbook.",
        ]);
      } finally {
        setIsPrechecking(false);
      }
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

  const resetImport = () => {
    setPhase("upload");
    setFileName(null);
    setResult(EMPTY_RESULT);
    setFileError(null);
    clearImport();
    setStartError(null);
    setPrecheckErrors([]);
    setIsPrechecking(false);
  };

  return (
    <ImportWorkspace
      phase={phase}
      fileName={fileName}
      result={result}
      fileError={fileError}
      isReading={isReading}
      startError={startError}
      job={job}
      isStarting={startImport.isPending}
      precheckErrors={precheckErrors}
      isPrechecking={isPrechecking}
      onSelectFile={(files) => void selectFile(files)}
      onStartImport={() => startImport.mutate()}
      onCancelImport={() => {
        clearImport();
        setPhase("analyze");
      }}
      onImportAnother={resetImport}
    />
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
    batches: result.batches.map(({ danceStyles, ...batch }) => ({
      ...batch,
      ...(danceStyles.length > 0
        ? { danceStyles: danceStyles.join(", ") }
        : {}),
    })),
    enrollments: result.enrollments,
    sessions: result.sessions,
    invoices: result.invoices,
    attendance: result.attendance,
  };
}
