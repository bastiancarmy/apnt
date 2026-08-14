# apnt-bundle-backed-transition-contracts Specification

## Purpose
TBD - created by archiving change add-apnt-bundle-backed-transition-contracts-v1. Update Purpose after archive.
## Requirements
### Requirement: Versioned canonical bundle-backed primitives

The protocol-runtime package MUST expose `BundleBackedPrivateNoteV1`,
`BackingSealCellOpeningV1`, `BackingBundleOpeningV1`, and
`APNTCreationScopeV1` with closed schemas, canonical binary serializers and
parsers, defensive byte copying, fixed-width unsigned little-endian integers,
and recursive unknown-field rejection. V1 Bytes32 identifiers, nonces, scopes,
profiles, and blinders MUST reject all-zero values. The v1 note, cell, bundle,
and scope domains and byte layouts MUST be those defined by task 4.3.

#### Scenario: Canonical bundle member order
- **WHEN** equivalent nonempty bundle members are supplied in different orders
- **THEN** normalization MUST order them by `creationScope32 || outputIndex`
- **AND** serialization and backing-bundle commitment MUST be identical
- **AND** duplicate identities or mixed creation scopes MUST fail closed

#### Scenario: Cycle-free creation scope
- **WHEN** a creation scope is derived for a v1 pre-sign projection
- **THEN** it MUST bind the ordered projection inputs and backing skeletons
- **AND** it MUST NOT depend on final txid, signatures, unlocking bytecode,
  proof chunks, note commitments, cell commitments, or bundle commitments

### Requirement: Domain-separated v1 commitments and nullifier

The package MUST provide a bundle-backed note commitment, seal-cell commitment,
backing-bundle commitment, and `deriveAPNTBundleNullifierV1` with their unique
v1 domain strings and canonical byte preimages. The bundle nullifier MUST hash
`spendSecret32 || consumedBundleBackedNoteCommitment32 ||
backingBundleCommitment32` in that order. Bundles MUST use explicit cardinality
and checked sums; changed scope, index, value, locking profile, blinder, member
omission, or member addition MUST produce a different commitment.

#### Scenario: Cross-version nullifier separation
- **WHEN** a caller supplies a v0 note/nullifier surface for a bundle-backed v1
  transition
- **THEN** it MUST NOT be accepted as `deriveAPNTBundleNullifierV1`
- **AND** the existing `deriveAPNTNullifierV0` MUST remain unchanged as
  single-seal prototype evidence

#### Scenario: Bundle member mutation
- **WHEN** a normalized bundle member's value, blinder, or locking profile is
  changed, or a member is omitted or added
- **THEN** the backing-bundle commitment and the note commitment that binds it
  MUST change

### Requirement: Fail-closed APNT privacy profile v1

The package MUST define a closed `APNTPrivacyProfileV1` descriptor, canonical
serializer, `privacyProfileId32` derivation, and fail-closed allowlist. A
profile ID MUST commit all rules, numeric constraints, denomination policy,
identity/recovery-placement rules, service-fee policy, and seal-locking,
recovery-collateral, proof-relation, SP1-program, and verifier-artifact
identity slots. Profile IDs identify rules only and MUST NOT encode users,
owners, recipients, contacts, or descriptors.

The initial allowlisted structural demo profile MUST require equal public
private-backing cells of exactly 2,000 sats; positive 2,000-sat multiples for
notes and private-transition fees; at least two consumed and two created notes;
at least two cells per note; at least six consumed and five created cells; no
mixed denominations; and the profile's task-4.3 ambiguity minima. For a
private transition it MUST require `consumedCellCount > createdCellCount` and
the split authorized-fee equation:

```text
(consumedCellCount - createdCellCount) * 2,000
  = networkFeeSats + aggregatorServiceFeeSats
networkFeeSats > 0
aggregatorServiceFeeSats >= 0
aggregatorServiceFeeSats mod 2,000 = 0
```

Each profile MUST fix exactly one service-fee rule. Permitted v1 rules are
`zero-service-fee` and `flat-per-contribution`. A `flat-per-contribution`
profile MUST fix a positive 2,000-sat-multiple per-contribution amount. A
`zero-service-fee` profile MUST require `aggregatorServiceFeeSats = 0` and
MUST NOT be represented as demonstrating fee enforcement. No profile may
define a private-value-proportional service fee.

#### Scenario: Unknown or weakened profile

- **WHEN** a statement names an unknown profile, a mismatched artifact slot, or
  a profile that permits one-note operation, mixed denominations, or a public
  owner/recipient marker
- **THEN** structural validation MUST fail before any witness or proof handling

#### Scenario: Equal-cell fee accounting

- **WHEN** a private-transition statement has valid equal backing cells but a
  nonmultiple fee, equal cell counts, or fee terms inconsistent with the count
  gap under the split authorized-fee equation
- **THEN** structural validation MUST fail closed

#### Scenario: Value-proportional service fee is rejected

- **WHEN** a caller supplies a profile whose service-fee rule scales with
  private note values or private transfer amounts
- **THEN** profile serialization or allowlisting MUST fail closed

### Requirement: Canonical transition statement v1 public boundary

