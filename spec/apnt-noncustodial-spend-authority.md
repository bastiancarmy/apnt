# apnt-noncustodial-spend-authority Specification

## Purpose
TBD - created by archiving change define-apnt-noncustodial-spend-authority-v0. Update Purpose after archive.
## Requirements
### Requirement: No code path requires custody of spend authority material

No witness, request, or message handed to a delegated prover, relay,
aggregator, or any other counterparty MAY contain a value whose possession
alone authorizes spending a private note. A counterparty MAY hold everything
needed to construct and prove a statement and MUST remain cryptographically
unable to spend what it consumes.

This requirement applies independent of deployment context (consumer,
business/treasury, machine/automated) and independent of whether expensive
proving makes delegation the practical deployment path. Expensive proving is
a reason delegation must be non-custodial, not a reason to make
non-custodial delegation optional.

#### Scenario: Interactive (consumer) authorization with a custodial-declared prover

- **WHEN** a spend authorization request is made in interactive-approval mode with a prover trust model declared `delegated-custodial-prover`
- **THEN** the request MUST be refused with a closed failure code, unconditionally, whether or not a policy object is supplied

#### Scenario: Local-credential (business/machine) authorization with a custodial-declared prover

- **WHEN** a spend authorization request is made in local-credential mode with a prover trust model declared `delegated-custodial-prover`
- **THEN** the request MAY be authorized without a policy override, because this trust relationship (e.g. an HSM/KMS-held credential) is a deliberately chosen custody arrangement distinct from the sender-issued-preimage hazard the interactive-mode refusal exists for

### Requirement: Spend authority material originates with the recipient

All per-note authority material MUST originate with the note's recipient and
MUST travel sender-ward as a public commitment only. The sender that creates
a note MUST NOT generate, learn, or be able to derive the private material
that authorizes spending that note.

#### Scenario: Sender constructs a created note

- **WHEN** a sender constructs a created note's `ownerCommitment`
- **THEN** the value MUST be copied from a commitment the recipient published in advance (e.g. a one-time receive descriptor), and the sender MUST NOT generate the underlying private material itself

#### Scenario: Recovery packet content

- **WHEN** a sender builds the recovery packet for a created note
- **THEN** the packet MUST NOT carry the recipient's private spend-authority material, because the recipient already holds it from having generated it

