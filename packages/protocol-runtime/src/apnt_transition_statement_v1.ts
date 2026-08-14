// Maturity: frozen — its APNTTSV1 wire encoding is checked byte-for-byte by
// `npm run verify:transition-settlement-projection-independent` and
// `npm run verify:settlement-authorization-covenant-independent` (both require
// the literal APNTTSV1 magic), and is pinned in
// tools/apnt-private-note-transition-rust-parity/fixtures/typescript-golden-vectors-public-v0.json.
// See AGENTS.md, "The maturity ladder".
import { asBytes32, copyBytes, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { APNT_V1_BCH_MAX_MONEY_SATS } from "./apnt_bundle_backed_private_note_v1.js";
import {
  APNT_CREATION_SCOPE_V1_STATEMENT_VERSION,
  APNT_CREATION_SCOPE_V1_VERSION,
  APNT_TRANSITION_BATCH_NONCE_V1_VERSION,
  deriveAPNTCreationScopeV1,
  deriveAPNTTransitionBatchNonceV1,
} from "./apnt_creation_scope_v1.js";
import {
  APNT_BCH_TRANSACTION_PROJECTION_V1_VERSION,
  APNT_TRANSITION_INPUT_BACKING_ROLE_V1,
  APNT_TRANSITION_OUTPUT_ROLE_V1,
  normalizeAPNTBchTransactionProjectionV1,
  parseAPNTBchTransactionProjectionV1,
  serializeAPNTBchTransactionProjectionV1,
  type APNTBchTransactionProjectionV1,
} from "./apnt_transaction_projection_v1.js";

export const APNT_TRANSITION_STATEMENT_V1_MAGIC = "APNTTSV1";
export const APNT_TRANSITION_STATEMENT_V1_VERSION = 1;
export const APNT_TRANSITION_STATEMENT_V1_PROTOCOL_DOMAIN = "bch-cloak-apnt-v0";
export const APNT_TRANSITION_STATEMENT_V1_COMMITMENT_DOMAIN =
  "bch-cloak-apnt-v0:transition-statement-commitment-v1";
export const APNT_TRANSITION_STATEMENT_V1_MAX_LOGICAL_NOTES_PER_SIDE = 1_024;
export const APNT_TRANSITION_STATEMENT_V1_MAX_BACKING_CELLS_PER_SIDE = 4_096;
/** Canonical encoding of an absent designated aggregator-fee output index. */
export const APNT_TRANSITION_AGGREGATOR_FEE_OUTPUT_INDEX_ABSENT_V1 = 0xffff_ffff;

export const APNT_TRANSITION_MODE_V1 = Object.freeze({
  PRIVATE_TRANSITION: "private-transition",
  COMPLETE_BUNDLE_EXIT: "complete-bundle-exit",
} as const);
export type APNTTransitionModeV1 =
  (typeof APNT_TRANSITION_MODE_V1)[keyof typeof APNT_TRANSITION_MODE_V1];

export type APNTTransitionNetworkV1 = "chipnet" | "mainnet" | "regtest";

export type APNTTransitionConsumedLogicalNoteV1 = Readonly<{
  consumedNoteCommitment32: Bytes32;
  nullifier32: Bytes32;
}>;

export type APNTTransitionConsumedBackingCellV1 = Readonly<{
  inputIndex: number;
  sealCellCommitment32: Bytes32;
  lockingProfileId32: Bytes32;
}>;

export type APNTTransitionCreatedLogicalNoteV1 = Readonly<{
  createdNoteCommitment32: Bytes32;
  recoveryPacketIndex: number;
  recoveryPacketHash32: Bytes32;
}>;

export type APNTTransitionCreatedBackingCellV1 = Readonly<{
  outputIndex: number;
  sealCellCommitment32: Bytes32;
  lockingProfileId32: Bytes32;
  /**
   * `exitAuthorityCommitment32 = sha256DomainSeparated(
   *    "bch-cloak-apnt-v0:one-time-exit-authority-v0", E_i33)` over the
   * recipient's one-time exit public key for THIS cell
   * (`define-apnt-private-spend-covenant-v0/design.md` §4.3).
   *
   * A genuinely new, additive field rather than a reinterpretation of
   * `lockingProfileId32`. `lockingProfileId32` keeps its existing meaning and
   * its existing import-track semantics unchanged; the two are independent.
   *
   * **Per CELL, never per note.** A per-note exit key would give every backing
   * cell of one logical note a byte-identical 128-byte seal — the seal is a
   * pure function of `sha256(E33)` outside a 32-byte hole — which would publish
   * the private note-to-cell partition that the equal-value multi-cell
   * construction exists to hide. Per-cell keys make sibling cells
   * indistinguishable from unrelated cells, which is the whole point.
   *
   * It is `exitAuthorityCommitment32` and NOT the on-chain `sha256(E_i33)`:
   * the two are different values over the same key by construction, so this
   * public field is not a usable oracle for the on-chain one and vice versa.
   */
  exitAuthorityCommitment32: Bytes32;
}>;

/**
 * Canonical public structure only. Logical note values, bundle commitments,
 * bundle members/cardinality, ownership, recipients, and note-to-cell joins
 * are deliberately absent.
 */
export type APNTTransitionStatementV1 = Readonly<{
  version: typeof APNT_TRANSITION_STATEMENT_V1_VERSION;
  protocolDomain: typeof APNT_TRANSITION_STATEMENT_V1_PROTOCOL_DOMAIN;
  network: APNTTransitionNetworkV1;
  mode: APNTTransitionModeV1;
  privacyProfileId32: Bytes32;
  proofRelationId32: Bytes32;
  sp1ProgramId32: Bytes32;
  verifierArtifactId32: Bytes32;
  /** Orthogonal to input backingRole; designation never changes value accounting. */
  designatedVerifierInputIndex: number;
  /** Deterministically derived from sorted unique transaction input outpoints and public identities. */
  batchNonce32: Bytes32;
  /** Required and deterministically derived in private-transition; absent in complete-bundle-exit. */
  createdBackingCreationScope32: Bytes32 | null;
  consumedLogicalNotes: readonly APNTTransitionConsumedLogicalNoteV1[];
  consumedBackingCells: readonly APNTTransitionConsumedBackingCellV1[];
  createdLogicalNotes: readonly APNTTransitionCreatedLogicalNoteV1[];
  createdBackingCells: readonly APNTTransitionCreatedBackingCellV1[];
  /** V0 recovery packet-bin batchManifestRoot32; required only for private-transition. */
  recoveryPacketTableCommitment32: Bytes32 | null;
  /**
   * The burned miner fee: exactly projected inputs minus projected outputs.
   * It is one of the two authorized terms of the public cell-count gap and
   * excludes the aggregator-fee output value.
   */
  networkFeeSats: bigint;
  /**
   * The public aggregator service fee. Zero under a `zero-service-fee`
   * profile; otherwise the exact value of the designated aggregator-fee
   * output. It is never itemized per contribution, sender, or note.
   */
  aggregatorServiceFeeSats: bigint;
  /** Present exactly when `aggregatorServiceFeeSats` is positive. */
  aggregatorFeeOutputIndex: number | null;
  totalInputValueSats: bigint;
  totalOutputValueSats: bigint;
  transactionProjection: APNTBchTransactionProjectionV1;
}>;

const MAGIC = Uint8Array.of(0x41, 0x50, 0x4e, 0x54, 0x54, 0x53, 0x56, 0x31); // APNTTSV1
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });
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

