import { IconProvider } from "@dev-ui/icons";
import React, { type ReactElement } from "react";
import { vi } from "vitest";
import lucidePack from "../icons-packs/src/lucide/index.tsx";

vi.mock("@testing-library/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@testing-library/react")>();

  return {
    ...actual,
    render: (ui: ReactElement, options?: Parameters<typeof actual.render>[1]) =>
      actual.render(
        <IconProvider icons={{ library: "lucide" }} initialPack={lucidePack}>
          {ui}
        </IconProvider>,
        options,
      ),
  };
});
