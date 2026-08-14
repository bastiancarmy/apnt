# AGENTS.md — instructions for contributors and their agents

This file is for anyone working on this repository, human or agent. It is not
a copy of anything private: it is written for a stranger who has cloned this
tree and wants to know what they can rely on, what they can touch, and how to
check any of it without trusting the people who published it.

## What this repository is

`apnt` is a curated, MIT-licensed release of APNT (Aggregated Private Note
Transfer), a private note-transfer construction for Bitcoin Cash. It is
produced by a fail-closed export from a private research repository — see
[`export-manifest.json`](./export-manifest.json) and the top-level [`README.md`](./README.md) for exactly what that
means and what it does not.

This repository publishes **the protocol and the means to check it**: relation
and covenant sources, canonical proof artifacts, frozen verifier descriptors,
and independent checkers you can run yourself.

## What this repository is not

- It is **not the aggregator implementation**. Proving orchestration, provers,
  runners, cost probes, fixture generators, and the operator's live-round
  tooling are deliberately withheld. The proofs are here; the machine that made
  them is not.
- It is **not a live mirror** of the private repository. It advances only
  through a deliberate promotion, one export commit at a time. A component
  missing here may simply not have been promoted yet — absence is not always a
  verdict on the component.
- It is **not a claim of production privacy**. Everything that has run on
  Chipnet ran with a degenerate anonymity set (a single operator, a handful of
  notes). See "The non-claims, restated" below.

## The maturity ladder

This is the intended vocabulary for describing what a component is safe to
depend on:

| rung | means | may you depend on it? |
|---|---|---|
| `experimental` | a spike; may vanish | no — not promoted at all |
| `preview` | published for review; shape may still change | read it, don't build on it |
| `stable` | supported; changes are additive and announced | yes |
| `frozen` | identity pinned forever (relation IDs, covenant bytes, semantic contracts) | yes, and it will never move |
| `superseded` | replaced; retained so old artifacts stay verifiable | verify old artifacts against it only |
| `retired` | fails closed by design | no — kept to document the refusal |

**Applied so far: every versioned module under `packages/protocol-runtime/src/`
that this release publishes** — the 32 `_v<N>` TypeScript modules and the 5
CashAssembly sources (extension "casm") under
`packages/protocol-runtime/src/cashassembly/`, 37 files in total. Each one
carries a short `// Maturity: <rung> — <reason>` (or `/** ... */`) comment
naming the specific artifact or `npm run verify:*` command the rung claim
rests on. **Nothing else in this tree is labelled yet** — every other
published path (specs, `chain-io`, the SP1 tool trees, the checkers
themselves) is still unlabeled, neither promoted nor disclaimed, exactly as
before. Read
"What is frozen" below as the operative list of what you may rely on for
anything this table doesn't cover.

The table below is the measured result, derived (not asserted) by grepping
this checkout's own published import graph, its published fixtures and
trusted descriptors for the wire-format magic and relation identities each
module owns, and the two `verify:*` commands that check statement bytes
literally. Layer is `v0.1` for every row (`packages/protocol-runtime/src/` is
a `v0.1` Foundation path); "depended on by" lists published evidence only —
a private-repo consumer that isn't exported here doesn't count. Every path
below is written in full so it resolves for a reader of this tree, not as a
bare filename.

