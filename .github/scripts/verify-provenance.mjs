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
//   4. Every file physically present is accounted for by (2), (3), by a
//      DECLARED AUTHORED REGION (manifest.authoredRegions — see below), or is
//      export-manifest.json itself. A file present on disk but absent from
//      all of those is exactly as much a provenance failure as a mismatched
//      hash — it means something was added to the published tree that the
//      manifest never claimed to publish.
//
// Declared authored regions: some published paths are authored directly in
// THIS public repository (e.g. site/, built from the repo's own published
// files at build time, plus the one .github/workflows/*.yml that builds it)
// rather than exported from the private one, so they have no source-tree
// bytes to hash against here. `manifest.authoredRegions` names each such
// path — a directory prefix (ends in "/") or an exact file (no trailing
// slash) — and a written reason. A file matching a declared entry is never
// flagged as an "extra" — but this is a NEW trust
// boundary in a document whose whole job is "nothing is unaccounted for", so
// it is never silent: every declared region is printed on every passing run,
// by name, with the count of files it actually matched (see the success log
// below). A reader who cannot tell an authored region from a tampered one
// loses the property this script exists to give them, so "declared and
// visible" is not optional polish here — it is the whole difference between
// a legitimate carve-out and a hole. A region matching zero files is fine
// (the site can change shape, or be absent entirely); a file OUTSIDE every
// declared region and not in files[] is still a hard extra-file failure,
// exactly as before.
//
// What this does NOT prove: that the export POLICY was correct — that a file
// which should have been withheld was in fact withheld, or that the bytes
// inside a declared authored region are themselves trustworthy (this script
// does not and cannot hash them against a private source — there isn't one).
// That is an editorial decision made once, by a human — at export time for
// exported files, and at commit-review time in this public repo for authored
// ones; this script only proves the exported bytes have not moved since. See
// RELEASE.md for that distinction stated plainly, and do not read a clean run
// of this script as "audited".

import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MANIFEST_PATH = join(REPO_ROOT, "export-manifest.json");

// Directories that are never part of the published tree's own provenance
// claim: .git is checkout metadata, not a published file. Kept as an
// explicit, reviewable list rather than a broad glob.
//
// Deliberately checked ONLY at the tree root (see walkFiles below): a plain
// checkout has exactly one .git, at the top, and nowhere else. A .git
// appearing anywhere ELSE in the tree (a submodule, a stray nested repo) is
// not the same well-understood case and should be judged as an extra file
// like anything else, not silently swallowed by a name match — broadening
// this to every depth would quietly forgive exactly the kind of anomaly this
// script exists to catch.
const EXCLUDED_DIRS = new Set([".git"]);

