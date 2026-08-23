import { useToastContext } from "@dev-ui/components/toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useApi } from "@/lib/api-context";
import { useStudioId } from "@/lib/use-studio-id";
import {
  computeImportProgress,
  type ImportJobSnapshot,
} from "@/modules/import/import-types";

const STORAGE_KEY = "step-up-active-import";

type StoredImportJob = {
  studioId: string;
  jobId: string;
  batchName: string | null;
  fileName: string | null;
};

type ImportJobContextValue = {
  job: ImportJobSnapshot | null;
  batchName: string | null;
  fileName: string | null;
  percent: number;
  isActive: boolean;
  isComplete: boolean;
  isFailed: boolean;
  trackImport: (input: {
    jobId: string;
    batchName: string | null;
    fileName: string | null;
  }) => void;
  clearImport: () => void;
};

const ImportJobContext = createContext<ImportJobContextValue | null>(null);

function readStoredImport(studioId: string): StoredImportJob | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredImportJob;
    return parsed.studioId === studioId ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredImport(value: StoredImportJob | null) {
  try {
    if (!value) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore local storage failures.
  }
}

export function ImportJobProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const studioId = useStudioId();
  const queryClient = useQueryClient();
  const { toast } = useToastContext("ImportJobProvider");
  const [trackedJobId, setTrackedJobId] = useState<string | null>(null);
  const [batchName, setBatchName] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const completionNotifiedRef = useRef<string | null>(null);

  useEffect(() => {
    const stored = readStoredImport(studioId);
    if (stored) {
      setTrackedJobId(stored.jobId);
      setBatchName(stored.batchName);
      setFileName(stored.fileName);
    }
  }, [studioId]);

  const activeJobQuery = useQuery({
    queryKey: ["import-job-active", studioId],
    queryFn: () => api.get<ImportJobSnapshot | null>("/import/jobs/active"),
    refetchInterval: (query) => {
      const job = query.state.data;
      if (!job) {
        return false;
      }
      if (job.status === "PENDING" || job.status === "RUNNING") {
        return 750;
      }
      return false;
    },
  });

  useEffect(() => {
    if (trackedJobId || !activeJobQuery.data) {
      return;
    }
    if (
      activeJobQuery.data.status === "PENDING" ||
      activeJobQuery.data.status === "RUNNING"
    ) {
      setTrackedJobId(activeJobQuery.data.id);
      setBatchName(activeJobQuery.data.batchName);
      writeStoredImport({
        studioId,
        jobId: activeJobQuery.data.id,
        batchName: activeJobQuery.data.batchName,
        fileName: null,
      });
    }
  }, [activeJobQuery.data, studioId, trackedJobId]);

  const trackedJobQuery = useQuery({
    queryKey: ["import-job", studioId, trackedJobId],
    queryFn: () => api.get<ImportJobSnapshot>(`/import/jobs/${trackedJobId}`),
    enabled: Boolean(trackedJobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "PENDING" || status === "RUNNING") {
        return 750;
      }
      return false;
    },
  });

  const job =
    trackedJobId && trackedJobQuery.data
      ? trackedJobQuery.data
      : activeJobQuery.data;

  const isActive = job?.status === "PENDING" || job?.status === "RUNNING";
  const isComplete = job?.status === "SUCCEEDED";
  const isFailed = job?.status === "FAILED";
  const percent = job
    ? isComplete
      ? 100
      : computeImportProgress(job.entities).percent
    : 0;

  const trackImport = useCallback(
    (input: {
      jobId: string;
      batchName: string | null;
      fileName: string | null;
    }) => {
      completionNotifiedRef.current = null;
      setTrackedJobId(input.jobId);
      setBatchName(input.batchName);
      setFileName(input.fileName);
      writeStoredImport({
        studioId,
        jobId: input.jobId,
        batchName: input.batchName,
        fileName: input.fileName,
      });
      void queryClient.invalidateQueries({
        queryKey: ["import-job", studioId, input.jobId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["import-job-active", studioId],
      });
    },
    [queryClient, studioId],
  );

  const clearImport = useCallback(() => {
    completionNotifiedRef.current = null;
    setTrackedJobId(null);
    setBatchName(null);
    setFileName(null);
    writeStoredImport(null);
    void queryClient.removeQueries({ queryKey: ["import-job-active", studioId] });
  }, [queryClient, studioId]);

  useEffect(() => {
    if (!job || !isComplete) {
      return;
    }
    if (completionNotifiedRef.current === job.id) {
      return;
    }
    completionNotifiedRef.current = job.id;
    const resolvedBatchName = job.batchName ?? batchName;
    toast({
      title: "Import complete",
      description: resolvedBatchName
        ? `${resolvedBatchName} data has been imported successfully.`
        : "Your studio data has been imported successfully.",
    });
    void queryClient.invalidateQueries({ queryKey: ["studio-members"] });
    void queryClient.invalidateQueries({ queryKey: ["student-funnel"] });
    void queryClient.invalidateQueries({ queryKey: ["student-directory"] });
    void queryClient.invalidateQueries({ queryKey: ["batches"] });
    void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    writeStoredImport(null);
    const timer = window.setTimeout(() => {
      setTrackedJobId(null);
      setBatchName(null);
      setFileName(null);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [batchName, isComplete, job, queryClient, toast]);

  const value = useMemo(
    () => ({
      job: job ?? null,
      batchName: job?.batchName ?? batchName,
      fileName,
      percent,
      isActive,
      isComplete,
      isFailed,
      trackImport,
      clearImport,
    }),
    [
      batchName,
      clearImport,
      fileName,
      isActive,
      isComplete,
      isFailed,
      job,
      percent,
      trackImport,
    ],
  );

  return (
    <ImportJobContext.Provider value={value}>
      {children}
    </ImportJobContext.Provider>
  );
}

export function useImportJob() {
  const context = useContext(ImportJobContext);
  if (!context) {
    throw new Error("useImportJob must be used within ImportJobProvider");
  }
  return context;
}
