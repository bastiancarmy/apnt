// Maturity: preview — measured zero published importers and zero published
// artifacts referencing its APNTISV0/APNTIPV0 wire magic. The import-created-
// note relation v0 identity itself is frozen (AGENTS.md, "What is frozen"),
// but nothing in this public tree currently exercises this statement
// encoding. See AGENTS.md, "The maturity ladder".
import { asBytes32, copyBytes, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { APNT_V1_BCH_MAX_MONEY_SATS } from "./apnt_bundle_backed_private_note_v1.js";
import {
  APNT_IMPORT_CREATED_NOTE_RELATION_V0_IDENTITY,
  deriveAPNTImportCreatedBackingSkeletonSetCommitmentV0,
  deriveAPNTImportCreationScopeCommitmentV0,
  normalizeAPNTImportCreatedBackingSkeletonsV0,
  normalizeAPNTImportCreationScopeV0,
  parseAPNTImportCreationScopeV0,
  serializeAPNTImportCreationScopeV0,
  type APNTImportCreatedBackingSkeletonV0,
  type APNTImportCreationScopeNetworkV0,
  type APNTImportCreationScopeV0,
} from "./apnt_import_creation_scope_v0.js";
import { serializeAPNTTransitionOutpointV1, type APNTTransitionOutpointV1 } from "./apnt_transaction_projection_v1.js";

export const APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_VERSION = 0;
export const APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_MAGIC = "APNTISV0";
export const APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_DOMAIN =
  "bch-cloak-apnt-v0:import-created-note-statement-v0";
export const APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_COMMITMENT_DOMAIN =
  "bch-cloak-apnt-v0:import-created-note-statement-commitment-v0";
export const APNT_IMPORT_TRANSACTION_PROJECTION_V0_VERSION = 0;
export const APNT_IMPORT_TRANSACTION_PROJECTION_V0_MAGIC = "APNTIPV0";
export const APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_MAX_LOGICAL_NOTES = 1_024;
export const APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_MAX_BACKING_CELLS = 4_096;
export const APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_MAX_SCOPES = 1_024;
export const APNT_IMPORT_TRANSACTION_PROJECTION_V0_MAX_INPUTS = 8_192;
export const APNT_IMPORT_TRANSACTION_PROJECTION_V0_MAX_OUTPUTS = 8_192;

const MAGIC = Uint8Array.of(0x41, 0x50, 0x4e, 0x54, 0x49, 0x53, 0x56, 0x30); // APNTISV0
const PROJECTION_MAGIC = Uint8Array.of(0x41, 0x50, 0x4e, 0x54, 0x49, 0x50, 0x56, 0x30); // APNTIPV0
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });

export const APNT_IMPORT_TRANSACTION_INPUT_ROLE_V0 = Object.freeze({
  IMPORT_FUNDING: "import-funding",
  VERIFIER_COLLATERAL: "verifier-collateral",
} as const);
export type APNTImportTransactionInputRoleV0 =
  (typeof APNT_IMPORT_TRANSACTION_INPUT_ROLE_V0)[keyof typeof APNT_IMPORT_TRANSACTION_INPUT_ROLE_V0];

export const APNT_IMPORT_TRANSACTION_OUTPUT_ROLE_V0 = Object.freeze({
  PRIVATE_BACKING: "private-backing",
  RECOVERY_PACKET_CARRIER: "recovery-packet-carrier",
  VERIFIER_COLLATERAL: "verifier-collateral",
} as const);
export type APNTImportTransactionOutputRoleV0 =
  (typeof APNT_IMPORT_TRANSACTION_OUTPUT_ROLE_V0)[keyof typeof APNT_IMPORT_TRANSACTION_OUTPUT_ROLE_V0];

export type APNTImportTransactionProjectionInputV0 = Readonly<{
  outpoint: APNTTransitionOutpointV1;
  sequenceNumber: number;
  spentValueSats: bigint;
  spentLockingBytecode: Uint8Array;
  spentToken: null;
  role: APNTImportTransactionInputRoleV0;
}>;

export type APNTImportTransactionProjectionOutputV0 = Readonly<{
  valueSats: bigint;
  lockingBytecodeTemplate: Uint8Array;
  statementCommitmentOffset: number | null;
  token: null;
  role: APNTImportTransactionOutputRoleV0;
  /** Present only for private-backing outputs. */
  lockingProfileId32: Bytes32 | null;
}>;

/** Transaction-significant public projection. It contains no owner or recipient field. */
export type APNTImportTransactionProjectionV0 = Readonly<{
  version: typeof APNT_IMPORT_TRANSACTION_PROJECTION_V0_VERSION;
  transactionVersion: number;
  locktime: number;
  inputs: readonly APNTImportTransactionProjectionInputV0[];
  outputs: readonly APNTImportTransactionProjectionOutputV0[];
}>;

export type APNTImportFundingIdentityV0 = Readonly<{
  outpoint: APNTTransitionOutpointV1;
  valueSats: bigint;
  importFundingCellCommitment32: Bytes32;
  eligibilityStatementBind32: Bytes32;
  outputFingerprint32: Bytes32;
}>;

export type APNTImportSealOpenIdentityV0 = Readonly<{
  sealCommitment32: Bytes32;
}>;

export type APNTImportSealCloseIdentityV0 = Readonly<{
  consumedOutpoint: APNTTransitionOutpointV1;
  inputIndex: number;
  previousSealCommitment32: Bytes32;
}>;

export type APNTImportCreatedLogicalNoteV0 = Readonly<{
  createdNoteCommitment32: Bytes32;
  creationScope32: Bytes32;
  recoveryPacketIndex: number;
  recoveryPacketHash32: Bytes32;
}>;

export type APNTImportCreatedBackingCellV0 = Readonly<{
  outputIndex: number;
  sealCellCommitment32: Bytes32;
  lockingProfileId32: Bytes32;
}>;

export type APNTImportCreationScopeReferenceV0 = Readonly<{
  creationScope32: Bytes32;
  scope: APNTImportCreationScopeV0;
}>;

/**
 * Checked public terms are projection-derived identities in this slice. The
 * transparent-import conservation equation remains deliberately unevaluated.
 */
export type APNTImportPublicAccountingTermsV0 = Readonly<{
  importFundingValueSats: bigint;
  nonBackingInputValueSats: bigint;
  createdBackingOutputValueSats: bigint;
  nonBackingOutputValueSats: bigint;
  totalInputValueSats: bigint;
  totalOutputValueSats: bigint;
}>;

/**
 * Closed public import-created-note statement. It exposes public transaction
 * identities and counts, but no note values, bundle members, assignments,
 * owners, recipients, or reusable markers.
 */
