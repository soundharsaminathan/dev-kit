import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InteractiveDemo } from "@/modules/showcase/interactive-demo";
import { TestProviders } from "@/test-utils/providers";
import { getAllRegistryEntries } from "../index";

describe("registry playgrounds", () => {
  it.each(
    getAllRegistryEntries().map((entry) => [entry.config.slug, entry] as const),
  )("%s renders with default controls", (_slug, entry) => {
    render(
      <TestProviders>
        <InteractiveDemo
          Playground={entry.Playground}
          controls={entry.config.controls}
          {...(entry.config.normalizeControlValues
            ? {
                normalizeControlValues: entry.config.normalizeControlValues,
              }
            : {})}
        />
      </TestProviders>,
    );

    expect(screen.getByText("Playground")).toBeInTheDocument();
    expect(screen.getByTestId("controls-panel")).toBeInTheDocument();
  });
});
