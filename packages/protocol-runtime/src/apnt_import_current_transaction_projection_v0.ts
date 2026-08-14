// Maturity: preview — measured zero published importers and no published
// artifact references it. Read it, don't build on it. See AGENTS.md, "The
// maturity ladder".
import { asBytes32, copyBytes, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { APNT_V1_BCH_MAX_MONEY_SATS } from "./apnt_bundle_backed_private_note_v1.js";
import {
  serializeAPNTTransitionOutpointV1,
  type APNTTransitionOutpointV1,
} from "./apnt_transaction_projection_v1.js";

export const APNT_IMPORT_CURRENT_TRANSACTION_PROJECTION_V0_VERSION = 0;
export const APNT_IMPORT_CURRENT_TRANSACTION_PROJECTION_V0_MAGIC = "APNTCTV0";
export const APNT_IMPORT_CURRENT_TRANSACTION_PROJECTION_V0_COMMITMENT_DOMAIN =
  "bch-cloak-apnt-v0:import-current-transaction-projection-commitment-v0";
export const APNT_IMPORT_CURRENT_TRANSACTION_SPENT_PROGRAM_IDENTITY_DOMAIN =
  "bch-cloak-apnt-v0:import-current-transaction-spent-program-identity-v0";
export const APNT_IMPORT_CURRENT_TRANSACTION_OUTPUT_PROGRAM_COMMITMENT_DOMAIN =
  "bch-cloak-apnt-v0:import-current-transaction-output-program-commitment-v0";
export const APNT_IMPORT_CURRENT_TRANSACTION_PROOF_EVIDENCE_COMMITMENT_DOMAIN =
  "bch-cloak-apnt-v0:import-current-transaction-proof-evidence-commitment-v0";
export const APNT_IMPORT_CURRENT_TRANSACTION_SETTLEMENT_FINGERPRINT_DOMAIN =
  "bch-cloak-apnt-v0:import-current-transaction-settlement-fingerprint-v0";
export const APNT_IMPORT_CURRENT_TRANSACTION_PROJECTION_V0_MAX_INPUTS = 64;
export const APNT_IMPORT_CURRENT_TRANSACTION_PROJECTION_V0_MAX_OUTPUTS = 64;

const MAGIC = new TextEncoder().encode(APNT_IMPORT_CURRENT_TRANSACTION_PROJECTION_V0_MAGIC);

export type APNTImportCurrentTransactionNetworkV0 = "chipnet" | "mainnet" | "regtest";

export const APNT_IMPORT_CURRENT_TRANSACTION_INPUT_ROLE_V0 = Object.freeze({
  IMPORT_FUNDING: "import-funding",
  VERIFIER_COLLATERAL: "verifier-collateral",
  NOTE_BACKED_VERIFIER: "note-backed-verifier",
} as const);
export type APNTImportCurrentTransactionInputRoleV0 =
  (typeof APNT_IMPORT_CURRENT_TRANSACTION_INPUT_ROLE_V0)[keyof typeof APNT_IMPORT_CURRENT_TRANSACTION_INPUT_ROLE_V0];

export const APNT_IMPORT_CURRENT_TRANSACTION_OUTPUT_ROLE_V0 = Object.freeze({
  PRIVATE_BACKING: "private-backing",
  RECOVERY_PACKET_CARRIER: "recovery-packet-carrier",
  VERIFIER_COLLATERAL: "verifier-collateral",
} as const);
export type APNTImportCurrentTransactionOutputRoleV0 =
  (typeof APNT_IMPORT_CURRENT_TRANSACTION_OUTPUT_ROLE_V0)[keyof typeof APNT_IMPORT_CURRENT_TRANSACTION_OUTPUT_ROLE_V0];

export type APNTImportCurrentTransactionProjectionInputV0 = Readonly<{
  outpoint: APNTTransitionOutpointV1;
  sequenceNumber: number;
  spentValueSats: bigint;
  spentLockingProgramIdentity32: Bytes32;
  role: APNTImportCurrentTransactionInputRoleV0;
  statementProjectionInputIndex: number | null;
}>;

export type APNTImportCurrentTransactionProjectionOutputV0 = Readonly<{
  valueSats: bigint;
  lockingBytecodeCommitment32: Bytes32;
  role: APNTImportCurrentTransactionOutputRoleV0;
  statementProjectionOutputIndex: number;
  recoveryChunkIndex: number | null;
}>;

/**
 * Chain-derived, order-sensitive projection for mandatory wallet composition.
 * It contains commitments to public locking programs, never private note
 * values, note assignments, owners, recipients, or recovery plaintext.
 */
export type APNTImportCurrentTransactionProjectionV0 = Readonly<{
  version: typeof APNT_IMPORT_CURRENT_TRANSACTION_PROJECTION_V0_VERSION;
  network: APNTImportCurrentTransactionNetworkV0;
  transactionId32: Bytes32;
  transactionVersion: number;
  locktime: number;
  verifierProfileIdentity32: Bytes32;
  statementCommitment32: Bytes32;
  proofEvidenceCommitment32: Bytes32;
  inputs: readonly APNTImportCurrentTransactionProjectionInputV0[];
  outputs: readonly APNTImportCurrentTransactionProjectionOutputV0[];
  settlementOutputFingerprint32: Bytes32;
  recoveryPacketBinRoot32: Bytes32;
  recoveryPacketTableCommitment32: Bytes32;
  recoveryEnvelopeCommitment32: Bytes32;
  feeSats: bigint;
  postageSats: bigint;
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

function assertNonzeroBytes32(name: string, value: unknown): Bytes32 {
  if (!(value instanceof Uint8Array)) throw new Error(`${name} must be a Uint8Array`);
  const bytes = asBytes32(name, value);
  if (bytes.every((byte) => byte === 0)) throw new Error(`${name} must not be all zero`);
  return bytes;
}

function normalizeOutpoint(name: string, value: unknown): APNTTransitionOutpointV1 {
  assertRecord(name, value);
  assertKnownKeys(name, value, ["txid32", "vout"]);
  return Object.freeze({
    txid32: assertNonzeroBytes32(`${name}.txid32`, value.txid32),
    vout: assertU32(`${name}.vout`, value.vout),
  });
}

function normalizeNetwork(value: unknown): APNTImportCurrentTransactionNetworkV0 {
  if (value !== "chipnet" && value !== "mainnet" && value !== "regtest") {
    throw new Error("APNTImportCurrentTransactionProjectionV0.network is unsupported");
  }
  return value;
}

function normalizeInputRole(value: unknown): APNTImportCurrentTransactionInputRoleV0 {
  if (
    value !== APNT_IMPORT_CURRENT_TRANSACTION_INPUT_ROLE_V0.IMPORT_FUNDING &&
    value !== APNT_IMPORT_CURRENT_TRANSACTION_INPUT_ROLE_V0.VERIFIER_COLLATERAL &&
    value !== APNT_IMPORT_CURRENT_TRANSACTION_INPUT_ROLE_V0.NOTE_BACKED_VERIFIER
  ) {
    throw new Error("APNT import current-transaction input role is unsupported");
  }
  return value;
}

function normalizeOutputRole(value: unknown): APNTImportCurrentTransactionOutputRoleV0 {
  if (
    value !== APNT_IMPORT_CURRENT_TRANSACTION_OUTPUT_ROLE_V0.PRIVATE_BACKING &&
    value !== APNT_IMPORT_CURRENT_TRANSACTION_OUTPUT_ROLE_V0.RECOVERY_PACKET_CARRIER &&
    value !== APNT_IMPORT_CURRENT_TRANSACTION_OUTPUT_ROLE_V0.VERIFIER_COLLATERAL
  ) {
    throw new Error("APNT import current-transaction output role is unsupported");
  }
  return value;
}

function normalizeOptionalIndex(name: string, value: unknown): number | null {
  return value === null ? null : assertU32(name, value);
}

function outpointKey(outpoint: APNTTransitionOutpointV1): string {
  return `${Array.from(outpoint.txid32).map((byte) => byte.toString(16).padStart(2, "0")).join("")}:${String(outpoint.vout)}`;
}

function normalizeInput(
  name: string,
  value: unknown,
): APNTImportCurrentTransactionProjectionInputV0 {
  assertRecord(name, value);
  assertKnownKeys(name, value, [
    "outpoint",
    "sequenceNumber",
    "spentValueSats",
    "spentLockingProgramIdentity32",
    "role",
    "statementProjectionInputIndex",
  ]);
  const role = normalizeInputRole(value.role);
  const statementProjectionInputIndex = normalizeOptionalIndex(
    `${name}.statementProjectionInputIndex`,
    value.statementProjectionInputIndex,
  );
  if (
    role === APNT_IMPORT_CURRENT_TRANSACTION_INPUT_ROLE_V0.NOTE_BACKED_VERIFIER &&
    statementProjectionInputIndex !== null
  ) {
    throw new Error(`${name}.statementProjectionInputIndex is forbidden for note-backed verifier input`);
  }
  if (
    role !== APNT_IMPORT_CURRENT_TRANSACTION_INPUT_ROLE_V0.NOTE_BACKED_VERIFIER &&
    statementProjectionInputIndex === null
  ) {
    throw new Error(`${name}.statementProjectionInputIndex is required for statement-mapped input`);
  }
  return Object.freeze({
    outpoint: normalizeOutpoint(`${name}.outpoint`, value.outpoint),
    sequenceNumber: assertU32(`${name}.sequenceNumber`, value.sequenceNumber),
    spentValueSats: assertBchValue(`${name}.spentValueSats`, value.spentValueSats, true),
    spentLockingProgramIdentity32: assertNonzeroBytes32(
      `${name}.spentLockingProgramIdentity32`,
      value.spentLockingProgramIdentity32,
    ),
    role,
    statementProjectionInputIndex,
  });
}

function normalizeOutput(
  name: string,
  value: unknown,
): APNTImportCurrentTransactionProjectionOutputV0 {
  assertRecord(name, value);
  assertKnownKeys(name, value, [
    "valueSats",
    "lockingBytecodeCommitment32",
    "role",
    "statementProjectionOutputIndex",
    "recoveryChunkIndex",
  ]);
  const role = normalizeOutputRole(value.role);
  const recoveryChunkIndex = normalizeOptionalIndex(`${name}.recoveryChunkIndex`, value.recoveryChunkIndex);
  if (
    role === APNT_IMPORT_CURRENT_TRANSACTION_OUTPUT_ROLE_V0.RECOVERY_PACKET_CARRIER &&
    recoveryChunkIndex === null
  ) {
    throw new Error(`${name}.recoveryChunkIndex is required for recovery carrier output`);
  }
  if (
    role !== APNT_IMPORT_CURRENT_TRANSACTION_OUTPUT_ROLE_V0.RECOVERY_PACKET_CARRIER &&
    recoveryChunkIndex !== null
  ) {
    throw new Error(`${name}.recoveryChunkIndex is forbidden for non-recovery output`);
  }
  return Object.freeze({
    valueSats: assertBchValue(`${name}.valueSats`, value.valueSats, true),
    lockingBytecodeCommitment32: assertNonzeroBytes32(
      `${name}.lockingBytecodeCommitment32`,
      value.lockingBytecodeCommitment32,
    ),
    role,
    statementProjectionOutputIndex: assertU32(
      `${name}.statementProjectionOutputIndex`,
      value.statementProjectionOutputIndex,
    ),
    recoveryChunkIndex,
  });
}

export function normalizeAPNTImportCurrentTransactionProjectionV0(
  value: unknown,
): APNTImportCurrentTransactionProjectionV0 {
  assertRecord("APNTImportCurrentTransactionProjectionV0", value);
  assertKnownKeys("APNTImportCurrentTransactionProjectionV0", value, [
    "version",
    "network",
    "transactionId32",
    "transactionVersion",
    "locktime",
    "verifierProfileIdentity32",
    "statementCommitment32",
    "proofEvidenceCommitment32",
    "inputs",
    "outputs",
    "settlementOutputFingerprint32",
    "recoveryPacketBinRoot32",
    "recoveryPacketTableCommitment32",
    "recoveryEnvelopeCommitment32",
    "feeSats",
    "postageSats",
  ]);
  if (value.version !== APNT_IMPORT_CURRENT_TRANSACTION_PROJECTION_V0_VERSION) {
    throw new Error("APNTImportCurrentTransactionProjectionV0.version must be 0");
  }
  if (!Array.isArray(value.inputs) || value.inputs.length === 0 ||
      value.inputs.length > APNT_IMPORT_CURRENT_TRANSACTION_PROJECTION_V0_MAX_INPUTS) {
    throw new Error("APNTImportCurrentTransactionProjectionV0.inputs is outside the v0 bounds");
  }
  if (!Array.isArray(value.outputs) || value.outputs.length === 0 ||
      value.outputs.length > APNT_IMPORT_CURRENT_TRANSACTION_PROJECTION_V0_MAX_OUTPUTS) {
    throw new Error("APNTImportCurrentTransactionProjectionV0.outputs is outside the v0 bounds");
  }
  const inputs = value.inputs.map((input, index) =>
    normalizeInput(`APNTImportCurrentTransactionProjectionV0.inputs[${String(index)}]`, input));
  if (new Set(inputs.map((input) => outpointKey(input.outpoint))).size !== inputs.length) {
    throw new Error("APNTImportCurrentTransactionProjectionV0.inputs contains a duplicate outpoint");
  }
  if (inputs.filter((input) =>
    input.role === APNT_IMPORT_CURRENT_TRANSACTION_INPUT_ROLE_V0.IMPORT_FUNDING).length !== 1) {
    throw new Error("APNTImportCurrentTransactionProjectionV0 requires exactly one import-funding input");
  }
  const mappedInputIndexes = inputs.flatMap((input) =>
    input.statementProjectionInputIndex === null ? [] : [input.statementProjectionInputIndex]);
  if (new Set(mappedInputIndexes).size !== mappedInputIndexes.length) {
    throw new Error("APNTImportCurrentTransactionProjectionV0 statement input mapping is duplicated");
  }
  const outputs = value.outputs.map((output, index) =>
    normalizeOutput(`APNTImportCurrentTransactionProjectionV0.outputs[${String(index)}]`, output));
  if (!outputs.some((output) =>
    output.role === APNT_IMPORT_CURRENT_TRANSACTION_OUTPUT_ROLE_V0.PRIVATE_BACKING)) {
    throw new Error("APNTImportCurrentTransactionProjectionV0 requires private-backing outputs");
  }
  const recoveryOutputs = outputs.filter((output) =>
    output.role === APNT_IMPORT_CURRENT_TRANSACTION_OUTPUT_ROLE_V0.RECOVERY_PACKET_CARRIER);
  if (recoveryOutputs.length === 0 || recoveryOutputs.some((output, index) =>
    output.recoveryChunkIndex !== index)) {
    throw new Error("APNTImportCurrentTransactionProjectionV0 recovery chunks must be contiguous and ordered");
  }
  const feeSats = assertBchValue("APNTImportCurrentTransactionProjectionV0.feeSats", value.feeSats, true);
  const postageSats = assertBchValue(
    "APNTImportCurrentTransactionProjectionV0.postageSats",
    value.postageSats,
    true,
  );
  const totalInputValueSats = inputs.reduce((sum, input) => sum + input.spentValueSats, 0n);
  const totalOutputValueSats = outputs.reduce((sum, output) => sum + output.valueSats, 0n);
  if (totalInputValueSats - totalOutputValueSats !== feeSats) {
    throw new Error("APNTImportCurrentTransactionProjectionV0 fee does not equal inputs minus outputs");
  }
  if (recoveryOutputs.reduce((sum, output) => sum + output.valueSats, 0n) !== postageSats) {
    throw new Error("APNTImportCurrentTransactionProjectionV0 postage does not equal recovery output values");
  }
  return Object.freeze({
    version: APNT_IMPORT_CURRENT_TRANSACTION_PROJECTION_V0_VERSION,
    network: normalizeNetwork(value.network),
    transactionId32: assertNonzeroBytes32(
      "APNTImportCurrentTransactionProjectionV0.transactionId32",
      value.transactionId32,
    ),
    transactionVersion: assertU32(
      "APNTImportCurrentTransactionProjectionV0.transactionVersion",
      value.transactionVersion,
    ),
    locktime: assertU32("APNTImportCurrentTransactionProjectionV0.locktime", value.locktime),
    verifierProfileIdentity32: assertNonzeroBytes32(
      "APNTImportCurrentTransactionProjectionV0.verifierProfileIdentity32",
      value.verifierProfileIdentity32,
    ),
    statementCommitment32: assertNonzeroBytes32(
      "APNTImportCurrentTransactionProjectionV0.statementCommitment32",
      value.statementCommitment32,
    ),
    proofEvidenceCommitment32: assertNonzeroBytes32(
      "APNTImportCurrentTransactionProjectionV0.proofEvidenceCommitment32",
      value.proofEvidenceCommitment32,
    ),
    inputs: Object.freeze(inputs),
    outputs: Object.freeze(outputs),
    settlementOutputFingerprint32: assertNonzeroBytes32(
      "APNTImportCurrentTransactionProjectionV0.settlementOutputFingerprint32",
      value.settlementOutputFingerprint32,
    ),
    recoveryPacketBinRoot32: assertNonzeroBytes32(
      "APNTImportCurrentTransactionProjectionV0.recoveryPacketBinRoot32",
      value.recoveryPacketBinRoot32,
    ),
    recoveryPacketTableCommitment32: assertNonzeroBytes32(
      "APNTImportCurrentTransactionProjectionV0.recoveryPacketTableCommitment32",
      value.recoveryPacketTableCommitment32,
    ),
    recoveryEnvelopeCommitment32: assertNonzeroBytes32(
      "APNTImportCurrentTransactionProjectionV0.recoveryEnvelopeCommitment32",
      value.recoveryEnvelopeCommitment32,
    ),
    feeSats,
    postageSats,
  });
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function writeU32(value: number): Uint8Array {
  return Uint8Array.of(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function writeU64(value: bigint): Uint8Array {
  const output = new Uint8Array(8);
  for (let index = 0; index < 8; index += 1) output[index] = Number((value >> BigInt(index * 8)) & 0xffn);
  return output;
}

function networkByte(network: APNTImportCurrentTransactionNetworkV0): number {
  return network === "chipnet" ? 0 : network === "mainnet" ? 1 : 2;
}

function networkFromByte(value: number): APNTImportCurrentTransactionNetworkV0 {
  if (value === 0) return "chipnet";
  if (value === 1) return "mainnet";
  if (value === 2) return "regtest";
  throw new Error("APNTImportCurrentTransactionProjectionV0 bytes have unsupported network");
}

function inputRoleByte(role: APNTImportCurrentTransactionInputRoleV0): number {
  if (role === APNT_IMPORT_CURRENT_TRANSACTION_INPUT_ROLE_V0.IMPORT_FUNDING) return 0;
  if (role === APNT_IMPORT_CURRENT_TRANSACTION_INPUT_ROLE_V0.VERIFIER_COLLATERAL) return 1;
  return 2;
}

function inputRoleFromByte(value: number): APNTImportCurrentTransactionInputRoleV0 {
  if (value === 0) return APNT_IMPORT_CURRENT_TRANSACTION_INPUT_ROLE_V0.IMPORT_FUNDING;
  if (value === 1) return APNT_IMPORT_CURRENT_TRANSACTION_INPUT_ROLE_V0.VERIFIER_COLLATERAL;
  if (value === 2) return APNT_IMPORT_CURRENT_TRANSACTION_INPUT_ROLE_V0.NOTE_BACKED_VERIFIER;
  throw new Error("APNTImportCurrentTransactionProjectionV0 bytes have unsupported input role");
}

function outputRoleByte(role: APNTImportCurrentTransactionOutputRoleV0): number {
  if (role === APNT_IMPORT_CURRENT_TRANSACTION_OUTPUT_ROLE_V0.PRIVATE_BACKING) return 0;
  if (role === APNT_IMPORT_CURRENT_TRANSACTION_OUTPUT_ROLE_V0.RECOVERY_PACKET_CARRIER) return 1;
  return 2;
}

function outputRoleFromByte(value: number): APNTImportCurrentTransactionOutputRoleV0 {
  if (value === 0) return APNT_IMPORT_CURRENT_TRANSACTION_OUTPUT_ROLE_V0.PRIVATE_BACKING;
  if (value === 1) return APNT_IMPORT_CURRENT_TRANSACTION_OUTPUT_ROLE_V0.RECOVERY_PACKET_CARRIER;
  if (value === 2) return APNT_IMPORT_CURRENT_TRANSACTION_OUTPUT_ROLE_V0.VERIFIER_COLLATERAL;
  throw new Error("APNTImportCurrentTransactionProjectionV0 bytes have unsupported output role");
}

function encodeOptionalIndex(value: number | null): Uint8Array {
  return value === null ? Uint8Array.of(0) : concatBytes([Uint8Array.of(1), writeU32(value)]);
}

function encodeNormalized(value: APNTImportCurrentTransactionProjectionV0): Uint8Array {
  return concatBytes([
    MAGIC,
    Uint8Array.of(value.version, networkByte(value.network)),
    value.transactionId32,
    writeU32(value.transactionVersion),
    writeU32(value.locktime),
    value.verifierProfileIdentity32,
    value.statementCommitment32,
    value.proofEvidenceCommitment32,
    writeU32(value.inputs.length),
    ...value.inputs.map((input) => concatBytes([
      serializeAPNTTransitionOutpointV1(input.outpoint),
      writeU32(input.sequenceNumber),
      writeU64(input.spentValueSats),
      input.spentLockingProgramIdentity32,
      Uint8Array.of(inputRoleByte(input.role)),
      encodeOptionalIndex(input.statementProjectionInputIndex),
    ])),
    writeU32(value.outputs.length),
    ...value.outputs.map((output) => concatBytes([
      writeU64(output.valueSats),
      output.lockingBytecodeCommitment32,
      Uint8Array.of(outputRoleByte(output.role)),
      writeU32(output.statementProjectionOutputIndex),
      encodeOptionalIndex(output.recoveryChunkIndex),
    ])),
    value.settlementOutputFingerprint32,
    value.recoveryPacketBinRoot32,
    value.recoveryPacketTableCommitment32,
    value.recoveryEnvelopeCommitment32,
    writeU64(value.feeSats),
    writeU64(value.postageSats),
  ]);
}

export function serializeAPNTImportCurrentTransactionProjectionV0(value: unknown): Uint8Array {
  return encodeNormalized(normalizeAPNTImportCurrentTransactionProjectionV0(value));
}

class Reader {
  private offset = 0;

  public constructor(private readonly bytes: Uint8Array) {}

  public take(name: string, length: number): Uint8Array {
    if (length < 0 || this.offset + length > this.bytes.length) {
      throw new Error(`APNTImportCurrentTransactionProjectionV0 bytes are truncated at ${name}`);
    }
    const result = this.bytes.slice(this.offset, this.offset + length);
    this.offset += length;
    return result;
  }

  public u8(name: string): number {
    return this.take(name, 1)[0] as number;
  }

  public u32(name: string): number {
    const bytes = this.take(name, 4);
    return ((bytes[0] as number) | ((bytes[1] as number) << 8) |
      ((bytes[2] as number) << 16) | ((bytes[3] as number) << 24)) >>> 0;
  }

  public u64(name: string): bigint {
    const bytes = this.take(name, 8);
    let result = 0n;
    for (let index = 0; index < bytes.length; index += 1) {
      result |= BigInt(bytes[index] as number) << BigInt(index * 8);
    }
    return result;
  }

  public bytes32(name: string): Bytes32 {
    return asBytes32(name, this.take(name, 32));
  }

  public finish(): void {
    if (this.offset !== this.bytes.length) {
      throw new Error("APNTImportCurrentTransactionProjectionV0 bytes contain trailing data");
    }
  }
}

function readOptionalIndex(reader: Reader, name: string): number | null {
  const presence = reader.u8(`${name}.presence`);
  if (presence === 0) return null;
  if (presence === 1) return reader.u32(name);
  throw new Error(`APNTImportCurrentTransactionProjectionV0 bytes have invalid ${name} presence`);
}

function readOutpoint(reader: Reader, name: string): APNTTransitionOutpointV1 {
  return Object.freeze({
    txid32: asBytes32(`${name}.txid32`, reader.take(`${name}.txid32`, 32).reverse()),
    vout: reader.u32(`${name}.vout`),
  });
}

function readCount(reader: Reader, name: string, maximum: number): number {
  const value = reader.u32(name);
  if (value === 0 || value > maximum) {
    throw new Error(`APNTImportCurrentTransactionProjectionV0 ${name} is outside the v0 bounds`);
  }
  return value;
}

export function parseAPNTImportCurrentTransactionProjectionV0(
  value: unknown,
): APNTImportCurrentTransactionProjectionV0 {
  if (!(value instanceof Uint8Array)) {
    throw new Error("APNTImportCurrentTransactionProjectionV0 bytes must be a Uint8Array");
  }
  const source = copyBytes(value);
  const reader = new Reader(source);
  const magic = reader.take("magic", MAGIC.length);
  if (magic.some((byte, index) => byte !== MAGIC[index])) {
    throw new Error("APNTImportCurrentTransactionProjectionV0 bytes have invalid magic");
  }
  const version = reader.u8("version");
  const network = networkFromByte(reader.u8("network"));
  const transactionId32 = reader.bytes32("transactionId32");
  const transactionVersion = reader.u32("transactionVersion");
  const locktime = reader.u32("locktime");
  const verifierProfileIdentity32 = reader.bytes32("verifierProfileIdentity32");
  const statementCommitment32 = reader.bytes32("statementCommitment32");
  const proofEvidenceCommitment32 = reader.bytes32("proofEvidenceCommitment32");
  const inputs = Array.from({
    length: readCount(reader, "input count", APNT_IMPORT_CURRENT_TRANSACTION_PROJECTION_V0_MAX_INPUTS),
  }, (_unused, index) => ({
    outpoint: readOutpoint(reader, `inputs[${String(index)}].outpoint`),
    sequenceNumber: reader.u32(`inputs[${String(index)}].sequenceNumber`),
    spentValueSats: reader.u64(`inputs[${String(index)}].spentValueSats`),
    spentLockingProgramIdentity32: reader.bytes32(
      `inputs[${String(index)}].spentLockingProgramIdentity32`,
    ),
    role: inputRoleFromByte(reader.u8(`inputs[${String(index)}].role`)),
    statementProjectionInputIndex: readOptionalIndex(
      reader,
      `inputs[${String(index)}].statementProjectionInputIndex`,
    ),
  }));
  const outputs = Array.from({
    length: readCount(reader, "output count", APNT_IMPORT_CURRENT_TRANSACTION_PROJECTION_V0_MAX_OUTPUTS),
  }, (_unused, index) => ({
    valueSats: reader.u64(`outputs[${String(index)}].valueSats`),
    lockingBytecodeCommitment32: reader.bytes32(
      `outputs[${String(index)}].lockingBytecodeCommitment32`,
    ),
    role: outputRoleFromByte(reader.u8(`outputs[${String(index)}].role`)),
    statementProjectionOutputIndex: reader.u32(
      `outputs[${String(index)}].statementProjectionOutputIndex`,
    ),
    recoveryChunkIndex: readOptionalIndex(reader, `outputs[${String(index)}].recoveryChunkIndex`),
  }));
  const normalized = normalizeAPNTImportCurrentTransactionProjectionV0({
    version,
    network,
    transactionId32,
    transactionVersion,
    locktime,
    verifierProfileIdentity32,
    statementCommitment32,
    proofEvidenceCommitment32,
    inputs,
    outputs,
    settlementOutputFingerprint32: reader.bytes32("settlementOutputFingerprint32"),
    recoveryPacketBinRoot32: reader.bytes32("recoveryPacketBinRoot32"),
    recoveryPacketTableCommitment32: reader.bytes32("recoveryPacketTableCommitment32"),
    recoveryEnvelopeCommitment32: reader.bytes32("recoveryEnvelopeCommitment32"),
    feeSats: reader.u64("feeSats"),
    postageSats: reader.u64("postageSats"),
  });
  reader.finish();
  if (encodeNormalized(normalized).some((byte, index) => byte !== source[index])) {
    throw new Error("APNTImportCurrentTransactionProjectionV0 bytes are not canonical");
  }
  return normalized;
}

export function deriveAPNTImportCurrentTransactionProjectionCommitmentV0(
  value: unknown,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_IMPORT_CURRENT_TRANSACTION_PROJECTION_V0_COMMITMENT_DOMAIN,
    serializeAPNTImportCurrentTransactionProjectionV0(value),
  );
}

export function deriveAPNTImportCurrentTransactionSpentProgramIdentityV0(
  lockingBytecode: Uint8Array,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_IMPORT_CURRENT_TRANSACTION_SPENT_PROGRAM_IDENTITY_DOMAIN,
    copyBytes(lockingBytecode),
  );
}

export function deriveAPNTImportCurrentTransactionOutputProgramCommitmentV0(
  lockingBytecode: Uint8Array,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_IMPORT_CURRENT_TRANSACTION_OUTPUT_PROGRAM_COMMITMENT_DOMAIN,
    copyBytes(lockingBytecode),
  );
}

export function deriveAPNTImportCurrentTransactionProofEvidenceCommitmentV0(
  orderedUnlockingBytecodes: readonly Uint8Array[],
): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_IMPORT_CURRENT_TRANSACTION_PROOF_EVIDENCE_COMMITMENT_DOMAIN,
    concatBytes([
      writeU32(orderedUnlockingBytecodes.length),
      ...orderedUnlockingBytecodes.map((bytecode) => concatBytes([writeU32(bytecode.length), copyBytes(bytecode)])),
    ]),
  );
}

export function deriveAPNTImportCurrentTransactionSettlementFingerprintV0(
  outputs: readonly APNTImportCurrentTransactionProjectionOutputV0[],
): Promise<Bytes32> {
  const normalized = outputs.map((output, index) => normalizeOutput(`outputs[${String(index)}]`, output));
  return sha256DomainSeparated(
    APNT_IMPORT_CURRENT_TRANSACTION_SETTLEMENT_FINGERPRINT_DOMAIN,
    concatBytes([
      writeU32(normalized.length),
      ...normalized.map((output) => concatBytes([
        writeU64(output.valueSats),
        output.lockingBytecodeCommitment32,
        Uint8Array.of(outputRoleByte(output.role)),
        writeU32(output.statementProjectionOutputIndex),
        encodeOptionalIndex(output.recoveryChunkIndex),
      ])),
    ]),
  );
}
