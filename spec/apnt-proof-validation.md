# apnt-proof-validation Specification

## Purpose
TBD - created by archiving change define-apnt-sp1-lifecycle-proof-validation-v0. Update Purpose after archive.
## Requirements
### Requirement: APNT proof validation uses a backend-neutral envelope

APNT wallets and protocol-runtime helpers MUST represent proof validation with a backend-neutral result envelope.

The envelope MUST include:

- `version`
- `domain`
- `relationId`
- `backendId`
- `verifierMethod`
- `acceptanceScope`
- `publicInputs`
- `proofVerificationAccepted`
- `proofVerificationFailureReason`
- `privateMaterialPublished`
- `createdFromLocalEvidence`

The envelope MUST support scoped proof results without collapsing proof verification into APNT acceptance.

#### Scenario: Envelope is created from local SP1 evidence

- **GIVEN** a local SP1 proof verifies the note-opening relation
- **WHEN** the wallet records the proof result
- **THEN** the wallet emits an `APNTProofValidationResultEnvelopeV0`
- **AND** `createdFromLocalEvidence` is `true`
- **AND** `backendId` identifies SP1
- **AND** the envelope remains separate from APNT acceptance state

### Requirement: Acceptance scopes are explicit and scoped

APNT proof validation MUST support the following acceptance scopes:

- `notecommitment-opening-only`
- `transition-validity-only`
- `value-conservation-only`
- `nullifier-correctness-only`
- `aggregation-validity-only`
- `apnt-lifecycle`

`notecommitment-opening-only` MAY set scoped proof verification true, but it MUST NOT imply `protocolEvidenceAccepted=true`.

`apnt-lifecycle` is the only scope eligible for `protocolEvidenceAccepted=true`.

#### Scenario: Note-opening-only scope does not imply APNT acceptance

- **GIVEN** a proof envelope has `acceptanceScope = notecommitment-opening-only`
- **AND** the scoped proof verifies
- **WHEN** the wallet evaluates acceptance
- **THEN** `proofVerificationAccepted` MAY be `true`
- **AND** `protocolEvidenceAccepted` remains `false`
- **AND** `walletNoteRecorded` remains `false`
- **AND** `walletNoteSpendable` remains `false`

### Requirement: Unknown backend IDs fail closed

APNT proof validation MUST fail closed for unknown backend IDs unless a verifier method explicitly allows the backend.

The wallet MUST NOT treat an unknown backend as accepted by default.

#### Scenario: Unknown backend is rejected

- **GIVEN** a proof envelope has an unrecognized `backendId`
- **WHEN** the wallet evaluates the envelope
- **THEN** proof verification fails closed
- **AND** the envelope does not imply APNT acceptance

### Requirement: Private material is never published

APNT proof validation MUST NOT publish private note plaintext, note openings, wallet seeds, spend keys, ML-KEM secret keys, nullifier secrets, or private witness bytes.

`privateMaterialPublished` MUST always remain `false`.

#### Scenario: A proof report is emitted

- **GIVEN** a wallet emits a proof validation report
- **WHEN** the report is serialized
- **THEN** it does not include private note plaintext
- **AND** it does not include note openings
- **AND** it does not include wallet seeds
- **AND** it does not include spend keys
- **AND** it does not include ML-KEM secret keys
- **AND** it does not include nullifier secrets
- **AND** it does not include private witness bytes
- **AND** `privateMaterialPublished` is `false`

### Requirement: Note-opening-only scope does not imply full lifecycle acceptance

APNT proof validation MUST treat `notecommitment-opening-only` as a scoped relation result only.

The note-opening relation:

```text
SHA256(domain-separated PrivateNoteV0 opening) == public noteCommitment32
```

MUST NOT be interpreted as full lifecycle acceptance.

#### Scenario: Note-opening proof succeeds

- **GIVEN** a local SP1 proof verifies the note-opening relation
- **WHEN** the wallet records the result
- **THEN** the wallet may record scoped proof verification success
- **AND** `apntAcceptance` remains `false`
- **AND** `productionPrivacy` remains `false`

### Requirement: APNT proof validation is not BCH consensus validation

APNT proof validation MUST be represented as wallet/protocol validation, not BCH consensus validation.

BCH consensus MUST remain limited to transaction, script, outpoint, and chain truth.

#### Scenario: BCH transaction is valid but proof acceptance is missing

- **GIVEN** a BCH transaction is valid under BCH transaction and script rules
- **AND** APNT proof validation has not succeeded
- **WHEN** the wallet evaluates the record
- **THEN** BCH validity may remain true
- **AND** APNT proof acceptance remains false
- **AND** the wallet does not claim BCH consensus verified the APNT proof

### Requirement: Aggregators remain non-authoritative

Aggregators MUST assemble transactions only.

Aggregators MUST NOT custody funds, hold secrets, validate by authority, sequence users as the trust base, or become namespace authorities.

