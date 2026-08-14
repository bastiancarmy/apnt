# apnt-private-spend-interface Specification

## Purpose
Requirements for the caller-agnostic spend authorization contract: relation reuse, checked-not-trusted grants, persona-neutral policy, custody disclosure, and service-fee reuse.
Promoted on 2026-08-13 by archiving change `define-apnt-private-spend-interface-v0`.
## Requirements

### Requirement: Spend reuses the canonical transition relation

A private spend of an already-recorded APNT note MUST be expressed as an
instance of the `private-transition` mode over `APNTTransitionStatementV1` and
MUST be proven by `apnt-private-note-transition-relation-v0`. No spend-specific
statement version, relation identity, SP1 guest, or program verification key
MAY be introduced for the sole purpose of consuming a previously recorded note.

The relation MUST NOT be given any means of distinguishing a consumed note whose
backing cells were created by an import from one whose backing cells were
created by an earlier transition. Consumed backing cell openings MUST retain
their own historical creation scope and MUST NOT be constrained to the current
statement's `createdBackingCreationScope32`.

#### Scenario: Consumed cells from an earlier creation scope

- **WHEN** a transition consumes backing cells whose opening `creationScope32` differs from the current statement's `createdBackingCreationScope32`
- **THEN** the relation MUST NOT reject on that basis alone

#### Scenario: Spend-specific statement proposed

- **WHEN** a spend-specific successor statement or relation identity is proposed solely to represent consumption of a recorded note
- **THEN** it MUST be rejected in favour of the existing `private-transition` statement and relation

### Requirement: Canonical BCH asset identity is package-owned

The canonical APNT v0 BCH asset ID MUST be derived as package-standard
domain-separated SHA-256 under `bch-cloak-apnt-v0:asset-id-v0` over UTF-8 `BCH`,
and MUST be exposed as a single package-owned definition rather than duplicated
literals. A pinned regression value MUST be asserted against an independent
recomputation so that a change to the hash personalization, domain, or payload
fails loudly.

Host-policy conformance checks MUST verify both that every consumed and created
asset ID equals the canonical constant and that the consumed and created sides
agree. Any result these checks return MUST declare explicitly that the property
is not enforced by the relation.

#### Scenario: Noncanonical asset ID offered to a construction path

- **WHEN** a note construction path is given an asset ID that is not the canonical constant
- **THEN** construction MUST reject

#### Scenario: Host policy result inspected for proof status

- **WHEN** a caller inspects an asset-policy result to decide whether the property is proven
- **THEN** the result MUST report that it is not proven in the relation

#### Scenario: Canonical constant drift

- **WHEN** the derivation of the canonical asset ID no longer matches its pinned value
- **THEN** the package test suite MUST fail

### Requirement: Spend authorization is caller-agnostic

The spend authorization contract MUST expose exactly one per-caller extension
point, an adapter function from a request to a grant. Consumer, business
treasury, and unattended machine callers MUST invoke the same core authorization
flow and MUST differ only in the adapter they supply and the policy they
declare.

For one identical request, the witness material projected from a grant produced
by an interactive adapter and from a grant produced by a local-credential
adapter MUST be byte-identical. The authorization mechanism MUST NOT be able to
change the statement, the relation, the nullifier, or the proof.

The contract MUST NOT require a paired interactive wallet session, a relay round
trip, or a human prompt in order to authorize a spend.

#### Scenario: Unattended machine authorization

- **WHEN** a machine caller authorizes a spend from a locally held credential with no human present and no relay
- **THEN** authorization MUST succeed through the same core flow used by an interactive caller

#### Scenario: Persona equivalence of witness material

- **WHEN** an interactive adapter and a local-credential adapter authorize the same request with the same authority material
- **THEN** the projected authority and nullifier witness records MUST be byte-identical

### Requirement: Authorization grants are checked, never trusted

Grant verification MUST re-derive the owner commitment from the returned
authority material and compare it against an expected commitment supplied by the
caller from its own note openings. It MUST re-derive each nullifier with the
canonical bundle-nullifier helper and compare it against the request's stated
expectation. It MUST reject a grant that is bound to a different statement
commitment, answers a different request identity, omits or duplicates a
requested note, or derives a duplicate nullifier.

