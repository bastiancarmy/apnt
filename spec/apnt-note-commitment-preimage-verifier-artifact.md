# apnt-note-commitment-preimage-verifier-artifact Specification

## Purpose
TBD - created by archiving change add-apnt-note-commitment-preimage-verifier-artifact-v0. Update Purpose after archive.
## Requirements
### Requirement: Run-specific note commitment preimage verifier artifact

Protocol-runtime SHALL define a profile-generic, versioned `APNTNoteCommitmentPreimageVerifierArtifactV0` for the exact `notecommitment-preimage-only` scope. A PrivateNoteV0 commitment preimage is the normalized private note data whose domain-separated commitment hash equals `noteCommitment32`. It is private note content, not a spend key, wallet seed, ML-KEM secret key, nullifier secret, authorization secret, or note spend unlock value. The artifact MUST bind a run-specific `noteCommitment32`, relation ID, backend ID, verifier method, verifier version, verifier evidence kind, and domain-separated digest of the proof or public verifier evidence.

Run specificity MUST be established by those exact public bindings and MUST NOT depend on a recipient profile ID, canonical SP1 harness source path, aggregator assertion, or recipient marker.

#### Scenario: Valid verifier-backed artifact evaluates accepted for notecommitment-preimage-only

- **GIVEN** a supported verifier adapter verifies matching public evidence for a run-specific `noteCommitment32`
- **AND** the relation, backend, verifier method/version, evidence digest, and scope all match
- **WHEN** protocol-runtime constructs and evaluates the artifact
- **THEN** `noteCommitmentPreimageEvidenceAccepted` is `true`
- **AND** the evaluated scope is `notecommitment-preimage-only`
- **AND** the evaluated `noteCommitment32` equals the run-specific public input

#### Scenario: Wrong scope fails closed

- **GIVEN** verifier evidence or an artifact claims a scope other than `notecommitment-preimage-only`
- **WHEN** protocol-runtime constructs or evaluates the artifact
- **THEN** `noteCommitmentPreimageEvidenceAccepted` is `false`
- **AND** no lifecycle outcome is promoted

### Requirement: Verifier-backed acceptance derivation

The artifact constructor MUST derive its recorded verification outcome only by invoking an application-owned, allowlisted verifier adapter over canonical public inputs and detached public evidence. The constructor MUST NOT accept a caller-supplied acceptance boolean or serialized claimed outcome as verification authority.

If the adapter authenticates an external verifier result instead of verifying raw proof bytes, the trusted adapter output MUST be produced only after authentication against independently configured trust material and MUST NOT be constructible by parsing ordinary caller JSON.

#### Scenario: Caller-supplied accepted boolean cannot create acceptance

- **GIVEN** ordinary caller input contains `accepted=true`, `proofVerificationAccepted=true`, `verificationOutcome=accepted`, or an equivalent claimed outcome
- **AND** no supported verifier adapter derives acceptance from matching evidence
- **WHEN** the constructor or evaluator processes the input
- **THEN** `noteCommitmentPreimageEvidenceAccepted` is `false`
- **AND** the caller-supplied claim is not used as authority

### Requirement: Fail-closed verifier evidence evaluation

The evaluator MUST require detached public verifier evidence and an application-owned adapter whose relation, backend, verifier method, and verifier version exactly match the artifact. It MUST recompute the evidence digest, invoke the adapter, and derive effective scoped acceptance from the fresh or authenticated verifier result.

The evaluator MUST fail closed on absent evidence, unauthenticated evidence, unsupported or mismatched adapter identity, evidence-digest mismatch, recorded-outcome mismatch, or verifier rejection.

#### Scenario: Missing verifier evidence fails closed

- **GIVEN** an artifact has no matching detached proof or public verifier evidence
- **WHEN** protocol-runtime evaluates the artifact
- **THEN** `noteCommitmentPreimageEvidenceAccepted` is `false`
- **AND** the evaluation reports a missing-evidence failure

#### Scenario: Unsupported backend or verifier fails closed

- **GIVEN** an artifact names a backend, verifier method, or verifier version not present in the application-owned allowlist
- **WHEN** protocol-runtime evaluates the artifact
- **THEN** `noteCommitmentPreimageEvidenceAccepted` is `false`
- **AND** the evaluation reports an unsupported-verifier failure

#### Scenario: Rejected verifier result fails closed

