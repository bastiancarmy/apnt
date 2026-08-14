// Maturity: superseded — replaced by the frozen apnt_transition_statement_v1.ts.
// Retained because serializeAPNTTransitionOutpointV0 is still imported by
// apnt_creation_scope_v1.ts, apnt_creation_scope_v2.ts and
// apnt_nullifier_v0.ts. No published artifact pins its own APNTTSV0 wire
// format. See AGENTS.md, "The maturity ladder".
import { asBytes32, copyBytes, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";

export const APNT_TRANSITION_STATEMENT_V0_VERSION = 0;
export const APNT_TRANSITION_STATEMENT_V0_PROTOCOL_DOMAIN = "bch-cloak-apnt-v0";
export const APNT_TRANSITION_STATEMENT_V0_COMMITMENT_DOMAIN =
  "bch-cloak-apnt-v0:transition-statement-commitment-v0";
export const APNT_BCH_TRANSACTION_PROJECTION_V0_VERSION = 0;
export const APNT_TRANSITION_CREATED_OUTPUT_ROLE_V0 = "created-private-note";
export const APNT_TRANSITION_OUTPOINT_V0_BYTE_LENGTH = 36;

const MAGIC = Uint8Array.of(0x41, 0x50, 0x4e, 0x54, 0x54, 0x53, 0x56, 0x30); // APNTTSV0
const TEXT_ENCODER = new TextEncoder();
const MAX_UINT32 = 0xffff_ffff;
const MAX_UINT64 = 0xffff_ffff_ffff_ffffn;
const NULL_STATEMENT_COMMITMENT_OFFSET = MAX_UINT32;

export type APNTTransitionNetworkV0 = "chipnet" | "mainnet" | "regtest";

/** txid32 uses conventional RPC/display byte order; canonical outpoint bytes reverse it to BCH wire order. */
export type APNTTransitionOutpointV0 = Readonly<{
  txid32: Bytes32;
  vout: number;
}>;

export type APNTTransitionConsumedItemV0 = Readonly<{
  sealOutpoint: APNTTransitionOutpointV0;
  consumedNoteCommitment32: Bytes32;
  nullifier32: Bytes32;
  sealCommitment32: Bytes32;
}>;

export type APNTTransitionTokenDataV0 = Readonly<{
  category32: Bytes32;
  amount: bigint;
  nft: Readonly<{
    capability: "immutable" | "mutable" | "minting";
    commitment: Uint8Array;
  }> | null;
}>;

export type APNTTransitionProjectionInputV0 = Readonly<{
  outpoint: APNTTransitionOutpointV0;
  sequenceNumber: number;
  spentValueSats: bigint;
  spentLockingBytecode: Uint8Array;
  spentToken: APNTTransitionTokenDataV0 | null;
  role: "designated-verifier" | "consumed-note-seal";
}>;

export type APNTTransitionProjectionOutputV0 = Readonly<{
  valueSats: bigint;
  lockingBytecodeTemplate: Uint8Array;
  /** Offset of a zeroed 32-byte slot replaced by statementCommitment32, or null if absent. */
  statementCommitmentOffset: number | null;
  token: APNTTransitionTokenDataV0 | null;
  role: "created-private-note" | "recovery-packet-carrier";
}>;

export type APNTBchTransactionProjectionV0 = Readonly<{
  version: typeof APNT_BCH_TRANSACTION_PROJECTION_V0_VERSION;
  transactionVersion: number;
  locktime: number;
  inputs: readonly APNTTransitionProjectionInputV0[];
  outputs: readonly APNTTransitionProjectionOutputV0[];
}>;

export type APNTTransitionCreatedItemV0 = Readonly<{
  outputIndex: number;
  createdNoteCommitment32: Bytes32;
  valueSats: bigint;
  lockingBytecodeTemplate: Uint8Array;
  statementCommitmentOffset: number;
  recoveryPacketIndex: number;
  recoveryPacketHash32: Bytes32;
  outputRole: typeof APNT_TRANSITION_CREATED_OUTPUT_ROLE_V0;
}>;

export type APNTTransitionPublicValueTermsV0 = Readonly<{
  totalInputValueSats: bigint;
  totalOutputValueSats: bigint;
}>;

export type APNTTransitionStatementV0 = Readonly<{
  version: typeof APNT_TRANSITION_STATEMENT_V0_VERSION;
  protocolDomain: typeof APNT_TRANSITION_STATEMENT_V0_PROTOCOL_DOMAIN;
  network: APNTTransitionNetworkV0;
  proofRelationId32: Bytes32;
  sp1ProgramId32: Bytes32;
  verifierArtifactId32: Bytes32;
  designatedVerifierInputIndex: number;
  consumedItems: readonly APNTTransitionConsumedItemV0[];
  createdItems: readonly APNTTransitionCreatedItemV0[];
  /** ApntRecoveryPacketBinV0.batchManifestRoot32 for the canonical v0 packet table/bin. */
  recoveryPacketTableCommitment32: Bytes32;
  authorizedFeeSats: bigint;
  publicValueTerms: APNTTransitionPublicValueTermsV0;
  transactionProjection: APNTBchTransactionProjectionV0;
  batchNonce32: Bytes32;
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

function assertLiteral<T extends string | number>(name: string, value: unknown, expected: T): T {
  if (value !== expected) throw new Error(`${name} must be ${String(expected)}`);
  return expected;
}

function assertUint32(name: string, value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > MAX_UINT32) {
    throw new Error(`${name} must be a uint32`);
  }
  return value as number;
}

function assertUint64(name: string, value: unknown): bigint {
  if (typeof value !== "bigint" || value < 0n || value > MAX_UINT64) {
    throw new Error(`${name} must be a uint64 bigint`);
  }
  return value;
}

function assertBytes(name: string, value: unknown): Uint8Array {
  if (!(value instanceof Uint8Array)) throw new Error(`${name} must be a Uint8Array`);
  if (value.length > MAX_UINT32) throw new Error(`${name} exceeds uint32 length framing`);
  return copyBytes(value);
}

function assertBytes32(name: string, value: unknown): Bytes32 {
  if (!(value instanceof Uint8Array)) throw new Error(`${name} must be a Uint8Array`);
  return asBytes32(name, value);
}

function normalizeNetwork(name: string, value: unknown): APNTTransitionNetworkV0 {
  if (value !== "chipnet" && value !== "mainnet" && value !== "regtest") {
    throw new Error(`${name} must be chipnet, mainnet, or regtest`);
  }
  return value;
}

function normalizeOutpoint(name: string, value: unknown): APNTTransitionOutpointV0 {
  assertRecord(name, value);
  assertKnownKeys(name, value, ["txid32", "vout"]);
  return Object.freeze({
    txid32: assertBytes32(`${name}.txid32`, value.txid32),
    vout: assertUint32(`${name}.vout`, value.vout),
  });
}

function normalizeToken(name: string, value: unknown): APNTTransitionTokenDataV0 | null {
  if (value === null) return null;
  assertRecord(name, value);
  assertKnownKeys(name, value, ["category32", "amount", "nft"]);
  const amount = assertUint64(`${name}.amount`, value.amount);
  let nft: APNTTransitionTokenDataV0["nft"] = null;
  if (value.nft !== null) {
    assertRecord(`${name}.nft`, value.nft);
    assertKnownKeys(`${name}.nft`, value.nft, ["capability", "commitment"]);
    if (
      value.nft.capability !== "immutable" &&
      value.nft.capability !== "mutable" &&
      value.nft.capability !== "minting"
    ) {
      throw new Error(`${name}.nft.capability is unsupported`);
    }
    nft = Object.freeze({
      capability: value.nft.capability,
      commitment: assertBytes(`${name}.nft.commitment`, value.nft.commitment),
    });
  }
  if (amount === 0n && nft === null) throw new Error(`${name} must carry fungible tokens or an NFT`);
  return Object.freeze({
    category32: assertBytes32(`${name}.category32`, value.category32),
    amount,
    nft,
  });
}

function normalizeStatementSlot(
  name: string,
  template: Uint8Array,
  value: unknown,
  required: boolean,
): number | null {
  if (value === null && !required) return null;
  const offset = assertUint32(name, value);
  if (offset + 32 > template.length) throw new Error(`${name} must identify a complete 32-byte slot`);
  if (template.subarray(offset, offset + 32).some((byte) => byte !== 0)) {
    throw new Error(`${name} must identify a zeroed 32-byte statement commitment slot`);
  }
  return offset;
}

function normalizeProjectionInput(name: string, value: unknown): APNTTransitionProjectionInputV0 {
  assertRecord(name, value);
  assertKnownKeys(name, value, [
    "outpoint",
    "sequenceNumber",
    "spentValueSats",
    "spentLockingBytecode",
    "spentToken",
    "role",
  ]);
  if (value.role !== "designated-verifier" && value.role !== "consumed-note-seal") {
    throw new Error(`${name}.role is unsupported`);
  }
  return Object.freeze({
    outpoint: normalizeOutpoint(`${name}.outpoint`, value.outpoint),
    sequenceNumber: assertUint32(`${name}.sequenceNumber`, value.sequenceNumber),
    spentValueSats: assertUint64(`${name}.spentValueSats`, value.spentValueSats),
    spentLockingBytecode: assertBytes(`${name}.spentLockingBytecode`, value.spentLockingBytecode),
    spentToken: normalizeToken(`${name}.spentToken`, value.spentToken),
    role: value.role,
  });
}

function normalizeProjectionOutput(name: string, value: unknown): APNTTransitionProjectionOutputV0 {
  assertRecord(name, value);
  assertKnownKeys(name, value, [
    "valueSats",
    "lockingBytecodeTemplate",
    "statementCommitmentOffset",
    "token",
    "role",
  ]);
  if (value.role !== "created-private-note" && value.role !== "recovery-packet-carrier") {
    throw new Error(`${name}.role is unsupported`);
  }
  const lockingBytecodeTemplate = assertBytes(
    `${name}.lockingBytecodeTemplate`,
    value.lockingBytecodeTemplate,
  );
  const statementCommitmentOffset = normalizeStatementSlot(
    `${name}.statementCommitmentOffset`,
    lockingBytecodeTemplate,
    value.statementCommitmentOffset,
    value.role === "created-private-note",
  );
  return Object.freeze({
    valueSats: assertUint64(`${name}.valueSats`, value.valueSats),
    lockingBytecodeTemplate,
    statementCommitmentOffset,
    token: normalizeToken(`${name}.token`, value.token),
    role: value.role,
  });
}

function normalizeProjection(name: string, value: unknown): APNTBchTransactionProjectionV0 {
  assertRecord(name, value);
  assertKnownKeys(name, value, ["version", "transactionVersion", "locktime", "inputs", "outputs"]);
  if (!Array.isArray(value.inputs) || value.inputs.length === 0) {
    throw new Error(`${name}.inputs must be a non-empty array`);
  }
  if (!Array.isArray(value.outputs) || value.outputs.length === 0) {
    throw new Error(`${name}.outputs must be a non-empty array`);
  }
  const inputs = Object.freeze(
    value.inputs.map((input, index) => normalizeProjectionInput(`${name}.inputs[${String(index)}]`, input)),
  );
  const outputs = Object.freeze(
    value.outputs.map((output, index) => normalizeProjectionOutput(`${name}.outputs[${String(index)}]`, output)),
  );
  const verifierCount = inputs.filter((input) => input.role === "designated-verifier").length;
  if (verifierCount !== 1) throw new Error(`${name}.inputs must contain exactly one designated verifier`);
  return Object.freeze({
    version: assertLiteral(`${name}.version`, value.version, APNT_BCH_TRANSACTION_PROJECTION_V0_VERSION),
    transactionVersion: assertUint32(`${name}.transactionVersion`, value.transactionVersion),
    locktime: assertUint32(`${name}.locktime`, value.locktime),
    inputs,
    outputs,
  });
}

function normalizeConsumedItem(name: string, value: unknown): APNTTransitionConsumedItemV0 {
  assertRecord(name, value);
  assertKnownKeys(name, value, [
    "sealOutpoint",
    "consumedNoteCommitment32",
    "nullifier32",
    "sealCommitment32",
  ]);
  return Object.freeze({
    sealOutpoint: normalizeOutpoint(`${name}.sealOutpoint`, value.sealOutpoint),
    consumedNoteCommitment32: assertBytes32(
      `${name}.consumedNoteCommitment32`,
      value.consumedNoteCommitment32,
    ),
    nullifier32: assertBytes32(`${name}.nullifier32`, value.nullifier32),
    sealCommitment32: assertBytes32(`${name}.sealCommitment32`, value.sealCommitment32),
  });
}

function normalizeCreatedItem(name: string, value: unknown): APNTTransitionCreatedItemV0 {
  assertRecord(name, value);
  assertKnownKeys(name, value, [
    "outputIndex",
    "createdNoteCommitment32",
    "valueSats",
    "lockingBytecodeTemplate",
    "statementCommitmentOffset",
    "recoveryPacketIndex",
    "recoveryPacketHash32",
    "outputRole",
  ]);
  const lockingBytecodeTemplate = assertBytes(
    `${name}.lockingBytecodeTemplate`,
    value.lockingBytecodeTemplate,
  );
  return Object.freeze({
    outputIndex: assertUint32(`${name}.outputIndex`, value.outputIndex),
    createdNoteCommitment32: assertBytes32(
      `${name}.createdNoteCommitment32`,
      value.createdNoteCommitment32,
    ),
    valueSats: assertUint64(`${name}.valueSats`, value.valueSats),
    lockingBytecodeTemplate,
    statementCommitmentOffset: normalizeStatementSlot(
      `${name}.statementCommitmentOffset`,
      lockingBytecodeTemplate,
      value.statementCommitmentOffset,
      true,
    ) as number,
    recoveryPacketIndex: assertUint32(`${name}.recoveryPacketIndex`, value.recoveryPacketIndex),
    recoveryPacketHash32: assertBytes32(`${name}.recoveryPacketHash32`, value.recoveryPacketHash32),
    outputRole: assertLiteral(
      `${name}.outputRole`,
      value.outputRole,
      APNT_TRANSITION_CREATED_OUTPUT_ROLE_V0,
    ),
  });
}

function writeU16LE(value: number): Uint8Array {
  return Uint8Array.of(value & 0xff, (value >>> 8) & 0xff);
}

function writeU32LE(value: number): Uint8Array {
  return Uint8Array.of(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function writeU64LE(value: bigint): Uint8Array {
  const out = new Uint8Array(8);
  for (let index = 0; index < 8; index += 1) out[index] = Number((value >> BigInt(index * 8)) & 0xffn);
  return out;
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function encodeBytes(bytes: Uint8Array): Uint8Array {
  return concatBytes([writeU32LE(bytes.length), bytes]);
}

function encodeOutpoint(outpoint: APNTTransitionOutpointV0): Uint8Array {
  return concatBytes([new Uint8Array(outpoint.txid32).reverse(), writeU32LE(outpoint.vout)]);
}

/** Canonical BCH wire encoding: reversed/display-order txid32 followed by uint32-le vout. */
export function serializeAPNTTransitionOutpointV0(value: unknown): Uint8Array {
  return encodeOutpoint(normalizeOutpoint("APNTTransitionOutpointV0", value));
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

function outpointKey(outpoint: APNTTransitionOutpointV0): string {
  return Array.from(encodeOutpoint(outpoint), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytes32Key(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function assertUnique(name: string, keys: readonly string[]): void {
  if (new Set(keys).size !== keys.length) throw new Error(`${name} must not contain duplicates`);
}

function normalizePublicValueTerms(name: string, value: unknown): APNTTransitionPublicValueTermsV0 {
  assertRecord(name, value);
  assertKnownKeys(name, value, ["totalInputValueSats", "totalOutputValueSats"]);
  return Object.freeze({
    totalInputValueSats: assertUint64(`${name}.totalInputValueSats`, value.totalInputValueSats),
    totalOutputValueSats: assertUint64(`${name}.totalOutputValueSats`, value.totalOutputValueSats),
  });
}

export function normalizeAPNTTransitionStatementV0(value: unknown): APNTTransitionStatementV0 {
  assertRecord("APNTTransitionStatementV0", value);
  assertKnownKeys("APNTTransitionStatementV0", value, [
    "version",
    "protocolDomain",
    "network",
    "proofRelationId32",
    "sp1ProgramId32",
    "verifierArtifactId32",
    "designatedVerifierInputIndex",
    "consumedItems",
    "createdItems",
    "recoveryPacketTableCommitment32",
    "authorizedFeeSats",
    "publicValueTerms",
    "transactionProjection",
    "batchNonce32",
  ]);
  if (!Array.isArray(value.consumedItems) || value.consumedItems.length === 0) {
    throw new Error("APNTTransitionStatementV0.consumedItems must be a non-empty array");
  }
  if (!Array.isArray(value.createdItems) || value.createdItems.length === 0) {
    throw new Error("APNTTransitionStatementV0.createdItems must be a non-empty array");
  }
  const consumedItems = Object.freeze(
    value.consumedItems
      .map((item, index) => normalizeConsumedItem(`APNTTransitionStatementV0.consumedItems[${String(index)}]`, item))
      .sort((left, right) => compareBytes(encodeOutpoint(left.sealOutpoint), encodeOutpoint(right.sealOutpoint))),
  );
  const createdItems = Object.freeze(
    value.createdItems
      .map((item, index) => normalizeCreatedItem(`APNTTransitionStatementV0.createdItems[${String(index)}]`, item))
      .sort((left, right) => left.outputIndex - right.outputIndex),
  );
  assertUnique(
    "APNTTransitionStatementV0 consumed outpoints",
    consumedItems.map((item) => outpointKey(item.sealOutpoint)),
  );
  assertUnique(
    "APNTTransitionStatementV0 nullifiers",
    consumedItems.map((item) => bytes32Key(item.nullifier32)),
  );
  assertUnique(
    "APNTTransitionStatementV0 created output indexes",
    createdItems.map((item) => String(item.outputIndex)),
  );
  assertUnique(
    "APNTTransitionStatementV0 recovery packet indexes",
    createdItems.map((item) => String(item.recoveryPacketIndex)),
  );
  assertUnique(
    "APNTTransitionStatementV0 recovery packet hashes",
    createdItems.map((item) => bytes32Key(item.recoveryPacketHash32)),
  );
  createdItems.forEach((item, index) => {
    if (item.recoveryPacketIndex !== index) {
      throw new Error("APNTTransitionStatementV0 recovery packet indexes must be contiguous from zero");
    }
  });

  const transactionProjection = normalizeProjection(
    "APNTTransitionStatementV0.transactionProjection",
    value.transactionProjection,
  );
  const designatedVerifierInputIndex = assertUint32(
    "APNTTransitionStatementV0.designatedVerifierInputIndex",
    value.designatedVerifierInputIndex,
  );
  if (designatedVerifierInputIndex >= transactionProjection.inputs.length) {
    throw new Error("APNTTransitionStatementV0.designatedVerifierInputIndex is outside the projected inputs");
  }
  if (transactionProjection.inputs[designatedVerifierInputIndex]?.role !== "designated-verifier") {
    throw new Error("APNTTransitionStatementV0 designated verifier index must select the designated-verifier input");
  }
  const projectedConsumedInputs = transactionProjection.inputs.filter(
    (input) => input.role === "consumed-note-seal",
  );
  if (projectedConsumedInputs.length !== consumedItems.length) {
    throw new Error("APNTTransitionStatementV0 consumed items must exactly cover projected note-seal inputs");
  }
  assertUnique(
    "APNTTransitionStatementV0 projected input outpoints",
    transactionProjection.inputs.map((input) => outpointKey(input.outpoint)),
  );
  for (const item of consumedItems) {
    if (!projectedConsumedInputs.some((input) => outpointKey(input.outpoint) === outpointKey(item.sealOutpoint))) {
      throw new Error("APNTTransitionStatementV0 consumed item is not attached to a projected note-seal input");
    }
  }

  const projectedCreatedOutputIndexes = transactionProjection.outputs
    .map((output, index) => ({ output, index }))
    .filter(({ output }) => output.role === "created-private-note")
    .map(({ index }) => index);
  if (projectedCreatedOutputIndexes.length !== createdItems.length) {
    throw new Error("APNTTransitionStatementV0 created items must exactly cover projected created-note outputs");
  }
  for (const item of createdItems) {
    const output = transactionProjection.outputs[item.outputIndex];
    if (output === undefined || output.role !== "created-private-note") {
      throw new Error("APNTTransitionStatementV0 created output index must select a projected created-note output");
    }
    if (
      item.valueSats !== output.valueSats ||
      item.statementCommitmentOffset !== output.statementCommitmentOffset ||
      !bytesEqual(item.lockingBytecodeTemplate, output.lockingBytecodeTemplate)
    ) {
      throw new Error("APNTTransitionStatementV0 created item must match its projected output value and locking template");
    }
  }

  const authorizedFeeSats = assertUint64(
    "APNTTransitionStatementV0.authorizedFeeSats",
    value.authorizedFeeSats,
  );
  const publicValueTerms = normalizePublicValueTerms(
    "APNTTransitionStatementV0.publicValueTerms",
    value.publicValueTerms,
  );
  const projectedInputValue = transactionProjection.inputs.reduce(
    (sum, input) => sum + input.spentValueSats,
    0n,
  );
  const projectedOutputValue = transactionProjection.outputs.reduce(
    (sum, output) => sum + output.valueSats,
    0n,
  );
  if (
    publicValueTerms.totalInputValueSats !== projectedInputValue ||
    publicValueTerms.totalOutputValueSats !== projectedOutputValue
  ) {
    throw new Error("APNTTransitionStatementV0 public value terms must equal projected input/output values");
  }
  if (projectedInputValue !== projectedOutputValue + authorizedFeeSats) {
    throw new Error("APNTTransitionStatementV0 authorized fee must equal projected inputs minus outputs");
  }

  return Object.freeze({
    version: assertLiteral(
      "APNTTransitionStatementV0.version",
      value.version,
      APNT_TRANSITION_STATEMENT_V0_VERSION,
    ),
    protocolDomain: assertLiteral(
      "APNTTransitionStatementV0.protocolDomain",
      value.protocolDomain,
      APNT_TRANSITION_STATEMENT_V0_PROTOCOL_DOMAIN,
    ),
    network: normalizeNetwork("APNTTransitionStatementV0.network", value.network),
    proofRelationId32: assertBytes32("APNTTransitionStatementV0.proofRelationId32", value.proofRelationId32),
    sp1ProgramId32: assertBytes32("APNTTransitionStatementV0.sp1ProgramId32", value.sp1ProgramId32),
    verifierArtifactId32: assertBytes32(
      "APNTTransitionStatementV0.verifierArtifactId32",
      value.verifierArtifactId32,
    ),
    designatedVerifierInputIndex,
    consumedItems,
    createdItems,
    recoveryPacketTableCommitment32: assertBytes32(
      "APNTTransitionStatementV0.recoveryPacketTableCommitment32",
      value.recoveryPacketTableCommitment32,
    ),
    authorizedFeeSats,
    publicValueTerms,
    transactionProjection,
    batchNonce32: assertBytes32("APNTTransitionStatementV0.batchNonce32", value.batchNonce32),
  });
}

function encodeToken(token: APNTTransitionTokenDataV0 | null): Uint8Array {
  if (token === null) return Uint8Array.of(0);
  const nft = token.nft;
  const capability = nft === null
    ? 0
    : nft.capability === "immutable"
      ? 1
      : nft.capability === "mutable"
        ? 2
        : 3;
  return concatBytes([
    Uint8Array.of(1),
    token.category32,
    writeU64LE(token.amount),
    Uint8Array.of(capability),
    encodeBytes(nft?.commitment ?? new Uint8Array()),
  ]);
}

function encodeProjection(projection: APNTBchTransactionProjectionV0): Uint8Array {
  const inputs = projection.inputs.map((input) => concatBytes([
    encodeOutpoint(input.outpoint),
    writeU32LE(input.sequenceNumber),
    writeU64LE(input.spentValueSats),
    encodeBytes(input.spentLockingBytecode),
    encodeToken(input.spentToken),
    Uint8Array.of(input.role === "designated-verifier" ? 0 : 1),
  ]));
  const outputs = projection.outputs.map((output) => concatBytes([
    writeU64LE(output.valueSats),
    encodeBytes(output.lockingBytecodeTemplate),
    writeU32LE(output.statementCommitmentOffset ?? NULL_STATEMENT_COMMITMENT_OFFSET),
    encodeToken(output.token),
    Uint8Array.of(output.role === "created-private-note" ? 0 : 1),
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

/** Canonical binary encoding; no JSON, JavaScript number coercion, or object-key ordering is used. */
export function serializeAPNTTransitionStatementV0(value: unknown): Uint8Array {
  const statement = normalizeAPNTTransitionStatementV0(value);
  const protocolDomainBytes = TEXT_ENCODER.encode(statement.protocolDomain);
  if (protocolDomainBytes.length > 0xffff) throw new Error("APNT transition protocol domain is too long");
  const network = statement.network === "chipnet" ? 0 : statement.network === "mainnet" ? 1 : 2;
  const consumed = statement.consumedItems.map((item) => concatBytes([
    encodeOutpoint(item.sealOutpoint),
    item.consumedNoteCommitment32,
    item.nullifier32,
    item.sealCommitment32,
  ]));
  const created = statement.createdItems.map((item) => concatBytes([
    writeU32LE(item.outputIndex),
    item.createdNoteCommitment32,
    writeU64LE(item.valueSats),
    encodeBytes(item.lockingBytecodeTemplate),
    writeU32LE(item.statementCommitmentOffset),
    writeU32LE(item.recoveryPacketIndex),
    item.recoveryPacketHash32,
    Uint8Array.of(0),
  ]));
  return concatBytes([
    MAGIC,
    Uint8Array.of(statement.version),
    writeU16LE(protocolDomainBytes.length),
    protocolDomainBytes,
    Uint8Array.of(network),
    statement.proofRelationId32,
    statement.sp1ProgramId32,
    statement.verifierArtifactId32,
    writeU32LE(statement.designatedVerifierInputIndex),
    writeU32LE(consumed.length),
    ...consumed,
    writeU32LE(created.length),
    ...created,
    statement.recoveryPacketTableCommitment32,
    writeU64LE(statement.authorizedFeeSats),
    writeU64LE(statement.publicValueTerms.totalInputValueSats),
    writeU64LE(statement.publicValueTerms.totalOutputValueSats),
    encodeProjection(statement.transactionProjection),
    statement.batchNonce32,
  ]);
}

export function deriveAPNTTransitionStatementCommitmentV0(value: unknown): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_TRANSITION_STATEMENT_V0_COMMITMENT_DOMAIN,
    serializeAPNTTransitionStatementV0(value),
  );
}
