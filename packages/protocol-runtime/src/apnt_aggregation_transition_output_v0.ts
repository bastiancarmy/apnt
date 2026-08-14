// Maturity: preview — measured zero published importers and no published
// artifact references it. Read it, don't build on it. See AGENTS.md, "The
// maturity ladder".
import { asBytes32, bytesToHex, copyBytes, hexToBytes, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { serializeDeterministicUtf8 } from "./serialization.js";

export const APNT_AGGREGATION_TRANSITION_OUTPUT_V0_VERSION = 0;
export const APNT_AGGREGATION_TRANSITION_OUTPUT_V0_DOMAIN =
  "bch-cloak-apnt-v0:aggregation-transition-output";
export const APNT_AGGREGATION_TRANSITION_OUTPUT_V0_TAG = "BCHCLOAK_APNT_ATO_V0";
export const APNT_PLANE_B_PACKET_BIN_COMMITMENT_V0_DOMAIN =
  "bch-cloak-apnt-v0:plane-b-packet-bin-commitment";
// Revised MVP candidate: same-transaction Plane B carrier outputs form one batch packet bin.
export const APNT_PLANE_B_SAME_TX_BATCH_7X197_V0 =
  "apnt-plane-b-same-tx-batch-7x197-v0";
export const APNT_PLANE_B_SAME_TX_RECOVERY_10X197_V0 =
  "apnt-plane-b-same-tx-recovery-10x197-v0";
export const APNT_PLANE_B_SAME_TX_RECOVERY_15X197_V0 =
  "apnt-plane-b-same-tx-recovery-15x197-v0";
// Known fallback/evidence profile from prior Plane B work, not a default fanout claim.
export const APNT_PLANE_B_SHARDED_12X128_V0 =
  "apnt-plane-b-sharded-12x128-v0";
export const APNT_PLANE_B_SAME_TX_BATCH_7X197_CARRIER_PAYLOAD_BYTES_V0 = 197;
export const APNT_PLANE_B_SAME_TX_RECOVERY_10X197_CARRIER_PAYLOAD_BYTES_V0 = 197;
export const APNT_PLANE_B_SAME_TX_RECOVERY_10X197_CARRIER_COUNT_V0 = 10;
export const APNT_PLANE_B_SAME_TX_RECOVERY_10X197_PACKET_BIN_BYTES_V0 = 1970;
export const APNT_PLANE_B_SAME_TX_RECOVERY_15X197_CARRIER_PAYLOAD_BYTES_V0 = 197;
export const APNT_PLANE_B_SAME_TX_RECOVERY_15X197_CARRIER_COUNT_V0 = 15;
export const APNT_PLANE_B_SAME_TX_RECOVERY_15X197_PACKET_BIN_BYTES_V0 = 2955;
export const APNT_PLANE_B_SHARDED_12X128_CARRIER_PAYLOAD_BYTES_V0 = 128;
export const APNT_PLANE_B_CARRIER_LOCKING_BYTECODE_SHAPE_V0 =
  "<payload> OP_DROP OP_1";
export const APNT_PLANE_B_CURRENT_BCH_2026_DUST_RELAY_FEE_MULTIPLIER_V0 = 3;
export const APNT_PLANE_B_CURRENT_BCH_2026_DUST_INPUT_BYTES_V0 = 148;
export const APNT_PLANE_B_CURRENT_MVP_MINIMUM_PLANE_A_TRANSITION_OUTPUT_VALUE_SATS_V0 = "1";

const OP_1 = 0x51;
const OP_DROP = 0x75;
const OP_PUSHDATA1 = 0x4c;
const TEXT_ENCODER = new TextEncoder();
const TAG_BYTES = TEXT_ENCODER.encode(APNT_AGGREGATION_TRANSITION_OUTPUT_V0_TAG);

export type ApntPlaneBCarriageProfileIdV0 =
  | typeof APNT_PLANE_B_SAME_TX_BATCH_7X197_V0
  | typeof APNT_PLANE_B_SAME_TX_RECOVERY_10X197_V0
  | typeof APNT_PLANE_B_SAME_TX_RECOVERY_15X197_V0
  | typeof APNT_PLANE_B_SHARDED_12X128_V0;

export type ApntPlaneBPaddingPolicyV0 =
  | "none"
  | "profile-selected"
  | "fixed-class";

export type ApntPlaneBPacketBinCommitmentV0 = Readonly<{
  version: typeof APNT_AGGREGATION_TRANSITION_OUTPUT_V0_VERSION;
  domain: typeof APNT_PLANE_B_PACKET_BIN_COMMITMENT_V0_DOMAIN;
  carriageProfileId: ApntPlaneBCarriageProfileIdV0;
  carrierPayloadBytes: number;
  carrierCount: number;
  packetBinByteLength: number;
  packetBinRoot32: Bytes32;
  batchManifestRoot32: Bytes32;
  packetBinCommitment32: Bytes32;
  // Packet-bin reduction comes from shared manifest/envelope structure and padding policy.
  // ML-KEM ciphertext is high-entropy material and is not modeled as compressed.
  paddingPolicy: ApntPlaneBPaddingPolicyV0;
}>;

export type ApntPlaneBPacketBinCommitmentInputV0 = Omit<
  ApntPlaneBPacketBinCommitmentV0,
  "packetBinCommitment32"
>;

export type ApntAggregationTransitionOutputV0 = Readonly<{
  version: typeof APNT_AGGREGATION_TRANSITION_OUTPUT_V0_VERSION;
  domain: typeof APNT_AGGREGATION_TRANSITION_OUTPUT_V0_DOMAIN;
  transitionStatementBind32: Bytes32;
  consumedSealSetCommitment32: Bytes32;
  newNoteBatchRoot32: Bytes32;
  // Plane A binds a transaction-level Plane B packet bin, not public per-recipient groups.
  planeBPacketBinCommitment32: Bytes32;
  proofTranscriptBind32: Bytes32;
}>;

export type ApntAggregationTransitionOutputNonClaimsV0 = Readonly<{
  apntAcceptance: false;
  acceptedPrivateNote: false;
  privateNoteSpendability: false;
  productionPrivacy: false;
  proofVerificationAccepted: false;
  globalScalingSolved: false;
}>;

export const APNT_AGGREGATION_TRANSITION_OUTPUT_NON_CLAIMS_V0: ApntAggregationTransitionOutputNonClaimsV0 =
  Object.freeze({
    apntAcceptance: false,
    acceptedPrivateNote: false,
    privateNoteSpendability: false,
    productionPrivacy: false,
    proofVerificationAccepted: false,
    globalScalingSolved: false,
  });

export type ApntPlaneBCarrierValueSelectionSourceV0 =
  | "computed-dust-safe-minimum"
  | "explicit-override-at-or-above-minimum";

export type ApntPlaneBCarrierFundingStatusV0 =
  | "funded"
  | "funding-shortfall";

export type ApntPlaneBCarrierValueAccountingV0 = Readonly<{
  status: ApntPlaneBCarrierFundingStatusV0;
  carriageProfileId: ApntPlaneBCarriageProfileIdV0;
  carrierLockingBytecodeShape: typeof APNT_PLANE_B_CARRIER_LOCKING_BYTECODE_SHAPE_V0;
  carrierPayloadBytes: number;
  carrierLockingBytecodeLength: number;
  carrierDustMinimumValueSats: string;
  carrierOutputValueSats: string;
  carrierValueSelectionSource: ApntPlaneBCarrierValueSelectionSourceV0;
  carrierCountPerBin: number;
  packetBinCount: number;
  totalPlaneBCarrierOutputs: number;
  totalPlaneBCarrierValueSats: string;
  consumeFeeSats: string;
  minimumPlaneATransitionOutputValueSats: string;
  minimumPlaneATransitionOutputValueRule: "live-validation-current-mvp-positive-plane-a-output";
  requiredSelectedSealInputValueSats: string;
  availableSelectedSealInputValueSats: string;
  fundingShortfallSats: string;
  carrierValuesArePrivateNoteValues: false;
  carrierValuesAreBchPostage: true;
  dustPolicy: Readonly<{
    policyBasis: "current-bch-2026-local-validation-policy-not-consensus";
    dustRelayFeeMultiplier: typeof APNT_PLANE_B_CURRENT_BCH_2026_DUST_RELAY_FEE_MULTIPLIER_V0;
    assumedInputBytes: typeof APNT_PLANE_B_CURRENT_BCH_2026_DUST_INPUT_BYTES_V0;
  }>;
}>;

export type BuildApntPlaneBCarrierValueAccountingV0Args = Readonly<{
  carriageProfileId: ApntPlaneBCarriageProfileIdV0;
  carrierPayloadBytes: number;
  carrierCountPerBin: number;
  packetBinCount: number;
  consumeFeeSats: string | bigint;
  availableSelectedSealInputValueSats: string | bigint;
  carrierOutputValueSatsOverride?: string | bigint | undefined;
  minimumPlaneATransitionOutputValueSats?: string | bigint | undefined;
}>;

function assertRecord(name: string, value: unknown): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
}