function assertNonzeroBytes32(name: string, value: unknown): Bytes32 {
  if (!(value instanceof Uint8Array)) throw new Error(`${name} must be a Uint8Array`);
  const bytes = asBytes32(name, value);
  if (bytes.every((byte) => byte === 0)) throw new Error(`${name} must not be all zero`);
  return bytes;
}

function assertOptionalNonzeroBytes32(name: string, value: unknown): Bytes32 | null {
  if (value === null) return null;
  return assertNonzeroBytes32(name, value);
}

function assertOptionalOutputIndex(name: string, value: unknown, outputCount: number): number | null {
  if (value === null) return null;
  const index = assertU32(name, value);
  if (index >= outputCount) throw new Error(`${name} is outside projected outputs`);
  return index;
}

function normalizeNetwork(name: string, value: unknown): APNTTransitionNetworkV1 {
  if (value !== "chipnet" && value !== "mainnet" && value !== "regtest") {
    throw new Error(`${name} must be chipnet, mainnet, or regtest`);
  }
  return value;
}

function normalizeMode(name: string, value: unknown): APNTTransitionModeV1 {
  if (
    value !== APNT_TRANSITION_MODE_V1.PRIVATE_TRANSITION &&
    value !== APNT_TRANSITION_MODE_V1.COMPLETE_BUNDLE_EXIT
  ) {
    throw new Error(`${name} must be private-transition or complete-bundle-exit`);
  }
  return value;
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

function assertUnique(name: string, keys: readonly string[]): void {
  if (new Set(keys).size !== keys.length) throw new Error(`${name} must not contain duplicates`);
}

function assertArrayWithinCap(
  name: string,
  value: unknown,
  cap: number,
): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  if (value.length > cap) throw new Error(`${name} exceeds the v1 codec cap`);
}

function normalizeConsumedLogicalNote(
  name: string,
  value: unknown,
): APNTTransitionConsumedLogicalNoteV1 {
  assertRecord(name, value);
  assertKnownKeys(name, value, ["consumedNoteCommitment32", "nullifier32"]);
  return Object.freeze({
    consumedNoteCommitment32: assertNonzeroBytes32(
      `${name}.consumedNoteCommitment32`,
      value.consumedNoteCommitment32,
    ),
    nullifier32: assertNonzeroBytes32(`${name}.nullifier32`, value.nullifier32),
  });
}

function normalizeConsumedBackingCell(
  name: string,
  value: unknown,
): APNTTransitionConsumedBackingCellV1 {
  assertRecord(name, value);
  assertKnownKeys(name, value, ["inputIndex", "sealCellCommitment32", "lockingProfileId32"]);
  return Object.freeze({
    inputIndex: assertU32(`${name}.inputIndex`, value.inputIndex),
    sealCellCommitment32: assertNonzeroBytes32(
      `${name}.sealCellCommitment32`,
      value.sealCellCommitment32,
    ),
    lockingProfileId32: assertNonzeroBytes32(
      `${name}.lockingProfileId32`,
      value.lockingProfileId32,
    ),
  });
}

function normalizeCreatedLogicalNote(
  name: string,
  value: unknown,
): APNTTransitionCreatedLogicalNoteV1 {
  assertRecord(name, value);
  assertKnownKeys(name, value, [
    "createdNoteCommitment32",
    "recoveryPacketIndex",
    "recoveryPacketHash32",
  ]);
  return Object.freeze({
    createdNoteCommitment32: assertNonzeroBytes32(
      `${name}.createdNoteCommitment32`,
      value.createdNoteCommitment32,
    ),
    recoveryPacketIndex: assertU32(`${name}.recoveryPacketIndex`, value.recoveryPacketIndex),
    recoveryPacketHash32: assertNonzeroBytes32(
      `${name}.recoveryPacketHash32`,
      value.recoveryPacketHash32,
    ),
  });
}

