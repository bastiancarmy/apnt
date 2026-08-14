# Releases

This repository ships as tagged releases, `v0.MINOR.PATCH`. Pre-1.0 means
shapes may still move — see [`AGENTS.md`](./AGENTS.md)'s maturity ladder for what "may I
depend on this" means per component, independent of the tag.

No release has been tagged yet as of this file. What follows is the model
future tags are assigned against, not a claim about history that doesn't
exist.

## The layers

Each `MINOR` version corresponds to one layer of what a stranger can rely on.
A later layer does not replace an earlier one — it adds to it.

| layer | version range | what it adds |
| --- | --- | --- |
| **Foundation** | `v0.1.x` | The protocol itself: relation and covenant sources, frozen identities, capability specs. Read it; nothing here has been proven yet. |
| **Verification** | `v0.2.x` | The means to check the protocol: independent verifiers, trusted descriptors, canonical proof artifacts. What Foundation claims becomes checkable, not just readable. |
| **Reproduction** | `v0.3.x` | The release process itself becomes checkable: a real build gate (install, build, typecheck, test), CI that runs on every push ([`.github/workflows/build.yml`](./.github/workflows/build.yml), [`.github/workflows/verify.yml`](./.github/workflows/verify.yml)), and a provenance check ([`.github/workflows/provenance.yml`](./.github/workflows/provenance.yml)) that re-derives every file's hash against [`export-manifest.json`](./export-manifest.json). What ships is provable, not just asserted. |
| **Product** | `v0.4.x` | Something a stranger can actually use — wallet flows, packaged distribution — built on the three layers beneath it, never ahead of them. |

A component's rung (`experimental` / `preview` / `stable` / `frozen` /
`superseded` / `retired`, per [`AGENTS.md`](./AGENTS.md)) is the authority on what you may
depend on; the layer above tells you which release introduced it.

## How a tag maps to a `bch-cloak` commit

This repository has no human-authored commits — every file arrived through a
fail-closed export from the private `bch-cloak` repository, or not at all
(see the top-level [`README.md`](./README.md)). Each tagged release ships its own
[`export-manifest.json`](./export-manifest.json), which records:

- `source.commit` — the exact private-repository commit the release was
  exported from,
- `files[]` — every published file's source path, category, and SHA-256,
- `determinismDigest` — a digest over the whole manifest, so two exports of
  the same source state agree on it independent of when they ran.

That is the entire provenance chain: a public tag names a manifest, and the
manifest names the private commit and every byte that came from it.

## How to verify a release is what it claims

You do not have to take any of the above on faith:

1. **Re-hash the tree.** `node .github/scripts/verify-provenance.mjs`
   recomputes the SHA-256 of every published file and compares it to
   [`export-manifest.json`](./export-manifest.json), and separately checks that no file exists on disk
   that the manifest doesn't name. This is what [`.github/workflows/provenance.yml`](./.github/workflows/provenance.yml) runs on
   every push and on a daily schedule.
2. **Re-run the verifiers.** `npm run verify` (or the four `verify:*` scripts
   individually — see [`README.md`](./README.md), "Verify it yourself") re-derives protocol
   claims from committed artifacts with nothing but `node`. This is what
   [`.github/workflows/verify.yml`](./.github/workflows/verify.yml) runs on every push and on a daily schedule.
3. **Rebuild it.** `pnpm install --frozen-lockfile && pnpm run build &&
   pnpm run typecheck && pnpm run test` is exactly what `.github/workflows/build.yml` runs on
   every push and pull request.

### What this does, and does not, establish

Re-hashing proves the tree hasn't moved since export. Re-running the
verifiers proves specific protocol claims independently. Neither proves the
export's original inclusion decision was correct — that something which
should have been withheld really was. That is a one-time editorial judgment
made by a human at export time, and re-deriving hashes after the fact cannot
recover a judgment call that was never encoded in bytes to begin with.

Two things this project does **not** yet do, stated plainly rather than
implied: commits and tags are not cryptographically signed, and releases do
not yet carry a build-provenance attestation (e.g. GitHub Artifact
Attestations / Sigstore) binding a release's bytes to the workflow run that
produced them. Both would strengthen this chain and are recommended as
future operator work — for the private promotion pipeline that decides a
release is ready, triggered by a human, never for the public CI in this
repository, which only ever verifies. Neither is in place today, and nothing
in this repository should be read as claiming otherwise.

**"Attested" must never be read as "audited," even once attestation exists,
because the two would prove different things:**

- **Attestation** would prove *this artifact was produced by that workflow,
  in that repository, at that commit* — a claim about the pipeline that
  produced the bytes.
- **[`export-manifest.json`](./export-manifest.json)**, checked today by [`.github/scripts/verify-provenance.mjs`](./.github/scripts/verify-provenance.mjs),
  proves *this tree is byte-for-byte what the private export produced, from
  that source commit* — a claim about the bytes themselves.
- **Neither proves the export's original inclusion decision was correct** —
  that a file which should have been withheld actually was. That is the same
  one-time editorial judgment named above, made once by a human at export
  time. No amount of hashing, re-deriving, or attesting after the fact
  recovers a judgment call that was never encoded in bytes to begin with.
