import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AttendanceRosterEntry } from "@/modules/attendance/types";
import { createTestQueryClient, renderWithProviders } from "@/test/render";
import { Route } from "./sessions.$id.attendance";

const toastMock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());
const apiPostMock = vi.hoisted(() => vi.fn());
const apiPatchMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());
const authUserMock = vi.hoisted(() => ({
  current: {
    id: "trainer-1",
    name: "Lead Trainer",
    email: "trainer@example.com",
    role: "TRAINER",
    studioId: "studio-1",
  },
}));
const studioTrainersMock = vi.hoisted(() => ({
  current: [
    { id: "trainer-1", name: "Lead Trainer" },
    { id: "trainer-2", name: "Second Trainer" },
  ],
}));

const TRAINER_AUTH = {
  id: "trainer-1",
  name: "Lead Trainer",
  email: "trainer@example.com",
  role: "TRAINER",
  studioId: "studio-1",
};

const OWNER_AUTH = {
  id: "owner-1",
  name: "Studio Owner",
  email: "owner@example.com",
  role: "OWNER",
  studioId: "studio-1",
};

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
    user: authUserMock.current,
  }),
}));

vi.mock("@/modules/trainers/use-trainers", () => ({
  useStudioTrainers: () => ({
    data: studioTrainersMock.current,
    isLoading: false,
  }),
}));

