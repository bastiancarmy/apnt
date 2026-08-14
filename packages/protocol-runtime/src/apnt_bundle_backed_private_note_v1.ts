// Maturity: stable — the shared private-note type; 11 published
// protocol-runtime modules import it. See AGENTS.md, "The maturity ladder".
import { asBytes32, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";

export const BUNDLE_BACKED_PRIVATE_NOTE_V1_VERSION = 1;
export const BUNDLE_BACKED_PRIVATE_NOTE_V1_BYTE_LENGTH = 145;
export const BUNDLE_BACKED_PRIVATE_NOTE_V1_COMMITMENT_DOMAIN =
  "bch-cloak-apnt-v0:bundle-backed-private-note-commitment-v1";
/** Selected in the active APNT v1 contract design; applies to one BCH private note. */
export const APNT_V1_BCH_MAX_MONEY_SATS = 2_100_000_000_000_000n;

const MAGIC = Uint8Array.of(0x41, 0x50, 0x4e, 0x54, 0x42, 0x4e, 0x56, 0x31); // APNTBNV1
const VERSION_OFFSET = MAGIC.length;
const ASSET_ID_OFFSET = VERSION_OFFSET + 1;
const VALUE_SATS_OFFSET = ASSET_ID_OFFSET + 32;
const OWNER_COMMITMENT_OFFSET = VALUE_SATS_OFFSET + 8;
const BACKING_BUNDLE_COMMITMENT_OFFSET = OWNER_COMMITMENT_OFFSET + 32;
const NOTE_NONCE_OFFSET = BACKING_BUNDLE_COMMITMENT_OFFSET + 32;

export type BundleBackedPrivateNoteV1 = Readonly<{
  version: typeof BUNDLE_BACKED_PRIVATE_NOTE_V1_VERSION;
  assetId: Bytes32;
  valueSats: bigint;
  ownerCommitment: Bytes32;
  backingBundleCommitment32: Bytes32;
  noteNonce: Bytes32;
}>;

function assertRecord(name: string, value: unknown): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
}

