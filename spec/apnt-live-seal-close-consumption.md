# apnt-live-seal-close-consumption Specification

## Purpose
TBD - created by archiving change add-apnt-live-seal-close-consumption. Update Purpose after archive.
## Requirements
### Requirement: batch-capable seal consume transaction

The system SHALL provide a narrow chipnet path where one aggregator/batch transaction can spend one or more selected APNT import-funding seal outputs.

#### Scenario: consume selected live APNT import-funding seals

Given one or more known APNT import-funding seal outpoints
And the required signing or spend material is available for each
When one consume transaction is assembled and broadcast on chipnet
Then the transaction SHALL spend each selected exact seal outpoint
And each consumed output SHALL no longer be reported as unspent by chain-io.

The consume path MUST treat selected seal outpoints as a collection, even when the current live demonstration only includes one selected outpoint.

### Requirement: chain-derived seal-close evidence

The system SHALL verify seal-close only from real consumed-outpoint evidence.

#### Scenario: consumed outpoint becomes spent-outpoint

Given a seal-open evidence artifact for a consumed seal
And chain-io consumed-outpoint lookup returns `spent-outpoint` for that consumed seal
When `wallet lifecycle-seal-close` is run for that consumed seal
Then seal-close evidence SHALL be produced for that consumed seal
And it SHALL include:

```text
consumedSealOutpoint
consumptionTxid
inputIndex
previousSealCommitment32
previousOutputFingerprint32
importFundingCellCommitment32
eligibilityStatementBind32
```

And the evidence SHALL keep:

```text
proofVerificationAccepted: false
apntAcceptance: false
acceptedPrivateNote: false
privateNoteSpendability: false
```

### Requirement: transition boundary remains non-accepting

The system SHALL allow transition-boundary evidence to be materialized from real seal-close evidence, without claiming proof verification or spendability.

#### Scenario: transition boundary from real seal-close

Given real seal-close evidence
And candidate binding evidence for the same seal
And caller-supplied `transitionStatementBind32` and `proofTranscriptBind32`
When transition-boundary materialization is run
Then transition-boundary evidence SHALL bind the seal-close and candidate facts
And SHALL NOT claim proof verification, APNT acceptance, accepted note state, or spendability.

### Requirement: live evidence documentation

The system SHALL include a live chipnet evidence note for this demonstration.

#### Scenario: record live seal-close evidence

Given the live seal-close demonstration has run
Then the evidence note SHALL record:

```text
each seal-open txid:vout
shared consume transaction txid
per-seal input index
per-seal chain-io consumed-outpoint status
per-seal seal-close evidence artifact path
per-seal transition-boundary evidence artifact path if produced
validation commands
explicit non-claims
```

### Requirement: real consume candidate construction requires chain-derived seal-open facts

The system SHALL refuse real value-moving consume transaction candidate construction unless every selected seal has chain-derived seal-open evidence with status `verified-output-exists`.

#### Scenario: refuse construction without chain-derived seal-open evidence

Given a selected APNT import-funding seal outpoint
And local handoff evidence for that selected outpoint
And preconsume chain-io evidence showing the selected outpoint is `unspent`
But no chain-derived seal-open evidence with status `verified-output-exists`
When real consume candidate construction is requested
Then the system SHALL refuse construction
And the refusal SHALL state that chain-derived seal-open evidence is required
And the system SHALL keep `broadcastSubmitted`, `sealCloseObserved`, `proofVerificationAccepted`, `apntAcceptance`, `acceptedPrivateNote`, and `privateNoteSpendability` false.

#### Scenario: refuse construction when seal-open facts do not match the selected seal

Given a selected APNT import-funding seal outpoint
And chain-derived seal-open evidence for that selected outpoint
When the seal-open value, locking bytecode hash, output fingerprint, importFundingCellCommitment32, or eligibilityStatementBind32 does not match the selected seal facts
Then the system SHALL refuse real consume candidate construction
And the system SHALL keep `broadcastSubmitted`, `sealCloseObserved`, `proofVerificationAccepted`, `apntAcceptance`, `acceptedPrivateNote`, and `privateNoteSpendability` false.

