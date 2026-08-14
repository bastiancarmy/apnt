# apnt-receive-descriptors Specification

## Purpose
TBD - created by archiving change define-apnt-receive-descriptors-v0. Update Purpose after archive.
## Requirements
### Requirement: APNT contact descriptors are optional request routes

APNT v0 MUST define a wallet-layer static contact descriptor class for optional request routing.

A contact descriptor MUST NOT be BCH consensus address material.

A contact descriptor MUST NOT be payment receive material.

A contact descriptor MUST NOT be accepted where a one-time receive descriptor is required.

A contact descriptor MUST NOT be used directly as Plane B encryption material.

A contact descriptor MAY contain off-chain contact or transport hints, but those hints MUST NOT become protocol truth.

#### Scenario: Contact descriptor is accepted as request route

- **GIVEN** a well-formed APNT contact descriptor
- **WHEN** a wallet parses it as a contact/request route
- **THEN** validation succeeds
- **AND** the descriptor is classified as contact-only

#### Scenario: Contact descriptor is rejected as payment receive material

- **GIVEN** a well-formed APNT contact descriptor
- **WHEN** Alice attempts to use it as payment receive material
- **THEN** validation fails
- **AND** Alice MUST request or obtain a one-time receive descriptor instead

### Requirement: APNT one-time receive descriptors are required payment material

APNT v0 MUST define a wallet-layer one-time receive descriptor class for payment receive material.

A one-time receive descriptor MUST be generated fresh for a payment intent.

A one-time receive descriptor MUST include fresh ML-KEM public receive material.

A one-time receive descriptor MUST carry a single-use policy.

A reusable or static receive policy MUST be rejected as payment receive material.

A one-time receive descriptor MAY carry expiry or validity-window fields.

If expiry or validity-window fields are implemented, validators MUST reject malformed expiry or validity-window fields.

Expiry or validity-window fields do not create BCH chain truth or APNT protocol acceptance by themselves.

Single-use is recipient wallet-policy state, not BCH consensus state.

A one-time receive descriptor MUST be private wallet-layer handoff material and MUST NOT be placed on-chain as plaintext.

#### Scenario: One-time descriptor validates as payment receive material

- **GIVEN** a well-formed APNT one-time receive descriptor
- **WHEN** Alice validates it for payment construction
- **THEN** validation succeeds
- **AND** Alice may use its fresh ML-KEM public key to encrypt a note-candidate recovery payload

#### Scenario: Reusable descriptor marker is rejected

- **GIVEN** a descriptor with reusable/static receive policy
- **WHEN** Alice validates it as one-time payment receive material
- **THEN** validation fails

#### Scenario: Malformed expiry field is rejected

- **GIVEN** a one-time receive descriptor with a malformed expiry or validity-window field
- **WHEN** Alice validates it as one-time payment receive material
- **THEN** validation fails

### Requirement: One-time receive descriptor public fields are constrained

A one-time receive descriptor MUST include:

- version
- domain
- network
- descriptor id or receive id
- single-use receive policy
- expiry or validity window if expiry is implemented
- ML-KEM algorithm identifier
- fresh ML-KEM public key
- note receive diversifier, note salt, or equivalent receive material required for note-candidate construction

A one-time receive descriptor MUST NOT include:

- ML-KEM secret key
- wallet seed
- spend key
- note opening secret in clear beyond intended public receive material
- static reusable receive marker
- Bob npub
- Bob contact key
- Bob contact auth public key
- descriptor string embedded inside itself
- Plane A metadata
- Plane B packet-bin metadata
- aggregator handoff material

#### Scenario: Private material in descriptor is rejected

- **GIVEN** a one-time receive descriptor containing ML-KEM secret key material
- **WHEN** the descriptor is parsed
- **THEN** validation fails

#### Scenario: Missing ML-KEM public key is rejected

- **GIVEN** a one-time receive descriptor without an ML-KEM public key
- **WHEN** Alice validates it as payment receive material
- **THEN** validation fails

### Requirement: Bob-local receive state is separate from public descriptor material

Bob's wallet MUST keep the matching secret receive state local.

Bob-local receive state MUST include at least:

- descriptor id or receive id
- network
- single-use receive policy
- status
- ML-KEM secret key
- ML-KEM public key
- note receive material

Bob-local receive state MAY include created timestamp and expiry timestamp if those fields are implemented.

Bob-local receive state is not a descriptor. It is wallet-local secret state linked to a public one-time receive descriptor.

Bob-local receive state MUST NOT be serialized into the one-time receive descriptor.

Bob-local receive state MUST NOT be serialized into Plane A, Plane B public metadata, aggregator handoff material, or any on-chain plaintext field.

Bob-local receive state MUST NOT be placed on-chain.

#### Scenario: Bob generates descriptor and local state

- **GIVEN** Bob's wallet creates a one-time receive descriptor
- **WHEN** generation succeeds
- **THEN** the public descriptor contains only public receive material
- **AND** Bob-local state contains matching secret receive material
- **AND** the secret material is absent from descriptor serialization

### Requirement: One-time descriptor generation produces linked public and local artifacts

APNT v0 one-time receive descriptor generation MUST produce two linked artifacts:

- a public one-time receive descriptor
- Bob-local outstanding receive state

The public one-time receive descriptor MUST contain the descriptor id or receive id, single-use receive policy, ML-KEM-768 public receive material, and public note receive material required for note-candidate construction.

The Bob-local outstanding receive state MUST contain the same descriptor id or receive id, the same ML-KEM-768 public receive material, and the matching ML-KEM-768 secret receive material.

