# apnt-chain-evidence Specification

## Purpose
TBD - created by archiving change add-chain-io-apnt-seal-evidence-json. Update Purpose after archive.
## Requirements
### Requirement: Chain-io produces APNT seal-open output evidence from real chain data

The system SHALL provide a chain-io-backed path that produces normalized APNT output-existence evidence from real BCH chain output data.

#### Scenario: Real output exists and matches expected APNT facts
- **WHEN** the provider confirms the requested transaction output exists
- **AND** the actual value, locking bytecode hash, and output fingerprint match expected APNT facts
- **THEN** the system SHALL produce `verified-output-exists` evidence compatible with `wallet lifecycle-seal-open`

#### Scenario: Real output is missing or mismatched
- **WHEN** the provider cannot confirm the output or the output facts do not match expected APNT facts
- **THEN** the system SHALL fail closed and MUST NOT produce accepting seal-open evidence

### Requirement: Chain-io produces APNT consumed-outpoint evidence from real chain data

The system SHALL provide a chain-io-backed path that determines whether a requested APNT seal outpoint has been consumed.

#### Scenario: Seal outpoint is spent
- **WHEN** the provider confirms the exact `txid:vout` was consumed
- **THEN** the system SHALL produce `spent-outpoint` evidence containing the consuming transaction id, input index, and exact consumed outpoint

#### Scenario: Seal outpoint is not spent or cannot be proven spent
- **WHEN** the provider reports the outpoint as unspent, not found, unavailable, or ambiguous
- **THEN** the system SHALL produce a non-closing status and `wallet lifecycle-seal-close` MUST fail closed

### Requirement: Production code does not synthesize chain facts

Production chain-io and reference-cli code MUST NOT generate fake, fixture, synthetic, or simulated chain facts.

#### Scenario: Tests require deterministic evidence
- **WHEN** deterministic tests need chain evidence
- **THEN** synthetic provider responses MAY exist in tests only

#### Scenario: Live/manual evidence is produced
- **WHEN** evidence is produced for a live/manual run
- **THEN** it MUST be derived from provider data or explicit caller-supplied expected APNT facts, not generated synthetic chain facts

