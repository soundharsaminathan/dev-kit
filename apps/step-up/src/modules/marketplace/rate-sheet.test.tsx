import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { RateSheet } from "./rate-sheet";
import type { MarketplaceRatingPrompt } from "./rate";

const api = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock("@/lib/api-context", () => ({
  useApi: () => api,
}));

vi.mock("@/modules/ui/app-sheet", () => ({
  AppSheet: ({ children, title }: { children: ReactNode; title?: string }) => (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));

const prompt: MarketplaceRatingPrompt = {
  studentId: "student-1",
  studentName: "Asha",
  target: "STUDIO",
  studioId: "studio-1",
  studioName: "E-Grade",
  trainerId: null,
  trainerName: null,
  category: "DANCE",
  source: "CLASS",
  attendedAt: "2026-09-18T10:00:00.000Z",
  className: "Adults Advance",
};

describe("RateSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockResolvedValue({ id: "rate-1", rating: 5 });
  });

  it("does not submit until stars are picked", async () => {
    renderWithProviders(
      <RateSheet open onOpenChange={vi.fn()} prompt={prompt} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit rating" }));
    expect(
      await screen.findByText("Pick 1 to 5 stars"),
    ).toBeVisible();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("posts the visit category", async () => {
    renderWithProviders(
      <RateSheet open onOpenChange={vi.fn()} prompt={prompt} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "5 stars" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit rating" }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/discover/ratings",
        expect.objectContaining({
          category: "DANCE",
          target: "STUDIO",
          rating: 5,
          studentId: "student-1",
        }),
      );
    });
    expect(await screen.findByText("Stars saved")).toBeVisible();
  });
});
