import { act, fireEvent, render, screen } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: "owner-1", role: "OWNER" } }),
}));

vi.mock("../session-providers", () => ({
  SessionProviders: ({ children }: { children: ReactNode }) => (
    <div data-testid="session-providers">{children}</div>
  ),
}));

function NameField() {
  const [value, setValue] = useState("");
  return (
    <input
      aria-label="Name"
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

describe("SessionGate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("requestIdleCallback", () => 1);
    vi.stubGlobal("cancelIdleCallback", () => {});
  });

  it("keeps outlet state when deferred session providers mount", async () => {
    const { SessionGate, preloadSessionProviders } = await import(
      "../session-gate"
    );

    render(
      <SessionGate>
        <NameField />
      </SessionGate>,
    );

    const field = screen.getByRole("textbox", { name: "Name" });
    fireEvent.change(field, { target: { value: "UI Enroll" } });

    await act(async () => {
      await preloadSessionProviders();
    });

    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue(
      "UI Enroll",
    );
    expect(screen.getByTestId("session-providers")).toBeEmptyDOMElement();
  });
});
