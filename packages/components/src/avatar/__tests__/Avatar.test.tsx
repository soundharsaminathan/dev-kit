import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "../Avatar";

function mockSuccessfulImageLoad() {
  class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    referrerPolicy = "";
    crossOrigin: string | null = null;
    private _src = "";

    set src(value: string) {
      this._src = value;
      queueMicrotask(() => this.onload?.());
    }

    get src() {
      return this._src;
    }
  }

  vi.stubGlobal("Image", MockImage);
}

describe("Avatar", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows fallback when image is missing", () => {
    render(
      <Avatar>
        <AvatarImage src="/missing.png" alt="User" />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText("AB")).toBeInTheDocument();
  });

  it("applies size data attribute", () => {
    render(
      <Avatar size="lg">
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText("AB").closest("[data-avatar]")).toHaveAttribute(
      "data-size",
      "lg",
    );
  });

  it("shows image and hides fallback when image loads", async () => {
    mockSuccessfulImageLoad();
    render(
      <Avatar>
        <AvatarImage src="/user.png" alt="User" />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );

    await waitFor(() => {
      expect(screen.getByAltText("User")).toBeInTheDocument();
    });
    expect(screen.queryByText("AB")).not.toBeInTheDocument();
    expect(screen.getByAltText("User")).toHaveAttribute(
      "data-avatar-image",
      "",
    );
  });

  it("renders AvatarBadge", () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
        <AvatarBadge>3</AvatarBadge>
      </Avatar>,
    );
    expect(screen.getByText("3")).toHaveAttribute("data-avatar-badge", "");
  });

  it("renders AvatarGroup and AvatarGroupCount", () => {
    render(
      <AvatarGroup size="sm">
        <Avatar>
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
        <AvatarGroupCount>+2</AvatarGroupCount>
      </AvatarGroup>,
    );
    expect(screen.getByText("+2")).toHaveAttribute(
      "data-avatar-group-count",
      "",
    );
    expect(
      screen.getByText("A").closest("[data-avatar-group]"),
    ).toHaveAttribute("data-size", "sm");
  });

  it("throws when AvatarImage is used outside Avatar", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<AvatarImage src="/x.png" alt="X" />)).toThrow(
      "AvatarImage must be used within Avatar",
    );

    consoleError.mockRestore();
  });

  it("throws when AvatarFallback is used outside Avatar", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<AvatarFallback>AB</AvatarFallback>)).toThrow(
      "AvatarFallback must be used within Avatar",
    );

    consoleError.mockRestore();
  });
});
