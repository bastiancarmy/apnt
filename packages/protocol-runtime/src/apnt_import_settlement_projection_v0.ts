// Maturity: preview — measured zero published importers and no published
// artifact references it. Read it, don't build on it. See AGENTS.md, "The
// maturity ladder".
import { asBytes32, copyBytes, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { APNT_V1_BCH_MAX_MONEY_SATS } from "./apnt_bundle_backed_private_note_v1.js";
import {
  type APNTTransitionOutpointV1,
} from "./apnt_transaction_projection_v1.js";

/**
 * Proof-independent, single-transaction settlement projection. Roles and
 * statement mappings are fixed by the authenticated 12-input/20-output
 * profile, so they are not duplicated in the byte transcript.
 */
export const APNT_IMPORT_SETTLEMENT_PROJECTION_V0_VERSION = 0;
export const APNT_IMPORT_SETTLEMENT_PROJECTION_V0_MAGIC = "APNTSPV0";
export const APNT_IMPORT_SETTLEMENT_PROJECTION_V0_COMMITMENT_DOMAIN =
  "bch-cloak-apnt-v0:import-settlement-projection-commitment-v0";
export const APNT_IMPORT_SETTLEMENT_PROJECTION_V0_INPUT_COUNT = 12;
export const APNT_IMPORT_SETTLEMENT_PROJECTION_V0_OUTPUT_COUNT = 20;
export const APNT_IMPORT_SETTLEMENT_PROJECTION_V0_RECOVERY_FIRST_OUTPUT_INDEX = 4;
export const APNT_IMPORT_SETTLEMENT_PROJECTION_V0_RECOVERY_OUTPUT_COUNT = 15;
export const APNT_IMPORT_SETTLEMENT_PROJECTION_V0_VERIFIER_COLLATERAL_OUTPUT_INDEX = 19;
export const APNT_IMPORT_SETTLEMENT_PROJECTION_V0_STAGE_LOCKING_BYTES = 54;
export const APNT_IMPORT_SETTLEMENT_PROJECTION_V0_RECOVERY_LOCKING_BYTES = 201;

const MAGIC = new TextEncoder().encode(APNT_IMPORT_SETTLEMENT_PROJECTION_V0_MAGIC);
const MAXIMUM_PROJECTED_LOCKING_BYTECODE_BYTES = 10_000;

export type APNTImportSettlementProjectionNetworkV0 = "chipnet" | "mainnet" | "regtest";

export type APNTImportSettlementProjectionInputV0 = Readonly<{
  outpoint: APNTTransitionOutpointV1;
  sequenceNumber: number;
  spentValueSats: bigint;
  spentLockingBytecode: Uint8Array;
  token: null;
}>;

export type APNTImportSettlementProjectionOutputV0 = Readonly<{
  valueSats: bigint;
  lockingBytecode: Uint8Array;
  token: null;
}>;

/**
 * This transcript deliberately excludes the final transaction ID, every
 * unlocking bytecode, signatures, proof-specific certificate bytes, and any
 * caller lifecycle status. CashVM can introspect every included transaction
 * field; network and profile are authenticated constants in the selected
 * verifier profile.
 */
export type APNTImportSettlementProjectionV0 = Readonly<{
  version: typeof APNT_IMPORT_SETTLEMENT_PROJECTION_V0_VERSION;
  network: APNTImportSettlementProjectionNetworkV0;
  verifierProfileIdentity32: Bytes32;
  transactionVersion: number;
  locktime: number;
  inputs: readonly APNTImportSettlementProjectionInputV0[];
  outputs: readonly APNTImportSettlementProjectionOutputV0[];
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

function checkedBchSum(name: string, values: readonly bigint[]): bigint {
  let total = 0n;
  for (const value of values) {
    if (value > APNT_V1_BCH_MAX_MONEY_SATS - total) {
      throw new Error(`${name} exceeds APNT_V1_BCH_MAX_MONEY_SATS`);
    }
    total += value;
  }
  return total;
}

function deriveExactFeeSats(name: string, totalInputValueSats: bigint, totalOutputValueSats: bigint): bigint {
  if (totalOutputValueSats > totalInputValueSats) {
    throw new Error(`${name}.feeSats must equal inputs minus outputs`);
  }
  return totalInputValueSats - totalOutputValueSats;
}

function assertNonzeroBytes32(name: string, value: unknown): Bytes32 {
  if (!(value instanceof Uint8Array)) throw new Error(`${name} must be a Uint8Array`);
  const bytes = asBytes32(name, value);
  if (bytes.every((byte) => byte === 0)) throw new Error(`${name} must not be all zero`);
  return bytes;
}

function normalizeNetwork(value: unknown): APNTImportSettlementProjectionNetworkV0 {
  if (value !== "chipnet" && value !== "mainnet" && value !== "regtest") {
    throw new Error("APNTImportSettlementProjectionV0.network is unsupported");
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

function normalizeLockingBytecode(name: string, value: unknown, expectedLength: number): Uint8Array {
  if (!(value instanceof Uint8Array)) throw new Error(`${name} must be a Uint8Array`);
  if (value.length !== expectedLength || value.length > MAXIMUM_PROJECTED_LOCKING_BYTECODE_BYTES) {
    throw new Error(`${name} must contain exactly ${String(expectedLength)} bytes`);
  }
  return copyBytes(value);
}

function normalizeInput(name: string, value: unknown): APNTImportSettlementProjectionInputV0 {
  assertRecord(name, value);
  assertKnownKeys(name, value, [
    "outpoint",
    "sequenceNumber",
    "spentValueSats",
    "spentLockingBytecode",
    "token",
  ]);
  if (value.token !== null) throw new Error(`${name}.token must be null`);
  return Object.freeze({
    outpoint: normalizeOutpoint(`${name}.outpoint`, value.outpoint),
    sequenceNumber: assertU32(`${name}.sequenceNumber`, value.sequenceNumber),
    spentValueSats: assertBchValue(`${name}.spentValueSats`, value.spentValueSats, true),
    spentLockingBytecode: normalizeLockingBytecode(
      `${name}.spentLockingBytecode`,
      value.spentLockingBytecode,
      APNT_IMPORT_SETTLEMENT_PROJECTION_V0_STAGE_LOCKING_BYTES,
    ),
    token: null,
  });
}

function normalizeOutput(
  name: string,
  value: unknown,
  expectedLockingLength: number,
): APNTImportSettlementProjectionOutputV0 {
  assertRecord(name, value);
  assertKnownKeys(name, value, ["valueSats", "lockingBytecode", "token"]);
  if (value.token !== null) throw new Error(`${name}.token must be null`);
  return Object.freeze({
    valueSats: assertBchValue(`${name}.valueSats`, value.valueSats, true),
    lockingBytecode: normalizeLockingBytecode(
      `${name}.lockingBytecode`,
      value.lockingBytecode,
      expectedLockingLength,
    ),
    token: null,
  });
}

function outpointKey(outpoint: APNTTransitionOutpointV1): string {
  return `${Array.from(outpoint.txid32, (byte) => byte.toString(16).padStart(2, "0")).join("")}:${String(outpoint.vout)}`;
}

export function normalizeAPNTImportSettlementProjectionV0(
  value: unknown,
): APNTImportSettlementProjectionV0 {
  const name = "APNTImportSettlementProjectionV0";
  assertRecord(name, value);
  assertKnownKeys(name, value, [
    "version",
    "network",
    "verifierProfileIdentity32",
    "transactionVersion",
    "locktime",
    "inputs",
    "outputs",
    "feeSats",
    "postageSats",
  ]);
  if (value.version !== APNT_IMPORT_SETTLEMENT_PROJECTION_V0_VERSION) {
    throw new Error(`${name}.version must be 0`);
  }
  if (!Array.isArray(value.inputs) ||
      value.inputs.length !== APNT_IMPORT_SETTLEMENT_PROJECTION_V0_INPUT_COUNT) {
    throw new Error(`${name}.inputs must contain exactly 12 ordered sources`);
  }
  if (!Array.isArray(value.outputs) ||
      value.outputs.length !== APNT_IMPORT_SETTLEMENT_PROJECTION_V0_OUTPUT_COUNT) {
    throw new Error(`${name}.outputs must contain exactly 20 ordered settlement outputs`);
  }
  const inputs = value.inputs.map((input, index) => normalizeInput(`${name}.inputs[${String(index)}]`, input));
  if (new Set(inputs.map((input) => outpointKey(input.outpoint))).size !== inputs.length) {
    throw new Error(`${name}.inputs contains a duplicate outpoint`);
  }
  const outputs = value.outputs.map((output, index) => normalizeOutput(
    `${name}.outputs[${String(index)}]`,
    output,
    index >= APNT_IMPORT_SETTLEMENT_PROJECTION_V0_RECOVERY_FIRST_OUTPUT_INDEX &&
      index < APNT_IMPORT_SETTLEMENT_PROJECTION_V0_VERIFIER_COLLATERAL_OUTPUT_INDEX
      ? APNT_IMPORT_SETTLEMENT_PROJECTION_V0_RECOVERY_LOCKING_BYTES
      : APNT_IMPORT_SETTLEMENT_PROJECTION_V0_STAGE_LOCKING_BYTES,
  ));
  const feeSats = assertBchValue(`${name}.feeSats`, value.feeSats, true);
  const postageSats = assertBchValue(`${name}.postageSats`, value.postageSats, true);
  const totalInputValueSats = checkedBchSum(
    `${name}.totalInputValueSats`,
    inputs.map((input) => input.spentValueSats),
  );
  const totalOutputValueSats = checkedBchSum(
    `${name}.totalOutputValueSats`,
    outputs.map((output) => output.valueSats),
  );
  if (deriveExactFeeSats(name, totalInputValueSats, totalOutputValueSats) !== feeSats) {
    throw new Error(`${name}.feeSats must equal inputs minus outputs`);
  }
  const recoveryPostageSats = checkedBchSum(
    `${name}.recoveryPostageSats`,
    outputs.slice(
      APNT_IMPORT_SETTLEMENT_PROJECTION_V0_RECOVERY_FIRST_OUTPUT_INDEX,
      APNT_IMPORT_SETTLEMENT_PROJECTION_V0_RECOVERY_FIRST_OUTPUT_INDEX +
        APNT_IMPORT_SETTLEMENT_PROJECTION_V0_RECOVERY_OUTPUT_COUNT,
    )
      .map((output) => output.valueSats),
  );
  if (recoveryPostageSats !== postageSats) {
    throw new Error(`${name}.postageSats must equal ordered recovery-output values`);
  }
  return Object.freeze({
    version: APNT_IMPORT_SETTLEMENT_PROJECTION_V0_VERSION,
    network: normalizeNetwork(value.network),
    verifierProfileIdentity32: assertNonzeroBytes32(
      `${name}.verifierProfileIdentity32`,
      value.verifierProfileIdentity32,
    ),
    transactionVersion: assertU32(`${name}.transactionVersion`, value.transactionVersion),
    locktime: assertU32(`${name}.locktime`, value.locktime),
    inputs: Object.freeze(inputs),
    outputs: Object.freeze(outputs),
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
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number((value >> BigInt(index * 8)) & 0xffn);
  }
  return output;
}

function networkByte(network: APNTImportSettlementProjectionNetworkV0): number {
  return network === "chipnet" ? 0 : network === "mainnet" ? 1 : 2;
}

function networkFromByte(value: number): APNTImportSettlementProjectionNetworkV0 {
  if (value === 0) return "chipnet";
  if (value === 1) return "mainnet";
  if (value === 2) return "regtest";
  throw new Error("APNTImportSettlementProjectionV0 bytes have unsupported network");
}

function encodeNormalized(value: APNTImportSettlementProjectionV0): Uint8Array {
  return concatBytes([
    MAGIC,
    Uint8Array.of(value.version, networkByte(value.network)),
    value.verifierProfileIdentity32,
    writeU32(value.transactionVersion),
    writeU32(value.locktime),
    /**
     * The on-chain gate reconstructs this same transcript via
     * `OP_OUTPOINTTXHASH OP_REVERSEBYTES`, which converts the VM's wire-order
     * introspection value back to this codebase's natural/display-order
     * `txid32` convention — so `txid32` is written here directly, NOT through
     * `serializeAPNTTransitionOutpointV1` (which is correctly BCH-wire-ordered
     * for its own, different callers, but wrong for this transcript).
     */
    ...value.inputs.map((input) => concatBytes([
      input.outpoint.txid32,
      writeU32(input.outpoint.vout),
      writeU32(input.sequenceNumber),
      writeU64(input.spentValueSats),
      input.spentLockingBytecode,
    ])),
    ...value.outputs.map((output) => concatBytes([
      writeU64(output.valueSats),
      output.lockingBytecode,
    ])),
  ]);
}

export function serializeAPNTImportSettlementProjectionV0(value: unknown): Uint8Array {
  return encodeNormalized(normalizeAPNTImportSettlementProjectionV0(value));
}

class Reader {
  private offset = 0;

  public constructor(private readonly bytes: Uint8Array) {}

  public take(name: string, length: number): Uint8Array {
    if (!Number.isSafeInteger(length) || length < 0 || this.offset + length > this.bytes.length) {
      throw new Error(`APNTImportSettlementProjectionV0 bytes are truncated at ${name}`);
    }
    const output = this.bytes.slice(this.offset, this.offset + length);
    this.offset += length;
    return output;
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
      throw new Error("APNTImportSettlementProjectionV0 bytes contain trailing data");
    }
  }
}

function readOutpoint(reader: Reader, name: string): APNTTransitionOutpointV1 {
  /** Mirrors the natural/display-order write in `encodeNormalized`; no reversal. */
  return Object.freeze({
    txid32: asBytes32(`${name}.txid32`, reader.take(`${name}.txid32`, 32)),
    vout: reader.u32(`${name}.vout`),
  });
}

export function parseAPNTImportSettlementProjectionV0(value: unknown): APNTImportSettlementProjectionV0 {
  if (!(value instanceof Uint8Array)) {
    throw new Error("APNTImportSettlementProjectionV0 bytes must be a Uint8Array");
  }
  const source = copyBytes(value);
  const reader = new Reader(source);
  const magic = reader.take("magic", MAGIC.length);
  if (magic.some((byte, index) => byte !== MAGIC[index])) {
    throw new Error("APNTImportSettlementProjectionV0 bytes have invalid magic");
  }
  const version = reader.u8("version");
  const network = networkFromByte(reader.u8("network"));
  const verifierProfileIdentity32 = reader.bytes32("verifierProfileIdentity32");
  const transactionVersion = reader.u32("transactionVersion");
  const locktime = reader.u32("locktime");
  const inputCount = APNT_IMPORT_SETTLEMENT_PROJECTION_V0_INPUT_COUNT;
  const inputs = Array.from({ length: inputCount }, (_unused, index) => {
    const name = `inputs[${String(index)}]`;
    const outpoint = readOutpoint(reader, `${name}.outpoint`);
    const sequenceNumber = reader.u32(`${name}.sequenceNumber`);
    const spentValueSats = reader.u64(`${name}.spentValueSats`);
    const spentLockingBytecode = reader.take(
      `${name}.spentLockingBytecode`,
      APNT_IMPORT_SETTLEMENT_PROJECTION_V0_STAGE_LOCKING_BYTES,
    );
    return { outpoint, sequenceNumber, spentValueSats, spentLockingBytecode, token: null };
  });
  const outputCount = APNT_IMPORT_SETTLEMENT_PROJECTION_V0_OUTPUT_COUNT;
  const outputs = Array.from({ length: outputCount }, (_unused, index) => {
    const name = `outputs[${String(index)}]`;
    const valueSats = reader.u64(`${name}.valueSats`);
    const lockingBytecode = reader.take(
      `${name}.lockingBytecode`,
      index >= APNT_IMPORT_SETTLEMENT_PROJECTION_V0_RECOVERY_FIRST_OUTPUT_INDEX &&
        index < APNT_IMPORT_SETTLEMENT_PROJECTION_V0_VERIFIER_COLLATERAL_OUTPUT_INDEX
        ? APNT_IMPORT_SETTLEMENT_PROJECTION_V0_RECOVERY_LOCKING_BYTES
        : APNT_IMPORT_SETTLEMENT_PROJECTION_V0_STAGE_LOCKING_BYTES,
    );
    return { valueSats, lockingBytecode, token: null };
  });
  const totalInputValueSats = checkedBchSum(
    "APNTImportSettlementProjectionV0.totalInputValueSats",
    inputs.map((input) => input.spentValueSats),
  );
  const totalOutputValueSats = checkedBchSum(
    "APNTImportSettlementProjectionV0.totalOutputValueSats",
    outputs.map((output) => output.valueSats),
  );
  const postageSats = checkedBchSum(
    "APNTImportSettlementProjectionV0.recoveryPostageSats",
    outputs.slice(
      APNT_IMPORT_SETTLEMENT_PROJECTION_V0_RECOVERY_FIRST_OUTPUT_INDEX,
      APNT_IMPORT_SETTLEMENT_PROJECTION_V0_VERIFIER_COLLATERAL_OUTPUT_INDEX,
    )
      .map((output) => output.valueSats),
  );
  const normalized = normalizeAPNTImportSettlementProjectionV0({
    version,
    network,
    verifierProfileIdentity32,
    transactionVersion,
    locktime,
    inputs,
    outputs,
    feeSats: deriveExactFeeSats(
      "APNTImportSettlementProjectionV0",
      totalInputValueSats,
      totalOutputValueSats,
    ),
    postageSats,
  });
  reader.finish();
  if (encodeNormalized(normalized).some((byte, index) => byte !== source[index])) {
    throw new Error("APNTImportSettlementProjectionV0 bytes are not canonical");
  }
  return normalized;
}

export function deriveAPNTImportSettlementProjectionCommitmentV0(value: unknown): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_IMPORT_SETTLEMENT_PROJECTION_V0_COMMITMENT_DOMAIN,
    serializeAPNTImportSettlementProjectionV0(value),
  );
}
