# apnt-pluggable-prover-backend Specification

## Purpose
TBD - created by archiving change add-apnt-pluggable-prover-backend-v0. Update Purpose after archive.
## Requirements
### Requirement: Proof generation is invoked through a backend-neutral interface

Any code that needs a proof for a constructed proving input MUST call a
single, backend-neutral interface rather than invoking a specific prover
implementation directly. Switching which backend actually performs proving
MUST be a configuration change, not a code change to any caller.

#### Scenario: Adding a GPU backend later

- **WHEN** a GPU-backed prover implementation is added
- **THEN** no caller of the proving interface (aggregator batch assembly, console, CLI tooling) requires modification to use it

### Requirement: The interface never accepts third-party delegated proving

The pluggable backend interface MUST NOT support or expose a mode where the
proving input is sent to a service this project does not operate. Backend
selection is between infrastructure the operator controls; it is not a
marketplace or delegation negotiation with an external party.

#### Scenario: A caller requests remote proving

- **WHEN** any caller requests a backend
- **THEN** the only selectable backends are ones this project's own configuration names as operator-controlled infrastructure, never an arbitrary third-party endpoint

