import { createContext } from "react";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type PwaInstallContextValue = {
  canInstall: boolean;
  isStandalone: boolean;
  isIos: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

export const PwaInstallContext = createContext<PwaInstallContextValue | null>(
  null,
);
