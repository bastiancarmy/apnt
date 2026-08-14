# apnt-transfer-intents Specification

## Purpose
TBD - created by archiving change complete-apnt-live-validation-prerequisites-v0. Update Purpose after archive.
## Requirements
### Requirement: APNT uses sender-authored transfer intents for aggregation entry

APNT v0 MUST model aggregation entry as sender-authored transfer intents.

A transfer intent represents a sender's request to include one private note transfer in an aggregate APNT transaction.

A transfer intent MUST NOT be treated as BCH consensus truth, protocol acceptance, private-note spendability, or proof verification.

#### Scenario: Sender creates a transfer intent

- **WHEN** a wallet prepares a private note transfer for aggregation
- **THEN** it MUST create intent material identifying the intended private note transfer
- **AND** the intent material MUST be sender-authored
- **AND** the intent material MUST NOT make the aggregator a custodian, validator, sequencer, or namespace authority

#### Scenario: Transfer intent remains transport-neutral

- **WHEN** a transfer intent is prepared for local aggregation
- **THEN** local JSON MAY carry the intent material
- **AND** future Nostr relay transport MAY carry equivalent intent material
- **BUT** transport MUST NOT become settlement truth, recovery truth, protocol validation, custody, or namespace authority

### Requirement: Transfer intent names avoid simulation terminology

Reusable runtime and reference code MUST use neutral APNT terms for intent material.

Reusable runtime and reference code MUST NOT name protocol-facing object types, domains, or reusable APIs with `simulation`, `scenario`, `demo`, `fixture`, `testOnly`, `mock`, `quote`, or `fee market`.

Scenario language MAY appear in live validation scripts, local run names, test descriptions, and `docs-internal` notes.

#### Scenario: Runtime object naming remains neutral

- **WHEN** reusable code defines intent or queue material
- **THEN** it SHOULD use names such as `transfer intent`, `aggregation intent queue`, `sender fee offer`, `minimum privacy set`, and `local aggregation policy`
- **AND** it MUST NOT encode scenario-specific language as reusable protocol/runtime terminology

### Requirement: Each sender funds its own transfer intent

Each sender-authored transfer intent MUST carry enough sender-funded value to cover that intent's private note value and its sender-selected aggregation overhead contribution.

The MVP MUST NOT model one sender as silently subsidizing unrelated senders' transfer intents.

#### Scenario: Sender-funded transfer intent

- **WHEN** a sender prepares a transfer intent
- **THEN** the intent MUST define a private note value
- **AND** the intent MUST define a sender fee offer or aggregation overhead contribution
- **AND** the required import value MUST be derived from those values
- **AND** unrelated senders MUST NOT rely on that sender's import value to fund their own aggregation overhead

#### Scenario: Alice does not subsidize unrelated transfers

- **GIVEN** Alice, Charlie, and Edward each have transfer intents in the same aggregate batch
- **WHEN** the local aggregator evaluates aggregate funding
- **THEN** Alice's sender-funded overhead contribution MUST NOT be reported as paying for Charlie's or Edward's transfer intent
- **AND** selected intents MUST collectively cover aggregate public overhead

### Requirement: MVP transfer intents use a static sender fee offer template

The MVP MUST allow a static local validation template for sender fee offers.

The static template MUST be reported as an MVP validation template and MUST NOT be reported as a production fee market, quote model, or final aggregator inclusion mechanism.

Future wallets MAY derive sender fee offers dynamically from observed aggregator behavior, fee boards, relay-published policy, chain conditions, or protocol mechanisms.

#### Scenario: Static MVP sender fee offer

- **WHEN** the local validation harness creates transfer intents
- **THEN** it MAY assign a static sender fee offer value
- **AND** it MUST report `feeOfferIsStaticMvpTemplate: true`
- **AND** it MUST report `feeMarketImplemented: false`
- **AND** it MUST report `quoteModelImplemented: false`

#### Scenario: Future dynamic sender fee offer remains unresolved

- **WHEN** the MVP reports sender fee offer values
- **THEN** it MUST NOT claim production fee-market discovery
- **AND** it MUST NOT claim dynamic wallet fee selection is implemented unless a later change implements it

### Requirement: Required import value is derived from private note value and sender fee offer

For MVP transfer intents, the required import value MUST be derived from the private note value plus the sender's offered aggregation overhead.

