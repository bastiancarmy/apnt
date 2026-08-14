# apnt-live-validation Specification

## Purpose
TBD - created by archiving change define-apnt-recovery-packets-and-replace-plane-b-scaffold-v0. Update Purpose after archive.
## Requirements
### Requirement: Live validation models independent aggregated private note transfers

The APNT live validation flow MUST model aggregate transitions as independent sender/recipient private note transfers, not repeated Alice-to-Bob test traffic.

For a configured transfer count of ten, the live flow MUST create ten logical sender/recipient transfer records, ten recipient-local outstanding receive states, ten one-time receive descriptors, and ten encrypted recipient recovery packets.

The aggregator MUST assemble the aggregate consume/transition transaction and Plane B carrier outputs without becoming the recipient identity layer, custody layer, validation authority, or holder of recipient-local receive secrets.

#### Scenario: Ten independent transfers are aggregated

- **GIVEN** a live validation run configured for ten APNT private note transfers
- **WHEN** the aggregate transition is materialized
- **THEN** the run contains ten independent sender/recipient transfer records
- **AND** ten encrypted recovery packets are produced
- **AND** the aggregate transaction consumes selected covenant/seal inputs
- **AND** Plane A binds the Plane B packet-bin commitment material
- **AND** no public Plane B field maps a packet to a recipient

### Requirement: Live validation replaces Plane B scaffold bytes with encrypted recovery packet bytes

The APNT live validation script MUST replace synthetic Plane B scaffold packet-bin bytes with real encrypted APNT recovery packet-bin bytes.

The live script MUST NOT report `scaffold-packet-bin-evidence` once real encrypted recovery packet-bin bytes are materialized.

The live script MUST report `encrypted-recovery-packet-bin-v0` or the current equivalent packet material status.

#### Scenario: Plane B bytes are real recovery packets

- **GIVEN** the APNT transition output artifact is materialized
- **WHEN** Plane B packet-bin bytes are built
- **THEN** the bytes are derived from encoded APNT recovery packets and padding
- **AND** the bytes are not synthetic scaffold bytes
- **AND** the packet material status reports encrypted recovery packet material
- **AND** Plane A binds the resulting Plane B packet-bin commitment

### Requirement: Live validation preserves current same-transaction 7x197 packet-bin length unless explicitly changed

The same-transaction `7x197` Plane B live-validation path MUST use the existing v0 commitment parameters unless a separate intentional change updates the invariant:

- `carrierPayloadBytes: 197`
- `carrierCount: 7`
- `packetBinByteLength: 1344`
- `paddingPolicy: "profile-selected"`

The implementation MUST NOT silently increase the committed `packetBinByteLength` to the total carrier payload capacity.

#### Scenario: Plane B replacement preserves current commitment length

- **GIVEN** a live APNT transition using the same-transaction `7x197` carriage profile
- **WHEN** the recovery packet-bin is materialized
- **THEN** the committed packet-bin byte length is `1344`
- **AND** Plane A binds a packet-bin commitment computed over real encrypted recovery packet-bin bytes
- **AND** the packet material status is not scaffold evidence

### Requirement: Live validation supports explicit multi-packet-bin capacity handling

The live validation flow MUST support a configured aggregate transfer count and MUST report the resulting Plane B packet-bin count, carrier output count, packet-bin byte length, padding byte length, and total Plane B carrier output value.

If the selected carriage profile cannot fit all encrypted recovery packets in one packet bin, the implementation MUST either materialize additional packet bins/carrier groups or fail closed with a capacity error.

The implementation MUST NOT silently omit recipient recovery packets.

#### Scenario: Ten-transfer simulation reports Plane B carrier cost

- **GIVEN** a live validation run configured for ten note-candidate recovery packets
- **WHEN** encrypted recovery packets are materialized
- **THEN** the summary reports recipient packet count `10`
- **AND** reports the packet-bin count required by the selected carriage profile
- **AND** reports total Plane B carrier output count
- **AND** reports total Plane B carrier value
- **AND** does not claim the capacity result is production privacy or global scaling

### Requirement: Live validation verifies recipient recovery by trial decryption

The live validation flow MUST verify that recipient wallets can recover their packets by local trial decryption across the aggregate Plane B packet set.