Verification failures MUST use a closed, witness-free outcome vocabulary and
MUST NOT echo authority material.

#### Scenario: Relay substitutes authority material

- **WHEN** a grant returns authority material that does not open the expected owner commitment
- **THEN** verification MUST reject with an authority-commitment mismatch

#### Scenario: Grant replayed into another statement

- **WHEN** a grant carries a statement commitment other than the request's
- **THEN** verification MUST reject with a statement mismatch

#### Scenario: Unexpected nullifier steered by a requester

- **WHEN** the nullifier derived from the granted material differs from the request's expectation
- **THEN** verification MUST reject with a nullifier expectation mismatch

### Requirement: Custody of spend authority is declared and refusable

Because APNT v0 spend authority is a hash preimage consumed as private witness
rather than a signature, an authorization adapter cannot prove authority without
conferring it. Every grant MUST declare both the authorization mode by which
authority was applied and the prover trust model describing where the prover runs
relative to the holder of the secret.

A caller policy MUST be able to refuse a declared prover trust model, so that a
deployment can mechanically reject a delegated custodial prover rather than rely
on convention. Neither declaration MAY affect the statement, witness, or proof.

#### Scenario: Delegated custodial prover refused by policy

- **WHEN** a grant declares a delegated custodial prover and the caller policy allows only a self-hosted prover
- **THEN** authorization MUST reject on policy grounds

#### Scenario: Declaration does not alter the proof

- **WHEN** two grants for one request differ only in their declared mode or prover trust model
- **THEN** the projected witness material MUST be identical

### Requirement: Authorization policy is persona-neutral

A single declarative policy MUST bound total authorized value, note count,
network fee, aggregator service fee, allowed authorization modes, and allowed
prover trust models. The same core flow MUST enforce it for every caller type, so
that an unattended caller is not served by a separate code path with its own
checks. Every policy field MUST be optional so that a caller relying on human
approval may omit all of them.

#### Scenario: Service fee exceeds the caller's authorized bound

- **WHEN** a request states an aggregator service fee greater than the policy bound
- **THEN** authorization MUST reject on policy grounds

#### Scenario: Consumer caller declares no policy

- **WHEN** a caller supplies no policy
- **THEN** authorization MUST proceed on grant verification alone

### Requirement: Spend service fees reuse the aggregator service fee mechanism

Because both allowlisted privacy profiles require at least two consumed and two
created logical notes, a single wallet MUST NOT be able to form a valid
private-transition statement alone, and every private spend MUST therefore be
batched. A spend-side service fee MUST reuse the existing
`aggregatorServiceFeeSats` term, the existing split cell-count fee equation, the
existing single `aggregator-fee` projection output role, and the existing private
conservation equation. No spend-specific fee term, output role, or equation MAY
be introduced.

Each contributing wallet MUST authorize the exact service fee inside its own
contribution, so that the fee cannot be raised or reassigned after intent
acceptance without invalidating the proof.

#### Scenario: Solo spend attempted

- **WHEN** a statement presents fewer consumed or created logical notes than the profile minima
- **THEN** the statement MUST reject

#### Scenario: Service fee altered after intent acceptance

- **WHEN** an aggregator changes the service fee after a wallet authorized a different amount
- **THEN** the proof MUST NOT verify against the wallet's authorized statement

### Requirement: Non-claims are stated rather than implied

Any module implementing a property that the relation does not prove MUST state
that non-claim in the module itself, not only in commit history or external
notes. Spendability gates MUST NOT be reported as satisfied on the basis of
interface implementation alone; a gate requiring verification against a proven
spend MUST remain unsatisfied until a spend has been proven.

#### Scenario: Host-policy module inspected

- **WHEN** a reviewer reads a module that enforces a property outside the relation
- **THEN** the module MUST state that the property is not proven in the relation

#### Scenario: Gate status after interface implementation

- **WHEN** the spend authorization interface is implemented and tested but no spend has been proven
- **THEN** the spend authorization spendability gate MUST remain not-implemented
