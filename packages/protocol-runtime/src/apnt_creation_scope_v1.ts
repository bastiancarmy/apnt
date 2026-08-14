// Maturity: stable — the sole creation-scope module consumed by the frozen
// apnt_transition_statement_v1.ts (its only published importer). See
// AGENTS.md, "The maturity ladder".
import { asBytes32, copyBytes, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { APNT_V1_BCH_MAX_MONEY_SATS } from "./apnt_bundle_backed_private_note_v1.js";
import { serializeAPNTTransitionOutpointV0 } from "./apnt_transition_statement_v0.js";

export const APNT_CREATION_SCOPE_V1_VERSION = 1;
export const APNT_CREATION_SCOPE_V1_STATEMENT_VERSION = 1;
export const APNT_CREATION_SCOPE_V1_MAGIC = "APNTCSV1";
export const APNT_CREATION_SCOPE_V1_DOMAIN = "bch-cloak-apnt-v0:creation-scope-v1";
export const APNT_TRANSITION_BATCH_NONCE_V1_VERSION = 1;
export const APNT_TRANSITION_BATCH_NONCE_V1_MAGIC = "APNTBTV1";
export const APNT_TRANSITION_BATCH_NONCE_V1_DOMAIN =
  "bch-cloak-apnt-v0:transition-batch-nonce-v1";
export const APNT_CREATION_SCOPE_V1_MAX_INPUTS = 8_192;
export const APNT_CREATION_SCOPE_V1_MAX_CREATED_BACKING_SKELETONS = 4_096;

const MAX_U32 = 0xffff_ffff;
const MAGIC = Uint8Array.of(0x41, 0x50, 0x4e, 0x54, 0x43, 0x53, 0x56, 0x31); // APNTCSV1
const BATCH_NONCE_MAGIC = Uint8Array.of(0x41, 0x50, 0x4e, 0x54, 0x42, 0x54, 0x56, 0x31); // APNTBTV1

export type APNTCreationScopeNetworkV1 = "chipnet" | "mainnet" | "regtest";
export type APNTCreationScopeModeV1 = "private-transition" | "complete-bundle-exit";
export type APNTCreationScopeInputBackingRoleV1 = "private-backing" | "verifier-only";

export type APNTCreationScopeOutpointV1 = Readonly<{
  /** Conventional RPC/display byte order; canonical bytes reverse this to BCH wire order. */
  txid32: Bytes32;
  vout: number;
}>;

export type APNTCreationScopeInputV1 = Readonly<{
  outpoint: APNTCreationScopeOutpointV1;
  sequenceNumber: number;
  spentValueSats: bigint;
  spentLockingBytecode: Uint8Array;
  /** V1 creation-scope inputs encode only the absent-token tag. */
  spentToken: null;
  backingRole: APNTCreationScopeInputBackingRoleV1;
}>;

export type APNTCreatedBackingSkeletonV1 = Readonly<{
  outputIndex: number;
  valueSats: bigint;
  /** The allowlisted profile identifies the exact zero-slot locking template. */
  lockingProfileId32: Bytes32;
}>;

export type APNTTransitionBatchNonceInputV1 = Readonly<{
  version: typeof APNT_TRANSITION_BATCH_NONCE_V1_VERSION;
  network: APNTCreationScopeNetworkV1;
  mode: APNTCreationScopeModeV1;
  privacyProfileId32: Bytes32;
  proofRelationId32: Bytes32;
  sp1ProgramId32: Bytes32;
  verifierArtifactId32: Bytes32;
  inputOutpoints: readonly APNTCreationScopeOutpointV1[];
}>;

export type APNTCreationScopeV1 = Readonly<{
  version: typeof APNT_CREATION_SCOPE_V1_VERSION;
  network: APNTCreationScopeNetworkV1;
  statementVersion: typeof APNT_CREATION_SCOPE_V1_STATEMENT_VERSION;
  mode: APNTCreationScopeModeV1;
  privacyProfileId32: Bytes32;
  batchNonce32: Bytes32;
  proofRelationId32: Bytes32;
  sp1ProgramId32: Bytes32;
  verifierArtifactId32: Bytes32;
  designatedVerifierInputIndex: number;
  transactionVersion: number;
  locktime: number;
  /** Caller order is BCH transaction input order and is commitment-significant. */
  inputs: readonly APNTCreationScopeInputV1[];
  /** Canonical normalization sorts these public skeletons by output index. */
  createdBackingSkeletons: readonly APNTCreatedBackingSkeletonV1[];
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
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > MAX_U32) {
    throw new Error(`${name} must be a u32 number`);
  }
  return value;
}