The package MUST define `APNTTransitionStatementV1`, its canonical binary
serializer/parser/commitment, and fixed public logical-note/cell tuple types.
The statement MUST support only `private-transition` and
`complete-bundle-exit`, commit its closed profile and artifact IDs, and use
split logical-note and public-cell collections. For `private-transition` it
MUST bind public `aggregatorServiceFeeSats` and, when that value is positive,
the designated aggregator-fee output index; changing either MUST change
`statementCommitment32`. It MUST NOT publish logical note values, bundle
commitments, bundle members, bundle cardinality per note, owner commitments,
recipient material, sender/recipient identity, an
input-owner-to-output-owner mapping, or any per-contribution or per-user fee
itemization.

#### Scenario: Private join remains private

- **WHEN** a caller attempts to serialize a bundle commitment, member list,
  note-to-cell index list, owner commitment, recipient material, or ownership
  mapping into a v1 statement
- **THEN** normalization and serialization MUST fail closed

#### Scenario: Complete-bundle exit shape

- **WHEN** a statement uses `complete-bundle-exit`
- **THEN** it MUST contain exactly one consumed logical note and one positive
  `transparent-exit` output
- **AND** it MUST contain no created logical/cell tuples, recovery references,
  recovery carriers, verifier-only inputs, aggregator-fee outputs, or
  transparent change

#### Scenario: Service-fee terms are commitment-bound

- **WHEN** `aggregatorServiceFeeSats`, the designated aggregator-fee output
  index, or the aggregator-fee output's value or locking bytecode in the bound
  projection changes after statement construction
- **THEN** the expected `statementCommitment32` MUST no longer match

#### Scenario: Per-user fee itemization is rejected

- **WHEN** a caller attempts to serialize per-contribution, per-sender, or
  per-note fee shares into a v1 statement
- **THEN** normalization and serialization MUST fail closed

### Requirement: Closed projection roles and verifier designation

V1 projection inputs MUST be only `private-backing` or `verifier-only`;
outputs MUST be only `private-backing`, `recovery-packet-carrier`,
`aggregator-fee`, or `transparent-exit`. Token-bearing projection entries MUST
reject. The designated verifier index MUST be an independent top-level
designation of one verifier-capable input; it MUST NOT change that input's
backing role or value accounting. No transparent-change role exists.

A `private-transition` projection MUST contain exactly one `aggregator-fee`
output when the statement's `aggregatorServiceFeeSats` is positive and none
when it is zero. The aggregator-fee output's public value MUST equal
`aggregatorServiceFeeSats`. Aggregator-fee value MUST be excluded from
private-backing value, note backing, and the network-fee term, exactly as
verifier-only and recovery-carrier values are excluded. The aggregator-fee
locking bytecode is aggregator-selected and MUST NOT encode users, owners,
recipients, contacts, or descriptors.

#### Scenario: Invalid role or verifier designation

- **WHEN** a projection contains a token, unknown role, duplicate index,
  invalid verifier index, or verifier-only, recovery-carrier, or
  aggregator-fee value included in backing/fee-gap value
- **THEN** structural validation MUST fail closed

#### Scenario: Transparent output in private mode

- **WHEN** a `private-transition` projection contains a `transparent-exit`
  output
- **THEN** structural validation MUST fail closed

#### Scenario: Aggregator-fee output mismatch

- **WHEN** a `private-transition` projection contains zero, two, or more
  `aggregator-fee` outputs while `aggregatorServiceFeeSats` is positive, or
  contains an `aggregator-fee` output whose value differs from
  `aggregatorServiceFeeSats`, or contains any `aggregator-fee` output while
  `aggregatorServiceFeeSats` is zero
- **THEN** structural validation MUST fail closed

### Requirement: Structural validation is not relation acceptance

The package MUST expose `validateAPNTTransitionStatementV1Structure` to check
canonical public encoding, profile/mode agreement, public counts/order/indexes,
token absence, public value/fee equations, recovery-carrier pass-through, and
identity-field prohibition. It MUST NOT take private witnesses or claim valid
note openings, authority, complete bundle ownership, private assignment,
nullifiers, private conservation, recovery plaintext, proof acceptance, or
chain acceptance.

#### Scenario: Structurally valid does not mean privately accepted
- **WHEN** a statement passes structural validation
- **THEN** the result MUST make no assertion about a private relation, proof,
  wallet acceptance, or BCH acceptance

### Requirement: Deterministic v1 compatibility vectors and v0 preservation

The package MUST provide deterministic machine-readable TypeScript golden and
mutation vectors for valid private split, merge, multi-user aggregate subset
spend, and complete-bundle exit; wrong version/domain/field width/zero ID;
duplicate/reordered/omitted/additional/mutated bundle members; v0/v1 domain
separation; privacy-profile and mode failures; role/index/token failures; and
identity-marker attempts. Vectors MUST include canonical bytes and expected
accept/reject outcomes where applicable.

#### Scenario: Mutation vector rejects identity marker
- **WHEN** a vector adds a public recipient, owner, contact, descriptor, npub,
  or `bchcloak:` marker field
- **THEN** the parser or structural validator MUST reject it
- **AND** no vector may classify it as a valid protocol field

