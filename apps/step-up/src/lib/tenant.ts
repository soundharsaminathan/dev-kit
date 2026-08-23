import { getPublic } from "@/lib/api";

export type ResolvedTenant = {
  id: string;
  slug: string;
  name: string;
  status: string;
  logoUrl: string | null;
  address: string | null;
  contact: string | null;
};

/**
 * Resolve a studio from slug or id. Prefer slug (`?studio=`); studioId is compat.
 * Future host-based resolution can share this entry point.
 */
export async function resolveTenant(input: {
  studio?: string | null;
  studioId?: string | null;
}): Promise<ResolvedTenant> {
  const params = new URLSearchParams();
  if (input.studio?.trim()) {
    params.set("studio", input.studio.trim());
  } else if (input.studioId?.trim()) {
    params.set("studioId", input.studioId.trim());
  } else {
    throw new Error("Studio is required");
  }
  return getPublic<ResolvedTenant>(`/tenants/resolve?${params.toString()}`);
}