```text
requiredImportValueSats =
  privateNoteValueSats + senderOfferedAggregationOverheadSats
```

The no-change transparent funding input MUST be derived from the required import value plus the import funding fee.

```text
requiredNoChangeFundingInputSats =
  requiredImportValueSats + importFundingFeeSats
```

Transparent change MUST remain forbidden in the import funding path.

#### Scenario: Intent amount derivation

- **GIVEN** a transfer intent has `privateNoteValueSats = 10000`
- **AND** `senderOfferedAggregationOverheadSats = 12000`
- **AND** `importFundingFeeSats = 500`
- **WHEN** the wallet prepares import funding
- **THEN** `requiredImportValueSats` MUST be `22000`
- **AND** `requiredNoChangeFundingInputSats` MUST be `22500`

#### Scenario: Transparent change remains forbidden

- **WHEN** a wallet funds an APNT transfer intent
- **THEN** the selected transparent input value MUST equal `requiredNoChangeFundingInputSats`
- **AND** the import funding transaction MUST NOT create transparent change as the target APNT architecture

### Requirement: Import claim material is amount-matched to the transfer intent

The claim material used by `wallet import-funding-sign` MUST resolve to an import funding output value equal to the current transfer intent's required import value.

Stale claim material from a previous amount MUST fail closed.

#### Scenario: Amount-matched claim material is accepted

- **GIVEN** a transfer intent requires `requiredImportValueSats = 22000`
- **AND** import claim material resolves to `expectedFundingOutput.valueSats = 22000`
- **AND** import claim material resolves to `importCellMetadata.outputValueSats = 22000`
- **WHEN** the wallet builds the import funding signing request
- **THEN** the claim material amount check MUST pass

#### Scenario: Stale claim material is rejected

- **GIVEN** a transfer intent requires `requiredImportValueSats = 75000`
- **AND** import claim material resolves to `expectedFundingOutput.valueSats = 10500`
- **WHEN** the wallet attempts import funding signing
- **THEN** signing MUST fail closed before or during validation
- **AND** the failure MUST report the requested import amount and resolved claim material output value

### Requirement: Local aggregator batches a minimum privacy set

For MVP validation, the local aggregator MUST support a minimum privacy set batching policy.

The batching policy is local validation behavior and MUST NOT be protocol truth.

The target validation count MAY be ten transfer intents. Ten MUST NOT be treated as a consensus rule, APNT protocol constant, runtime invariant, wallet API rule, or final aggregator policy.

#### Scenario: Minimum privacy set policy

- **WHEN** the local aggregator evaluates the local aggregation intent queue
- **THEN** it MUST require a configured `minimumPrivacySetSize`
- **AND** it MUST report `batchingPolicyIsProtocolTruth: false`
- **AND** it MUST report whether the selected intent count satisfies the minimum privacy set

#### Scenario: Ten-transfer benchmark is not a protocol constant

- **WHEN** the local validation harness targets ten transfer intents
- **THEN** it MUST report `targetValidationIntentCount: 10`
- **AND** it MUST report `targetValidationIntentCountIsProtocolConstant: false`

### Requirement: Selected intents collectively cover aggregate public overhead

The local aggregator MUST verify that selected sender fee offers collectively cover aggregate public overhead for the selected batch.

Aggregate public overhead MAY include Plane B carrier output value, consume transaction fee, minimum Plane A transition output value, and future aggregator service output if later implemented.

#### Scenario: Aggregate overhead covered

- **GIVEN** selected transfer intents have sender fee offers
- **AND** the aggregate required public overhead is computed
- **WHEN** the local aggregator selects the batch
- **THEN** the sum of selected sender fee offers MUST be greater than or equal to aggregate required public overhead
- **AND** the report MUST include `aggregateOverheadCovered: true`

#### Scenario: Aggregate overhead not covered

- **GIVEN** selected transfer intents have insufficient sender fee offers
- **WHEN** the local aggregator evaluates the batch
- **THEN** the batch MUST fail closed or be reported as not eligible
- **AND** the report MUST include the aggregate required overhead and aggregate offered overhead

### Requirement: Local aggregation queue remains transport-local and future-compatible

The MVP MUST support local JSON handoff material as the aggregation intent queue.

The local queue MUST be designed so future Nostr relay transport can carry equivalent intent material without making Nostr protocol truth.

#### Scenario: Local JSON queue

