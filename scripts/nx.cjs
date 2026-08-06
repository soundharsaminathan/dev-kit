#!/usr/bin/env node
"use strict";

require("./resolve-color-env-conflict.cjs");

const { spawnSync } = require("node:child_process");
const path = require("node:path");
const nxBin = require.resolve("nx/bin/nx.js");
const preload = path.join(__dirname, "resolve-color-env-conflict.cjs");
const requireFlag = `--require ${preload.replace(/\\/g, "/")}`;

const env = { ...process.env };
const existing = env.NODE_OPTIONS ?? "";
if (!existing.includes("resolve-color-env-conflict")) {
  env.NODE_OPTIONS = existing ? `${requireFlag} ${existing}` : requireFlag;
}

const result = spawnSync(process.execPath, [nxBin, ...process.argv.slice(2)], {
  stdio: "inherit",
  env,
});

process.exit(result.status ?? 1);
