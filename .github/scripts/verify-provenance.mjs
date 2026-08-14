#!/usr/bin/env node
// .github/scripts/verify-provenance.mjs
//
// Re-derives the SHA-256 of every file this repository ships and compares it
// against export-manifest.json — the document the private export pipeline
// writes when it publishes a release, recording exactly what it published,
// from which source commit, and each file's own hash. This is the check that
// makes tampering with this tree detectable by anyone, including tampering by
// the maintainer: nobody can edit a published file, add an unlisted one, or
// remove a listed one without this script disagreeing with the manifest.
//
// This script is intentionally self-contained: no imports beyond Node
// builtins, no dependency on the private export tooling that produced the
// manifest (that tooling is not published here — see README.md, "What this
// repository is not"). A reader should be able to read this one file start to
// finish and see exactly what "provenance intact" means, without trusting
// anything else in this repository first.
//
// Four things are checked, all fatal on failure:
//   1. determinismDigest — the manifest is internally self-consistent.
//   2. Every file[] entry — exists, and its bytes hash and size match.
//   3. generation.buildGate.generatedLockfile, when present — pnpm-lock.yaml
//      is real provenance too (see manifest.mjs's own header comment): it is
//      the one file that decides what every future `pnpm install
//      --frozen-lockfile` actually downloads, so a manifest that verified
//      clean while silently missing lockfile coverage would defeat the whole
//      point of shipping one. This script checks it explicitly rather than
//      assuming files[] alone is the complete provenance surface.
//   4. Every file physically present in the tree is accounted for by (2) or
//      (3), or is export-manifest.json itself. A file present on disk but
//      absent from the manifest is exactly as much a provenance failure as a
//      mismatched hash — it means something was added to the published tree
//      that the manifest never claimed to publish.
//
// What this does NOT prove: that the export POLICY was correct — that a file
// which should have been withheld was in fact withheld. That is an editorial
// decision made once, by a human, at export time; this script only proves the
// bytes have not moved since. See RELEASE.md for that distinction stated
// plainly, and do not read a clean run of this script as "audited".

import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MANIFEST_PATH = join(REPO_ROOT, "export-manifest.json");

// Directories that are never part of the published tree's own provenance
// claim: .git is checkout metadata, not a published file; node_modules only
// exists after `pnpm install`, which this workflow deliberately never runs
// (see workflow header) so a stray node_modules here would itself be a sign
// something upstream changed, not something this script should silently
// step over. Kept as an explicit, reviewable list rather than a broad glob.
const EXCLUDED_DIRS = new Set([".git"]);

function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

// Identical algorithm to scripts/public-export/manifest.mjs's canonicalJson:
// object keys sorted, 2-space indent. Must match exactly or determinismDigest
// never reproduces — that agreement is itself part of what this script
// proves.
function canonicalJson(value) {
  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk);
    if (node !== null && typeof node === "object") {
      const out = {};
      for (const key of Object.keys(node).sort()) out[key] = walk(node[key]);
      return out;
    }
    return node;
  };
  return JSON.stringify(walk(value), null, 2);
}

function walkFiles(root) {
  const out = [];
  const visit = (absDir, relDir) => {
    for (const entry of readdirSync(absDir, { withFileTypes: true })) {
      if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name) && relDir === "") continue;
      const relPath = relDir === "" ? entry.name : `${relDir}/${entry.name}`;
      const absPath = join(absDir, entry.name);
      if (entry.isDirectory()) {
        visit(absPath, relPath);
      } else if (entry.isFile()) {
        out.push(relPath);
      }
    }
  };
  visit(root, "");
  return out.sort();
}

function fail(problems) {
  console.error(`\nPROVENANCE CHECK FAILED — ${problems.length} problem(s):\n`);
  for (const p of problems) {
    console.error(`  [${p.code}] ${p.path ?? "(manifest)"}`);
    console.error(`      ${p.detail}`);
  }
  console.error(
    "\nThis means the published tree no longer matches export-manifest.json — either a file's\n" +
      "bytes changed, a file was added or removed, or the manifest itself is internally\n" +
      "inconsistent. Do not trust this checkout until the discrepancy is explained.\n",
  );
  process.exit(1);
}