function normalizeCreatedBackingCell(
  name: string,
  value: unknown,
): APNTTransitionCreatedBackingCellV1 {
  assertRecord(name, value);
  assertKnownKeys(name, value, [
    "outputIndex",
    "sealCellCommitment32",
    "lockingProfileId32",
    "exitAuthorityCommitment32",
  ]);
  return Object.freeze({
    outputIndex: assertU32(`${name}.outputIndex`, value.outputIndex),
    sealCellCommitment32: assertNonzeroBytes32(
      `${name}.sealCellCommitment32`,
      value.sealCellCommitment32,
    ),
    lockingProfileId32: assertNonzeroBytes32(
      `${name}.lockingProfileId32`,
      value.lockingProfileId32,
    ),
    exitAuthorityCommitment32: assertNonzeroBytes32(
      `${name}.exitAuthorityCommitment32`,
      value.exitAuthorityCommitment32,
    ),
  });
}

function normalizeConsumedLogicalNotes(value: unknown): readonly APNTTransitionConsumedLogicalNoteV1[] {
  const name = "APNTTransitionStatementV1.consumedLogicalNotes";
  assertArrayWithinCap(name, value, APNT_TRANSITION_STATEMENT_V1_MAX_LOGICAL_NOTES_PER_SIDE);
  const notes = value
    .map((note, index) => normalizeConsumedLogicalNote(`${name}[${String(index)}]`, note))
    .sort((left, right) => compareBytes(
      left.consumedNoteCommitment32,
      right.consumedNoteCommitment32,
    ));
  assertUnique(`${name} note commitments`, notes.map((note) => bytesKey(note.consumedNoteCommitment32)));
  assertUnique(`${name} nullifiers`, notes.map((note) => bytesKey(note.nullifier32)));
  return Object.freeze(notes);
}

function normalizeConsumedBackingCells(value: unknown): readonly APNTTransitionConsumedBackingCellV1[] {
  const name = "APNTTransitionStatementV1.consumedBackingCells";
  assertArrayWithinCap(name, value, APNT_TRANSITION_STATEMENT_V1_MAX_BACKING_CELLS_PER_SIDE);
  const cells = value
    .map((cell, index) => normalizeConsumedBackingCell(`${name}[${String(index)}]`, cell))
    .sort((left, right) => left.inputIndex - right.inputIndex);
  assertUnique(`${name} input indexes`, cells.map((cell) => String(cell.inputIndex)));
  assertUnique(`${name} seal-cell commitments`, cells.map((cell) => bytesKey(cell.sealCellCommitment32)));
  return Object.freeze(cells);
}

function normalizeCreatedLogicalNotes(value: unknown): readonly APNTTransitionCreatedLogicalNoteV1[] {
  const name = "APNTTransitionStatementV1.createdLogicalNotes";
  assertArrayWithinCap(name, value, APNT_TRANSITION_STATEMENT_V1_MAX_LOGICAL_NOTES_PER_SIDE);
  const notes = value
    .map((note, index) => normalizeCreatedLogicalNote(`${name}[${String(index)}]`, note))
    .sort((left, right) => compareBytes(
      left.createdNoteCommitment32,
      right.createdNoteCommitment32,
    ));
  assertUnique(`${name} note commitments`, notes.map((note) => bytesKey(note.createdNoteCommitment32)));
  assertUnique(`${name} recovery packet indexes`, notes.map((note) => String(note.recoveryPacketIndex)));
  assertUnique(`${name} recovery packet hashes`, notes.map((note) => bytesKey(note.recoveryPacketHash32)));
  notes.forEach((note, index) => {
    if (note.recoveryPacketIndex !== index) {
      throw new Error(`${name} recovery packet indexes must be contiguous from zero in canonical note order`);
    }
  });
  return Object.freeze(notes);
}

function normalizeCreatedBackingCells(value: unknown): readonly APNTTransitionCreatedBackingCellV1[] {
  const name = "APNTTransitionStatementV1.createdBackingCells";
  assertArrayWithinCap(name, value, APNT_TRANSITION_STATEMENT_V1_MAX_BACKING_CELLS_PER_SIDE);
  const cells = value
    .map((cell, index) => normalizeCreatedBackingCell(`${name}[${String(index)}]`, cell))
    .sort((left, right) => left.outputIndex - right.outputIndex);
  assertUnique(`${name} output indexes`, cells.map((cell) => String(cell.outputIndex)));
  assertUnique(`${name} seal-cell commitments`, cells.map((cell) => bytesKey(cell.sealCellCommitment32)));
  // Codec-level duplicate rejection for reused per-cell exit keys. Two created
  // cells sharing one `E_i` reintroduce exactly the byte-identical-seal leak
  // per-cell keys exist to remove, so it fails at the statement boundary rather
  // than only inside the relation.
  assertUnique(
    `${name} exit-authority commitments`,
    cells.map((cell) => bytesKey(cell.exitAuthorityCommitment32)),
  );
  return Object.freeze(cells);
}

function checkedProjectionTotal(name: string, values: readonly bigint[]): bigint {
  let total = 0n;
  for (const value of values) {
    if (value > APNT_V1_BCH_MAX_MONEY_SATS - total) {
      throw new Error(`${name} exceeds APNT_V1_BCH_MAX_MONEY_SATS`);
    }
    total += value;
  }
  return total;
}

