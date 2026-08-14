# BCH Cloak — APNT public release

APNT (Aggregated Private Note Transfer) is a private note-transfer construction
for Bitcoin Cash. This repository publishes the **protocol and the means to
check it**: the relation and covenant sources, the canonical proof artifacts,
the frozen verifier descriptors, and independent checkers you can run yourself.

Everything here is MIT-licensed. See `LICENSE`.

---

## How this repository is released — a foundation, then named layers

This repository is not published as one drop of everything at once. It is
built up in **layers, like a house**, each one complete and checkable on its
own before the next is added:

| layer | name | gives you | 
| --- | --- | --- |
| `v0.1` | Foundation | the protocol itself — repo identity, specs, protocol primitives, covenant sources, chain I/O |
| `v0.2` | Verification | verifiers, pins, proofs — check it |
| `v0.3` | Reproduction | guest sources, canonical build — rebuild it yourself |
| `v0.4` | Product | console, `npx` — use it |

Layers are **cumulative**: `v0.2` stands on `v0.1` rather than beside it, so a
`v0.2` checkout contains `v0.1` too. No layer is ever silently missing
something the layer below it needs — [`export-manifest.json`](./export-manifest.json)'s own build gate
refuses a layer whose staged files import something the layer left out (see
"Provenance" below), so a layer that shipped is a layer that was actually
checked as a closed, standalone unit before it was published.

**This checkout may be Foundation only.** [`export-manifest.json`](./export-manifest.json)'s `layer`
field and each entry in `categories[]` say exactly which layer(s) are present
in the bytes you are holding — read that file, not this paragraph, for the
current truth. If it is `v0.1`, the sections below that describe verifiers,
guest sources or a build-and-typecheck-everything experience are describing
**what later layers add**, not what is necessarily in front of you right now;
each section says which layer it belongs to.

This is a deliberate, ongoing construction, not an abandoned or partial
repository: under-inclusion here is a release schedule, not a defect, and each
published layer already passed the same fail-closed promotion pipeline —
allowlist resolution, a private-material leak scan, import-closure checking,
a real install/build/typecheck/test gate, and independent verifier
execution — that governs a full release. No date is promised for when a later
layer ships; what is promised is that nothing ships before it is closed and
checked at its own layer.

---

## Read this first — what is and is not claimed

This project has a rule that a claim is published together with its limits.
Four limits apply to everything below.

1. **No production privacy is claimed.** Live exercises ran on **Chipnet**, a
   test network, with a **degenerate anonymity set** — a single operator and a
   handful of notes. What that demonstrates is a property of the
   *construction*, not achieved anonymity. Nothing here should be read as
   evidence that a real user was made private.

2. **A recorded design decision is not a measurement.** Where a document states
   reasoning, it is reasoning that was written down and dated. Where a number
   appears in a fixture or a certificate run, it came from an execution. The two
   are never presented as the same kind of thing.

3. **This is a curated subset, not the whole repository.** The tree was produced
   by a fail-closed export from a private repository against an explicit
   allowlist. [`export-manifest.json`](./export-manifest.json) records the source commit, and for every
   published file its source path, category and SHA-256. A file that is absent
   is absent on purpose.

4. **Not every published tree is a buildable project.** Some directories are
   published as **source for audit**, not as compiling crates or installable
   packages — see "What builds and what does not" below. Where that is the case
   it is stated rather than implied.

---

## What is here

The **Layer** column names the earliest release each path belongs to — see
"How this repository is released" above. Cumulative, so a `v0.2` checkout also
has every `v0.1` row; a `v0.1`-only checkout has only the first four rows and
that is complete at its own layer, not a partial copy of a bigger table.