The validation MUST record attempted decryptions, failed authentications, successful decryptions, and recovered note-candidate verification results.

The validation MUST NOT publish a recipient-to-packet mapping as public protocol metadata.

#### Scenario: Each recipient recovers without public packet assignment

- **GIVEN** an aggregate transition with encrypted recovery packets
- **AND** each recipient has local outstanding receive state
- **WHEN** each recipient scans the aggregate packet set
- **THEN** non-matching packets fail authentication
- **AND** each intended packet decrypts with its matching local state
- **AND** each recipient verifies a recovered note candidate locally
- **AND** public artifacts do not identify which packet belonged to which recipient

### Requirement: Live validation narrows scanning by APNT protocol shape

Recipient scan simulation MUST support narrowing chain scanning to APNT-shaped transactions and Plane B carrier outputs.

The scan path MAY filter for APNT aggregation transition output markers, valid Plane A fields, and same-transaction Plane B carrier output shape.

The scan path MUST NOT narrow using public recipient-specific markers.

#### Scenario: Recipient scans APNT-shaped transaction data

- **GIVEN** a recipient wallet scans chain-derived transaction evidence
- **WHEN** it finds an APNT aggregation transition output
- **THEN** it reconstructs the same-transaction Plane B packet-bin set
- **AND** verifies the packet-bin commitment against Plane A
- **AND** trial-decrypts packet records using local outstanding receive state
- **AND** does not require a public recipient marker

### Requirement: Live validation reports trial-decryption work

The live summary MUST report trial-decryption work for recovered packet discovery.

The summary MUST include packet record count, outstanding receive state count, attempted decryptions, failed authentications, successful decryptions, and elapsed time if measured.

#### Scenario: Ten-transfer scan work is reported

- **GIVEN** a ten-transfer APNT live validation run
- **WHEN** recipient recovery scanning completes
- **THEN** the summary reports packet record count `10`
- **AND** reports trial-decryption attempt count
- **AND** reports successful decrypt count
- **AND** reports failed authentication count
- **AND** does not publish a public recipient packet assignment

### Requirement: Live validation preserves explicit non-claims

Successful Plane B recovery packet replacement and recovered note-candidate verification MUST NOT imply spendability, production privacy, proof acceptance, lane advancement, or final APNT acceptance.

The live summary MUST preserve explicit false non-claims.

#### Scenario: End-to-end recovered candidates do not overclaim

- **GIVEN** Plane B scaffold bytes are replaced with real encrypted recovery packet-bin bytes
- **AND** recipients recover and verify note candidates locally
- **WHEN** the live summary is written
- **THEN** `apntAcceptance` remains `false`
- **AND** `acceptedPrivateNote` remains `false`
- **AND** `privateNoteSpendability` remains `false`
- **AND** `proofVerificationAccepted` remains `false`
- **AND** `productionPrivacy` remains `false`
- **AND** `globalScalingSolved` remains `false`

### Requirement: Live validation selects the smallest explicit standardness-safe recovery profile

APNT live validation MUST select an explicit same-transaction Plane B carriage profile for recovery packet-bin bytes.

For the current spendable carrier shape `<payload> OP_DROP OP_1`, live validation MUST keep carrier payload bytes less than or equal to `197` so the resulting standard spendable locking bytecode remains within the `201` byte standardness boundary.

Live validation SHOULD use the smallest standardness-safe `197` byte carrier profile that fits the measured encoded recovery packet.

If a minimized encoded recovery packet fits `10x197`, live validation SHOULD use the `10x197` recovery profile rather than the larger `15x197` full-payload fallback.

If the measured packet does not fit the selected profile, the implementation MUST fail closed or use an explicitly documented larger fallback profile.

The implementation MUST NOT silently omit recipient recovery packets.

#### Scenario: Minimized recovery packets use 10x197 when they fit

- **GIVEN** a minimized encoded recovery packet that fits within `1970` packet-bin bytes
- **WHEN** the live validation flow selects Plane B recovery carriage
- **THEN** it selects an explicit `10x197` recovery profile
- **AND** each carrier payload remains at most `197` bytes
- **AND** ten recipient packets imply ten packet bins and 100 Plane B carrier outputs
- **AND** no recipient recovery packet is omitted
- **AND** the summary continues to report the residual scaling blocker