function assertBchValue(name: string, value: unknown, positive: boolean): bigint {
  if (
    typeof value !== "bigint" ||
    value < (positive ? 1n : 0n) ||
    value > APNT_V1_BCH_MAX_MONEY_SATS
  ) {
    throw new Error(
      `${name} must be ${positive ? "a positive" : "a non-negative"} bigint no greater than APNT_V1_BCH_MAX_MONEY_SATS`,
    );
  }
  return value;
}

function assertBytes(name: string, value: unknown): Uint8Array {
  if (!(value instanceof Uint8Array)) throw new Error(`${name} must be a Uint8Array`);
  if (value.length > MAX_U32) throw new Error(`${name} exceeds u32 length framing`);
  return copyBytes(value);
}

function assertNonzeroBytes32(name: string, value: unknown): Bytes32 {
  if (!(value instanceof Uint8Array)) throw new Error(`${name} must be a Uint8Array`);
  const bytes = asBytes32(name, value);
  if (bytes.every((byte) => byte === 0)) throw new Error(`${name} must not be all zero`);
  return bytes;
}

function normalizeNetwork(name: string, value: unknown): APNTCreationScopeNetworkV1 {
  if (value !== "chipnet" && value !== "mainnet" && value !== "regtest") {
    throw new Error(`${name} must be chipnet, mainnet, or regtest`);
  }
  return value;
}

function normalizeMode(name: string, value: unknown): APNTCreationScopeModeV1 {
  if (value !== "private-transition" && value !== "complete-bundle-exit") {
    throw new Error(`${name} must be private-transition or complete-bundle-exit`);
  }
  return value;
}

function normalizeOutpoint(name: string, value: unknown): APNTCreationScopeOutpointV1 {
  assertRecord(name, value);
  assertKnownKeys(name, value, ["txid32", "vout"]);
  if (!(value.txid32 instanceof Uint8Array)) throw new Error(`${name}.txid32 must be a Uint8Array`);
  return Object.freeze({
    txid32: asBytes32(`${name}.txid32`, value.txid32),
    vout: assertU32(`${name}.vout`, value.vout),
  });
}

function normalizeInput(name: string, value: unknown): APNTCreationScopeInputV1 {
  assertRecord(name, value);
  assertKnownKeys(name, value, [
    "outpoint",
    "sequenceNumber",
    "spentValueSats",
    "spentLockingBytecode",
    "spentToken",
    "backingRole",
  ]);
  if (value.spentToken !== null) throw new Error(`${name}.spentToken must be null`);
  if (value.backingRole !== "private-backing" && value.backingRole !== "verifier-only") {
    throw new Error(`${name}.backingRole is unsupported`);
  }
  return Object.freeze({
    outpoint: normalizeOutpoint(`${name}.outpoint`, value.outpoint),
    sequenceNumber: assertU32(`${name}.sequenceNumber`, value.sequenceNumber),
    spentValueSats: assertBchValue(`${name}.spentValueSats`, value.spentValueSats, false),
    spentLockingBytecode: assertBytes(`${name}.spentLockingBytecode`, value.spentLockingBytecode),
    spentToken: null,
    backingRole: value.backingRole,
  });
}

function normalizeSkeleton(name: string, value: unknown): APNTCreatedBackingSkeletonV1 {
  assertRecord(name, value);
  assertKnownKeys(name, value, ["outputIndex", "valueSats", "lockingProfileId32"]);
  return Object.freeze({
    outputIndex: assertU32(`${name}.outputIndex`, value.outputIndex),
    valueSats: assertBchValue(`${name}.valueSats`, value.valueSats, true),
    lockingProfileId32: assertNonzeroBytes32(`${name}.lockingProfileId32`, value.lockingProfileId32),
  });
}

