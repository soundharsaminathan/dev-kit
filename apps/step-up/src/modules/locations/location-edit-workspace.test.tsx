import { fireEvent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { defaultHours } from "./location-edit-draft";
import { LocationEditWorkspace } from "./location-edit-workspace";
import type { StudioBranch } from "./types";

vi.mock("@dev-ui/components/toast", () => ({
  useToastContext: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/api-context", () => ({
  useApi: () => ({
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useCanGoBack: () => false,
  useRouter: () => ({
    history: { back: vi.fn() },
    navigate: vi.fn(),
  }),
}));

vi.mock("./branch-map", () => ({
  BranchMap: () => <div data-testid="branch-map">Map</div>,
}));

vi.mock("./media-manager", () => ({
  MediaManager: () => <div data-testid="media-manager">Gallery</div>,
}));

const branch: StudioBranch = {
  id: "br_1",
  studioId: "st_1",
  name: "Casagrand Supremus",
  address: "OMR, Chennai",
  latitude: 12.9,
  longitude: 80.2,
  description: "Spacious studios for every level.",
  coverMediaId: null,
  coverMedia: null,
  amenities: ["parking", "wifi"],
  openingHours: defaultHours(),
  pricingBlurb: null,
  faqs: [],
  testimonials: [],
  media: [],
};

describe("LocationEditWorkspace", () => {
  it("renders the configure and preview workspace", () => {
    renderWithProviders(<LocationEditWorkspace branch={branch} />);

    expect(
      screen.getAllByRole("heading", { name: "Location details" })[0],
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Amenities" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Opening hours" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Public profile" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("location-edit-preview")).toHaveTextContent(
      "Casagrand Supremus",
    );
    expect(screen.getByTestId("location-edit-preview")).toHaveTextContent(
      "OMR, Chennai",
    );
    expect(screen.getByRole("progressbar")).toHaveAccessibleName(
      "Profile completion",
    );
    expect(screen.getByRole("tab", { name: "Membership" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Photos" })).toBeInTheDocument();
  });

  it("shows unsaved changes and live preview after an edit", () => {
    renderWithProviders(<LocationEditWorkspace branch={branch} />);

    const name = screen.getByLabelText(/Name/);
    fireEvent.change(name, { target: { value: "Casagrand OMR" } });

    expect(screen.getAllByText("Unsaved changes").length).toBeGreaterThan(0);
    expect(screen.getByTestId("location-edit-preview")).toHaveTextContent(
      "Casagrand OMR",
    );
    expect(screen.getByTestId("location-edit-save")).toBeEnabled();
  });

  it("keeps save disabled when the map pin is missing", () => {
    renderWithProviders(
      <LocationEditWorkspace
        branch={{ ...branch, latitude: null, longitude: null }}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: "Casagrand OMR" },
    });

    expect(screen.getByTestId("location-edit-save")).toBeDisabled();
  });
});
