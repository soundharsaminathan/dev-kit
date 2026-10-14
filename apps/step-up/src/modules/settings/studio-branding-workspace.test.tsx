import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { StudioBrandingWorkspace } from "./studio-branding-workspace";
import type { Studio } from "./types";

vi.mock("@dev-ui/components/toast", () => ({
  useToastContext: () => ({ toast: vi.fn() }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@/modules/ui/image-crop-sheet", () => ({
  ImageCropSheet: () => null,
}));

vi.mock("@/modules/branding/use-studio-branding", () => ({
  useStudioBranding: () => ({
    logoError: null,
    heroError: null,
    pendingCrop: null,
    cropConfig: { aspect: 4, cropShape: "rect" as const, title: "Crop logo" },
    cropBusy: false,
    openCrop: vi.fn(),
    handleCropDone: vi.fn(),
    cancelCrop: vi.fn(),
    uploadLogoPending: false,
    removeLogoPending: false,
    removeLogo: vi.fn(),
    heroUploadingSlot: null,
    heroRemovingSlot: null,
    removeHero: vi.fn(),
  }),
}));

const studio: Studio = {
  id: "st_1",
  name: "4D-Flo",
  address: "Chennai, Tamil Nadu",
  contact: "+916374655394",
  logoUrl: "https://cdn.example/logo.png",
  heroMobileUrl: "https://cdn.example/mobile.jpg",
  heroDesktopUrl: null,
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

describe("StudioBrandingWorkspace", () => {
  it("renders logo and hero cards with a member home preview", () => {
    renderWithProviders(<StudioBrandingWorkspace studio={studio} />);

    expect(screen.getByRole("heading", { name: "Logo" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Member home hero" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Replace logo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Replace mobile" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Upload desktop" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("studio-branding-preview")).toHaveTextContent(
      "4D-Flo",
    );
    expect(screen.getByText("Branding completion")).toBeInTheDocument();
    expect(screen.getByText("Where this appears")).toBeInTheDocument();
  });
});
