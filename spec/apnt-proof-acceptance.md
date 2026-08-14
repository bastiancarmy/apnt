# apnt-proof-acceptance Specification

## Purpose
TBD - created by archiving change define-apnt-proof-acceptance-v0. Update Purpose after archive.
## Requirements
### Requirement: Recipient recovery is not APNT transfer acceptance

APNT wallets MUST distinguish recipient recovery from APNT transfer acceptance.

A wallet MUST NOT treat a recovered note candidate as accepted solely because a recipient successfully decrypted an APNT recovery packet.

#### Scenario: Bob recovers a candidate before proof acceptance

- **GIVEN** Bob successfully trial-decrypts an APNT recovery packet
- **AND** Bob locally verifies the recovered note candidate against Plane A, Plane B, packet-bin, transition, candidate-binding, and seal evidence
- **AND** APNT proof verification has not succeeded
- **WHEN** the wallet records the result
- **THEN** the wallet records a locally verified recovered note candidate
- **AND** the wallet does not record an accepted APNT note candidate
- **AND** `proofVerificationAccepted` remains `false`
- **AND** `apntAcceptance` remains `false`
- **AND** `acceptedPrivateNote` remains `false`
- **AND** `privateNoteSpendability` remains `false`

### Requirement: APNT transfer acceptance requires proof acceptance

A recovered note candidate MUST become accepted only after recovered candidate verification succeeds and the aggregate transition proof verifies against the APNT verifier statement.

#### Scenario: Candidate verification and proof acceptance both succeed

- **GIVEN** a recipient recovers an APNT note candidate
- **AND** recovered candidate verification succeeds
- **AND** the aggregate transition proof verifies against the APNT verifier statement
- **WHEN** the wallet records acceptance evidence
- **THEN** `proofVerificationAccepted` is `true`
- **AND** `apntAcceptance` is `true`
- **AND** the candidate may be recorded as an accepted APNT note candidate

### Requirement: Proof acceptance is wallet/protocol validation

APNT proof acceptance MUST be determined by wallet/protocol verification of proof material and public transition evidence.

A wallet MUST NOT accept APNT proof material merely because an aggregator supplied it.

#### Scenario: Aggregator provides proof material

- **GIVEN** an aggregator provides an APNT transition transaction and proof material
- **WHEN** a wallet evaluates APNT proof acceptance
- **THEN** the wallet verifies the proof locally
- **AND** the wallet verifies the proof statement binding against public transition evidence
- **AND** the wallet does not accept the proof by aggregator authority

### Requirement: Proof acceptance binds the aggregate transition

The APNT proof acceptance statement MUST bind the aggregate transition evidence required by APNT v0.

At minimum, the proof acceptance boundary MUST bind:

- proof domain and version;
- network;
- transition boundary identifier or transaction identifier where applicable;
- selected seal/outpoint evidence commitment or equivalent;
- Plane A transition commitment;
- Plane B packet-bin commitment;
- aggregate public accounting required by the transition;
- verifier parameters for the selected proof profile.

#### Scenario: Proof statement does not match Plane B

- **GIVEN** a recovered note candidate from a transition transaction
- **AND** the wallet reconstructs the Plane B packet-bin commitment
- **AND** the supplied proof statement binds a different Plane B packet-bin commitment
- **WHEN** the wallet evaluates proof acceptance
- **THEN** proof acceptance fails
- **AND** the recovered candidate is not accepted as an APNT note candidate

### Requirement: Proof acceptance binds consumed seal evidence

The APNT proof acceptance statement MUST bind the selected consumed import seal evidence or an equivalent commitment.

A wallet MUST NOT accept an APNT proof for a recovered candidate if the proof statement is not bound to the transition's selected consumed seal set.

#### Scenario: Proof statement uses different consumed seals

- **GIVEN** a transition consumes selected import seals
- **AND** a recipient recovers and verifies a note candidate from that transition
- **AND** the supplied proof statement binds a different seal/outpoint set
- **WHEN** the wallet evaluates proof acceptance
- **THEN** proof acceptance fails
- **AND** the recovered candidate is not accepted as an APNT note candidate

### Requirement: Recovered candidate verification remains a separate precondition

APNT proof acceptance MUST NOT replace recovered note-candidate verification.

A wallet MUST verify recovered candidate evidence before accepting a recovered candidate, even if the aggregate proof verifies.

#### Scenario: Proof verifies but candidate binding fails

- **GIVEN** an aggregate APNT transition proof verifies
- **AND** Bob recovers a candidate payload
- **AND** candidate-binding recomputation fails
- **WHEN** the wallet evaluates the candidate
- **THEN** the transition may be recorded as proof accepted
- **AND** Bob's candidate is not recorded as an accepted APNT note candidate

### Requirement: Proof acceptance does not require multi-lane state-cell advancement

APNT v0 proof acceptance MUST preserve proof acceptance, state-cell advancement, legacy lane-state reporting, and scaling claims as separate facts.

APNT v0 proof acceptance MUST NOT require a scalable multi-lane state-cell model.

Proof acceptance MAY become a precondition for a future state-cell advancement path, but this spec does not implement accepted state-cell advancement.

A proof-accepted APNT transition MAY produce accepted note candidates while `stateCellAdvanced` remains `false` or unavailable.

If a legacy `laneStateAdvanced` field remains in reports, it MUST be interpreted only as backward-compatible state-cell advancement reporting and MUST NOT imply a multi-lane scaling design.

