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

**It is not yet applied to anything in this release.** No file in this tree
currently states a rung — this release does not yet label components, and
that gap is worth knowing plainly rather than discovering by searching for a
rung and finding none. Until components carry explicit labels, read "What is
frozen" below as the operative list of what you may rely on today, and treat
everything else in this tree as unlabeled — neither promoted nor disclaimed —
rather than assuming a rung for it.

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