function assertKnownKeys(name: string, value: Record<string, unknown>, keys: readonly string[]): void {
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new Error(`${name} contains unknown field ${key}`);
    }
  }
}

function assertLiteral<T extends string | number>(
  name: string,
  value: unknown,
  expected: T,
): T {
  if (value !== expected) {
    throw new Error(`${name} must be ${String(expected)}`);
  }
  return expected;
}

function assertNonNegativeSafeInteger(name: string, value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`${name} must be a non-negative safe integer`);
  }
  return value as number;
}

function assertPositiveSafeInteger(name: string, value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new Error(`${name} must be a positive safe integer`);
  }
  return value as number;
}

function assertNonNegativeDecimalString(name: string, value: string | bigint): string {
  const text = typeof value === "bigint" ? value.toString(10) : value;
  if (!/^(0|[1-9][0-9]*)$/u.test(text)) {
    throw new Error(`${name} must be a non-negative decimal string`);
  }
  return text;
}

function assertPositiveDecimalString(name: string, value: string | bigint): string {
  const text = typeof value === "bigint" ? value.toString(10) : value;
  if (!/^[1-9][0-9]*$/u.test(text)) {
    throw new Error(`${name} must be a positive decimal string`);
  }
  return text;
}

function assertBytes32(name: string, value: unknown): Bytes32 {
  if (!(value instanceof Uint8Array)) {
    throw new Error(`${name} must be a Uint8Array`);
  }
  return asBytes32(name, value);
}