// Directories that are never part of the published tree's own provenance
// claim EITHER, but for the opposite reason from EXCLUDED_DIRS: node_modules
// legitimately exists after `pnpm install` (see RELEASE.md, "Rebuild it"),
// and a real pnpm workspace can grow one under EVERY package, not just the
// root — unlike .git this is not a root-only case, so it is matched at any
// depth (see walkFiles).
//
// The two contexts this script runs in disagree about what a node_modules
// here MEANS:
//   - In the CI workflow (provenance.yml), which deliberately never runs
//     `pnpm install`, a node_modules is itself a signal that something
//     upstream changed — see the workflow's own header comment. It must stay
//     fatal there, exactly as any other extra file would be.
//   - Run by hand, after a normal `pnpm install` for local development, the
//     SAME directory is expected and constitutes the overwhelming majority
//     of a real run's findings (measured: 1017 of 1018 extra-file problems
//     in one full local install here were under node_modules alone) —
//     enough noise that a genuine finding sitting next to it is invisible.
//     The tool's whole purpose is that anyone, including the maintainer, can
//     run it and see what's wrong; a report a human cannot read fails that
//     purpose just as surely as a false pass would.
//
// The fix is NOT to add node_modules to EXCLUDED_DIRS — that would silently
// delete the CI signal every time, which is the one context where it matters
// most. Instead this script always finds and COUNTS these directories
// (without individually enumerating every file inside one — that is what
// produces the noise), and treats the finding differently by context:
//   - `CI=true` in the environment (GitHub Actions sets this on every run,
//     unprompted, for every job — see
//     https://docs.github.com/actions/learn-github-actions/variables) still
//     turns each into a single fatal `generated-directory-present` problem,
//     one line naming the directory and how many files it contains. Still
//     fatal, still exits non-zero, still names the exact path — the CI
//     signal is unchanged, only compressed from one line per file to one
//     line per directory.
//   - Otherwise (a human running it by hand) it is reported once, clearly
//     labeled as ignored rather than as tampering, and does not fail the run
//     by itself — so a real extra-file or content-mismatch finding is no
//     longer buried under thousands of lines that mean nothing locally.
// The same argument applies to build output, and for a sharper reason than
// convenience: following THIS REPOSITORY'S OWN documented quickstart is what
// creates it. README tells a visitor to run `npm install` and `npm run build`;
// doing exactly that leaves `package-lock.json` and a `dist/` under each built
// package. Before this list covered them, a reader who then ran this script —
// the very script the repository offers as its proof of integrity — was told
// the tree had been tampered with. A tampering alarm that fires because the
// user followed the instructions teaches them to ignore the alarm, which costs
// more than the check was ever worth.
//
// Nothing here is published under any of these names, so tolerating them
// cannot mask a real finding. Verified against the manifest rather than
// assumed: zero published files sit under a `dist`, `target`, `.astro`,
// `build`, or `out` path segment, and none is named `package-lock.json` or
// ends in `.tsbuildinfo`. The one lockfile that IS published, `pnpm-lock.yaml`,
// is accounted for explicitly in check 3 and is deliberately NOT in this list —
// it is real provenance and must keep failing loudly if it changes.
//
// These names duplicate .gitignore, and the duplication is deliberate: this
// script must stay self-contained and readable start to finish (see the header)
// rather than parsing another file's format to learn what it means. If
// .gitignore gains a generated path, add it here too.
const GENERATED_DIR_NAMES = new Set(["node_modules", "dist", "target", ".astro"]);

// File-level equivalents of GENERATED_DIR_NAMES: artifacts a normal local
// build drops as loose files rather than inside a directory. Same contextual
// treatment, same reasoning.
const isGeneratedFileName = (relPath) => {
  const base = relPath.split("/").pop();
  return base === "package-lock.json" || base.endsWith(".tsbuildinfo");
};

const isCiRun = () => process.env.CI === "true" || process.env.CI === "1";

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

/** Count files under absDir, recursively, without recording their individual paths. */
function countFilesUnder(absDir) {
  let count = 0;
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    if (entry.isDirectory()) count += countFilesUnder(join(absDir, entry.name));
    else if (entry.isFile()) count += 1;
  }
  return count;
}

/**
 * Walk the tree, returning the sorted list of ordinary files plus a separate
 * list of GENERATED_DIR_NAMES matches (each counted, not individually
 * enumerated -- see the constant's own comment for why).
 */