### Requirement: local handoff values are not accounting truth

The system SHALL NOT use local JSON handoff `expectedValueSats` as accounting truth for real value-moving consume transaction output construction.

The system SHALL use chain-derived seal-open output facts as the accounting source for real consume candidate construction.

#### Scenario: preconsume unspent evidence is not enough for value construction

Given a selected APNT import-funding seal outpoint
And local handoff `expectedValueSats`
And preconsume chain-io evidence showing the selected outpoint is `unspent`
But no verified chain-derived seal-open output facts
When real consume candidate construction is requested
Then the system SHALL refuse construction
And the system SHALL NOT compute output value from local handoff `expectedValueSats` alone.

### Requirement: consume verification inputs require full locking evidence

Consume preview construction and local VM verification SHALL use chain-derived output-existence artifacts that include the locking bytecode required to execute the direct-P2S consume gate.

Full aggregator output-existence artifacts that include `providerEvidence.lockingBytecode` SHALL be valid consume/local-VM inputs when the rest of the selected seal facts match.

Minimal wallet-facing chain seal-open summary artifacts SHALL NOT be sufficient as consume preview or local VM verification inputs unless they are explicitly enriched with equivalent locking bytecode and matching chain-derived seal-open facts.

#### Scenario: full output-existence artifact is consume-ready

Given a selected APNT import-funding seal outpoint
And a full chain-derived output-existence artifact for that seal
And the artifact includes `providerEvidence.lockingBytecode`
And the locking bytecode matches the selected seal facts
When consume preview or local VM verification is requested
Then the artifact MAY be used as a consume/local-VM input
And the system SHALL still preserve `proofVerificationAccepted`, `apntAcceptance`, `laneStateAdvanced`, `acceptedPrivateNote`, `privateNoteSpendability`, `productionPrivacy`, and `lifecycleSealClose` as false.

#### Scenario: minimal wallet seal-open summary is not consume-ready

Given a selected APNT import-funding seal outpoint
And a wallet-facing chain seal-open summary artifact for that seal
But the artifact does not include locking bytecode equivalent to `providerEvidence.lockingBytecode`
When consume preview or local VM verification is requested
Then the system SHALL refuse the artifact as a consume/local-VM input
And the refusal SHALL state that full output-existence locking evidence or an explicitly enriched seal-open artifact is required.

### Requirement: preconsume unspent is not seal-close evidence

The system SHALL treat preconsume `unspent` evidence only as construction eligibility.

The system SHALL NOT treat preconsume `unspent` evidence as seal-close evidence.

Post-broadcast seal-close evidence SHALL require chain-io consumed-outpoint evidence with status `spent-outpoint`.

#### Scenario: unspent evidence does not close a seal

Given preconsume chain-io evidence with status `unspent`
When lifecycle seal-close evidence is requested
Then the system SHALL refuse seal-close evidence construction
And the system SHALL require post-broadcast consumed-outpoint evidence with status `spent-outpoint`.

### Requirement: Non-broadcast batch consume candidate construction

The reference aggregator MUST construct a real, non-broadcasted batch consume transaction candidate from verified construction inputs.

#### Scenario: Construct candidate from verified construction inputs
- GIVEN one or more selected APNT import-funding seal outpoints
- AND preconsume evidence confirms each selected outpoint is currently `unspent`
- AND chain-derived seal-open evidence has been verified for each selected outpoint
- WHEN the aggregator constructs a consume candidate
- THEN the candidate transaction inputs preserve the verified selected input order
- AND each planned input index is recorded
- AND input value accounting is derived from verified chain-derived seal-open facts
- AND local handoff `expectedValueSats` is not used as accounting truth
- AND the candidate uses an explicit output policy
- AND the candidate is not submitted to the network
- AND `broadcastSubmitted`, `aggregatorConsumption`, and `sealCloseObserved` remain false
- AND `proofVerificationAccepted`, `apntAcceptance`, `acceptedPrivateNote`, and `privateNoteSpendability` remain false

