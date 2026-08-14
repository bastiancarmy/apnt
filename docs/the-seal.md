# The seal: 128 bytes, two branches, one non-custodial floor

Every APNT private note is backed by one or more on-chain UTXOs locked by
this script — the "seal." It is 128 bytes, it is bare on-chain (not hidden
behind a P2SH32 hash), and its defining property is that **you never need
anyone's permission to get your money out of it.**

Sources: [`packages/protocol-runtime/src/cashassembly/apnt_created_note_seal_v0.casm`](../packages/protocol-runtime/src/cashassembly/apnt_created_note_seal_v0.casm),
[`packages/protocol-runtime/src/cashassembly/apnt_created_note_seal_exit_branch_v0.casm`](../packages/protocol-runtime/src/cashassembly/apnt_created_note_seal_exit_branch_v0.casm),
[`packages/protocol-runtime/src/cashassembly/apnt_created_note_seal_aggregate_branch_v0.casm`](../packages/protocol-runtime/src/cashassembly/apnt_created_note_seal_aggregate_branch_v0.casm)
— all three published in this export. Design-record citations below (design.md,
for the covenant's target architecture) are to the private repository's
`openspec/changes/archive/2026-08-13-define-apnt-private-spend-covenant-v0/design.md`,
which is not currently on the publication allowlist; those figures are
reproduced here rather than independently re-checkable from this tree today.

## Lead with the floor: the exit branch

The seal is `OP_IF <aggregate branch> OP_ELSE <exit branch> OP_ENDIF`. Read
the exit branch first, because it is the one that matters most: it is a
plain, ordinary, fully transparent BCH spend authorized by one Schnorr
signature over a one-time key.

> No proof verification, no covenant delegation, no transaction
> introspection, no token introspection, no aggregator, no prover, no relay,
> no counterparty.
> — [`packages/protocol-runtime/src/cashassembly/apnt_created_note_seal_exit_branch_v0.casm`](../packages/protocol-runtime/src/cashassembly/apnt_created_note_seal_exit_branch_v0.casm)

That is the non-custodial floor the whole protocol stands on: a note holder
is never dependent on this project's software, its aggregator, or any other
party being alive, honest, or online to move their own funds.

```text
witness on entry:        [ signature65, exitPublicKey33 ]

OP_DUP OP_SHA256 <exitKeyHash32> OP_EQUALVERIFY   -- key matches the committed one-time key
OP_SWAP OP_SIZE <65> OP_NUMEQUALVERIFY             -- exactly 64-byte Schnorr sig + 1 sighash byte
OP_DUP <64> OP_SPLIT OP_NIP 0x01 0x41 OP_EQUALVERIFY -- sighash byte is exactly SIGHASH_ALL|FORKID
OP_SWAP OP_CHECKSIG                                -- the one deliberate on-chain signature check
```

Two requirements here are load-bearing and easy to miss in a looser
description:

- **Exactly 65 signature bytes** forces a Schnorr signature (not DER-encoded
  ECDSA), which makes the spend deterministically sized for fee planning and
  removes signature malleability.
- **The trailing sighash byte must be exactly `0x41`.** Without this check a
  spender could sign `SIGHASH_NONE` or `SIGHASH_SINGLE` — both otherwise
  accepted by the VM's own signature-encoding rules — and let a miner or
  relay redirect the exit output. This comparison is the only thing that
  rejects them.

**Measured trap, not a hypothetical one:** `OP_CHECKSIG`'s covered bytecode
is the *entire* locking script it executes under — the full 128-byte seal —
not the 51-byte exit branch in isolation. A signature produced against the
bare branch does not validate once it is wrapped in the real
`OP_IF/OP_ELSE/OP_ENDIF` seal; the reference-aggregator's independent
verification module executes exactly that rejection so this is a measured
fact, not a comment.

**BCH's `OP_CHECKSIG` is EC-Schnorr-SHA256 as specified for Bitcoin Cash,
not BIP-340.** The challenge is `SHA256(r ‖ compressedPubkey33 ‖ m)` and
requires `R.y` to be a quadratic residue — not the "even y" rule BIP-340
uses. A real BIP-340 signature by the correct key over the correct digest is
rejected by the real BCH 2026 VM (`NULLFAIL`, measured). A wallet-side
signer for this branch needs a BCH-Schnorr-capable signer, not a generic
BIP-340/Taproot library.

**The cost of taking this floor:** exercising the exit branch is public and
transparent by construction. It **forfeits the privacy the aggregate path
provides** — the exit key, the note amount and the exit target are all
published. That is a stated protocol limitation, not a defect: it exists
specifically so the floor works even when nothing else does.

## The other half: delegate, don't duplicate

The aggregate branch does not verify a proof, does not check spend
authority, and performs no transaction reconstruction itself. It requires
only that a designated input in the *same* transaction carries the
deployment's pinned verifier token category and is locked by the pinned
settlement authorization covenant (`L_verdict`):

```text
witness on entry: [ designatedVerifierInputIndex ]

OP_DUP
OP_UTXOTOKENCATEGORY <C_verifier> OP_EQUALVERIFY   -- that input carries the pinned verifier category
OP_UTXOBYTECODE <L_verdict> OP_EQUAL               -- and is locked by the pinned settlement covenant
```

Everything else rides on that one input: the settlement authorization
covenant at `L_verdict` requires the whole spending transaction to equal the
projection committed inside the verdict NFT, and that NFT can only exist by
having been threaded through a completed proof-verifier run. This is the
**witness-index variant** (74 bytes), adopted over an earlier last-input
design (76 bytes) because two of the four canonical statements place the
verifier input at index 2, not last — the witness-index script is correct
at any index, and is sound precisely because whichever index is named must
still carry the pinned category and the pinned covenant, so it must be a
genuine verdict input.

## The arithmetic

```text
OP_IF (1) + aggregate branch (74) + OP_ELSE (1) + exit branch (51) + OP_ENDIF (1) = 128 bytes
```

Against `maximumStandardLockingBytecodeLength = 201` on the real BCH 2026
VM. An earlier design draft recorded 130 bytes, summing a since-superseded
76-byte last-input aggregate branch; 128 is the seal that ships. **Both
branches are simultaneously live for the whole lifetime of a seal** — a
recipient can broadcast an exit while an aggregate settlement for the same
seal is in flight, and whichever confirms first wins; the other becomes
invalid because it spends an already-consumed outpoint. That is a liveness
consideration for aggregators, not a fund-security one.

This is a **bare direct-P2S locking script**, not a P2SH32 wrapper, and that
is deliberate: both branches are therefore visible on-chain at
note-creation time, before anyone spends anything. Any observer can read a
created seal's output script and confirm an exit branch exists and which
key it commits to. Behind a P2SH32 hash the branches would stay hidden
until spend time, and the mandatory-exit property would only be checkable
in-circuit.

## Two enforcement levels, both real

design.md for the covenant describes two enforcement levels for "a seal
must always carry a conforming exit branch": on-chain visibility at
creation (what the bytecode above gives you for free), and an in-circuit
check that every accepted transition recomputes the seal template and
requires byte equality with what was actually created. Both are landed:

- `packages/protocol-runtime/src/apnt_created_note_seal_skeleton_v0.ts`
  exports `matchApntCreatedNoteSealV0`, a fixed-offset byte matcher against a
  pinned 128-byte skeleton with a single 32-byte hole. It is called from
  `packages/protocol-runtime/src/apnt_private_note_transition_relation_v0.ts`
  and from the import relations
  (`packages/protocol-runtime/src/apnt_import_created_note_relation_v3.ts`,
  `packages/protocol-runtime/src/apnt_import_created_note_relation_v4.ts`),
  and from the v1 structural validator, and fails closed — a mismatch returns
  `CREATED_SEAL_TEMPLATE_MISMATCH` / `created-seal-template-mismatch` and
  rejects the transition.
- The Rust parity crate (`match_created_note_seal` /
  `match_created_note_seal_v0`) implements the identical check, and it is
  reachable from the **actual proven SP1 guests**:
  `tools/apnt-private-note-transition-sp1/program/src/main.rs` calls
  `evaluate_proving_input_bytes_v0`, which reaches it; the V4 import guest
  (`tools/apnt-import-created-note-sp1/program-v4/src/main.rs`) calls
  `evaluate_complete_proving_input_bytes_v4`, which reaches
  `match_created_note_seal_v0` and fails closed the same way.

**This document's earlier draft found the seal `.casm` source's own header
comment out of date** — at the time, it still read "deliberately NOT
implemented anywhere in this repository," contradicting
[`packages/protocol-runtime/src/apnt_created_note_seal_v0.ts`](../packages/protocol-runtime/src/apnt_created_note_seal_v0.ts)'s own "both levels now exist," with both
files published side by side. That contradiction has since been fixed at
the source: the `.casm` header now states plainly that both levels exist,
names apnt_created_note_seal_skeleton_v0.ts (cited in full above) as where
the second one lives,
and records the correction explicitly rather than silently rewriting the
old text — including naming the specific defect: "anywhere in this
repository" was a bare universal claim with no named subject, where the
accurate scoped statement would have been "not implemented in the
transition relation at the time of writing." So both levels are real:
on-chain, any observer can verify the exit branch exists; in-circuit, no
accepted transition or import can create a seal without one — and the two
published source files that describe this no longer disagree with each
other.

**What you can check, and at which layer.** The `.casm` templates are published
at `v0.1` Foundation, so the seal's own bytes are checkable in any checkout.
The guest entry points
(`tools/apnt-private-note-transition-sp1/program/src/main.rs`,
`tools/apnt-import-created-note-sp1/program-v4/src/main.rs`) arrive at `v0.3`
Reproduction, and the trust-anchor descriptors at `v0.2` Verification — if your
[`export-manifest.json`](../export-manifest.json) records `layer: "v0.1"`, those files are not in this
checkout and you cannot confirm the call chain here yet. **Not yet in this
export:** the relation crates those entry points call into
(`tools/apnt-private-note-transition-rust-parity/src/lib.rs`,
`tools/apnt-import-created-note-rust-parity/src/relation_v4.rs`) and the
TypeScript relation/skeleton modules cited above are not currently on the
publication allowlist, so the specific `match_created_note_seal` call sites
described here are drawn from the private repository and are not yet
independently re-checkable from this tree alone.

## What is still genuinely open

- **The recipient-generated exit key `E` does not yet reach the payer
  through the real descriptor transport.** `E` is a sibling field on the
  generated receive descriptor, not encoded inside the `bchcloak:` string
  itself — a payer holding only that string cannot yet build a conforming
  seal from it alone.
- **A partial exit can strand a multi-cell note's other backing cells.**
  Each cell's seal is independently spendable on its own exit branch, with
  no all-bundle-members condition. It cannot inflate value, but it can leave
  the rest of a note as backing that no longer forms a complete note.

## The honest privacy cost

Exit authority is **per backing cell, not per note**, and that is a privacy
requirement, not an optimization: a per-note exit key would give every
backing cell of one logical note byte-identical locking bytecode outside
its variable region, publishing the note-to-cell partition that this
protocol's minimum-cells-per-note rule exists to hide. But this does not
make multi-cell exits free of that leak by a different route:

**A multi-cell `wallet exit` publishes that note's cell partition through
common-input ownership.** A single-cell exit reveals nothing about how a
note is partitioned. Exiting `k ≥ 2` cells of the same logical note in one
transaction reveals it — the transaction's own inputs, signed together,
are visibly co-owned regardless of each cell's independently-keyed seal
bytes.

At the current 2,000-sat cell denomination, on-chain verification is not
free relative to the value it moves — and an earlier draft of this document
understated that cost by roughly 5×, by quoting a figure the source itself
had already retracted. Corrected in full below, because getting this wrong
in this specific direction is the worst kind of error a document about
honest costs can make: it makes the tradeoff look mild in the protocol's own
favor.

design.md §6 costs a real built batch (26 backing cells consumed, 15
recovery carriers, the SAC and its 32-transaction chunked verifier chain) at
**≈283.6 KB of total on-chain footprint**, ≈283,600 sats at 1 sat/byte. It
then extrapolates: "against ... the SAC's ~166-input unroll ceiling, a
maximal batch carries ≈332,000 sats of value ... spread over 166 notes it is
≈1,710 sats (roughly one US cent) per note." **That 166 figure is not usable
— it is the exact quantity a later correction in the same document
retracts.** design.md §1.1.6a correction 4 states the §1.1.3-derived
"~166/166 unroll ceiling do not hold once the real transcript is built,"
names `maximumStackItemLength` (10,000 bytes) as the ceiling that actually
binds, and calls it "the real limit on usable `MAX_OUTPUTS`, not the ~166
figure." The "Decisions made" section that follows pins the real measured
bound: **`MAX_OUTPUTS = 32`** (and `MAX_INPUTS = 64`). §6's cost table was
written before this correction and was never updated after it — that gap,
not a disagreement between two live numbers, is what's actually unreconciled
in the source.

Re-derived against the real bound: `MAX_OUTPUTS = 32` caps a settlement's
*total* output count, not backing cells specifically — every real batch
built so far also spends part of that budget on recovery-carrier outputs
(the 26-cell batch used 5 of its 20 outputs for new backing cells and 15 for
carriers). So `32 × 2,000 sats = 64,000 sats` is a **strict upper bound** on
value newly created in one settlement — reachable only if every one of the
32 available outputs were a backing cell and none were a carrier, which no
real batch has done. Against that upper bound, and using §6's own
(unreconciled) ≈283,600-sat footprint figure unchanged:

```text
283,600 ÷ 64,000  ≈ 4.43   -- verification cost is AT LEAST ~4.4x the value moved
283,600 ÷ 32       = 8,862.5 sats/note, at minimum -- not ≈1,710
```

That is roughly **5× worse** than the retracted figure (166 ÷ 32 ≈ 5.2),
not "roughly one US cent" and not obviously "unremarkable" without knowing a
target note's real-world value. This is a projection against a stale
footprint figure and an idealized best-case output split, not a fresh
end-to-end measurement — it corrects the *direction and rough magnitude* of
the error, not a precise final number. What is solid regardless: the
2,000-sat denomination is the binding economic parameter, not an
implementation detail, and changing it means a new profile ID, not a
configuration flag.

## Standing non-claims

- Chipnet only; no production privacy is claimed.
- The anonymity set is degenerate — one operator, a handful of notes. What
  is demonstrated is a property of the *construction*.
- Private note-to-note transfer does not work and is not claimed. Notes
  created today are not spendable via the private aggregate path; only the
  direct-exit branch is a live, working spend path.
- APNT seals are publicly identifiable as APNT seals: 96 of every seal's 128
  bytes are shared across every seal created under the **current** pinned
  skeleton (`C_verifier`, `L_verdict`). That is scoped to the current pin,
  not a permanent invariant — apnt_created_note_seal_skeleton_v0.ts (cited
  in full above) itself records that re-pinning the verifier token category
  "moved every seal's
  128 bytes." The anonymity set this protocol offers is "APNT notes under
  the current pin," not "BCH UTXOs" in general.
