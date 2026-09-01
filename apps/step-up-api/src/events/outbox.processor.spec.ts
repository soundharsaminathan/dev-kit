import { describe, expect, it, vi } from "vitest";
import { DataImportService } from "../data-import/data-import.service";
import { OutboxProcessor } from "./outbox.processor";

function importEvent() {
  return {
    id: "outbox-1",
    type: "data_import.requested",
    payload: { importId: "import-1", studioId: "studio-1" },
    studioId: "studio-1",
    createdAt: new Date(),
    publishedAt: null,
    claimedAt: new Date(),
    attempts: 0,
  };
}

function buildProcessor(
  overrides: {
    dataImport?: { runImportJob: ReturnType<typeof vi.fn> } | null;
  } = {},
) {
  const outbox = {
    claimUnpublished: vi.fn().mockResolvedValue([importEvent()]),
    markPublishedMany: vi.fn().mockResolvedValue({ count: 1 }),
    bumpAttempts: vi.fn().mockResolvedValue({}),
  };
  const dataImport =
    overrides.dataImport === undefined
      ? { runImportJob: vi.fn().mockResolvedValue(undefined) }
      : overrides.dataImport;
  const moduleRef = {
    get: vi.fn((token: unknown) => {
      if (token === DataImportService) {
        if (!dataImport) {
          throw new Error("DataImportService is not available");
        }
        return dataImport;
      }
      throw new Error("not found");
    }),
  };
  const processor = new OutboxProcessor(
    outbox as never,
    null,
    moduleRef as never,
  );
  return { processor, outbox, dataImport, moduleRef };
}

describe("OutboxProcessor data import events", () => {
  it("runs the import job and marks the event published", async () => {
    const { processor, outbox, dataImport } = buildProcessor();

    await processor.tick();

    expect(dataImport?.runImportJob).toHaveBeenCalledWith("import-1");
    expect(outbox.markPublishedMany).toHaveBeenCalledWith(["outbox-1"]);
    expect(outbox.bumpAttempts).not.toHaveBeenCalled();
  });

  it("releases the claim when DataImportService is not on this process", async () => {
    const { processor, outbox } = buildProcessor({ dataImport: null });

    await processor.tick();

    expect(outbox.bumpAttempts).toHaveBeenCalledWith("outbox-1");
    expect(outbox.markPublishedMany).not.toHaveBeenCalled();
  });
});
