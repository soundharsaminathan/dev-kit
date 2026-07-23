import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test as setup } from "@playwright/test";
import {
  authFile,
  waitForApiReady,
  waitForWebReady,
  writeRoleStorageState,
} from "./fixtures";
import type { SeedRole } from "./fixtures/seed";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(dirname, ".auth");

const roles: SeedRole[] = ["OWNER", "STAFF", "TRAINER", "STUDENT", "PARENT"];

setup("authenticate roles", async ({ request }) => {
  fs.mkdirSync(authDir, { recursive: true });
  await waitForApiReady(request, "OWNER");
  await waitForWebReady(request);

  for (const role of roles) {
    writeRoleStorageState(role);
    if (!fs.existsSync(authFile(role))) {
      throw new Error(`Failed to write auth state for ${role}`);
    }
  }
});
