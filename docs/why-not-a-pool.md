# Why this is not a pool

A shielded pool — one shared UTXO or one shared state root that every
private transfer moves through — is the obvious alternative architecture to
what this repository builds. It is worth explaining why APNT does not do
that, what it does instead, and the honest cost of the choice, because a
version of this argument that only lists advantages would not be credible.

## The contention/authority argument

A single shared state object means every private operation that touches it
contends for the same UTXO. The private repository's aggregator
competition-rules decision record states the problem plainly. **Provenance:**
that record exists in the private repository but is not part of this
export — it is withheld deliberately as commercially sensitive design
reasoning about aggregator competition, a different concern from the
architecture point this one paragraph makes. Quoted here because the point
itself is not sensitive:

> For a simple single-state MVP profile, aggregators may race on one current
> state object:
>
> ```
> State_N -> State_N+1
> ```
>
> This creates a simple BCH-resolved race model. However, this is not
> production scale. A single current state UTXO or single global transition
> root is a global bottleneck.
> — `docs-internal/decisions-recovered/0022-apnt-aggregator-competition-rules.md`

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

The architecture direction is recorded in the private repository's ADR 0012
(`docs-internal/decisions/0012-master-root-bound-lane-scaling.md`, accepted
as target architecture, 2026-05-29). **Provenance, stated precisely:** that
file was later removed from the working tree (commit `44aa410`) and is not
included in this export; it was recovered from the private repository's git
history (commit `ae8611a`) to write this document and is reproduced here
verbatim rather than paraphrased. A reader of this export cannot re-open the
file directly and must trust this transcription — flagged rather than
implied to be independently checkable. Quoted in full, its three context
paragraphs, unedited:

> APNT starts with a single BCH covenant-governed lane state cell for
> correctness.
>
> The current scaling direction uses fixed, versioned lane profiles rather
> than managed shard infrastructure. Fixed lanes allow BCH-native UTXO
> concurrency because different lane state cells can advance in parallel.
>
> However, lanes must not become separate privacy protocols, user
> namespaces, aggregator namespaces, or managed shards.

The core of the argument is the second paragraph: a pool forces every
private operation through one contended object, while fixed lanes let
different lane state cells advance in parallel because BCH's own UTXO model
already gives independent objects independent liveness — no shared
sequencer is needed to get that concurrency. The third paragraph is the
guardrail this project holds itself to while pursuing that: a lane is a
scalability structure inside one logical APNT state, not a way to quietly
re-introduce per-user or per-aggregator namespaces under a different name.

**And the same document's own honest status line, published in the same
breath so the quote above does not overstate what exists today:**

> This is not implemented.
>
> The MVP remains single-lane:
>
> ```
> laneCount = 1
> laneId = 0
> ```

Everything this repository actually ships today runs on that single lane.
Multi-lane concurrency is the target architecture, not a shipped property —
stating the ADR without this line would be publishing a claim the MVP does
not back.

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
[`why-sp1.md`](./why-sp1.md)), but the fee this buys is ad valorem rather
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
