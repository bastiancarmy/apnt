# apnt-groth16-cashvm-execution Specification

## Purpose
TBD - created by archiving change prototype-apnt-groth16-cashvm-execution-v0. Update Purpose after archive.
## Requirements
### Requirement: Deterministic proof conversion

The prototype MUST convert the SP1 Groth16 proof, wrapper verification key, and
five public scalars into one canonical BCH verifier representation.

#### Scenario: Equivalent fixture conversion

- **WHEN** the same SP1 fixture is converted twice
- **THEN** the resulting BCH verifier inputs MUST be byte-identical

#### Scenario: Out-of-range scalar

- **WHEN** a public scalar is outside the accepted BN254 field range
- **THEN** conversion MUST fail closed

### Requirement: APNT CashVM verification

Two distinct valid APNT transition proofs MUST verify through the same fixed
authenticated CashVM verifier construction.

#### Scenario: Valid fixture A

- **WHEN** fixture A is executed
- **THEN** every verifier stage MUST accept
- **AND** the final Groth16 verification MUST accept

#### Scenario: Valid fixture B

- **WHEN** fixture B is executed using the same verifier construction
- **THEN** every verifier stage MUST accept
- **AND** the final Groth16 verification MUST accept

### Requirement: Mutation rejection

Any material mutation to proof, wrapper key, public inputs, guest identity,
statement commitment, encoding order, or verifier-stage body MUST be rejected.

#### Scenario: Mutated proof

- **WHEN** any byte of a valid APNT Groth16 proof is materially mutated
- **THEN** CashVM verification MUST reject the proof

#### Scenario: Mutated public input

- **WHEN** a public scalar, guest identity, or transition statement commitment
  differs from the values bound by the proof
- **THEN** CashVM verification MUST reject the proof

#### Scenario: Incorrect encoding

- **WHEN** proof elements, verification-key elements, or public scalars use an
  incorrect order or byte encoding
- **THEN** conversion or verification MUST fail closed

#### Scenario: Substituted verifier stage

- **WHEN** an aggregator supplies a verifier-stage body whose HASH256 does not
  match the stage locking program
- **THEN** the locking program MUST reject the stage before invocation

### Requirement: On-chain evidence of proof acceptance MUST bind the exact transaction

Evidence that a transition proof was verified on chain MUST identify which
settlement transaction that proof authorizes. A verdict, receipt, token, or
commitment that is identical across two proofs of two different statements is
fungible, and fungible acceptance evidence MUST NOT be treated as authority to
move funds.

The binding MUST be a value the proof itself commits to. Pairing acceptance
evidence with a separately asserted statement is insufficient, because nothing
prevents an attacker from asserting a statement the accepted proof never
covered.

#### Scenario: Acceptance evidence is identical across distinct statements

- **WHEN** a verifier emits acceptance evidence for two proofs of two different statements
- **AND** that evidence is byte-identical in both runs
- **THEN** the evidence MUST NOT be accepted as authority for either transaction
- **AND** the verifier MUST be treated as carrying no statement binding

#### Scenario: Acceptance evidence is paired with an unproven statement

- **WHEN** acceptance evidence is presented alongside a claimed settlement transaction
- **AND** the evidence does not itself commit to that transaction
- **THEN** the pairing MUST NOT be accepted as proof that the transaction was authorized

### Requirement: The transition relation MUST publish a settlement-transaction commitment

The `apnt-private-note-transition-relation-v0` public result MUST publish
`settlementProjection32`: a domain-separated commitment to the exact settlement
transaction the statement authorizes.

It MUST be a strict function of statement fields the relation already commits
to, so that computing it requires no witness material beyond what the relation
already holds, and so that two evaluations of one statement cannot disagree.

Its preimage MUST cover the transaction version, locktime, input count, the
designated verifier input index, every non-designated input's outpoint,
sequence number and spent value, the output count, every output's value and
materialized on-chain locking bytecode, and the network fee. It MUST exclude
the designated verifier input's outpoint, which cannot exist at proving time.
The excluded input's value remains bound by the network fee.

It MUST use the repository's existing domain-separated SHA-256 primitive under
its own distinct domain string, and MUST NOT reuse another module's domain.

#### Scenario: A covered transaction field changes

- **WHEN** any field the preimage covers differs between two statements
- **THEN** `settlementProjection32` MUST differ