### Requirement: Live validation derives aggregation carrier funding dynamically

The live validation harness MUST compute aggregate public overhead from the selected APNT transition output policy, selected seal inputs, Plane B carrier outputs, consume transaction fee, and minimum Plane A transition output.

The selected sender-funded transfer intents MUST collectively cover the aggregate public overhead required by the selected batch.

The configured transfer count is a validation target, not an APNT protocol constant.

#### Scenario: Selected funded intents cover aggregate public overhead

- **GIVEN** selected transfer intents have sender-funded overhead contributions
- **AND** the APNT transition output policy requires Plane B carrier output value
- **AND** the consume transaction requires an explicit fee
- **WHEN** the live harness evaluates the selected batch
- **THEN** the harness MUST compute aggregate required public overhead
- **AND** the harness MUST compute aggregate selected sender-offered overhead
- **AND** the harness MUST report whether the selected funded intents cover the aggregate public overhead
- **AND** the harness MUST report that the target validation count is not a protocol constant

#### Scenario: Selected funded intents underfund aggregate public overhead

- **GIVEN** the selected funded intents do not collectively cover aggregate public overhead
- **WHEN** the consume transaction would otherwise be constructed
- **THEN** the harness SHOULD fail closed before broadcast
- **AND** the failure SHOULD report selected funded intent count, target validation count, selected seal input value, aggregate required public overhead, aggregate offered overhead, and funding shortfall

### Requirement: Live validation distinguishes carrier value from private note value

The live validation harness MUST distinguish Plane B carrier values from private note values.

Plane B carrier values are public BCH postage/recovery-carrier values.

Carrier values MUST NOT be reported as private note values.

#### Scenario: Carrier values are public postage

- **WHEN** the live validation harness reports Plane B carrier outputs
- **THEN** it MUST report carrier values as public BCH postage or recovery-carrier values
- **AND** it MUST NOT report carrier values as private note values

### Requirement: Live validation gates APNT transition-boundary consume broadcast behind explicit chipnet smoke intent

The live validation harness MUST gate APNT transition-boundary consume broadcast behind explicit chipnet smoke intent and matching local VM verification.

Live validation MAY submit an APNT transition-boundary consume transaction to chipnet only when the caller explicitly enables chipnet smoke broadcast, the consume preview has already been locally VM verified, and the preview preserves the APNT transition-boundary output policy.

This is live smoke evidence only. It MUST NOT be reported as APNT acceptance, proof verification acceptance, lane advancement, accepted private notes, private-note spendability, production privacy, or protocol validation by authority.

The explicit smoke value-moving output policy and the APNT transition-boundary output policy MUST remain distinct. The smoke value-moving output policy may test final broadcast plumbing, but it does not preserve the Plane A transition output or Plane B carrier outputs.

#### Scenario: APNT transition-boundary consume preview is locally verified but broadcast is refused by default

- **GIVEN** a consume preview built from an APNT transition output artifact
- **AND** the preview preserves the Plane A transition output and Plane B carrier outputs
- **AND** local VM verification succeeds for that exact preview
- **WHEN** chipnet smoke broadcast is not explicitly enabled
- **THEN** the aggregator MUST refuse broadcast
- **AND** the refusal MUST preserve `proofVerificationAccepted: false`
- **AND** the refusal MUST preserve `apntAcceptance: false`
- **AND** the refusal MUST preserve `laneStateAdvanced: false`
- **AND** the refusal MUST preserve `acceptedPrivateNote: false`
- **AND** the refusal MUST preserve `privateNoteSpendability: false`
- **AND** the refusal MUST preserve `productionPrivacy: false`

#### Scenario: Explicit chipnet smoke broadcast submits a locally verified APNT transition-boundary preview

