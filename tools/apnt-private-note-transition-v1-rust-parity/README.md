# APNT private-note transition V1 Rust parity

This additive crate evaluates canonical `APNTPTI1` bytes using the reviewed
Transition Relation V1 semantics. It parses the exact 200-byte Profile V2
before Statement V2, enforces the TypeScript codec's primary-key plus complete
wire-record order across all eight witness collections, and emits the exact
307-byte `APNTPRR1` result.

Tests compile in protocol-runtime's single authoritative generated APNTPTI1
corpus from `packages/protocol-runtime/test-vectors/`; no local copy is kept.
It is deterministic private test material. Do not put it on chain or expose it
through aggregator logs. Tests compare all accepted and rejected TypeScript
results with Rust byte-for-byte.

The result copies Statement V2's claimed `(P, R, K)` tuple. This crate does not
authenticate `K`; the later authenticated verifier is responsible for pinning
the approved program identity.
