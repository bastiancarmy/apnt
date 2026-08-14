import { asBytes32, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { serializeDeterministicUtf8 } from "./serialization.js";
import { type StateCellNetworkV0 } from "./state.js";

export const SPEND_AUTHORIZATION_INTENT_V0_VERSION = 0;
export const SPEND_AUTHORIZATION_INTENT_V0_HASH_DOMAIN =
  "bch-cloak-apnt-v0:spend-authorization-intent";

export const AGGREGATION_BATCH_V0_VERSION = 0;
export const AGGREGATION_BATCH_V0_HASH_DOMAIN = "bch-cloak-apnt-v0:aggregation-batch";

export type SpendAuthorizationIntentV0 = Readonly<{
  version: typeof SPEND_AUTHORIZATION_INTENT_V0_VERSION;
  network: StateCellNetworkV0;
  inputNoteCommitment: Bytes32;
  inputStateCommitment: Bytes32;
  nullifierCommitment: Bytes32;
  bobNoteCommitment: Bytes32;
  aliceResidueNoteCommitment: Bytes32;
  recipientPacketHash: Bytes32;
  outgoingPacketHash: Bytes32;
  maxFeeSats: bigint;
  expiryHeight: bigint;
  batchConstraintHash: Bytes32;
}>;

export type AggregationBatchV0 = Readonly<{
  version: typeof AGGREGATION_BATCH_V0_VERSION;
  network: StateCellNetworkV0;
  inputStateCommitment: Bytes32;
  outputStateCommitment: Bytes32;
  intentHashes: readonly Bytes32[];
  recipientPacketHashes: readonly Bytes32[];
  outgoingPacketHashes: readonly Bytes32[];
  batchCounter: bigint;
}>;

const NETWORKS_V0 = new Set<StateCellNetworkV0>(["chipnet", "mainnet", "regtest"]);

function assertNetwork(name: string, network: StateCellNetworkV0): void {
  if (!NETWORKS_V0.has(network)) {
    throw new Error(`${name} must be chipnet, mainnet, or regtest`);
  }
}

function assertNonNegativeBigInt(name: string, value: bigint): void {
  if (typeof value !== "bigint" || value < 0n) {
    throw new Error(`${name} must be a non-negative bigint`);
  }
}

function normalizeBytes32Array(name: string, values: readonly Bytes32[]): readonly Bytes32[] {
  if (!Array.isArray(values)) {
    throw new Error(`${name} must be an array`);
  }
  return Object.freeze(values.map((value, index) => asBytes32(`${name}[${String(index)}]`, value)));
}

export function normalizeSpendAuthorizationIntentV0(
  intent: SpendAuthorizationIntentV0,
): SpendAuthorizationIntentV0 {
  if (intent.version !== SPEND_AUTHORIZATION_INTENT_V0_VERSION) {
    throw new Error("SpendAuthorizationIntentV0.version must be 0");
  }
  assertNetwork("SpendAuthorizationIntentV0.network", intent.network);
  assertNonNegativeBigInt("SpendAuthorizationIntentV0.maxFeeSats", intent.maxFeeSats);
  assertNonNegativeBigInt("SpendAuthorizationIntentV0.expiryHeight", intent.expiryHeight);
  return Object.freeze({
    version: SPEND_AUTHORIZATION_INTENT_V0_VERSION,
    network: intent.network,
    inputNoteCommitment: asBytes32(
      "SpendAuthorizationIntentV0.inputNoteCommitment",
      intent.inputNoteCommitment,
    ),
    inputStateCommitment: asBytes32(
      "SpendAuthorizationIntentV0.inputStateCommitment",
      intent.inputStateCommitment,
    ),
    nullifierCommitment: asBytes32(
      "SpendAuthorizationIntentV0.nullifierCommitment",
      intent.nullifierCommitment,
    ),
    bobNoteCommitment: asBytes32(
      "SpendAuthorizationIntentV0.bobNoteCommitment",
      intent.bobNoteCommitment,
    ),
    aliceResidueNoteCommitment: asBytes32(
      "SpendAuthorizationIntentV0.aliceResidueNoteCommitment",
      intent.aliceResidueNoteCommitment,
    ),
    recipientPacketHash: asBytes32(
      "SpendAuthorizationIntentV0.recipientPacketHash",
      intent.recipientPacketHash,
    ),
    outgoingPacketHash: asBytes32(
      "SpendAuthorizationIntentV0.outgoingPacketHash",
      intent.outgoingPacketHash,
    ),
    maxFeeSats: intent.maxFeeSats,
    expiryHeight: intent.expiryHeight,
    batchConstraintHash: asBytes32(
      "SpendAuthorizationIntentV0.batchConstraintHash",
      intent.batchConstraintHash,
    ),
  });
}

export function serializeSpendAuthorizationIntentV0(
  intent: SpendAuthorizationIntentV0,
): Uint8Array {
  const normalized = normalizeSpendAuthorizationIntentV0(intent);
  return serializeDeterministicUtf8({
    aliceResidueNoteCommitment: normalized.aliceResidueNoteCommitment,
    batchConstraintHash: normalized.batchConstraintHash,
    bobNoteCommitment: normalized.bobNoteCommitment,
    expiryHeight: normalized.expiryHeight.toString(10),
    inputNoteCommitment: normalized.inputNoteCommitment,
    inputStateCommitment: normalized.inputStateCommitment,
    maxFeeSats: normalized.maxFeeSats.toString(10),
    network: normalized.network,
    nullifierCommitment: normalized.nullifierCommitment,
    outgoingPacketHash: normalized.outgoingPacketHash,
    recipientPacketHash: normalized.recipientPacketHash,
    version: normalized.version,
  });
}

export function spendAuthorizationIntentHashV0(
  intent: SpendAuthorizationIntentV0,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    SPEND_AUTHORIZATION_INTENT_V0_HASH_DOMAIN,
    serializeSpendAuthorizationIntentV0(intent),
  );
}

