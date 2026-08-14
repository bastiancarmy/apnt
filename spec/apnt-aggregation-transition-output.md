# apnt-aggregation-transition-output Specification

## Purpose
TBD - created by archiving change define-apnt-recovery-packets-and-replace-plane-b-scaffold-v0. Update Purpose after archive.
## Requirements
### Requirement: Plane A binds actual Plane B recovery packet-bin material

Plane A MUST bind the Plane B packet-bin commitment for the actual packet-bin bytes used by the aggregate transition.

When APNT recovery packets are materialized, the Plane B packet-bin root MUST be computed from encoded encrypted recovery packet records and padding, not synthetic scaffold bytes.

The Plane B batch manifest root MUST commit to recovery packet-bin metadata sufficient for wallets to reconstruct and verify the packet-bin commitment.

#### Scenario: Plane A commitment matches actual recovery packet-bin bytes

- **GIVEN** an aggregate APNT transition with encrypted recovery packets
- **WHEN** the Plane B packet-bin commitment is computed
- **THEN** the packet-bin root is computed over actual recovery packet-bin bytes
- **AND** the batch manifest root commits to the packet-bin manifest
- **AND** Plane A contains the resulting `planeBPacketBinCommitment32`
- **AND** recomputing the commitment from reconstructed Plane B bytes matches Plane A

### Requirement: Plane B remains aggregation-level, not public recipient-grouped

Plane B packet-bin commitments MUST remain aggregation-level commitments.

The commitment input MUST NOT include public recipient groups, recipient identities, descriptor strings, descriptor hashes, contact keys, npubs, or packet-to-recipient mappings.

#### Scenario: Packet-bin commitment does not serialize recipient grouping

- **GIVEN** a Plane B packet-bin commitment input
- **WHEN** the input is normalized or serialized
- **THEN** recipient grouping fields are rejected
- **AND** public recipient markers are rejected
- **AND** the commitment remains an aggregate packet-bin commitment

### Requirement: Same-transaction Plane B carrier outputs carry recovery packet-bin chunks

For the same-transaction `7x197` carriage profile, Plane B carrier outputs MUST carry chunks of the encoded recovery packet-bin bytes.

Carrier output metadata MAY describe public carriage facts such as carrier index, carrier count, payload byte length, packet-bin byte offset, and packet material status.

Carrier output metadata MUST NOT identify packet recipients.

#### Scenario: Carrier outputs carry real recovery packet chunks

- **GIVEN** a materialized APNT recovery packet-bin
- **WHEN** same-transaction Plane B carrier outputs are constructed
- **THEN** carrier payloads are chunks of the recovery packet-bin bytes
- **AND** carrier metadata reports encrypted recovery packet material
- **AND** carrier metadata contains no public recipient identity fields

### Requirement: APNT aggregation transition output v0

BCH Cloak APNT MUST define an `ApntAggregationTransitionOutputV0` object as the first real aggregation state-transition output format for APNT v0.

The output MUST replace the current smoke-test output script when APNT transition output mode is explicitly selected.

The output MUST be a public Plane A state-transition commitment carrier.

#### Scenario: Transition output replaces smoke output

- **GIVEN** an aggregator consume transaction is constructed for APNT import funding cells
- **AND** an APNT aggregation transition output artifact is provided or explicitly requested
- **WHEN** the consume transaction is previewed
- **THEN** the consume transaction output script MUST be derived from `ApntAggregationTransitionOutputV0`
- **AND** the smoke-test script `<33...33> OP_DROP <44...44> OP_DROP OP_1` MUST NOT be used

### Requirement: Plane A commitment surface

`ApntAggregationTransitionOutputV0` MUST include only public commitment fields required for wallet/indexer transition binding.

The output MUST include an explicit APNT transition tag and version.

The output SHOULD include the following Plane A commitments when available:

- transition statement bind32
- consumed seal set commitment32
- new note batch/root commitment32
- Plane B packet bin commitment32
- proof transcript bind32

#### Scenario: Deterministic bytecode construction