#### Scenario: Refuse unverified construction inputs
- GIVEN selected seal planning data without successful verified construction inputs
- WHEN candidate construction is requested
- THEN construction is refused
- AND no transaction hex is produced
- AND no provider submission is attempted
- AND `broadcastSubmitted`, `aggregatorConsumption`, and `sealCloseObserved` remain false

### Requirement: APNT import-funding consume MUST use direct P2S

The APNT import-funding consume path MUST use the direct-P2S APNT import-funding consume gate.

It MUST NOT use P2SH wrapping for architecture, local diagnostics, preview construction, broadcast preparation, or chipnet smoke testing.

The direct-P2S locking bytecode MUST be derived from the APNT import-funding CASM source of truth:

```text
packages/protocol-runtime/src/cashassembly/apnt_import_funding_srq3_aggregator_consumption_v0.casm
```

The implementation MUST NOT carry a divergent embedded copy of this CASM source.

This gate is a per-import-funding-cell consume gate. It is not the full APNT aggregation transition verifier.

#### Scenario: direct-P2S consume gate is standard-size eligible

Given the APNT import-funding direct-P2S consume gate is compiled under the 2026 VM path
When the locking bytecode is measured
Then the locking bytecode MUST be no larger than the 2026 P2S standard locking bytecode limit of 201 bytes
And the current proven gate is 198 bytes
And no P2SH wrapping is used.

#### Scenario: direct-P2S consume witness order is fixed

Given a selected APNT import-funding seal-open output
And a validated SRQ3/TRQ1 witness
When the reference aggregator constructs the consume unlocking bytecode
Then it MUST push witness chunks in this exact order:

```text
proofChunk0
proofChunk1
proofChunk2
```

And it MUST NOT infer, reverse, sort, or otherwise guess witness ordering.

The proof chunks are an interim proven ABI requirement for the current direct-P2S consume gate. They MUST NOT be justified as a workaround for the historical 520-byte stack-element limit.

A future ABI cleanup MAY replace the three proof chunks with a single carrier only if the direct-P2S locking script, unlocking bytecode, standardness, and local 2026 VM verification are re-proven.

#### Scenario: reversed witness order is not accepted

Given the same witness chunks are ordered as `proofChunk2`, `proofChunk1`, `proofChunk0`
When local 2026 VM verification is run
Then verification MUST fail
And the reference aggregator MUST NOT produce this order.

### Requirement: direct-P2S unlocking integration MUST remain no-broadcast

The reference aggregator MUST NOT broadcast, submit, or provider-submit a direct-P2S consume candidate during the direct-P2S unlocking integration slice.

The reference aggregator MAY construct direct-P2S consume unlocking bytecode for a consume candidate only after verified chain-derived construction inputs are available.

The implementation MUST NOT submit the transaction to a provider in this slice.

The implementation MUST NOT add `submitRawTransaction`, provider submission, or any equivalent broadcast path.

#### Scenario: chain-derived seal-open evidence gates direct-P2S construction

Given selected local handoff material
When the reference aggregator constructs a direct-P2S consume candidate
Then each selected seal MUST have verified chain-derived seal-open evidence
And candidate value accounting MUST use chain-derived `actualValueSats`
And local handoff expected values MUST NOT be used as accounting truth.

#### Scenario: mismatched direct-P2S seal-open facts fail closed

Given a selected seal-open evidence item
When its locking bytecode, output fingerprint, `importFundingCellCommitment32`, or `eligibilityStatementBind32` does not match the expected APNT import-funding consume facts
Then the reference aggregator MUST refuse consume candidate construction
And no transaction hex SHALL be produced
And no provider submission SHALL be attempted.

