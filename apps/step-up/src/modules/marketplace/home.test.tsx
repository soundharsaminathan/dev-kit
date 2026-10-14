import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { MarketplaceHome } from "./home";
import type { MarketplaceCatalogPage, MarketplaceClassCard } from "./types";

const navigate = vi.hoisted(() => vi.fn());
const fetchClasses = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router",
  );
  return {
    ...actual,
    useNavigate: () => navigate,
    useCanGoBack: () => false,
    useRouter: () => ({
      history: { back: vi.fn() },
      navigate,
    }),
    Link: ({
      children,
      to,
    }: {
      children: React.ReactNode;
      to: string;
    }) => <a href={to}>{children}</a>,
  };
});

vi.mock("./catalog", async () => {
  const actual = await vi.importActual<typeof import("./catalog")>("./catalog");
  return {
    ...actual,
    fetchMarketplaceClasses: (...args: unknown[]) => fetchClasses(...args),
    fetchMarketplaceStudios: vi.fn().mockResolvedValue({
      tab: "studios",
      category: "DANCE",
      city: "chennai",
      sort: "rating",
      empty: { kind: null, message: null },
      items: [],
      pins: [],
    }),
    fetchMarketplaceTrainers: vi.fn(),
    fetchMarketplaceClass: vi.fn(),
    fetchMarketplaceTrainer: vi.fn(),
  };
});

vi.mock("@/modules/layout/public-shell", () => ({
  PublicShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("./book-sheet", () => ({
  BookSheet: ({
    open,
    target,
  }: {
    open: boolean;
    target: { studioName?: string } | null;
  }) => (open ? <div>Trial for {target?.studioName}</div> : null),
}));

vi.mock("./map", () => ({
  MarketplaceMap: ({
    pins,
  }: {
    pins: Array<{ id: string }>;
  }) => <div data-testid="marketplace-map">{pins.length} pins</div>,
}));

function classCard(): MarketplaceClassCard {
  return {
    id: "class-1",
    slug: "hip-hop-foundations",
    name: "Hip Hop Foundations",
    category: "DANCE",
    level: "BEGINNER",
    audience: "ADULTS",
    studioId: "studio-1",
    studioSlug: "rhythm-house",
    studioName: "Rhythm House",
    trainerId: "trainer-1",
    trainerSlug: "priya",
    trainerName: "Priya",
    locality: "T Nagar",
    localityId: "t-nagar",
    city: "Chennai",
    cityId: "chennai",
    distanceKm: null,
    scheduleLabel: "Tue, Thu · 18:00",
    nextSessionAt: new Date(Date.now() + 86400000).toISOString(),
    availableSeats: 8,
    seatLabel: null,
    priceFrom: 1500,
    priceCadence: "MONTHLY",
    coverImageUrl: "https://cdn.example/class.jpg",
    styles: ["Hip Hop"],
    studioRating: { visible: false, label: "New", count: 0 },
    trainerRating: { visible: false, label: "New", count: 0 },
    canTrial: true,
    canEnroll: true,
    viewerEnrolled: null,
    viewerTrialBooked: null,
    viewerForChild: null,
  };
}

function classPage(
  items: MarketplaceClassCard[],
): MarketplaceCatalogPage<MarketplaceClassCard> {
  return {
    tab: "classes",
    category: "DANCE",
    city: "chennai",
    sort: "availability",
    empty: { kind: null, message: null },
    items,
    pins: items.length
      ? [
          {
            id: "branch-1",
            lat: 13.04,
            lng: 80.25,
            label: "Rhythm House",
            area: "T Nagar",
            itemIds: items.map((item) => item.id),
          },
        ]
      : [],
  };
}

describe("MarketplaceHome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchClasses.mockResolvedValue(classPage([classCard()]));
  });

  it("first-paints Dance classes and opens trial from Book", async () => {
    renderWithProviders(
      <MarketplaceHome
        tab="classes"
        search={{ category: "DANCE", city: "chennai" }}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Dance classes in Chennai" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dance" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Classes" })).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Map" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(screen.getByRole("button", { name: "Music" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fitness" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Art" })).toBeInTheDocument();
    expect(
      screen.getByLabelText("Search class, studio, or trainer"),
    ).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "Book" }));
    expect(await screen.findByText("Trial for Rhythm House")).toBeInTheDocument();
  });

  it("shows Music even when that tab is empty", async () => {
    fetchClasses.mockResolvedValue({
      ...classPage([]),
      category: "MUSIC",
      empty: {
        kind: "category",
        message: "Music classes in Chennai are coming soon.",
      },
    });

    renderWithProviders(
      <MarketplaceHome
        tab="classes"
        search={{ category: "MUSIC", city: "chennai" }}
      />,
    );

    expect(
      await screen.findByText("Music classes in Chennai are coming soon."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Browse by style")).not.toBeInTheDocument();
    expect(screen.queryByText("Browse by area")).not.toBeInTheDocument();
  });

  it("keeps the same marketplace IA inside Discover", async () => {
    fetchClasses.mockResolvedValue(
      classPage([
        {
          ...classCard(),
          viewerEnrolled: true,
          viewerTrialBooked: true,
          viewerForChild: true,
        },
      ]),
    );

    renderWithProviders(
      <MarketplaceHome
        tab="classes"
        search={{ category: "DANCE", city: "chennai" }}
        variant="member"
      />,
    );

    expect(
      await screen.findByRole("heading", { name: /^discover$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Classes" })).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(screen.getByRole("button", { name: "Studios" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trainers" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dance" })).toBeInTheDocument();
    expect(
      screen.getByLabelText("Search class, studio, or trainer"),
    ).toBeInTheDocument();
    expect(await screen.findByText("Enrolled")).toBeInTheDocument();
    expect(screen.getByText("Trial booked")).toBeInTheDocument();
    expect(screen.getByText("Your child")).toBeInTheDocument();
    expect(
      screen.getByText("Dance classes in Chennai"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Map" })).toBeInTheDocument();
  });

  it("keeps list and map on the same result set", async () => {
    renderWithProviders(
      <MarketplaceHome
        tab="classes"
        search={{ category: "DANCE", city: "chennai", view: "map" }}
      />,
    );

    expect(await screen.findByTestId("marketplace-map")).toHaveTextContent(
      "1 pins",
    );
    expect(await screen.findByRole("button", { name: "Book" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "List" }));
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        search: expect.objectContaining({ view: "list" }),
      }),
    );
  });

  it("titles a style place and moves Area onto an SEO path", async () => {
    renderWithProviders(
      <MarketplaceHome
        tab="classes"
        search={{ category: "DANCE", city: "chennai", style: "hip-hop" }}
        place={{ kind: "style", id: "hip-hop", label: "Hip Hop" }}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Hip Hop classes in Chennai" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Area" }));
    fireEvent.click(await screen.findByRole("button", { name: "Adyar" }));
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/$city/$place",
        params: { city: "chennai", place: "adyar" },
      }),
    );
  });

  it("opens map from the time rail without leaving the inventory IA", async () => {
    renderWithProviders(
      <MarketplaceHome
        tab="classes"
        search={{ category: "DANCE", city: "chennai" }}
      />,
    );

    await screen.findByRole("heading", { name: "Dance classes in Chennai" });
    fireEvent.click(screen.getByRole("button", { name: "Map" }));
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        search: expect.objectContaining({ view: "map" }),
      }),
    );
  });
});
