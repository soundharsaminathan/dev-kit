import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PwaInstallProvider } from "./pwa-install-provider";
import { usePwaInstall } from "./use-pwa-install";

function InstallProbe() {
  const { canInstall, promptInstall } = usePwaInstall();
  return (
    <button
      type="button"
      disabled={!canInstall}
      onClick={() => void promptInstall()}
    >
      Install
    </button>
  );
}

function fireBeforeInstallPrompt() {
  const prompt = vi.fn(async () => undefined);
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.defineProperties(event, {
    prompt: { value: prompt },
    userChoice: {
      value: Promise.resolve({ outcome: "accepted" as const }),
    },
  });
  window.dispatchEvent(event);
  return { event, prompt };
}

describe("PwaInstallProvider", () => {
  it("does not cancel Chrome's native install banner", async () => {
    render(
      <PwaInstallProvider>
        <InstallProbe />
      </PwaInstallProvider>,
    );

    const { event } = fireBeforeInstallPrompt();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Install" })).toBeEnabled();
    });
    expect(event.defaultPrevented).toBe(false);
  });

  it("still lets a custom Install button call prompt()", async () => {
    render(
      <PwaInstallProvider>
        <InstallProbe />
      </PwaInstallProvider>,
    );

    const { prompt } = fireBeforeInstallPrompt();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Install" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Install" }));
    await waitFor(() => {
      expect(prompt).toHaveBeenCalledOnce();
    });
  });
});
