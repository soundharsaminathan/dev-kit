import { expect, vi } from "vitest";
import * as matchers from "vitest-axe/matchers";
import "@dev-ui/tokens/scss";
import "@dev-ui/components/styles";

expect.extend(matchers);

vi.mock("@dev-ui/components/theme-editor", async () => {
  const { ThemeEditorDrawerMock } = await import(
    "./src/modules/theme-editor/__tests__/theme-editor-drawer.mock"
  );
  return { ThemeEditorDrawer: ThemeEditorDrawerMock };
});
