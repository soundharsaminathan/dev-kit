/**
 * Analyze the production entry chunk composition from a Vite sourcemap.
 *
 * Usage:
 *   node scripts/analyze-entry-bundle.mjs [dist/assets/index-*.js]
 */
import fs from "node:fs";
import path from "node:path";

function categorize(src) {
  const s = src.replace(/\\/g, "/");
  if (s.includes("node_modules/react-dom")) return "React DOM";
  if (s.includes("node_modules/react/") || s.includes("node_modules/scheduler"))
    return "React";
  if (
    s.includes("@tanstack/react-router") ||
    s.includes("@tanstack/router-core") ||
    s.includes("@tanstack/history")
  )
    return "TanStack Router";
  if (s.includes("@tanstack/react-query") || s.includes("@tanstack/query-core"))
    return "TanStack Query";
  if (s.includes("firebase") || s.includes("@firebase")) return "Firebase";
  if (s.includes("@sentry")) return "Sentry";
  if (s.includes("socket.io")) return "Socket.IO";
  if (s.includes("lucide-react")) return "icons (lucide-react)";
  if (s.includes("icons-packs")) return "icons (@dev-ui/icons-packs)";
  if (s.includes("/packages/icons/") || s.includes("@dev-ui/icons/"))
    return "icons (@dev-ui/icons)";
  if (s.includes("/packages/components/") || s.includes("@dev-ui/components"))
    return "@dev-ui/components";
  if (s.includes("/packages/core/") || s.includes("@dev-ui/core"))
    return "@dev-ui/core";
  if (s.includes("/packages/tokens/") || s.includes("@dev-ui/tokens"))
    return "@dev-ui/tokens / colorjs";
  if (s.includes("motion") || s.includes("framer-motion")) return "motion";
  if (
    s.includes("react-aria") ||
    s.includes("@react-aria") ||
    s.includes("@react-stately") ||
    s.includes("@internationalized")
  )
    return "react-aria / internationalized";
  if (s.includes("/apps/step-up/src/lib/")) return "application providers/lib";
  if (s.includes("/apps/step-up/src/")) return "application source";
  if (s.includes("node_modules/")) {
    const m = s.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
    return `other: ${m ? m[1] : "unknown"}`;
  }
  return "other";
}

const distAssets = path.resolve("dist/assets");
const argPath = process.argv[2];
const entryJs =
  argPath ??
  fs
    .readdirSync(distAssets)
    .filter((f) => /^index-.*\.js$/.test(f))
    .map((f) => path.join(distAssets, f))
    .sort(
      (a, b) => fs.statSync(b).size - fs.statSync(a).size,
    )[0];

if (!entryJs || !fs.existsSync(entryJs)) {
  console.error("Entry JS not found. Build the app first.");
  process.exit(1);
}

const mapPath = `${entryJs}.map`;
if (!fs.existsSync(mapPath)) {
  console.error(`Sourcemap missing: ${mapPath} (build with --sourcemap)`);
  process.exit(1);
}

const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
const byCat = new Map();
for (let i = 0; i < map.sources.length; i++) {
  const cat = categorize(map.sources[i]);
  const len = map.sourcesContent?.[i]
    ? Buffer.byteLength(map.sourcesContent[i], "utf8")
    : 0;
  const prev = byCat.get(cat) || { bytes: 0, files: 0 };
  prev.bytes += len;
  prev.files += 1;
  byCat.set(cat, prev);
}

const rows = [...byCat.entries()].sort((a, b) => b[1].bytes - a[1].bytes);
const total = rows.reduce((s, [, v]) => s + v.bytes, 0);
const entrySize = fs.statSync(entryJs).size;

console.log(`Entry: ${path.relative(process.cwd(), entryJs)}`);
console.log(
  `Raw (minified): ${(entrySize / 1024).toFixed(1)} KB`,
);
console.log("\nModule/package".padEnd(40), "Src est.".padStart(10), "Share".padStart(8), "Files".padStart(6));
console.log("-".repeat(70));
for (const [cat, v] of rows) {
  console.log(
    cat.padEnd(40),
    `${Math.round(v.bytes / 1024)}KB`.padStart(10),
    `${((100 * v.bytes) / total).toFixed(1)}%`.padStart(8),
    String(v.files).padStart(6),
  );
}

const html = fs.readFileSync(path.resolve("dist/index.html"), "utf8");
const css = [...html.matchAll(/href="(\/assets\/[^"]+\.css)"/g)].map((m) => m[1]);
const preloads = [
  ...html.matchAll(/rel="modulepreload"[^>]*href="(\/assets\/[^"]+)"/g),
].map((m) => m[1]);
console.log("\nCSS:");
for (const c of css) {
  console.log(
    `  ${(fs.statSync(path.join("dist", c)).size / 1024).toFixed(1)} KB  ${c}`,
  );
}
let preloadTotal = entrySize;
console.log("\nModulepreload + entry JS:");
for (const p of preloads) {
  const s = fs.statSync(path.join("dist", p)).size;
  preloadTotal += s;
  console.log(`  ${(s / 1024).toFixed(1)} KB  ${p}`);
}
console.log(`  ${(entrySize / 1024).toFixed(1)} KB  ${path.basename(entryJs)} (entry)`);
console.log(`TOTAL JS (entry+preload): ${(preloadTotal / 1024).toFixed(1)} KB`);