- **GIVEN** the matching supported verifier adapter rejects the proof or authenticated public verifier evidence
- **WHEN** protocol-runtime constructs or evaluates the artifact
- **THEN** `noteCommitmentPreimageEvidenceAccepted` is `false`
- **AND** the rejected result cannot promote any lifecycle outcome

#### Scenario: Mismatched verifier evidence digest fails closed

- **GIVEN** detached public verifier evidence hashes to a value different from the artifact's `verifierEvidenceDigest32`
- **WHEN** protocol-runtime evaluates the artifact
- **THEN** `noteCommitmentPreimageEvidenceAccepted` is `false`
- **AND** the verifier evidence is not treated as belonging to the artifact run

### Requirement: Run-specific noteCommitment32 binding

Construction and evaluation MUST pass the artifact's exact `noteCommitment32` as the note commitment preimage relation public input to the supported verifier adapter. Effective scoped acceptance MUST require equality among the artifact commitment, verifier public input commitment, and verifier-derived result commitment for the same run.

#### Scenario: Mismatched noteCommitment32 fails closed

- **GIVEN** the artifact `noteCommitment32` differs from the commitment bound by the proof or authenticated verifier evidence
- **WHEN** protocol-runtime constructs or evaluates the artifact
- **THEN** `noteCommitmentPreimageEvidenceAccepted` is `false`
- **AND** the evaluation reports a commitment-binding failure

### Requirement: Lifecycle and privacy non-claims

The artifact and its evaluated result MUST preserve `protocolEvidenceAccepted=false`, `walletNoteRecorded=false`, `walletNoteSpendable=false`, and `productionPrivacyClaimed=false`. Note commitment preimage evidence acceptance MUST NOT imply full APNT lifecycle acceptance, wallet note recording, wallet note spendability, production privacy, BCH consensus proof verification, or live-harness product status.

Public artifact serialization MUST exclude private note plaintext, PrivateNoteV0 commitment preimages, private witness material, wallet seeds, spend keys, ML-KEM secret keys, nullifier secrets, `npub`, contact keys, `bchcloak:` descriptors, profile IDs, and other recipient markers. On-chain publication of those values MUST NOT be introduced by this capability.

#### Scenario: Private material and recipient markers are not serialized

- **GIVEN** a note commitment preimage verifier artifact is serialized
- **WHEN** the serialized public fields are inspected
- **THEN** no private note plaintext, PrivateNoteV0 commitment preimage, private witness, wallet secret, ML-KEM secret key, nullifier secret, profile ID, `npub`, contact key, or `bchcloak:` descriptor is present

#### Scenario: Artifact preserves protocolEvidenceAccepted false

- **GIVEN** valid note commitment preimage verifier evidence
- **WHEN** the artifact is evaluated and serialized
- **THEN** `protocolEvidenceAccepted` is `false`

#### Scenario: Artifact preserves walletNoteRecorded false

- **GIVEN** valid note commitment preimage verifier evidence
- **WHEN** the artifact is evaluated and serialized
- **THEN** `walletNoteRecorded` is `false`

#### Scenario: Artifact preserves walletNoteSpendable false

- **GIVEN** valid note commitment preimage verifier evidence
- **WHEN** the artifact is evaluated and serialized
- **THEN** `walletNoteSpendable` is `false`

#### Scenario: Artifact preserves productionPrivacyClaimed false

- **GIVEN** valid note commitment preimage verifier evidence
- **WHEN** the artifact is evaluated and serialized
- **THEN** `productionPrivacyClaimed` is `false`

### Requirement: Recipient-profile wallet readiness

The evaluator SHALL return a normalized runtime result containing the exact evaluated `noteCommitment32`, verifier identity, evidence digest, effective `noteCommitmentPreimageEvidenceAccepted` outcome, stable failure status, and lifecycle non-claims needed by a later reference-wallet integration.

Reference-wallet integration MUST be able to consume this evaluated result without trusting artifact JSON, wallet-local acceptance booleans, profile names, aggregator authority, or canonical harness provenance. This capability MUST NOT itself mutate wallet state or mark a note recorded or spendable.

#### Scenario: Evaluated runtime result is ready for recipient candidate comparison

- **GIVEN** protocol-runtime evaluates matching verifier-backed note commitment preimage proof evidence
- **WHEN** a later recipient-profile wallet flow receives the evaluated result
- **THEN** the flow can compare the evaluated `noteCommitment32` with its recovered candidate
- **AND** it can require effective scoped acceptance from protocol-runtime
- **AND** no profile ID or recipient marker is required in the runtime artifact
- **AND** wallet recording and spendability remain separate unimplemented gates

