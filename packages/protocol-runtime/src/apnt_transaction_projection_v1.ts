// Maturity: stable — the shared transaction-projection type; 9 published
// protocol-runtime modules import it, including the frozen
// apnt_transition_settlement_projection_v0.ts chain. See AGENTS.md, "The
// maturity ladder".
import { asBytes32, copyBytes, type Bytes32 } from "./bytes.js";
import { APNT_V1_BCH_MAX_MONEY_SATS } from "./apnt_bundle_backed_private_note_v1.js";

export const APNT_BCH_TRANSACTION_PROJECTION_V1_VERSION = 1;
export const APNT_BCH_TRANSACTION_PROJECTION_V1_MAX_INPUTS = 8_192;
export const APNT_BCH_TRANSACTION_PROJECTION_V1_MAX_OUTPUTS = 8_192;
export const APNT_TRANSITION_STATEMENT_COMMITMENT_OFFSET_ABSENT_V1 = 0xffff_ffff;

export const APNT_TRANSITION_INPUT_BACKING_ROLE_V1 = Object.freeze({
  PRIVATE_BACKING: "private-backing",
  VERIFIER_ONLY: "verifier-only",
} as const);
export type APNTTransitionInputBackingRoleV1 =
  (typeof APNT_TRANSITION_INPUT_BACKING_ROLE_V1)[keyof typeof APNT_TRANSITION_INPUT_BACKING_ROLE_V1];

export const APNT_TRANSITION_OUTPUT_ROLE_V1 = Object.freeze({
  PRIVATE_BACKING: "private-backing",
  RECOVERY_PACKET_CARRIER: "recovery-packet-carrier",
  TRANSPARENT_EXIT: "transparent-exit",
  /**
   * One public aggregator-selected output paying the aggregator service fee.
   * Its value is excluded from private backing, note backing, and the network
   * fee, exactly as verifier-only and recovery-carrier values are excluded.
   */
  AGGREGATOR_FEE: "aggregator-fee",
  /**
   * The single Plane-A aggregation transition-boundary output
   * (`apnt_aggregation_transition_output_v0.ts`).
   *
   * It used to be modelled as "created backing cell 0", which was wrong in a
   * way that blocked the whole mandatory-exit property: Plane A's own locking
   * template embeds `newNoteBatchRoot32` and `planeBPacketBinCommitment32`,
   * both derived from the created notes' commitments, so requiring this output
   * to also be a conforming created-note seal was circular by construction.
   *
   * Giving it its own role breaks the cycle without removing or weakening
   * anything Plane A commits to: only the output's ROLE classification moves.
   * Its value is collateral pass-through, exactly like a recovery carrier's,
   * and is excluded from private backing and from the note-backing equation.
   */
  TRANSITION_BOUNDARY: "transition-boundary",
} as const);
export type APNTTransitionOutputRoleV1 =
  (typeof APNT_TRANSITION_OUTPUT_ROLE_V1)[keyof typeof APNT_TRANSITION_OUTPUT_ROLE_V1];

export type APNTTransitionOutpointV1 = Readonly<{
  /** Conventional RPC/display byte order; canonical bytes reverse this to BCH wire order. */
  txid32: Bytes32;
  vout: number;
}>;

export type APNTTransitionProjectionInputV1 = Readonly<{
  outpoint: APNTTransitionOutpointV1;
  sequenceNumber: number;
  spentValueSats: bigint;
  spentLockingBytecode: Uint8Array;
  /** V1 is BCH-only and accepts only the canonical absent-token value. */
  spentToken: null;
  backingRole: APNTTransitionInputBackingRoleV1;
}>;

export type APNTTransitionProjectionOutputV1 = Readonly<{
  valueSats: bigint;
  /** Exact public locking template with the statement-commitment slot zeroed when present. */
  lockingBytecodeTemplate: Uint8Array;
  statementCommitmentOffset: number | null;
  /** V1 is BCH-only and accepts only the canonical absent-token value. */
  token: null;
  role: APNTTransitionOutputRoleV1;
}>;

