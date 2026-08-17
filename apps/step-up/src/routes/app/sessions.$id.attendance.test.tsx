import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AttendanceRosterEntry } from "@/modules/attendance/types";
import { createTestQueryClient, renderWithProviders } from "@/test/render";
import { Route } from "./sessions.$id.attendance";

const toastMock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());
const apiPostMock = vi.hoisted(() => vi.fn());
const apiPatchMock = vi.hoisted(() => vi.fn());

vi.mock("@dev-ui/components/toast", () => ({
  useToastContext: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/api-context", () => ({
  useApi: () => ({
    get: apiGetMock,
    post: apiPostMock,
    patch: apiPatchMock,
  }),
}));

vi.mock("@/lib/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "trainer-1",
      name: "Lead Trainer",
      email: "trainer@example.com",
      role: "TRAINER",
      studioId: "studio-1",
    },
  }),
}));

vi.mock("@/modules/trainers/use-trainers", () => ({
  useStudioTrainers: () => ({
    data: [{ id: "trainer-1", name: "Lead Trainer" }],
    isLoading: false,
  }),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

Route.useParams = (() => ({ id: "session-1" })) as typeof Route.useParams;

const mockSession = {
  id: "session-1",
  batchId: "batch-1",
  startsAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago (marking is open)
  endsAt: new Date(Date.now() + 55 * 60 * 1000).toISOString(),
  status: "SCHEDULED" as const,
  batch: {
    name: "Hip Hop Beginners",
  },
};

const mockRoster: AttendanceRosterEntry[] = [
  {
    studentId: "student-1",
    student: { name: "Ada Lovelace", email: "ada@example.com" },
    attendance: null,
  },
  {
    studentId: "student-2",
    student: { name: "Grace Hopper", email: "grace@example.com" },
    attendance: null,
  },
];

describe("SessionAttendancePage optimistic updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    apiGetMock.mockImplementation((url: string) => {
      if (url === "/sessions/session-1") {
        return Promise.resolve(mockSession);
      }
      if (url === "/attendance/session/session-1/roster") {
        return Promise.resolve(structuredClone(mockRoster));
      }
      return Promise.reject(new Error(`Unhandled GET: ${url}`));
    });
  });

  it("shows a roster skeleton while session and roster load", async () => {
    apiGetMock.mockImplementation(
      () =>
        new Promise(() => {
          // Never resolves while the skeleton should be visible.
        }),
    );

    const queryClient = createTestQueryClient();
    const PageComponent = Route.options.component!;
    renderWithProviders(<PageComponent />, { queryClient });

    await waitFor(() => {
      expect(screen.getByTestId("attendance-skeleton")).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("attendance-roster-search"),
    ).not.toBeInTheDocument();
  });

  it("optimistically marks student present and retains state on success", async () => {
    let resolvePost: (value: unknown) => void;
    apiPostMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        }),
    );

    const queryClient = createTestQueryClient();
    const PageComponent = Route.options.component!;
    renderWithProviders(<PageComponent />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    });

    const presentBtn = screen.getByTestId("mark-present-student-1");
    expect(presentBtn).toBeInTheDocument();
    expect(presentBtn).toHaveAttribute("aria-pressed", "false");

    // Click present
    fireEvent.click(presentBtn);

    // Immediately updates UI optimistically before API response
    await waitFor(() => {
      expect(presentBtn).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("mark-attendance-student-1")).toHaveAttribute(
        "data-status",
        "present",
      );
    });

    // Resolve API call
    resolvePost!({ id: "att-1", status: "PRESENT", source: "TRAINER" });

    await waitFor(() => {
      expect(presentBtn).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("optimistically marks student present, reverts on API error, and displays toast", async () => {
    let rejectPost: (error: Error) => void;
    apiPostMock.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectPost = reject;
        }),
    );

    const queryClient = createTestQueryClient();
    const PageComponent = Route.options.component!;
    renderWithProviders(<PageComponent />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    });

    const presentBtn = screen.getByTestId("mark-present-student-1");
    expect(presentBtn).toBeInTheDocument();
    expect(presentBtn).toHaveAttribute("aria-pressed", "false");

    // Click present
    fireEvent.click(presentBtn);

    // Immediately shows present optimistically while API is in-flight
    await waitFor(() => {
      expect(presentBtn).toHaveAttribute("aria-pressed", "true");
    });

    // API fails
    rejectPost!(new Error("Network connection lost"));

    // Reverts to original status and shows toast
    await waitFor(() => {
      expect(presentBtn).toHaveAttribute("aria-pressed", "false");
    });

    expect(screen.getByTestId("mark-attendance-student-1")).toHaveAttribute(
      "data-status",
      "unmarked",
    );

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Couldn’t mark attendance",
        description: "Network connection lost",
        variant: "error",
      }),
    );
  });

  it("optimistically marks all present, reverts on API error, and shows toast", async () => {
    let rejectPost: (error: Error) => void;
    apiPostMock.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectPost = reject;
        }),
    );

    const queryClient = createTestQueryClient();
    const PageComponent = Route.options.component!;
    renderWithProviders(<PageComponent />, { queryClient });

    await waitFor(() => {
      expect(screen.getByTestId("mark-all-present")).toBeInTheDocument();
    });

    const markAllBtn = screen.getByTestId("mark-all-present");
    fireEvent.click(markAllBtn);

    // Immediately all students are marked present while API is in-flight
    await waitFor(() => {
      expect(screen.getByTestId("mark-present-student-1")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByTestId("mark-present-student-2")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    // API fails
    rejectPost!(new Error("Server error"));

    // Reverts both students and shows toast
    await waitFor(() => {
      expect(screen.getByTestId("mark-present-student-1")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(screen.getByTestId("mark-present-student-2")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Couldn’t mark all present",
        description: "Server error",
        variant: "error",
      }),
    );
  });

  it("optimistically marks student absent, reverts on API error, and displays toast", async () => {
    let rejectPost: (error: Error) => void;
    apiPostMock.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectPost = reject;
        }),
    );

    const queryClient = createTestQueryClient();
    const PageComponent = Route.options.component!;
    renderWithProviders(<PageComponent />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    });

    const absentBtn = screen.getByTestId("mark-absent-student-1");
    expect(absentBtn).toHaveAttribute("aria-pressed", "false");

    // Click absent
    fireEvent.click(absentBtn);

    // Immediately shows absent optimistically while API is in-flight
    await waitFor(() => {
      expect(absentBtn).toHaveAttribute("aria-pressed", "true");
    });

    // API fails
    rejectPost!(new Error("Failed to mark absent"));

    // Reverts to original status and shows toast
    await waitFor(() => {
      expect(absentBtn).toHaveAttribute("aria-pressed", "false");
    });

    expect(screen.getByTestId("mark-attendance-student-1")).toHaveAttribute(
      "data-status",
      "unmarked",
    );

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Couldn’t mark attendance",
        description: "Failed to mark absent",
        variant: "error",
      }),
    );
  });

  it("optimistically marks selected students, reverts on error, and shows toast", async () => {
    let rejectPost: (error: Error) => void;
    apiPostMock.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectPost = reject;
        }),
    );

    const queryClient = createTestQueryClient();
    const PageComponent = Route.options.component!;
    renderWithProviders(<PageComponent />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    });

    // Select Ada Lovelace
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Ada Lovelace" }),
    );

    const bulkPresentBtn = screen.getByTestId("bulk-mark-present");
    fireEvent.click(bulkPresentBtn);

    // Optimistically marked present
    await waitFor(() => {
      expect(screen.getByTestId("mark-present-student-1")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    // API fails
    rejectPost!(new Error("Batch operation failed"));

    // Reverts on error
    await waitFor(() => {
      expect(screen.getByTestId("mark-present-student-1")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Couldn’t mark selected",
        description: "Could not mark selected students present.",
        variant: "error",
      }),
    );
  });

  it("rolls back only the failed student when concurrent marks occur", async () => {
    let liveRoster = structuredClone(mockRoster);
    apiGetMock.mockImplementation((url: string) => {
      if (url === "/sessions/session-1") {
        return Promise.resolve(mockSession);
      }
      if (url === "/attendance/session/session-1/roster") {
        return Promise.resolve(structuredClone(liveRoster));
      }
      return Promise.reject(new Error(`Unhandled GET: ${url}`));
    });

    const postDeferred: Record<
      string,
      { resolve: () => void; reject: (err: Error) => void }
    > = {};

    apiPostMock.mockImplementation(
      (url: string, body: { studentId: string }) => {
        if (url === "/attendance/mark") {
          return new Promise((resolve, reject) => {
            postDeferred[body.studentId] = {
              resolve: () => {
                liveRoster = liveRoster.map((entry) =>
                  entry.studentId === body.studentId
                    ? {
                        ...entry,
                        attendance: {
                          id: `att-${body.studentId}`,
                          status: "PRESENT" as const,
                          source: "TRAINER" as const,
                        },
                      }
                    : entry,
                );
                resolve({
                  id: `att-${body.studentId}`,
                  status: "PRESENT",
                  source: "TRAINER",
                });
              },
              reject,
            };
          });
        }
        return Promise.reject(new Error("Unexpected endpoint"));
      },
    );

    const queryClient = createTestQueryClient();
    const PageComponent = Route.options.component!;
    renderWithProviders(<PageComponent />, { queryClient });

    await waitFor(() => {
      expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    });

    // Mark student 1 present
    fireEvent.click(screen.getByTestId("mark-present-student-1"));
    await waitFor(() => {
      expect(screen.getByTestId("mark-present-student-1")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    // Mark student 2 present
    fireEvent.click(screen.getByTestId("mark-present-student-2"));
    await waitFor(() => {
      expect(screen.getByTestId("mark-present-student-2")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    // Student 1 succeeds
    postDeferred["student-1"]?.resolve();

    // Student 2 fails
    postDeferred["student-2"]?.reject(new Error("Student 2 mark failed"));

    // Student 2 should revert, student 1 should remain present
    await waitFor(() => {
      expect(screen.getByTestId("mark-present-student-2")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });

    expect(screen.getByTestId("mark-present-student-1")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Couldn’t mark attendance",
        description: "Student 2 mark failed",
        variant: "error",
      }),
    );
  });
});
