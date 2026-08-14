#!/usr/bin/env node
// capabilities.mjs -- a tiny, dependency-free reader for capabilities.json.
//
// capabilities.json is this repository's machine-readable index of every
// runnable command, generated (never hand-authored) by re-running each one
// and harvesting what it establishes and does NOT establish from its own
// output -- see capabilities.json's own `description` field for the full
// contract, and AGENTS.md for why this exists.
//
// This script does not generate or validate that file; it only reads it.
// `npm run capabilities` prints a human-readable summary; `npm run
// capabilities -- --json` (or `node capabilities.mjs --json`) prints the
// file's exact bytes unchanged, for a script or agent to parse.
//
// No dependencies: bare `node` and nothing else, matching every verify:*
// script in this tree.

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CAPABILITIES_PATH = join(HERE, "capabilities.json");
const MANIFEST_PATH = join(HERE, "export-manifest.json");

const jsonMode = process.argv.includes("--json");

if (!existsSync(CAPABILITIES_PATH)) {
  process.stderr.write(
    "capabilities.mjs: no capabilities.json in this checkout. That is expected if this is a v0.1 " +
    "Foundation-only export (see README.md, \"How this repository is released\") staged before " +
    "capabilities.json was added to the repo-metadata category -- check export-manifest.json's own " +
    "`layer` and `categories[]` for what this checkout actually holds.\n",
  );
  process.exit(1);
}

const raw = readFileSync(CAPABILITIES_PATH, "utf8");

if (jsonMode) {
  process.stdout.write(raw);
  process.exit(0);
}

const doc = JSON.parse(raw);

let exportLayer = null;
if (existsSync(MANIFEST_PATH)) {
  try {
    exportLayer = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")).layer ?? null;
  } catch {
    exportLayer = null;
  }
}

const LAYER_ORDER = ["v0.1", "v0.2", "v0.3", "v0.4"];
function stagedHere(entryLayer) {
  if (exportLayer === null) return true; // full export, or unknown -- assume present
  if (entryLayer === null || entryLayer === undefined) return true;
  return LAYER_ORDER.indexOf(entryLayer) <= LAYER_ORDER.indexOf(exportLayer);
}

process.stdout.write(`${doc.description}\n\n`);
if (exportLayer !== null) {
  process.stdout.write(`This checkout's export-manifest.json declares layer: ${exportLayer}\n\n`);
}

for (const cmd of doc.commands) {
  const staged = stagedHere(cmd.layer);
  process.stdout.write(`${staged ? "" : "[NOT STAGED IN THIS CHECKOUT] "}${cmd.id}  (layer ${cmd.layer}, ${cmd.offline ? "offline" : "needs install/network"})\n`);
  process.stdout.write(`  command: ${cmd.command}\n`);
  process.stdout.write(`  ${cmd.summary}\n`);
  process.stdout.write("  establishes:\n");
  for (const e of cmd.establishes) process.stdout.write(`    - ${e}\n`);
  process.stdout.write("  does NOT establish:\n");
  for (const e of cmd.doesNotEstablish) process.stdout.write(`    - ${e}\n`);
  process.stdout.write(`  measured runtime (one sample): ${cmd.runtimeMs} ms\n\n`);
}

process.stdout.write(
  "Report both halves together: what a command establishes, and what it does not, per doc.howToUse above.\n" +
  "Run `npm run capabilities -- --json` for the raw file.\n",
);
