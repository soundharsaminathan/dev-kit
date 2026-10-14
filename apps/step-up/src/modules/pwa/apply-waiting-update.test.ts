import { describe, expect, it, vi } from "vitest";
import {
  type ApplyWaitingUpdateDeps,
  applyWaitingServiceWorkerUpdate,
  type ServiceWorkerRegistrationLike,
} from "./apply-waiting-update";

function registration(
  partial: Partial<ServiceWorkerRegistrationLike> & { scope: string },
): ServiceWorkerRegistrationLike {
  return {
    unregister: vi.fn(async () => true),
    ...partial,
  };
}

function createDeps(
  registrations: ServiceWorkerRegistrationLike[],
): ApplyWaitingUpdateDeps & {
  controllerChange: () => void;
  scheduled: Array<{ fn: () => void; ms: number }>;
  reloads: number;
} {
  let controllerChange: () => void = () => undefined;
  const scheduled: Array<{ fn: () => void; ms: number }> = [];
  const deps = {
    getRegistrations: async () => registrations,
    onControllerChange: (listener: () => void) => {
      controllerChange = listener;
    },
    reload: vi.fn(),
    schedule: (fn: () => void, ms: number) => {
      scheduled.push({ fn, ms });
    },
    get controllerChange() {
      return controllerChange;
    },
    scheduled,
    get reloads() {
      return (deps.reload as ReturnType<typeof vi.fn>).mock.calls.length;
    },
  };
  return deps;
}

describe("applyWaitingServiceWorkerUpdate", () => {
  it("skip-waits the app worker and reloads when it takes control", async () => {
    const waiting = {
      scriptURL: "https://app.test/sw.js",
      postMessage: vi.fn(),
    };
    const deps = createDeps([
      registration({ scope: "https://app.test/", waiting }),
    ]);
    const updateServiceWorker = vi.fn(async () => undefined);

    await applyWaitingServiceWorkerUpdate(updateServiceWorker, deps);

    expect(waiting.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
    expect(deps.reloads).toBe(0);

    deps.controllerChange();
    expect(deps.reloads).toBe(1);

    deps.scheduled[0]?.fn();
    expect(deps.reloads).toBe(1);
  });

  it("reloads after the fallback delay when controllerchange never fires", async () => {
    const deps = createDeps([]);
    await applyWaitingServiceWorkerUpdate(
      vi.fn(async () => undefined),
      deps,
    );

    expect(deps.reloads).toBe(0);
    expect(deps.scheduled[0]?.ms).toBe(800);
    deps.scheduled[0]?.fn();
    expect(deps.reloads).toBe(1);
  });

  it("unregisters a Firebase messaging worker that stole the / scope", async () => {
    const fcm = registration({
      scope: "https://app.test/",
      waiting: {
        scriptURL: "https://app.test/firebase-messaging-sw.js",
        postMessage: vi.fn(),
      },
    });
    const appWaiting = {
      scriptURL: "https://app.test/sw.js",
      postMessage: vi.fn(),
    };
    const app = registration({
      scope: "https://app.test/",
      waiting: appWaiting,
    });
    const deps = createDeps([fcm, app]);

    await applyWaitingServiceWorkerUpdate(
      vi.fn(async () => undefined),
      deps,
    );

    expect(fcm.unregister).toHaveBeenCalledOnce();
    expect(fcm.waiting?.postMessage).not.toHaveBeenCalled();
    expect(appWaiting.postMessage).toHaveBeenCalledWith({
      type: "SKIP_WAITING",
    });
  });

  it("reloads if skip-waiting throws", async () => {
    const deps = createDeps([]);
    const updateServiceWorker = vi.fn(async () => {
      throw new Error("no waiting worker");
    });

    await applyWaitingServiceWorkerUpdate(updateServiceWorker, deps);

    expect(deps.reloads).toBe(1);
    expect(deps.scheduled).toHaveLength(0);
  });
});