#### Scenario: Proof accepted without state-cell advancement

- **GIVEN** a transition proof verifies
- **AND** a recovered candidate verifies locally
- **AND** no accepted state-cell advancement model is active
- **WHEN** the wallet records acceptance evidence
- **THEN** `proofVerificationAccepted` is `true`
- **AND** `apntAcceptance` is `true`
- **AND** the candidate may be recorded as accepted
- **AND** `stateCellAdvanced` is `false` or unavailable
- **AND** `laneStateAdvanced`, if present, remains `false`
- **AND** no multi-lane scaling claim is made

### Requirement: Proof acceptance does not imply spendability

APNT proof acceptance MUST NOT imply private-note spendability unless a private-note spend path is separately implemented and verified.

#### Scenario: Candidate accepted but spend path is unavailable

- **GIVEN** a recovered candidate verifies locally
- **AND** the aggregate transition proof is accepted
- **AND** private-note spend verification is not implemented
- **WHEN** the wallet records the accepted candidate
- **THEN** the wallet may record APNT note candidate acceptance
- **AND** `privateNoteSpendability` remains `false`

### Requirement: Proof acceptance must not publish recipient markers

APNT proof acceptance evidence MUST NOT require or publish recipient-specific public markers.

The proof statement, public transition evidence, and public summaries MUST NOT include:

- `bchcloak:` receive descriptors;
- descriptor hashes;
- contact keys;
- npubs;
- profile names;
- recipient groups;
- packet-to-recipient mappings.

#### Scenario: Recipient marker appears in proof statement

- **GIVEN** proof acceptance material includes a recipient descriptor hash or contact key
- **WHEN** the wallet normalizes or verifies the proof acceptance statement
- **THEN** the statement is rejected
- **AND** APNT proof acceptance fails

### Requirement: Public scan hints remain batch-level only

APNT proof acceptance material MUST keep public scan hints batch-level only.

APNT proof acceptance MAY use public batch-level scan hints only when they do not identify recipients or packet-to-recipient assignments.

Recipient-specific scan hints MUST be forbidden.

Public proof acceptance material MUST NOT include recipient-specific scan hints.

#### Scenario: Batch-level hint is aggregate only

- **GIVEN** a public hint reports aggregate packet-bin count and carrier profile
- **WHEN** wallets scan the transaction
- **THEN** the hint may be used as batch-level scan assistance
- **AND** the hint does not reveal which packet belongs to which recipient

### Requirement: Proof acceptance reporting preserves separate lifecycle facts

Proof acceptance reports MUST keep separate fields for chain observation, recovered candidate verification, proof verification, APNT acceptance, note candidate acceptance, state-cell advancement status, legacy lane-state reporting if present, and private-note spendability.

#### Scenario: Proof acceptance report is emitted

- **GIVEN** a wallet evaluates an APNT transition
- **WHEN** the wallet emits proof acceptance evidence
- **THEN** the report separately records whether proof material was present
- **AND** whether proof verification was attempted
- **AND** whether proof verification succeeded
- **AND** whether the verifier statement binding matched
- **AND** whether APNT acceptance was reached
- **AND** whether recovered candidates were accepted
- **AND** whether state-cell advancement was accepted
- **AND** whether any legacy `laneStateAdvanced` field remains false unless a separate state-cell advancement model is implemented
- **AND** whether private-note spendability is available

### Requirement: Proof acceptance preserves APNT non-claims

Unless corresponding implementation exists, proof acceptance documentation and reports MUST NOT claim:

- production privacy;
- Zcash equivalence;
- complete post-quantum private money;
- production fee market;
- quote negotiation;
- Nostr protocol validation;
- aggregator authority;
- private-note spendability.

#### Scenario: Proof acceptance succeeds

- **GIVEN** an APNT proof verifies
- **WHEN** the wallet records proof acceptance
- **THEN** production privacy is not claimed
- **AND** Zcash equivalence is not claimed
- **AND** complete post-quantum private money is not claimed
- **AND** private-note spendability is not claimed unless separately verified

### Requirement: Missing proof material blocks acceptance rather than failing recovery

If proof material is absent, APNT wallets MUST report proof acceptance as blocked or unavailable, not as recipient recovery failure.

Recipient recovery and recovered candidate verification MAY still succeed when proof material is absent.

#### Scenario: Recovery succeeds but proof material is absent

- **GIVEN** Bob recovers and verifies an APNT note candidate
- **AND** no APNT proof material is available
- **WHEN** the wallet evaluates proof acceptance
- **THEN** recipient recovery remains successful
- **AND** recovered candidate verification remains successful
- **AND** proof acceptance is reported as blocked or unavailable
- **AND** the recovered candidate is not accepted as an APNT note candidate

### Requirement: Proof acceptance must preserve BCH consensus boundary

APNT proof acceptance MUST be represented as wallet/protocol validation, not BCH consensus validation.

Reports MUST NOT imply that BCH validates APNT proof acceptance, accepted note candidates, or private-note spendability.

#### Scenario: BCH transaction is valid but APNT proof is missing

- **GIVEN** a BCH transaction is valid under BCH transaction and script rules
- **AND** the transaction carries APNT transition-boundary material
- **AND** APNT proof material is missing
- **WHEN** the wallet evaluates APNT acceptance
- **THEN** the BCH transaction may remain valid
- **AND** APNT proof acceptance remains unavailable
- **AND** accepted APNT note candidates are not recorded

