import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { defaultHours } from "@/modules/locations/location-edit-draft";
import type { StudioBranch } from "@/modules/locations/types";
import { renderWithProviders } from "@/test/render";
import { EMPTY_PROFILE_VALUES } from "./studio-profile-model";
import { StudioProfileWorkspace } from "./studio-profile-workspace";
import type { Studio } from "./types";

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
}));

vi.mock("@/modules/locations/branch-map", () => ({
  BranchMap: () => <div data-testid="studio-map">Map</div>,
}));

vi.mock("@/modules/branding/branding-panel", () => ({
  BrandingPanel: () => <div>Branding</div>,
}));

vi.mock("./use-studio-dance-styles", () => ({
  useStudioDanceStyles: () => ({
    styles: [],
    isDirty: false,
    busy: false,
    addStyle: vi.fn(),
    removeStyle: vi.fn(),
    moveStyle: vi.fn(),
    updateStyle: vi.fn(),
    reset: vi.fn(),
    save: vi.fn(),
    studioQuery: { isLoading: false, isError: false, data: null },
  }),
}));

const studio: Studio = {
  id: "st_1",
  name: "4D-Flo",
  address: "Chennai, Tamil Nadu",
  contact: "+916374655394",
  logoUrl: null,
  tagline: "Dance. Learn. Grow.",
  about: "A short note about the floor.",
  foundedYear: 2018,
  email: "hello@4flo.in",
  settings: {
    graceDays: 0,
    expireAlertDays: 0,
    platformFeePercent: 0,
    gstPercent: 0,
    admissionFee: 0,
    timezone: "Asia/Kolkata",
    danceStyles: [],
  },
};

const branch: StudioBranch = {
  id: "br_1",
  studioId: "st_1",
  name: "4D-Flo",
  address: "Chennai, Tamil Nadu",
  latitude: 13.08,
  longitude: 80.27,
  description: null,
  coverMediaId: null,
  coverMedia: null,
  amenities: ["parking", "ac", "wifi"],
  openingHours: defaultHours(),
  pricingBlurb: null,
  media: [],
  faqs: [],
  testimonials: [],
};

describe("StudioProfileWorkspace", () => {
  it("renders grouped editing cards and a student preview", () => {
    renderWithProviders(
      <StudioProfileWorkspace
        studio={studio}
        branch={branch}
        values={{
          ...EMPTY_PROFILE_VALUES,
          name: "4D-Flo",
          tagline: "Dance. Learn. Grow.",
          about: "A short note about the floor.",
          address: "Chennai, Tamil Nadu",
          contact: "+916374655394",
        }}
        coordinates={{ latitude: 13.08, longitude: 80.27 }}
        setField={vi.fn()}
        onCoordinatesChange={vi.fn()}
        resolveMapLink={async (url) => url}
        isDirty
        isPending={false}
        isOwner
        onSave={vi.fn()}
        onDiscard={vi.fn()}
        completion={{
          percent: 50,
          items: [
            { id: "basic", label: "Basic information", done: true },
            { id: "contact", label: "Contact information", done: true },
            { id: "address", label: "Address", done: true },
            { id: "styles", label: "Dance styles", done: true },
            { id: "branding", label: "Branding", done: false },
            { id: "gallery", label: "Gallery", done: false },
            { id: "faqs", label: "FAQs", done: false },
            { id: "testimonials", label: "Testimonials", done: false },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Basic information" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Contact information" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "First class" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Studio address" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("studio-profile-preview")).toHaveTextContent(
      "4D-Flo",
    );
    expect(screen.getByTestId("studio-profile-preview")).toHaveTextContent(
      "Chennai, Tamil Nadu",
    );
    expect(screen.getByText("Additional details")).toBeInTheDocument();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(
      screen.getByText("Your profile hasn't been saved."),
    ).toBeInTheDocument();
  });
});
