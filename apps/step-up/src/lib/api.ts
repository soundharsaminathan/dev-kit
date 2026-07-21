import { getApiBaseUrl } from "./constants";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string | null;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T) : (undefined as T);

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return data;
}

async function request<T>(
  path: string,
  { body, token, headers, ...init }: RequestOptions = {},
): Promise<T> {
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: requestHeaders,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  return parseResponse<T>(response);
}

export function getPublic<T>(
  path: string,
  init?: Omit<RequestOptions, "body" | "token">,
) {
  return request<T>(path, init);
}

export function createApiClient(getToken: () => Promise<string | null>) {
  return {
    get<T>(path: string, init?: Omit<RequestOptions, "body" | "token">) {
      return getToken().then((token) => request<T>(path, { ...init, token }));
    },
    post<T>(
      path: string,
      body?: unknown,
      init?: Omit<RequestOptions, "body" | "token">,
    ) {
      return getToken().then((token) =>
        request<T>(path, { ...init, method: "POST", body, token }),
      );
    },
    patch<T>(
      path: string,
      body?: unknown,
      init?: Omit<RequestOptions, "body" | "token">,
    ) {
      return getToken().then((token) =>
        request<T>(path, { ...init, method: "PATCH", body, token }),
      );
    },
    put<T>(
      path: string,
      body?: unknown,
      init?: Omit<RequestOptions, "body" | "token">,
    ) {
      return getToken().then((token) =>
        request<T>(path, { ...init, method: "PUT", body, token }),
      );
    },
    delete<T>(path: string, init?: Omit<RequestOptions, "body" | "token">) {
      return getToken().then((token) =>
        request<T>(path, { ...init, method: "DELETE", token }),
      );
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return request<T>(path, options);
}
