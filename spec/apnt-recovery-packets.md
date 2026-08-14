# apnt-recovery-packets Specification

## Purpose
TBD - created by archiving change define-apnt-recovery-packets-and-replace-plane-b-scaffold-v0. Update Purpose after archive.
## Requirements
### Requirement: APNT defines a structured note-candidate recovery payload v0

APNT MUST define a versioned, domain-separated `ApntNoteCandidateRecoveryPayloadV0`.

This payload is the structured plaintext a sender wallet encrypts for a recipient wallet.

The payload MUST contain sufficient material for the recipient wallet to reconstruct and locally verify a private note candidate against chain, seal, transition, and packet-bin evidence.

The payload MUST be encoded deterministically before encryption.

The payload MUST NOT be treated as public chain data.

#### Scenario: Sender constructs a note-candidate recovery payload

- **GIVEN** a sender/recipient transfer pair
- **AND** the recipient has provided a one-time receive descriptor
- **WHEN** the sender constructs the note-candidate recovery payload
- **THEN** the payload has version `0`
- **AND** the payload has the APNT note-candidate recovery payload domain
- **AND** the payload contains enough note, binding, and transition evidence for recipient-local verification
- **AND** the payload is encoded deterministically before encryption

### Requirement: APNT recovery payload encryption uses one-time receive descriptors

APNT recovery payload encryption MUST use recipient one-time receive descriptors and the existing `ApntEncryptedRecoveryPayloadV0` envelope.

The sender MUST encrypt deterministic note-candidate recovery payload bytes using `encryptApntRecoveryPayloadV0` or its current protocol-runtime equivalent.

The recipient MUST decrypt using recipient-local outstanding receive state and `decryptApntRecoveryPayloadV0` or its current protocol-runtime equivalent.

#### Scenario: Matching recipient state decrypts the recovery payload

- **GIVEN** a recipient one-time receive descriptor
- **AND** matching recipient-local outstanding receive state
- **AND** a deterministic note-candidate recovery payload
- **WHEN** the sender encrypts the payload to the descriptor
- **THEN** the recipient decrypts the payload with matching outstanding receive state
- **AND** the decrypted bytes match the deterministic payload bytes

#### Scenario: Non-matching recipient state fails authentication

- **GIVEN** an encrypted recovery payload
- **AND** a non-matching outstanding receive state
- **WHEN** the wallet attempts decryption
- **THEN** decryption fails authentication
- **AND** the wallet does not parse or accept recovered note-candidate material from that attempt

### Requirement: APNT defines a recovery packet v0

APNT MUST define a versioned, domain-separated `ApntRecoveryPacketV0`.

A recovery packet MUST wrap one encrypted recovery payload envelope and non-recipient-identifying packet metadata.

A recovery packet MUST NOT contain public recipient identifiers, descriptor strings, descriptor hashes, contact keys, npubs, profile names, reusable scan tags, recipient group assignments, or public packet-to-recipient mappings.

A recovery packet MUST NOT expose private note plaintext, note openings, wallet seeds, spend keys, or ML-KEM secret keys.

#### Scenario: Recovery packet contains encrypted payload without recipient marker

- **GIVEN** an encrypted recovery payload for a recipient
- **WHEN** the APNT recovery packet is encoded
- **THEN** the packet contains the encrypted recovery payload envelope
- **AND** the packet contains no public recipient marker
- **AND** the packet contains no private note plaintext
- **AND** the packet contains no recipient-local secret receive state

### Requirement: APNT defines deterministic recovery packet byte encoding

APNT recovery packets MUST have deterministic byte encoding.

The encoded packet bytes MUST be suitable for inclusion in a Plane B packet bin.

The packet hash or packet commitment MUST be computed over deterministic packet bytes.

The implementation MUST reject unknown fields or malformed packet encodings.

#### Scenario: Packet encoding is deterministic

- **GIVEN** the same APNT recovery packet data
- **WHEN** the packet is encoded twice
- **THEN** the encoded bytes are identical
- **AND** the packet hash is identical

### Requirement: APNT recovery packet discovery uses local trial decryption

Recipient wallets MUST discover recovery packets using local trial decryption across APNT recovery packet records.

Public packet records MUST NOT identify the recipient.

Authentication failure for non-matching packet/state pairs MUST be treated as an expected scan result.

Successful decryption MUST NOT by itself constitute note acceptance.

#### Scenario: Recipient discovers its packet without public assignment

