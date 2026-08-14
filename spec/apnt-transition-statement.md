# apnt-transition-statement Specification

## Purpose
TBD - created by archiving change define-apnt-transition-statement-v0. Update Purpose after archive.
## Requirements
### Requirement: Canonical transition statement

The protocol MUST define one canonical versioned public statement for each APNT
aggregation transition.

#### Scenario: Deterministic serialization

- **WHEN** two statements contain the same protocol-relevant values
- **THEN** they MUST serialize to identical bytes
- **AND** derive the same `statementCommitment32`

#### Scenario: Material mutation

- **WHEN** a consumed input, nullifier, output commitment, recovery packet
  commitment, fee term, or transaction-binding field changes
- **THEN** `statementCommitment32` MUST change

#### Scenario: Unordered consumed collection

- **WHEN** callers supply the same consumed tuples in different collection
  orders
- **THEN** the tuples MUST remain internally attached
- **AND** they MUST be sorted by canonical BCH outpoint bytes
- **AND** serialization MUST be identical

#### Scenario: Duplicate identities

- **WHEN** consumed outpoints, public nullifiers, or created output indexes are
  duplicated
- **THEN** normalization and serialization MUST fail closed

### Requirement: Privacy exclusions

The transition statement MUST NOT contain private note plaintext, private
values, note openings, wallet seeds, spend keys, ML-KEM secret keys, recipient
contact keys, Nostr identifiers, or `bchcloak:` descriptors.

#### Scenario: Recipient descriptor supplied

- **WHEN** a caller attempts to serialize a recipient descriptor or contact
  identifier into the transition statement
- **THEN** serialization MUST fail closed

#### Scenario: Private witness field supplied

- **WHEN** a caller supplies private note plaintext, a note opening, a spend or
  wallet key, an ML-KEM secret key, a nullifier secret, or a private witness
- **THEN** serialization MUST fail closed

### Requirement: Transaction binding

The statement MUST bind the exact protocol-relevant projection of the BCH
aggregation transaction.

#### Scenario: Output substitution

- **WHEN** an aggregator substitutes a protocol-relevant transaction output
- **THEN** the expected transition statement commitment MUST no longer match

#### Scenario: Pre-signing projection

- **WHEN** the statement is constructed before signatures and proof carriage
- **THEN** the projection MUST bind transaction version, locktime, ordered
  input outpoints, sequences, spent-output values and locks, ordered output
  values and locking templates, token data, and the designated verifier index
- **AND** it MUST exclude final unlocking bytecode, signatures, proof chunks,
  the embedded statement commitment slot, and final txid

#### Scenario: Embedded commitment cycle

- **WHEN** an output script will embed `statementCommitment32`
- **THEN** the projection MUST bind an exact script template with a zeroed
  32-byte substitution slot
- **AND** changing any other script byte MUST change the commitment

### Requirement: Transaction-local distributed topology

The statement MUST bind one batch-local designated verifier input, disjoint
consumed note-seal outpoints, and statement-bound created-note outputs without
creating a global mutable protocol UTXO or authoritative transition head.

#### Scenario: Disjoint or overlapping batches

- **WHEN** batches consume disjoint seals
- **THEN** the statement MUST NOT introduce a shared protocol head
- **AND WHEN** batches overlap
- **THEN** their conflict MUST remain an ordinary BCH outpoint conflict

### Requirement: Recovery mapping

The statement MUST bind a canonical recovery packet table commitment and an
indexed encrypted packet hash for every created item without recipient contact
identity.

#### Scenario: Recovery reference mutation

- **WHEN** a packet table commitment, packet index, or packet hash changes
- **THEN** `statementCommitment32` MUST change or noncanonical input MUST reject
