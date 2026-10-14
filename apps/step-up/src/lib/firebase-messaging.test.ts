import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FCM_SW_SCOPE,
  registerMessagingServiceWorker,
} from "./firebase-messaging";

describe("registerMessagingServiceWorker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers Firebase messaging under a scope that cannot replace sw.js", async () => {
    const register = vi.fn(async () => ({ scope: FCM_SW_SCOPE }));
    const rootFcm = {
      scope: "https://app.test/",
      active: { scriptURL: "https://app.test/firebase-messaging-sw.js" },
      unregister: vi.fn(async () => true),
    };
    const appSw = {
      scope: "https://app.test/",
      active: { scriptURL: "https://app.test/sw.js" },
      unregister: vi.fn(async () => true),
    };
    vi.stubGlobal("navigator", {
      serviceWorker: {
        getRegistrations: async () => [rootFcm, appSw],
        register,
      },
    });

    await registerMessagingServiceWorker();

    expect(rootFcm.unregister).toHaveBeenCalledOnce();
    expect(appSw.unregister).not.toHaveBeenCalled();
    expect(register).toHaveBeenCalledWith("/firebase-messaging-sw.js", {
      scope: FCM_SW_SCOPE,
    });
  });
});