| Module | Rung | Depended on by (published evidence) |
|---|---|---|
| `packages/protocol-runtime/src/apnt_transition_statement_v1.ts` | `frozen` | APNTTSV1 magic required literally by `verify:transition-settlement-projection-independent` and `verify:settlement-authorization-covenant-independent`; pinned in the v0.2 Verification golden-vectors fixture (tools/apnt-private-note-transition-rust-parity/fixtures/, not staged until v0.2) |
| `packages/protocol-runtime/src/apnt_transition_settlement_projection_v0.ts` | `frozen` | its statementCommitment32/settlementProjection32 derivation is what `verify:transition-settlement-projection-independent` re-derives and checks against every real proof fixture |
| `packages/protocol-runtime/src/apnt_settlement_authorization_covenant_v0.ts` | `frozen` | source of the pinned v0.2 Verification bytecode fixture (packages/reference-aggregator/fixtures/, not staged until v0.2); its L_verdict is checked by `verify:settlement-authorization-covenant-independent` |
| `packages/protocol-runtime/src/apnt_verifier_factory_v0.ts` | `frozen` | builds the CashVM verifier profile identity 0bf091d8…354c named frozen in "What is frozen" below |
| `packages/protocol-runtime/src/cashassembly/apnt_settlement_authorization_covenant_v0.casm` | `frozen` | disassembled and matched byte-for-byte by `verify:settlement-authorization-covenant-independent` |
| `packages/protocol-runtime/src/cashassembly/apnt_created_note_seal_aggregate_branch_v0.casm` | `frozen` | read by the frozen SAC module above; its witness-index shape is checked by the same command |
| `packages/protocol-runtime/src/cashassembly/apnt_verifier_factory_v0.casm` | `frozen` | the template the verifier-factory module above reads to build the identity above |
| `packages/protocol-runtime/src/apnt_creation_scope_v1.ts` | `stable` | sole creation-scope consumed by the frozen transition-statement-v1 module above |
| `packages/protocol-runtime/src/apnt_transaction_projection_v1.ts` | `stable` | 9 published protocol-runtime modules import it |
| `packages/protocol-runtime/src/apnt_bundle_backed_private_note_v1.ts` | `stable` | 11 published protocol-runtime modules import it |
| `packages/protocol-runtime/src/apnt_cashassembly_compiler_v0.ts` | `stable` | imported by all 4 published covenant builders |
| `packages/protocol-runtime/src/apnt_created_note_seal_v0.ts` | `stable` | current single seal implementation; no `verify:*` command exercises it yet |
| `packages/protocol-runtime/src/apnt_created_note_seal_exit_branch_v0.ts` | `stable` | imported by the seal module above; no `verify:*` command exercises it yet |
| `packages/protocol-runtime/src/cashassembly/apnt_created_note_seal_v0.casm` | `stable` | compiled by the module above; no `verify:*` command exercises it yet |
| `packages/protocol-runtime/src/cashassembly/apnt_created_note_seal_exit_branch_v0.casm` | `stable` | compiled by the module above; no `verify:*` command exercises it yet |
| `packages/protocol-runtime/src/apnt_transition_statement_v0.ts` | `superseded` | superseded by v1 above; its `serializeAPNTTransitionOutpointV0` helper is still imported by the creation-scope-v1, creation-scope-v2 and nullifier-v0 modules below |
| `packages/protocol-runtime/src/apnt_transition_statement_v2.ts` | `preview` | no `verify:*` command checks APNTTSV2 (both require APNTTSV1); its one importer is itself unreferenced |
| `packages/protocol-runtime/src/apnt_creation_scope_v2.ts` | `preview` | feeds only the preview v2 statement above |
| `packages/protocol-runtime/src/apnt_transition_settlement_projection_v2_adapter.ts` | `preview` | zero published importers |
| `packages/protocol-runtime/src/apnt_import_created_note_statement_v0.ts` | `preview` | zero published importers; no published artifact references its APNTISV0/APNTIPV0 magic (relation v0's own identity is frozen, but this encoding isn't exercised here) |
| `packages/protocol-runtime/src/apnt_import_created_note_statement_v1.ts` | `preview` | zero published importers; no published artifact references its APNTISV1 magic (relation v1's own identity is frozen, but this encoding isn't exercised here) |
| `packages/protocol-runtime/src/apnt_import_creation_scope_v0.ts` | `preview` | only importer is the preview statement above |
| `packages/protocol-runtime/src/apnt_import_creation_scope_v1.ts` | `preview` | only importer is the preview statement above |
| `packages/protocol-runtime/src/apnt_import_current_transaction_projection_v0.ts` | `preview` | zero published importers |
| `packages/protocol-runtime/src/apnt_import_settlement_projection_v0.ts` | `preview` | zero published importers |
| `packages/protocol-runtime/src/apnt_aggregation_transition_output_v0.ts` | `preview` | zero published importers |
| `packages/protocol-runtime/src/apnt_aggregation_validity_model_v0.ts` | `preview` | zero published importers |
| `packages/protocol-runtime/src/apnt_bch_asset_id_v0.ts` | `preview` | zero published importers |
| `packages/protocol-runtime/src/apnt_bch_standard_policy_limits_v0.ts` | `preview` | zero published importers |
| `packages/protocol-runtime/src/apnt_lifecycle_acceptance_policy_v0.ts` | `preview` | zero published importers |
| `packages/protocol-runtime/src/apnt_privacy_risk_non_claim_report_v0.ts` | `preview` | zero published importers |
| `packages/protocol-runtime/src/apnt_private_note_transition_relation_v1_contract.ts` | `preview` | zero published importers |
| `packages/protocol-runtime/src/apnt_transition_validity_model_v0.ts` | `preview` | zero published importers |
| `packages/protocol-runtime/src/apnt_value_conservation_model_v0.ts` | `preview` | zero published importers |
| `packages/protocol-runtime/src/apnt_spend_authority_v0.ts` | `preview` | its 2 importers (bundle-nullifier-v1, nullifier-v0, both below) are themselves unreferenced |
| `packages/protocol-runtime/src/apnt_bundle_nullifier_v1.ts` | `preview` | zero published importers |
| `packages/protocol-runtime/src/apnt_nullifier_v0.ts` | `preview` | zero published importers |