export type APNTBchTransactionProjectionV1 = Readonly<{
  version: typeof APNT_BCH_TRANSACTION_PROJECTION_V1_VERSION;
  transactionVersion: number;
  locktime: number;
  /** Exact BCH transaction input order; normalization never sorts this collection. */
  inputs: readonly APNTTransitionProjectionInputV1[];
  /** Exact BCH transaction output order; normalization never sorts this collection. */
  outputs: readonly APNTTransitionProjectionOutputV1[];
}>;

const MAX_U32 = 0xffff_ffff;

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

function assertBchValue(name: string, value: unknown): bigint {
  if (typeof value !== "bigint" || value < 0n || value > APNT_V1_BCH_MAX_MONEY_SATS) {
    throw new Error(`${name} must be a non-negative BCH bigint within the v1 money range`);
  }
  return value;
}

function assertBytes(name: string, value: unknown): Uint8Array {
  if (!(value instanceof Uint8Array)) throw new Error(`${name} must be a Uint8Array`);
  if (value.length > MAX_U32) throw new Error(`${name} exceeds u32 length framing`);
  return copyBytes(value);
}

function normalizeOutpoint(name: string, value: unknown): APNTTransitionOutpointV1 {
  assertRecord(name, value);
  assertKnownKeys(name, value, ["txid32", "vout"]);
  if (!(value.txid32 instanceof Uint8Array)) throw new Error(`${name}.txid32 must be a Uint8Array`);
  return Object.freeze({
    txid32: asBytes32(`${name}.txid32`, value.txid32),
    vout: assertU32(`${name}.vout`, value.vout),
  });
}

function normalizeInputRole(name: string, value: unknown): APNTTransitionInputBackingRoleV1 {
  if (
    value !== APNT_TRANSITION_INPUT_BACKING_ROLE_V1.PRIVATE_BACKING &&
    value !== APNT_TRANSITION_INPUT_BACKING_ROLE_V1.VERIFIER_ONLY
  ) {
    throw new Error(`${name} is unsupported`);
  }
  return value;
}

function normalizeOutputRole(name: string, value: unknown): APNTTransitionOutputRoleV1 {
  if (
    value !== APNT_TRANSITION_OUTPUT_ROLE_V1.PRIVATE_BACKING &&
    value !== APNT_TRANSITION_OUTPUT_ROLE_V1.RECOVERY_PACKET_CARRIER &&
    value !== APNT_TRANSITION_OUTPUT_ROLE_V1.TRANSPARENT_EXIT &&
    value !== APNT_TRANSITION_OUTPUT_ROLE_V1.AGGREGATOR_FEE &&
    value !== APNT_TRANSITION_OUTPUT_ROLE_V1.TRANSITION_BOUNDARY
  ) {
    throw new Error(`${name} is unsupported`);
  }
  return value;
}

function normalizeStatementSlot(
  name: string,
  template: Uint8Array,
  value: unknown,
): number | null {
  if (value === null) return null;
  const offset = assertU32(name, value);
  if (offset > template.length || template.length - offset < 32) {
    throw new Error(`${name} must identify a complete 32-byte slot`);
  }
  if (template.subarray(offset, offset + 32).some((byte) => byte !== 0)) {
    throw new Error(`${name} must identify a zeroed 32-byte statement commitment slot`);
  }
  return offset;
}

function normalizeInput(name: string, value: unknown): APNTTransitionProjectionInputV1 {
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
  return Object.freeze({
    outpoint: normalizeOutpoint(`${name}.outpoint`, value.outpoint),
    sequenceNumber: assertU32(`${name}.sequenceNumber`, value.sequenceNumber),
    spentValueSats: assertBchValue(`${name}.spentValueSats`, value.spentValueSats),
    spentLockingBytecode: assertBytes(`${name}.spentLockingBytecode`, value.spentLockingBytecode),
    spentToken: null,
    backingRole: normalizeInputRole(`${name}.backingRole`, value.backingRole),
  });
}