The ML-KEM secret receive material MUST remain Bob-local and MUST NOT appear in the public descriptor serialization.

#### Scenario: Generated descriptor and local state are linked

- **GIVEN** Bob's wallet generates a one-time receive descriptor
- **WHEN** generation succeeds
- **THEN** the public descriptor and Bob-local receive state share the descriptor id or receive id
- **AND** the public descriptor and Bob-local receive state share the ML-KEM public receive key
- **AND** only Bob-local receive state contains the matching ML-KEM secret receive key

### Requirement: One-time receive descriptors use real ML-KEM-768 receive key material

APNT v0 one-time receive descriptor generation MUST use real ML-KEM-768 key generation for receive encryption material.

A generated one-time receive descriptor MUST NOT contain placeholder bytes, random bytes mislabeled as ML-KEM material, static reusable receive material, or material derived directly from a static contact descriptor.

The implementation MAY choose any audited/runtime-supported ML-KEM-768 library or helper, but descriptor validity depends on APNT field validation and wallet-local state linkage, not on a specific package name or source file.

#### Scenario: Placeholder ML-KEM material is rejected

- **GIVEN** a generated one-time receive descriptor
- **WHEN** the descriptor's ML-KEM public receive material is missing, malformed, or not the expected ML-KEM-768 public key length
- **THEN** payment receive material validation fails

### Requirement: Descriptor serialization keeps contact and payment roles distinct

APNT v0 MUST provide canonical descriptor serialization and parsing.

One-time receive descriptors SHOULD use a `bchcloak:` wallet-layer serialization.

Contact descriptors MUST use a distinct prefix, typed envelope, or domain such that a parser cannot confuse a contact route with payment receive material.

Parsers MUST reject descriptors with unknown domains, malformed versions, malformed networks, or role mismatches.

#### Scenario: Contact descriptor cannot parse as one-time descriptor

- **GIVEN** a serialized APNT contact descriptor
- **WHEN** a one-time receive descriptor parser receives it
- **THEN** parsing fails with a role/domain mismatch

#### Scenario: One-time descriptor round trips

- **GIVEN** a valid one-time receive descriptor
- **WHEN** it is serialized and parsed
- **THEN** the parsed descriptor equals the canonical descriptor

### Requirement: Plane A and Plane B do not expose descriptor material

APNT Plane A and Plane B MUST NOT publicly serialize:

- Bob npub
- Bob contact key
- static contact descriptor
- one-time receive descriptor string
- descriptor id as recipient marker
- fresh ML-KEM public key as recipient marker
- descriptor signature
- ML-KEM secret key
- wallet seed
- spend key
- note plaintext
- note opening in clear

Plane B MUST carry only encrypted packet material derived from the one-time receive descriptor.

#### Scenario: Plane B packet construction receives forbidden descriptor field

- **GIVEN** a packet construction input containing Bob npub or descriptor string as public packet metadata
- **WHEN** packet construction validates inputs
- **THEN** validation fails

### Requirement: Receive descriptors support encrypted opaque recovery payload bytes

APNT v0 runtime MUST support encrypting opaque recovery payload bytes to a valid one-time receive descriptor and decrypting them with matching Bob-local outstanding receive state.

The encryption helper MUST accept only one-time receive descriptors as payment receive material.

The encryption helper MUST NOT accept static contact descriptors.

The encrypted payload envelope MUST NOT expose Bob identity material, descriptor strings, ML-KEM secret material, Plane A metadata, Plane B packet-bin metadata, or aggregator handoff material.

This requirement does not define the final note-candidate recovery payload schema, final Plane B packet-bin encoding, wallet scan/import, or accepted private-note import.

#### Scenario: Matching Bob-local state decrypts opaque payload bytes

- **GIVEN** a generated one-time receive descriptor and matching Bob-local outstanding receive state
- **WHEN** Alice encrypts opaque recovery payload bytes to the descriptor
- **THEN** Bob can decrypt the encrypted payload with the matching Bob-local outstanding receive state

#### Scenario: Non-matching Bob-local state fails

- **GIVEN** a generated one-time receive descriptor
- **AND** a different Bob-local outstanding receive state
- **WHEN** Alice encrypts opaque recovery payload bytes to the descriptor
- **THEN** decryption with the non-matching Bob-local state fails

### Requirement: Contact routes are optional transport only

If APNT v0 uses Nostr or another contact route to request and deliver one-time receive descriptors, that route MUST be treated as optional transport only.

Such transport MUST NOT be settlement, custody, recovery truth, protocol validation, or namespace authority.

Nostr event ids, roots, relay state, or signatures MUST NOT be required for BCH chain validation.

#### Scenario: Nostr route is absent

- **GIVEN** a one-time receive descriptor delivered by QR code, file, or direct channel
- **WHEN** Alice validates the descriptor
- **THEN** validation does not require Nostr evidence

### Requirement: Static RPA-like derivation is future work

APNT v0 MUST NOT treat a static contact descriptor as a true RPA-like payment address.

APNT v0 MUST NOT derive final Plane B encryption material directly from a static contact descriptor unless a future OpenSpec change defines and validates such a construction.

Descriptor pools and true noninteractive RPA-like derivation are future work.

#### Scenario: Static descriptor is used as direct encryption material

- **GIVEN** a static contact descriptor
- **WHEN** Alice attempts to encrypt a recovery payload directly to it
- **THEN** validation fails
- **AND** Alice must obtain a one-time receive descriptor