#### Scenario: malformed direct-P2S witness chunks fail closed

Given selected seal-open evidence is otherwise valid
But one or more SRQ3/TRQ1 witness chunks are missing, malformed, mis-sized, or mismatched
When the reference aggregator constructs a direct-P2S consume candidate
Then construction MUST fail closed
And no provider submission SHALL be attempted.

### Requirement: value-moving chipnet smoke output policy MUST be explicit

The placeholder OP_RETURN/full-sum output policy MUST be replaced before chipnet broadcast.

The value-moving output policy MUST be explicit, deterministic, and classified as a chipnet smoke policy.

The output value MUST equal the sum of chain-derived input values minus an explicit deterministic fee.

The value-moving chipnet smoke output MUST be direct P2S only.

The value-moving chipnet smoke output MUST NOT use P2PKH, P2SH, or OP_RETURN, even for chipnet smoke or diagnostics.

The value-moving output policy MUST NOT introduce transparent P2PKH change as architecture.

The value-moving output policy MUST NOT place Bob's contact key, `npub`, `bchcloak:` descriptor, receive descriptor, profile label, handoff label, or other recipient marker on-chain.

#### Scenario: no identity marker is placed on-chain

Given a value-moving chipnet smoke output policy
When the consume candidate is constructed
Then the output locking bytecode MUST NOT encode a recipient contact key, Nostr key, `bchcloak:` descriptor, profile label, handoff label, or public readable recipient marker.

### Requirement: local VM verification precedes chipnet broadcast

Before task 1.4 chipnet broadcast, the constructed consume candidate MUST be locally verified with `createVirtualMachineBch2026.verify`.

The local VM verification MUST use direct P2S only.

The local VM verification MUST prove the candidate's APNT import-funding input unlocking bytecode satisfies the direct-P2S consume gate.

The local VM verification MUST NOT claim proof acceptance, APNT acceptance, lane state advancement, accepted private note state, private-note spendability, production privacy, or lifecycle seal-close.

#### Scenario: local direct-P2S verification succeeds without broadcast

Given a consume candidate with verified chain-derived inputs
And direct-P2S unlocking bytecode using witness order `proofChunk0`, `proofChunk1`, `proofChunk2`
And an explicit value-moving chipnet smoke output policy
When `createVirtualMachineBch2026.verify` verifies the candidate locally
Then the candidate MAY be classified as locally direct-P2S verified
And provider submission MUST still not occur in this slice
And all non-claims MUST remain false.

### Requirement: Slice A direct-P2S unlocking integration

The next consume implementation slice MUST wire APNT direct-P2S import-funding consume unlocking bytecode into the reference aggregator candidate without broadcasting.

The slice MUST construct unlocking bytecode from validated SRQ3/TRQ1 witness chunks in the exact order `proofChunk0`, `proofChunk1`, `proofChunk2`.

The slice MUST keep `broadcastable` false unless all broadcast prerequisites are implemented.

#### Scenario: Slice A does not broadcast

Given direct-P2S unlocking bytecode is added to the reference aggregator candidate
When the candidate is constructed
Then no provider submission path exists
And no `submitRawTransaction` call exists
And the candidate is not broadcast.

### Requirement: Slice B value-moving output policy

The next consume implementation slice after direct-P2S unlocking integration MUST replace the placeholder output policy with an explicit value-moving chipnet smoke policy without broadcasting.

The slice MUST compute output value from chain-derived `actualValueSats` minus an explicit deterministic fee.

The slice MUST NOT introduce transparent P2PKH change as architecture.

#### Scenario: Slice B remains pre-broadcast

Given the value-moving chipnet smoke output policy is present
When the consume candidate is constructed
Then the candidate MAY become locally broadcast-eligible only if direct-P2S unlocking and local VM verification also pass
And provider submission MUST still be absent until task 1.4.

