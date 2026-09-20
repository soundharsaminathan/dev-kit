import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import {
  MarketplaceClassDetailView,
  MarketplaceStudioDetailView,
  MarketplaceTrainerDetailView,
} from "./detail";
import type {
  MarketplaceClassCard,
  MarketplaceClassDetail,
  MarketplaceStudioDetail,
  MarketplaceTrainerCard,
  MarketplaceTrainerDetail,
} from "./types";

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router",
  );
  return {
    ...actual,
    Link: ({
      children,
      to,
      params,
    }: {
      children: React.ReactNode;
      to: string;
      params?: Record<string, string>;
    }) => {
      const href = Object.entries(params ?? {}).reduce(
        (value, [key, next]) => value.replace(`$${key}`, next),
        to,
      );
      return <a href={href}>{children}</a>;
    },
    useNavigate: () => vi.fn(),
  };
});

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
  };
}

function classDetail(): MarketplaceClassDetail {
  return {
    ...classCard(),
    branchId: "branch-1",
    branchName: "T Nagar",
    trainers: [{ id: "trainer-1", slug: "priya", name: "Priya", photoUrl: null }],
    upcomingSessions: [
      {
        sessionId: "session-1",
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        endsAt: new Date(Date.now() + 90000000).toISOString(),
      },
    ],
    plans: [{ name: "Monthly", price: 1500, cadence: "MONTHLY" }],
    canPrivate: false,
    canFloorHire: false,
  };
}

function studioDetail(): MarketplaceStudioDetail {
  return {
    id: "studio-1",
    slug: "rhythm-house",
    name: "Rhythm House",
    primaryCategory: "DANCE",
    categories: ["DANCE"],
    locality: "T Nagar",
    localityId: "t-nagar",
    city: "Chennai",
    cityId: "chennai",
    distanceKm: null,
    coverImageUrl: null,
    rating: { visible: false, label: "New", count: 0 },
    audience: "ADULTS",
    priceFrom: 1500,
    priceCadence: "MONTHLY",
    nextTrialAt: new Date(Date.now() + 86400000).toISOString(),
    classCount: 1,
    styles: ["Hip Hop"],
    canTrial: true,
    canEnroll: true,
    canPrivate: false,
    canFloorHire: true,
    about: "A downtown floor.",
    tagline: "Move more",
    address: "T Nagar, Chennai",
    photos: [],
    branches: [
      {
        id: "branch-1",
        name: "T Nagar",
        address: "T Nagar, Chennai",
        latitude: 13.04,
        longitude: 80.24,
        amenities: ["parking"],
        openingHours: { days: [{ day: 1, open: "10:00", close: "20:00" }] },
        mapsUrl: "https://www.google.com/maps?q=13.04,80.24",
      },
    ],
    classes: [classCard()],
    trainers: [trainerCard()],
  };
}

function trainerCard(): MarketplaceTrainerCard {
  return {
    id: "trainer-1",
    slug: "priya",
    name: "Priya",
    categories: ["DANCE"],
    level: null,
    studioNames: ["Rhythm House"],
    locality: "T Nagar",
    city: "Chennai",
    cityId: "chennai",
    distanceKm: null,
    nextClassAt: new Date(Date.now() + 86400000).toISOString(),
    photoUrl: null,
    rating: { visible: false, label: "New", count: 0 },
    canTrial: true,
    canPrivate: false,
  };
}

function trainerDetail(): MarketplaceTrainerDetail {
  return {
    ...trainerCard(),
    bio: "Hip hop faculty",
    styles: ["Hip Hop"],
    studios: [
      { id: "studio-1", slug: "rhythm-house", name: "Rhythm House", canPrivate: false },
    ],
    classes: [
      {
        id: "class-1",
        slug: "hip-hop-foundations",
        name: "Hip Hop Foundations",
        studioSlug: "rhythm-house",
        studioName: "Rhythm House",
      },
    ],
  };
}

describe("marketplace detail loop", () => {
  it("links class → studio → trainer and trainer → class", () => {
    const { rerender } = renderWithProviders(
      <MarketplaceClassDetailView item={classDetail()} onBook={() => undefined} />,
    );
    expect(screen.getByRole("link", { name: "Rhythm House" })).toHaveAttribute(
      "href",
      "/studios/rhythm-house",
    );
    expect(screen.getByRole("link", { name: "Priya" })).toHaveAttribute(
      "href",
      "/trainers/priya",
    );

    rerender(
      <MarketplaceStudioDetailView
        item={studioDetail()}
        onBook={() => undefined}
        onBookClass={() => undefined}
        onBookTrainer={() => undefined}
      />,
    );
    expect(screen.getByText("Floor hire is available at this studio.")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link").some(
        (link) => link.getAttribute("href") === "/classes/hip-hop-foundations",
      ),
    ).toBe(true);
    expect(
      screen.getAllByRole("link").some(
        (link) => link.getAttribute("href") === "/trainers/priya",
      ),
    ).toBe(true);

    rerender(
      <MarketplaceTrainerDetailView
        item={trainerDetail()}
        onBook={() => undefined}
      />,
    );
    expect(screen.getByRole("link", { name: "Rhythm House" })).toHaveAttribute(
      "href",
      "/studios/rhythm-house",
    );
    expect(
      screen.getByRole("link", { name: /Hip Hop Foundations/ }),
    ).toHaveAttribute("href", "/classes/hip-hop-foundations");
  });

  it("hides class Book when the studio listing has no upcoming session", () => {
    const item = studioDetail();
    item.classes = [{ ...classCard(), nextSessionAt: null, canTrial: false }];
    renderWithProviders(
      <MarketplaceStudioDetailView
        item={item}
        onBook={() => undefined}
        onBookClass={() => undefined}
        onBookTrainer={() => undefined}
      />,
    );
    const listing = screen
      .getByRole("heading", { name: "Hip Hop Foundations" })
      .closest("article");
    expect(listing?.querySelector("button")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Book" }).length).toBeGreaterThan(
      0,
    );
  });
});
