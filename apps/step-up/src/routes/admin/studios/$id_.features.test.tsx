import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StudioFeatureItem } from "@/lib/studio-features";
import { createTestQueryClient, renderWithProviders } from "@/test/render";
import { Route } from "./$id_.features";

const toastMock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());
const apiPatchMock = vi.hoisted(() => vi.fn());

vi.mock("@dev-ui/components/toast", () => ({
  useToastContext: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/api-context", () => ({
  useApi: () => ({
    get: apiGetMock,
    patch: apiPatchMock,
  }),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useCanGoBack: () => false,
    useRouter: () => ({
      history: { back: vi.fn() },
      navigate: vi.fn(),
    }),
  };
});

Route.useParams = (() => ({ id: "studio-1" })) as typeof Route.useParams;

function feature(
  overrides: Partial<StudioFeatureItem> &
    Pick<StudioFeatureItem, "key" | "name" | "category">,
): StudioFeatureItem {
  return {
    description: `${overrides.name} module`,
    enabled: true,
    globallyEnabled: true,
    dependsOnKeys: [],
    ...overrides,
  };
}

const catalog: StudioFeatureItem[] = [
  feature({
    key: "chat",
    name: "Chat",
    category: "Communication",
    enabled: true,
  }),
  feature({
    key: "bookings",
    name: "Bookings",
    category: "Operations",
    enabled: true,
  }),
];

function snapshotOf(rows: StudioFeatureItem[]) {
  return { features: rows.map((row) => ({ ...row })) };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function switchFor(key: string) {
  return within(screen.getByTestId(`feature-toggle-${key}`)).getByRole(
    "switch",
  );
}

function rowFor(key: string) {
  return screen.getByTestId(`feature-toggle-${key}`).closest("[data-enabled]");
}

async function renderPage() {
  const queryClient = createTestQueryClient();
  const PageComponent = Route.options.component!;
  renderWithProviders(<PageComponent />, { queryClient });
  await waitFor(() => {
    expect(switchFor("chat")).toBeInTheDocument();
  });
  return queryClient;
}

describe("AdminStudioFeaturesPage", () => {
  let serverFeatures: StudioFeatureItem[];

  beforeEach(() => {
    vi.clearAllMocks();
    serverFeatures = structuredClone(catalog);
    apiGetMock.mockImplementation(() =>
      Promise.resolve(snapshotOf(serverFeatures)),
    );
  });

  it("renders feature icons and category headings", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { name: "Communication" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Operations" })).toBeVisible();
    expect(screen.getByText("2 of 2 on")).toBeVisible();
  });

  it("updates the switch immediately and keeps sibling switches enabled", async () => {
    const chatPatch = deferred<StudioFeatureItem>();
    apiPatchMock.mockImplementation(
      (url: string, body: { enabled: boolean }) => {
        const key = String(url).includes("/chat") ? "chat" : "bookings";
        const next = {
          ...(serverFeatures.find((row) => row.key === key) ??
            feature({
              key,
              name: key === "chat" ? "Chat" : "Bookings",
              category: key === "chat" ? "Communication" : "Operations",
            })),
          enabled: body.enabled,
        };
        if (key === "chat") {
          return chatPatch.promise.then((updated) => {
            serverFeatures = serverFeatures.map((row) =>
              row.key === updated.key ? updated : row,
            );
            return updated;
          });
        }
        serverFeatures = serverFeatures.map((row) =>
          row.key === next.key ? next : row,
        );
        return Promise.resolve(next);
      },
    );

    await renderPage();

    fireEvent.click(switchFor("chat"));

    await waitFor(() => {
      expect(rowFor("chat")).toHaveAttribute("data-enabled", "false");
      expect(switchFor("chat")).not.toBeChecked();
    });
    expect(switchFor("bookings")).toBeEnabled();
    expect(switchFor("chat")).toBeEnabled();

    fireEvent.click(switchFor("bookings"));

    await waitFor(() => {
      expect(rowFor("bookings")).toHaveAttribute("data-enabled", "false");
      expect(switchFor("bookings")).not.toBeChecked();
    });
    expect(switchFor("chat")).toBeEnabled();
    expect(apiPatchMock).toHaveBeenCalledTimes(2);

    chatPatch.resolve(
      feature({
        key: "chat",
        name: "Chat",
        category: "Communication",
        enabled: false,
      }),
    );

    await waitFor(() => {
      expect(rowFor("chat")).toHaveAttribute("data-enabled", "false");
      expect(rowFor("bookings")).toHaveAttribute("data-enabled", "false");
    });
  });

  it("reverts only the failed toggle and toasts", async () => {
    const chatPatch = deferred<StudioFeatureItem>();
    const bookingsPatch = deferred<StudioFeatureItem>();
    apiPatchMock.mockImplementation((url: string) => {
      if (String(url).includes("/chat")) {
        return chatPatch.promise;
      }
      return bookingsPatch.promise.then((updated) => {
        serverFeatures = serverFeatures.map((row) =>
          row.key === updated.key ? updated : row,
        );
        return updated;
      });
    });

    await renderPage();

    fireEvent.click(switchFor("chat"));
    fireEvent.click(switchFor("bookings"));

    await waitFor(() => {
      expect(rowFor("chat")).toHaveAttribute("data-enabled", "false");
      expect(rowFor("bookings")).toHaveAttribute("data-enabled", "false");
    });

    chatPatch.reject(new Error("Studio is frozen"));
    bookingsPatch.resolve(
      feature({
        key: "bookings",
        name: "Bookings",
        category: "Operations",
        enabled: false,
      }),
    );

    await waitFor(() => {
      expect(rowFor("chat")).toHaveAttribute("data-enabled", "true");
      expect(rowFor("bookings")).toHaveAttribute("data-enabled", "false");
    });
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Couldn’t update feature",
        description: "Studio is frozen",
        variant: "error",
      }),
    );
  });
});
