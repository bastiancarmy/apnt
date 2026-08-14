# apnt-distributed-transition-experiment Specification

## Purpose
TBD - created by archiving change reconcile-apnt-distributed-transition-prototype. Update Purpose after archive.
## Requirements
### Requirement: Reconciliation record
The change SHALL maintain an implementation-critical reconciliation record that
distinguishes current repository truth, previously established prototype
evidence, new experimental evidence, interim compromises, target durable owners,
missing implementation, and impacts on pending OpenSpec changes.

#### Scenario: Required architecture topics are mapped
- **WHEN** the reconciliation record is reviewed
- **THEN** it maps distributed seals, transaction-local binding, verifier anchor and kernel, proof carriage and authentication, enforced relation, value conservation, CashVM construction, and later live-harness integration to repository-local evidence paths

### Requirement: Existing real implementation is reused
The experiment MUST reuse package-owned or existing prototype implementations
for transaction serialization, txid derivation, compact verifier serialization,
proof chunk encoding, verifier artifact authentication, real proof verification,
and libauth CashVM execution wherever those implementations exist.

#### Scenario: Source inventory is emitted
- **WHEN** the local experiment starts
- **THEN** it emits exact paths and exported symbols for reused implementations and labels every remaining experimental-only composition function

### Requirement: Proof relation is classified from implementation
The experiment MUST classify the strongest real accepting proof relation from
its statement, witness, constraints, public inputs, proof bytes, authenticated
artifact, and accepting verifier path, and MUST NOT infer stronger semantics from
artifact names.

#### Scenario: Narrow relation is not overstated
- **WHEN** the strongest available relation does not enforce private value conservation or ownership authorization
- **THEN** the evidence names only the relation actually enforced and records the missing relation as an unresolved blocker

### Requirement: Distributed transaction topology
The experiment SHALL construct one serialized BCH transaction whose input zero
is a single-use batch-local compact verifier anchor, whose remaining inputs are
distributed member seals bound to the same transaction-local statement without
duplicating the expensive verifier, and whose created note candidate outputs bind
to the same statement without recipient markers or transparent P2PKH change.

#### Scenario: Required minimum topology is constructed
- **WHEN** the transaction is serialized
- **THEN** it contains at least one verifier anchor input, one member input, and one statement-bound note candidate output and does not use the older direct-P2S-per-input verifier topology

#### Scenario: Anchor remains non-authoritative
- **WHEN** the created outputs are inspected
- **THEN** no output recreates the verifier anchor as a global mutable state chain or grants it custody, sequencing, namespace, or protocol-truth authority

### Requirement: Compact verifier limits are measured
The experiment SHALL reuse the compact P2S verifier and canonical proof-chunk
format and SHALL report exact locking/unlocking bytecode, commitments, lengths,
limits, proof chunk counts and lengths, and maximum stack-item size.

#### Scenario: Active limits are satisfied
- **WHEN** the valid transaction is constructed
- **THEN** the locking bytecode is at most the active 201-byte P2S limit, every proof chunk is within the active item-size limit, and the complete unlocking bytecode is within the active script-size limit

### Requirement: Real CashVM acceptance
The exact serialized transaction MUST be evaluated using deterministic serialized
source outputs and the repository's real libauth CashVM transaction verification
path. Structural preflight alone MUST NOT count as acceptance.

#### Scenario: Valid local transaction is accepted
- **WHEN** every input is evaluated against its real source output and transaction context
- **THEN** the evidence records per-input success, overall real CashVM transaction acceptance, transaction hex, byte length, locally derived txid, and transaction commitment

### Requirement: Narrow mutations fail closed
The experiment MUST test proof-byte, public-input or statement-bind, proof-chunk
content/order/omission, kernel, verifier-index, member-bind, output-commitment, and
oversized-item mutations and record the first exact real rejection boundary.

#### Scenario: No mutated construction is accepted
- **WHEN** the mutation matrix completes
- **THEN** every required mutation is rejected by artifact authentication, proof verification, construction, preflight, parsing, input execution, or transaction verification and no synthetic acceptance is used

### Requirement: Promotion and live-validation map
The evidence SHALL assign stable statement, verifier/script, transaction assembly,
local VM validation, CLI, chain I/O, and future live-harness responsibilities to
their target owners and SHALL identify experimental code to discard and pending
changes to confirm or narrow.

#### Scenario: Experiment remains unpromoted and offline
- **WHEN** the change is complete
- **THEN** package promotion and live Chipnet validation remain false, the committed live harness is unchanged, and the next live-validation slice is precisely identified