- **GIVEN** the same `ApntAggregationTransitionOutputV0` fields
- **WHEN** the transition output bytecode builder is called repeatedly
- **THEN** it MUST return identical bytecode
- **AND** the parser/normalizer MUST recover the same commitment fields

### Requirement: Transition output advances commitment state

The APNT aggregation transition output MUST advance public commitment state for the aggregation transition.

At minimum, the transition output MUST bind:

- consumed seal set commitment
- new note batch/root commitment
- Plane B packet bin commitment
- transition statement binding
- proof transcript binding, when available

The output MUST NOT by itself claim accepted private notes, private-note spendability, production privacy, global scaling, or proof verification acceptance.

#### Scenario: Multi-user aggregation transition

- **GIVEN** an aggregator consumes more than one APNT import funding seal
- **WHEN** it creates an APNT aggregation transition output
- **THEN** the output MUST bind the consumed seal set commitment
- **AND** the output MUST bind the new note batch/root commitment
- **AND** the output MUST bind Plane B encrypted recovery material by commitment
- **AND** the evidence MAY demonstrate multi-user function
- **BUT** the evidence MUST NOT claim global scaling is solved

### Requirement: Same-transaction on-chain Plane B packet bin

APNT aggregation transition output v0 MVP MUST keep Plane B encrypted recovery packet data on-chain in the same aggregation transaction.

Plane B packet data MUST be modeled as an aggregation-level packet bin.

The implementation MUST NOT require public per-recipient Plane B packet grouping.

Plane A MUST commit to the Plane B packet bin.

#### Scenario: Wallet recovers from same-transaction packet bin

- **GIVEN** an APNT aggregation transaction contains a Plane A transition output
- **AND** the same transaction contains Plane B encrypted recovery packet carrier outputs
- **WHEN** a recipient wallet scans the transaction
- **THEN** the wallet MUST scan transaction history, not only the current UTXO set
- **AND** identify the Plane A transition by APNT transition tag/version
- **AND** parse the Plane A commitments
- **AND** collect same-transaction Plane B carrier outputs
- **AND** reconstruct the aggregation-level Plane B packet bin in deterministic output order
- **AND** verify the packet bin against the Plane A packet bin commitment
- **AND** trial-decrypt candidate recovery envelopes locally using outstanding receive material
- **AND** verify recovered note commitments against Plane A state commitments before import
- **AND** import only as a wallet-verifiable note candidate
- **AND** recovery MUST NOT depend only on the current UTXO set because carrier outputs may be anyone-can-spend and may be swept later

This scenario is a target recovery rule. It does not claim that wallet
scan/reconstruct/decrypt/import behavior is already implemented.

#### Scenario: Plane B is not publicly grouped by recipient

- **GIVEN** an aggregation transaction pays multiple recipients
- **WHEN** Plane B packet carriers are inspected publicly
- **THEN** the carrier outputs MUST NOT expose public recipient group boundaries
- **AND** the carrier outputs MUST NOT identify which packet material belongs to Bob
- **AND** wallet recovery MUST rely on local trial decryption and commitment verification

### Requirement: Reduced-byte Plane B strategy

The APNT v0 MVP MUST NOT rely on compression of ML-KEM ciphertext.

The reduced-byte strategy MUST come from packet-envelope design.

The implementation SHOULD reduce overhead by:

- using a batch-level manifest
- avoiding per-recipient public packet groups
- avoiding per-recipient manifest duplication
- making padding profile-selected
- binding the full packet bin from Plane A

#### Scenario: ML-KEM ciphertext is not compressed

- **GIVEN** an ML-KEM recovery packet is created
- **WHEN** the packet envelope is serialized
- **THEN** the implementation MUST NOT describe the ML-KEM ciphertext as compressed
- **AND** any byte reduction MUST be attributed to envelope layout, shared metadata, or padding policy

### Requirement: Plane B carriage profile versioning

APNT aggregation transition output v0 MUST treat Plane B ciphertext carriage as profile-versioned.

The specification MUST recognize the following profile statuses:

- `apnt-plane-b-same-tx-batch-7x197-v0` as the revised MVP candidate profile
- `apnt-plane-b-sharded-12x128-v0` as a known fallback/evidence profile