function normalizeOutput(name: string, value: unknown): APNTTransitionProjectionOutputV1 {
  assertRecord(name, value);
  assertKnownKeys(name, value, [
    "valueSats",
    "lockingBytecodeTemplate",
    "statementCommitmentOffset",
    "token",
    "role",
  ]);
  if (value.token !== null) throw new Error(`${name}.token must be null`);
  const lockingBytecodeTemplate = assertBytes(
    `${name}.lockingBytecodeTemplate`,
    value.lockingBytecodeTemplate,
  );
  return Object.freeze({
    valueSats: assertBchValue(`${name}.valueSats`, value.valueSats),
    lockingBytecodeTemplate,
    statementCommitmentOffset: normalizeStatementSlot(
      `${name}.statementCommitmentOffset`,
      lockingBytecodeTemplate,
      value.statementCommitmentOffset,
    ),
    token: null,
    role: normalizeOutputRole(`${name}.role`, value.role),
  });
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

function encodeBytes(value: Uint8Array): Uint8Array {
  return concatBytes([writeU32LE(value.length), value]);
}

function encodeOutpoint(value: APNTTransitionOutpointV1): Uint8Array {
  return concatBytes([new Uint8Array(value.txid32).reverse(), writeU32LE(value.vout)]);
}

function inputRoleByte(value: APNTTransitionInputBackingRoleV1): number {
  return value === APNT_TRANSITION_INPUT_BACKING_ROLE_V1.PRIVATE_BACKING ? 0 : 1;
}

function outputRoleByte(value: APNTTransitionOutputRoleV1): number {
  if (value === APNT_TRANSITION_OUTPUT_ROLE_V1.PRIVATE_BACKING) return 0;
  if (value === APNT_TRANSITION_OUTPUT_ROLE_V1.RECOVERY_PACKET_CARRIER) return 1;
  if (value === APNT_TRANSITION_OUTPUT_ROLE_V1.TRANSPARENT_EXIT) return 2;
  if (value === APNT_TRANSITION_OUTPUT_ROLE_V1.AGGREGATOR_FEE) return 3;
  if (value === APNT_TRANSITION_OUTPUT_ROLE_V1.TRANSITION_BOUNDARY) return 4;
  throw new Error("APNTBchTransactionProjectionV1 output role is unsupported");
}

function outpointKey(value: APNTTransitionOutpointV1): string {
  return Array.from(encodeOutpoint(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Canonical BCH wire outpoint encoding used by both V1 projection and creation-scope bytes. */
export function serializeAPNTTransitionOutpointV1(value: unknown): Uint8Array {
  return encodeOutpoint(normalizeOutpoint("APNTTransitionOutpointV1", value));
}

/**
 * Normalizes only exact public BCH transaction fields. It does not enforce a
 * privacy profile, mode-specific value equation, verifier capability, proof,
 * or chain acceptance.
 */
export function normalizeAPNTBchTransactionProjectionV1(
  value: unknown,
): APNTBchTransactionProjectionV1 {
  assertRecord("APNTBchTransactionProjectionV1", value);
  assertKnownKeys("APNTBchTransactionProjectionV1", value, [
    "version",
    "transactionVersion",
    "locktime",
    "inputs",
    "outputs",
  ]);
  if (value.version !== APNT_BCH_TRANSACTION_PROJECTION_V1_VERSION) {
    throw new Error("APNTBchTransactionProjectionV1.version must be 1");
  }
  if (!Array.isArray(value.inputs) || value.inputs.length === 0) {
    throw new Error("APNTBchTransactionProjectionV1.inputs must be a non-empty array");
  }
  if (value.inputs.length > APNT_BCH_TRANSACTION_PROJECTION_V1_MAX_INPUTS) {
    throw new Error("APNTBchTransactionProjectionV1.inputs exceeds the v1 input cap");
  }
  if (!Array.isArray(value.outputs) || value.outputs.length === 0) {
    throw new Error("APNTBchTransactionProjectionV1.outputs must be a non-empty array");
  }
  if (value.outputs.length > APNT_BCH_TRANSACTION_PROJECTION_V1_MAX_OUTPUTS) {
    throw new Error("APNTBchTransactionProjectionV1.outputs exceeds the v1 output cap");
  }

  const inputs = value.inputs.map((input, index) =>
    normalizeInput(`APNTBchTransactionProjectionV1.inputs[${String(index)}]`, input)
  );
  const outpointKeys = inputs.map((input) => outpointKey(input.outpoint));
  if (new Set(outpointKeys).size !== outpointKeys.length) {
    throw new Error("APNTBchTransactionProjectionV1.inputs must not contain duplicate outpoints");
  }
  const outputs = value.outputs.map((output, index) =>
    normalizeOutput(`APNTBchTransactionProjectionV1.outputs[${String(index)}]`, output)
  );

  return Object.freeze({
    version: APNT_BCH_TRANSACTION_PROJECTION_V1_VERSION,
    transactionVersion: assertU32(
      "APNTBchTransactionProjectionV1.transactionVersion",
      value.transactionVersion,
    ),
    locktime: assertU32("APNTBchTransactionProjectionV1.locktime", value.locktime),
    inputs: Object.freeze(inputs),
    outputs: Object.freeze(outputs),
  });
}

/** Exact APNTBchTransactionProjectionV1 bytes; input and output order is transaction-significant. */
export function serializeAPNTBchTransactionProjectionV1(value: unknown): Uint8Array {
  const projection = normalizeAPNTBchTransactionProjectionV1(value);
  const inputs = projection.inputs.map((input) => concatBytes([
    encodeOutpoint(input.outpoint),
    writeU32LE(input.sequenceNumber),
    writeU64LE(input.spentValueSats),
    encodeBytes(input.spentLockingBytecode),
    Uint8Array.of(0),
    Uint8Array.of(inputRoleByte(input.backingRole)),
  ]));
  const outputs = projection.outputs.map((output) => concatBytes([
    writeU64LE(output.valueSats),
    encodeBytes(output.lockingBytecodeTemplate),
    writeU32LE(
      output.statementCommitmentOffset ??
        APNT_TRANSITION_STATEMENT_COMMITMENT_OFFSET_ABSENT_V1,
    ),
    Uint8Array.of(0),
    Uint8Array.of(outputRoleByte(output.role)),
  ]));
  return concatBytes([
    Uint8Array.of(projection.version),
    writeU32LE(projection.transactionVersion),
    writeU32LE(projection.locktime),
    writeU32LE(inputs.length),
    ...inputs,
    writeU32LE(outputs.length),
    ...outputs,
  ]);
}

class ProjectionReader {
  private offset = 0;

  public constructor(private readonly bytes: Uint8Array) {}

  private take(name: string, length: number): Uint8Array {
    if (length < 0 || this.offset > this.bytes.length || this.bytes.length - this.offset < length) {
      throw new Error(`APNTBchTransactionProjectionV1 bytes are truncated at ${name}`);
    }
    const result = this.bytes.slice(this.offset, this.offset + length);
    this.offset += length;
    return result;
  }

  public u8(name: string): number {
    return this.take(name, 1)[0] as number;
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

  public fixed(name: string, length: number): Uint8Array {
    return this.take(name, length);
  }

  public framed(name: string): Uint8Array {
    return this.take(name, this.u32(`${name}.length`));
  }

  public finish(): void {
    if (this.offset !== this.bytes.length) {
      throw new Error("APNTBchTransactionProjectionV1 bytes contain trailing data");
    }
  }
}

function inputRoleFromByte(value: number): APNTTransitionInputBackingRoleV1 {
  if (value === 0) return APNT_TRANSITION_INPUT_BACKING_ROLE_V1.PRIVATE_BACKING;
  if (value === 1) return APNT_TRANSITION_INPUT_BACKING_ROLE_V1.VERIFIER_ONLY;
  throw new Error("APNTBchTransactionProjectionV1 bytes have unsupported input backing role");
}

function outputRoleFromByte(value: number): APNTTransitionOutputRoleV1 {
  if (value === 0) return APNT_TRANSITION_OUTPUT_ROLE_V1.PRIVATE_BACKING;
  if (value === 1) return APNT_TRANSITION_OUTPUT_ROLE_V1.RECOVERY_PACKET_CARRIER;
  if (value === 2) return APNT_TRANSITION_OUTPUT_ROLE_V1.TRANSPARENT_EXIT;
  if (value === 3) return APNT_TRANSITION_OUTPUT_ROLE_V1.AGGREGATOR_FEE;
  if (value === 4) return APNT_TRANSITION_OUTPUT_ROLE_V1.TRANSITION_BOUNDARY;
  throw new Error("APNTBchTransactionProjectionV1 bytes have unsupported output role");
}

/** Parses one exact projection and rejects unknown enums, token tags, truncation, and trailing bytes. */
export function parseAPNTBchTransactionProjectionV1(value: unknown): APNTBchTransactionProjectionV1 {
  if (!(value instanceof Uint8Array)) {
    throw new Error("APNTBchTransactionProjectionV1 bytes must be a Uint8Array");
  }
  const reader = new ProjectionReader(value);
  const version = reader.u8("version");
  if (version !== APNT_BCH_TRANSACTION_PROJECTION_V1_VERSION) {
    throw new Error("APNTBchTransactionProjectionV1 bytes have unsupported version");
  }
  const transactionVersion = reader.u32("transactionVersion");
  const locktime = reader.u32("locktime");
  const inputCount = reader.u32("inputCount");
  if (inputCount === 0 || inputCount > APNT_BCH_TRANSACTION_PROJECTION_V1_MAX_INPUTS) {
    throw new Error("APNTBchTransactionProjectionV1 bytes have invalid input count");
  }
  const inputs: APNTTransitionProjectionInputV1[] = [];
  for (let index = 0; index < inputCount; index += 1) {
    const wireTxid = reader.fixed(`inputs[${String(index)}].txid32`, 32);
    const vout = reader.u32(`inputs[${String(index)}].vout`);
    const sequenceNumber = reader.u32(`inputs[${String(index)}].sequenceNumber`);
    const spentValueSats = reader.u64(`inputs[${String(index)}].spentValueSats`);
    const spentLockingBytecode = reader.framed(`inputs[${String(index)}].spentLockingBytecode`);
    if (reader.u8(`inputs[${String(index)}].tokenPresence`) !== 0) {
      throw new Error("APNTBchTransactionProjectionV1 bytes contain token-bearing input data");
    }
    inputs.push({
      outpoint: {
        txid32: asBytes32(
          `APNTBchTransactionProjectionV1.inputs[${String(index)}].txid32`,
          wireTxid.reverse(),
        ),
        vout,
      },
      sequenceNumber,
      spentValueSats,
      spentLockingBytecode,
      spentToken: null,
      backingRole: inputRoleFromByte(reader.u8(`inputs[${String(index)}].backingRole`)),
    });
  }
  const outputCount = reader.u32("outputCount");
  if (outputCount === 0 || outputCount > APNT_BCH_TRANSACTION_PROJECTION_V1_MAX_OUTPUTS) {
    throw new Error("APNTBchTransactionProjectionV1 bytes have invalid output count");
  }
  const outputs: APNTTransitionProjectionOutputV1[] = [];
  for (let index = 0; index < outputCount; index += 1) {
    const valueSats = reader.u64(`outputs[${String(index)}].valueSats`);
    const lockingBytecodeTemplate = reader.framed(
      `outputs[${String(index)}].lockingBytecodeTemplate`,
    );
    const encodedOffset = reader.u32(`outputs[${String(index)}].statementCommitmentOffset`);
    if (reader.u8(`outputs[${String(index)}].tokenPresence`) !== 0) {
      throw new Error("APNTBchTransactionProjectionV1 bytes contain token-bearing output data");
    }
    outputs.push({
      valueSats,
      lockingBytecodeTemplate,
      statementCommitmentOffset:
        encodedOffset === APNT_TRANSITION_STATEMENT_COMMITMENT_OFFSET_ABSENT_V1
          ? null
          : encodedOffset,
      token: null,
      role: outputRoleFromByte(reader.u8(`outputs[${String(index)}].role`)),
    });
  }
  reader.finish();
  return normalizeAPNTBchTransactionProjectionV1({
    version,
    transactionVersion,
    locktime,
    inputs,
    outputs,
  });
}