function assertProjectionJoins(
  projection: APNTBchTransactionProjectionV1,
  consumedBackingCells: readonly APNTTransitionConsumedBackingCellV1[],
  createdBackingCells: readonly APNTTransitionCreatedBackingCellV1[],
): void {
  const projectedBackingInputIndexes = projection.inputs
    .map((input, index) => ({ input, index }))
    .filter(({ input }) => input.backingRole === APNT_TRANSITION_INPUT_BACKING_ROLE_V1.PRIVATE_BACKING)
    .map(({ index }) => index);
  if (
    projectedBackingInputIndexes.length !== consumedBackingCells.length ||
    consumedBackingCells.some((cell, index) => cell.inputIndex !== projectedBackingInputIndexes[index])
  ) {
    throw new Error(
      "APNTTransitionStatementV1 consumed backing cells must exactly cover private-backing projection inputs",
    );
  }

  const projectedBackingOutputIndexes = projection.outputs
    .map((output, index) => ({ output, index }))
    .filter(({ output }) => output.role === APNT_TRANSITION_OUTPUT_ROLE_V1.PRIVATE_BACKING)
    .map(({ index }) => index);
  if (
    projectedBackingOutputIndexes.length !== createdBackingCells.length ||
    createdBackingCells.some((cell, index) => cell.outputIndex !== projectedBackingOutputIndexes[index])
  ) {
    throw new Error(
      "APNTTransitionStatementV1 created backing cells must exactly cover private-backing projection outputs",
    );
  }
}

/**
 * Codec-level coherence only: a positive service fee must designate one
 * aggregator-fee output index and a zero service fee must designate none.
 * Cardinality, value equality, and the split fee equation remain structural
 * validation, not statement construction.
 */
function assertAggregatorFeeShape(statement: APNTTransitionStatementV1): void {
  if (statement.aggregatorServiceFeeSats > 0n) {
    if (statement.aggregatorFeeOutputIndex === null) {
      throw new Error(
        "APNTTransitionStatementV1 positive aggregatorServiceFeeSats requires a designated aggregator-fee output index",
      );
    }
    const designated = statement.transactionProjection.outputs[statement.aggregatorFeeOutputIndex];
    if (designated === undefined || designated.role !== APNT_TRANSITION_OUTPUT_ROLE_V1.AGGREGATOR_FEE) {
      throw new Error(
        "APNTTransitionStatementV1.aggregatorFeeOutputIndex must select an aggregator-fee projection output",
      );
    }
    return;
  }
  if (statement.aggregatorFeeOutputIndex !== null) {
    throw new Error(
      "APNTTransitionStatementV1 zero aggregatorServiceFeeSats must not designate an aggregator-fee output index",
    );
  }
}

function assertModeShape(statement: APNTTransitionStatementV1): void {
  assertAggregatorFeeShape(statement);
  if (statement.mode === APNT_TRANSITION_MODE_V1.PRIVATE_TRANSITION) {
    if (
      statement.consumedLogicalNotes.length === 0 ||
      statement.consumedBackingCells.length === 0 ||
      statement.createdLogicalNotes.length === 0 ||
      statement.createdBackingCells.length === 0
    ) {
      throw new Error("APNTTransitionStatementV1 private-transition collections must be non-empty");
    }
    if (statement.createdBackingCreationScope32 === null) {
      throw new Error("APNTTransitionStatementV1 private-transition requires a creation scope");
    }
    if (statement.recoveryPacketTableCommitment32 === null) {
      throw new Error("APNTTransitionStatementV1 private-transition requires a recovery packet table commitment");
    }
    if (statement.transactionProjection.outputs.some(
      (output) => output.role === APNT_TRANSITION_OUTPUT_ROLE_V1.TRANSPARENT_EXIT,
    )) {
      throw new Error("APNTTransitionStatementV1 private-transition must not contain transparent-exit outputs");
    }
    if (!statement.transactionProjection.outputs.some(
      (output) => output.role === APNT_TRANSITION_OUTPUT_ROLE_V1.RECOVERY_PACKET_CARRIER,
    )) {
      throw new Error("APNTTransitionStatementV1 private-transition requires a recovery-packet-carrier output");
    }
    // At most one Plane-A transition-boundary output. "At most" rather than
    // "exactly": this codec has never required a Plane-A output (it used to be
    // indistinguishable from created backing cell 0), and tightening the
    // cardinality to "exactly one" is a separate settlement-shape decision, not
    // part of separating the role. What must not happen is two of them, because
    // the collateral pass-through equation sums them.
    if (
      statement.transactionProjection.outputs.filter(
        (output) => output.role === APNT_TRANSITION_OUTPUT_ROLE_V1.TRANSITION_BOUNDARY,
      ).length > 1
    ) {
      throw new Error(
        "APNTTransitionStatementV1 private-transition must not contain more than one transition-boundary output",
      );
    }
    return;
  }

  if (statement.consumedLogicalNotes.length !== 1) {
    throw new Error("APNTTransitionStatementV1 complete-bundle-exit requires exactly one consumed logical note");
  }
  if (statement.consumedBackingCells.length === 0) {
    throw new Error("APNTTransitionStatementV1 complete-bundle-exit requires consumed backing cells");
  }
  if (statement.createdLogicalNotes.length !== 0 || statement.createdBackingCells.length !== 0) {
    throw new Error("APNTTransitionStatementV1 complete-bundle-exit must not create private notes or backing cells");
  }
  if (statement.createdBackingCreationScope32 !== null) {
    throw new Error("APNTTransitionStatementV1 complete-bundle-exit must not contain a creation scope");
  }
  if (statement.recoveryPacketTableCommitment32 !== null) {
    throw new Error("APNTTransitionStatementV1 complete-bundle-exit must not contain recovery references");
  }
  if (
    statement.aggregatorServiceFeeSats !== 0n ||
    statement.aggregatorFeeOutputIndex !== null ||
    statement.transactionProjection.outputs.some(
      (output) => output.role === APNT_TRANSITION_OUTPUT_ROLE_V1.AGGREGATOR_FEE,
    )
  ) {
    throw new Error("APNTTransitionStatementV1 complete-bundle-exit must not contain aggregator-fee terms");
  }
  if (statement.transactionProjection.inputs.some(
    (input) => input.backingRole === APNT_TRANSITION_INPUT_BACKING_ROLE_V1.VERIFIER_ONLY,
  )) {
    throw new Error("APNTTransitionStatementV1 complete-bundle-exit must not contain verifier-only inputs");
  }
  if (
    statement.transactionProjection.outputs.length !== 1 ||
    statement.transactionProjection.outputs[0]?.role !== APNT_TRANSITION_OUTPUT_ROLE_V1.TRANSPARENT_EXIT ||
    statement.transactionProjection.outputs[0].valueSats === 0n
  ) {
    throw new Error("APNTTransitionStatementV1 complete-bundle-exit requires one positive transparent-exit output");
  }
  if (
    statement.transactionProjection.inputs[statement.designatedVerifierInputIndex]?.backingRole !==
    APNT_TRANSITION_INPUT_BACKING_ROLE_V1.PRIVATE_BACKING
  ) {
    throw new Error("APNTTransitionStatementV1 complete-bundle-exit verifier must designate a backing input");
  }
}