#### Scenario: Aggregator-supplied proof evidence is received

- **GIVEN** an aggregator supplies proof evidence
- **WHEN** a wallet evaluates the evidence
- **THEN** the wallet treats the evidence as input only
- **AND** the wallet does not accept by aggregator authority
- **AND** the aggregator remains non-custodial and non-authoritative

### Requirement: Lifecycle acceptance requires all gates

`protocolEvidenceAccepted=true` MUST require proof evidence, chain/seal evidence, recovery evidence, carrier evidence, Plane B evidence, and non-claim boundary evidence.

The required lifecycle gates MUST include:

- note opening
- transition validity
- value conservation
- nullifier correctness
- aggregation validity
- chain/seal evidence
- recovery evidence
- carrier evidence
- Plane B evidence
- non-claim boundary evidence
- lifecycle acceptance policy

The wallet MUST NOT set:

- `walletNoteRecorded=true`
- `walletNoteSpendable=true`
- `productionPrivacyClaimed=true`

unless those separate gates are actually implemented.

#### Scenario: Only the note-opening scope passes

- **GIVEN** `notecommitment-opening-only` passes
- **AND** transition validity has not passed
- **AND** value conservation has not passed
- **AND** nullifier correctness has not passed
- **AND** aggregation validity has not passed
- **AND** chain/seal evidence has not passed
- **WHEN** the wallet evaluates lifecycle acceptance
- **THEN** `apntAcceptance` remains `false`
- **AND** `acceptedPrivateNote` remains `false`
- **AND** `privateNoteSpendability` remains `false`

### Requirement: Privacy posture is explicitly non-production

APNT proof validation documentation and reports MUST explicitly record that production privacy is not claimed.

The lifecycle model MUST record:

- `productionPrivacy=false`
- `residualCorrelationDisclosed=true`

Known residual correlations MUST include at least:

- transaction timing
- batch participation timing
- aggregator network metadata unless transport mitigated
- wallet recovery scanning patterns
- public nullifier and commitment set growth
- ciphertext presence and size

#### Scenario: Privacy posture is reported

- **GIVEN** a proof validation report is emitted
- **WHEN** the report is reviewed
- **THEN** it clearly states that production privacy is not claimed
- **AND** it enumerates the residual correlations

### Requirement: Transition validity is a separate subrelation

APNT proof validation MUST treat transition validity as a separate subrelation.

The private transition witness MUST canonically derive the public transition statement binds.

#### Scenario: Transition witness mismatches the public statement

- **GIVEN** a proof envelope targets transition validity
- **AND** the private transition witness does not derive the public transition statement binds
- **WHEN** the wallet evaluates the proof
- **THEN** transition validity fails
- **AND** the proof does not imply APNT acceptance

### Requirement: Value conservation is a separate subrelation

APNT proof validation MUST treat value conservation as a separate subrelation.

The wallet MUST verify:

```text
sum(input note values) == sum(output note values) + fee
```

#### Scenario: Values do not balance

- **GIVEN** a proof envelope targets value conservation
- **AND** the sums do not balance
- **WHEN** the wallet evaluates the proof
- **THEN** value conservation fails
- **AND** APNT acceptance remains false

### Requirement: Nullifier correctness is a separate subrelation

APNT proof validation MUST treat nullifier correctness as a separate subrelation.

The wallet MUST verify that private nullifier material derives the public nullifier(s), that batch duplicate nullifiers are rejected, and that global nullifier non-reuse is checked against chain/indexer/wallet truth.

#### Scenario: Duplicate nullifiers appear in a batch

- **GIVEN** a batch includes duplicate nullifiers
- **WHEN** the wallet evaluates nullifier correctness
- **THEN** nullifier correctness fails
- **AND** the proof does not imply APNT acceptance

### Requirement: Aggregation validity is a separate subrelation

APNT proof validation MUST treat aggregation validity as a separate subrelation.

The wallet MUST verify that every included transition validates, batch nullifiers are unique, aggregate value conservation holds, batch output commitments match the public batch root, and the aggregator remains non-custodial and non-authoritative.

#### Scenario: Batch output commitments do not match the public root

- **GIVEN** a batch is supplied for validation
- **AND** the batch output commitments do not match the public batch root
- **WHEN** the wallet evaluates aggregation validity
- **THEN** aggregation validity fails
- **AND** APNT acceptance remains false

### Requirement: Chain and seal evidence are validated at the wallet boundary

APNT proof validation MUST preserve the chain/seal evidence boundary.

BCH MUST validate transaction, script, outpoint, and chain truth.

Wallet or indexer logic MUST validate seal evidence.

BCH consensus MUST NOT validate APNT proof correctness.

#### Scenario: Chain truth is present but proof correctness is absent

- **GIVEN** BCH transaction and chain truth are present
- **AND** proof correctness is absent
- **WHEN** the wallet evaluates acceptance
- **THEN** chain truth may remain true
- **AND** APNT proof acceptance remains false