function assertKnownKeys(name: string, value: Record<string, unknown>, keys: readonly string[]): void {
  const allowed = new Set(keys);
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

function assertPositiveBchValue(name: string, value: unknown): bigint {
  if (typeof value !== "bigint" || value <= 0n || value > APNT_V1_BCH_MAX_MONEY_SATS) {
    throw new Error(
      `${name} must be a positive bigint no greater than APNT_V1_BCH_MAX_MONEY_SATS`,
    );
  }
  return value;
}

function writeU64LE(output: Uint8Array, offset: number, value: bigint): void {
  for (let index = 0; index < 8; index += 1) {
    output[offset + index] = Number((value >> BigInt(index * 8)) & 0xffn);
  }
}

function readU64LE(bytes: Uint8Array, offset: number): bigint {
  let value = 0n;
  for (let index = 0; index < 8; index += 1) {
    value |= BigInt(bytes[offset + index] as number) << BigInt(index * 8);
  }
  return value;
}

/**
 * Normalizes only the standalone v1 note object. It does not validate a bundle,
 * privacy profile, private relation, proof, wallet state, or chain state.
 */
export function normalizeBundleBackedPrivateNoteV1(value: unknown): BundleBackedPrivateNoteV1 {
  assertRecord("BundleBackedPrivateNoteV1", value);
  assertKnownKeys("BundleBackedPrivateNoteV1", value, [
    "version",
    "assetId",
    "valueSats",
    "ownerCommitment",
    "backingBundleCommitment32",
    "noteNonce",
  ]);
  if (value.version !== BUNDLE_BACKED_PRIVATE_NOTE_V1_VERSION) {
    throw new Error("BundleBackedPrivateNoteV1.version must be 1");
  }

  return Object.freeze({
    version: BUNDLE_BACKED_PRIVATE_NOTE_V1_VERSION,
    assetId: assertNonzeroBytes32("BundleBackedPrivateNoteV1.assetId", value.assetId),
    valueSats: assertPositiveBchValue("BundleBackedPrivateNoteV1.valueSats", value.valueSats),
    ownerCommitment: assertNonzeroBytes32(
      "BundleBackedPrivateNoteV1.ownerCommitment",
      value.ownerCommitment,
    ),
    backingBundleCommitment32: assertNonzeroBytes32(
      "BundleBackedPrivateNoteV1.backingBundleCommitment32",
      value.backingBundleCommitment32,
    ),
    noteNonce: assertNonzeroBytes32("BundleBackedPrivateNoteV1.noteNonce", value.noteNonce),
  });
}

/** Fixed-width canonical v1 note encoding; it deliberately does not compute a note commitment. */
export function serializeBundleBackedPrivateNoteV1(value: unknown): Uint8Array {
  const note = normalizeBundleBackedPrivateNoteV1(value);
  const output = new Uint8Array(BUNDLE_BACKED_PRIVATE_NOTE_V1_BYTE_LENGTH);
  output.set(MAGIC, 0);
  output[VERSION_OFFSET] = note.version;
  output.set(note.assetId, ASSET_ID_OFFSET);
  writeU64LE(output, VALUE_SATS_OFFSET, note.valueSats);
  output.set(note.ownerCommitment, OWNER_COMMITMENT_OFFSET);
  output.set(note.backingBundleCommitment32, BACKING_BUNDLE_COMMITMENT_OFFSET);
  output.set(note.noteNonce, NOTE_NONCE_OFFSET);
  return output;
}

/** Parses only the exact fixed-width canonical v1 note encoding. */
export function parseBundleBackedPrivateNoteV1(value: unknown): BundleBackedPrivateNoteV1 {
  if (!(value instanceof Uint8Array)) {
    throw new Error("BundleBackedPrivateNoteV1 bytes must be a Uint8Array");
  }
  if (value.length !== BUNDLE_BACKED_PRIVATE_NOTE_V1_BYTE_LENGTH) {
    throw new Error(
      `BundleBackedPrivateNoteV1 bytes must be exactly ${String(BUNDLE_BACKED_PRIVATE_NOTE_V1_BYTE_LENGTH)} bytes`,
    );
  }
  if (!MAGIC.every((byte, index) => value[index] === byte)) {
    throw new Error("BundleBackedPrivateNoteV1 bytes have invalid magic");
  }
  if (value[VERSION_OFFSET] !== BUNDLE_BACKED_PRIVATE_NOTE_V1_VERSION) {
    throw new Error("BundleBackedPrivateNoteV1 bytes have unsupported version");
  }

  return normalizeBundleBackedPrivateNoteV1({
    version: BUNDLE_BACKED_PRIVATE_NOTE_V1_VERSION,
    assetId: value.slice(ASSET_ID_OFFSET, VALUE_SATS_OFFSET),
    valueSats: readU64LE(value, VALUE_SATS_OFFSET),
    ownerCommitment: value.slice(OWNER_COMMITMENT_OFFSET, BACKING_BUNDLE_COMMITMENT_OFFSET),
    backingBundleCommitment32: value.slice(BACKING_BUNDLE_COMMITMENT_OFFSET, NOTE_NONCE_OFFSET),
    noteNonce: value.slice(NOTE_NONCE_OFFSET, BUNDLE_BACKED_PRIVATE_NOTE_V1_BYTE_LENGTH),
  });
}

/**
 * Commits to only the canonical 145-byte v1 note encoding. It does not prove
 * backing correctness, private relation validity, authority, recovery, or
 * proof acceptance.
 */
export function bundleBackedNoteCommitmentV1(
  note: BundleBackedPrivateNoteV1,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    BUNDLE_BACKED_PRIVATE_NOTE_V1_COMMITMENT_DOMAIN,
    serializeBundleBackedPrivateNoteV1(note),
  );
}
