const ALLOWED_HOST_SUFFIXES = [
  "google.com",
  "google.co.in",
  "maps.app.goo.gl",
  "goo.gl",
  "g.co",
  "openstreetmap.org",
] as const;

export function isAllowedMapHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

export function assertAllowedMapUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("Paste a valid Google Maps link");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Paste a valid Google Maps link");
  }

  if (!isAllowedMapHost(url.hostname)) {
    throw new Error("Only Google Maps and OpenStreetMap links are supported");
  }

  return url;
}

export async function followMapRedirects(
  raw: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  let current = assertAllowedMapUrl(raw).toString();

  for (let hop = 0; hop < 8; hop += 1) {
    const response = await fetchImpl(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": "StepUpMapLinkResolver/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Could not resolve that map link");
      }
      current = assertAllowedMapUrl(
        new URL(location, current).toString(),
      ).toString();
      continue;
    }

    if (!response.ok) {
      throw new Error("Could not resolve that map link");
    }

    return response.url && response.url !== current
      ? assertAllowedMapUrl(response.url).toString()
      : current;
  }

  throw new Error("Could not resolve that map link");
}
