import { Alert, AlertDescription, AlertTitle } from "@dev-ui/components/alert";
import { FileTrigger } from "@dev-ui/components/file-trigger";
import { Icon } from "@dev-ui/icons";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/use-auth";
import { AppSheet } from "@/modules/ui/app-sheet";
import { TouchButton } from "@/modules/ui/touch-button";
import { ImportEntityRow } from "./import-entity-row";
import { ImportSegmentedProgress } from "./import-segmented-progress";
import {
  computeImportProgress,
  IMPORT_ENTITY_KEYS,
  type ImportEntityKey,
  type ImportJobSnapshot,
  totalImportCreated,
  totalImportSkipped,
} from "./import-types";
import type { ParseStudioImportResult } from "./parse-studio-import";
import { formatImportRowList } from "./parse-studio-import";
import styles from "./import-workspace.module.scss";

export type ImportWorkspacePhase =
  | "upload"
  | "analyze"
  | "create"
  | "complete"
  | "failed";

type SheetCounts = Record<ImportEntityKey, number>;

type InvalidRowsByEntity = Record<ImportEntityKey, number[]>;

const SHEET_LABELS: Record<ImportEntityKey, string> = {
  students: "Students",
  locations: "Locations",
  batches: "Batches",
  sessions: "Sessions",
  enrollments: "Enrollments",
  invoices: "Invoices & payments",
  attendance: "Attendance",
};

type ImportHistoryEntry = {
  id: string;
  fileName: string;
  startedAt: string;
  status: ImportJobSnapshot["status"];
};

const IMPORT_HISTORY_KEY = "step-up-import-history";

export type ImportWorkspaceMode = "studio" | "students";

type ImportWorkspaceProps = {
  mode?: ImportWorkspaceMode;
  phase: ImportWorkspacePhase;
  fileName: string | null;
  result: ParseStudioImportResult;
  fileError: string | null;
  isReading: boolean;
  startError: string | null;
  job: ImportJobSnapshot | null;
  isStarting: boolean;
  precheckErrors?: string[];
  isPrechecking?: boolean;
  onSelectFile: (files: FileList | null) => void;
  onStartImport: () => void;
  onCancelImport: () => void;
  onImportAnother: () => void;
};

function firstName(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return "there";
  }
  return trimmed.split(/\s+/)[0] ?? "there";
}

function buildCounts(result: ParseStudioImportResult): SheetCounts {
  return {
    students: result.students.length,
    locations: result.locations.length,
    batches: result.batches.length,
    sessions: result.sessions.length,
    enrollments: result.enrollments.length,
    invoices: result.invoices.length,
    attendance: result.attendance.length,
  };
}

function buildInvalidRows(result: ParseStudioImportResult): InvalidRowsByEntity {
  return {
    students: result.studentsInvalidRows,
    locations: result.locationsInvalidRows,
    batches: result.batchesInvalidRows,
    sessions: result.sessionsInvalidRows,
    enrollments: result.enrollmentsInvalidRows,
    invoices: result.invoicesInvalidRows,
    attendance: result.attendanceInvalidRows,
  };
}

function invalidRowSummaryForEntity(
  entityKey: ImportEntityKey,
  invalidRows: number[],
): string | null {
  if (invalidRows.length === 0) {
    return null;
  }
  return `${SHEET_LABELS[entityKey]}: skipped rows ${formatImportRowList(invalidRows)}`;
}

