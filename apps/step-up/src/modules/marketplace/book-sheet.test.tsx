import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { BookSheet } from "./book-sheet";
import type { DiscoverTrialSlot } from "@/modules/student-landing/types";
import type { BookSheetTarget } from "./book";

const fetchSlots = vi.hoisted(() => vi.fn());
const fetchClass = vi.hoisted(() => vi.fn());
const fetchStudio = vi.hoisted(() => vi.fn());
const fetchTrainer = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());
const signUp = vi.hoisted(() => vi.fn());
const signInWithGoogle = vi.hoisted(() => vi.fn());
const authUser = vi.hoisted(() => ({ current: null as { id: string } | null }));
const api = vi.hoisted(() => ({
  patch: vi.fn(),
  post: vi.fn(),
  get: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@/lib/api-context", () => ({
  useApi: () => api,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: authUser.current,
    signUp,
    signInWithGoogle,
  }),
}));

vi.mock("@/modules/ui/app-sheet", () => ({
  AppSheet: ({ children, title }: { children: ReactNode; title?: string }) => (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));

vi.mock("@/modules/student-landing/api", () => ({
  fetchDiscoverTrialSlots: (...args: unknown[]) => fetchSlots(...args),
}));

vi.mock("./catalog", () => ({
  fetchMarketplaceClass: (...args: unknown[]) => fetchClass(...args),
  fetchMarketplaceStudio: (...args: unknown[]) => fetchStudio(...args),
  fetchMarketplaceTrainer: (...args: unknown[]) => fetchTrainer(...args),
}));

function slot(overrides: Partial<DiscoverTrialSlot> = {}): DiscoverTrialSlot {
  return {
    sessionId: "session-1",
    batchId: "batch-kids",
    batchName: "Hip hop kids",
    audience: "KIDS",
    classAudience: "KIDS",
    styleBadge: "Hip hop",
    startsAt: "2026-09-21T10:00:00.000Z",
    endsAt: "2026-09-21T11:00:00.000Z",
    ...overrides,
  };
}

function classTarget(): BookSheetTarget {
  return {
    source: "class",
    studioId: "studio-1",
    studioName: "Rhythm House",
    batchId: "batch-adults",
    className: "Hip hop adults",
    audience: "ADULTS",
    canTrial: true,
    canEnroll: true,
    canPrivate: false,
    canFloorHire: false,
  };
}

function renderBook(target: BookSheetTarget) {
  return renderWithProviders(
    <BookSheet open onOpenChange={vi.fn()} target={target} />,
  );
}

describe("BookSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authUser.current = { id: "student-1" };
    api.get.mockResolvedValue([]);
    api.post.mockResolvedValue({ id: "bk-1", status: "PENDING" });
    fetchSlots.mockResolvedValue([
      slot(),
      slot({
        sessionId: "session-2",
        batchId: "batch-adults",
        batchName: "Hip hop adults",
        audience: "ADULTS",
        classAudience: "ADULTS",
        startsAt: "2026-09-21T18:00:00.000Z",
        endsAt: "2026-09-21T19:00:00.000Z",
      }),
    ]);
    fetchClass.mockResolvedValue({
      id: "batch-adults",
      name: "Hip hop adults",
      audience: "ADULTS",
      canTrial: true,
      canEnroll: true,
      plans: [{ id: "plan-1", name: "Monthly", price: 1500, cadence: "MONTHLY" }],
    });
    fetchStudio.mockResolvedValue({
      id: "studio-1",
      name: "Rhythm House",
      canTrial: true,
      canPrivate: true,
      canFloorHire: true,
      branches: [
        { id: "branch-1", name: "T Nagar", address: "T Nagar" },
      ],
      trainers: [
        {
          id: "trainer-1",
          name: "Priya",
          canPrivate: true,
          photoUrl: null,
          locality: "T Nagar",
        },
        {
          id: "trainer-2",
          name: "Arun",
          canPrivate: true,
          photoUrl: null,
          locality: null,
        },
      ],
      privateSessionPaise: null,
      floorHirePaise: 200000,
      privateSessionMinutes: 60,
      floorHireSlotMinutes: 60,
    });
    fetchTrainer.mockResolvedValue({
      id: "trainer-1",
      name: "Priya",
      canPrivate: true,
      studios: [{ id: "studio-1", name: "Rhythm House", canPrivate: true }],
      classes: [],
    });
  });

  it("lists join and hides floor hire from a class card", async () => {
    renderBook(classTarget());
    expect(await screen.findByTestId("marketplace-book-sheet")).toBeVisible();
    expect(screen.getByTestId("book-type-trial")).toBeVisible();
    expect(screen.getByTestId("book-type-join")).toBeVisible();
    expect(screen.queryByTestId("book-type-floor_hire")).not.toBeInTheDocument();
  });

  it("lists floor hire only from studio detail", async () => {
    renderBook({
      source: "studio-detail",
      studioId: "studio-1",
      studioName: "Rhythm House",
      canTrial: true,
      canPrivate: true,
      canFloorHire: true,
    });
    expect(await screen.findByTestId("book-type-floor_hire")).toBeVisible();
    expect(screen.getByTestId("book-type-private")).toBeVisible();
  });

  it("blocks booking a child onto an adults class", async () => {
    renderBook({
      ...classTarget(),
      batchId: "batch-adults",
      className: "Hip hop adults",
      audience: "ADULTS",
    });
    expect(
      await screen.findByRole("button", { name: /Hip hop adults/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Hip hop adults/i }));
    fireEvent.click(screen.getByLabelText("This is for my child"));
    fireEvent.change(screen.getByLabelText("Child first name"), {
      target: { value: "Asha" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Request this trial" }));
    expect(
      await screen.findByText("This class is for adults only"),
    ).toBeVisible();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("lets studio book pick a trainer for private and hides trainers on floor hire", async () => {
    renderBook({
      source: "studio-detail",
      studioId: "studio-1",
      studioName: "Rhythm House",
      canTrial: true,
      canPrivate: true,
      canFloorHire: true,
    });
    fireEvent.click(await screen.findByTestId("book-type-private"));
    expect(await screen.findByTestId("book-trainer-trainer-1")).toBeVisible();
    expect(screen.getByTestId("book-trainer-trainer-2")).toBeVisible();
    fireEvent.click(screen.getByTestId("book-type-floor_hire"));
    expect(screen.queryByTestId("book-trainer-trainer-1")).not.toBeInTheDocument();
  });

  it("does not ask for a trainer when Book started on a trainer", async () => {
    renderBook({
      source: "trainer",
      studioId: "studio-1",
      studioName: "Rhythm House",
      trainerId: "trainer-1",
      trainerName: "Priya",
      canTrial: true,
      canPrivate: true,
      canFloorHire: false,
    });
    fireEvent.click(await screen.findByTestId("book-type-private"));
    expect(screen.queryByTestId("book-trainer-trainer-1")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /T Nagar/ })).toBeVisible();
  });

  it("keeps first-book confirmation in the sheet", async () => {
    renderBook(classTarget());
    expect(
      await screen.findByRole("button", { name: /Hip hop adults/i }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Hip hop adults/i }));
    fireEvent.click(screen.getByRole("button", { name: "Request this trial" }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/bookings",
        expect.objectContaining({
          type: "TRIAL",
          sessionId: "session-2",
          studentId: "student-1",
        }),
      );
    });
    expect(
      (await screen.findAllByRole("heading", { name: "Trial class booked" }))
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "View booking" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Back to home" })).toBeVisible();
    expect(navigate).not.toHaveBeenCalled();
  });
});
