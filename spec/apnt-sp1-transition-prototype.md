# apnt-sp1-transition-prototype Specification

## Purpose
TBD - created by archiving change prototype-apnt-sp1-groth16-transition-v0. Update Purpose after archive.
## Requirements
### Requirement: Hidden-value conservation

The prototype guest MUST prove that the sum of private input values equals the
sum of private output values plus the allowed public fee.

#### Scenario: Valid conserved transition

- **WHEN** all input and output notes are valid
- **AND** private values conserve exactly
- **THEN** the guest execution MUST succeed

#### Scenario: Value inflation

- **WHEN** output value plus fee exceeds input value
- **THEN** the guest execution MUST fail

### Requirement: Run-specific statement binding

The guest MUST bind every proof to one canonical
`APNTTransitionStatementV1`.

#### Scenario: Wrong statement commitment

- **WHEN** the supplied statement commitment does not match the private
  transition
- **THEN** proof generation or verification MUST fail

### Requirement: Stable verifier identity

Two distinct valid APNT transitions MUST be verifiable using the same accepted
guest identity and wrapper verification key.

#### Scenario: Two valid proofs

- **WHEN** two different valid APNT transitions are proved
- **THEN** both proofs MUST verify
- **AND** the guest identity MUST remain unchanged
- **AND** the wrapper verification key MUST remain unchanged