function readImportHistory(): ImportHistoryEntry[] {
  try {
    const raw = localStorage.getItem(IMPORT_HISTORY_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ImportHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function downloadSkippedRows(result: ParseStudioImportResult) {
  const invalidRows = buildInvalidRows(result);
  const lines: string[] = ["classa import — skipped rows", ""];
  for (const key of IMPORT_ENTITY_KEYS) {
    const rows = invalidRows[key];
    if (rows.length > 0) {
      lines.push(`${SHEET_LABELS[key]}: ${formatImportRowList(rows)}`);
    }
  }
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "skipped-import-rows.txt";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ImportWorkspace({
  mode = "studio",
  phase,
  fileName,
  result,
  fileError,
  isReading,
  startError,
  job,
  isStarting,
  precheckErrors = [],
  isPrechecking = false,
  onSelectFile,
  onStartImport,
  onCancelImport,
  onImportAnother,
}: ImportWorkspaceProps) {
  const { user } = useAuth();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const entityKeys: readonly ImportEntityKey[] =
    mode === "students" ? ["students"] : IMPORT_ENTITY_KEYS;
  const templateHref =
    mode === "students"
      ? "/templates/student-import-template.xlsx"
      : "/templates/studio-import-template.xlsx";
  const templateDownload =
    mode === "students"
      ? "student-import-template.xlsx"
      : "studio-import-template.xlsx";

  const counts = useMemo(() => buildCounts(result), [result]);
  const invalidRows = useMemo(() => buildInvalidRows(result), [result]);
  const totalRecords = useMemo(
    () => entityKeys.reduce((sum, key) => sum + counts[key], 0),
    [counts, entityKeys],
  );
  const totalInvalid = useMemo(
    () =>
      entityKeys.reduce((sum, key) => sum + invalidRows[key].length, 0),
    [invalidRows, entityKeys],
  );
  const hasBlockingErrors =
    mode === "studio"
      ? result.crossSheetErrors.length > 0 || precheckErrors.length > 0
      : false;
  const canStartImport = totalRecords > 0 && !hasBlockingErrors;
  const showEntityList =
    phase === "analyze" ||
    phase === "create" ||
    phase === "complete" ||
    phase === "failed";
  const jobDone = phase === "complete" || phase === "failed";
  const isImporting = phase === "create";
  const progress = job
    ? computeImportProgress(job.entities, entityKeys)
    : { percent: 0, completedCount: 0, totalEntities: entityKeys.length };
  const createdTotal = job ? totalImportCreated(job.entities) : 0;
  const skippedTotal = job ? totalImportSkipped(job.entities) : 0;
  const history = readImportHistory();

  const pageTitle =
    phase === "complete"
      ? "Import complete 🎉"
      : phase === "failed"
        ? "Import failed"
        : mode === "students"
          ? "Import students"
          : "Import studio data";

  const pageSubtitle =
    phase === "complete"
      ? mode === "students"
        ? "Students have been imported successfully."
        : "Your studio data has been imported successfully."
      : phase === "failed"
        ? "Some records could not be created. Review the details below."
        : null;

  const cardGreeting =
    phase === "complete"
      ? null
      : phase === "failed"
        ? "Import interrupted"
        : isImporting
          ? `Hello ${firstName(user?.name)}! 👋`
          : phase === "analyze"
            ? "Workbook validated"
            : null;

  const cardMessage =
    phase === "complete"
      ? null
      : phase === "failed"
        ? job?.error ??
          (mode === "students"
            ? "Something went wrong while importing students."
            : "Something went wrong while creating studio data.")
        : isImporting
          ? mode === "students"
            ? "We're importing your students. This may take a few minutes."
            : "We're importing your studio data. This may take a few minutes."
          : phase === "analyze"
            ? mode === "students"
              ? `${totalRecords.toLocaleString("en-IN")} students are ready to import.`
              : `${totalRecords.toLocaleString("en-IN")} records are ready to import across ${entityKeys.length} data sets.`
            : null;

  const showProgress =
    isImporting || phase === "complete" || (phase === "failed" && Boolean(job));

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {!isImporting ? (
          <header className={styles.pageHeader}>
            <div className={styles.pageHeaderTop}>
              <div className={styles.pageHeaderCopy}>
                <h1 className={styles.pageTitle}>{pageTitle}</h1>
                {pageSubtitle ? (
                  <p className={styles.pageSubtitle}>{pageSubtitle}</p>
                ) : null}
              </div>
            </div>
            <div className={styles.pageActions}>
              <button
                type="button"
                className={styles.outlineButton}
                onClick={() => setHistoryOpen(true)}
              >
                <Icon name="clock" aria-hidden />
                Import history
              </button>
              <a
                className={styles.outlineButton}
                href={templateHref}
                download={templateDownload}
              >
                <Icon name="download" aria-hidden />
                Download template
              </a>
            </div>
          </header>
        ) : null}

        <div className={styles.workspace}>
          <div className={styles.workspaceInner}>
            {cardGreeting ? (
              <div className={styles.cardHeader}>
                <h2 className={styles.cardGreeting}>{cardGreeting}</h2>
                {cardMessage ? (
                  <p className={styles.cardMessage}>{cardMessage}</p>
                ) : null}
              </div>
            ) : null}

            {phase === "upload" && !fileName ? (
              <FileTrigger
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onSelect={(files) => onSelectFile(files)}
              >
                <div className={styles.uploadZone}>
                  <span className={styles.uploadIcon} aria-hidden>
                    <Icon name="upload" />
                  </span>
                  <p className={styles.uploadTitle}>
                    Drop your Excel workbook here
                  </p>
                  <p className={styles.uploadHint}>or Browse files</p>
                  <p className={styles.uploadExt}>.xlsx · One workbook per batch</p>
                </div>
              </FileTrigger>
            ) : null}

            {fileName && phase !== "upload" && !isImporting ? (
              <div className={styles.fileSummary}>
                <span className={styles.fileSummaryIcon} aria-hidden>
                  <Icon name="file" />
                </span>
                <div className={styles.fileSummaryCopy}>
                  <p className={styles.fileSummaryName}>{fileName}</p>
                  <p className={styles.fileSummaryMeta}>
                    {isReading || isPrechecking
                      ? "Reading workbook…"
                      : totalRecords > 0
                        ? `${totalRecords.toLocaleString("en-IN")} records validated`
                        : "No valid records found"}
                    {totalInvalid > 0
                      ? ` · ${totalInvalid.toLocaleString("en-IN")} rows skipped`
                      : ""}
                  </p>
                </div>
                {!isImporting && phase !== "complete" ? (
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => onSelectFile(null)}
                  >
                    Change
                  </button>
                ) : null}
              </div>
            ) : null}

            {phase === "upload" && fileName ? (
              <div className={styles.fileSummary}>
                <span className={styles.fileSummaryIcon} aria-hidden>
                  <Icon name="file" />
                </span>
                <div className={styles.fileSummaryCopy}>
                  <p className={styles.fileSummaryName}>{fileName}</p>
                  <p className={styles.fileSummaryMeta}>
                    {isReading ? "Reading workbook…" : "Processing workbook…"}
                  </p>
                </div>
              </div>
            ) : null}

            <div className={styles.alerts}>
              {fileError ? (
                <Alert variant="danger">
                  <AlertTitle>Unable to read this file</AlertTitle>
                  <AlertDescription>{fileError}</AlertDescription>
                </Alert>
              ) : null}

              {result.crossSheetErrors.map((message) => (
                <Alert key={message} variant="danger">
                  <AlertTitle>Fix before importing</AlertTitle>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              ))}

              {precheckErrors.map((message) => (
                <Alert key={message} variant="danger">
                  <AlertTitle>Fix before importing</AlertTitle>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              ))}

              {Object.entries(result.sheetErrors).map(([kind, message]) => (
                <Alert key={kind} variant="warning">
                  <AlertTitle>
                    {SHEET_LABELS[kind as ImportEntityKey]} sheet skipped
                  </AlertTitle>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              ))}

              {phase === "analyze" &&
              fileName &&
              totalRecords === 0 &&
              !hasBlockingErrors ? (
                <Alert variant="warning">
                  <AlertTitle>No records ready to import</AlertTitle>
                  <AlertDescription>
                    No valid rows were found. Add sheets with the template headers
                    and fill in at least one row.
                  </AlertDescription>
                </Alert>
              ) : null}

              {startError ? (
                <Alert variant="danger">
                  <AlertTitle>Import failed to start</AlertTitle>
                  <AlertDescription>{startError}</AlertDescription>
                </Alert>
              ) : null}

              {phase === "failed" && job?.error ? (
                <Alert variant="danger">
                  <AlertTitle>Import failed</AlertTitle>
                  <AlertDescription>{job.error}</AlertDescription>
                </Alert>
              ) : null}
            </div>

            {showProgress ? (
              <ImportSegmentedProgress
                percent={phase === "complete" ? 100 : progress.percent}
                completedCount={
                  phase === "complete"
                    ? progress.totalEntities
                    : progress.completedCount
                }
                totalEntities={progress.totalEntities}
              />
            ) : null}

            {showEntityList ? (
              <div className={styles.entityList}>
                {entityKeys.map((entityKey) => (
                  <ImportEntityRow
                    key={entityKey}
                    entityKey={entityKey}
                    mode={job ? "live" : "preview"}
                    recordCount={counts[entityKey]}
                    invalidRowCount={invalidRows[entityKey].length}
                    invalidRowSummary={invalidRowSummaryForEntity(
                      entityKey,
                      invalidRows[entityKey],
                    )}
                    {...(job ? { entity: job.entities[entityKey] } : {})}
                    jobDone={jobDone}
                    errorMessage={
                      phase === "failed" &&
                      job?.entities[entityKey].status === "failed"
                        ? job.error
                        : null
                    }
                  />
                ))}
              </div>
            ) : null}

            {phase === "complete" ? (
              <p className={styles.summaryLine}>
                {createdTotal.toLocaleString("en-IN")} records created
                {skippedTotal > 0
                  ? ` · ${skippedTotal.toLocaleString("en-IN")} rows skipped`
                  : ""}
              </p>
            ) : null}
          </div>

          <footer className={styles.footer}>
            {isImporting ? (
              <>
                <div className={styles.footerTop}>
                  <span className={styles.footerNote}>
                    <Icon name="info" aria-hidden />
                    Do not close this page while import is in progress.
                  </span>
                  {job?.id ? (
                    <span className={styles.footerMeta}>
                      Import ID: {job.id.slice(0, 8).toUpperCase()}
                    </span>
                  ) : null}
                </div>
                <div className={styles.footerActionsRow}>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => setCancelConfirm(true)}
                  >
                    <Icon name="trash" aria-hidden />
                    Cancel import
                  </button>
                  <TouchButton variant="quiet" isDisabled>
                    Please wait…
                  </TouchButton>
                </div>
              </>
            ) : null}

            {phase === "analyze" && canStartImport ? (
              <div className={styles.footerActions}>
                <TouchButton
                  variant="primary"
                  fullWidth
                  isPending={isStarting}
                  onClick={onStartImport}
                >
                  Start import
                </TouchButton>
              </div>
            ) : null}

            {phase === "complete" ? (
              <div className={styles.footerOutlineActions}>
                {totalInvalid > 0 || skippedTotal > 0 ? (
                  <button
                    type="button"
                    className={styles.outlineButton}
                    onClick={() => {
                      if (totalInvalid > 0) {
                        downloadSkippedRows(result);
                        return;
                      }
                      if (job) {
                        const lines = IMPORT_ENTITY_KEYS.flatMap((key) => {
                          const skipped = job.entities[key].skipped;
                          return skipped > 0
                            ? [`${SHEET_LABELS[key]}: ${skipped} skipped`]
                            : [];
                        });
                        const content = [
                          "classa import — skipped records",
                          "",
                          ...lines,
                        ].join("\n");
                        const blob = new Blob([content], {
                          type: "text/plain;charset=utf-8",
                        });
                        const url = URL.createObjectURL(blob);
                        const anchor = document.createElement("a");
                        anchor.href = url;
                        anchor.download = "skipped-import-records.txt";
                        anchor.click();
                        URL.revokeObjectURL(url);
                      }
                    }}
                  >
                    View skipped records
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.outlineButton}
                  onClick={onImportAnother}
                >
                  Import another workbook
                </button>
              </div>
            ) : null}

            {phase === "failed" ? (
              <div className={styles.footerActions}>
                <TouchButton
                  variant="quiet"
                  fullWidth
                  onClick={() => onCancelImport()}
                >
                  Back to review
                </TouchButton>
              </div>
            ) : null}
          </footer>
        </div>
      </div>

      <AppSheet
        isOpen={historyOpen}
        onOpenChange={setHistoryOpen}
        title="Import history"
      >
        {history.length === 0 ? (
          <p className={styles.historyEmpty}>
            Past imports from this browser will appear here.
          </p>
        ) : (
          <div className={styles.historyList}>
            {history.map((entry) => (
              <div key={entry.id} className={styles.historyItem}>
                <span className={styles.historyItemTitle}>{entry.fileName}</span>
                <span className={styles.historyItemMeta}>
                  {new Date(entry.startedAt).toLocaleString("en-IN")} ·{" "}
                  {entry.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </AppSheet>

      <AppSheet
        isOpen={cancelConfirm}
        onOpenChange={setCancelConfirm}
        title="Cancel import?"
      >
        <p className={styles.historyEmpty}>
          The import will keep running on the server. You can return later, but
          progress on this page will be lost.
        </p>
        <div className={styles.footerActions}>
          <TouchButton variant="quiet" onClick={() => setCancelConfirm(false)}>
            Keep importing
          </TouchButton>
          <TouchButton
            variant="danger"
            onClick={() => {
              setCancelConfirm(false);
              onCancelImport();
            }}
          >
            Cancel import
          </TouchButton>
        </div>
      </AppSheet>
    </div>
  );
}
