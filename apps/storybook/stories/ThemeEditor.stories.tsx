import { Button } from "@dev-ui/components/button";
import { Card } from "@dev-ui/components/card";
import { Input } from "@dev-ui/components/input";
import { ThemeEditorDrawer } from "@dev-ui/components/theme-editor";
import { ThemeProvider, useTheme } from "@dev-ui/core";
import { createThemeDraft } from "@dev-ui/tokens";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

function ThemeEditorDemo() {
  const { setLiveTheme } = useTheme();
  const [draft, setDraft] = useState(() => createThemeDraft());

  return (
    <div style={{ padding: "1.5rem" }}>
      <ThemeEditorDrawer
        value={draft}
        onChange={setDraft}
        onLivePreview={setLiveTheme}
      />
      <Card
        style={{
          marginTop: "1.5rem",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          maxWidth: "32rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Button variant="primary">Primary</Button>
          <Button variant="default">Default</Button>
          <Button variant="quiet">Quiet</Button>
        </div>
        <Input aria-label="Preview input" placeholder="Preview input" />
      </Card>
    </div>
  );
}

const meta = {
  title: "Foundation/ThemeEditor",
  component: ThemeEditorDemo,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof ThemeEditorDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Drawer: Story = {};
