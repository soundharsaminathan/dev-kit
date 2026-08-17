import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { LeadDetailSheet } from "./lead-detail-sheet";
import type { Lead, LeadRemark } from "./types";

const get = vi.fn();
const post = vi.fn();
const toast = vi.hoisted(() => vi.fn());

vi.mock("@dev-ui/components/toast", () => ({
  useToastContext: () => ({ toast }),
}));

vi.mock("@/lib/api-context", () => ({
  useApi: () => ({ get, post }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: {
      id: "staff-1",
      email: "staff@example.com",
      name: "Staff Member",
      role: "STAFF",
      studioId: "studio-1",
    },
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

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    name: "Asha Rao",
    phone: "+91 91234 56789",
    photoUrl: null,
    ageRange: "TWENTY_TO_FORTY",
    createdAt: "2026-08-01T10:00:00.000Z",
    active: true,
    section: "new",
    lastFollowupAt: null,
    trialBooking: null,
    ...overrides,
  };
}

function remark(overrides: Partial<LeadRemark> = {}): LeadRemark {
  return {
    id: "r-1",
    body: "Called, no answer",
    createdAt: "2026-08-10T10:00:00.000Z",
    author: { id: "staff-1", name: "Staff Member" },
    ...overrides,
  };
}

describe("LeadDetailSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    get.mockResolvedValue([]);
  });

  it("archives from the header button", async () => {
    const onArchive = vi.fn();
    const row = lead();
    renderWithProviders(
      <LeadDetailSheet
        lead={row}
        studioId="studio-1"
        onOpenChange={vi.fn()}
        onArchive={onArchive}
        onUnarchive={vi.fn()}
      />,
    );

    await waitFor(() => expect(get).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId("lead-archive-lead-1"));
    expect(onArchive).toHaveBeenCalledWith(row);
  });

  it("unarchives an archived lead", async () => {
    const onUnarchive = vi.fn();
    const row = lead({ active: false, section: "archived" });
    renderWithProviders(
      <LeadDetailSheet
        lead={row}
        studioId="studio-1"
        onOpenChange={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={onUnarchive}
      />,
    );

    await waitFor(() => expect(get).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId("lead-unarchive-lead-1"));
    expect(onUnarchive).toHaveBeenCalledWith(row);
  });

  it("shows the phone number in the header", async () => {
    renderWithProviders(
      <LeadDetailSheet
        lead={lead({ phone: "+91 98765 43210" })}
        studioId="studio-1"
        onOpenChange={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
      />,
    );

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(screen.getByText("+91 98765 43210")).toBeInTheDocument();
  });

  it("posts a remark, showing it instantly before the API responds", async () => {
    get.mockResolvedValue([remark()]);
    let resolvePost: (value: LeadRemark) => void = () => undefined;
    post.mockImplementation(
      () =>
        new Promise<LeadRemark>((resolve) => {
          resolvePost = resolve;
        }),
    );

    renderWithProviders(
      <LeadDetailSheet
        lead={lead()}
        studioId="studio-1"
        onOpenChange={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Called, no answer")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("lead-remark-input"), {
      target: { value: "Will visit Saturday" },
    });
    fireEvent.click(screen.getByTestId("lead-remark-send"));

    await waitFor(() => {
      expect(screen.getByText("Will visit Saturday")).toBeInTheDocument();
    });
    expect(screen.getByTestId("lead-remark-input")).toHaveValue("");
    expect(screen.getAllByText("Staff Member")).toHaveLength(2);

    resolvePost(remark({ id: "r-2", body: "Will visit Saturday" }));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        "/users/studio/studio-1/leads/lead-1/remarks",
        { body: "Will visit Saturday" },
      );
    });
  });

  it("removes the optimistic remark and toasts when posting fails", async () => {
    get.mockResolvedValue([remark()]);
    let rejectPost: (reason: Error) => void = () => undefined;
    post.mockImplementation(
      () =>
        new Promise<LeadRemark>((_resolve, reject) => {
          rejectPost = reject;
        }),
    );

    renderWithProviders(
      <LeadDetailSheet
        lead={lead()}
        studioId="studio-1"
        onOpenChange={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Called, no answer")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("lead-remark-input"), {
      target: { value: "Will visit Saturday" },
    });
    fireEvent.click(screen.getByTestId("lead-remark-send"));

    await waitFor(() => {
      expect(screen.getByText("Will visit Saturday")).toBeInTheDocument();
    });

    rejectPost(new Error("Network error"));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Couldn’t add remark",
          variant: "error",
        }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("Will visit Saturday")).not.toBeInTheDocument();
    });
  });
});
