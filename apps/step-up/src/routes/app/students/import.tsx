import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";
import { FileTrigger } from "@dev-ui/components/file-trigger";
import { useToastContext } from "@dev-ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { readSheet } from "read-excel-file/browser";
import { useApi } from "@/lib/api-context";
import { requireAdmin } from "@/lib/require-auth";
import { useStudioId } from "@/lib/use-studio-id";
import {
  formatStudentImportRowList,
  parseStudentImportRows,
  STUDENT_IMPORT_MAX,
  type StudentImportRow,
} from "@/modules/students/parse-student-import";
import { Screen } from "@/modules/ui/screen";
import staff from "@/modules/ui/staff.module.scss";
import { StickyCtaBar, TouchButton } from "@/modules/ui/touch-button";

type BulkImportResult = {
  created: number;
  skipped: number;
};

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
  const studioId = useStudioId();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { toast } = useToastContext("ImportStudentsPage");
  const [fileName, setFileName] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentImportRow[]>([]);
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
          queryKey: ["studio-members", studioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["student-funnel", studioId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["student-directory", studioId],
        }),
      ]);
      toast({
        title: "Students imported",
        description: "Spreadsheet import completed.",
        variant: "success",
      });
      await navigate({ to: "/app/students" });
    },
    onError: (error: unknown) => {
      toast({
        title: "Couldn’t import students",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      });
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
      const rows = await readSheet(file);
      const result = parseStudentImportRows(rows);
      setStudents(result.students);
      if (result.invalidRows.length > 0) {
        setRowWarning(
          `Skipped row${result.invalidRows.length === 1 ? "" : "s"} ${formatStudentImportRowList(result.invalidRows)} (missing name, invalid email, gender, or age range). Fix those rows and re-upload, or import the ${result.students.length} valid student${result.students.length === 1 ? "" : "s"} below.`,
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
        subtitle='Upload a workbook with "Name", "Email", "Gender", and "Age Range" columns.'
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
            Use the template columns Name, Email, Gender (Female/Male), and Age
            Range (Under 10, 10–20, 20–40, 40+). Blank rows are ignored.
            Duplicate emails are skipped. Maximum {STUDENT_IMPORT_MAX} students
            per import. After fixing rows, choose the file again to refresh the
            preview.
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
                      {student.email} · {student.gender} · {student.ageRange}
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
