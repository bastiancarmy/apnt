// Maturity: preview — its only published importer is
// apnt_import_created_note_statement_v1.ts, itself preview. No published
// artifact references its APNTICV1/APNTIBS1 wire magic. See AGENTS.md, "The
// maturity ladder".
import { asBytes32, copyBytes, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { APNT_V1_BCH_MAX_MONEY_SATS } from "./apnt_bundle_backed_private_note_v1.js";
import { serializeAPNTTransitionOutpointV1, type APNTTransitionOutpointV1 } from "./apnt_transaction_projection_v1.js";

export const APNT_IMPORT_CREATION_SCOPE_V1_VERSION = 1;
export const APNT_IMPORT_CREATION_SCOPE_V1_MAGIC = "APNTICV1";
export const APNT_IMPORT_CREATION_SCOPE_V1_DOMAIN =
  "bch-cloak-apnt-v0:import-creation-scope-v1";
export const APNT_IMPORT_CREATION_SCOPE_V1_COMMITMENT_DOMAIN =
  "bch-cloak-apnt-v0:import-creation-scope-commitment-v1";
export const APNT_IMPORT_CREATED_BACKING_SKELETON_SET_V1_MAGIC = "APNTIBS1";
export const APNT_IMPORT_CREATED_BACKING_SKELETON_SET_V1_COMMITMENT_DOMAIN =
  "bch-cloak-apnt-v0:import-created-backing-skeleton-set-commitment-v1";
export const APNT_IMPORT_CREATED_NOTE_RELATION_V1_IDENTITY =
  "apnt-import-created-note-relation-v1";
export const APNT_IMPORT_CREATION_SCOPE_V1_MAX_BACKING_CELLS = 4_096;

const MAGIC = Uint8Array.of(0x41, 0x50, 0x4e, 0x54, 0x49, 0x43, 0x56, 0x31); // APNTICV1
const CELL_SET_MAGIC = Uint8Array.of(0x41, 0x50, 0x4e, 0x54, 0x49, 0x42, 0x53, 0x31); // APNTIBS1
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });

export type APNTImportCreationScopeNetworkV1 = "chipnet" | "mainnet" | "regtest";

/**
 * Cycle-free public skeleton for one created private-backing output. It
 * deliberately excludes the seal-cell commitment, which depends on scope.
 */
export type APNTImportCreatedBackingSkeletonV1 = Readonly<{
  outputIndex: number;
  valueSats: bigint;
  lockingProfileId32: Bytes32;
}>;

/**
 * Dedicated transparent-import creation scope. It does not extend the closed
 * APNTCreationScopeV1 mode set. The skeleton-set commitment binds every
 * created backing output without a cell-commitment cycle or note assignment.
 */
export type APNTImportCreationScopeV1 = Readonly<{
  version: typeof APNT_IMPORT_CREATION_SCOPE_V1_VERSION;
  domain: typeof APNT_IMPORT_CREATION_SCOPE_V1_DOMAIN;
  network: APNTImportCreationScopeNetworkV1;
  relationIdentity: typeof APNT_IMPORT_CREATED_NOTE_RELATION_V1_IDENTITY;
  privacyProfileId32: Bytes32;
  importFundingOutpoint: APNTTransitionOutpointV1;
  createdBackingSkeletonSetCommitment32: Bytes32;
  scopeNonce32: Bytes32;
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

function assertU32(name: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new Error(`${name} must be a u32 number`);
  }
  return value;
}

function assertPositiveBchValue(name: string, value: unknown): bigint {
  if (typeof value !== "bigint" || value <= 0n || value > APNT_V1_BCH_MAX_MONEY_SATS) {
    throw new Error(`${name} must be a positive BCH bigint within range`);
  }
  return value;
}

function assertNonzeroBytes32(name: string, value: unknown): Bytes32 {
  if (!(value instanceof Uint8Array)) throw new Error(`${name} must be a Uint8Array`);
  const bytes = asBytes32(name, value);
  if (bytes.every((byte) => byte === 0)) throw new Error(`${name} must not be all zero`);
  return bytes;
}

function normalizeNetwork(name: string, value: unknown): APNTImportCreationScopeNetworkV1 {
  if (value !== "chipnet" && value !== "mainnet" && value !== "regtest") {
    throw new Error(`${name} must be chipnet, mainnet, or regtest`);
  }
  return value;
}

function normalizeOutpoint(name: string, value: unknown): APNTTransitionOutpointV1 {
  assertRecord(name, value);
  assertKnownKeys(name, value, ["txid32", "vout"]);
  return Object.freeze({
    txid32: assertNonzeroBytes32(`${name}.txid32`, value.txid32),
    vout: assertU32(`${name}.vout`, value.vout),
  });
}

