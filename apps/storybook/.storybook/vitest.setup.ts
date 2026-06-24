import "@dev-ui/tokens/scss";
import "@dev-ui/components/styles";

// react-stately virtualizer reads process.env in Rect.intersects (see VIRT_ON).
if (typeof process === "undefined") {
  (globalThis as Record<string, unknown>).process = {
    env: {
      VIRT_ON: "1",
      NODE_ENV: "test",
    },
  };
}