- **GIVEN** an aggregate APNT transaction containing multiple recovery packet records
- **AND** a recipient wallet has local outstanding receive state
- **WHEN** the wallet scans the packet records
- **THEN** non-matching packet/state pairs fail authentication
- **AND** the packet encrypted to the recipient decrypts successfully
- **AND** no public packet field identifies the recipient
- **AND** the wallet proceeds to local note-candidate verification

### Requirement: APNT allows only non-identifying scan hints

APNT MUST restrict public scan hints to non-identifying batch-level parsing hints.

Allowed public hints include packet-bin count, packet record count, carriage profile id, carrier payload byte length, carrier count, packet-bin byte length, and packet record encoding.

APNT MUST NOT expose public recipient-specific scan hints, recipient identifiers, descriptor hashes, contact keys, npubs, profile names, reusable tags, or recipient group assignments.

Off-chain sender-provided packet location hints MAY be used as untrusted scan-order hints only. They MUST NOT be required for recovery and MUST NOT be treated as protocol truth.

#### Scenario: Recipient uses an optional off-chain hint without trusting it

- **GIVEN** a recipient receives an optional off-chain packet location hint
- **WHEN** the recipient scans APNT recovery packets
- **THEN** the recipient may try the hinted packet first
- **AND** falls back to full packet-set trial decryption if the hint fails
- **AND** accepts recovered note-candidate evidence only after local verification
- **AND** public Plane B data does not identify the recipient packet

### Requirement: Recovered note candidates are verified locally

After successful decryption, the recipient wallet MUST parse and verify the recovered note-candidate payload locally.

Recipient-local verification MUST check the payload domain, version, network, note commitment, candidate binding, recovery packet hash, packet-bin inclusion, Plane A commitment binding, transition output evidence, seal evidence, and local duplicate/replay state where available.

Successful local verification MAY produce recovered note-candidate verification evidence.

Successful local verification MUST NOT by itself imply spendability, production privacy, proof acceptance, or final APNT acceptance.

#### Scenario: Recipient verifies a recovered note candidate

- **GIVEN** a recipient successfully decrypts a recovery packet
- **WHEN** the recovered payload is parsed
- **THEN** the wallet verifies the candidate against local and chain-derived evidence
- **AND** records recovered note-candidate verification evidence
- **AND** does not mark the private note spendable
- **AND** does not claim production privacy

### Requirement: APNT recovery payloads minimize encrypted public evidence

APNT encrypted recovery payloads MUST contain recipient-private note recovery material required for wallet-local note reconstruction.

APNT encrypted recovery payloads SHOULD NOT duplicate public chain evidence, Plane A evidence, Plane B packet-bin evidence, expanded manifests, or summary-only non-claims when that evidence can be verified by chain data, commitments, or same-transaction carrier reconstruction.

APNT encrypted recovery payloads MAY include compact binding references required to bind private recovery material to public transition, seal, packet-bin, and proof-transcript evidence.

Minimization MUST NOT remove material required for recipient-local note reconstruction and verification.

Minimization MUST NOT move private note-opening material, wallet seeds, spend keys, ML-KEM secret keys, note openings, or recipient-local outstanding receive state into public data.

#### Scenario: Minimized payload keeps private note material and references public evidence

- **GIVEN** a recipient recovery payload for an APNT private note candidate
- **WHEN** the sender constructs the encrypted recovery payload
- **THEN** recipient-private note recovery material is included in the encrypted payload
- **AND** public transition, seal, and packet-bin evidence is referenced compactly or verified externally
- **AND** the payload does not duplicate expanded public evidence solely for convenience
- **AND** private note-opening or wallet secret material is not moved into public Plane B metadata

### Requirement: Plane B carrier values are not private note values

APNT recovery packet-bin carrier outputs MUST treat output `valueSats` as BCH carrier/postage value for encrypted recovery material, not as the transferred private note amount.

#### Scenario: Observer audits Plane B carrier output values

- **GIVEN** a BCH transaction carrying APNT Plane B encrypted recovery packet-bin material
- **WHEN** a public observer inspects Plane B carrier outputs
- **THEN** the observer MAY see carrier output count, carrier output `valueSats`, total carrier value, script shape, and transaction fee
- **AND** those public values MUST NOT be interpreted by the protocol as the plaintext sender-to-recipient private note values.

#### Scenario: Recipient recovers encrypted note value

- **GIVEN** a recipient with local outstanding receive state
- **WHEN** the recipient reconstructs packet bins and decrypts its matching recovery packet
- **THEN** the recipient MAY recover encrypted private note fields such as `note.valueSats`
- **AND** that recovered private note value MUST remain distinct from public Plane B carrier output value.