function networkByte(value: APNTCreationScopeNetworkV1): number {
  return value === "chipnet" ? 0 : value === "mainnet" ? 1 : 2;
}

function modeByte(value: APNTCreationScopeModeV1): number {
  return value === "private-transition" ? 0 : 1;
}

function compareBytes(left: Uint8Array, right: Uint8Array): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] as number) - (right[index] as number);
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function writeU32LE(value: number): Uint8Array {
  return Uint8Array.of(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function writeU64LE(value: bigint): Uint8Array {
  const output = new Uint8Array(8);
  for (let index = 0; index < 8; index += 1) {
    output[index] = Number((value >> BigInt(index * 8)) & 0xffn);
  }
  return output;
}

/** Serializes a display-order outpoint using BCH wire txid order and little-endian vout. */
export function serializeAPNTCreationScopeOutpointV1(value: unknown): Uint8Array {
  const outpoint = normalizeOutpoint("APNTCreationScopeOutpointV1", value);
  return serializeAPNTTransitionOutpointV0(outpoint);
}

function outpointKey(value: APNTCreationScopeOutpointV1): string {
  return Array.from(serializeAPNTCreationScopeOutpointV1(value), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function assertUniqueOutpoints(name: string, outpoints: readonly APNTCreationScopeOutpointV1[]): void {
  const keys = outpoints.map(outpointKey);
  if (new Set(keys).size !== keys.length) throw new Error(`${name} must not contain duplicate outpoints`);
}

export function normalizeAPNTTransitionBatchNonceInputV1(
  value: unknown,
): APNTTransitionBatchNonceInputV1 {
  assertRecord("APNTTransitionBatchNonceInputV1", value);
  assertKnownKeys("APNTTransitionBatchNonceInputV1", value, [
    "version",
    "network",
    "mode",
    "privacyProfileId32",
    "proofRelationId32",
    "sp1ProgramId32",
    "verifierArtifactId32",
    "inputOutpoints",
  ]);
  if (value.version !== APNT_TRANSITION_BATCH_NONCE_V1_VERSION) {
    throw new Error("APNTTransitionBatchNonceInputV1.version must be 1");
  }
  if (!Array.isArray(value.inputOutpoints) || value.inputOutpoints.length === 0) {
    throw new Error("APNTTransitionBatchNonceInputV1.inputOutpoints must be a non-empty array");
  }
  if (value.inputOutpoints.length > APNT_CREATION_SCOPE_V1_MAX_INPUTS) {
    throw new Error("APNTTransitionBatchNonceInputV1.inputOutpoints exceeds the v1 input cap");
  }
  const inputOutpoints = value.inputOutpoints
    .map((outpoint, index) => normalizeOutpoint(
      `APNTTransitionBatchNonceInputV1.inputOutpoints[${String(index)}]`,
      outpoint,
    ))
    .sort((left, right) => compareBytes(
      serializeAPNTCreationScopeOutpointV1(left),
      serializeAPNTCreationScopeOutpointV1(right),
    ));
  assertUniqueOutpoints("APNTTransitionBatchNonceInputV1.inputOutpoints", inputOutpoints);
  return Object.freeze({
    version: APNT_TRANSITION_BATCH_NONCE_V1_VERSION,
    network: normalizeNetwork("APNTTransitionBatchNonceInputV1.network", value.network),
    mode: normalizeMode("APNTTransitionBatchNonceInputV1.mode", value.mode),
    privacyProfileId32: assertNonzeroBytes32(
      "APNTTransitionBatchNonceInputV1.privacyProfileId32",
      value.privacyProfileId32,
    ),
    proofRelationId32: assertNonzeroBytes32(
      "APNTTransitionBatchNonceInputV1.proofRelationId32",
      value.proofRelationId32,
    ),
    sp1ProgramId32: assertNonzeroBytes32(
      "APNTTransitionBatchNonceInputV1.sp1ProgramId32",
      value.sp1ProgramId32,
    ),
    verifierArtifactId32: assertNonzeroBytes32(
      "APNTTransitionBatchNonceInputV1.verifierArtifactId32",
      value.verifierArtifactId32,
    ),
    inputOutpoints: Object.freeze(inputOutpoints),
  });
}

/** Canonical APNTBTV1 preimage. Outpoints are sorted and duplicate outpoints reject. */
export function serializeAPNTTransitionBatchNonceInputV1(value: unknown): Uint8Array {
  const input = normalizeAPNTTransitionBatchNonceInputV1(value);
  return concatBytes([
    BATCH_NONCE_MAGIC,
    Uint8Array.of(input.version, networkByte(input.network), modeByte(input.mode)),
    input.privacyProfileId32,
    input.proofRelationId32,
    input.sp1ProgramId32,
    input.verifierArtifactId32,
    writeU32LE(input.inputOutpoints.length),
    ...input.inputOutpoints.map(serializeAPNTCreationScopeOutpointV1),
  ]);
}

export function deriveAPNTTransitionBatchNonceV1(value: unknown): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_TRANSITION_BATCH_NONCE_V1_DOMAIN,
    serializeAPNTTransitionBatchNonceInputV1(value),
  );
}

export function normalizeAPNTCreationScopeV1(value: unknown): APNTCreationScopeV1 {
  assertRecord("APNTCreationScopeV1", value);
  assertKnownKeys("APNTCreationScopeV1", value, [
    "version",
    "network",
    "statementVersion",
    "mode",
    "privacyProfileId32",
    "batchNonce32",
    "proofRelationId32",
    "sp1ProgramId32",
    "verifierArtifactId32",
    "designatedVerifierInputIndex",
    "transactionVersion",
    "locktime",
    "inputs",
    "createdBackingSkeletons",
  ]);
  if (value.version !== APNT_CREATION_SCOPE_V1_VERSION) {
    throw new Error("APNTCreationScopeV1.version must be 1");
  }
  if (value.statementVersion !== APNT_CREATION_SCOPE_V1_STATEMENT_VERSION) {
    throw new Error("APNTCreationScopeV1.statementVersion must be 1");
  }
  if (!Array.isArray(value.inputs) || value.inputs.length === 0) {
    throw new Error("APNTCreationScopeV1.inputs must be a non-empty array");
  }
  if (value.inputs.length > APNT_CREATION_SCOPE_V1_MAX_INPUTS) {
    throw new Error("APNTCreationScopeV1.inputs exceeds the v1 input cap");
  }
  if (!Array.isArray(value.createdBackingSkeletons) || value.createdBackingSkeletons.length === 0) {
    throw new Error("APNTCreationScopeV1.createdBackingSkeletons must be a non-empty array");
  }
  if (value.createdBackingSkeletons.length > APNT_CREATION_SCOPE_V1_MAX_CREATED_BACKING_SKELETONS) {
    throw new Error("APNTCreationScopeV1.createdBackingSkeletons exceeds the v1 skeleton cap");
  }
  const inputs = value.inputs.map((input, index) =>
    normalizeInput(`APNTCreationScopeV1.inputs[${String(index)}]`, input)
  );
  assertUniqueOutpoints("APNTCreationScopeV1.inputs", inputs.map((input) => input.outpoint));
  const createdBackingSkeletons = value.createdBackingSkeletons
    .map((skeleton, index) => normalizeSkeleton(
      `APNTCreationScopeV1.createdBackingSkeletons[${String(index)}]`,
      skeleton,
    ))
    .sort((left, right) => left.outputIndex - right.outputIndex);
  if (new Set(createdBackingSkeletons.map((skeleton) => skeleton.outputIndex)).size !== createdBackingSkeletons.length) {
    throw new Error("APNTCreationScopeV1.createdBackingSkeletons must not contain duplicate output indexes");
  }
  const designatedVerifierInputIndex = assertU32(
    "APNTCreationScopeV1.designatedVerifierInputIndex",
    value.designatedVerifierInputIndex,
  );
  if (designatedVerifierInputIndex >= inputs.length) {
    throw new Error("APNTCreationScopeV1.designatedVerifierInputIndex is outside the ordered inputs");
  }
  return Object.freeze({
    version: APNT_CREATION_SCOPE_V1_VERSION,
    network: normalizeNetwork("APNTCreationScopeV1.network", value.network),
    statementVersion: APNT_CREATION_SCOPE_V1_STATEMENT_VERSION,
    mode: normalizeMode("APNTCreationScopeV1.mode", value.mode),
    privacyProfileId32: assertNonzeroBytes32(
      "APNTCreationScopeV1.privacyProfileId32",
      value.privacyProfileId32,
    ),
    batchNonce32: assertNonzeroBytes32("APNTCreationScopeV1.batchNonce32", value.batchNonce32),
    proofRelationId32: assertNonzeroBytes32(
      "APNTCreationScopeV1.proofRelationId32",
      value.proofRelationId32,
    ),
    sp1ProgramId32: assertNonzeroBytes32("APNTCreationScopeV1.sp1ProgramId32", value.sp1ProgramId32),
    verifierArtifactId32: assertNonzeroBytes32(
      "APNTCreationScopeV1.verifierArtifactId32",
      value.verifierArtifactId32,
    ),
    designatedVerifierInputIndex,
    transactionVersion: assertU32("APNTCreationScopeV1.transactionVersion", value.transactionVersion),
    locktime: assertU32("APNTCreationScopeV1.locktime", value.locktime),
    inputs: Object.freeze(inputs),
    createdBackingSkeletons: Object.freeze(createdBackingSkeletons),
  });
}

/** Canonical APNTCSV1 creation-scope preimage. Input order remains caller-significant. */
export function serializeAPNTCreationScopeV1(value: unknown): Uint8Array {
  const scope = normalizeAPNTCreationScopeV1(value);
  const inputs = scope.inputs.map((input) => concatBytes([
    serializeAPNTCreationScopeOutpointV1(input.outpoint),
    writeU32LE(input.sequenceNumber),
    writeU64LE(input.spentValueSats),
    writeU32LE(input.spentLockingBytecode.length),
    input.spentLockingBytecode,
    Uint8Array.of(0),
    Uint8Array.of(input.backingRole === "private-backing" ? 0 : 1),
  ]));
  const skeletons = scope.createdBackingSkeletons.map((skeleton) => concatBytes([
    writeU32LE(skeleton.outputIndex),
    writeU64LE(skeleton.valueSats),
    skeleton.lockingProfileId32,
  ]));
  return concatBytes([
    MAGIC,
    Uint8Array.of(
      scope.version,
      networkByte(scope.network),
      scope.statementVersion,
      modeByte(scope.mode),
    ),
    scope.privacyProfileId32,
    scope.batchNonce32,
    scope.proofRelationId32,
    scope.sp1ProgramId32,
    scope.verifierArtifactId32,
    writeU32LE(scope.designatedVerifierInputIndex),
    writeU32LE(scope.transactionVersion),
    writeU32LE(scope.locktime),
    writeU32LE(inputs.length),
    ...inputs,
    writeU32LE(skeletons.length),
    ...skeletons,
  ]);
}

function batchNonceInputFromScope(scope: APNTCreationScopeV1): APNTTransitionBatchNonceInputV1 {
  return {
    version: APNT_TRANSITION_BATCH_NONCE_V1_VERSION,
    network: scope.network,
    mode: scope.mode,
    privacyProfileId32: scope.privacyProfileId32,
    proofRelationId32: scope.proofRelationId32,
    sp1ProgramId32: scope.sp1ProgramId32,
    verifierArtifactId32: scope.verifierArtifactId32,
    inputOutpoints: scope.inputs.map((input) => input.outpoint),
  };
}

/**
 * Derives the transaction-local scope and rejects a caller-selected batch nonce.
 * Final transaction material remains a downstream source-transaction check.
 */
export async function deriveAPNTCreationScopeV1(value: unknown): Promise<Bytes32> {
  const scope = normalizeAPNTCreationScopeV1(value);
  const derivedBatchNonce32 = await deriveAPNTTransitionBatchNonceV1(batchNonceInputFromScope(scope));
  if (!bytesEqual(scope.batchNonce32, derivedBatchNonce32)) {
    throw new Error("APNTCreationScopeV1.batchNonce32 must equal the deterministic v1 batch nonce");
  }
  return sha256DomainSeparated(APNT_CREATION_SCOPE_V1_DOMAIN, serializeAPNTCreationScopeV1(scope));
}