| Path | What it is | Layer |
| --- | --- | --- |
| [`spec/`](./spec) | Normative capability specifications — the requirements the protocol must meet, in GIVEN/WHEN/THEN form. | `v0.1` |
| [`packages/protocol-runtime/src/`](./packages/protocol-runtime/src) | Protocol objects, byte codecs, commitment hashing, note trees, transition statements, seal and projection types. | `v0.1` |
| [`packages/protocol-runtime/src/cashassembly/`](./packages/protocol-runtime/src/cashassembly) | CashAssembly covenant sources — the on-chain locking bytecode, as written. | `v0.1` |
| [`packages/chain-io/`](./packages/chain-io) | The Fulcrum/Electrum client used to read chain state. Complete, node-builtins only. | `v0.1` |
| `tools/*-sp1/trusted/` | Frozen verifier descriptors: the trust anchors that pin what a proof is allowed to be. | `v0.2` |
| `tools/*-sp1/fixtures/` | Canonical Groth16 proof artifacts and certificate runs, with their READMEs. | `v0.2` |
| `tools/apnt-import-created-note-sp1/scripts/quotient-residue-regeneration/` | The CashVM Groth16 verification lane, and the independent checker below. | `v0.2` |
| `packages/reference-aggregator/tools/verify-apnt-*-independently-v0.mjs` | The other two independent checkers below (settlement projection, settlement-authorization covenant). | `v0.2` |
| `.claude/skills/verify-apnt/` | A skill that walks a contributor's agent through checking a proof, a settlement, a note commitment and a trust anchor. Ships with the verification surface it teaches, not with repo identity. | `v0.2` |
| `tools/*-sp1/program*/` | The **SP1 guest sources** — the relation body that the proofs are about. | `v0.3` |
| `tools/*-rust-parity/` | Rust implementations of the same relations, used to keep two independent languages honest about one specification. | `v0.3` |
| `tools/sp1-canonical-guest-build/` | The container-pinned guest build that makes a guest ELF, its length and its program VKey reproducible across checkouts. | `v0.3` |

---

## Verify it yourself

*(`v0.2` Verification and later. If [`package.json`](./package.json) has no `verify` script and
none of the paths below exist, this checkout is `v0.1` Foundation — read the
protocol and covenant sources instead; nothing here is missing by mistake.)*

Four checks run with **a bare `node` and nothing else** — no install, no
network, no build step. All four are executed by the export pipeline itself,
inside a filesystem-sandboxed copy of this tree, before the tree is allowed
to ship (`scripts/public-export/standalone-verify.mjs`'s
`runStandaloneVerifiers`), and the same four are what the release's build
gate runs a second time, for real, through `npm run verify` in a fully
installed copy of this tree, before promotion.

```sh
npm run verify:certificate-run-keying
npm run verify:certificate-run-retention
npm run verify:transition-settlement-projection-independent
npm run verify:settlement-authorization-covenant-independent

# or all four together:
npm run verify
```

Or directly:

```sh
node tools/apnt-import-created-note-sp1/scripts/quotient-residue-regeneration/assert-certificate-run-vkey-binding.mjs \
  --distinct-bodies "<runA>=<runB>" "<run>=<proof>=accept" "<run>=<otherProof>=reject"

node packages/reference-aggregator/tools/verify-apnt-transition-settlement-projection-independently-v0.mjs \
  --golden-vectors tools/apnt-private-note-transition-rust-parity/fixtures/typescript-golden-vectors-public-v0.json \
  --fixture-dir tools/apnt-private-note-transition-sp1/fixtures

node packages/reference-aggregator/tools/verify-apnt-settlement-authorization-covenant-independently-v0.mjs \
  --golden-vectors tools/apnt-private-note-transition-rust-parity/fixtures/typescript-golden-vectors-public-v0.json \
  --bytecode packages/reference-aggregator/fixtures/apnt-settlement-authorization-covenant-bytecode-v0.json
```

**What the keying check establishes.** For each certificate run it reads the
gate redeem script's own bytes and confirms that the baked public-values digest,
the baked **program VKey**, the baked statement digest and the runtime limb are
the ones belonging to the proof instance it claims — and that pairing the same
run with a *different* instance is **rejected**. It also confirms all twelve
stage bodies differ between the two runs, which is what a relabelled copy could
not do.

**What it does not establish.** It is a mixup detector, not a forgery detector:
it does not re-execute the CashVM transcript, and the per-stage acceptance flags
are read rather than re-run. The file's own header says so at length; read it
before quoting the result.

**What the retention check establishes.** That the published certificate runs
and proof artifacts are byte-identical to the digests pinned for them, so a
superseded artifact cannot be quietly swapped for a newer one.

**What the transition-settlement-projection check establishes.** It does not
import the code under test at all. From the wire bytes alone it re-implements
`sha256DomainSeparated`, re-parses the canonical proving input and statement,
re-derives `statementCommitment32` and `settlementProjection32`, requires both
to match the frozen golden vectors and every real proof fixture's committed
public values, and requires SP1's own masked committed-public-values scalar to
match what the Groth16 proof actually verified against — binding the
projection to the proof, not merely recording it beside it. It also grades a
mutation matrix: every covered transaction field must move the commitment,
and the deliberately excluded designated-verifier outpoint must not.

