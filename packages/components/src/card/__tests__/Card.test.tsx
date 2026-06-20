import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../Card";

describe("Card", () => {
  it("renders card sections", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
      </Card>,
    );
    expect(screen.getByText("Title")).toHaveAttribute("data-card-title", "");
    expect(screen.getByText("Description")).toHaveAttribute(
      "data-card-description",
      "",
    );
    expect(screen.getByText("Body")).toHaveAttribute("data-card-content", "");
  });

  it("applies data-card on root", () => {
    render(<Card>Content</Card>);
    expect(
      screen.getByText("Content").closest("[data-card]"),
    ).toBeInTheDocument();
  });

  it("renders action and footer sections", () => {
    render(
      <Card size="sm">
        <CardAction>
          <button type="button">Edit</button>
        </CardAction>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );

    expect(
      screen.getByRole("button", { name: "Edit" }).parentElement,
    ).toHaveAttribute("data-card-action", "");
    expect(screen.getByText("Footer")).toHaveAttribute("data-card-footer", "");
    expect(screen.getByText("Footer").closest("[data-card]")).toHaveAttribute(
      "data-size",
      "sm",
    );
  });
});