function assertPlaneBCarriageProfileId(
  name: string,
  value: unknown,
): ApntPlaneBCarriageProfileIdV0 {
  if (
    value !== APNT_PLANE_B_SAME_TX_BATCH_7X197_V0 &&
    value !== APNT_PLANE_B_SAME_TX_RECOVERY_10X197_V0 &&
    value !== APNT_PLANE_B_SAME_TX_RECOVERY_15X197_V0 &&
    value !== APNT_PLANE_B_SHARDED_12X128_V0
  ) {
    throw new Error(
      `${name} must be ${APNT_PLANE_B_SAME_TX_BATCH_7X197_V0}, ${APNT_PLANE_B_SAME_TX_RECOVERY_10X197_V0}, ${APNT_PLANE_B_SAME_TX_RECOVERY_15X197_V0}, or ${APNT_PLANE_B_SHARDED_12X128_V0}`,
    );
  }
  return value;
}

function assertPaddingPolicy(name: string, value: unknown): ApntPlaneBPaddingPolicyV0 {
  if (value !== "none" && value !== "profile-selected" && value !== "fixed-class") {
    throw new Error(`${name} must be none, profile-selected, or fixed-class`);
  }
  return value;
}

function pushData(bytes: Uint8Array): Uint8Array {
  if (bytes.length > 75) {
    throw new Error("APNT aggregation transition output v0 pushdata exceeds direct-push length");
  }
  return Uint8Array.of(bytes.length, ...bytes);
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

function compactSizeLength(value: number): number {
  if (value < 0xfd) return 1;
  if (value <= 0xffff) return 3;
  if (value <= 0xffffffff) return 5;
  return 9;
}

export function buildApntPlaneBCarrierLockingBytecodeV0(
  payload: Uint8Array,
): Uint8Array {
  if (!(payload instanceof Uint8Array)) {
    throw new Error("APNT Plane B carrier payload must be a Uint8Array");
  }
  if (payload.length < 1 || payload.length > 255) {
    throw new Error("APNT Plane B carrier payload must be 1..255 bytes");
  }
  if (payload.length <= 75) {
    return Uint8Array.of(payload.length, ...payload, OP_DROP, OP_1);
  }
  return Uint8Array.of(OP_PUSHDATA1, payload.length, ...payload, OP_DROP, OP_1);
}

export function buildApntPlaneBCarrierLockingBytecodeHexV0(
  payload: Uint8Array,
): string {
  return bytesToHex(buildApntPlaneBCarrierLockingBytecodeV0(payload));
}

export function apntCurrentBch2026DustMinimumValueSatsForLockingBytecodeV0(
  lockingBytecode: Uint8Array,
): bigint {
  if (!(lockingBytecode instanceof Uint8Array)) {
    throw new Error("APNT Plane B carrier locking bytecode must be a Uint8Array");
  }
  const outputSerializedBytes =
    8 + compactSizeLength(lockingBytecode.length) + lockingBytecode.length;
  return BigInt(APNT_PLANE_B_CURRENT_BCH_2026_DUST_RELAY_FEE_MULTIPLIER_V0) *
    BigInt(APNT_PLANE_B_CURRENT_BCH_2026_DUST_INPUT_BYTES_V0 + outputSerializedBytes);
}

export function buildApntPlaneBCarrierValueAccountingV0(
  args: BuildApntPlaneBCarrierValueAccountingV0Args,
): ApntPlaneBCarrierValueAccountingV0 {
  const carriageProfileId = assertPlaneBCarriageProfileId(
    "BuildApntPlaneBCarrierValueAccountingV0Args.carriageProfileId",
    args.carriageProfileId,
  );
  const carrierPayloadBytes = assertPositiveSafeInteger(
    "BuildApntPlaneBCarrierValueAccountingV0Args.carrierPayloadBytes",
    args.carrierPayloadBytes,
  );
  const carrierCountPerBin = assertPositiveSafeInteger(
    "BuildApntPlaneBCarrierValueAccountingV0Args.carrierCountPerBin",
    args.carrierCountPerBin,
  );
  const packetBinCount = assertPositiveSafeInteger(
    "BuildApntPlaneBCarrierValueAccountingV0Args.packetBinCount",
    args.packetBinCount,
  );
  const consumeFeeSats = assertNonNegativeDecimalString(
    "BuildApntPlaneBCarrierValueAccountingV0Args.consumeFeeSats",
    args.consumeFeeSats,
  );
  const availableSelectedSealInputValueSats = assertNonNegativeDecimalString(
    "BuildApntPlaneBCarrierValueAccountingV0Args.availableSelectedSealInputValueSats",
    args.availableSelectedSealInputValueSats,
  );
  const minimumPlaneATransitionOutputValueSats = assertNonNegativeDecimalString(
    "BuildApntPlaneBCarrierValueAccountingV0Args.minimumPlaneATransitionOutputValueSats",
    args.minimumPlaneATransitionOutputValueSats ??
      APNT_PLANE_B_CURRENT_MVP_MINIMUM_PLANE_A_TRANSITION_OUTPUT_VALUE_SATS_V0,
  );
  const carrierLockingBytecode = buildApntPlaneBCarrierLockingBytecodeV0(
    new Uint8Array(carrierPayloadBytes),
  );
  const carrierDustMinimumValueSats =
    apntCurrentBch2026DustMinimumValueSatsForLockingBytecodeV0(carrierLockingBytecode);
  const override = args.carrierOutputValueSatsOverride === undefined
    ? undefined
    : assertPositiveDecimalString(
      "BuildApntPlaneBCarrierValueAccountingV0Args.carrierOutputValueSatsOverride",
      args.carrierOutputValueSatsOverride,
    );
  const selectedCarrierValueSats = override === undefined
    ? carrierDustMinimumValueSats
    : BigInt(override);
  if (selectedCarrierValueSats < carrierDustMinimumValueSats) {
    throw new Error(
      [
        "APNT Plane B carrier output value below computed dust/min-output requirement",
        `carrierOutputValueSats=${selectedCarrierValueSats.toString(10)}`,
        `carrierDustMinimumValueSats=${carrierDustMinimumValueSats.toString(10)}`,
        `carrierLockingBytecodeLength=${String(carrierLockingBytecode.length)}`,
        `carrierPayloadBytes=${String(carrierPayloadBytes)}`,
        `carriageProfileId=${carriageProfileId}`,
      ].join("; "),
    );
  }
  const totalPlaneBCarrierOutputs = carrierCountPerBin * packetBinCount;
  const totalPlaneBCarrierValueSats =
    selectedCarrierValueSats * BigInt(totalPlaneBCarrierOutputs);
  const requiredSelectedSealInputValueSats =
    totalPlaneBCarrierValueSats + BigInt(consumeFeeSats) +
    BigInt(minimumPlaneATransitionOutputValueSats);
  const available = BigInt(availableSelectedSealInputValueSats);
  const fundingShortfall =
    available >= requiredSelectedSealInputValueSats
      ? 0n
      : requiredSelectedSealInputValueSats - available;

  return Object.freeze({
    status: fundingShortfall === 0n ? "funded" : "funding-shortfall",
    carriageProfileId,
    carrierLockingBytecodeShape: APNT_PLANE_B_CARRIER_LOCKING_BYTECODE_SHAPE_V0,
    carrierPayloadBytes,
    carrierLockingBytecodeLength: carrierLockingBytecode.length,
    carrierDustMinimumValueSats: carrierDustMinimumValueSats.toString(10),
    carrierOutputValueSats: selectedCarrierValueSats.toString(10),
    carrierValueSelectionSource: override === undefined
      ? "computed-dust-safe-minimum"
      : "explicit-override-at-or-above-minimum",
    carrierCountPerBin,
    packetBinCount,
    totalPlaneBCarrierOutputs,
    totalPlaneBCarrierValueSats: totalPlaneBCarrierValueSats.toString(10),
    consumeFeeSats,
    minimumPlaneATransitionOutputValueSats,
    minimumPlaneATransitionOutputValueRule:
      "live-validation-current-mvp-positive-plane-a-output",
    requiredSelectedSealInputValueSats: requiredSelectedSealInputValueSats.toString(10),
    availableSelectedSealInputValueSats,
    fundingShortfallSats: fundingShortfall.toString(10),
    carrierValuesArePrivateNoteValues: false,
    carrierValuesAreBchPostage: true,
    dustPolicy: Object.freeze({
      policyBasis: "current-bch-2026-local-validation-policy-not-consensus",
      dustRelayFeeMultiplier:
        APNT_PLANE_B_CURRENT_BCH_2026_DUST_RELAY_FEE_MULTIPLIER_V0,
      assumedInputBytes: APNT_PLANE_B_CURRENT_BCH_2026_DUST_INPUT_BYTES_V0,
    }),
  });
}

function normalizePlaneBPacketBinCommitmentInputV0(
  value: unknown,
): ApntPlaneBPacketBinCommitmentInputV0 {
  assertRecord("ApntPlaneBPacketBinCommitmentInputV0", value);
  assertKnownKeys("ApntPlaneBPacketBinCommitmentInputV0", value, [
    "version",
    "domain",
    "carriageProfileId",
    "carrierPayloadBytes",
    "carrierCount",
    "packetBinByteLength",
    "packetBinRoot32",
    "batchManifestRoot32",
    "paddingPolicy",
  ]);

  return Object.freeze({
    version: assertLiteral(
      "ApntPlaneBPacketBinCommitmentInputV0.version",
      value.version,
      APNT_AGGREGATION_TRANSITION_OUTPUT_V0_VERSION,
    ),
    domain: assertLiteral(
      "ApntPlaneBPacketBinCommitmentInputV0.domain",
      value.domain,
      APNT_PLANE_B_PACKET_BIN_COMMITMENT_V0_DOMAIN,
    ),
    carriageProfileId: assertPlaneBCarriageProfileId(
      "ApntPlaneBPacketBinCommitmentInputV0.carriageProfileId",
      value.carriageProfileId,
    ),
    carrierPayloadBytes: assertNonNegativeSafeInteger(
      "ApntPlaneBPacketBinCommitmentInputV0.carrierPayloadBytes",
      value.carrierPayloadBytes,
    ),
    carrierCount: assertNonNegativeSafeInteger(
      "ApntPlaneBPacketBinCommitmentInputV0.carrierCount",
      value.carrierCount,
    ),
    packetBinByteLength: assertNonNegativeSafeInteger(
      "ApntPlaneBPacketBinCommitmentInputV0.packetBinByteLength",
      value.packetBinByteLength,
    ),
    packetBinRoot32: assertBytes32(
      "ApntPlaneBPacketBinCommitmentInputV0.packetBinRoot32",
      value.packetBinRoot32,
    ),
    batchManifestRoot32: assertBytes32(
      "ApntPlaneBPacketBinCommitmentInputV0.batchManifestRoot32",
      value.batchManifestRoot32,
    ),
    paddingPolicy: assertPaddingPolicy(
      "ApntPlaneBPacketBinCommitmentInputV0.paddingPolicy",
      value.paddingPolicy,
    ),
  });
}

export function normalizeApntPlaneBPacketBinCommitmentV0(
  value: unknown,
): ApntPlaneBPacketBinCommitmentV0 {
  assertRecord("ApntPlaneBPacketBinCommitmentV0", value);
  assertKnownKeys("ApntPlaneBPacketBinCommitmentV0", value, [
    "version",
    "domain",
    "carriageProfileId",
    "carrierPayloadBytes",
    "carrierCount",
    "packetBinByteLength",
    "packetBinRoot32",
    "batchManifestRoot32",
    "packetBinCommitment32",
    "paddingPolicy",
  ]);
  const input = {
    version: value.version,
    domain: value.domain,
    carriageProfileId: value.carriageProfileId,
    carrierPayloadBytes: value.carrierPayloadBytes,
    carrierCount: value.carrierCount,
    packetBinByteLength: value.packetBinByteLength,
    packetBinRoot32: value.packetBinRoot32,
    batchManifestRoot32: value.batchManifestRoot32,
    paddingPolicy: value.paddingPolicy,
  };

  return Object.freeze({
    ...normalizePlaneBPacketBinCommitmentInputV0(input),
    packetBinCommitment32: assertBytes32(
      "ApntPlaneBPacketBinCommitmentV0.packetBinCommitment32",
      value.packetBinCommitment32,
    ),
  });
}

export function normalizeApntAggregationTransitionOutputV0(
  value: unknown,
): ApntAggregationTransitionOutputV0 {
  assertRecord("ApntAggregationTransitionOutputV0", value);
  assertKnownKeys("ApntAggregationTransitionOutputV0", value, [
    "version",
    "domain",
    "transitionStatementBind32",
    "consumedSealSetCommitment32",
    "newNoteBatchRoot32",
    "planeBPacketBinCommitment32",
    "proofTranscriptBind32",
  ]);

  return Object.freeze({
    version: assertLiteral(
      "ApntAggregationTransitionOutputV0.version",
      value.version,
      APNT_AGGREGATION_TRANSITION_OUTPUT_V0_VERSION,
    ),
    domain: assertLiteral(
      "ApntAggregationTransitionOutputV0.domain",
      value.domain,
      APNT_AGGREGATION_TRANSITION_OUTPUT_V0_DOMAIN,
    ),
    transitionStatementBind32: assertBytes32(
      "ApntAggregationTransitionOutputV0.transitionStatementBind32",
      value.transitionStatementBind32,
    ),
    consumedSealSetCommitment32: assertBytes32(
      "ApntAggregationTransitionOutputV0.consumedSealSetCommitment32",
      value.consumedSealSetCommitment32,
    ),
    newNoteBatchRoot32: assertBytes32(
      "ApntAggregationTransitionOutputV0.newNoteBatchRoot32",
      value.newNoteBatchRoot32,
    ),
    planeBPacketBinCommitment32: assertBytes32(
      "ApntAggregationTransitionOutputV0.planeBPacketBinCommitment32",
      value.planeBPacketBinCommitment32,
    ),
    proofTranscriptBind32: assertBytes32(
      "ApntAggregationTransitionOutputV0.proofTranscriptBind32",
      value.proofTranscriptBind32,
    ),
  });
}

export function serializeApntPlaneBPacketBinCommitmentInputV0(
  value: unknown,
): Uint8Array {
  const normalized = normalizePlaneBPacketBinCommitmentInputV0(value);
  return serializeDeterministicUtf8({
    version: normalized.version,
    domain: normalized.domain,
    carriageProfileId: normalized.carriageProfileId,
    carrierPayloadBytes: normalized.carrierPayloadBytes,
    carrierCount: normalized.carrierCount,
    packetBinByteLength: normalized.packetBinByteLength,
    packetBinRoot32: normalized.packetBinRoot32,
    batchManifestRoot32: normalized.batchManifestRoot32,
    paddingPolicy: normalized.paddingPolicy,
  });
}

export async function buildApntPlaneBPacketBinCommitmentV0(
  value: unknown,
): Promise<ApntPlaneBPacketBinCommitmentV0> {
  const normalized = normalizePlaneBPacketBinCommitmentInputV0(value);
  const packetBinCommitment32 = await sha256DomainSeparated(
    APNT_PLANE_B_PACKET_BIN_COMMITMENT_V0_DOMAIN,
    serializeApntPlaneBPacketBinCommitmentInputV0(normalized),
  );

  return Object.freeze({
    ...normalized,
    packetBinCommitment32,
  });
}

export function serializeApntAggregationTransitionOutputV0(
  value: unknown,
): Uint8Array {
  const normalized = normalizeApntAggregationTransitionOutputV0(value);
  return serializeDeterministicUtf8({
    version: normalized.version,
    domain: normalized.domain,
    transitionStatementBind32: normalized.transitionStatementBind32,
    consumedSealSetCommitment32: normalized.consumedSealSetCommitment32,
    newNoteBatchRoot32: normalized.newNoteBatchRoot32,
    planeBPacketBinCommitment32: normalized.planeBPacketBinCommitment32,
    proofTranscriptBind32: normalized.proofTranscriptBind32,
  });
}

export function buildApntAggregationTransitionOutputBytecodeV0(
  value: unknown,
): Uint8Array {
  const normalized = normalizeApntAggregationTransitionOutputV0(value);
  return concatBytes([
    pushData(TAG_BYTES),
    Uint8Array.of(OP_DROP),
    pushData(Uint8Array.of(normalized.version)),
    Uint8Array.of(OP_DROP),
    pushData(normalized.transitionStatementBind32),
    Uint8Array.of(OP_DROP),
    pushData(normalized.consumedSealSetCommitment32),
    Uint8Array.of(OP_DROP),
    pushData(normalized.newNoteBatchRoot32),
    Uint8Array.of(OP_DROP),
    pushData(normalized.planeBPacketBinCommitment32),
    Uint8Array.of(OP_DROP),
    pushData(normalized.proofTranscriptBind32),
    Uint8Array.of(OP_DROP, OP_1),
  ]);
}

export function buildApntAggregationTransitionOutputLockingBytecodeHexV0(
  value: unknown,
): string {
  return bytesToHex(buildApntAggregationTransitionOutputBytecodeV0(value));
}

/**
 * Exact byte offsets of the five 32-byte Plane A commitment fields inside
 * `buildApntAggregationTransitionOutputBytecodeV0` output.
 *
 * The layout is fixed: `<tag> OP_DROP <version> OP_DROP` then five
 * `<32-byte push> OP_DROP` pairs, then `OP_1`. Each field therefore starts one
 * byte after the previous field's `OP_DROP` (its own push-length byte), so the
 * offsets are derived here from that layout rather than transcribed, and the
 * derivation is cross-checked against a real bytecode scan in the tests.
 */
const TRANSITION_OUTPUT_PREFIX_BYTES =
  1 + TAG_BYTES.length + // tag push
  1 + // OP_DROP
  1 + 1 + // version push
  1; // OP_DROP
const TRANSITION_OUTPUT_FIELD_STRIDE_BYTES = 32 + 1 + 1; // data + OP_DROP + next push length
const TRANSITION_OUTPUT_FIRST_FIELD_OFFSET = TRANSITION_OUTPUT_PREFIX_BYTES + 1;

export const APNT_AGGREGATION_TRANSITION_OUTPUT_V0_COMMITMENT_FIELD_ORDER = Object.freeze([
  "transitionStatementBind32",
  "consumedSealSetCommitment32",
  "newNoteBatchRoot32",
  "planeBPacketBinCommitment32",
  "proofTranscriptBind32",
] as const);
export type ApntAggregationTransitionOutputCommitmentFieldV0 =
  (typeof APNT_AGGREGATION_TRANSITION_OUTPUT_V0_COMMITMENT_FIELD_ORDER)[number];

export const APNT_AGGREGATION_TRANSITION_OUTPUT_V0_COMMITMENT_FIELD_OFFSETS: Readonly<
  Record<ApntAggregationTransitionOutputCommitmentFieldV0, number>
> = Object.freeze(
  Object.fromEntries(
    APNT_AGGREGATION_TRANSITION_OUTPUT_V0_COMMITMENT_FIELD_ORDER.map((field, index) => [
      field,
      TRANSITION_OUTPUT_FIRST_FIELD_OFFSET + index * TRANSITION_OUTPUT_FIELD_STRIDE_BYTES,
    ]),
  ) as Record<ApntAggregationTransitionOutputCommitmentFieldV0, number>,
);

export const APNT_AGGREGATION_TRANSITION_OUTPUT_V0_LOCKING_BYTECODE_BYTES =
  TRANSITION_OUTPUT_PREFIX_BYTES +
  APNT_AGGREGATION_TRANSITION_OUTPUT_V0_COMMITMENT_FIELD_ORDER.length *
    (1 + 32 + 1) +
  1;

/**
 * The single `APNTBchTransactionProjectionV1` statement-commitment slot this
 * output offers.
 *
 * The projection format reserves exactly one zeroable 32-byte slot per output.
 * It is designated here on `proofTranscriptBind32`, deliberately **not** on
 * `transitionStatementBind32`.
 *
 * Reason. The statement commitment is `sha256` over the canonical statement,
 * which embeds the projection template with this slot already zeroed. Any
 * field placed *outside* the slot is therefore an input to the statement
 * commitment. `ApntProofTranscriptBindPreimageV0` takes
 * `transitionStatementBind32` as one of its own preimage fields, so
 * `proofTranscriptBind32` is a strict function of `transitionStatementBind32`
 * and never the reverse. Designating the slot on `transitionStatementBind32`
 * would put the derived value outside the slot and the value it derives from
 * inside it, making the template depend on a value derived from the template.
 * Designating it on `proofTranscriptBind32` keeps the dependency one-way:
 * the four remaining fields fix the template, the template fixes the statement
 * commitment, and the slot carries the transcript bind derived from them.
 *
 * `transitionStatementBind32` remains a plain, fully present field of this
 * output at its own offset; it is simply not the slotted one. Every consumer
 * that needs it — recipient recovery's transition-output evidence check, the
 * Plane A parser, the wallet acceptance path — reads it from that plain field
 * and is unaffected by which field the projection designates.
 */
export const APNT_AGGREGATION_TRANSITION_OUTPUT_V0_STATEMENT_COMMITMENT_SLOT_FIELD =
  "proofTranscriptBind32" as const;

export const APNT_AGGREGATION_TRANSITION_OUTPUT_V0_STATEMENT_COMMITMENT_SLOT_OFFSET =
  APNT_AGGREGATION_TRANSITION_OUTPUT_V0_COMMITMENT_FIELD_OFFSETS[
    APNT_AGGREGATION_TRANSITION_OUTPUT_V0_STATEMENT_COMMITMENT_SLOT_FIELD
  ];

export type ApntAggregationTransitionOutputProjectionSlotV0 = Readonly<{
  /** Exact on-chain locking bytecode, every field present. */
  lockingBytecode: Uint8Array;
  /** The same bytecode with the designated statement-commitment slot zeroed. */
  lockingBytecodeTemplate: Uint8Array;
  /** `APNTTransitionProjectionOutputV1.statementCommitmentOffset` for this output. */
  statementCommitmentOffset: number;
  slotField: typeof APNT_AGGREGATION_TRANSITION_OUTPUT_V0_STATEMENT_COMMITMENT_SLOT_FIELD;
  slotValue32: Bytes32;
}>;

/**
 * Builds the exact locking bytecode for one APNT v0 transition-boundary output
 * together with the canonical projection template and slot offset that
 * `APNTBchTransactionProjectionV1` requires for it.
 *
 * The template is the byte-for-byte locking bytecode with the designated slot
 * zeroed; the projection normalizer rejects any offset whose 32 bytes are not
 * already zero, so this is the only shape it accepts.
 */
export function buildApntAggregationTransitionOutputProjectionSlotV0(
  value: unknown,
): ApntAggregationTransitionOutputProjectionSlotV0 {
  const normalized = normalizeApntAggregationTransitionOutputV0(value);
  const lockingBytecode = buildApntAggregationTransitionOutputBytecodeV0(normalized);
  if (lockingBytecode.length !== APNT_AGGREGATION_TRANSITION_OUTPUT_V0_LOCKING_BYTECODE_BYTES) {
    throw new Error(
      "APNT aggregation transition output v0 locking bytecode length does not match the fixed v0 layout",
    );
  }
  const offset = APNT_AGGREGATION_TRANSITION_OUTPUT_V0_STATEMENT_COMMITMENT_SLOT_OFFSET;
  const slotValue32 = asBytes32(
    "ApntAggregationTransitionOutputProjectionSlotV0.slotValue32",
    lockingBytecode.slice(offset, offset + 32),
  );
  const slotField = APNT_AGGREGATION_TRANSITION_OUTPUT_V0_STATEMENT_COMMITMENT_SLOT_FIELD;
  if (bytesToHex(slotValue32) !== bytesToHex(normalized[slotField])) {
    throw new Error(
      "APNT aggregation transition output v0 statement-commitment slot does not carry the designated field",
    );
  }
  const lockingBytecodeTemplate = Uint8Array.from(lockingBytecode);
  lockingBytecodeTemplate.fill(0, offset, offset + 32);
  return Object.freeze({
    lockingBytecode,
    lockingBytecodeTemplate,
    statementCommitmentOffset: offset,
    slotField,
    slotValue32,
  });
}

function parsePush(
  bytecode: Uint8Array,
  offset: number,
  expectedLength: number,
  name: string,
): readonly [Uint8Array, number] {
  if (offset >= bytecode.length) {
    throw new Error(`APNT aggregation transition output v0 missing ${name}`);
  }
  const length = bytecode[offset];
  if (length !== expectedLength) {
    throw new Error(
      `APNT aggregation transition output v0 malformed ${name} length: expected ${String(expectedLength)}, got ${String(length)}`,
    );
  }
  const start = offset + 1;
  const end = start + length;
  if (end > bytecode.length) {
    throw new Error(`APNT aggregation transition output v0 truncated ${name}`);
  }
  return [copyBytes(bytecode.slice(start, end)), end];
}

function parseDrop(bytecode: Uint8Array, offset: number, name: string): number {
  if (bytecode[offset] !== OP_DROP) {
    throw new Error(`APNT aggregation transition output v0 missing OP_DROP after ${name}`);
  }
  return offset + 1;
}

export function parseApntAggregationTransitionOutputBytecodeV0(
  bytecode: Uint8Array,
): ApntAggregationTransitionOutputV0 {
  if (!(bytecode instanceof Uint8Array)) {
    throw new Error("APNT aggregation transition output v0 bytecode must be a Uint8Array");
  }

  let offset = 0;
  let pushed: Uint8Array;

  [pushed, offset] = parsePush(bytecode, offset, TAG_BYTES.length, "tag");
  if (bytesToHex(pushed) !== bytesToHex(TAG_BYTES)) {
    throw new Error("APNT aggregation transition output v0 malformed tag");
  }
  offset = parseDrop(bytecode, offset, "tag");

  [pushed, offset] = parsePush(bytecode, offset, 1, "version");
  if (pushed[0] !== APNT_AGGREGATION_TRANSITION_OUTPUT_V0_VERSION) {
    throw new Error("APNT aggregation transition output v0 unsupported version");
  }
  offset = parseDrop(bytecode, offset, "version");

  let transitionStatementBind32: Uint8Array;
  let consumedSealSetCommitment32: Uint8Array;
  let newNoteBatchRoot32: Uint8Array;
  let planeBPacketBinCommitment32: Uint8Array;
  let proofTranscriptBind32: Uint8Array;

  [transitionStatementBind32, offset] = parsePush(
    bytecode,
    offset,
    32,
    "transitionStatementBind32",
  );
  offset = parseDrop(bytecode, offset, "transitionStatementBind32");
  [consumedSealSetCommitment32, offset] = parsePush(
    bytecode,
    offset,
    32,
    "consumedSealSetCommitment32",
  );
  offset = parseDrop(bytecode, offset, "consumedSealSetCommitment32");
  [newNoteBatchRoot32, offset] = parsePush(bytecode, offset, 32, "newNoteBatchRoot32");
  offset = parseDrop(bytecode, offset, "newNoteBatchRoot32");
  [planeBPacketBinCommitment32, offset] = parsePush(
    bytecode,
    offset,
    32,
    "planeBPacketBinCommitment32",
  );
  offset = parseDrop(bytecode, offset, "planeBPacketBinCommitment32");
  [proofTranscriptBind32, offset] = parsePush(bytecode, offset, 32, "proofTranscriptBind32");
  offset = parseDrop(bytecode, offset, "proofTranscriptBind32");

  if (bytecode[offset] !== OP_1) {
    throw new Error("APNT aggregation transition output v0 missing OP_1 placeholder spend condition");
  }
  offset += 1;
  if (offset !== bytecode.length) {
    throw new Error("APNT aggregation transition output v0 has trailing bytes");
  }

  return normalizeApntAggregationTransitionOutputV0({
    version: APNT_AGGREGATION_TRANSITION_OUTPUT_V0_VERSION,
    domain: APNT_AGGREGATION_TRANSITION_OUTPUT_V0_DOMAIN,
    transitionStatementBind32,
    consumedSealSetCommitment32,
    newNoteBatchRoot32,
    planeBPacketBinCommitment32,
    proofTranscriptBind32,
  });
}

export function parseApntAggregationTransitionOutputLockingBytecodeHexV0(
  lockingBytecode: string,
): ApntAggregationTransitionOutputV0 {
  return parseApntAggregationTransitionOutputBytecodeV0(
    hexToBytes("ApntAggregationTransitionOutputV0.lockingBytecode", lockingBytecode),
  );
}