vi.mock("@/modules/ui/app-sheet", () => ({
  AppSheet: ({
    children,
    isOpen,
    title,
  }: {
    children: ReactNode;
    isOpen: boolean;
    title?: string;
  }) =>
    isOpen ? (
      <div>
        {title ? <h2>{title}</h2> : null}
        {children}
      </div>
    ) : null,
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
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
    trainers: [{ trainerId: "trainer-1", sortOrder: 0 }],
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

function renderAttendancePage() {
  const queryClient = createTestQueryClient();
  const PageComponent = Route.options.component!;
  renderWithProviders(<PageComponent />, { queryClient });
}

function mockAttendanceGets(
  overrides: {
    session?: typeof mockSession;
    roster?: AttendanceRosterEntry[];
    batchSessions?: Array<{ id: string; startsAt: string }>;
  } = {},
) {
  apiGetMock.mockImplementation((url: string) => {
    if (url === "/sessions/session-1") {
      return Promise.resolve(overrides.session ?? mockSession);
    }
    if (url === "/attendance/session/session-1/roster") {
      return Promise.resolve(structuredClone(overrides.roster ?? mockRoster));
    }
    if (url === "/sessions/batch/batch-1") {
      return Promise.resolve(overrides.batchSessions ?? [mockSession]);
    }
    return Promise.reject(new Error(`Unhandled GET: ${url}`));
  });
}

async function openCompleteSessionSheet() {
  await waitFor(() => {
    expect(screen.getByTestId("complete-session")).toBeInTheDocument();
  });
  fireEvent.click(screen.getByTestId("complete-session"));
  await waitFor(() => {
    expect(screen.getByTestId("confirm-complete-session")).toBeInTheDocument();
  });
}

describe("SessionAttendancePage optimistic updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authUserMock.current = { ...TRAINER_AUTH };
    studioTrainersMock.current = [
      { id: "trainer-1", name: "Lead Trainer" },
      { id: "trainer-2", name: "Second Trainer" },
    ];

    mockAttendanceGets();
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
      if (url === "/sessions/batch/batch-1") {
        return Promise.resolve([mockSession]);
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

describe("SessionAttendancePage complete session trainer picker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authUserMock.current = { ...OWNER_AUTH };
    studioTrainersMock.current = [
      { id: "trainer-1", name: "Lead Trainer" },
      { id: "trainer-2", name: "Second Trainer" },
    ];
    apiPatchMock.mockResolvedValue({
      id: "session-1",
      status: "COMPLETED",
      trainerId: "trainer-1",
    });

    mockAttendanceGets();
  });

  it("skips instructor selection when the batch has one trainer", async () => {
    renderAttendancePage();
    await openCompleteSessionSheet();

    expect(screen.queryByTestId("complete-session-trainer")).toBeNull();

    fireEvent.click(screen.getByTestId("confirm-complete-session"));

    await waitFor(() => {
      expect(apiPatchMock).toHaveBeenCalledWith(
        "/sessions/session-1/complete",
        {
          trainerId: "trainer-1",
        },
      );
    });
  });

  it("still asks staff to pick an instructor when the batch has multiple trainers", async () => {
    mockAttendanceGets({
      session: {
        ...mockSession,
        batch: {
          name: "Hip Hop Beginners",
          trainers: [
            { trainerId: "trainer-1", sortOrder: 0 },
            { trainerId: "trainer-2", sortOrder: 1 },
          ],
        },
      },
    });

    renderAttendancePage();
    await openCompleteSessionSheet();

    expect(screen.getByTestId("complete-session-trainer")).toBeInTheDocument();
  });

  it("keeps complete disabled until staff pick a trainer when the batch has none", async () => {
    mockAttendanceGets({
      session: {
        ...mockSession,
        batch: { name: "Hip Hop Beginners", trainers: [] },
      },
    });

    renderAttendancePage();
    await openCompleteSessionSheet();

    expect(screen.getByTestId("complete-session-trainer")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-complete-session")).toBeDisabled();
    expect(apiPatchMock).not.toHaveBeenCalled();
  });
});

describe("SessionAttendancePage session pager", () => {
  const previousSession = {
    id: "session-0",
    startsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  const nextSession = {
    id: "session-2",
    startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authUserMock.current = { ...TRAINER_AUTH };
    studioTrainersMock.current = [
      { id: "trainer-1", name: "Lead Trainer" },
      { id: "trainer-2", name: "Second Trainer" },
    ];
  });

  it("places prev and next controls beside the session attendance title", async () => {
    mockAttendanceGets({
      batchSessions: [previousSession, mockSession, nextSession],
    });
    renderAttendancePage();

    const title = await screen.findByRole("heading", {
      name: "Session attendance",
    });
    const prev = await screen.findByTestId("prev-session");
    const next = await screen.findByTestId("next-session");
    expect(
      title.compareDocumentPosition(prev) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      prev.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("navigates to the next session in the batch", async () => {
    mockAttendanceGets({
      batchSessions: [previousSession, mockSession, nextSession],
    });
    renderAttendancePage();

    await waitFor(() => {
      expect(screen.getByTestId("next-session")).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId("next-session"));

    expect(navigateMock).toHaveBeenCalledWith({
      to: "/app/sessions/$id/attendance",
      params: { id: "session-2" },
    });
  });

  it("navigates to the previous session in the batch", async () => {
    mockAttendanceGets({
      batchSessions: [previousSession, mockSession, nextSession],
    });
    renderAttendancePage();

    await waitFor(() => {
      expect(screen.getByTestId("prev-session")).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId("prev-session"));

    expect(navigateMock).toHaveBeenCalledWith({
      to: "/app/sessions/$id/attendance",
      params: { id: "session-0" },
    });
  });

  it("disables previous on the first session", async () => {
    mockAttendanceGets({
      batchSessions: [mockSession, nextSession],
    });
    renderAttendancePage();

    await waitFor(() => {
      expect(screen.getByTestId("next-session")).not.toBeDisabled();
    });
    expect(screen.getByTestId("prev-session")).toBeDisabled();
    fireEvent.click(screen.getByTestId("prev-session"));
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("disables next on the last session", async () => {
    mockAttendanceGets({
      batchSessions: [previousSession, mockSession],
    });
    renderAttendancePage();

    await waitFor(() => {
      expect(screen.getByTestId("prev-session")).not.toBeDisabled();
    });
    expect(screen.getByTestId("next-session")).toBeDisabled();
    fireEvent.click(screen.getByTestId("next-session"));
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