function normalizeStatementShape(value: unknown): APNTTransitionStatementV1 {
  assertRecord("APNTTransitionStatementV1", value);
  assertKnownKeys("APNTTransitionStatementV1", value, [
    "version",
    "protocolDomain",
    "network",
    "mode",
    "privacyProfileId32",
    "proofRelationId32",
    "sp1ProgramId32",
    "verifierArtifactId32",
    "designatedVerifierInputIndex",
    "batchNonce32",
    "createdBackingCreationScope32",
    "consumedLogicalNotes",
    "consumedBackingCells",
    "createdLogicalNotes",
    "createdBackingCells",
    "recoveryPacketTableCommitment32",
    "networkFeeSats",
    "aggregatorServiceFeeSats",
    "aggregatorFeeOutputIndex",
    "totalInputValueSats",
    "totalOutputValueSats",
    "transactionProjection",
  ]);
  if (value.version !== APNT_TRANSITION_STATEMENT_V1_VERSION) {
    throw new Error("APNTTransitionStatementV1.version must be 1");
  }
  if (value.protocolDomain !== APNT_TRANSITION_STATEMENT_V1_PROTOCOL_DOMAIN) {
    throw new Error(
      `APNTTransitionStatementV1.protocolDomain must be ${APNT_TRANSITION_STATEMENT_V1_PROTOCOL_DOMAIN}`,
    );
  }

  const transactionProjection = normalizeAPNTBchTransactionProjectionV1(value.transactionProjection);
  const designatedVerifierInputIndex = assertU32(
    "APNTTransitionStatementV1.designatedVerifierInputIndex",
    value.designatedVerifierInputIndex,
  );
  if (designatedVerifierInputIndex >= transactionProjection.inputs.length) {
    throw new Error("APNTTransitionStatementV1.designatedVerifierInputIndex is outside projected inputs");
  }

  const statement: APNTTransitionStatementV1 = Object.freeze({
    version: APNT_TRANSITION_STATEMENT_V1_VERSION,
    protocolDomain: APNT_TRANSITION_STATEMENT_V1_PROTOCOL_DOMAIN,
    network: normalizeNetwork("APNTTransitionStatementV1.network", value.network),
    mode: normalizeMode("APNTTransitionStatementV1.mode", value.mode),
    privacyProfileId32: assertNonzeroBytes32(
      "APNTTransitionStatementV1.privacyProfileId32",
      value.privacyProfileId32,
    ),
    proofRelationId32: assertNonzeroBytes32(
      "APNTTransitionStatementV1.proofRelationId32",
      value.proofRelationId32,
    ),
    sp1ProgramId32: assertNonzeroBytes32(
      "APNTTransitionStatementV1.sp1ProgramId32",
      value.sp1ProgramId32,
    ),
    verifierArtifactId32: assertNonzeroBytes32(
      "APNTTransitionStatementV1.verifierArtifactId32",
      value.verifierArtifactId32,
    ),
    designatedVerifierInputIndex,
    batchNonce32: assertNonzeroBytes32("APNTTransitionStatementV1.batchNonce32", value.batchNonce32),
    createdBackingCreationScope32: assertOptionalNonzeroBytes32(
      "APNTTransitionStatementV1.createdBackingCreationScope32",
      value.createdBackingCreationScope32,
    ),
    consumedLogicalNotes: normalizeConsumedLogicalNotes(value.consumedLogicalNotes),
    consumedBackingCells: normalizeConsumedBackingCells(value.consumedBackingCells),
    createdLogicalNotes: normalizeCreatedLogicalNotes(value.createdLogicalNotes),
    createdBackingCells: normalizeCreatedBackingCells(value.createdBackingCells),
    recoveryPacketTableCommitment32: assertOptionalNonzeroBytes32(
      "APNTTransitionStatementV1.recoveryPacketTableCommitment32",
      value.recoveryPacketTableCommitment32,
    ),
    networkFeeSats: assertBchValue(
      "APNTTransitionStatementV1.networkFeeSats",
      value.networkFeeSats,
    ),
    aggregatorServiceFeeSats: assertBchValue(
      "APNTTransitionStatementV1.aggregatorServiceFeeSats",
      value.aggregatorServiceFeeSats,
    ),
    aggregatorFeeOutputIndex: assertOptionalOutputIndex(
      "APNTTransitionStatementV1.aggregatorFeeOutputIndex",
      value.aggregatorFeeOutputIndex,
      transactionProjection.outputs.length,
    ),
    totalInputValueSats: assertBchValue(
      "APNTTransitionStatementV1.totalInputValueSats",
      value.totalInputValueSats,
    ),
    totalOutputValueSats: assertBchValue(
      "APNTTransitionStatementV1.totalOutputValueSats",
      value.totalOutputValueSats,
    ),
    transactionProjection,
  });

  assertProjectionJoins(
    statement.transactionProjection,
    statement.consumedBackingCells,
    statement.createdBackingCells,
  );
  assertModeShape(statement);

  const projectedInputValue = checkedProjectionTotal(
    "APNTTransitionStatementV1 projected input total",
    statement.transactionProjection.inputs.map((input) => input.spentValueSats),
  );
  const projectedOutputValue = checkedProjectionTotal(
    "APNTTransitionStatementV1 projected output total",
    statement.transactionProjection.outputs.map((output) => output.valueSats),
  );
  if (
    statement.totalInputValueSats !== projectedInputValue ||
    statement.totalOutputValueSats !== projectedOutputValue
  ) {
    throw new Error("APNTTransitionStatementV1 public totals must equal projected input/output values");
  }
  if (
    statement.networkFeeSats > projectedInputValue ||
    projectedInputValue - statement.networkFeeSats !== projectedOutputValue
  ) {
    throw new Error("APNTTransitionStatementV1 network fee must equal projected inputs minus outputs");
  }
  return statement;
}

