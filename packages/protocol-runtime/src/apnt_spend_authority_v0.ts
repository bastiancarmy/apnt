// Maturity: preview — imported by apnt_bundle_nullifier_v1.ts and
// apnt_nullifier_v0.ts, but neither of those is itself imported anywhere
// published, and no published artifact pins it. Read it, don't build on it.
// See AGENTS.md, "The maturity ladder".
import { asBytes32, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";

export const APNT_SPEND_AUTHORITY_V0_DOMAIN =
  "bch-cloak-apnt-v0:owner-authority-v0";

/**
 * Normalizes a note's 32-byte owner-authority element with a defensive copy.
 *
 * As of the non-custodial spend-authority change this element is the
 * RECIPIENT's BIP-340 x-only public key `P`, not a secret preimage. The byte
 * width and the commitment derivation below are unchanged — only what the
 * element *is* changed — which is why every owner-commitment and nullifier
 * preimage slot in this protocol kept its exact layout.
 *
 * Structural validation of `P` as a curve point lives in
 * `apnt_note_authority_v0.ts`; this helper stays a pure width check so it can
 * remain the single normalizer for every 32-byte authority slot, including
 * relation witness parsing that must fail closed on a code rather than throw.
 */
export function normalizeAPNTOwnerAuthorityElementV0(value: unknown): Bytes32 {
  if (!(value instanceof Uint8Array)) {
    throw new Error("APNTOwnerAuthorityElementV0 must be a Uint8Array");
  }
  return asBytes32("APNTOwnerAuthorityElementV0", value);
}

/**
 * Width normalizer for 32-byte material that really is secret — the import
 * relation's per-note secret, ML-KEM encapsulation seeds. Deliberately NOT used
 * for owner-authority elements any more: those are public keys, and calling
 * them a spend secret is the confusion this change exists to remove.
 */
export function normalizeAPNTSpendSecretV0(value: unknown): Bytes32 {
  if (!(value instanceof Uint8Array)) {
    throw new Error("APNTSpendSecretV0.spendSecret32 must be a Uint8Array");
  }
  return asBytes32("APNTSpendSecretV0.spendSecret32", value);
}

/**
 * Derives a note's `ownerCommitment` from its 32-byte owner-authority element.
 *
 * `ownerCommitment32 = sha256DomainSeparated(owner-authority-v0, P)`
 *
 * Knowing `P` no longer authorizes a spend: the transition relation
 * additionally requires a BIP-340 Schnorr signature by `P` over the batch's
 * authorization message, so possession of this preimage proves only identity,
 * never authority.
 */
export function deriveAPNTOwnerCommitmentV0(ownerAuthorityElement32: unknown): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_SPEND_AUTHORITY_V0_DOMAIN,
    normalizeAPNTOwnerAuthorityElementV0(ownerAuthorityElement32),
  );
}
