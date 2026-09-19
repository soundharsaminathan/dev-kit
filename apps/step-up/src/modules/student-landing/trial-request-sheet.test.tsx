import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { TrialRequestSheet } from "./trial-request-sheet";
import type { DiscoverTrialSlot } from "./types";

const fetchSlots = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());
const signUp = vi.hoisted(() => vi.fn());
const signInWithGoogle = vi.hoisted(() => vi.fn());
const authUser = vi.hoisted(() => ({ current: null as { id: string } | null }));
const api = vi.hoisted(() => ({
  patch: vi.fn(),
  post: vi.fn(),
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

vi.mock("./api", () => ({
  fetchDiscoverTrialSlots: (...args: unknown[]) => fetchSlots(...args),
}));

function slot(overrides: Partial<DiscoverTrialSlot> = {}): DiscoverTrialSlot {
  return {
    sessionId: "session-1",
    batchId: "batch-kids",
    batchName: "Hip hop kids",
    audience: "KIDS",
    styleBadge: "Hip hop",
    startsAt: "2026-09-21T10:00:00.000Z",
    endsAt: "2026-09-21T11:00:00.000Z",
    ...overrides,
  };
}

function renderSheet(batchId?: string | null) {
  return renderWithProviders(
    <TrialRequestSheet
      open
      onOpenChange={vi.fn()}
      studioId="studio-1"
      studioName="Rhythm House"
      batchId={batchId}
    />,
  );
}

function pickKidsSlot() {
  fireEvent.click(screen.getByRole("button", { name: /Hip hop kids/i }));
}

describe("TrialRequestSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authUser.current = null;
    fetchSlots.mockResolvedValue([
      slot(),
      slot({
        sessionId: "session-2",
        batchId: "batch-adults",
        batchName: "Hip hop adults",
        audience: "ADULTS",
        startsAt: "2026-09-21T18:00:00.000Z",
        endsAt: "2026-09-21T19:00:00.000Z",
      }),
    ]);
  });

  it("keeps register off the first step until a slot is chosen", async () => {
    renderSheet();

    expect(await screen.findByText("Hip hop kids")).toBeInTheDocument();
    expect(screen.getByText("Hip hop adults")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Book a trial" })).toBeVisible();
    expect(screen.queryByLabelText("Your name")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Phone")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Pick a trial slot")).toBeVisible();
    expect(screen.queryByLabelText("Your name")).not.toBeInTheDocument();

    pickKidsSlot();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByRole("heading", { name: "Register" }),
    ).toBeVisible();
    expect(screen.getByLabelText(/Your name/)).toBeVisible();
    expect(screen.getByLabelText(/^Phone/)).toBeVisible();
    expect(screen.getByLabelText(/^Email/)).toBeVisible();
    expect(screen.queryByText("Pick a slot")).not.toBeInTheDocument();
  });

  it("filters slots to the batch from a class card", async () => {
    renderSheet("batch-kids");

    expect(
      await screen.findByRole("button", { name: /Hip hop kids/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Hip hop adults/i }),
    ).not.toBeInTheDocument();
  });

  it("returns to the session step from register", async () => {
    renderSheet();
    await screen.findByText("Hip hop kids");
    pickKidsSlot();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      await screen.findByRole("heading", { name: "Register" }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(
      await screen.findByRole("heading", { name: "Book a trial" }),
    ).toBeVisible();
    expect(screen.getByText("Pick a slot")).toBeVisible();
    expect(screen.queryByLabelText("Your name")).not.toBeInTheDocument();
  });

  it("lets a guest finish register after picking a slot", async () => {
    signUp.mockResolvedValue({ id: "student-1", studioId: "studio-1" });
    api.patch.mockResolvedValue({});
    api.post.mockResolvedValue({});
    const onOpenChange = vi.fn();

    renderWithProviders(
      <TrialRequestSheet
        open
        onOpenChange={onOpenChange}
        studioId="studio-1"
        studioName="Rhythm House"
      />,
    );

    await screen.findByText("Hip hop kids");
    pickKidsSlot();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByLabelText(/Your name/);

    fireEvent.change(screen.getByLabelText(/Your name/), {
      target: { value: "Asha Rao" },
    });
    fireEvent.change(screen.getByLabelText(/^Phone/), {
      target: { value: "9876543210" },
    });
    fireEvent.change(screen.getByLabelText(/^Email/), {
      target: { value: "asha@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Password/), {
      target: { value: "secret1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Request this trial" }));

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith(
        "asha@example.com",
        "secret1",
        "Asha Rao",
        { studioId: "studio-1" },
      );
      expect(api.post).toHaveBeenCalledWith("/bookings", {
        studioId: "studio-1",
        studentId: "student-1",
        type: "TRIAL",
        sessionId: "session-1",
        notes: "Phone: 9876543210",
      });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
