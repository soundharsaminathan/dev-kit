import { beforeEach, describe, expect, it, vi } from "vitest";
import { SlugRedirectService } from "./slug-redirect.service";

describe("SlugRedirectService", () => {
  const prisma = {
    slugRedirect: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  let service: SlugRedirectService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SlugRedirectService(prisma as never);
  });

  it("resolves an old slug through the stored chain", async () => {
    prisma.slugRedirect.findMany.mockResolvedValue([
      { fromSlug: "old-class", toSlug: "renamed-class" },
      { fromSlug: "renamed-class", toSlug: "hip-hop-beginners" },
    ]);
    await expect(service.resolve("CLASS", "old-class")).resolves.toBe(
      "hip-hop-beginners",
    );
  });

  it("rewrites earlier hops when a slug is renamed again", async () => {
    prisma.slugRedirect.upsert.mockResolvedValue({});
    prisma.slugRedirect.updateMany.mockResolvedValue({ count: 1 });
    await service.record("CLASS", "hip-hop-beginners", "hip-hop-foundations");
    expect(prisma.slugRedirect.upsert).toHaveBeenCalledWith({
      where: { kind_fromSlug: { kind: "CLASS", fromSlug: "hip-hop-beginners" } },
      create: {
        kind: "CLASS",
        fromSlug: "hip-hop-beginners",
        toSlug: "hip-hop-foundations",
      },
      update: { toSlug: "hip-hop-foundations" },
    });
    expect(prisma.slugRedirect.updateMany).toHaveBeenCalledWith({
      where: { kind: "CLASS", toSlug: "hip-hop-beginners" },
      data: { toSlug: "hip-hop-foundations" },
    });
  });
});
