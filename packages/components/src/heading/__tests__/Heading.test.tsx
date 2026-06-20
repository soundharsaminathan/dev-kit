import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Heading } from "../Heading";

describe("Heading", () => {
  it("renders as h1 by default", () => {
    render(<Heading>Title</Heading>);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.tagName).toBe("H1");
    expect(heading).toHaveTextContent("Title");
  });

  it("renders the requested heading level", () => {
    render(<Heading level={3}>Subtitle</Heading>);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading.tagName).toBe("H3");
  });
});