export function isSpendAuthorizationIntentExpiredV0(
  intent: SpendAuthorizationIntentV0,
  currentHeight: bigint,
): boolean {
  const normalized = normalizeSpendAuthorizationIntentV0(intent);
  assertNonNegativeBigInt("currentHeight", currentHeight);
  return currentHeight > normalized.expiryHeight;
}

export function normalizeAggregationBatchV0(batch: AggregationBatchV0): AggregationBatchV0 {
  if (batch.version !== AGGREGATION_BATCH_V0_VERSION) {
    throw new Error("AggregationBatchV0.version must be 0");
  }
  assertNetwork("AggregationBatchV0.network", batch.network);
  assertNonNegativeBigInt("AggregationBatchV0.batchCounter", batch.batchCounter);
  return Object.freeze({
    version: AGGREGATION_BATCH_V0_VERSION,
    network: batch.network,
    inputStateCommitment: asBytes32(
      "AggregationBatchV0.inputStateCommitment",
      batch.inputStateCommitment,
    ),
    outputStateCommitment: asBytes32(
      "AggregationBatchV0.outputStateCommitment",
      batch.outputStateCommitment,
    ),
    intentHashes: normalizeBytes32Array("AggregationBatchV0.intentHashes", batch.intentHashes),
    recipientPacketHashes: normalizeBytes32Array(
      "AggregationBatchV0.recipientPacketHashes",
      batch.recipientPacketHashes,
    ),
    outgoingPacketHashes: normalizeBytes32Array(
      "AggregationBatchV0.outgoingPacketHashes",
      batch.outgoingPacketHashes,
    ),
    batchCounter: batch.batchCounter,
  });
}

export function serializeAggregationBatchV0(batch: AggregationBatchV0): Uint8Array {
  const normalized = normalizeAggregationBatchV0(batch);
  return serializeDeterministicUtf8({
    batchCounter: normalized.batchCounter.toString(10),
    inputStateCommitment: normalized.inputStateCommitment,
    intentHashes: normalized.intentHashes,
    network: normalized.network,
    outgoingPacketHashes: normalized.outgoingPacketHashes,
    outputStateCommitment: normalized.outputStateCommitment,
    recipientPacketHashes: normalized.recipientPacketHashes,
    version: normalized.version,
  });
}

export function aggregationBatchHashV0(batch: AggregationBatchV0): Promise<Bytes32> {
  return sha256DomainSeparated(
    AGGREGATION_BATCH_V0_HASH_DOMAIN,
    serializeAggregationBatchV0(batch),
  );
}
