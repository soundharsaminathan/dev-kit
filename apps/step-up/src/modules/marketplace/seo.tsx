import { useEffect } from "react";
import { marketplacePlaceDescription } from "./place";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let node = document.querySelector<HTMLMetaElement>(selector);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attr, key);
    document.head.appendChild(node);
  }
  node.setAttribute("content", content);
  return node;
}

export function useMarketplaceSeo(input: {
  title: string;
  path: string;
  count: number;
  index: boolean;
  image?: string | null;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (input.enabled === false) return;
    const previous = document.title;
    document.title = `${input.title} | classa`;
    const description = marketplacePlaceDescription({
      title: input.title,
      count: input.count,
    });
    const robots = input.index ? "index,follow" : "noindex,follow";
    const canonicalHref = `${window.location.origin}${input.path}`;

    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const createdLink = !link;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    const previousHref = link.getAttribute("href");
    link.href = canonicalHref;

    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", robots);
    upsertMeta("property", "og:title", input.title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonicalHref);
    if (input.image) {
      upsertMeta("property", "og:image", input.image);
    }

    const json = document.createElement("script");
    json.type = "application/ld+json";
    json.dataset.marketplaceSeo = "true";
    json.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: input.title,
      description,
      url: canonicalHref,
    });
    document.querySelectorAll("script[data-marketplace-seo]").forEach((node) => {
      node.remove();
    });
    document.head.appendChild(json);

    return () => {
      document.title = previous;
      if (createdLink) link?.remove();
      else if (previousHref) link?.setAttribute("href", previousHref);
      json.remove();
    };
  }, [
    input.count,
    input.enabled,
    input.image,
    input.index,
    input.path,
    input.title,
  ]);
}