- **GIVEN** a consume preview built from an APNT transition output artifact
- **AND** local VM verification succeeds for that exact preview
- **AND** chipnet smoke broadcast is explicitly enabled
- **WHEN** the aggregator submits the consume transaction
- **THEN** the broadcast evidence MUST report `broadcastSubmitted: true`
- **AND** the evidence MUST report the APNT transition-boundary output policy distinctly from the explicit smoke value-moving output policy
- **AND** the evidence MUST preserve `proofVerificationAccepted: false`
- **AND** the evidence MUST preserve `apntAcceptance: false`
- **AND** the evidence MUST preserve `laneStateAdvanced: false`
- **AND** the evidence MUST preserve `acceptedPrivateNote: false`
- **AND** the evidence MUST preserve `privateNoteSpendability: false`
- **AND** the evidence MUST preserve `productionPrivacy: false`
- **AND** the evidence MUST preserve that chipnet/indexer/relay evidence is not consensus authority or APNT protocol truth

#### Scenario: Explicit smoke value-moving broadcast remains only a plumbing test

- **GIVEN** a consume preview built without an APNT transition output artifact
- **AND** the preview uses an explicit caller-supplied smoke output locking bytecode
- **WHEN** the aggregator submits the consume transaction with chipnet smoke broadcast explicitly enabled
- **THEN** the broadcast MAY prove final consume broadcast plumbing
- **BUT** the evidence MUST NOT claim that the APNT transition-boundary output was preserved
- **AND** the evidence MUST NOT claim APNT acceptance, lane advancement, accepted private notes, private-note spendability, or production privacy

### Requirement: Live validation deterministically accounts for Plane B carrier value

The live validation harness MUST deterministically account for Plane B carrier value before APNT transition consume construction.

The live validation path MUST NOT use an unsafe hard-coded default value for real APNT Plane B carrier outputs.

For each real APNT Plane B carrier output, live validation MUST derive, compute, or otherwise verify a dust/min-output-safe `valueSats` for the actual carrier locking bytecode.

#### Scenario: Carrier output value is below dust/min-output requirement

- **GIVEN** a real APNT transition path with Plane B carrier outputs
- **AND** a carrier output value below the computed dust/min-output requirement
- **WHEN** the consume preview would otherwise be constructed
- **THEN** the harness MUST fail closed
- **AND** the failure MUST report the computed minimum carrier value
- **AND** the failure MUST report the selected carrier output value
- **AND** the failure MUST NOT claim APNT acceptance, proof acceptance, lane advancement, accepted private notes, private-note spendability, or production privacy

#### Scenario: Carrier output value is dust/min-output safe

- **GIVEN** a real APNT transition path with Plane B carrier outputs
- **AND** each carrier output value is greater than or equal to the computed dust/min-output requirement
- **WHEN** the consume preview is constructed
- **THEN** the harness MUST report the per-carrier dust/min-output value
- **AND** the harness MUST report the selected carrier output value
- **AND** the harness MUST report total Plane B carrier value
- **AND** the harness MUST report that carrier values are BCH postage/recovery-carrier values, not private note values

### Requirement: Live validation emits public recovered candidate match evidence

The live APNT validation flow SHALL emit public-safe recovered candidate match evidence after local minimized recovery candidate verification succeeds.

The artifact SHALL be written as:

```text
artifacts/17-recovered-candidate-public-match.summary.json
```

The artifact SHALL NOT contain private receive state, ML-KEM secret keys, private note plaintext, note openings, spend keys, wallet seeds, nullifier secrets, nullifier preimages, contact keys, `npub`, `bchcloak:` descriptors, or recipient markers.

#### Scenario: verified minimized recovered candidates are summarized without private material

Given the APNT transition-output materialization has built minimized recovery packets
And local ML-KEM trial decryption succeeds
And minimized recovered candidate verification accepts recovered candidate evidence
When the recovered candidate match summary is written
Then it SHALL include:
- `version`
- `kind`
- `network`
- `recoveryVerificationMode`
- `privateMaterialOnChain`
- `includedInPublicSummaryMetadata`
- `publicRecipientMappingPublished`
- `packetToRecipientMappingPublished`
- `recipientSpecificPublicScanHints`
- `localOnlyReceiveStateUsed`
- `recoveryPacketVerifiedLocally`
- `candidateBindingRecomputationSucceeded`
- `matchedRecoveredCandidateCount`
- `matchedRecoveredCandidates`