function compareBytes(left: Uint8Array, right: Uint8Array): number {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const difference = (left[index] as number) - (right[index] as number);
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

function bytesKey(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function writeU16LE(value: number): Uint8Array {
  return Uint8Array.of(value & 0xff, (value >>> 8) & 0xff);
}

function writeU32LE(value: number): Uint8Array {
  return Uint8Array.of(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
}

function writeU64LE(value: bigint): Uint8Array {
  const output = new Uint8Array(8);
  for (let index = 0; index < 8; index += 1) {
    output[index] = Number((value >> BigInt(index * 8)) & 0xffn);
  }
  return output;
}

function networkByte(value: APNTImportCreationScopeNetworkV1): number {
  return value === "chipnet" ? 0 : value === "mainnet" ? 1 : 2;
}

function networkFromByte(value: number): APNTImportCreationScopeNetworkV1 {
  if (value === 0) return "chipnet";
  if (value === 1) return "mainnet";
  if (value === 2) return "regtest";
  throw new Error("APNTImportCreationScopeV1 bytes have unsupported network");
}

export function normalizeAPNTImportCreatedBackingSkeletonsV1(
  value: unknown,
): readonly APNTImportCreatedBackingSkeletonV1[] {
  const name = "APNTImportCreatedBackingSkeletonV1[]";
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${name} must be a non-empty array`);
  }
  if (value.length > APNT_IMPORT_CREATION_SCOPE_V1_MAX_BACKING_CELLS) {
    throw new Error(`${name} exceeds the v1 collection cap`);
  }
  const cells = value.map((candidate, index) => {
    const itemName = `${name}[${String(index)}]`;
    assertRecord(itemName, candidate);
    assertKnownKeys(itemName, candidate, ["outputIndex", "valueSats", "lockingProfileId32"]);
    return Object.freeze({
      outputIndex: assertU32(`${itemName}.outputIndex`, candidate.outputIndex),
      valueSats: assertPositiveBchValue(`${itemName}.valueSats`, candidate.valueSats),
      lockingProfileId32: assertNonzeroBytes32(
        `${itemName}.lockingProfileId32`,
        candidate.lockingProfileId32,
      ),
    });
  }).sort((left, right) => left.outputIndex - right.outputIndex);
  if (new Set(cells.map((cell) => String(cell.outputIndex))).size !== cells.length) {
    throw new Error(`${name} must not contain duplicate output indexes`);
  }
  return Object.freeze(cells);
}

export function serializeAPNTImportCreatedBackingSkeletonsV1(value: unknown): Uint8Array {
  const cells = normalizeAPNTImportCreatedBackingSkeletonsV1(value);
  return concatBytes([
    CELL_SET_MAGIC,
    Uint8Array.of(APNT_IMPORT_CREATION_SCOPE_V1_VERSION),
    writeU32LE(cells.length),
    ...cells.map((cell) => concatBytes([
      writeU32LE(cell.outputIndex),
      writeU64LE(cell.valueSats),
      cell.lockingProfileId32,
    ])),
  ]);
}

export function deriveAPNTImportCreatedBackingSkeletonSetCommitmentV1(
  value: unknown,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_IMPORT_CREATED_BACKING_SKELETON_SET_V1_COMMITMENT_DOMAIN,
    serializeAPNTImportCreatedBackingSkeletonsV1(value),
  );
}

export function normalizeAPNTImportCreationScopeV1(value: unknown): APNTImportCreationScopeV1 {
  assertRecord("APNTImportCreationScopeV1", value);
  assertKnownKeys("APNTImportCreationScopeV1", value, [
    "version",
    "domain",
    "network",
    "relationIdentity",
    "privacyProfileId32",
    "importFundingOutpoint",
    "createdBackingSkeletonSetCommitment32",
    "scopeNonce32",
  ]);
  if (value.version !== APNT_IMPORT_CREATION_SCOPE_V1_VERSION) {
    throw new Error("APNTImportCreationScopeV1.version must be 1");
  }
  if (value.domain !== APNT_IMPORT_CREATION_SCOPE_V1_DOMAIN) {
    throw new Error(`APNTImportCreationScopeV1.domain must be ${APNT_IMPORT_CREATION_SCOPE_V1_DOMAIN}`);
  }
  if (value.relationIdentity !== APNT_IMPORT_CREATED_NOTE_RELATION_V1_IDENTITY) {
    throw new Error("APNTImportCreationScopeV1.relationIdentity is unsupported");
  }
  return Object.freeze({
    version: APNT_IMPORT_CREATION_SCOPE_V1_VERSION,
    domain: APNT_IMPORT_CREATION_SCOPE_V1_DOMAIN,
    network: normalizeNetwork("APNTImportCreationScopeV1.network", value.network),
    relationIdentity: APNT_IMPORT_CREATED_NOTE_RELATION_V1_IDENTITY,
    privacyProfileId32: assertNonzeroBytes32(
      "APNTImportCreationScopeV1.privacyProfileId32",
      value.privacyProfileId32,
    ),
    importFundingOutpoint: normalizeOutpoint(
      "APNTImportCreationScopeV1.importFundingOutpoint",
      value.importFundingOutpoint,
    ),
    createdBackingSkeletonSetCommitment32: assertNonzeroBytes32(
      "APNTImportCreationScopeV1.createdBackingSkeletonSetCommitment32",
      value.createdBackingSkeletonSetCommitment32,
    ),
    scopeNonce32: assertNonzeroBytes32("APNTImportCreationScopeV1.scopeNonce32", value.scopeNonce32),
  });
}

function encodeNormalizedScope(scope: APNTImportCreationScopeV1): Uint8Array {
  const domain = TEXT_ENCODER.encode(scope.domain);
  const relationIdentity = TEXT_ENCODER.encode(scope.relationIdentity);
  return concatBytes([
    MAGIC,
    Uint8Array.of(scope.version),
    writeU16LE(domain.length),
    domain,
    Uint8Array.of(networkByte(scope.network)),
    writeU16LE(relationIdentity.length),
    relationIdentity,
    scope.privacyProfileId32,
    serializeAPNTTransitionOutpointV1(scope.importFundingOutpoint),
    scope.createdBackingSkeletonSetCommitment32,
    scope.scopeNonce32,
  ]);
}

export function serializeAPNTImportCreationScopeV1(value: unknown): Uint8Array {
  return encodeNormalizedScope(normalizeAPNTImportCreationScopeV1(value));
}

class ScopeReader {
  private offset = 0;

  public constructor(private readonly bytes: Uint8Array) {}

  public take(name: string, length: number): Uint8Array {
    if (length < 0 || this.offset > this.bytes.length || this.bytes.length - this.offset < length) {
      throw new Error(`APNTImportCreationScopeV1 bytes are truncated at ${name}`);
    }
    const result = this.bytes.slice(this.offset, this.offset + length);
    this.offset += length;
    return result;
  }

  public u8(name: string): number {
    return this.take(name, 1)[0] as number;
  }

  public u16(name: string): number {
    const value = this.take(name, 2);
    return (value[0] as number) | ((value[1] as number) << 8);
  }

  public u32(name: string): number {
    const value = this.take(name, 4);
    return (
      (value[0] as number) |
      ((value[1] as number) << 8) |
      ((value[2] as number) << 16) |
      ((value[3] as number) << 24)
    ) >>> 0;
  }

  public bytes32(name: string): Bytes32 {
    return asBytes32(name, this.take(name, 32));
  }

  public done(): boolean {
    return this.offset === this.bytes.length;
  }
}

function decodeText(reader: ScopeReader, name: string): string {
  try {
    return TEXT_DECODER.decode(reader.take(name, reader.u16(`${name}.length`)));
  } catch {
    throw new Error(`APNTImportCreationScopeV1 bytes have invalid ${name} encoding`);
  }
}

export function parseAPNTImportCreationScopeV1(value: unknown): APNTImportCreationScopeV1 {
  if (!(value instanceof Uint8Array)) {
    throw new Error("APNTImportCreationScopeV1 bytes must be a Uint8Array");
  }
  const source = copyBytes(value);
  const reader = new ScopeReader(source);
  if (!bytesEqual(reader.take("magic", MAGIC.length), MAGIC)) {
    throw new Error("APNTImportCreationScopeV1 bytes have invalid magic");
  }
  const version = reader.u8("version");
  const domain = decodeText(reader, "domain");
  const network = networkFromByte(reader.u8("network"));
  const relationIdentity = decodeText(reader, "relationIdentity");
  const privacyProfileId32 = reader.bytes32("privacyProfileId32");
  const wireTxid = reader.take("importFundingOutpoint.txid32", 32);
  const importFundingOutpoint = {
    txid32: asBytes32("APNTImportCreationScopeV1.importFundingOutpoint.txid32", wireTxid.reverse()),
    vout: reader.u32("importFundingOutpoint.vout"),
  };
  const normalized = normalizeAPNTImportCreationScopeV1({
    version,
    domain,
    network,
    relationIdentity,
    privacyProfileId32,
    importFundingOutpoint,
    createdBackingSkeletonSetCommitment32: reader.bytes32("createdBackingSkeletonSetCommitment32"),
    scopeNonce32: reader.bytes32("scopeNonce32"),
  });
  if (!reader.done()) throw new Error("APNTImportCreationScopeV1 bytes contain trailing data");
  if (!bytesEqual(source, encodeNormalizedScope(normalized))) {
    throw new Error("APNTImportCreationScopeV1 bytes are not canonical");
  }
  return normalized;
}

export function deriveAPNTImportCreationScopeCommitmentV1(value: unknown): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_IMPORT_CREATION_SCOPE_V1_COMMITMENT_DOMAIN,
    serializeAPNTImportCreationScopeV1(value),
  );
}