function batchNonceInput(statement: APNTTransitionStatementV1) {
  return {
    version: APNT_TRANSITION_BATCH_NONCE_V1_VERSION,
    network: statement.network,
    mode: statement.mode,
    privacyProfileId32: statement.privacyProfileId32,
    proofRelationId32: statement.proofRelationId32,
    sp1ProgramId32: statement.sp1ProgramId32,
    verifierArtifactId32: statement.verifierArtifactId32,
    inputOutpoints: statement.transactionProjection.inputs.map((input) => input.outpoint),
  } as const;
}

function creationScopeInput(statement: APNTTransitionStatementV1) {
  return {
    version: APNT_CREATION_SCOPE_V1_VERSION,
    network: statement.network,
    statementVersion: APNT_CREATION_SCOPE_V1_STATEMENT_VERSION,
    mode: statement.mode,
    privacyProfileId32: statement.privacyProfileId32,
    batchNonce32: statement.batchNonce32,
    proofRelationId32: statement.proofRelationId32,
    sp1ProgramId32: statement.sp1ProgramId32,
    verifierArtifactId32: statement.verifierArtifactId32,
    designatedVerifierInputIndex: statement.designatedVerifierInputIndex,
    transactionVersion: statement.transactionProjection.transactionVersion,
    locktime: statement.transactionProjection.locktime,
    inputs: statement.transactionProjection.inputs,
    createdBackingSkeletons: statement.createdBackingCells.map((cell) => {
      const output = statement.transactionProjection.outputs[cell.outputIndex];
      if (output === undefined) {
        throw new Error("APNTTransitionStatementV1 created backing cell references a missing output");
      }
      return {
        outputIndex: cell.outputIndex,
        valueSats: output.valueSats,
        lockingProfileId32: cell.lockingProfileId32,
      };
    }),
  } as const;
}

/**
 * Canonicalizes statement collections and checks deterministic nonce/scope
 * consistency. This is structural construction, not profile validation,
 * private-relation evaluation, proof acceptance, or BCH acceptance.
 */