And each `matchedRecoveredCandidates` entry SHALL include:
- `transferIndex`
- `selectedSealIndex`
- `selectedSealOutpoint`
- `noteCommitment32`
- `recoveryPacketHash32`
- `candidateBinding32`
- `transitionStatementBind32`
- `proofTranscriptBind32`
- `consumedSealSetCommitment32`
- `newNoteBatchRoot32`
- `planeBPacketBinCommitment32`
- `candidateBindingRecomputed`
- `noteCommitmentRecomputed`
- `recoveryPacketHashVerified`
- `packetBinInclusionVerified`
- `packetBinRootVerified`
- `batchManifestRootVerified`
- `aggregatePlaneBPacketBinCommitmentVerified`
- `planeABindsPlaneB`
- `sealOutpointEvidenceVerified`
- `recoveredCandidateEvidenceVerified`
- `boundaryEvidenceOnly`

### Requirement: Lifecycle candidate binding uses verified recovered candidate facts

The live APNT validation flow SHALL build lifecycle candidate binding evidence from verified recovered candidate public facts, not synthetic candidate values.

The lifecycle candidate binding artifact SHALL remain:

```text
artifacts/<profile>/14-candidate-binding.json
```

#### Scenario: profile lifecycle candidate matches recovered candidate

Given a profile has a lifecycle seal-open artifact for a seal outpoint
And the recovered candidate summary contains exactly one verified recovered candidate for the same seal outpoint
When lifecycle candidate binding is generated
Then `candidateBinding32` SHALL come from the verified recovered candidate
And `noteCommitment32` SHALL come from the verified recovered candidate
And `recoveryPacketHash32` SHALL come from the verified recovered candidate
And the candidate binding artifact SHALL include a `recoveredCandidatePublicMatch` section
And the flow SHALL fail closed if no verified recovered candidate matches the seal outpoint
And the flow SHALL fail closed if more than one verified recovered candidate matches the seal outpoint.

### Requirement: Lifecycle transition boundary binds to APNT transition output

The live APNT validation flow SHALL bind lifecycle transition-boundary evidence to the APNT transition output.

#### Scenario: transition boundary uses APNT transition binds

Given `09-apnt-transition-output.json` contains `apntTransitionOutput.transitionStatementBind32`
And `09-apnt-transition-output.json` contains `apntTransitionOutput.proofTranscriptBind32`
When lifecycle transition-boundary evidence is generated
Then the boundary SHALL use those two values
And it SHALL NOT use synthetic per-profile transition or proof binds.

### Requirement: Accepted private note gate summary remains non-accepting until durable blockers clear

The live APNT validation flow SHALL emit an accepted-private-note gate summary without flipping accepted private note status.

The artifact SHALL be written as:

```text
artifacts/18-accepted-private-note-gate.summary.json
```

#### Scenario: same-run recovered candidate matches but durable blockers remain

Given the recovered candidate matches the lifecycle candidate in the same run
And local recovery packet verification succeeded
And wallet-local receive material exists
But nullifier non-reuse against chain truth is not implemented
Or durable accepted-note record creation is not implemented
When the accepted-private-note gate summary is written
Then it SHALL set `sameRunRecoveredCandidateMatchesAcceptedCandidate=true`
And it SHALL set `recoveryPacketVerifiedLocally=true`
And it SHALL set `walletHasRequiredPrivateNoteMaterial=true`
And it SHALL set `nullifierNonReuseCheckedAgainstChainTruth=false`
And it SHALL set `durableAcceptedNoteRecordCreated=false`
And it SHALL set `acceptance.acceptedApntLiveLocalPrototype=true`
And it SHALL set `acceptance.acceptedPrivateNotePrototype=true`
And it SHALL set `acceptance.acceptedPrivateNote=false`
And it SHALL set `acceptance.privateNoteSpendability=false`
And it SHALL set `acceptance.bchEnforcedFullApntValidity=false`
And it SHALL set `acceptance.productionPrivacy=false`.

### Requirement: Live summary links recovered candidate and private note gate reports

The live APNT validation summary SHALL include paths to the recovered candidate public match summary and the accepted-private-note gate summary.

#### Scenario: live summary lists new report artifacts

Given a live APNT validation run emitted recovered candidate match and accepted-private-note gate summaries
When `live-summary.json` is written
Then its artifact paths SHALL include:
- `recoveredCandidatePublicMatchSummary`
- `acceptedPrivateNoteGateSummary`

