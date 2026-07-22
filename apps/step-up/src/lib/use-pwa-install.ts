import { useContext } from "react";
import {
  PwaInstallContext,
  type PwaInstallContextValue,
} from "@/lib/pwa-install-context";

export function usePwaInstall(): PwaInstallContextValue {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) {
    throw new Error("usePwaInstall must be used within PwaInstallProvider");
  }
  return ctx;
}
