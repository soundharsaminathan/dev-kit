import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient, renderWithProviders } from "@/test/render";
import { BatchRoster } from "./batch-roster";

const toastMock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());
const apiPostMock = vi.hoisted(() => vi.fn());

vi.mock("@dev-ui/components/toast", () => ({
  useToastContext: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/api-context", () => ({
  useApi: () => ({
    get: apiGetMock,
    post: apiPostMock,
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

const emptyHeader = {
  id: "batch-1",
  capacity: 20,
  active: true,
  enrollmentCount: 0,
  remainingSeats: 20,
  plans: [],
  sessions: [],
};

describe("BatchRoster loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a roster skeleton on the active tab while enrollments load", async () => {
    apiGetMock.mockImplementation(
      () =>
        new Promise(() => {
          // Never resolves while the skeleton should be visible.
        }),
    );

    renderWithProviders(
      <BatchRoster batchId="batch-1" capacity={20} active />,
      { queryClient: createTestQueryClient() },
    );

    expect(
      await screen.findByRole("status", { name: "Loading roster" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("No students enrolled")).not.toBeInTheDocument();
  });

  it("shows empty state on the active tab after enrollments load with no students", async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url === "/batches/batch-1") {
        return Promise.resolve(emptyHeader);
      }
      if (url.startsWith("/batches/batch-1/roster")) {
        return Promise.resolve({ items: [], nextCursor: null, limit: 25 });
      }
      return Promise.reject(new Error(`Unhandled GET: ${url}`));
    });

    renderWithProviders(
      <BatchRoster batchId="batch-1" capacity={20} active />,
      { queryClient: createTestQueryClient() },
    );

    expect(await screen.findByText("No students enrolled")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByRole("status", { name: "Loading roster" }),
      ).not.toBeInTheDocument();
    });
  });
});
