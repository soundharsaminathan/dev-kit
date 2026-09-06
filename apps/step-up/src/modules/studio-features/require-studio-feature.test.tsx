import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { RequireStudioFeature } from "./require-studio-feature";

const useStudioFeaturesMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/studio-features", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/studio-features")>();
  return {
    ...actual,
    useStudioFeatures: useStudioFeaturesMock,
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useCanGoBack: () => false,
    useRouter: () => ({
      history: { back: vi.fn() },
      navigate: vi.fn(),
    }),
  };
});

describe("RequireStudioFeature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a single heading when the module is disabled", async () => {
    useStudioFeaturesMock.mockReturnValue({
      isLoading: false,
      isPending: false,
      data: {
        features: [{ key: "bookings", enabled: false }],
      },
    });

    renderWithProviders(
      <RequireStudioFeature feature="bookings">
        <p>Bookings content</p>
      </RequireStudioFeature>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: "Feature unavailable",
          level: 1,
        }),
      ).toBeVisible();
    });
    expect(
      screen.getAllByRole("heading", { name: "Feature unavailable" }),
    ).toHaveLength(1);
    expect(screen.queryByText("Bookings content")).not.toBeInTheDocument();
    expect(
      screen.getByText(/this module is not enabled for your studio/i),
    ).toBeVisible();
  });

  it("renders children when the module is enabled", () => {
    useStudioFeaturesMock.mockReturnValue({
      isLoading: false,
      isPending: false,
      data: {
        features: [{ key: "bookings", enabled: true }],
      },
    });

    renderWithProviders(
      <RequireStudioFeature feature="bookings">
        <p>Bookings content</p>
      </RequireStudioFeature>,
    );

    expect(screen.getByText("Bookings content")).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Feature unavailable" }),
    ).not.toBeInTheDocument();
  });

  it("uses EmptyTitle as the heading when Screen is not wrapped", () => {
    useStudioFeaturesMock.mockReturnValue({
      isLoading: false,
      isPending: false,
      data: {
        features: [{ key: "bookings", enabled: false }],
      },
    });

    renderWithProviders(
      <RequireStudioFeature feature="bookings" wrapScreen={false}>
        <p>Bookings content</p>
      </RequireStudioFeature>,
    );

    expect(
      screen.getByRole("heading", { name: "Feature unavailable", level: 2 }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Feature unavailable", level: 1 }),
    ).not.toBeInTheDocument();
  });
});
