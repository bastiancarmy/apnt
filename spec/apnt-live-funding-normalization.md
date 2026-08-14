# apnt-live-funding-normalization Specification

## Purpose
TBD - created by archiving change add-apnt-live-funding-normalization. Update Purpose after archive.
## Requirements
### Requirement: Transparent funding normalization before APNT import

BCH Cloak live validation MUST support a pre-import funding normalization path that creates exact import-source UTXOs from arbitrary transparent wallet funding UTXOs.

The normalization transaction MAY create transparent change before APNT import funding.

The APNT import-funding transaction MUST NOT contain transparent change.

#### Scenario: Normalize arbitrary transparent funding into exact import source

- **GIVEN** a wallet has a transparent UTXO whose value is greater than the required import-source value plus normalization fee
- **AND** the import amount is `10500` sats
- **AND** the import fee is `500` sats
- **WHEN** the wallet prepares funding normalization
- **THEN** the normalization transaction creates an exact `11000` sat import-source output
- **AND** the normalization transaction may create transparent change
- **AND** the normalization evidence records transparent change before import as an explicit residual-correlation source

#### Scenario: Import funding consumes exact normalized source

- **GIVEN** a normalized import-source UTXO exists with value equal to import amount plus import fee
- **WHEN** APNT import funding is constructed
- **THEN** the import-funding transaction consumes the normalized source UTXO
- **AND** creates the APNT import covenant output
- **AND** pays the configured import fee
- **AND** creates no transparent change output

### Requirement: Prepared source value must be exact

APNT import-funding MUST fail closed if the prepared import-source UTXO value does not equal:

```text
import amount sats + import fee sats
```

#### Scenario: Prepared source value is too large

- **GIVEN** a prepared source UTXO has value greater than import amount plus import fee
- **WHEN** APNT import funding is constructed
- **THEN** construction fails
- **AND** no APNT import-funding transaction is emitted
- **AND** the implementation does not create transparent change in the APNT import-funding transaction

#### Scenario: Prepared source value is too small

- **GIVEN** a prepared source UTXO has value less than import amount plus import fee
- **WHEN** APNT import funding is constructed
- **THEN** construction fails
- **AND** no APNT import-funding transaction is emitted

### Requirement: Normalization evidence must disclose residual correlation

Normalization evidence MUST state that transparent funding normalization is not BCH Cloak protocol privacy.

Normalization evidence MUST disclose that normalization timing, amount, selected transparent input, exact import-source output, and transparent change output may be publicly correlated.

#### Scenario: Normalization summary records privacy posture

- **GIVEN** a normalization transaction is planned or broadcast
- **WHEN** the artifact summary is written
- **THEN** it includes `transparentFundingNormalization: true`
- **AND** it includes `transparentChangeBeforeImport: true` if change exists
- **AND** it includes `importFundingNoTransparentChange: true`
- **AND** it includes `normalizationIsProtocolPrivacy: false`
- **AND** it records CashFusion/fused funding as a wallet funding posture, not a BCH Cloak protocol privacy claim

### Requirement: CashFusion posture is external to BCH Cloak

BCH Cloak MUST treat CashFusion-prepared or fused transparent funding as an external wallet funding posture, not as BCH Cloak protocol privacy.

BCH Cloak MAY allow users to mark transparent funding UTXOs as assumed CashFusion-prepared or fused for live validation posture.

BCH Cloak MUST record CashFusion-prepared or fused transparent funding as an external wallet funding posture.

BCH Cloak MUST NOT claim CashFusion privacy as BCH Cloak protocol privacy.

#### Scenario: Fused source posture is recorded

- **GIVEN** the user selects `assumed-cashfusion-fused` transparent funding posture
- **WHEN** normalization evidence is written
- **THEN** the evidence records `transparentFundingPosture: "assumed-cashfusion-fused"`
- **AND** the evidence records that CashFusion is external to BCH Cloak protocol validation
- **AND** BCH Cloak does not claim production privacy

### Requirement: Existing funded import seals can be replayed without fresh WizardConnect signing

The live seal-close boundary replay script MUST support a mode that starts from existing import-funding artifacts or prepared exact import-source artifacts.

When valid existing artifacts are supplied, the script MUST NOT require fresh funding or WizardConnect signing for import funding.

#### Scenario: Replay from existing import-funding artifacts

- **GIVEN** existing import-funding broadcast evidence exists
- **AND** full output-existence evidence exists
- **AND** wallet chain seal-open evidence exists
- **AND** explicit SRQ3/TRQ1 witnesses are supplied
- **WHEN** live replay is run in existing-artifacts mode
- **THEN** the script starts at lifecycle seal-open or consume preview
- **AND** it does not invoke fresh import-funding signing
- **AND** it preserves all APNT non-claims

### Requirement: APNT non-claims remain explicit

Funding normalization and prepared-source import MUST NOT claim APNT acceptance, accepted private notes, private-note spendability, lifecycle completion, production privacy, or production proof acceptance.

#### Scenario: Live summary preserves non-claims

- **GIVEN** a live normalization/import/consume replay completes
- **WHEN** the live summary is written
- **THEN** `proofVerificationAccepted` is false
- **AND** `apntAcceptance` is false
- **AND** `laneStateAdvanced` is false
- **AND** `acceptedPrivateNote` is false
- **AND** `privateNoteSpendability` is false
- **AND** `lifecycleSealClose` is false
- **AND** `productionPrivacy` is false
- **AND** `protocolValidationByAuthority` is false