### Requirement: consume broadcast submission requires local direct-P2S VM verification

The reference aggregator SHALL submit a consume transaction to chipnet only from a consume preview with matching local `createVirtualMachineBch2026.verify` evidence and only with explicit chipnet smoke broadcast authorization.

The implementation SHALL NOT mutate the consume preview into an APNT-accepted object. Broadcast submission evidence is a separate evidence surface from consume preview construction and local VM verification.

#### Scenario: submit locally verified consume transaction

Given a consume transaction preview
And local `createVirtualMachineBch2026.verify` evidence for the same consume transaction
And explicit chipnet smoke broadcast authorization
When consume broadcast submission is requested
Then the reference aggregator SHALL submit the preview `consumeTxHex` through chain-io raw transaction submission
And the submission evidence SHALL record the submitted transaction id
And `broadcastSubmitted` SHALL be true
And `chainInclusion`, `outputChainExistence`, `sealCloseObserved`, `proofVerificationAccepted`, `apntAcceptance`, `laneStateAdvanced`, `acceptedPrivateNote`, `privateNoteSpendability`, `productionPrivacy`, and `lifecycleSealClose` SHALL remain false.

#### Scenario: refuse consume broadcast without local verification

Given a consume transaction preview
But no matching local `createVirtualMachineBch2026.verify` evidence
When consume broadcast submission is requested
Then submission SHALL be refused
And no provider submission SHALL be attempted.

#### Scenario: refuse consume broadcast when verification does not bind same candidate

Given a consume transaction preview
And local `createVirtualMachineBch2026.verify` evidence for a different consume transaction id, selected seal set, or input/output count
When consume broadcast submission is requested
Then submission SHALL be refused
And no provider submission SHALL be attempted.

#### Scenario: reference CLI submits locally verified consume broadcast evidence

Given a consume transaction preview artifact
And a local `createVirtualMachineBch2026.verify` artifact for the same consume transaction
And explicit chipnet smoke broadcast authorization
When the reference CLI consume-broadcast command is run
Then the CLI SHALL call the same reference aggregator consume broadcast submission path
And the CLI SHALL submit the preview `consumeTxHex` through chain-io raw transaction submission
And the CLI SHALL write consume broadcast submission evidence
And the CLI SHALL NOT run consumed-outpoint lookup
And the CLI SHALL NOT materialize seal-close evidence
And the CLI SHALL NOT claim chain inclusion, output chain existence, APNT acceptance, private-note spendability, production privacy, or lifecycle seal-close.

#### Scenario: reference CLI refuses consume broadcast without explicit smoke authorization

Given a consume transaction preview artifact
And matching local `createVirtualMachineBch2026.verify` evidence
But explicit chipnet smoke broadcast authorization is absent
When the reference CLI consume-broadcast command is run
Then the CLI SHALL refuse submission
And no provider submission SHALL be attempted.

### Requirement: non-claims MUST remain explicit for broadcast-eligible candidates

Until real chipnet broadcast and chain-io consumed-outpoint evidence exist, the consume candidate MUST preserve:

```text
proofVerificationAccepted: false
apntAcceptance: false
laneStateAdvanced: false
acceptedPrivateNote: false
privateNoteSpendability: false
productionPrivacy: false
lifecycleSealClose: false
```

#### Scenario: broadcast-eligible does not mean APNT-accepted

Given a locally verified direct-P2S consume candidate
When it has not yet been broadcast and confirmed by chain-io consumed-outpoint evidence
Then it MUST NOT be represented as APNT accepted, private-note spendable, production-private, or lifecycle seal-closed.

### Requirement: consume preview and local VM verification are explicit CLI surfaces

The reference CLI SHALL expose `aggregator consume-preview` and `aggregator consume-local-vm-verify` commands for the live consume validation path.