A specific flag for anyone auditing this table:
`packages/protocol-runtime/src/apnt_import_created_note_statement_v0.ts` was
named as a deletion candidate during this review, on the theory that it
looked like an R&D leftover. Measurement showed zero published importers and
zero published artifacts pinning it — but the same is true of 20 other files
above, and **none of them were deleted**, because a proof of a relation
version stays a proof of that version forever: the import-created-note
relation's v0 and v1 identities are frozen (see "What is frozen" below) with
real Chipnet-adjacent fixtures pinned against them, even though the
TypeScript statement/scope wrappers that structurally describe those
relations aren't currently exercised by anything this release publishes.
`preview` here means exactly what the ladder says — read it, don't build on
it — not "safe to remove."

## What is frozen — never modify this in a PR

The following identities are load-bearing. Proofs, on-chain artifacts, and
independently-run verifiers all pin against them. A PR that changes one of
these is **a proposal for a new, successor identity**, not a fix, and needs
discussion before any code lands.

**A note on what you can check today.** This repository is released in
layers (see the top-level [`README.md`](./README.md), "How this repository is released").
The trust anchors, proof fixtures and `npm run verify:*` commands cited below
belong to `v0.2` Verification. If this checkout's [`export-manifest.json`](./export-manifest.json) has
no `verifier-surface` category, none of them are staged yet — the identities
below are still real and still frozen, but nothing here asks you to take a
proof on faith in the meantime, because this release contains no proofs to
take on faith. Come back to this section once you're holding `v0.2` or later.

- **Relation identities** — the versioned semantics a proof is a proof *of*:
  `apnt-import-created-note-relation-v0`, `-v1`, `-v2`, and `-v4`, and
  `apnt-private-note-transition-relation-v0` (see `tools/*-sp1/trusted/*.json`
  for their pinned `programVkeyHash` and `guestElfSha256`), plus the smaller
  `apnt-note-commitment-preimage-v0` relation. **Note on v4:** its fixtures
  (`tools/apnt-import-created-note-sp1/fixtures/canonical-groth16-proof-v4.json`
  and both v4 certificate runs) are staged, and it is what
  `npm run verify:certificate-run-keying` actually exercises — but no
  `trusted/import-created-note-groth16-verifier-v4.json` descriptor is staged
  alongside them. Its pinned identity is only recoverable from the v4
  fixture's own `proof.programVkeyHash` field, not from a dedicated trust
  anchor; see the `verify-apnt` skill, §4, for what that means for checking it.
