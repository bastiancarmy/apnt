# apnt-recipient-profile-note-recording Specification

## Purpose
TBD - created by archiving change add-apnt-recipient-profile-note-recording-v0. Update Purpose after archive.
## Requirements
### Requirement: Profile-generic recipient note recovery

The reference wallet SHALL support recovering APNT private note candidates for any recipient profile.

The profile identifier SHALL select wallet-local profile state only and SHALL NOT become protocol truth, chain truth, recipient identity, public note identity, or a recipient marker.

#### Scenario: Recipient profile recovers candidate note evidence

- **GIVEN** a wallet has a recipient profile
- **AND** APNT recovery evidence is available for that profile
- **WHEN** the reference wallet scans or imports the recovery evidence for that profile
- **THEN** the wallet records recovered candidate note evidence under that profile
- **AND** the candidate is associated with a `noteCommitment32`
- **AND** the candidate is not marked spendable
- **AND** the profile ID is not serialized as protocol truth or chain identity

#### Scenario: Demo profile names are ordinary profile IDs

- **GIVEN** the live demo uses profile `alice` as sender and profile `bob` as recipient
- **WHEN** the recipient recovery flow runs
- **THEN** `alice` and `bob` are treated as ordinary wallet-local profile IDs
- **AND** protocol-runtime, reference-wallet, and reference-cli do not special-case those names

### Requirement: Profile-local note validation

The reference wallet SHALL validate recovered recipient note evidence through protocol-runtime before writing profile-local validated note candidate state.

The validation SHALL bind the recovered note commitment, scoped note-opening proof evidence, and public APNT evidence for the same run.

The validation SHALL NOT mark the note spendable.

#### Scenario: Recipient profile validates recovered note candidate

- **GIVEN** a recipient profile has recovered APNT note candidate evidence
- **AND** scoped note-opening proof evidence is available
- **WHEN** the reference wallet validates the candidate
- **THEN** protocol-runtime validation semantics are used
- **AND** the recovered `noteCommitment32` matches the scoped proof evidence
- **AND** the wallet writes profile-local validated candidate state
- **AND** `walletNoteSpendable` remains `false`

#### Scenario: Scoped note-opening evidence does not imply full lifecycle acceptance

- **GIVEN** a recipient profile validates note-opening-only proof evidence
- **WHEN** the wallet records validation state
- **THEN** the validation may record scoped note-opening evidence as accepted
- **AND** the validation does not imply full APNT lifecycle acceptance
- **AND** the validation does not imply wallet note spendability
- **AND** production privacy is not claimed

### Requirement: Reference CLI profile commands

The reference CLI SHALL expose profile-generic commands for recipient recovery, note validation, and note listing.

The command profile argument SHALL select wallet-local profile state only.

#### Scenario: Recipient profile scans, validates, and lists notes through CLI

- **GIVEN** a wallet profile exists
- **WHEN** the user runs `bch-cloak <profile> scan-recover`
- **AND** the user runs `bch-cloak <profile> validate-note`
- **AND** the user runs `bch-cloak <profile> list-notes`
- **THEN** the commands operate on that profile's wallet-local state
- **AND** validated candidate notes are shown for that profile
- **AND** private material is not printed
- **AND** recipient markers are not printed

#### Scenario: CLI state labels remain staged

- **GIVEN** a recipient profile has APNT note state
- **WHEN** the user lists notes
- **THEN** recovered candidate state is distinguishable from validated candidate state
- **AND** validated candidate state is distinguishable from recorded wallet note state
- **AND** spendable state is not shown unless spendability gates are implemented and accepted

### Requirement: Harness validates product path

The live harness SHALL validate the reference-cli and reference-wallet path end-to-end.

The harness SHALL NOT be the only implementation path for recovery, validation, or wallet note recording.

#### Scenario: Live harness validates recipient profile product path

- **GIVEN** the live demo uses profile `alice` as sender and profile `bob` as recipient
- **WHEN** the live harness runs the recipient recovery and validation milestone
- **THEN** it invokes reference-cli commands
- **AND** it verifies reference-wallet profile state changed for the recipient profile
- **AND** it verifies protocol-runtime validation outputs
- **AND** it verifies no private material or recipient markers appear in public summaries

#### Scenario: Harness-only state is not product state

- **GIVEN** the live harness emits validation artifacts
- **WHEN** the recipient note recording milestone is evaluated
- **THEN** harness-only artifacts are not sufficient as wallet state
- **AND** the reference wallet must persist profile-local recovered or validated candidate state