- **WHEN** the validation harness produces aggregation intent material
- **THEN** it MAY write a local JSON queue
- **AND** the queue MUST identify `transportKind: local-json`
- **AND** the queue SHOULD identify future Nostr transport as optional discovery/transport only

#### Scenario: Nostr is not protocol truth

- **WHEN** future Nostr relay transport is referenced
- **THEN** the spec and reports MUST preserve that Nostr is not settlement, custody, recovery truth, protocol validation, or namespace authority

### Requirement: MVP multi-profile validation target exercises independent users

The MVP validation harness MUST be designed around multiple sender and recipient profiles operating alongside each other.

A useful ten-transfer validation target includes one sender sending multiple notes, return-note flow, follow-on sends, and multiple recipients.

#### Scenario: Ten-transfer validation target

- **GIVEN** profiles Alice, Bob, Charlie, Dennis, Edward, and Frank
- **WHEN** the validation harness prepares the MVP transfer-intent target
- **THEN** it SHOULD be able to represent ten transfer intents
- **AND** those intents SHOULD include multiple senders and recipients
- **AND** each sender intent MUST be independently funded by its sender's transfer-intent amount rules

### Requirement: Transfer-intent reporting preserves non-claims

Reports involving transfer intents, sender fee offers, and local aggregator batching MUST preserve APNT non-claims.

#### Scenario: Non-claims preserved

- **WHEN** a transfer intent queue or aggregate batch report is produced
- **THEN** it MUST preserve:
  - `apntAcceptance: false`
  - `acceptedPrivateNote: false`
  - `privateNoteSpendability: false`
  - `proofVerificationAccepted: false`
  - `productionPrivacy: false`
  - `globalScalingSolved: false`
  - `feeMarketImplemented: false`
  - `quoteModelImplemented: false`

### Requirement: Transfer intent funding template is configurable and non-protocol

The MVP validation harness MUST support configurable transfer-intent funding template values.

The template values MUST be reported as validation defaults and MUST NOT be treated as consensus rules, APNT protocol constants, wallet API invariants, production fee-market values, or final aggregator inclusion policy.

#### Scenario: Default MVP transfer-intent funding template

- **WHEN** the MVP validation harness uses default transfer-intent funding values
- **THEN** it MUST support `privateNoteValueSats = 10000`
- **AND** it MUST support `senderOfferedAggregationOverheadSats = 12000`
- **AND** it MUST support `importFundingFeeSats = 500`
- **AND** it MUST derive `requiredImportValueSats = 22000`
- **AND** it MUST derive `requiredNoChangeFundingInputSats = 22500`
- **AND** it MUST report that these are validation template values, not protocol constants

#### Scenario: Future dynamic sender fee selection remains outside MVP

- **WHEN** the MVP validation harness reports sender fee offer values
- **THEN** it MUST report `feeOfferIsStaticMvpTemplate: true`
- **AND** it MUST report `feeMarketImplemented: false`
- **AND** it MUST report `quoteModelImplemented: false`
- **AND** it MUST NOT claim wallet-selected market pricing, aggregator quote negotiation, or production fee discovery is implemented

### Requirement: Transfer-intent reports include sender-funded amount derivation

Reports involving APNT transfer intents MUST include enough amount-derivation evidence to prove each sender funds its own intent.

#### Scenario: Per-intent amount derivation is reported

- **WHEN** a transfer intent report is produced
- **THEN** it MUST report the intent's private note value
- **AND** it MUST report the intent's sender offered aggregation overhead
- **AND** it MUST report the intent's required import value
- **AND** it MUST report the intent's import funding fee
- **AND** it MUST report the intent's required no-change transparent funding input

#### Scenario: Aggregate sender fee offer total is reported

- **WHEN** a local aggregate batch report is produced
- **THEN** it MUST report the selected intent count
- **AND** it MUST report aggregate sender offered overhead
- **AND** it MUST report aggregate required public overhead
- **AND** it MUST report whether selected sender fee offers cover aggregate public overhead

### Requirement: Claim material mismatch is diagnosed before live signing when possible

The MVP validation harness and wallet signing path MUST diagnose stale import claim material when the resolved claim material amount does not match the requested transfer intent import amount.

The implementation SHOULD fail before invoking live WizardConnect signing when the mismatch can be detected locally.

#### Scenario: Stale claim material fails with explicit values