- **A pinned CashVM verifier profile identity**
  `0bf091d8e7036ae834cfdf9113ffe4ff240946a0e0167d60cb911924af01354c` — the
  hash over a derived direct-P2S verifier ladder for the import relation, read
  from `canonicalCashVmVerifierProfileIdentity` in
  `tools/apnt-import-created-note-sp1/trusted/import-created-note-groth16-verifier-v1.json`.
  State this precisely. It is a derived and pinned identity, and it is frozen
  for that reason.

  **It has gated a chain-confirmed Chipnet settlement.** The fixture record in
  the private source repository — a file that is deliberately not published here,
  so you cannot check this citation against this tree — states that the V1 proof
  under this profile is
  *"the proof that gated the first live private note settlement,
  `49869f93b6c78d702772dcda8bbed9eb40c8690fc47465c7a38dfad2c067219b`"*, and an
  independent audit re-derived that profile's eleven verifier-stage locking
  bytecodes and matched all eleven, byte for byte, against inputs 1–11 of that
  transaction.

  Two limits travel with that, and both matter more than the achievement:

  - That settlement's created outputs are **54-byte `APNT1PB` outputs, not
    128-byte seals.** They carry **no exit branch** and are **permanently
    unspendable**. Nothing in this or any later release rescues them. Do not
    read "notes are backed by UTXOs you can always exit" backwards onto that
    settlement — it is not true of those outputs.
  - Chipnet only. No mainnet deployment of this profile exists.

  **Correction, 2026-08-13.** An earlier version of this file stated the
  opposite — *"it is not a claim that a chain-confirmed settlement has been
  gated on it. None has, as of this release."* That was **false**, and it was
  introduced by a pass whose commit message was "fix false settlement claims":
  a correction that over-corrected past the truth. The original error
  over-claimed; the correction under-claimed; both were produced the same way,
  by generalising a scoped fact into a bare universal ("none has") with no named
  subject. It is recorded here rather than quietly rewritten because this
  repository asks readers to check its claims, and a reader who checked this one
  against the published fixture would have caught it.
- **Semantic-contract commitments** — each `tools/*-sp1/trusted/*.json` descriptor's
  `semanticContractCommitment` field. It is derived from the relation's frozen
  contract descriptor, not restated as a bare literal; treat any code path
  that recomputes a different value as a bug, not as license to edit the pin.
- **Pinned trust anchors** — every file under a `tools/*-sp1/trusted/` or
  `tools/*/trusted/` directory. These are the descriptors that say what a
  proof is *allowed to be*: program VKey, guest ELF digest, Groth16
  verification-key digest, public-values layout.
- **Committed proof fixtures** — everything under a `tools/*-sp1/fixtures/`
  directory (`canonical-groth16-*.json`, certificate runs, and their
  [`README.md`](./README.md)s). These are the artifacts the independent verifiers check
  against; swapping one silently is exactly the tampering the retention
  checker (`npm run verify:certificate-run-retention`) exists to catch.

If your change would move any of these, open the discussion first — as an
issue or a spec proposal under [`openspec/`](./openspec) (see [`openspec/README.md`](./openspec/README.md)) — rather
than as a diff. Superseding an identity is a legitimate outcome; silently
editing it out from under artifacts that were proved under it is not, because
those artifacts must stay verifiable forever (`superseded`, not deleted).

## The honesty bar a PR must meet

This project has one rule about claims, applied without exception: **a claim
is published together with its limits, and both halves are stated together,
always.** Concretely, in any PR description, code comment, or doc change:

- If you state a number, you ran the thing that produced it. Say what you ran.
- A recorded design decision is not a measurement. If a document states
  reasoning rather than a result, say so; don't let it read like a result.
- Nothing simulated is described as live, and nothing live is described as
  simulated. If a run happened on Chipnet, say Chipnet; if it's a synthetic
  fixture, say synthetic.
- A measured number cites what produced it — the command, the fixture, the
  commit — well enough that someone else could reproduce or refute it.
- Both halves of a claim ship together: what a check establishes, and what it
  explicitly does **not** establish. Every independent verifier in this tree
  states its own non-claims in its header comment; new ones should too.

An honest "not verified" is always a better contribution than a confident
guess. If you couldn't run something, say so plainly.

## What you can run — start with *capabilities.json*

*(Proposed for the `repo-metadata` category, not yet staged in this export's
allowlist. The guarantees below describe the generator's contract; check
`export-manifest.json` for whether this checkout actually carries the file
yet.)*