export async function normalizeAPNTTransitionStatementV1(
  value: unknown,
): Promise<APNTTransitionStatementV1> {
  const statement = normalizeStatementShape(value);
  const expectedBatchNonce32 = await deriveAPNTTransitionBatchNonceV1(batchNonceInput(statement));
  if (!bytesEqual(statement.batchNonce32, expectedBatchNonce32)) {
    throw new Error("APNTTransitionStatementV1.batchNonce32 must equal the deterministic v1 batch nonce");
  }
  if (statement.mode === APNT_TRANSITION_MODE_V1.PRIVATE_TRANSITION) {
    const expectedScope32 = await deriveAPNTCreationScopeV1(creationScopeInput(statement));
    if (
      statement.createdBackingCreationScope32 === null ||
      !bytesEqual(statement.createdBackingCreationScope32, expectedScope32)
    ) {
      throw new Error(
        "APNTTransitionStatementV1.createdBackingCreationScope32 must equal the deterministic v1 creation scope",
      );
    }
  }
  return statement;
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

function networkByte(value: APNTTransitionNetworkV1): number {
  return value === "chipnet" ? 0 : value === "mainnet" ? 1 : 2;
}

function modeByte(value: APNTTransitionModeV1): number {
  return value === APNT_TRANSITION_MODE_V1.PRIVATE_TRANSITION ? 0 : 1;
}

function encodePresence(value: Bytes32 | null): Uint8Array {
  return value === null ? Uint8Array.of(0) : concatBytes([Uint8Array.of(1), value]);
}

function encodeNormalizedStatement(statement: APNTTransitionStatementV1): Uint8Array {
  const protocolDomainBytes = TEXT_ENCODER.encode(statement.protocolDomain);
  const consumedLogicalNotes = statement.consumedLogicalNotes.map((note) => concatBytes([
    note.consumedNoteCommitment32,
    note.nullifier32,
  ]));
  const consumedBackingCells = statement.consumedBackingCells.map((cell) => concatBytes([
    writeU32LE(cell.inputIndex),
    cell.sealCellCommitment32,
    cell.lockingProfileId32,
  ]));
  const createdLogicalNotes = statement.createdLogicalNotes.map((note) => concatBytes([
    note.createdNoteCommitment32,
    writeU32LE(note.recoveryPacketIndex),
    note.recoveryPacketHash32,
  ]));
  const createdBackingCells = statement.createdBackingCells.map((cell) => concatBytes([
    writeU32LE(cell.outputIndex),
    cell.sealCellCommitment32,
    cell.lockingProfileId32,
    cell.exitAuthorityCommitment32,
  ]));
  return concatBytes([
    MAGIC,
    Uint8Array.of(statement.version),
    writeU16LE(protocolDomainBytes.length),
    protocolDomainBytes,
    Uint8Array.of(networkByte(statement.network), modeByte(statement.mode)),
    statement.privacyProfileId32,
    statement.proofRelationId32,
    statement.sp1ProgramId32,
    statement.verifierArtifactId32,
    writeU32LE(statement.designatedVerifierInputIndex),
    statement.batchNonce32,
    encodePresence(statement.createdBackingCreationScope32),
    writeU32LE(consumedLogicalNotes.length),
    ...consumedLogicalNotes,
    writeU32LE(consumedBackingCells.length),
    ...consumedBackingCells,
    writeU32LE(createdLogicalNotes.length),
    ...createdLogicalNotes,
    writeU32LE(createdBackingCells.length),
    ...createdBackingCells,
    encodePresence(statement.recoveryPacketTableCommitment32),
    writeU64LE(statement.networkFeeSats),
    writeU64LE(statement.aggregatorServiceFeeSats),
    writeU32LE(
      statement.aggregatorFeeOutputIndex ?? APNT_TRANSITION_AGGREGATOR_FEE_OUTPUT_INDEX_ABSENT_V1,
    ),
    writeU64LE(statement.totalInputValueSats),
    writeU64LE(statement.totalOutputValueSats),
    serializeAPNTBchTransactionProjectionV1(statement.transactionProjection),
  ]);
}

/** Canonical APNTTSV1 bytes. The Promise reflects deterministic nonce/scope recomputation. */
export async function serializeAPNTTransitionStatementV1(value: unknown): Promise<Uint8Array> {
  return encodeNormalizedStatement(await normalizeAPNTTransitionStatementV1(value));
}

class StatementReader {
  private offset = 0;

  public constructor(private readonly bytes: Uint8Array) {}

  private take(name: string, length: number): Uint8Array {
    if (length < 0 || this.offset > this.bytes.length || this.bytes.length - this.offset < length) {
      throw new Error(`APNTTransitionStatementV1 bytes are truncated at ${name}`);
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

  public fixed(name: string, length: number): Uint8Array {
    return this.take(name, length);
  }

  public bytes32(name: string): Bytes32 {
    return asBytes32(name, this.take(name, 32));
  }

  public remaining(): Uint8Array {
    return this.take("transactionProjection", this.bytes.length - this.offset);
  }
}

function networkFromByte(value: number): APNTTransitionNetworkV1 {
  if (value === 0) return "chipnet";
  if (value === 1) return "mainnet";
  if (value === 2) return "regtest";
  throw new Error("APNTTransitionStatementV1 bytes have unsupported network");
}

function modeFromByte(value: number): APNTTransitionModeV1 {
  if (value === 0) return APNT_TRANSITION_MODE_V1.PRIVATE_TRANSITION;
  if (value === 1) return APNT_TRANSITION_MODE_V1.COMPLETE_BUNDLE_EXIT;
  throw new Error("APNTTransitionStatementV1 bytes have unsupported mode");
}

function readPresence(reader: StatementReader, name: string): Bytes32 | null {
  const presence = reader.u8(`${name}.presence`);
  if (presence === 0) return null;
  if (presence === 1) return reader.bytes32(name);
  throw new Error(`APNTTransitionStatementV1 bytes have invalid ${name} presence tag`);
}

function assertParsedCount(name: string, value: number, cap: number): number {
  if (value > cap) throw new Error(`APNTTransitionStatementV1 bytes have invalid ${name}`);
  return value;
}

/**
 * Parses one exact canonical APNTTSV1 encoding. Encoded collection order must
 * already be canonical; truncation, trailing data, and V0 bytes reject.
 */
export async function parseAPNTTransitionStatementV1(value: unknown): Promise<APNTTransitionStatementV1> {
  if (!(value instanceof Uint8Array)) {
    throw new Error("APNTTransitionStatementV1 bytes must be a Uint8Array");
  }
  const sourceBytes = copyBytes(value);
  const reader = new StatementReader(sourceBytes);
  const magic = reader.fixed("magic", MAGIC.length);
  if (!bytesEqual(magic, MAGIC)) throw new Error("APNTTransitionStatementV1 bytes have invalid magic");
  const version = reader.u8("version");
  if (version !== APNT_TRANSITION_STATEMENT_V1_VERSION) {
    throw new Error("APNTTransitionStatementV1 bytes have unsupported version");
  }
  const protocolDomainLength = reader.u16("protocolDomain.length");
  let protocolDomain: string;
  try {
    protocolDomain = TEXT_DECODER.decode(reader.fixed("protocolDomain", protocolDomainLength));
  } catch {
    throw new Error("APNTTransitionStatementV1 bytes have invalid protocol domain encoding");
  }
  const network = networkFromByte(reader.u8("network"));
  const mode = modeFromByte(reader.u8("mode"));
  const privacyProfileId32 = reader.bytes32("privacyProfileId32");
  const proofRelationId32 = reader.bytes32("proofRelationId32");
  const sp1ProgramId32 = reader.bytes32("sp1ProgramId32");
  const verifierArtifactId32 = reader.bytes32("verifierArtifactId32");
  const designatedVerifierInputIndex = reader.u32("designatedVerifierInputIndex");
  const batchNonce32 = reader.bytes32("batchNonce32");
  const createdBackingCreationScope32 = readPresence(reader, "createdBackingCreationScope32");

  const consumedLogicalNoteCount = assertParsedCount(
    "consumed logical-note count",
    reader.u32("consumedLogicalNoteCount"),
    APNT_TRANSITION_STATEMENT_V1_MAX_LOGICAL_NOTES_PER_SIDE,
  );
  const consumedLogicalNotes: APNTTransitionConsumedLogicalNoteV1[] = [];
  for (let index = 0; index < consumedLogicalNoteCount; index += 1) {
    consumedLogicalNotes.push({
      consumedNoteCommitment32: reader.bytes32(
        `consumedLogicalNotes[${String(index)}].consumedNoteCommitment32`,
      ),
      nullifier32: reader.bytes32(`consumedLogicalNotes[${String(index)}].nullifier32`),
    });
  }

  const consumedBackingCellCount = assertParsedCount(
    "consumed backing-cell count",
    reader.u32("consumedBackingCellCount"),
    APNT_TRANSITION_STATEMENT_V1_MAX_BACKING_CELLS_PER_SIDE,
  );
  const consumedBackingCells: APNTTransitionConsumedBackingCellV1[] = [];
  for (let index = 0; index < consumedBackingCellCount; index += 1) {
    consumedBackingCells.push({
      inputIndex: reader.u32(`consumedBackingCells[${String(index)}].inputIndex`),
      sealCellCommitment32: reader.bytes32(
        `consumedBackingCells[${String(index)}].sealCellCommitment32`,
      ),
      lockingProfileId32: reader.bytes32(
        `consumedBackingCells[${String(index)}].lockingProfileId32`,
      ),
    });
  }

  const createdLogicalNoteCount = assertParsedCount(
    "created logical-note count",
    reader.u32("createdLogicalNoteCount"),
    APNT_TRANSITION_STATEMENT_V1_MAX_LOGICAL_NOTES_PER_SIDE,
  );
  const createdLogicalNotes: APNTTransitionCreatedLogicalNoteV1[] = [];
  for (let index = 0; index < createdLogicalNoteCount; index += 1) {
    createdLogicalNotes.push({
      createdNoteCommitment32: reader.bytes32(
        `createdLogicalNotes[${String(index)}].createdNoteCommitment32`,
      ),
      recoveryPacketIndex: reader.u32(
        `createdLogicalNotes[${String(index)}].recoveryPacketIndex`,
      ),
      recoveryPacketHash32: reader.bytes32(
        `createdLogicalNotes[${String(index)}].recoveryPacketHash32`,
      ),
    });
  }

  const createdBackingCellCount = assertParsedCount(
    "created backing-cell count",
    reader.u32("createdBackingCellCount"),
    APNT_TRANSITION_STATEMENT_V1_MAX_BACKING_CELLS_PER_SIDE,
  );
  const createdBackingCells: APNTTransitionCreatedBackingCellV1[] = [];
  for (let index = 0; index < createdBackingCellCount; index += 1) {
    createdBackingCells.push({
      outputIndex: reader.u32(`createdBackingCells[${String(index)}].outputIndex`),
      sealCellCommitment32: reader.bytes32(
        `createdBackingCells[${String(index)}].sealCellCommitment32`,
      ),
      lockingProfileId32: reader.bytes32(
        `createdBackingCells[${String(index)}].lockingProfileId32`,
      ),
      exitAuthorityCommitment32: reader.bytes32(
        `createdBackingCells[${String(index)}].exitAuthorityCommitment32`,
      ),
    });
  }
  const recoveryPacketTableCommitment32 = readPresence(
    reader,
    "recoveryPacketTableCommitment32",
  );
  const networkFeeSats = reader.u64("networkFeeSats");
  const aggregatorServiceFeeSats = reader.u64("aggregatorServiceFeeSats");
  const encodedAggregatorFeeOutputIndex = reader.u32("aggregatorFeeOutputIndex");
  const aggregatorFeeOutputIndex =
    encodedAggregatorFeeOutputIndex === APNT_TRANSITION_AGGREGATOR_FEE_OUTPUT_INDEX_ABSENT_V1
      ? null
      : encodedAggregatorFeeOutputIndex;
  const totalInputValueSats = reader.u64("totalInputValueSats");
  const totalOutputValueSats = reader.u64("totalOutputValueSats");
  const transactionProjection = parseAPNTBchTransactionProjectionV1(reader.remaining());

  const normalized = await normalizeAPNTTransitionStatementV1({
    version,
    protocolDomain,
    network,
    mode,
    privacyProfileId32,
    proofRelationId32,
    sp1ProgramId32,
    verifierArtifactId32,
    designatedVerifierInputIndex,
    batchNonce32,
    createdBackingCreationScope32,
    consumedLogicalNotes,
    consumedBackingCells,
    createdLogicalNotes,
    createdBackingCells,
    recoveryPacketTableCommitment32,
    networkFeeSats,
    aggregatorServiceFeeSats,
    aggregatorFeeOutputIndex,
    totalInputValueSats,
    totalOutputValueSats,
    transactionProjection,
  });
  if (!bytesEqual(sourceBytes, encodeNormalizedStatement(normalized))) {
    throw new Error("APNTTransitionStatementV1 bytes are not in canonical collection order");
  }
  return normalized;
}

/** Domain-separated commitment to the exact canonical APNTTSV1 bytes only. */
export async function deriveAPNTTransitionStatementCommitmentV1(
  value: unknown,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_TRANSITION_STATEMENT_V1_COMMITMENT_DOMAIN,
    await serializeAPNTTransitionStatementV1(value),
  );
}
