// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { TestProviders } from "@/test-utils/providers";

type RemoveHandler = (keys: Set<string | number>) => void;

let capturedOnRemove: RemoveHandler | undefined;

vi.mock("@dev-ui/components/tag-group", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@dev-ui/components/tag-group")>();
  return {
    ...actual,
    TagGroup: (props: ComponentProps<typeof actual.TagGroup>) => {
      capturedOnRemove = props.onRemove;
      return <actual.TagGroup {...props} />;
    },
  };
});

import TagGroupPlayground from "@/registry/tag-group/playground";

describe("TagGroupPlayground", () => {
  it("handles removable tag removal", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    render(
      <TestProviders>
        <TagGroupPlayground isRemovable />
      </TestProviders>,
    );

    expect(capturedOnRemove).toBeTypeOf("function");
    capturedOnRemove?.(new Set(["news"]));
    expect(consoleSpy).toHaveBeenCalledWith("remove", ["news"]);

    consoleSpy.mockRestore();
  });

  it("renders static tags when removal is disabled", () => {
    render(
      <TestProviders>
        <TagGroupPlayground label="Static tags" />
      </TestProviders>,
    );

    expect(screen.getByText("Static tags")).toBeInTheDocument();
    expect(capturedOnRemove).toBeUndefined();
  });
});