The CLI commands SHALL produce durable artifacts that can be passed to the broadcast submission adapter without relying on test-local harness entrypoints.

The commands SHALL NOT claim APNT acceptance, lane advancement, accepted private note state, private-note spendability, production privacy, or lifecycle seal-close.

#### Scenario: reference CLI writes consume preview artifact

Given selected APNT import-funding seal inputs
And full consume-ready output-existence artifacts
And explicit SRQ3/TRQ1 witness artifacts for each selected input
When `aggregator consume-preview` is run
Then the CLI SHALL write a consume preview artifact
And the artifact SHALL record the selected input order and planned input indexes
And the artifact SHALL keep `broadcastSubmitted`, `proofVerificationAccepted`, `apntAcceptance`, `laneStateAdvanced`, `acceptedPrivateNote`, `privateNoteSpendability`, `productionPrivacy`, and `lifecycleSealClose` false.

#### Scenario: reference CLI writes local VM verification artifact

Given a consume preview artifact
And explicit SRQ3/TRQ1 witness artifacts for the same selected inputs
When `aggregator consume-local-vm-verify` is run
Then the CLI SHALL verify the consume candidate with `createVirtualMachineBch2026.verify`
And the CLI SHALL write a local VM verification artifact for the same consume transaction
And the artifact SHALL NOT claim broadcast submission, APNT acceptance, lane advancement, accepted private note state, private-note spendability, production privacy, or lifecycle seal-close.

### Requirement: SRQ3/TRQ1 witness source is explicit for live consume validation

The consume preview and local VM verification path SHALL NOT depend on witness construction that is only reachable from deterministic tests.

The implementation SHALL either expose SRQ3/TRQ1 witness construction as an explicit live validation artifact path or replace the test-local witness constructor with caller-supplied witness artifacts that are validated before consume preview and local VM verification.

#### Scenario: test-local witness construction is not a live input

Given selected consume inputs
But SRQ3/TRQ1 witness chunks are only available through a test-local helper
When live consume preview or local VM verification is requested
Then the system SHALL refuse to treat the test-local helper as the live witness source
And it SHALL require explicit witness artifacts or an exposed non-test witness construction path.

### Requirement: Per-seal consumed-outpoint lifecycle input artifacts

The system SHALL materialize narrow per-seal consumed-outpoint lifecycle input artifacts from verified chain-observation evidence.

Each artifact SHALL identify the selected seal outpoint, consume transaction id, consumed input index, consumed-outpoint status, chain-observation trust boundary, and source evidence references.

The artifact SHALL NOT be a copied broad aggregator envelope. Broad consumed-outpoint evidence MUST be explicitly normalized into the narrow lifecycle-input schema before lifecycle tooling consumes it.

The artifact SHALL preserve `protocolValidationByAuthority: false`.

The artifact SHALL preserve false non-claims for `sealCloseObserved`, `proofVerificationAccepted`, `apntAcceptance`, `laneStateAdvanced`, `acceptedPrivateNote`, `privateNoteSpendability`, `productionPrivacy`, and `lifecycleSealClose`.

#### Scenario: per-seal lifecycle input is materialized from verified consumed-outpoint evidence
- **GIVEN** verified consumed-outpoint evidence for a selected APNT import-funding seal outpoint
- **WHEN** the system materializes lifecycle input evidence
- **THEN** it MUST write one narrow artifact for the consumed seal input
- **AND** the artifact MUST identify the selected seal outpoint, consume transaction id, and consumed input index
- **AND** the artifact MUST preserve chain-observation trust boundaries and APNT non-claims.

#### Scenario: per-seal lifecycle input fails closed on invalid consumed-outpoint evidence
- **GIVEN** missing, mismatched, unspent, ambiguous, unavailable, or non-`spent-outpoint` consumed-outpoint evidence
- **WHEN** lifecycle input materialization is requested
- **THEN** it MUST fail closed without writing a lifecycle input artifact.

