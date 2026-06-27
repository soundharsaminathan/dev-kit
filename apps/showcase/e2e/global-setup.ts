import { chromium } from "@playwright/test";

export default async function globalSetup() {
  const baseURL = process.env.SHOWCASE_URL ?? "http://localhost:5173";
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Vite can return index.html before optimized dep chunks are on disk. Load the
  // app once so parallel workers do not race the dep optimizer on cold start.
  await page.goto(baseURL, { waitUntil: "networkidle", timeout: 120_000 });
  await page
    .getByRole("heading", { name: "Component Showcase" })
    .waitFor({ timeout: 30_000 });

  await browser.close();
}
