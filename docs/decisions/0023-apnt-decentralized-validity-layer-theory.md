> **Publication note.** This design record was authored in the private
> research repository and later removed from the working tree in a
> documentation-corpus cleanup. It is republished here from that commit,
> verbatim — no line below was changed, only this notice was added.
>
> Its own status line already states what it is: **design theory that needs
> validation, not an implementation spec.** It records the reasoning behind a
> real architectural turn — away from a single global BCH covenant state
> machine and away from fixed small lane counts, toward a role model
> (aggregator / prover / watcher / indexer / relay / wallet) built around
> disjoint, per-note construction rather than a shared mutable object any
> operator could contend for or sequence. That role vocabulary and the
> non-black-box, non-custodial requirements it sets out are still the
> project's current mission-level commitments. The open questions it lists
> under "Unresolved blockers" — including whether BCH can verify APNT proof
> statements directly, and the exact checkpoint/nullifier-root design — were
> genuinely open when this was written and are not asserted as settled by
> this republication; check this repository's current specs and code, not
> this document, for where each one stands today.

# 0023 — APNT decentralized proof-carrying validity layer theory
Status: design theory / needs validation
## Context
BCH Cloak APNT v0 is targeting private note transfer on BCH.
The current architecture discussion has shifted from a pure BCH L1 covenant state machine toward evaluating a decentralized proof-carrying APNT validity layer anchored to BCH.
This note is not an implementation spec. It records a design theory that must be validated before new aggregate-consume or private-note-state implementation work proceeds.
## Primary problem
The primary problem is private note exchange, not exit-first design.
The central question is:
```text
How does Alice create a Bob-recoverable, Bob-verifiable, protocol-real private note without exposing Alice, Bob, amount, or relationship?
```
Exit/refund remains a required safety invariant, but it is not the primary UX path.
## Why this direction exists
The native BCH L1 covenant-only path repeatedly hits the same scaling/privacy tension:
```text
single global BCH covenant state machine:
  creates a hot UTXO / global bottleneck
fixed lane state machine:
  risks note trapping, cross-lane complexity, and anonymity-set fragmentation
public content-addressed prefix cells:
  prefixes of nullifiers, note commitments, packet hashes, ciphertext hashes, receive descriptors, Nostr identities, or wallet identities become public beacons/fingerprints
black-box L2:
  unacceptable because APNT processing must remain publicly verifiable and wallet-verifiable
```
Therefore, the current design theory is to evaluate a decentralized proof-carrying APNT validity layer anchored to BCH.
## Candidate target
```text
BCH L1:
  deposits
  import funding covenants
  exits/refunds
  checkpoint anchors
  packet availability anchors or packet carriage
APNT validity layer:
  public-input, deterministic, proof-carrying private note state transition system
Aggregators:
  permissionless batch builders
Provers:
  permissionless proof generators
Watchers:
  independent public verifiers
Indexers:
  chain/data availability scanners
Relays:
  transport and discovery services, preferably Nostr-compatible where feasible
Wallets:
  private note owners and final acceptance/verifiers for user state
```
The APNT validity layer processes private note effects through public-input, deterministic, proof-carrying batches: private witnesses remain hidden, but transition rules, proof statements, packet commitments, nullifier commitments, checkpoint anchors, and BCH references must be independently verifiable.
## Naming rule
Do not call APNT non-consensus services "validators."
Use:
```text
aggregator
prover
watcher
indexer
relay
wallet
```
A watcher/indexer/prover may verify APNT transition evidence, but it does not create consensus truth.
BCH consensus remains settlement truth.
Wallet verification remains private-note acceptance truth.
## Nostr role
Nostr may be used as the default relay/discovery/message-bus layer where feasible.
Allowed Nostr roles:
```text
receive descriptor discovery
intent relay
effect relay
batch candidate relay
packet notification hints
aggregator/prover discovery
watcher/indexer coordination
status hints
```
Forbidden Nostr roles:
```text
settlement truth
recovery truth
state truth
proof truth
consensus validation
recipient identity truth
sequencing authority
namespace authority
custody
```
Nostr events may help wallets, aggregators, provers, watchers, and indexers find data, but wallets must verify BCH anchors, packet data, transition statements, and proofs independently.
## Non-black-box L2 requirement
The APNT validity layer must not be black box.
The public should be able to verify:
```text
protocol version
proof/verifier profile
batch public inputs
old checkpoint/root
new checkpoint/root
BCH anchor references
import funding covenant references
exit/refund references
nullifier-set commitments
output note commitment roots
recipient packet roots
outgoing recovery packet roots
packet availability commitments
fee/postage/accounting commitments
transition statement bind
proof verification result
```
The public must not learn:
```text
Alice identity
Bob identity
which ciphertext belongs to Bob
note plaintext
note openings
wallet seed
spend keys
ML-KEM secret keys
receive descriptors
Bob npub/contact key
bchcloak descriptor as recipient marker
```
## Private note acceptance rule
A decrypted note is not accepted merely because Bob can decrypt it.
Bob's wallet accepts/imports a private note only after verifying:
```text
ciphertext packet decrypts
packet hash/root matches accepted public packet binding
decrypted note commitment matches an accepted output note commitment
transition/checkpoint evidence is valid under APNT rules
BCH anchor/evidence exists for the accepted transition
no forbidden recipient marker dependency exists
```
## Wallet acceptance rule
A wallet must not accept a private note because a relay, aggregator, prover, watcher, or indexer says it exists.
A wallet accepts/imports a private note only after verifying:
```text
BCH-observed or BCH-anchored transition evidence
proof/public input validity
packet hash/root binding
chain-observable or availability-backed ciphertext packet
successful trial decryption
decrypted note commitment matches accepted transition
state/checkpoint constraints
no forbidden recipient marker dependency
```
## Aggregator role
Aggregators are permissionless batch builders.
They may:
```text
collect intents/effects
assemble batches
choose fee policy within committed constraints
include packet carriage/availability data
submit BCH anchor/checkpoint transactions
```
They must not:
```text
custody funds
hold wallet secrets
hold spend keys
hold ML-KEM secret keys
hold note plaintext
define state truth
sequence by authority
own lanes/cells/namespaces
reserve offers by message
drop required packet carriage
redirect value
exceed committed fee policy
```
## Prover role
Provers are permissionless proof generators.
They may:
```text
generate proofs for public APNT transition statements
compete to produce lower-cost/faster proofs
publish proof artifacts
```
They must not:
```text
define validity by signature
become consensus validators
become required trusted operators
hold user secrets
custody funds
```
## Watcher/indexer role
Watchers and indexers are independent verifiers/scanners.
They may:
```text
scan BCH anchors
scan packet availability
verify proofs
track checkpoint roots
publish derived indexes
relay hints through Nostr
```
They must not:
```text
become protocol truth
become settlement truth
become recipient identity truth
cause wallet note acceptance without wallet verification
```
## BCH L1 enforcement question
The architecture must decide which profile is realistic.
### Profile A — BCH-verifiable validity
```text
BCH covenants/scripts verify the APNT transition proof or a compact verifier condition.
Invalid APNT transitions cannot settle on BCH.
```
Status: target ideal, feasibility unresolved.
### Profile B — Publicly verifiable anchored validity
```text
BCH anchors roots/checkpoints/packets/exits.
Proofs are verified by wallets/watchers/indexers off-chain.
Wallets reject invalid transitions and use exit/refund paths if needed.
```
Status: possible interim compromise, but weaker than BCH-enforced validity.
### Profile C — Optimistic challenge model
```text
BCH anchors proposed checkpoints.
Watchers can challenge invalid checkpoints during a window.
```
Status: complex; requires script-verifiable fraud/challenge path.
## Global nullifier/state blocker
A private-note system needs global double-spend prevention.
The design must define:
```text
where nullifier truth lives
how nullifier truth is publicly verified
how nullifier correctness avoids a single BCH hot covenant
how wallets know a recovered note is spendable
how the system avoids public routing beacons
how the system avoids note trapping in lanes/domains
```
This may imply a global validity-layer nullifier root with proof-carrying batched updates. If so, the design must state honestly that ordering exists in the validity layer, even if BCH only sees checkpoints.
## Critical design constraints
The design must avoid:
```text
single global hot BCH covenant
fixed small lane count as global-scale claim
public prefix routing by private-effect identifiers
note trapping in lanes/cells/domains
Nostr-only recovery
commitments-only recovery
black-box operator processing
trusted sequencer
authority validator signatures
relay-order truth
aggregator custody
```
## Historical local smoke/test context
C1.14 smoke-sink / guard-spend notes are historical local testing material only.
They demonstrate spending the compact import funding output, but they are not:
```text
APNT acceptance
note creation
proof verification acceptance
private-note spendability
final aggregator consumption
production privacy
```
The known compact output is a standardness/import funding anchor proof. It is not the final APNT funding covenant.
## Current design theory
The most plausible direction is:
```text
BCH L1 anchors deposits, exits/refunds, import funding covenants, packet availability, and validity checkpoints.
APNT validity layer processes private note effects through public-input, deterministic, proof-carrying batches.
Aggregators and provers are permissionless workers.
Watchers/indexers are independent public verifiers and scanners.
Nostr acts as relay/discovery where feasible.
Wallets independently verify proofs, chain anchors, packet bindings, and decrypted note commitments before accepting private notes.
```
## Unresolved blockers
```text
whether BCH can verify APNT proof statements directly
minimum proof system/verifier profile
canonical APNT effect object
canonical batch public input object
canonical transition/checkpoint object
global nullifier truth model
checkpoint anchor format
packet availability/carriage profile
exit/refund path if APNT validity layer stalls
non-black-box public data requirements
Nostr relay event formats
watcher/indexer data model
global state consistency without public beacons
amount privacy limits on BCH L1
```
## Non-claims
This theory does not claim:
```text
production privacy
Zcash equivalence
complete post-quantum private money
global scale
BCH-enforced validity
implemented L2
trusted validators
```
