import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateSCSS } from "./scss-generation.js";

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  try {
    generateSCSS();
  } catch (error) {
    console.error("Error generating SCSS files:", error);
    process.exit(1);
  }
}