export type APNTImportCreatedNoteStatementV0 = Readonly<{
  version: typeof APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_VERSION;
  domain: typeof APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_DOMAIN;
  network: APNTImportCreationScopeNetworkV0;
  relationIdentity: typeof APNT_IMPORT_CREATED_NOTE_RELATION_V0_IDENTITY;
  privacyProfileId32: Bytes32;
  importFunding: APNTImportFundingIdentityV0;
  sealOpen: APNTImportSealOpenIdentityV0;
  sealClose: APNTImportSealCloseIdentityV0;
  creationTransactionId32: Bytes32;
  transactionProjection: APNTImportTransactionProjectionV0;
  createdLogicalNotes: readonly APNTImportCreatedLogicalNoteV0[];
  createdBackingCells: readonly APNTImportCreatedBackingCellV0[];
  importCreationScopes: readonly APNTImportCreationScopeReferenceV0[];
  recoveryPacketTableCommitment32: Bytes32;
  authorizedImportFeeSats: bigint;
  publicAccounting: APNTImportPublicAccountingTermsV0;
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

function assertBchValue(name: string, value: unknown, positive = false): bigint {
  if (
    typeof value !== "bigint" ||
    value < (positive ? 1n : 0n) ||
    value > APNT_V1_BCH_MAX_MONEY_SATS
  ) {
    throw new Error(`${name} must be a ${positive ? "positive" : "non-negative"} BCH bigint within range`);
  }
  return value;
}

function assertBytes(name: string, value: unknown): Uint8Array {
  if (!(value instanceof Uint8Array)) throw new Error(`${name} must be a Uint8Array`);
  return copyBytes(value);
}

function assertNonzeroBytes32(name: string, value: unknown): Bytes32 {
  if (!(value instanceof Uint8Array)) throw new Error(`${name} must be a Uint8Array`);
  const bytes = asBytes32(name, value);
  if (bytes.every((byte) => byte === 0)) throw new Error(`${name} must not be all zero`);
  return bytes;
}

function normalizeNetwork(name: string, value: unknown): APNTImportCreationScopeNetworkV0 {
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

function normalizeInputRole(name: string, value: unknown): APNTImportTransactionInputRoleV0 {
  if (
    value !== APNT_IMPORT_TRANSACTION_INPUT_ROLE_V0.IMPORT_FUNDING &&
    value !== APNT_IMPORT_TRANSACTION_INPUT_ROLE_V0.VERIFIER_COLLATERAL
  ) {
    throw new Error(`${name} is unsupported`);
  }
  return value;
}

function normalizeOutputRole(name: string, value: unknown): APNTImportTransactionOutputRoleV0 {
  if (
    value !== APNT_IMPORT_TRANSACTION_OUTPUT_ROLE_V0.PRIVATE_BACKING &&
    value !== APNT_IMPORT_TRANSACTION_OUTPUT_ROLE_V0.RECOVERY_PACKET_CARRIER &&
    value !== APNT_IMPORT_TRANSACTION_OUTPUT_ROLE_V0.VERIFIER_COLLATERAL
  ) {
    throw new Error(`${name} is unsupported`);
  }
  return value;
}

function normalizeStatementOffset(name: string, template: Uint8Array, value: unknown): number | null {
  if (value === null) return null;
  const offset = assertU32(name, value);
  if (offset > template.length || template.length - offset < 32) {
    throw new Error(`${name} must identify a complete 32-byte statement slot`);
  }
  return offset;
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

function outpointsEqual(left: APNTTransitionOutpointV1, right: APNTTransitionOutpointV1): boolean {
  return left.vout === right.vout && bytesEqual(left.txid32, right.txid32);
}

function outpointKey(value: APNTTransitionOutpointV1): string {
  return bytesKey(serializeAPNTTransitionOutpointV1(value));
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

function encodeBytes(value: Uint8Array): Uint8Array {
  return concatBytes([writeU32LE(value.length), value]);
}

function networkByte(value: APNTImportCreationScopeNetworkV0): number {
  return value === "chipnet" ? 0 : value === "mainnet" ? 1 : 2;
}

function networkFromByte(value: number): APNTImportCreationScopeNetworkV0 {
  if (value === 0) return "chipnet";
  if (value === 1) return "mainnet";
  if (value === 2) return "regtest";
  throw new Error("APNTImportCreatedNoteStatementV0 bytes have unsupported network");
}

function inputRoleByte(value: APNTImportTransactionInputRoleV0): number {
  return value === APNT_IMPORT_TRANSACTION_INPUT_ROLE_V0.IMPORT_FUNDING ? 0 : 1;
}

function inputRoleFromByte(value: number): APNTImportTransactionInputRoleV0 {
  if (value === 0) return APNT_IMPORT_TRANSACTION_INPUT_ROLE_V0.IMPORT_FUNDING;
  if (value === 1) return APNT_IMPORT_TRANSACTION_INPUT_ROLE_V0.VERIFIER_COLLATERAL;
  throw new Error("APNTImportTransactionProjectionV0 bytes have unsupported input role");
}

function outputRoleByte(value: APNTImportTransactionOutputRoleV0): number {
  if (value === APNT_IMPORT_TRANSACTION_OUTPUT_ROLE_V0.PRIVATE_BACKING) return 0;
  if (value === APNT_IMPORT_TRANSACTION_OUTPUT_ROLE_V0.RECOVERY_PACKET_CARRIER) return 1;
  return 2;
}

function outputRoleFromByte(value: number): APNTImportTransactionOutputRoleV0 {
  if (value === 0) return APNT_IMPORT_TRANSACTION_OUTPUT_ROLE_V0.PRIVATE_BACKING;
  if (value === 1) return APNT_IMPORT_TRANSACTION_OUTPUT_ROLE_V0.RECOVERY_PACKET_CARRIER;
  if (value === 2) return APNT_IMPORT_TRANSACTION_OUTPUT_ROLE_V0.VERIFIER_COLLATERAL;
  throw new Error("APNTImportTransactionProjectionV0 bytes have unsupported output role");
}

function normalizeProjectionInput(name: string, value: unknown): APNTImportTransactionProjectionInputV0 {
  assertRecord(name, value);
  assertKnownKeys(name, value, [
    "outpoint",
    "sequenceNumber",
    "spentValueSats",
    "spentLockingBytecode",
    "spentToken",
    "role",
  ]);
  if (value.spentToken !== null) throw new Error(`${name}.spentToken must be null`);
  return Object.freeze({
    outpoint: normalizeOutpoint(`${name}.outpoint`, value.outpoint),
    sequenceNumber: assertU32(`${name}.sequenceNumber`, value.sequenceNumber),
    spentValueSats: assertBchValue(`${name}.spentValueSats`, value.spentValueSats),
    spentLockingBytecode: assertBytes(`${name}.spentLockingBytecode`, value.spentLockingBytecode),
    spentToken: null,
    role: normalizeInputRole(`${name}.role`, value.role),
  });
}

function normalizeProjectionOutput(name: string, value: unknown): APNTImportTransactionProjectionOutputV0 {
  assertRecord(name, value);
  assertKnownKeys(name, value, [
    "valueSats",
    "lockingBytecodeTemplate",
    "statementCommitmentOffset",
    "token",
    "role",
    "lockingProfileId32",
  ]);
  if (value.token !== null) throw new Error(`${name}.token must be null`);
  const role = normalizeOutputRole(`${name}.role`, value.role);
  const lockingBytecodeTemplate = assertBytes(`${name}.lockingBytecodeTemplate`, value.lockingBytecodeTemplate);
  const lockingProfileId32 = value.lockingProfileId32 === null
    ? null
    : assertNonzeroBytes32(`${name}.lockingProfileId32`, value.lockingProfileId32);
  if (role === APNT_IMPORT_TRANSACTION_OUTPUT_ROLE_V0.PRIVATE_BACKING && lockingProfileId32 === null) {
    throw new Error(`${name}.lockingProfileId32 is required for private-backing output`);
  }
  if (role !== APNT_IMPORT_TRANSACTION_OUTPUT_ROLE_V0.PRIVATE_BACKING && lockingProfileId32 !== null) {
    throw new Error(`${name}.lockingProfileId32 is forbidden for non-backing output`);
  }
  return Object.freeze({
    valueSats: assertBchValue(
      `${name}.valueSats`,
      value.valueSats,
      role === APNT_IMPORT_TRANSACTION_OUTPUT_ROLE_V0.PRIVATE_BACKING,
    ),
    lockingBytecodeTemplate,
    statementCommitmentOffset: normalizeStatementOffset(
      `${name}.statementCommitmentOffset`,
      lockingBytecodeTemplate,
      value.statementCommitmentOffset,
    ),
    token: null,
    role,
    lockingProfileId32,
  });
}

export function normalizeAPNTImportTransactionProjectionV0(
  value: unknown,
): APNTImportTransactionProjectionV0 {
  assertRecord("APNTImportTransactionProjectionV0", value);
  assertKnownKeys("APNTImportTransactionProjectionV0", value, [
    "version",
    "transactionVersion",
    "locktime",
    "inputs",
    "outputs",
  ]);
  if (value.version !== APNT_IMPORT_TRANSACTION_PROJECTION_V0_VERSION) {
    throw new Error("APNTImportTransactionProjectionV0.version must be 0");
  }
  if (!Array.isArray(value.inputs) || value.inputs.length === 0) {
    throw new Error("APNTImportTransactionProjectionV0.inputs must be a non-empty array");
  }
  if (value.inputs.length > APNT_IMPORT_TRANSACTION_PROJECTION_V0_MAX_INPUTS) {
    throw new Error("APNTImportTransactionProjectionV0.inputs exceeds the v0 collection cap");
  }
  if (!Array.isArray(value.outputs) || value.outputs.length === 0) {
    throw new Error("APNTImportTransactionProjectionV0.outputs must be a non-empty array");
  }
  if (value.outputs.length > APNT_IMPORT_TRANSACTION_PROJECTION_V0_MAX_OUTPUTS) {
    throw new Error("APNTImportTransactionProjectionV0.outputs exceeds the v0 collection cap");
  }
  const inputs = value.inputs.map((input, index) =>
    normalizeProjectionInput(`APNTImportTransactionProjectionV0.inputs[${String(index)}]`, input));
  if (new Set(inputs.map((input) => outpointKey(input.outpoint))).size !== inputs.length) {
    throw new Error("APNTImportTransactionProjectionV0.inputs must not contain duplicate outpoints");
  }
  if (inputs.filter((input) => input.role === APNT_IMPORT_TRANSACTION_INPUT_ROLE_V0.IMPORT_FUNDING).length !== 1) {
    throw new Error("APNTImportTransactionProjectionV0 requires exactly one import-funding input");
  }
  const outputs = value.outputs.map((output, index) =>
    normalizeProjectionOutput(`APNTImportTransactionProjectionV0.outputs[${String(index)}]`, output));
  if (!outputs.some((output) => output.role === APNT_IMPORT_TRANSACTION_OUTPUT_ROLE_V0.PRIVATE_BACKING)) {
    throw new Error("APNTImportTransactionProjectionV0 requires private-backing outputs");
  }
  if (!outputs.some((output) => output.role === APNT_IMPORT_TRANSACTION_OUTPUT_ROLE_V0.RECOVERY_PACKET_CARRIER)) {
    throw new Error("APNTImportTransactionProjectionV0 requires a recovery-packet-carrier output");
  }
  return Object.freeze({
    version: APNT_IMPORT_TRANSACTION_PROJECTION_V0_VERSION,
    transactionVersion: assertU32(
      "APNTImportTransactionProjectionV0.transactionVersion",
      value.transactionVersion,
    ),
    locktime: assertU32("APNTImportTransactionProjectionV0.locktime", value.locktime),
    inputs: Object.freeze(inputs),
    outputs: Object.freeze(outputs),
  });
}

function encodeNormalizedProjection(projection: APNTImportTransactionProjectionV0): Uint8Array {
  return concatBytes([
    PROJECTION_MAGIC,
    Uint8Array.of(projection.version),
    writeU32LE(projection.transactionVersion),
    writeU32LE(projection.locktime),
    writeU32LE(projection.inputs.length),
    ...projection.inputs.map((input) => concatBytes([
      serializeAPNTTransitionOutpointV1(input.outpoint),
      writeU32LE(input.sequenceNumber),
      writeU64LE(input.spentValueSats),
      encodeBytes(input.spentLockingBytecode),
      Uint8Array.of(0, inputRoleByte(input.role)),
    ])),
    writeU32LE(projection.outputs.length),
    ...projection.outputs.map((output) => concatBytes([
      writeU64LE(output.valueSats),
      encodeBytes(output.lockingBytecodeTemplate),
      Uint8Array.of(output.statementCommitmentOffset === null ? 0 : 1),
      ...(output.statementCommitmentOffset === null ? [] : [writeU32LE(output.statementCommitmentOffset)]),
      Uint8Array.of(0, outputRoleByte(output.role)),
      Uint8Array.of(output.lockingProfileId32 === null ? 0 : 1),
      ...(output.lockingProfileId32 === null ? [] : [output.lockingProfileId32]),
    ])),
  ]);
}

export function serializeAPNTImportTransactionProjectionV0(value: unknown): Uint8Array {
  return encodeNormalizedProjection(normalizeAPNTImportTransactionProjectionV0(value));
}

class CanonicalReader {
  private offset = 0;

  public constructor(
    private readonly bytes: Uint8Array,
    private readonly contract: string,
  ) {}

  public take(name: string, length: number): Uint8Array {
    if (length < 0 || this.offset > this.bytes.length || this.bytes.length - this.offset < length) {
      throw new Error(`${this.contract} bytes are truncated at ${name}`);
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

  public u64(name: string): bigint {
    const value = this.take(name, 8);
    let result = 0n;
    for (let index = 0; index < 8; index += 1) {
      result |= BigInt(value[index] as number) << BigInt(index * 8);
    }
    return result;
  }

  public bytes32(name: string): Bytes32 {
    return asBytes32(name, this.take(name, 32));
  }

  public lengthPrefixedBytes(name: string): Uint8Array {
    return this.take(name, this.u32(`${name}.length`));
  }

  public remaining(): number {
    return this.bytes.length - this.offset;
  }
}

function readOutpoint(reader: CanonicalReader, name: string): APNTTransitionOutpointV1 {
  return Object.freeze({
    txid32: asBytes32(`${name}.txid32`, reader.take(`${name}.txid32`, 32).reverse()),
    vout: reader.u32(`${name}.vout`),
  });
}

function requireCount(name: string, value: number, cap: number, nonempty = false): number {
  if (value > cap || (nonempty && value === 0)) {
    throw new Error(`${name} is outside the canonical collection bounds`);
  }
  return value;
}

export function parseAPNTImportTransactionProjectionV0(value: unknown): APNTImportTransactionProjectionV0 {
  if (!(value instanceof Uint8Array)) {
    throw new Error("APNTImportTransactionProjectionV0 bytes must be a Uint8Array");
  }
  const source = copyBytes(value);
  const reader = new CanonicalReader(source, "APNTImportTransactionProjectionV0");
  if (!bytesEqual(reader.take("magic", PROJECTION_MAGIC.length), PROJECTION_MAGIC)) {
    throw new Error("APNTImportTransactionProjectionV0 bytes have invalid magic");
  }
  const version = reader.u8("version");
  const transactionVersion = reader.u32("transactionVersion");
  const locktime = reader.u32("locktime");
  const inputCount = requireCount(
    "APNTImportTransactionProjectionV0 input count",
    reader.u32("inputCount"),
    APNT_IMPORT_TRANSACTION_PROJECTION_V0_MAX_INPUTS,
    true,
  );
  const inputs: APNTImportTransactionProjectionInputV0[] = [];
  for (let index = 0; index < inputCount; index += 1) {
    const name = `inputs[${String(index)}]`;
    const outpoint = readOutpoint(reader, `${name}.outpoint`);
    const sequenceNumber = reader.u32(`${name}.sequenceNumber`);
    const spentValueSats = reader.u64(`${name}.spentValueSats`);
    const spentLockingBytecode = reader.lengthPrefixedBytes(`${name}.spentLockingBytecode`);
    if (reader.u8(`${name}.spentToken`) !== 0) {
      throw new Error("APNTImportTransactionProjectionV0 bytes contain a token-bearing input");
    }
    inputs.push({
      outpoint,
      sequenceNumber,
      spentValueSats,
      spentLockingBytecode,
      spentToken: null,
      role: inputRoleFromByte(reader.u8(`${name}.role`)),
    });
  }
  const outputCount = requireCount(
    "APNTImportTransactionProjectionV0 output count",
    reader.u32("outputCount"),
    APNT_IMPORT_TRANSACTION_PROJECTION_V0_MAX_OUTPUTS,
    true,
  );
  const outputs: APNTImportTransactionProjectionOutputV0[] = [];
  for (let index = 0; index < outputCount; index += 1) {
    const name = `outputs[${String(index)}]`;
    const valueSats = reader.u64(`${name}.valueSats`);
    const lockingBytecodeTemplate = reader.lengthPrefixedBytes(`${name}.lockingBytecodeTemplate`);
    const statementPresence = reader.u8(`${name}.statementCommitmentOffset.presence`);
    if (statementPresence !== 0 && statementPresence !== 1) {
      throw new Error("APNTImportTransactionProjectionV0 bytes have invalid statement slot presence");
    }
    const statementCommitmentOffset = statementPresence === 0
      ? null
      : reader.u32(`${name}.statementCommitmentOffset`);
    if (reader.u8(`${name}.token`) !== 0) {
      throw new Error("APNTImportTransactionProjectionV0 bytes contain a token-bearing output");
    }
    const role = outputRoleFromByte(reader.u8(`${name}.role`));
    const profilePresence = reader.u8(`${name}.lockingProfileId32.presence`);
    if (profilePresence !== 0 && profilePresence !== 1) {
      throw new Error("APNTImportTransactionProjectionV0 bytes have invalid locking profile presence");
    }
    outputs.push({
      valueSats,
      lockingBytecodeTemplate,
      statementCommitmentOffset,
      token: null,
      role,
      lockingProfileId32: profilePresence === 0 ? null : reader.bytes32(`${name}.lockingProfileId32`),
    });
  }
  if (reader.remaining() !== 0) {
    throw new Error("APNTImportTransactionProjectionV0 bytes contain trailing data");
  }
  const normalized = normalizeAPNTImportTransactionProjectionV0({
    version,
    transactionVersion,
    locktime,
    inputs,
    outputs,
  });
  if (!bytesEqual(source, encodeNormalizedProjection(normalized))) {
    throw new Error("APNTImportTransactionProjectionV0 bytes are not canonical");
  }
  return normalized;
}

function normalizeImportFunding(value: unknown): APNTImportFundingIdentityV0 {
  const name = "APNTImportCreatedNoteStatementV0.importFunding";
  assertRecord(name, value);
  assertKnownKeys(name, value, [
    "outpoint",
    "valueSats",
    "importFundingCellCommitment32",
    "eligibilityStatementBind32",
    "outputFingerprint32",
  ]);
  return Object.freeze({
    outpoint: normalizeOutpoint(`${name}.outpoint`, value.outpoint),
    valueSats: assertBchValue(`${name}.valueSats`, value.valueSats, true),
    importFundingCellCommitment32: assertNonzeroBytes32(
      `${name}.importFundingCellCommitment32`,
      value.importFundingCellCommitment32,
    ),
    eligibilityStatementBind32: assertNonzeroBytes32(
      `${name}.eligibilityStatementBind32`,
      value.eligibilityStatementBind32,
    ),
    outputFingerprint32: assertNonzeroBytes32(`${name}.outputFingerprint32`, value.outputFingerprint32),
  });
}

function normalizeSealOpen(value: unknown): APNTImportSealOpenIdentityV0 {
  const name = "APNTImportCreatedNoteStatementV0.sealOpen";
  assertRecord(name, value);
  assertKnownKeys(name, value, ["sealCommitment32"]);
  return Object.freeze({
    sealCommitment32: assertNonzeroBytes32(`${name}.sealCommitment32`, value.sealCommitment32),
  });
}

function normalizeSealClose(value: unknown): APNTImportSealCloseIdentityV0 {
  const name = "APNTImportCreatedNoteStatementV0.sealClose";
  assertRecord(name, value);
  assertKnownKeys(name, value, ["consumedOutpoint", "inputIndex", "previousSealCommitment32"]);
  return Object.freeze({
    consumedOutpoint: normalizeOutpoint(`${name}.consumedOutpoint`, value.consumedOutpoint),
    inputIndex: assertU32(`${name}.inputIndex`, value.inputIndex),
    previousSealCommitment32: assertNonzeroBytes32(
      `${name}.previousSealCommitment32`,
      value.previousSealCommitment32,
    ),
  });
}

function normalizeLogicalNotes(value: unknown): readonly APNTImportCreatedLogicalNoteV0[] {
  const name = "APNTImportCreatedNoteStatementV0.createdLogicalNotes";
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${name} must be a non-empty array`);
  if (value.length > APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_MAX_LOGICAL_NOTES) {
    throw new Error(`${name} exceeds the v0 collection cap`);
  }
  const notes = value.map((candidate, index) => {
    const itemName = `${name}[${String(index)}]`;
    assertRecord(itemName, candidate);
    assertKnownKeys(itemName, candidate, [
      "createdNoteCommitment32",
      "creationScope32",
      "recoveryPacketIndex",
      "recoveryPacketHash32",
    ]);
    return Object.freeze({
      createdNoteCommitment32: assertNonzeroBytes32(
        `${itemName}.createdNoteCommitment32`,
        candidate.createdNoteCommitment32,
      ),
      creationScope32: assertNonzeroBytes32(`${itemName}.creationScope32`, candidate.creationScope32),
      recoveryPacketIndex: assertU32(`${itemName}.recoveryPacketIndex`, candidate.recoveryPacketIndex),
      recoveryPacketHash32: assertNonzeroBytes32(
        `${itemName}.recoveryPacketHash32`,
        candidate.recoveryPacketHash32,
      ),
    });
  }).sort((left, right) => compareBytes(left.createdNoteCommitment32, right.createdNoteCommitment32));
  if (new Set(notes.map((note) => bytesKey(note.createdNoteCommitment32))).size !== notes.length) {
    throw new Error(`${name} must not contain duplicate note commitments`);
  }
  if (new Set(notes.map((note) => String(note.recoveryPacketIndex))).size !== notes.length) {
    throw new Error(`${name} must not contain duplicate recovery packet indexes`);
  }
  if (new Set(notes.map((note) => bytesKey(note.recoveryPacketHash32))).size !== notes.length) {
    throw new Error(`${name} must not contain duplicate recovery packet hashes`);
  }
  notes.forEach((note, index) => {
    if (note.recoveryPacketIndex !== index) {
      throw new Error(`${name} recovery packet indexes must be contiguous in canonical note order`);
    }
  });
  return Object.freeze(notes);
}

function normalizeCreatedBackingCells(value: unknown): readonly APNTImportCreatedBackingCellV0[] {
  const name = "APNTImportCreatedNoteStatementV0.createdBackingCells";
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${name} must be a non-empty array`);
  if (value.length > APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_MAX_BACKING_CELLS) {
    throw new Error(`${name} exceeds the v0 collection cap`);
  }
  const cells = value.map((candidate, index) => {
    const itemName = `${name}[${String(index)}]`;
    assertRecord(itemName, candidate);
    assertKnownKeys(itemName, candidate, ["outputIndex", "sealCellCommitment32", "lockingProfileId32"]);
    return Object.freeze({
      outputIndex: assertU32(`${itemName}.outputIndex`, candidate.outputIndex),
      sealCellCommitment32: assertNonzeroBytes32(
        `${itemName}.sealCellCommitment32`,
        candidate.sealCellCommitment32,
      ),
      lockingProfileId32: assertNonzeroBytes32(
        `${itemName}.lockingProfileId32`,
        candidate.lockingProfileId32,
      ),
    });
  }).sort((left, right) => left.outputIndex - right.outputIndex);
  if (new Set(cells.map((cell) => String(cell.outputIndex))).size !== cells.length) {
    throw new Error(`${name} must not contain duplicate output indexes`);
  }
  if (new Set(cells.map((cell) => bytesKey(cell.sealCellCommitment32))).size !== cells.length) {
    throw new Error(`${name} must not contain duplicate seal-cell commitments`);
  }
  return Object.freeze(cells);
}

async function normalizeScopeReferences(value: unknown): Promise<readonly APNTImportCreationScopeReferenceV0[]> {
  const name = "APNTImportCreatedNoteStatementV0.importCreationScopes";
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${name} must be a non-empty array`);
  if (value.length > APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_MAX_SCOPES) {
    throw new Error(`${name} exceeds the v0 collection cap`);
  }
  const scopes = await Promise.all(value.map(async (candidate, index) => {
    const itemName = `${name}[${String(index)}]`;
    assertRecord(itemName, candidate);
    assertKnownKeys(itemName, candidate, ["creationScope32", "scope"]);
    const scope = normalizeAPNTImportCreationScopeV0(candidate.scope);
    const creationScope32 = assertNonzeroBytes32(`${itemName}.creationScope32`, candidate.creationScope32);
    if (!bytesEqual(creationScope32, await deriveAPNTImportCreationScopeCommitmentV0(scope))) {
      throw new Error(`${itemName}.creationScope32 must equal the canonical import creation-scope commitment`);
    }
    return Object.freeze({ creationScope32, scope });
  }));
  scopes.sort((left, right) => compareBytes(left.creationScope32, right.creationScope32));
  if (new Set(scopes.map((scope) => bytesKey(scope.creationScope32))).size !== scopes.length) {
    throw new Error(`${name} must not contain duplicate creation scopes`);
  }
  return Object.freeze(scopes);
}

function normalizePublicAccounting(value: unknown): APNTImportPublicAccountingTermsV0 {
  const name = "APNTImportCreatedNoteStatementV0.publicAccounting";
  assertRecord(name, value);
  assertKnownKeys(name, value, [
    "importFundingValueSats",
    "nonBackingInputValueSats",
    "createdBackingOutputValueSats",
    "nonBackingOutputValueSats",
    "totalInputValueSats",
    "totalOutputValueSats",
  ]);
  return Object.freeze({
    importFundingValueSats: assertBchValue(`${name}.importFundingValueSats`, value.importFundingValueSats, true),
    nonBackingInputValueSats: assertBchValue(`${name}.nonBackingInputValueSats`, value.nonBackingInputValueSats),
    createdBackingOutputValueSats: assertBchValue(
      `${name}.createdBackingOutputValueSats`,
      value.createdBackingOutputValueSats,
      true,
    ),
    nonBackingOutputValueSats: assertBchValue(`${name}.nonBackingOutputValueSats`, value.nonBackingOutputValueSats),
    totalInputValueSats: assertBchValue(`${name}.totalInputValueSats`, value.totalInputValueSats, true),
    totalOutputValueSats: assertBchValue(`${name}.totalOutputValueSats`, value.totalOutputValueSats, true),
  });
}

function checkedSum(name: string, values: readonly bigint[]): bigint {
  let total = 0n;
  for (const value of values) {
    if (value > APNT_V1_BCH_MAX_MONEY_SATS - total) {
      throw new Error(`${name} exceeds APNT_V1_BCH_MAX_MONEY_SATS`);
    }
    total += value;
  }
  return total;
}

function projectionAccounting(
  projection: APNTImportTransactionProjectionV0,
): APNTImportPublicAccountingTermsV0 {
  const importFundingInputs = projection.inputs.filter(
    (input) => input.role === APNT_IMPORT_TRANSACTION_INPUT_ROLE_V0.IMPORT_FUNDING,
  );
  const nonBackingInputs = projection.inputs.filter(
    (input) => input.role === APNT_IMPORT_TRANSACTION_INPUT_ROLE_V0.VERIFIER_COLLATERAL,
  );
  const backingOutputs = projection.outputs.filter(
    (output) => output.role === APNT_IMPORT_TRANSACTION_OUTPUT_ROLE_V0.PRIVATE_BACKING,
  );
  const nonBackingOutputs = projection.outputs.filter(
    (output) => output.role !== APNT_IMPORT_TRANSACTION_OUTPUT_ROLE_V0.PRIVATE_BACKING,
  );
  return Object.freeze({
    importFundingValueSats: checkedSum(
      "APNT import funding value",
      importFundingInputs.map((input) => input.spentValueSats),
    ),
    nonBackingInputValueSats: checkedSum(
      "APNT import non-backing input value",
      nonBackingInputs.map((input) => input.spentValueSats),
    ),
    createdBackingOutputValueSats: checkedSum(
      "APNT import created backing output value",
      backingOutputs.map((output) => output.valueSats),
    ),
    nonBackingOutputValueSats: checkedSum(
      "APNT import non-backing output value",
      nonBackingOutputs.map((output) => output.valueSats),
    ),
    totalInputValueSats: checkedSum(
      "APNT import total input value",
      projection.inputs.map((input) => input.spentValueSats),
    ),
    totalOutputValueSats: checkedSum(
      "APNT import total output value",
      projection.outputs.map((output) => output.valueSats),
    ),
  });
}

function accountingEqual(
  left: APNTImportPublicAccountingTermsV0,
  right: APNTImportPublicAccountingTermsV0,
): boolean {
  return left.importFundingValueSats === right.importFundingValueSats &&
    left.nonBackingInputValueSats === right.nonBackingInputValueSats &&
    left.createdBackingOutputValueSats === right.createdBackingOutputValueSats &&
    left.nonBackingOutputValueSats === right.nonBackingOutputValueSats &&
    left.totalInputValueSats === right.totalInputValueSats &&
    left.totalOutputValueSats === right.totalOutputValueSats;
}

/**
 * Canonicalizes statement collections and correspondence-only public terms.
 * It deliberately does not evaluate backing, completeness, disjointness,
 * transparent-import conservation, recovery semantics, proof, or chain truth.
 */
export async function normalizeAPNTImportCreatedNoteStatementV0(
  value: unknown,
): Promise<APNTImportCreatedNoteStatementV0> {
  assertRecord("APNTImportCreatedNoteStatementV0", value);
  assertKnownKeys("APNTImportCreatedNoteStatementV0", value, [
    "version",
    "domain",
    "network",
    "relationIdentity",
    "privacyProfileId32",
    "importFunding",
    "sealOpen",
    "sealClose",
    "creationTransactionId32",
    "transactionProjection",
    "createdLogicalNotes",
    "createdBackingCells",
    "importCreationScopes",
    "recoveryPacketTableCommitment32",
    "authorizedImportFeeSats",
    "publicAccounting",
  ]);
  if (value.version !== APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_VERSION) {
    throw new Error("APNTImportCreatedNoteStatementV0.version must be 0");
  }
  if (value.domain !== APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_DOMAIN) {
    throw new Error(`APNTImportCreatedNoteStatementV0.domain must be ${APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_DOMAIN}`);
  }
  if (value.relationIdentity !== APNT_IMPORT_CREATED_NOTE_RELATION_V0_IDENTITY) {
    throw new Error("APNTImportCreatedNoteStatementV0.relationIdentity is unsupported");
  }
  const network = normalizeNetwork("APNTImportCreatedNoteStatementV0.network", value.network);
  const privacyProfileId32 = assertNonzeroBytes32(
    "APNTImportCreatedNoteStatementV0.privacyProfileId32",
    value.privacyProfileId32,
  );
  const importFunding = normalizeImportFunding(value.importFunding);
  const sealOpen = normalizeSealOpen(value.sealOpen);
  const sealClose = normalizeSealClose(value.sealClose);
  const creationTransactionId32 = assertNonzeroBytes32(
    "APNTImportCreatedNoteStatementV0.creationTransactionId32",
    value.creationTransactionId32,
  );
  const transactionProjection = normalizeAPNTImportTransactionProjectionV0(value.transactionProjection);
  const createdLogicalNotes = normalizeLogicalNotes(value.createdLogicalNotes);
  const createdBackingCells = normalizeCreatedBackingCells(value.createdBackingCells);
  const importCreationScopes = await normalizeScopeReferences(value.importCreationScopes);
  const publicAccounting = normalizePublicAccounting(value.publicAccounting);

  if (!outpointsEqual(importFunding.outpoint, sealClose.consumedOutpoint)) {
    throw new Error("APNTImportCreatedNoteStatementV0 seal-close outpoint must equal import funding outpoint");
  }
  if (!bytesEqual(sealOpen.sealCommitment32, sealClose.previousSealCommitment32)) {
    throw new Error("APNTImportCreatedNoteStatementV0 seal-open and seal-close commitments must match");
  }
  const projectedImportInput = transactionProjection.inputs[sealClose.inputIndex];
  if (
    projectedImportInput === undefined ||
    projectedImportInput.role !== APNT_IMPORT_TRANSACTION_INPUT_ROLE_V0.IMPORT_FUNDING ||
    !outpointsEqual(projectedImportInput.outpoint, importFunding.outpoint) ||
    projectedImportInput.spentValueSats !== importFunding.valueSats
  ) {
    throw new Error("APNTImportCreatedNoteStatementV0 consumed import input does not match the projection");
  }
  const backingOutputIndexes = transactionProjection.outputs
    .map((output, outputIndex) => ({ output, outputIndex }))
    .filter(({ output }) => output.role === APNT_IMPORT_TRANSACTION_OUTPUT_ROLE_V0.PRIVATE_BACKING);
  if (backingOutputIndexes.length !== createdBackingCells.length) {
    throw new Error("APNTImportCreatedNoteStatementV0 backing-cell tuples must cover private-backing outputs");
  }
  for (let index = 0; index < createdBackingCells.length; index += 1) {
    const cell = createdBackingCells[index] as APNTImportCreatedBackingCellV0;
    const projected = backingOutputIndexes[index];
    if (
      projected === undefined ||
      projected.outputIndex !== cell.outputIndex ||
      projected.output.lockingProfileId32 === null ||
      !bytesEqual(projected.output.lockingProfileId32, cell.lockingProfileId32)
    ) {
      throw new Error("APNTImportCreatedNoteStatementV0 backing-cell tuple does not match the projection");
    }
  }
  const backingSkeletons: readonly APNTImportCreatedBackingSkeletonV0[] =
    normalizeAPNTImportCreatedBackingSkeletonsV0(createdBackingCells.map((cell) => {
      const output = transactionProjection.outputs[cell.outputIndex];
      if (output === undefined) {
        throw new Error("APNTImportCreatedNoteStatementV0 backing cell references a missing output");
      }
      return {
        outputIndex: cell.outputIndex,
        valueSats: output.valueSats,
        lockingProfileId32: cell.lockingProfileId32,
      };
    }));
  const skeletonSetCommitment32 = await deriveAPNTImportCreatedBackingSkeletonSetCommitmentV0(
    backingSkeletons,
  );
  const scopeKeys = new Set(importCreationScopes.map((reference) => bytesKey(reference.creationScope32)));
  for (const reference of importCreationScopes) {
    const scope = reference.scope;
    if (
      scope.network !== network ||
      scope.relationIdentity !== APNT_IMPORT_CREATED_NOTE_RELATION_V0_IDENTITY ||
      !bytesEqual(scope.privacyProfileId32, privacyProfileId32) ||
      !outpointsEqual(scope.importFundingOutpoint, importFunding.outpoint) ||
      !bytesEqual(scope.creationTransactionId32, creationTransactionId32) ||
      !bytesEqual(scope.createdBackingSkeletonSetCommitment32, skeletonSetCommitment32)
    ) {
      throw new Error("APNTImportCreatedNoteStatementV0 import creation scope identity mismatch");
    }
  }
  if (createdLogicalNotes.some((note) => !scopeKeys.has(bytesKey(note.creationScope32)))) {
    throw new Error("APNTImportCreatedNoteStatementV0 created note references an unknown import creation scope");
  }
  const referencedScopeKeys = new Set(createdLogicalNotes.map((note) => bytesKey(note.creationScope32)));
  if (importCreationScopes.some((reference) => !referencedScopeKeys.has(bytesKey(reference.creationScope32)))) {
    throw new Error("APNTImportCreatedNoteStatementV0 contains an unreferenced import creation scope");
  }
  const derivedAccounting = projectionAccounting(transactionProjection);
  if (!accountingEqual(publicAccounting, derivedAccounting) ||
      publicAccounting.importFundingValueSats !== importFunding.valueSats) {
    throw new Error("APNTImportCreatedNoteStatementV0 public accounting must equal the canonical projection terms");
  }

  return Object.freeze({
    version: APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_VERSION,
    domain: APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_DOMAIN,
    network,
    relationIdentity: APNT_IMPORT_CREATED_NOTE_RELATION_V0_IDENTITY,
    privacyProfileId32,
    importFunding,
    sealOpen,
    sealClose,
    creationTransactionId32,
    transactionProjection,
    createdLogicalNotes,
    createdBackingCells,
    importCreationScopes,
    recoveryPacketTableCommitment32: assertNonzeroBytes32(
      "APNTImportCreatedNoteStatementV0.recoveryPacketTableCommitment32",
      value.recoveryPacketTableCommitment32,
    ),
    authorizedImportFeeSats: assertBchValue(
      "APNTImportCreatedNoteStatementV0.authorizedImportFeeSats",
      value.authorizedImportFeeSats,
    ),
    publicAccounting,
  });
}

function encodeNormalizedStatement(statement: APNTImportCreatedNoteStatementV0): Uint8Array {
  const domain = TEXT_ENCODER.encode(statement.domain);
  const relationIdentity = TEXT_ENCODER.encode(statement.relationIdentity);
  return concatBytes([
    MAGIC,
    Uint8Array.of(statement.version),
    writeU16LE(domain.length),
    domain,
    Uint8Array.of(networkByte(statement.network)),
    writeU16LE(relationIdentity.length),
    relationIdentity,
    statement.privacyProfileId32,
    serializeAPNTTransitionOutpointV1(statement.importFunding.outpoint),
    writeU64LE(statement.importFunding.valueSats),
    statement.importFunding.importFundingCellCommitment32,
    statement.importFunding.eligibilityStatementBind32,
    statement.importFunding.outputFingerprint32,
    statement.sealOpen.sealCommitment32,
    serializeAPNTTransitionOutpointV1(statement.sealClose.consumedOutpoint),
    writeU32LE(statement.sealClose.inputIndex),
    statement.sealClose.previousSealCommitment32,
    statement.creationTransactionId32,
    encodeBytes(serializeAPNTImportTransactionProjectionV0(statement.transactionProjection)),
    writeU32LE(statement.createdLogicalNotes.length),
    ...statement.createdLogicalNotes.map((note) => concatBytes([
      note.createdNoteCommitment32,
      note.creationScope32,
      writeU32LE(note.recoveryPacketIndex),
      note.recoveryPacketHash32,
    ])),
    writeU32LE(statement.createdBackingCells.length),
    ...statement.createdBackingCells.map((cell) => concatBytes([
      writeU32LE(cell.outputIndex),
      cell.sealCellCommitment32,
      cell.lockingProfileId32,
    ])),
    writeU32LE(statement.importCreationScopes.length),
    ...statement.importCreationScopes.map((reference) => {
      const scopeBytes = serializeAPNTImportCreationScopeV0(reference.scope);
      return concatBytes([reference.creationScope32, encodeBytes(scopeBytes)]);
    }),
    statement.recoveryPacketTableCommitment32,
    writeU64LE(statement.authorizedImportFeeSats),
    writeU64LE(statement.publicAccounting.importFundingValueSats),
    writeU64LE(statement.publicAccounting.nonBackingInputValueSats),
    writeU64LE(statement.publicAccounting.createdBackingOutputValueSats),
    writeU64LE(statement.publicAccounting.nonBackingOutputValueSats),
    writeU64LE(statement.publicAccounting.totalInputValueSats),
    writeU64LE(statement.publicAccounting.totalOutputValueSats),
  ]);
}

export async function serializeAPNTImportCreatedNoteStatementV0(value: unknown): Promise<Uint8Array> {
  return encodeNormalizedStatement(await normalizeAPNTImportCreatedNoteStatementV0(value));
}

function decodeText(reader: CanonicalReader, name: string): string {
  try {
    return TEXT_DECODER.decode(reader.take(name, reader.u16(`${name}.length`)));
  } catch {
    throw new Error(`APNTImportCreatedNoteStatementV0 bytes have invalid ${name} encoding`);
  }
}

export async function parseAPNTImportCreatedNoteStatementV0(
  value: unknown,
): Promise<APNTImportCreatedNoteStatementV0> {
  if (!(value instanceof Uint8Array)) {
    throw new Error("APNTImportCreatedNoteStatementV0 bytes must be a Uint8Array");
  }
  const source = copyBytes(value);
  const reader = new CanonicalReader(source, "APNTImportCreatedNoteStatementV0");
  if (!bytesEqual(reader.take("magic", MAGIC.length), MAGIC)) {
    throw new Error("APNTImportCreatedNoteStatementV0 bytes have invalid magic");
  }
  const version = reader.u8("version");
  const domain = decodeText(reader, "domain");
  const network = networkFromByte(reader.u8("network"));
  const relationIdentity = decodeText(reader, "relationIdentity");
  const privacyProfileId32 = reader.bytes32("privacyProfileId32");
  const importFunding = {
    outpoint: readOutpoint(reader, "importFunding.outpoint"),
    valueSats: reader.u64("importFunding.valueSats"),
    importFundingCellCommitment32: reader.bytes32("importFunding.importFundingCellCommitment32"),
    eligibilityStatementBind32: reader.bytes32("importFunding.eligibilityStatementBind32"),
    outputFingerprint32: reader.bytes32("importFunding.outputFingerprint32"),
  };
  const sealOpen = { sealCommitment32: reader.bytes32("sealOpen.sealCommitment32") };
  const sealClose = {
    consumedOutpoint: readOutpoint(reader, "sealClose.consumedOutpoint"),
    inputIndex: reader.u32("sealClose.inputIndex"),
    previousSealCommitment32: reader.bytes32("sealClose.previousSealCommitment32"),
  };
  const creationTransactionId32 = reader.bytes32("creationTransactionId32");
  const transactionProjection = parseAPNTImportTransactionProjectionV0(
    reader.lengthPrefixedBytes("transactionProjection"),
  );
  const logicalCount = requireCount(
    "APNTImportCreatedNoteStatementV0 logical-note count",
    reader.u32("createdLogicalNoteCount"),
    APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_MAX_LOGICAL_NOTES,
    true,
  );
  const createdLogicalNotes: APNTImportCreatedLogicalNoteV0[] = [];
  for (let index = 0; index < logicalCount; index += 1) {
    createdLogicalNotes.push({
      createdNoteCommitment32: reader.bytes32(`createdLogicalNotes[${String(index)}].createdNoteCommitment32`),
      creationScope32: reader.bytes32(`createdLogicalNotes[${String(index)}].creationScope32`),
      recoveryPacketIndex: reader.u32(`createdLogicalNotes[${String(index)}].recoveryPacketIndex`),
      recoveryPacketHash32: reader.bytes32(`createdLogicalNotes[${String(index)}].recoveryPacketHash32`),
    });
  }
  const cellCount = requireCount(
    "APNTImportCreatedNoteStatementV0 backing-cell count",
    reader.u32("createdBackingCellCount"),
    APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_MAX_BACKING_CELLS,
    true,
  );
  const createdBackingCells: APNTImportCreatedBackingCellV0[] = [];
  for (let index = 0; index < cellCount; index += 1) {
    createdBackingCells.push({
      outputIndex: reader.u32(`createdBackingCells[${String(index)}].outputIndex`),
      sealCellCommitment32: reader.bytes32(`createdBackingCells[${String(index)}].sealCellCommitment32`),
      lockingProfileId32: reader.bytes32(`createdBackingCells[${String(index)}].lockingProfileId32`),
    });
  }
  const scopeCount = requireCount(
    "APNTImportCreatedNoteStatementV0 creation-scope count",
    reader.u32("importCreationScopeCount"),
    APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_MAX_SCOPES,
    true,
  );
  const importCreationScopes: APNTImportCreationScopeReferenceV0[] = [];
  for (let index = 0; index < scopeCount; index += 1) {
    importCreationScopes.push({
      creationScope32: reader.bytes32(`importCreationScopes[${String(index)}].creationScope32`),
      scope: parseAPNTImportCreationScopeV0(
        reader.lengthPrefixedBytes(`importCreationScopes[${String(index)}].scope`),
      ),
    });
  }
  const normalized = await normalizeAPNTImportCreatedNoteStatementV0({
    version,
    domain,
    network,
    relationIdentity,
    privacyProfileId32,
    importFunding,
    sealOpen,
    sealClose,
    creationTransactionId32,
    transactionProjection,
    createdLogicalNotes,
    createdBackingCells,
    importCreationScopes,
    recoveryPacketTableCommitment32: reader.bytes32("recoveryPacketTableCommitment32"),
    authorizedImportFeeSats: reader.u64("authorizedImportFeeSats"),
    publicAccounting: {
      importFundingValueSats: reader.u64("publicAccounting.importFundingValueSats"),
      nonBackingInputValueSats: reader.u64("publicAccounting.nonBackingInputValueSats"),
      createdBackingOutputValueSats: reader.u64("publicAccounting.createdBackingOutputValueSats"),
      nonBackingOutputValueSats: reader.u64("publicAccounting.nonBackingOutputValueSats"),
      totalInputValueSats: reader.u64("publicAccounting.totalInputValueSats"),
      totalOutputValueSats: reader.u64("publicAccounting.totalOutputValueSats"),
    },
  });
  if (reader.remaining() !== 0) {
    throw new Error("APNTImportCreatedNoteStatementV0 bytes contain trailing data");
  }
  if (!bytesEqual(source, encodeNormalizedStatement(normalized))) {
    throw new Error("APNTImportCreatedNoteStatementV0 bytes are not in canonical collection order");
  }
  return normalized;
}

export async function deriveAPNTImportCreatedNoteStatementCommitmentV0(
  value: unknown,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_IMPORT_CREATED_NOTE_STATEMENT_V0_COMMITMENT_DOMAIN,
    await serializeAPNTImportCreatedNoteStatementV0(value),
  );
}
