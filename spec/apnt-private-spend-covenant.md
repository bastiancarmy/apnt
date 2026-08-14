# apnt-private-spend-covenant Specification

## Purpose
Requirements for the created-note seal's two-branch locking template: the privacy-default aggregate branch and the mandatory recipient-authority transparent exit branch.
Promoted on 2026-08-13 by archiving change `define-apnt-private-spend-covenant-v0`.
## Requirements

### Requirement: Every created note carries a mandatory transparent exit branch

A created note's on-chain seal locking script MUST always include a direct,
transparent exit branch authorized by a fresh one-time signing key, in
addition to the privacy-default aggregate branch. This MUST be a structural
property of the locking script itself, not a convention a wallet or
aggregator could omit.

#### Scenario: A seal cell is created without an exit branch

- **WHEN** a created note's locking script is constructed
- **THEN** it MUST be rejected as nonconforming if it lacks the mandatory direct-exit branch

### Requirement: Both spend branches use recipient-generated authority only

Neither the aggregate branch's spend authority nor the direct-exit branch's
one-time signing key MAY be generated or knowable by the sender. Both MUST
follow the same principle established for private-transition spend
authority: the recipient generates the private material and publishes only
a public commitment.

#### Scenario: A sender attempts to construct exit-key material

- **WHEN** a note's created-side construction is inspected
- **THEN** the one-time exit key's private material MUST NOT be derivable from anything the sender held or generated