Any agent working in this repository should read *capabilities.json*, at the
repository root, before trying to guess what a command does. This applies
regardless of which vendor's agent you are: the file's schema is deliberately
plain — a `command` string, `establishes`/`doesNotEstablish` arrays,
`requiresNetwork`/`offline` booleans, a `layer` string, a measured
`runtimeMs` — with no vendor-specific vocabulary, so a CI job or a different
assistant can consume it exactly as well as this one can.

Two things it guarantees:

- **It is generated, never hand-written.** `establishes` and
  `doesNotEstablish` are harvested from each command's own output at
  generation time — the JSON-emitting verifiers' own `notEstablishedHere` /
  `nonClaims` fields, or (for the two certificate-run checks, which print no
  JSON) that script's own header comment, extracted fresh every time. A
  hand-maintained list of "what each command establishes" drifts the moment a
  verifier changes; this file cannot, because nobody types it.
- **`doesNotEstablish` must be reported, not dropped.** If you relay a
  command's result to the person you're working for, its
  `doesNotEstablish` entries travel with it. Reporting only what a check
  established is exactly the honesty-bar violation "The honesty bar a PR must
  meet" above exists to prevent — dropping the limit is not a shortcut, it is
  the specific mistake this file is designed to make impossible to miss.

`npm run capabilities` prints it human-readably; for clean JSON, run
*capabilities.mjs* with `--json` directly (the `npm run` wrapper prints its
own banner to stdout first). Cross-reference each entry's `layer` against
this checkout's own `export-manifest.json` (`layer` field) to know whether
that command's files are actually staged here — *capabilities.mjs* does this
automatically and marks unstaged entries `[NOT STAGED IN THIS CHECKOUT]`
rather than omitting them, on the view that an agent who knows a capability
exists but isn't staged here can tell the person they're helping something
useful ("that check exists, but this is a Foundation-only checkout — here's
what layer to fetch"), where an agent who never saw the entry can only fail
opaquely.

The `verify-apnt` skill at `.claude/skills/verify-apnt/SKILL.md` (`v0.2`
Verification and later — see "A note on what you can check today" above) is
a convenience wrapper over this same surface for one agent vendor's skill
mechanism — it points at *capabilities.json* and at the verifiers directly.
The dependency runs only one way: *capabilities.json* and the `npm run`
scripts are the complete, usable interface on their own, and stay that way
whether or not that skill directory exists in your checkout.

## How to verify things yourself

*(`v0.2` Verification and later — see "A note on what you can check today"
above. If this checkout is `v0.1` Foundation, none of the following is staged
yet; read on so you know what to come back for.)*

Don't take any of the above on faith. Two checks run with a bare `node` and
nothing else — see the top-level [`README.md`](./README.md)'s "Verify it yourself" section
for exact commands (`npm run verify:certificate-run-keying`,
`npm run verify:certificate-run-retention`), and for what each one does and
does not establish.

For a broader independent-verification workflow — checking a Groth16 proof
artifact, checking a settlement transaction against chain by a path that does
not go through this repository's own client, re-deriving a note commitment
from its wire fields, or confirming a pinned trust anchor against its
published descriptor — see the `verify-apnt` skill at
`.claude/skills/verify-apnt/SKILL.md`, published together with the
verification surface it checks. It is written so a contributor's agent can
run these checks without being taught the codebase first, and every command
in it names a real file in this tree and was actually run to produce the
output shown.

## The non-claims, restated

Repeating the top-level [`README.md`](./README.md)'s four limits, because they apply to every
contribution too, not only to the artifacts already published:

1. **No production privacy is claimed.** Live exercises ran on Chipnet with a
   degenerate anonymity set. That demonstrates a property of the
   *construction*, not achieved anonymity for a real user.
2. **A recorded design decision is not a measurement.** Reasoning that was
   written down and dated is not the same kind of thing as a number that came
   from an execution. Keep them visibly distinct in anything you write.
3. **This is a curated subset, not the whole repository.** A file that is
   absent from this tree is absent on purpose; [`export-manifest.json`](./export-manifest.json) records
   what was published and from where.
4. **Not every published directory is a buildable project.** Some are
   published as source for audit only. See "What builds and what does not" in
   the top-level [`README.md`](./README.md) before assuming `cargo build` or an npm install
   will succeed somewhere it hasn't been stated to.
