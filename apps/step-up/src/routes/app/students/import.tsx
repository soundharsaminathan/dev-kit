import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";
import { FileTrigger } from "@dev-ui/components/file-trigger";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { readSheet } from "read-excel-file/browser";
import { useApi } from "@/lib/api-context";
import { STUDIO_ID } from "@/lib/constants";
import { Screen } from "@/modules/ui/screen";
import staff from "@/modules/ui/staff.module.scss";
import { StickyCtaBar, TouchButton } from "@/modules/ui/touch-button";

type StudentRow = {
  name: string;
  email: string;
  phone?: string;
};

type ParseResult = {
  students: StudentRow[];
  invalidRows: number[];
};

type BulkImportResult = {
  created: number;
  skipped: number;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_STUDENTS = 500;

export const Route = createFileRoute("/app/students/import")({
  component: ImportStudentsPage,
});

function cellText(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function formatRowList(rows: number[]) {
  if (rows.length <= 8) {
    return rows.join(", ");
  }
  return `${rows.slice(0, 8).join(", ")}, and ${rows.length - 8} more`;
}

async function parseStudents(file: File): Promise<ParseResult> {
  const rows = await readSheet(file);

  if (rows.length < 2) {
    throw new Error(
      "The spreadsheet must include a header and at least one student.",
    );
  }

  const headerRow = rows[0];
  if (!headerRow) {
    throw new Error("The spreadsheet does not contain a header row.");
  }

  const headers = headerRow.map((cell) => cellText(cell).toLowerCase());
  const nameIndex = headers.indexOf("name");
  const emailIndex = headers.indexOf("email");
  const phoneIndex =
    headers.indexOf("phone") === -1
      ? headers.indexOf("mobile")
      : headers.indexOf("phone");

  if (nameIndex === -1 || emailIndex === -1) {
    throw new Error('The first row must contain "Name" and "Email" columns.');
  }

  const students: StudentRow[] = [];
  const seenEmails = new Set<string>();
  const invalidRows: number[] = [];

  for (const [index, row] of rows.slice(1).entries()) {
    const name = cellText(row[nameIndex]);
    const email = cellText(row[emailIndex]).toLowerCase();
    const phone = phoneIndex === -1 ? "" : cellText(row[phoneIndex]);

    if (!name && !email) {
      continue;
    }

    if (!name || !EMAIL_PATTERN.test(email)) {
      invalidRows.push(index + 2);
      continue;
    }

    if (!seenEmails.has(email)) {
      seenEmails.add(email);
      students.push(phone ? { name, email, phone } : { name, email });
    }
  }

  if (students.length === 0) {
    if (invalidRows.length > 0) {
      throw new Error(
        `No valid students found. Fix missing names or invalid emails in row${invalidRows.length === 1 ? "" : "s"} ${formatRowList(invalidRows)}, then re-upload.`,
      );
    }
    throw new Error("No valid students were found in the spreadsheet.");
  }

  if (students.length > MAX_STUDENTS) {
    throw new Error(`Import up to ${MAX_STUDENTS} students at a time.`);
  }

  return { students, invalidRows };
}

function ImportStudentsPage() {
  const api = useApi();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const [fileName, setFileName] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [rowWarning, setRowWarning] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  const importStudents = useMutation({
    mutationFn: () =>
      api.post<BulkImportResult>("/users/bulk", {
        students,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["studio-members", STUDIO_ID],
        }),
        queryClient.invalidateQueries({ queryKey: ["student-funnel"] }),
        queryClient.invalidateQueries({ queryKey: ["student-directory"] }),
      ]);
      await navigate({ to: "/app/students" });
    },
  });

  const clearSelection = () => {
    setStudents([]);
    setFileError(null);
    setRowWarning(null);
    setFileName(null);
    importStudents.reset();
  };

  const selectFile = async (files: FileList | null) => {
    const file = files?.[0];

    if (!file) {
      clearSelection();
      return;
    }

    setFileError(null);
    setRowWarning(null);
    setFileName(file.name);
    importStudents.reset();
    setIsReading(true);

    try {
      const result = await parseStudents(file);
      setStudents(result.students);
      if (result.invalidRows.length > 0) {
        setRowWarning(
          `Skipped row${result.invalidRows.length === 1 ? "" : "s"} ${formatRowList(result.invalidRows)} (missing name or invalid email). Fix those rows and re-upload, or import the ${result.students.length} valid student${result.students.length === 1 ? "" : "s"} below.`,
        );
      }
    } catch (error) {
      setStudents([]);
      setRowWarning(null);
      setFileError(
        error instanceof Error
          ? error.message
          : "Unable to read the spreadsheet.",
      );
    } finally {
      setIsReading(false);
    }
  };

  return (
    <>
      <Screen
        title="Import students"
        subtitle='Upload a workbook with "Name" and "Email" columns. Optional "Phone" is imported when present.'
        showBack
        backTo="/app/students"
        paddedCta={students.length > 0}
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

          <TouchButton variant="quiet" fullWidth>
            <a
              href="/templates/student-import-template.xlsx"
              download="student-import-template.xlsx"
            >
              Download template
            </a>
          </TouchButton>

          <p className={staff.panelDesc}>
            Use the template columns Name, Email, and optional Phone. Blank rows
            are ignored. Duplicate emails are skipped. Maximum {MAX_STUDENTS}{" "}
            students per import. After fixing rows, choose the file again to
            refresh the preview.
          </p>

          {fileError ? (
            <Alert variant="danger">
              <AlertTitle>Unable to import this file</AlertTitle>
              <AlertDescription>{fileError}</AlertDescription>
            </Alert>
          ) : null}

          {rowWarning ? (
            <Alert variant="warning">
              <AlertTitle>Some rows were skipped</AlertTitle>
              <AlertDescription>{rowWarning}</AlertDescription>
            </Alert>
          ) : null}

          {importStudents.isError ? (
            <Alert variant="danger">
              <AlertTitle>Import failed</AlertTitle>
              <AlertDescription>
                {importStudents.error instanceof Error
                  ? importStudents.error.message
                  : "Please try again."}
              </AlertDescription>
            </Alert>
          ) : null}

          {students.length > 0 ? (
            <div className={staff.section}>
              <p className={staff.panelTitle}>
                {students.length} students ready
              </p>
              <p className={staff.panelDesc}>Previewing the first five rows</p>
              <div className={staff.list}>
                {students.slice(0, 5).map((student) => (
                  <div key={student.email} className={staff.attentionCard}>
                    <span className={staff.attentionTitle}>{student.name}</span>
                    <p className={staff.attentionMeta}>
                      {student.phone
                        ? `${student.email} · ${student.phone}`
                        : student.email}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Screen>

      {students.length > 0 ? (
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
            isPending={importStudents.isPending}
            onClick={() => importStudents.mutate()}
          >
            Import {students.length} students
          </TouchButton>
        </StickyCtaBar>
      ) : null}
    </>
  );
}
