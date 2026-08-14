# apnt-private-note-validation Specification

## Purpose
TBD - created by archiving change add-apnt-private-note-validation-milestone-v0. Update Purpose after archive.
## Requirements
### Requirement: Private note validation milestone report

The system SHALL define a deterministic `APNTPrivateNoteValidationMilestoneReportV0` under domain `bch-cloak-apnt-v0:private-note-validation-milestone-report` that composes canonical sanitized evidence from the actual SP1 note-opening proof with an `APNTProofValidationResultEnvelopeV0`, an `APNTScopedProofLifecyclePolicyRecordV0` containing an `APNTLifecycleAcceptancePolicyV0`, and an `APNTPrivacyRiskNonClaimReportV0`.

The live validation harness SHALL emit this milestone report from the existing real private-note and sanitized actual-SP1 evidence path without publishing private witness material.

#### Scenario: Live harness emits scoped actual-SP1 private note validation milestone

- **GIVEN** the live validation harness uses the real private note artifact
- **AND** the recomputed `noteCommitment32` matches the sanitized SP1 evidence commitment for the same run
- **AND** sanitized actual SP1 evidence exists for `SHA256(domain-separated PrivateNoteV0 opening) == public noteCommitment32`
- **WHEN** the live validation harness emits the private note validation milestone report
- **THEN** `zkNoteOpeningEvidenceAccepted` is `true`
- **AND** `scopedProofVerificationAccepted` is `true`
- **AND** `noteCommitmentOpeningEvidenceAccepted` is `true`
- **AND** `protocolEvidenceAccepted` is `false` unless full lifecycle gates are explicitly supplied and accepted
- **AND** `walletNoteRecorded` is `false` unless wallet ownership and durable record evidence are explicitly supplied and accepted
- **AND** `walletNoteSpendable` is `false` unless current wallet, chain, nullifier, seal, and spend-path evidence are explicitly supplied and accepted
- **AND** `productionPrivacyClaimed` is `false`
- **AND** `residualCorrelationDisclosed` is `true`

#### Scenario: Live harness does not promote recovered candidate evidence to protocol acceptance

- **GIVEN** recovered private note candidate evidence exists
- **AND** the proof evidence is scoped to `notecommitment-opening-only`
- **WHEN** the live validation harness emits the milestone report
- **THEN** `zkNoteOpeningEvidenceAccepted` may be `true`
- **AND** `protocolEvidenceAccepted` remains `false`
- **AND** `walletNoteRecorded` remains `false`
- **AND** `walletNoteSpendable` remains `false`

#### Scenario: Live harness report uses protocol-runtime semantics

- **GIVEN** the live validation harness has located the real private-note evidence and sanitized SP1 evidence
- **WHEN** it builds the milestone report
- **THEN** the report is produced by protocol-runtime builders and evaluators
- **AND** live scripts only orchestrate loading inputs and writing public artifacts
- **AND** live scripts do not construct acceptance booleans by authority

### Requirement: Fail-closed lifecycle composition

The system SHALL use the evaluation of `APNTScopedProofLifecyclePolicyRecordV0` as the sole source of effective scoped proof, protocol evidence, wallet note recording, wallet note spendability, and production privacy outcomes in the milestone report.

`notecommitment-opening-only` SHALL NOT promote `protocolEvidenceAccepted`, `walletNoteRecorded`, or `walletNoteSpendable`. `protocolEvidenceAccepted` SHALL remain false unless an effectively accepted `apnt-lifecycle` proof scope and every full protocol evidence gate are explicitly supplied. `walletNoteRecorded` SHALL remain false unless wallet ownership and durable record evidence are explicitly supplied. `walletNoteSpendable` SHALL remain false unless current wallet, chain, nullifier, seal, and spend-path evidence are explicitly supplied and accepted.

#### Scenario: Unknown backend fails closed

- **GIVEN** a raw accepted proof result from an unknown backend
- **WHEN** the private note validation milestone report is evaluated
- **THEN** `zkNoteOpeningEvidenceAccepted` is `false`
- **AND** `scopedProofVerificationAccepted` is `false`
- **AND** `protocolEvidenceAccepted` is `false`
- **AND** `walletNoteRecorded` is `false`
- **AND** `walletNoteSpendable` is `false`

#### Scenario: Note-opening scope cannot promote lifecycle outcomes

- **GIVEN** actual accepted SP1 note-opening evidence with `acceptanceScope=notecommitment-opening-only`
- **AND** lifecycle, wallet-record, or wallet-spendability inputs assert acceptance
- **WHEN** the milestone report is evaluated and serialized
- **THEN** `protocolEvidenceAccepted` is `false`
- **AND** `walletNoteRecorded` is `false`
- **AND** `walletNoteSpendable` is `false`

#### Scenario: Forged aggregate claims serialize as effective false

- **GIVEN** a milestone report whose aggregate lifecycle, wallet spendability, or production privacy booleans are forged to `true`
- **AND** the normalized nested evidence does not satisfy those gates
- **WHEN** the milestone report is evaluated and serialized
- **THEN** the emitted aggregate fields contain the recomputed effective values
- **AND** unsupported lifecycle, spendability, and production privacy claims serialize as `false`

### Requirement: Privacy and non-claim disclosure

The system SHALL include a normalized `APNTPrivacyRiskNonClaimReportV0` in every private note validation milestone report. The report SHALL preserve `productionPrivacyClaimed=false` and `residualCorrelationDisclosed=true` and SHALL disclose the current known residual correlations.