The implementation MUST NOT hard-code the prior 12-output Plane B shape as the only valid APNT v0 carriage model.

The default Plane B carriage profile MUST remain unresolved until all of the
following are validated:

- live chipnet standardness / relay / mining behavior
- wallet transaction-history scanning
- UTXO footprint
- fee/postage policy
- privacy footprint
- 10-recipient-sized packet-bin behavior

#### Scenario: Plane B profile is explicit

- **GIVEN** an APNT aggregation transition output binds Plane B encrypted recovery material
- **WHEN** the Plane B packet bin commitment is constructed
- **THEN** the packet carriage profile MUST be explicit
- **AND** the packet carriage profile MUST be included in or bound by the Plane B packet bin commitment
- **AND** observers MUST NOT need recipient identity fields to interpret the public profile

#### Scenario: Known 12x128 fallback remains available

- **GIVEN** the implementation supports prior Plane B packet discipline
- **WHEN** the profile is `apnt-plane-b-sharded-12x128-v0`
- **THEN** the implementation MUST treat it as a known fallback/evidence profile
- **AND** it MUST NOT claim this profile is the scalable APNT fanout default

#### Scenario: Same-tx batch 7x197 remains provisional

- **GIVEN** the implementation recognizes `apnt-plane-b-same-tx-batch-7x197-v0`
- **WHEN** evidence or documentation describes the profile
- **THEN** it MUST describe the profile as the revised MVP candidate profile
- **AND** it MUST disclose that standardness, wallet scanning, UTXO posture, fee/postage policy, and privacy-footprint validation remain unresolved

#### Scenario: Default Plane B profile is not finalized

- **GIVEN** APNT v0 documentation or evidence compares supported Plane B carrier profiles
- **WHEN** it names `apnt-plane-b-same-tx-batch-7x197-v0`
- **THEN** it MUST describe that profile as a revised MVP candidate, not the final default
- **AND** it MUST describe `apnt-plane-b-sharded-12x128-v0` as a fallback/evidence profile
- **AND** it MUST disclose the unresolved validation gates before any default profile is claimed

### Requirement: Excluded recipient identity fields

The APNT aggregation transition output MUST NOT include recipient identity fields.

The output MUST NOT include:

- Bob contact key
- Bob npub
- `bchcloak:` descriptor
- reusable ML-KEM receive material
- static wallet-layer receive descriptor
- Nostr event id as protocol truth
- Nostr root as protocol truth
- IPFS CID as recipient identity

Plane B packet metadata MUST also avoid public recipient identity fields.

#### Scenario: Recipient marker rejection

- **GIVEN** a candidate transition output includes recipient identity material
- **WHEN** it is normalized or built
- **THEN** the implementation MUST reject it
- **OR** the field MUST be absent from the accepted type and impossible to serialize through the deterministic builder

### Requirement: Excluded private material

The APNT aggregation transition output MUST NOT include private note material.

The output MUST NOT include:

- note plaintext
- note opening
- wallet seed
- spend key
- ML-KEM secret key
- private note recovery plaintext

Plane B packet material MUST NOT include private note plaintext or private keys. Plane B may carry encrypted recovery material only.

#### Scenario: Private material exclusion

- **GIVEN** a candidate transition output attempts to include private material
- **WHEN** it is normalized or built
- **THEN** the implementation MUST reject it
- **OR** the field MUST be absent from the accepted type and impossible to serialize through the deterministic builder

### Requirement: Non-claims preserved

Introducing `ApntAggregationTransitionOutputV0` MUST NOT by itself claim APNT acceptance, accepted private notes, private-note spendability, production privacy, lane advancement, global scaling, or proof verification acceptance.

#### Scenario: Consume preview with transition output

