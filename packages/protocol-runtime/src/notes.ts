import { asBytes32, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { serializeDeterministicUtf8 } from "./serialization.js";

export const PRIVATE_NOTE_V0_VERSION = 0;
export const PRIVATE_NOTE_V0_COMMITMENT_DOMAIN = "bch-cloak-apnt-v0:private-note";

export type PrivateNoteV0 = Readonly<{
  version: typeof PRIVATE_NOTE_V0_VERSION;
  assetId: Bytes32;
  valueSats: bigint;
  /** sha256DomainSeparated(APNT_SPEND_AUTHORITY_V0_DOMAIN, per-note spendSecret32). */
  ownerCommitment: Bytes32;
  noteNonce: Bytes32;
}>;

function assertNonNegativeBigInt(name: string, value: bigint): void {
  if (typeof value !== "bigint" || value < 0n) {
    throw new Error(`${name} must be a non-negative bigint`);
  }
}

export function normalizePrivateNoteV0(note: PrivateNoteV0): PrivateNoteV0 {
  if (note.version !== PRIVATE_NOTE_V0_VERSION) {
    throw new Error("PrivateNoteV0.version must be 0");
  }
  assertNonNegativeBigInt("PrivateNoteV0.valueSats", note.valueSats);
  return Object.freeze({
    version: PRIVATE_NOTE_V0_VERSION,
    assetId: asBytes32("PrivateNoteV0.assetId", note.assetId),
    valueSats: note.valueSats,
    ownerCommitment: asBytes32("PrivateNoteV0.ownerCommitment", note.ownerCommitment),
    noteNonce: asBytes32("PrivateNoteV0.noteNonce", note.noteNonce),
  });
}

export function serializePrivateNoteV0(note: PrivateNoteV0): Uint8Array {
  const normalized = normalizePrivateNoteV0(note);
  return serializeDeterministicUtf8({
    assetId: normalized.assetId,
    noteNonce: normalized.noteNonce,
    ownerCommitment: normalized.ownerCommitment,
    valueSats: normalized.valueSats.toString(10),
    version: normalized.version,
  });
}

export function noteCommitmentV0(note: PrivateNoteV0): Promise<Bytes32> {
  return sha256DomainSeparated(PRIVATE_NOTE_V0_COMMITMENT_DOMAIN, serializePrivateNoteV0(note));
}
