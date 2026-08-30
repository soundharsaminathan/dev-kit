import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffAgentPanel } from "./staff-agent-panel";

vi.mock("@dev-ui/icons", () => ({
  Icon: ({ name }: { name: string }) => <span data-icon={name} />,
}));

vi.mock("@/lib/api-context", () => ({
  useApi: () => ({
    post: vi.fn(),
  }),
}));

vi.mock("@/lib/use-studio-id", () => ({
  useStudioId: () => "studio-1",
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

describe("StaffAgentPanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("does not render a provider picker or persist provider in localStorage", () => {
    window.localStorage.setItem("step-up.staff-agent.provider", "gemini");
    render(<StaffAgentPanel />);

    expect(screen.queryByTestId("staff-agent-provider-groq")).toBeNull();
    expect(screen.queryByTestId("staff-agent-provider-gemini")).toBeNull();
    expect(screen.queryByText("Groq")).toBeNull();
    expect(screen.queryByText("Gemini")).toBeNull();
    expect(screen.getByText(/Enter to send/i)).toBeTruthy();
  });
});
