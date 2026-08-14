# Why SP1, and the campaign reconciliation

fundme.cash campaign #143 named "STARK/hash proofs" and Pedersen commitments
as the target direction. What actually shipped is SP1 with a Groth16 wrap,
and no Pedersen layer. That is a real change from what was described, and
this document explains it up front rather than leaving a backer to find the
gap themselves.

## The mismatch that drove the decision

The proof backend was originally prototyped on Triton VM. The pivot away
from it is recorded in this repository's design note
[`docs/decisions/apnt-proof-backend-pivot-triton-to-sp1-v0.md`](./decisions/apnt-proof-backend-pivot-triton-to-sp1-v0.md)
(2026-07-09), and the reasoning is specific, not a generic "better tooling"
argument. **Provenance, stated precisely:** that file was removed from the
private repository's working tree in a later documentation-corpus cleanup
(commit `44aa410`) and recovered from git history (commit `4da85b7`) for
this export; both quotes below are reproduced verbatim from it, and it is
now published in full alongside this document rather than only quoted here
— follow the link above and read the source directly instead of trusting
this transcription. APNT's note-commitment relation is plain SHA-256:

```
noteCommitmentV0 = sha256DomainSeparated(
  "bch-cloak-apnt-v0:private-note",
  deterministic PrivateNoteV0 JSON payload
)
```

Triton VM is Tip5-native. Proving the real SHA-256 relation inside it would
require either implementing SHA-256 in Triton/TASM by hand — u32 modular
arithmetic, rotates, shifts, the message schedule, 64 compression rounds per
block — or substituting a Tip5-native commitment for a different relation
entirely. The design note is explicit about why that second option was
rejected rather than quietly taken:

> For APNT acceptance, option 2 is not acceptable as a hidden compromise.
> The protocol should not claim the proof opens `noteCommitmentV0` unless
> the proof actually verifies the SHA-256 relation.

SP1 was chosen because the guest can run ordinary Rust that reconstructs
the exact deterministic payload, applies the same domain-separated SHA-256
rule, and asserts equality against the public `noteCommitment32` — proving
the relation that actually exists, not a substitute one chosen because it
was cheaper to prove.

**This is a narrow, specific engineering argument, and it is the real one.**
An earlier internal draft framed this choice as "a proven production zk
engine versus unaudited bespoke cryptography nobody has audited." That
framing is not sourced from any document in this repository — it does not
appear in the pivot note or anywhere else in the record — and should not be
published as if it were the reasoning. The SHA-256 relation mismatch above
is what the record actually shows, and it is the stronger, more falsifiable
argument of the two.

## The boundary SP1 does not cross

The pivot note states its own limits in the same breath as its conclusion,
and both halves are published here together:

> SP1 solves the engineering mismatch with SHA-256. It does not eliminate
> proof-system assumptions.
>
> The correct claim is:
>
> ```text
> SP1 can prove the existing SHA-256 noteCommitmentV0 relation directly.
> ```
>
> The incorrect claim is:
>
> ```text
> SP1 makes APNT BCH-native or removes all random-oracle / proof-system assumptions.
> ```

And on how permanent this choice is meant to be:

> SP1 should be the first acceptance backend, not a permanent protocol
> identity.

The same note sketches a backend-neutral proof envelope (relation id,
backend id, verifier method, assumption profile) specifically so a future
`risc0-notecommitment-v0` or a matured `jolt-*` backend is a new envelope
entry, not a protocol rewrite. That envelope is a design intent recorded in
2026-07-09, not something implemented in this repository today.

BCH consensus itself is unaffected either way: it remains responsible for
transaction validity, scripts, outpoints and spent/unspent chain truth.
Proof acceptance, note-commitment verification, nullifier and transition
checks live at the APNT protocol layer, on top of BCH — the proof backend
introduces proof-system assumptions at that layer, not a change to what BCH
consensus itself assumes.

## The Pedersen question, checked rather than assumed

Before writing anything about value hiding, it is worth checking what the
delivered system actually uses, because the campaign named Pedersen
commitments specifically. It does not use them. The protocol's own
specification states this as a requirement, not an oversight:

> APNT v0 MUST NOT require a separate Pedersen or Bulletproof-style public
> value commitment unless measured implementation evidence demonstrates a
> necessary protocol benefit that the canonical statement and private
> relation cannot provide.
> — `openspec/specs/apnt-private-note-transition-and-conservation/spec.md`

That spec is deliberately withheld from this export, for a reason unrelated
to this requirement: its requirement text elsewhere names private witness
fields. This one requirement is reproduced verbatim because it bears
directly on the campaign reconciliation; the file itself is not currently
readable from this tree.

What conservation actually uses instead, recorded plainly in the private
repository's own drift-tracking notes (also not currently in this export):
**equal-value cells plus UTXO-as-nullifier.** Every backing cell is the same
fixed denomination, a
consumed cell's own outpoint being spent *is* the nullifier (BCH consensus
already does double-spend prevention this way, for free), and conservation
is checked by exact integer counting inside the SP1 relation rather than by
a homomorphic commitment scheme. The tradeoff this bought instead of
Pedersen-plus-range-proofs is the ad-valorem cell cost described in
[`docs/why-not-a-pool.md`](./why-not-a-pool.md) — a real cost, paid for a smaller
circuit and no in-circuit nullifier accumulator.

So the honest reconciliation with campaign #143 is: the direction changed on
**both** named axes — hash-based STARK proofs became an SP1 Groth16 wrap,
and Pedersen commitments became equal-value cells with counting-based
conservation — and both changes are explained by the same underlying shift:
building the relation the protocol's actual commitments require, rather
than the relation a different proof system would have made more convenient.

## Standing non-claims

- Chipnet only; no production privacy is claimed.
- SP1 does not eliminate proof-system or random-oracle assumptions; see the
  boundary quoted above.
- The anonymity set behind any live artifact this proof backend has
  produced is degenerate — one operator, a handful of notes.
- Private note-to-note transfer does not work today and is not claimed.
  Notes created today are not spendable via the private aggregate path;
  only the direct-exit branch is a live, working spend path.
