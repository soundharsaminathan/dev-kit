import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { BranchMap } from "./branch-map";

vi.mock("leaflet/dist/leaflet.css", () => ({}));
vi.mock("leaflet", () => ({
  default: {
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn(),
      },
    },
  },
}));
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  Marker: () => null,
  TileLayer: () => null,
  useMap: () => ({ setView: vi.fn(), getZoom: () => 12 }),
  useMapEvents: () => ({}),
}));

const FULL_MAPS_URL =
  "https://www.google.com/maps/place/Studio/@12.9715987,77.5945627,17z";

function pasteInto(input: HTMLElement, text: string) {
  fireEvent.paste(input, {
    clipboardData: {
      getData: () => text,
    },
  });
}

describe("BranchMap paste", () => {
  it("keeps a pasted Google Maps link and pins from it", async () => {
    const onChange = vi.fn();
    renderWithProviders(<BranchMap value={null} onChange={onChange} />);

    const input = screen.getByTestId("map-link-input");
    pasteInto(input, FULL_MAPS_URL);

    expect(input).toHaveValue(FULL_MAPS_URL);
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        latitude: 12.9715987,
        longitude: 77.5945627,
      });
    });
    expect(input).toHaveValue(FULL_MAPS_URL);
  });

  it("does not drop the pasted link when a stale empty change follows", async () => {
    const onChange = vi.fn();
    renderWithProviders(<BranchMap value={null} onChange={onChange} />);

    const input = screen.getByTestId("map-link-input");
    pasteInto(input, FULL_MAPS_URL);
    fireEvent.change(input, { target: { value: "" } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
      expect(input).toHaveValue(FULL_MAPS_URL);
    });
  });

  it("keeps an unparseable link and shows an error", async () => {
    const onChange = vi.fn();
    renderWithProviders(<BranchMap value={null} onChange={onChange} />);

    const input = screen.getByTestId("map-link-input");
    pasteInto(input, "https://www.google.com/maps/search/?api=1&query=Indiranagar");

    expect(input).toHaveValue(
      "https://www.google.com/maps/search/?api=1&query=Indiranagar",
    );
    await waitFor(() => {
      expect(screen.getByText(/Couldn’t find coordinates/i)).toBeInTheDocument();
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps a short Maps link while it resolves", async () => {
    const onChange = vi.fn();
    const resolveShortLink = vi.fn(async () => FULL_MAPS_URL);
    renderWithProviders(
      <BranchMap
        value={null}
        onChange={onChange}
        resolveShortLink={resolveShortLink}
      />,
    );

    const input = screen.getByTestId("map-link-input");
    pasteInto(input, "https://maps.app.goo.gl/abc123");

    expect(input).toHaveValue("https://maps.app.goo.gl/abc123");
    await waitFor(() => {
      expect(resolveShortLink).toHaveBeenCalledWith(
        "https://maps.app.goo.gl/abc123",
      );
      expect(onChange).toHaveBeenCalledWith({
        latitude: 12.9715987,
        longitude: 77.5945627,
      });
    });
    expect(input).toHaveValue("https://maps.app.goo.gl/abc123");
  });
});
