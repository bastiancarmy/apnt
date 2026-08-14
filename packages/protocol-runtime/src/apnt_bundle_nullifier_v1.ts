// Maturity: preview — measured zero published importers; imports the
// preview apnt_spend_authority_v0.ts. No published artifact references it.
// See AGENTS.md, "The maturity ladder".
import { asBytes32, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { normalizeAPNTOwnerAuthorityElementV0 } from "./apnt_spend_authority_v0.js";

export const APNT_BUNDLE_NULLIFIER_V1_DOMAIN = "bch-cloak-apnt-v0:bundle-nullifier-v1";

export type DeriveAPNTBundleNullifierV1Args = Readonly<{
  /**
   * The note's owner-authority element: the recipient's BIP-340 x-only public
   * key `P`. The nullifier is `H(P ‖ note ‖ bundle)`, unique per note without
   * needing any secret, so a delegated prover can compute it from material it
   * is already allowed to hold.
   */
  ownerPublicKeyX32: Bytes32;
  consumedBundleBackedNoteCommitment32: Bytes32;
  backingBundleCommitment32: Bytes32;
}>;

function assertRecord(name: string, value: unknown): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
}

function assertKnownKeys(name: string, value: Record<string, unknown>): void {
  const allowed = new Set([
    "ownerPublicKeyX32",
    "consumedBundleBackedNoteCommitment32",
    "backingBundleCommitment32",
  ]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`${name} contains unknown field ${key}`);
  }
}

function assertNonzeroBytes32(name: string, value: unknown): Bytes32 {
  if (!(value instanceof Uint8Array)) throw new Error(`${name} must be a Uint8Array`);
  const bytes = asBytes32(name, value);
  if (bytes.every((byte) => byte === 0)) throw new Error(`${name} must not be all zero`);
  return bytes;
}

/**
 * Derives one public v1 lineage tag. Authorization and consistency between the
 * private note opening and bundle opening remain relation checks.
 */
export function deriveAPNTBundleNullifierV1(value: unknown): Promise<Bytes32> {
  assertRecord("DeriveAPNTBundleNullifierV1Args", value);
  assertKnownKeys("DeriveAPNTBundleNullifierV1Args", value);
  const ownerPublicKeyX32 = normalizeAPNTOwnerAuthorityElementV0(value.ownerPublicKeyX32);
  const consumedBundleBackedNoteCommitment32 = assertNonzeroBytes32(
    "DeriveAPNTBundleNullifierV1Args.consumedBundleBackedNoteCommitment32",
    value.consumedBundleBackedNoteCommitment32,
  );
  const backingBundleCommitment32 = assertNonzeroBytes32(
    "DeriveAPNTBundleNullifierV1Args.backingBundleCommitment32",
    value.backingBundleCommitment32,
  );
  const payload = new Uint8Array(96);
  payload.set(ownerPublicKeyX32, 0);
  payload.set(consumedBundleBackedNoteCommitment32, 32);
  payload.set(backingBundleCommitment32, 64);
  return sha256DomainSeparated(APNT_BUNDLE_NULLIFIER_V1_DOMAIN, payload);
}
