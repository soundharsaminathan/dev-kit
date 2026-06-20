import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "../Alert";

describe("Alert", () => {
  it("renders with alert role", () => {
    render(
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Details here</AlertDescription>
      </Alert>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("applies variant data attribute", () => {
    render(<Alert variant="danger">Error</Alert>);
    expect(screen.getByRole("alert")).toHaveAttribute("data-variant", "danger");
  });

  it("renders an action slot", () => {
    render(
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertAction>
          <button type="button">Retry</button>
        </AlertAction>
      </Alert>,
    );

    expect(
      screen.getByRole("button", { name: "Retry" }).parentElement,
    ).toHaveAttribute("data-alert-action", "");
  });
});
