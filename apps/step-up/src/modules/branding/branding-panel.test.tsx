import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrandingPanel } from "./branding-panel";

const patch = vi.fn();

vi.mock("@dev-ui/components/toast", () => ({
  useToastContext: () => ({ toast: vi.fn() }),
}));

vi.mock("@dev-ui/icons", () => ({
  Icon: ({ name }: { name: string }) => <span data-icon={name} />,
}));

vi.mock("@/lib/api-context", () => ({
  useApi: () => ({
    patch,
  }),
}));

vi.mock("@/lib/use-studio-id", () => ({
  useStudioId: () => "studio-seed-1",
  useOptionalStudioId: () => "studio-seed-1",
}));

vi.mock("@/modules/social/upload", () => ({
  uploadSocialPhoto: vi.fn(),
}));

vi.mock("@/modules/ui/image-crop-sheet", () => ({
  ImageCropSheet: () => null,
}));

vi.mock("@/modules/ui/touch-button", () => ({
  TouchButton: ({
    children,
    onClick,
    isPending,
    isDisabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    isPending?: boolean;
    isDisabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={isPending || isDisabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/modules/ui/states", () => ({
  ErrorState: ({ description }: { description: string }) => (
    <p>{description}</p>
  ),
}));

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("BrandingPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    patch.mockResolvedValue({});
  });

  it("shows logo and hero uploads without theme controls", () => {
    render(
      <Wrapper>
        <BrandingPanel studioName="Acme Dance" />
      </Wrapper>,
    );

    expect(screen.getByRole("button", { name: "Upload logo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Upload mobile" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Upload desktop" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save theme" })).toBeNull();
  });
});
