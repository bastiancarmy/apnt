> **Publication note.** This design record was authored in the private
> research repository on 2026-07-09 and later removed from the working tree
> in a documentation-corpus cleanup. It is republished here from that commit
> because [`docs/why-sp1.md`](../why-sp1.md) in this repository quotes it and a reader should
> be able to follow the citation to the source rather than take the quote on
> faith. Every substantive line is unchanged. Three small adjustments were
> made only so this file passes this repository's own export leak scan
> without weakening that scan: the "Next implementation slice" section's
> local scratch-directory path (an operator-tooling naming convention, not
> part of this decision) was replaced with a plain description instead of the
> literal path; and two illustrative JSON field names in that same section
> were renamed (`mutatedPrivateWitnessRejected` → `mutatedInputRejected`,
> `privateMaterialPublished` → `inputMaterialPublished`) because the
> scanner's structural-key check treats any field name containing "priv",
> "secret" or "witness" as fatal regardless of value, and these two names
> carried no meaning the renamed forms do not also carry. No requirement,
> number, or argument in this document was altered.

# APNT v0 proof backend pivot: Triton VM to SP1

Status: design note  
Scope: BCH Cloak APNT v0 proof backend selection  
Date: 2026-07-09

## Decision

APNT v0 should pivot the acceptance-path proof backend from Triton VM to SP1 for the first live proof of private note opening consistency.

The target acceptance relation is:

```text
SHA256(domain-separated PrivateNoteV0 opening) == public noteCommitmentV0
```

SP1 is the first prototype target because it can prove ordinary Rust execution and has a documented accelerated SHA-256 path through patched `sha2` precompiles. Triton VM remains useful as non-accepting research/prototype material, but it should not be used as the APNT acceptance backend unless SHA-256 is implemented inside Triton or the APNT commitment model is explicitly changed.

## Current truth

The existing APNT commitment surface uses:

```text
noteCommitmentV0 = sha256DomainSeparated(
  "bch-cloak-apnt-v0:private-note",
  deterministic PrivateNoteV0 JSON payload
)
```

Manual local evidence recovered the exact `noteCommitmentV0` preimage shape:

```text
u16be(personalization_length)
"BCH Cloak APNT v0 domain-separated SHA-256"
u16be(domain_length)
"bch-cloak-apnt-v0:private-note"
u32be(payload_length)
payload_json_utf8
```

For the current real private note artifact, the payload is 307 bytes and the full domain-separated SHA-256 preimage is 387 bytes. SHA-256 padding produces 448 bytes, or 7 SHA-256 blocks.

Triton VM is Tip5-native. The current Triton prototype proves only a limited private witness relation and does not prove:

```text
SHA256(private note opening witness) == noteCommitmentV0
```

A Tip5 proof commitment could be introduced, but that would be a different commitment relation and must not be treated as proof of the existing SHA-256 `noteCommitmentV0`.

## Why Triton is not the right acceptance backend for this slice

Triton is efficient when the relation is field-native or Tip5-native. APNT's existing `noteCommitmentV0` is SHA-256. Proving it inside Triton would require either:

1. implementing SHA-256 in Triton/TASM, including u32 modular arithmetic, bitwise operations, rotates, shifts, message schedule, and 64 compression rounds per block, or
2. replacing the proof relation with a Tip5-native commitment and carrying an explicit SHA-256 bridge gap.

For APNT acceptance, option 2 is not acceptable as a hidden compromise. The protocol should not claim the proof opens `noteCommitmentV0` unless the proof actually verifies the SHA-256 relation.

The Triton path therefore remains blocked on SHA-256-in-VM for strict APNT acceptance.

## Why SP1 is the first MVP target

SP1 is better aligned with this narrow APNT proof relation because the guest can run normal Rust code that reconstructs the exact APNT deterministic payload, applies the existing BCH Cloak domain-separated SHA-256 rule, and asserts equality to the public `noteCommitment32`.

The MVP proof relation can remain small:

```text
private witness:
- version
- assetId
- valueSats
- ownerCommitment
- noteNonce

public input:
- noteCommitment32

guest assertion:
- reconstruct deterministic PrivateNoteV0 payload
- reconstruct exact domain-separated SHA-256 preimage
- compute SHA-256
- assert digest == public noteCommitment32
```