#### Scenario: The designated verifier input's outpoint changes

- **WHEN** only the designated verifier input's outpoint differs between two statements
- **THEN** `settlementProjection32` MUST be unchanged

#### Scenario: A result has no normalized statement

- **WHEN** the relation rejects before a statement normalizes
- **THEN** `settlementProjection32` MUST be encoded as absent rather than as an all-zero value with a present marker

### Requirement: An accepted public result MUST carry a present, non-zero settlement binding

The authenticated relation-local CashVM gate MUST require an accepted
`APNTPRR0` result to carry the settlement-projection presence marker and a
non-zero `settlementProjection32`. An accepted result whose binding is absent
or all-zero MUST be rejected before any proof-coordinate or pairing work.

#### Scenario: An accepted result carries an all-zero settlement binding

- **WHEN** an accepted `APNTPRR0` result is presented with an all-zero `settlementProjection32`
- **THEN** the gate MUST reject it

### Requirement: Changing the public-values layout MUST be append-only where it can be

Adding a public field to a frozen result codec MUST append it after every
existing field rather than interleave it, so that consumers reading previously
fixed offsets keep reading the same bytes. Every consumer of the superseded
length MUST be enumerated and updated in the same change; none may be left to
fail silently.

#### Scenario: A prior consumer reads a pre-existing field offset

- **WHEN** a consumer reads a field at an offset fixed before the layout changed
- **THEN** it MUST read the same bytes it read before

### Requirement: A frozen CashVM verifier artifact MUST have a committed regeneration path

A CashVM verifier transaction, stage graph, or authenticated fixture MUST NOT
be frozen as APNT protocol evidence unless this repository also contains a
runnable, committed path that rebuilds it from primary material. Naming an
external revision in prose is not a regeneration path. Work performed in an
ephemeral checkout MUST leave behind a committed script, recorded command
sequence, or vendored input sufficient to reproduce the artifact after that
checkout is gone.

A relation's semantics may change at any time; when it does, every artifact
that embeds a semantic commitment for that relation becomes invalid. An
artifact with no regeneration path cannot survive that event and MUST be
treated as a liability rather than as evidence.

#### Scenario: Artifact frozen without a regeneration path

- **WHEN** a CashVM verifier artifact is proposed as frozen protocol evidence
- **AND** no committed script or recorded command sequence in this repository rebuilds it
- **THEN** it MUST NOT be accepted as protocol evidence
- **AND** it MAY be retained only as clearly-labelled historical measurement

#### Scenario: Relation semantics move under a frozen artifact

- **WHEN** a relation's semantic contract commitment changes
- **AND** a frozen artifact embeds the superseded commitment
- **THEN** that artifact's semantic claim MUST be retired with a dated, explicit record
- **AND** the retirement MUST NOT be performed by silently deleting the artifact or its tests

### Requirement: Retiring a verifier artifact MUST NOT silently reduce coverage

When a verifier artifact's semantic claim is retired, every test that depended
on it MUST be individually resolved: repointed to the maintained replacement
path where the protection it provided still has a subject, or removed with an
explicitly recorded reason where it does not.

Making a suite green by deleting failing tests is a coverage regression and
MUST NOT be used to close a retirement.

#### Scenario: A dependent test is removed

- **WHEN** a test that exercised a retired artifact is removed
- **THEN** the record MUST state what that test protected
- **AND** the record MUST state why that protection no longer has a subject

#### Scenario: A dependent test is repointed

- **WHEN** a test that exercised a retired artifact is repointed to the maintained path
- **THEN** it MUST assert the same class of property against the maintained path
- **AND** it MUST NOT be weakened to accommodate the replacement artifact

### Requirement: Artifact bytes retained for non-semantic reasons MUST be labelled

A retired artifact MAY be retained when other work depends on its bytes for
reasons unrelated to the retired semantics, such as carrying a proof-system
verification key or relation-agnostic arithmetic bodies. The retained file MUST
be labelled so that its retained bytes are not mistaken for live semantic
evidence.

#### Scenario: Retired artifact still carries a verification key

- **WHEN** a retired artifact is the source of a proof-system verification key read by unrelated code
- **THEN** the artifact MUST be retained rather than deleted
- **AND** the retirement record MUST name every reader and the exact bytes each one consumes

