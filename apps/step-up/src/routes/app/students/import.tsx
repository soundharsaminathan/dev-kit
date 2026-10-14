import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { readSheet } from "read-excel-file/browser";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useImportJob } from "@/modules/import/import-job-provider";
import {
  ImportWorkspace,
  type ImportWorkspacePhase,
} from "@/modules/import/import-workspace";
import type { ParseStudioImportResult } from "@/modules/import/parse-studio-import";
import {
  parseStudentImportRows,
  type StudentImportRow,
} from "@/modules/students/parse-student-import";

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

function toStudioResult(
  students: StudentImportRow[],
  invalidRows: number[],
): ParseStudioImportResult {
  return {
    ...EMPTY_RESULT,
    found: {
      ...EMPTY_RESULT.found,
      students: students.length > 0 || invalidRows.length > 0,
    },
    students,
    studentsInvalidRows: invalidRows,
  };
}

export const Route = createFileRoute("/app/students/import")({
  beforeLoad: ({ context, location }) => {
    requireAdmin(context.auth, {
      pathname: location.pathname,
      searchStr: location.searchStr,
    });
  },
  component: ImportStudentsPage,
});

function ImportStudentsPage() {
  const api = useApi();
  const { job, isActive, isComplete, isFailed, trackImport, clearImport } =
    useImportJob();
  const [phase, setPhase] = useState<ImportWorkspacePhase>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] =
    useState<ParseStudioImportResult>(EMPTY_RESULT);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

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
      api.post<{ id: string }>("/users/bulk/jobs", {
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
      }),
    onSuccess: (data) => {
      trackImport({
        jobId: data.id,
        batchName: null,
        fileName,
        kind: "students",
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
      return;
    }

    setIsReading(true);
    setFileError(null);
    setFileName(file.name);
    clearImport();
    setStartError(null);

    try {
      const rows = await readSheet(file);
      const parsed = parseStudentImportRows(rows);
      setResult(toStudioResult(parsed.students, parsed.invalidRows));
      setPhase("analyze");
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
  };

  return (
    <ImportWorkspace
      mode="students"
      phase={phase}
      fileName={fileName}
      result={result}
      fileError={fileError}
      isReading={isReading}
      startError={startError}
      job={job}
      isStarting={startImport.isPending}
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