- **GIVEN** a transfer intent requires `requiredImportValueSats = 75000`
- **AND** resolved import claim material has `expectedFundingOutput.valueSats = 10500`
- **WHEN** the wallet attempts to prepare import funding signing
- **THEN** the process MUST fail closed
- **AND** the failure MUST report the requested import amount
- **AND** the failure MUST report the resolved claim material output value
- **AND** the failure MUST report the claim commitment
- **AND** the failure MUST report the profile identifier where available

#### Scenario: Amount-matched claim material proceeds to signing

- **GIVEN** a transfer intent requires `requiredImportValueSats = 22000`
- **AND** resolved import claim material has `expectedFundingOutput.valueSats = 22000`
- **AND** resolved import claim material has `importCellMetadata.outputValueSats = 22000`
- **WHEN** the wallet prepares import funding signing
- **THEN** the amount-matched claim material check MUST pass
- **AND** the no-change funding requirement MUST still be enforced

### Requirement: Local minimum privacy set reporting is explicit

The MVP validation harness MUST report local minimum privacy set policy values separately from protocol constants.

#### Scenario: Minimum privacy set and target validation count are reported

- **WHEN** the local aggregator evaluates transfer intents
- **THEN** it MUST report `batchingPolicyId`
- **AND** it MUST report `batchingPolicyIsProtocolTruth: false`
- **AND** it MUST report `minimumPrivacySetSize`
- **AND** it MUST report `targetValidationIntentCount`
- **AND** it MUST report `targetValidationIntentCountIsProtocolConstant: false`
- **AND** it MUST report whether the selected intent count satisfies the minimum privacy set

#### Scenario: Local aggregator batches immediately only as validation behavior

- **WHEN** the local validation harness has enough eligible funded intents
- **THEN** the local aggregator MAY batch immediately
- **AND** the report MUST NOT claim production timing windows, competitive aggregator selection, production fee markets, or final inclusion policy

### Requirement: Local aggregation intent queue reports transport boundaries

The local aggregation intent queue MUST report that local JSON is transport/handoff material only.

Future Nostr relay transport MUST remain optional discovery/transport only.

#### Scenario: Local queue transport boundary

- **WHEN** a local aggregation intent queue is produced
- **THEN** it MUST report `transportKind: local-json`
- **AND** it MUST report `localJsonIsProtocolTruth: false`
- **AND** it SHOULD report `futureTransportKind: nostr`
- **AND** it MUST report `nostrIsProtocolTruth: false`

#### Scenario: Nostr non-authority is preserved

- **WHEN** future Nostr relay transport is referenced
- **THEN** reports MUST preserve that Nostr is not settlement truth
- **AND** Nostr is not custody
- **AND** Nostr is not recovery truth
- **AND** Nostr is not protocol validation
- **AND** Nostr is not namespace authority

### Requirement: Sender fee offer explicitly authorizes the aggregator service fee

A sender fee offer MUST state the exact aggregator service-fee amount in sats
that the sender authorizes for its contribution, distinct from its network
relay/mining overhead contribution.

The wallet MUST NOT produce, prove, or authorize its contribution against a
transition statement whose service-fee terms charge that sender more than the
intent authorized.

Aggregator-side fee checks remain construction and broadcast safeguards; the
sender-side refusal is the authoritative consent boundary, and the proven
statement binding is the enforcement boundary.

#### Scenario: Sender authorizes an exact service fee

- **WHEN** a sender prepares a transfer intent for aggregation
- **THEN** the sender fee offer MUST include an explicit authorized aggregator
  service-fee amount
- **AND** that amount MUST be a nonnegative multiple of the profile cell
  denomination
- **AND** the intent MUST NOT delegate open-ended fee discretion to the
  aggregator

#### Scenario: Wallet refuses an unauthorized fee increase

- **GIVEN** a sender intent authorizing a specific service-fee amount
- **WHEN** the aggregator presents statement terms that charge that sender a
  higher service fee
- **THEN** the wallet MUST refuse to produce or authorize its contribution
- **AND** the refusal MUST NOT reveal private note values, openings, or
  recipient material to the aggregator

#### Scenario: Zero-fee profile intent

- **WHEN** a sender prepares an intent under an allowlisted `zero-service-fee`
  profile
- **THEN** the authorized service-fee amount MUST be zero
- **AND** the wallet MUST refuse statement terms containing any positive
  service fee for that contribution