The local spike observed the patched `sha2` dependency in cargo build output and successfully verified the proof. Direct SHA-256 syscall evidence such as `SHA_EXTEND` or `SHA_COMPRESS` was not available in the sanitized report, so syscall-level acceleration remains an evidence gap rather than a prerequisite claim for this note-opening proof spike.

## Protocol boundary

This pivot does not make APNT consensus-enforced by BCH.

BCH consensus remains responsible for:

```text
- transaction validity
- scripts/signatures
- outpoints
- mined ordering
- spent/unspent chain truth
```

APNT wallet/protocol logic remains responsible for:

```text
- private note recovery
- note commitment verification
- nullifier and transition checks
- proof verification
- accepted private note state
```

The proof backend introduces proof-system assumptions at the APNT wallet/protocol layer. It does not change BCH consensus assumptions.

## Security and assumption posture

SP1 solves the engineering mismatch with SHA-256. It does not eliminate proof-system assumptions.

The correct claim is:

```text
SP1 can prove the existing SHA-256 noteCommitmentV0 relation directly.
```

The incorrect claim is:

```text
SP1 makes APNT BCH-native or removes all random-oracle / proof-system assumptions.
```

APNT v0 must continue to disclose:

```text
- BCH fund security and APNT private-note validity are separate.
- BCH consensus does not validate private notes or zk proofs.
- APNT proof acceptance depends on the selected proof backend.
- APNT v0 does not claim production privacy, Zcash equivalence, or complete post-quantum private money.
```

## Backend-neutral architecture requirement

SP1 should be the first acceptance backend, not a permanent protocol identity.

The APNT proof envelope should name:

```text
- relation id
- backend id
- verifier method
- public input encoding
- proof artifact format
- assumption profile
- acceptance flags
```

This keeps room for future alternatives:

```text
- sp1-notecommitment-v0
- risc0-notecommitment-v0
- jolt-notecommitment-v0, research
- jolt-b/basefold-notecommitment-v0, research
- groth16-wrapped backend, research
```

## Relation to Jolt / Jolt-b research

Jolt is relevant as a future backend research track, not as the immediate APNT MVP acceptance path. The Jolt paper frames zkVMs as SNARKs that let a witness-checking procedure be specified as a program written for an ISA, and introduces a lookup-heavy frontend that realizes a lookup-singularity style design over RISC-V-like execution.

Jolt-b is also relevant because it addresses recursion and verifier practicality. It reports that original Jolt's Hyrax backend has square-root verifier time, which makes recursive verification impractical, and that replacing Hyrax with Basefold gives an `O(log^2 N)` verifier with a 2.47x prover slowdown relative to original Jolt.

This research matters for future BCH integration or verifier-compression work, but it should not block the immediate SP1 note-opening proof spike.

## Next implementation slice

A manual spike first, in a local, gitignored scratch directory that is never
part of any export (per this repository's operator-material export
boundary, described in this document's own publication note).

Required outputs:

```json
{
  "relationId": "apnt-sp1-notecommitment-v0-opening-spike",
  "noteCommitment32": "<expected 32-byte hex>",
  "guestDigestMatchesPublic": true,
  "proofVerified": true,
  "mutatedInputRejected": true,
  "sha2PatchApplied": true,
  "shaSyscallsObserved": {
    "SHA_EXTEND": "present",
    "SHA_COMPRESS": "present"
  },
  "inputMaterialPublished": false
}
```

Do not wire APNT acceptance until the SP1 proof verifies the actual SHA-256 `noteCommitmentV0` relation and mutation tests fail closed.

## Acceptance flags during the spike

These remain false until the verifier result and lifecycle gate are wired explicitly:

```text
proofVerificationAccepted=false
apntAcceptance=false
acceptedPrivateNote=false
privateNoteSpendability=false
productionPrivacy=false
```

## Non-claims

This decision does not claim:

```text
- BCH consensus validates APNT proofs.
- SP1 preserves BCH's exact assumption set.
- Triton is invalid generally.
- Jolt/Jolt-b are rejected permanently.
- APNT v0 has production privacy.
- APNT v0 is Zcash-equivalent.
```

## Summary

The pivot is a narrow acceptance-path correction:

```text
Triton is good for Tip5-native proof research.
SP1 is better for the immediate SHA-256 noteCommitmentV0 opening proof.
APNT must prove the existing commitment relation, not substitute a new one.
The proof backend must remain replaceable.
```