function main() {
  let manifestRaw;
  try {
    manifestRaw = readFileSync(MANIFEST_PATH, "utf8");
  } catch (error) {
    fail([{ code: "manifest-unreadable", detail: `could not read ${MANIFEST_PATH}: ${error.message}` }]);
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(manifestRaw);
  } catch (error) {
    fail([{ code: "manifest-not-json", detail: `export-manifest.json does not parse as JSON: ${error.message}` }]);
    return;
  }

  const problems = [];

  // --- 1. determinismDigest: the manifest is internally self-consistent. ---
  const { determinismDigest, generation, ...deterministic } = manifest;
  if (typeof determinismDigest !== "string" || determinismDigest.length === 0) {
    problems.push({ code: "manifest-missing-digest", detail: "manifest has no determinismDigest field" });
  } else {
    const recomputed = sha256Hex(Buffer.from(canonicalJson(deterministic), "utf8"));
    if (recomputed !== determinismDigest) {
      problems.push({
        code: "determinism-digest-mismatch",
        detail: `manifest claims ${determinismDigest} but recomputing over its own declared fields gives ${recomputed} — the manifest was hand-edited or corrupted`,
      });
    }
  }

  const accountedFor = new Set(["export-manifest.json"]);

  // --- 2. Every files[] entry: present, right hash, right size. -----------
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  if (files.length === 0) {
    problems.push({ code: "manifest-empty-file-list", detail: "manifest.files is empty or missing — nothing to verify, which is itself suspicious for a real release" });
  }
  for (const record of files) {
    if (!record || typeof record.publicPath !== "string") {
      problems.push({ code: "manifest-malformed-entry", detail: `a files[] entry is missing publicPath: ${JSON.stringify(record)}` });
      continue;
    }
    accountedFor.add(record.publicPath);
    const abs = join(REPO_ROOT, record.publicPath);
    let bytes;
    try {
      bytes = readFileSync(abs);
    } catch (error) {
      problems.push({ code: "file-missing", path: record.publicPath, detail: `listed in the manifest but not present in the checkout (${error.code ?? error.message})` });
      continue;
    }
    const actualSha256 = sha256Hex(bytes);
    if (actualSha256 !== record.sha256 || bytes.length !== record.sizeBytes) {
      problems.push({
        code: "content-mismatch",
        path: record.publicPath,
        detail: `expected sha256=${record.sha256} size=${record.sizeBytes}; got sha256=${actualSha256} size=${bytes.length}`,
      });
    }
  }

  // --- 3. generation.buildGate.generatedLockfile, when present. -----------
  // pnpm-lock.yaml is generated by the release pipeline's build gate AFTER
  // staging, so it is not a source-tree file the allowlist enumerates — it
  // lives in manifest.generation instead of manifest.files[]. It still
  // decides what every contributor's `pnpm install --frozen-lockfile`
  // downloads, so it gets exactly the same integrity check as any other
  // published file, not a weaker one.
  const generatedLockfile = manifest.generation?.buildGate?.generatedLockfile;
  if (generatedLockfile) {
    if (typeof generatedLockfile.publicPath !== "string") {
      problems.push({ code: "manifest-malformed-lockfile-record", detail: `generation.buildGate.generatedLockfile is missing publicPath: ${JSON.stringify(generatedLockfile)}` });
    } else {
      accountedFor.add(generatedLockfile.publicPath);
      const abs = join(REPO_ROOT, generatedLockfile.publicPath);
      let bytes = null;
      try {
        bytes = readFileSync(abs);
      } catch (error) {
        problems.push({ code: "lockfile-missing", path: generatedLockfile.publicPath, detail: `recorded in generation.buildGate.generatedLockfile but not present in the checkout (${error.code ?? error.message})` });
      }
      if (bytes !== null) {
        const actualSha256 = sha256Hex(bytes);
        if (actualSha256 !== generatedLockfile.sha256 || bytes.length !== generatedLockfile.sizeBytes) {
          problems.push({
            code: "lockfile-content-mismatch",
            path: generatedLockfile.publicPath,
            detail: `expected sha256=${generatedLockfile.sha256} size=${generatedLockfile.sizeBytes}; got sha256=${actualSha256} size=${bytes.length}`,
          });
        }
      }
    }
  }

  // --- 4. Every file physically present is accounted for. No extras. ------
  let onDisk;
  try {
    onDisk = walkFiles(REPO_ROOT);
  } catch (error) {
    fail([{ code: "walk-failed", detail: `could not walk ${REPO_ROOT}: ${error.message}` }]);
    return;
  }
  for (const relPath of onDisk) {
    const posixPath = relPath.split(/[\\/]/).join("/");
    if (!accountedFor.has(posixPath)) {
      problems.push({
        code: "extra-file",
        path: posixPath,
        detail: "present in the checkout but not named anywhere in export-manifest.json (not in files[], not the generated lockfile, not the manifest itself)",
      });
    }
  }

  if (problems.length > 0) {
    fail(problems);
    return;
  }

  console.log(`provenance: OK — ${files.length} manifest file(s)${generatedLockfile ? " + generated lockfile" : ""} verified, determinismDigest matches, no extra files.`);
  console.log(`provenance: source commit ${manifest.source?.commit ?? "(unknown)"}`);
}

main();
