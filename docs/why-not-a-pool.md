# Why this is not a pool

A shielded pool — one shared UTXO or one shared state root that every
private transfer moves through — is the obvious alternative architecture to
what this repository builds. It is worth explaining why APNT does not do
that, what it does instead, and the honest cost of the choice, because a
version of this argument that only lists advantages would not be credible.

## The contention/authority argument

A single shared state object means every private operation that touches it
contends for the same UTXO. That contention is not a subtle property: with one
current state object, concurrent operations must be serialised against it, and
whoever decides the ordering holds a position of authority over unrelated
parties. A single global transition root has the same shape.

We are stating this in our own voice rather than citing an internal record.
Aggregator economics and competition policy are private, operator-side
decisions — the boundary is described in [`CONTRIBUTING.md`](../CONTRIBUTING.md) — and the
architectural point here does not need them: it follows from the shape of a
shared mutable object, and any developer familiar with the UTXO model can
derive it independently.

**This is design reasoning, written down and dated — it is not a
measurement.** Nothing in this repository's corpus benchmarks a
pool-or-single-covenant architecture's throughput; searching it for
"bottleneck" finds design reasoning every time and finds zero hits for TPS
or transactions-per-second. The honest way to say this is *we started with
a single covenant, found this limitation in the design before building
anything against it, and moved* — not "we tested it and it bottlenecked."
And to be specific about what is **not** claimed: BCH permits chains of
unconfirmed transactions, so there is no publishable per-block throughput
ceiling here. An earlier internal draft's "roughly one pool operation per
block" figure was fabricated and does not appear anywhere in this
repository's real record.

## What APNT does instead

The original scaling direction is recorded in
[`docs/decisions/0012-master-root-bound-lane-scaling.md`](./decisions/0012-master-root-bound-lane-scaling.md)
(ADR 0012, accepted as target architecture, 2026-05-29). **Read that document's
own banner before trusting anything below it: ADR 0012 has since been
superseded and is published as history, not as current or planned
architecture.** It proposed fixed, versioned lane state cells whose roots
would be bound into one logical master root — concurrency because different
lane cells can advance in parallel on BCH's own UTXO model, with an explicit
guardrail that a lane must never become a separate privacy protocol, user
namespace, or managed shard.

**That specific mechanism did not ship, and this repository's current design
work has since moved away from it in favor of a per-note, bundle-backed
private data model** — one logical private note owning a disjoint bundle of
public BCH cells, normalized and committed per note rather than through any
shared lane or master root. The bundle-backed model is described in this
repository's own promoted specification,
[`spec/apnt-bundle-backed-transition-contracts.md`](../spec/apnt-bundle-backed-transition-contracts.md),
not in ADR 0012.

**The reason ADR 0012 is still worth reading is that its core argument
outlived its specific mechanism.** The property that mattered — that a
private operation should never have to contend for one shared object, and
that BCH's own UTXO model already gives independent objects independent
liveness without a shared sequencer — is the same property the bundle model
delivers by a different route (per-note bundles instead of lane roots). Its
guardrail paragraph also still holds as a design constraint on both: a
scalability structure must not quietly become a per-user or per-aggregator
namespace under a different name.

Everything this repository actually ships today runs on a single logical
APNT state; multi-object concurrency at either the lane-root or bundle level
is target architecture, not a shipped property, and no implementation should
be read as claiming otherwise.

## The honest cost of cells

The alternative to a shared pool that APNT actually builds is not "no
tradeoff" — it is a different tradeoff, and it should be named rather than
left for a reader to discover.

**Cells quantize value and make transfers expensive; a pool does not.** A
pool can typically move an arbitrary private amount in roughly one
operation. APNT's conservation model works by counting equal-value cells —
consumed cells nullified by being spent, new cells created at a fixed
denomination — which gets conservation, and gets it *without* a Pedersen or
Bulletproof-style value-commitment layer (see
[`docs/why-sp1.md`](./why-sp1.md)), but the fee this buys is ad valorem rather
than flat: it scales with how many cells a transfer touches, not with one
fixed per-transaction cost.

An earlier draft of this section understated that cost by roughly 5×, by
quoting a per-note figure the source itself had already retracted.
Corrected in full, because a document whose job is stating the honest cost
of cells must not make the tradeoff look mild in its own favor.

design.md §6 — the private repository's
`openspec/changes/archive/2026-08-13-define-apnt-private-spend-covenant-v0/design.md`,
not currently on the publication allowlist, so these figures are reproduced
here rather than independently re-checkable from this tree today — costs a
real built batch (26 backing cells consumed, 15 recovery carriers, the
settlement authorization covenant and its 32-transaction chunked BN254
verifier chain) at **≈283.6 KB of on-chain footprint**, ≈283,600 sats at 1
sat/byte. It then extrapolates: "against ... the SAC's ~166-input unroll
ceiling, a maximal batch carries ≈332,000 sats of value ... spread over 166
notes it is ≈1,710 sats (roughly one US cent) per note." **That 166 figure
is the exact quantity the same document's own correction 4 (§1.1.6a)
retracts** — it states the §1.1.3-derived "~166/166 unroll ceiling do not
hold once the real transcript is built" and calls it "the real limit on
usable `MAX_OUTPUTS`, not the ~166 figure." The section that follows pins
the real measured bound: **`MAX_OUTPUTS = 32`** (and `MAX_INPUTS = 64`).
§6's cost table predates this correction and was never updated after it —
that gap, not a live disagreement, is what's actually unreconciled.

Re-derived against the real bound: `MAX_OUTPUTS = 32` caps a settlement's
*total* output count, not backing cells specifically — every real batch
built so far also spends part of that budget on recovery carriers (the
26-cell batch used 5 of its 20 outputs for new backing cells, 15 for
carriers). So `32 × 2,000 sats = 64,000 sats` is a **strict upper bound** on
value newly created per settlement, reachable only if all 32 outputs were
backing cells and none were carriers — no real batch has done that. Against
that upper bound, using §6's own unreconciled ≈283,600-sat footprint
unchanged: verification cost is **at least ≈4.4×** the value moved
(`283,600 ÷ 64,000`), and per-note overhead is **at least ≈8,863 sats**
(`283,600 ÷ 32`) — roughly **5× worse** than the retracted ≈1,710 figure
(`166 ÷ 32 ≈ 5.2`), not "roughly one US cent." This is a projection against
a stale footprint figure and an idealized best-case output split, not a
fresh end-to-end measurement — it corrects the *direction and magnitude* of
the error, not a precise final number. What does not depend on that
correction: the cell denomination is the binding economic parameter of this
design, not a configuration detail — changing it means a new
commitment-bound profile, not a flag.

A pool avoids this specific cost. It pays for that with the contention
problem above, and — for the shared-nullifier-accumulator designs a pool
typically needs — a heavier in-circuit structure than "conservation by
counting" requires. Neither architecture is free; this repository chose the
one whose cost is a fee schedule over the one whose cost is a shared
bottleneck, and is publishing both sides of that choice rather than one.

## Standing non-claims

- Chipnet only; no production privacy is claimed.
- The anonymity set behind any live artifact discussed here is degenerate —
  one operator, a handful of notes. What is demonstrated is a property of
  the *construction*, not achieved anonymity.
- Private note-to-note transfer does not work today and is not claimed.
  Notes created today are not spendable via the private aggregate path;
  only the direct-exit branch is a live, working spend path.
- Multi-lane concurrency is target architecture, not a shipped property —
  see the ADR 0012 status line above.