The report SHALL NOT claim production privacy, Zcash equivalence, complete post-quantum private money, BCH consensus proof verification, private-material publication, recipient-marker publication, aggregator authority, aggregator custody, aggregator secret holding, aggregator sequencing authority, aggregator settlement authority, or aggregator namespace authority.

#### Scenario: Public milestone non-claims remain explicit

- **GIVEN** a private note validation milestone report
- **WHEN** the report is evaluated and serialized
- **THEN** `productionPrivacyClaimed` is `false`
- **AND** `residualCorrelationDisclosed` is `true`
- **AND** BCH consensus proof verification is not claimed
- **AND** private-material publication is not claimed
- **AND** recipient-marker publication is not claimed
- **AND** aggregator authority, custody, secret holding, sequencing, settlement, and namespace authority are not claimed

### Requirement: Private material exclusion

The system SHALL NOT serialize private note plaintext, note openings, wallet seeds, spend keys, ML-KEM secret keys, nullifier secrets, private witness bytes, Bob contact keys, `npub`, or `bchcloak:` descriptors in the private note validation milestone report or its nested public evidence.

The live validation harness SHALL preserve this exclusion in the emitted public report artifact.

#### Scenario: Live emitted milestone report contains no private material or recipient markers

- **GIVEN** the live validation harness emits the private note validation milestone report
- **WHEN** the public report artifact is inspected
- **THEN** no private note plaintext is present
- **AND** no note opening is present
- **AND** no wallet seed, spend key, ML-KEM secret key, or nullifier secret is present
- **AND** no private witness bytes are present
- **AND** no Bob contact key, `npub`, or `bchcloak:` descriptor is present

#### Scenario: Public milestone non-claims remain explicit

- **GIVEN** the live validation harness emits the private note validation milestone report
- **WHEN** the public report artifact is inspected
- **THEN** `productionPrivacyClaimed` is `false`
- **AND** BCH consensus proof verification is not claimed
- **AND** private-material publication is not claimed
- **AND** recipient-marker publication is not claimed
- **AND** aggregator authority, custody, secret holding, sequencing, settlement, and namespace authority are not claimed

### Requirement: Harness fail-closed evidence binding

The live validation harness SHALL fail closed unless the report is bound to canonical actual SP1 note-opening evidence and a run-specific `noteCommitment32` that matches the live summary, sanitized SP1 evidence, proof public input, and milestone report provenance for the same run.

#### Scenario: Mismatched note commitment fails closed

- **GIVEN** the live validation harness input contains a `noteCommitment32` that differs from the recomputed live `noteCommitment32` or sanitized SP1 evidence commitment for the same run
- **WHEN** the milestone report is emitted
- **THEN** `zkNoteOpeningEvidenceAccepted` is `false`
- **AND** `protocolEvidenceAccepted` is `false`
- **AND** `walletNoteRecorded` is `false`
- **AND** `walletNoteSpendable` is `false`

#### Scenario: Synthetic or stale provenance fails closed

- **GIVEN** the live validation harness input uses synthetic, stale, or non-canonical SP1 evidence provenance
- **WHEN** the milestone report is emitted
- **THEN** `zkNoteOpeningEvidenceAccepted` is `false`
- **AND** `scopedProofVerificationAccepted` does not override that failure
- **AND** lifecycle, wallet-recording, and wallet-spendability outcomes remain fail-closed unless their separate evidence gates are explicitly supplied and accepted

#### Scenario: Unknown backend fails closed

- **GIVEN** the live validation harness input contains a raw accepted proof result from an unknown backend
- **WHEN** the milestone report is emitted
- **THEN** `zkNoteOpeningEvidenceAccepted` is `false`
- **AND** `scopedProofVerificationAccepted` is `false`
- **AND** `noteCommitmentOpeningEvidenceAccepted` is `false`
- **AND** `protocolEvidenceAccepted` is `false`
- **AND** `walletNoteRecorded` is `false`
- **AND** `walletNoteSpendable` is `false`

### Requirement: Public report artifact

The live validation harness SHALL write a deterministic public report artifact using the repo's local report convention.

#### Scenario: Public milestone artifact is emitted

- **GIVEN** the live validation harness runs with the real private note and sanitized actual-SP1 evidence path
- **WHEN** the milestone report is produced
- **THEN** a deterministic JSON artifact is written to the local report output path
- **AND** the artifact includes `zkNoteOpeningEvidenceAccepted=true`
- **AND** the artifact includes `productionPrivacyClaimed=false`
- **AND** the artifact includes `residualCorrelationDisclosed=true`
- **AND** the artifact includes a run-specific `noteCommitment32` that matches the live summary, sanitized SP1 evidence, proof public input, and report provenance for the same run
- **AND** the artifact can be regenerated deterministically from the same public inputs

#### Scenario: Synthetic scaffold values cannot set milestone acceptance

- **GIVEN** synthetic scaffold values exist in the live validation flow
- **WHEN** the milestone report is produced
- **THEN** synthetic values are marked or isolated as non-accepting evidence
- **AND** synthetic values cannot set `zkNoteOpeningEvidenceAccepted`
- **AND** synthetic values cannot set `scopedProofVerificationAccepted`
- **AND** synthetic values cannot set `protocolEvidenceAccepted`
- **AND** synthetic values cannot set `walletNoteRecorded`
- **AND** synthetic values cannot set `walletNoteSpendable`