- **GIVEN** a consume preview uses `ApntAggregationTransitionOutputV0`
- **WHEN** the preview evidence is written
- **THEN** `apntAcceptance` MUST remain false unless APNT acceptance is actually implemented
- **AND** `acceptedPrivateNote` MUST remain false unless accepted private notes are actually implemented
- **AND** `privateNoteSpendability` MUST remain false unless private-note spendability is actually implemented
- **AND** `productionPrivacy` MUST remain false
- **AND** `proofVerificationAccepted` MUST remain false unless real proof verification acceptance is actually wired
- **AND** global scaling MUST NOT be claimed

### Requirement: Residual correlation disclosure

The implementation MUST disclose public correlation visible from the transition output and same-transaction packet bin.

At minimum, evidence or documentation MUST state that chain observers can see:

- consumed import funding seal outpoints
- transaction input count
- transaction output count
- transaction timing
- transaction fee and size
- public Plane A commitments
- Plane B carrier output count and shape
- the `apnt-plane-b-same-tx-batch-7x197-v0` carrier profile fingerprint, when used
- whether multiple inputs are consumed together in one aggregation transaction
- whether multiple import-funding seals were consumed together

Evidence or documentation MUST also disclose that participants may reveal
additional off-chain submission metadata if they submit handoffs directly to an
aggregator.

#### Scenario: Public transition evidence

- **GIVEN** an APNT aggregation transition output exists on-chain
- **WHEN** evidence or live summary is generated
- **THEN** it MUST disclose that Plane A is public commitment data
- **AND** it MUST disclose that Plane B carrier count and shape are public
- **AND** it MUST NOT describe Plane A as private by itself
- **AND** it MUST NOT describe Plane B ciphertext as recipient identity

### Requirement: Scaling caveat

The same-transaction on-chain Plane B MVP MUST disclose that it demonstrates multi-user function but does not solve global scaling.

The MVP MUST NOT claim final batching economics, final UTXO strategy, final
scan-bandwidth posture, or production privacy. A 10-recipient demo MAY be
described as fee-feasible by estimate, but MUST remain validation-gated until
standardness, relay/mining, wallet scanning, UTXO footprint, fee/postage, and
privacy-footprint validation are complete.

#### Scenario: MVP live summary

- **GIVEN** an APNT v0 MVP live run uses same-transaction on-chain Plane B
- **WHEN** the result is summarized
- **THEN** the summary MUST say that encrypted recovery material was carried in the same aggregation transaction
- **AND** it MUST say this demonstrates single-transition multi-user function
- **AND** it MUST NOT claim global scaling, final batching economics, final UTXO strategy, or production privacy

### Requirement: Separate Plane B carrier transactions are future work

APNT v0 MVP MUST use same-transaction Plane A and Plane B carriage.

Separate or split Plane B carrier transactions MUST NOT be treated as MVP
behavior.

Split Plane B carrier transactions MAY be documented only as future work. A
split design MUST address availability, timing-correlation, fee-payment,
confirmation-ordering, withholding, and scan/recovery questions before it is
adopted.

Split/off-chain Plane B MUST require a new OpenSpec change or public pivot
note before it can replace same-transaction MVP behavior.

#### Scenario: Split Plane B carrier transactions are proposed

- **GIVEN** a future design proposes Plane B carrier outputs in separate transactions from the Plane A transition
- **WHEN** the design is documented
- **THEN** it MUST describe the proposal as future work, not APNT v0 MVP behavior
- **AND** it MUST document the availability, timing-correlation, fee-payment, confirmation-ordering, withholding, and scan/recovery tradeoffs
- **AND** it MUST NOT treat the split carrier transaction as protocol truth, custody, validation authority, or recipient identity truth

### Requirement: Off-chain Plane B is future pivot work

Off-chain Plane B delivery MUST NOT be treated as the APNT v0 MVP default.

Off-chain Plane B MAY be documented as future scalability work.

If adopted later, it MUST be documented as a recovery-availability pivot from chain-observed packet data to chain-committed off-chain packet availability.

#### Scenario: Off-chain profile is proposed

- **GIVEN** a future design proposes IPFS, Nostr, relays, or another off-chain Plane B carrier
- **WHEN** it is documented
- **THEN** the documentation MUST disclose the recovery-availability dependency
- **AND** MUST state that transport is not settlement truth, custody, protocol validation, or recipient identity