function walkFiles(root) {
  const out = [];
  const generatedDirs = [];
  const visit = (absDir, relDir) => {
    for (const entry of readdirSync(absDir, { withFileTypes: true })) {
      if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name) && relDir === "") continue;
      const relPath = relDir === "" ? entry.name : `${relDir}/${entry.name}`;
      const absPath = join(absDir, entry.name);
      if (entry.isDirectory()) {
        if (GENERATED_DIR_NAMES.has(entry.name)) {
          generatedDirs.push({ path: relPath, fileCount: countFilesUnder(absPath) });
          continue; // do not descend -- avoid enumerating potentially thousands of files
        }
        visit(absPath, relPath);
      } else if (entry.isFile()) {
        out.push(relPath);
      }
    }
  };
  visit(root, "");
  return { files: out.sort(), generatedDirs: generatedDirs.sort((a, b) => (a.path < b.path ? -1 : 1)) };
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

  // --- Declared authored regions (see header comment). ---------------------
  // Validated the same way any other manifest-declared exemption is: a
  // malformed entry is a fatal problem, not something silently skipped, so a
  // corrupted manifest can never widen this carve-out by accident.
  const rawAuthoredRegions = Array.isArray(manifest.authoredRegions) ? manifest.authoredRegions : [];
  const authoredRegions = [];
  for (const region of rawAuthoredRegions) {
    if (!region || typeof region.prefix !== "string" || region.prefix.length === 0 || typeof region.reason !== "string" || region.reason.length === 0) {
      problems.push({
        code: "manifest-malformed-authored-region",
        detail: `an authoredRegions entry is malformed (needs a non-empty "prefix" — a directory ending in "/" or an exact file path — and a non-empty "reason"): ${JSON.stringify(region)}`,
      });
      continue;
    }
    authoredRegions.push({ prefix: region.prefix, reason: region.reason, matched: 0 });
  }
  const authoredRegionMatches = (posixPath, region) =>
    region.prefix.endsWith("/") ? posixPath.startsWith(region.prefix) : posixPath === region.prefix;

  // --- 4. Every file physically present is accounted for. No extras. ------
  let onDisk;
  try {
    onDisk = walkFiles(REPO_ROOT);
  } catch (error) {
    fail([{ code: "walk-failed", detail: `could not walk ${REPO_ROOT}: ${error.message}` }]);
    return;
  }
  const ciRun = isCiRun();
  const ignoredGeneratedFiles = [];
  for (const relPath of onDisk.files) {
    const posixPath = relPath.split(/[\\/]/).join("/");
    if (accountedFor.has(posixPath)) continue;
    const region = authoredRegions.find((r) => authoredRegionMatches(posixPath, r));
    if (region) {
      region.matched += 1;
      continue;
    }
    // Loose build artifacts: fatal in CI, where a checkout that was never
    // built has no business containing them; merely reported by hand, where
    // the repository's own quickstart is what produced them. Same contextual
    // split as GENERATED_DIR_NAMES, for the same reason.
    if (isGeneratedFileName(posixPath)) {
      if (ciRun) {
        problems.push({
          code: "generated-file-present",
          path: posixPath,
          detail:
            "a build artifact this CI workflow deliberately never creates (see verify-provenance.mjs header, \"isGeneratedFileName\") — its presence in a CI checkout means something upstream changed",
        });
      } else {
        ignoredGeneratedFiles.push(posixPath);
      }
      continue;
    }
    problems.push({
      code: "extra-file",
      path: posixPath,
      detail: "present in the checkout but not named anywhere in export-manifest.json (not in files[], not the generated lockfile, not the manifest itself, not a declared authored region)",
    });
  }

  // --- Generated directories (node_modules): see GENERATED_DIR_NAMES. ------
  // In CI (CI=true) each is a fatal problem, same severity as any other
  // extra file, just reported as one line per directory instead of one line
  // per file inside it. Outside CI it is reported but does not fail the run
  // by itself, so it cannot bury a real finding.
  const ignoredGeneratedDirs = [];
  for (const gd of onDisk.generatedDirs) {
    if (ciRun) {
      problems.push({
        code: "generated-directory-present",
        path: gd.path,
        detail: `${gd.fileCount} file(s) under a directory this CI workflow deliberately never creates (see verify-provenance.mjs header, "GENERATED_DIR_NAMES") — its presence in a CI checkout means something upstream changed`,
      });
    } else {
      ignoredGeneratedDirs.push(gd);
    }
  }
  if (ignoredGeneratedDirs.length > 0 || ignoredGeneratedFiles.length > 0) {
    const parts = [
      ...ignoredGeneratedDirs.map((gd) => `${gd.path}/ (${gd.fileCount})`),
      ...ignoredGeneratedFiles,
    ];
    const total =
      ignoredGeneratedDirs.reduce((sum, gd) => sum + gd.fileCount, 0) + ignoredGeneratedFiles.length;
    console.log(
      `provenance: ignoring ${total} generated file(s) — ${parts.join(", ")} ` +
        `— produced by installing dependencies or running this repository's own documented build, ` +
        `expected in a local checkout, not treated as tampering here. ` +
        `Set CI=true to check for these as provenance failures instead, which is what this workflow does in GitHub Actions.`,
    );
  }

  if (problems.length > 0) {
    fail(problems);
    return;
  }

  console.log(`provenance: OK — ${files.length} manifest file(s)${generatedLockfile ? " + generated lockfile" : ""} verified, determinismDigest matches, no unaccounted extra files.`);
  for (const region of authoredRegions) {
    console.log(`provenance: ${region.matched} file(s) in declared authored region ${region.prefix} — ${region.reason}`);
  }
  console.log(`provenance: source commit ${manifest.source?.commit ?? "(unknown)"}`);
}

main();