**What it does not establish.** Nothing about BN254 pairing execution, the
chunked CashVM verifier graph, chain validation, wallet acceptance or note
spendability. The chunked verifier graph is still bound to the previous guest
identity and is out of scope for this phase by design.

**What the settlement-authorization-covenant check establishes.** The same
from-wire-bytes re-derivation as above, PLUS: it reads the landed CashAssembly
template and the landed builder's compiled bytecode from disk, disassembles
the redeem script, and requires it to embed the independently re-derived
110-byte constant prefix and transcript head, to use exactly one `OP_SHA256`
and zero `OP_HASH256`, and to end by comparing against its own input's token
commitment. It re-derives `L_verdict` as hash256 over that redeem bytecode and
requires it to equal the pinned deployment constant, and confirms the
aggregate branch is the witness-index variant that fits the 201-byte standard
locking limit.

**What it does not establish.** Nothing about BN254 pairing execution, the
chunked verifier graph, VM acceptance, chain validation, wallet acceptance, or
note spendability. VM acceptance is the test suite's claim; this tool checks
only the byte construction and arithmetic that claim rests on.

---

## What builds and what does not

- **[`packages/chain-io/`](./packages/chain-io)** (`v0.1`) is complete: both sources, its
  [`packages/chain-io/tsconfig.json`](./packages/chain-io/tsconfig.json), its [`packages/chain-io/package.json`](./packages/chain-io/package.json), and its test files. It needs only
  TypeScript, `@types/node` and `vitest`, all declared as `devDependencies`.
  It is the **only `pnpm` workspace member** this repository ships — so it is
  also what makes `pnpm -r build` / `typecheck` / `test` real rather than
  vacuous at every layer, including `v0.1` on its own. Whether this checkout's
  test leg actually ran a nonzero number of files is recorded plainly in
  [`export-manifest.json`](./export-manifest.json)'s `generation.buildGate` (`testFilesRun`); a build
  gate that ran zero test files is a **refusal**, recorded as `FAILED`, never
  a silent pass — see `scripts/public-export/build-gate.mjs` if you want the
  exact rule.
- **[`packages/protocol-runtime/src/`](./packages/protocol-runtime/src)** (`v0.1`) is a **partial** module set,
  published for reading. Modules whose text would have required a waiver in
  the export's private-material scan were excluded, and with them the package
  barrel and its `package.json`. It is not a `pnpm` workspace member and does
  not compile as an installable npm package in this tree — no `package.json`
  is shipped that would claim otherwise — but it IS typechecked directly
  against its own [`packages/protocol-runtime/tsconfig.json`](./packages/protocol-runtime/tsconfig.json) by the build gate on every release, at
  every layer that includes it (`v0.1` and up).
- **`tools/*-sp1/program*/`** (`v0.3`) and the Rust parity crates are
  published as **guest and relation source for audit**. Their Cargo manifests
  still name path dependencies and test modules that were not published, so
  `cargo build` in this tree will not resolve. Read them; do not expect them
  to compile here.
- **Nothing in this tree proves anything.** Proving orchestration — provers,
  runners, cost probes and fixture generators — is deliberately not published
  at any layer. The proofs are here (`v0.2`); the machine that made them is
  not.

---

## Credits

The CashVM Groth16 verification lane builds on work by **mr-zwets**:
`groth16_cashscript`, the `cashscript` compiler-optimizations fork, and
`zk-verifier-bench`. See [`THIRD-PARTY-NOTICES.md`](./THIRD-PARTY-NOTICES.md). The CashScript compiler is
MIT, © 2019 Rosco Kalis.

---

## Provenance

[`export-manifest.json`](./export-manifest.json) is the authority on what this tree is:

- `layer` — which named layer this checkout is (`"v0.1"`, `"v0.2"`, …), or
  `null` for a full export carrying every published category at once. This is
  the field to check before assuming a section of this README applies to what
  you are actually holding.
- `source.commit` — the private-repository commit these bytes came from.
- `categories[]` — every category this checkout publishes, each with its own
  `layer`.
- `files[]` — every published file with its source path, category and SHA-256.
  Re-hash them to detect any post-export modification.
- `pathMap` — the source-to-public path rewrites.
- `determinismDigest` — a digest over everything above; two exports of the same
  source state AND the same requested layer agree on it.
