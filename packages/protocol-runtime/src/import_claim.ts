import {
  asBytes32,
  bytesToHex,
  type Bytes32,
} from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { type StateCellNetworkV0 } from "./state.js";
import { serializeDeterministicUtf8 } from "./serialization.js";

export const IMPORT_CLAIM_BODY_V0_VERSION = 0;
export const IMPORT_CLAIM_V0_LANE_ID = 0;
export const IMPORT_CLAIM_V0_HASH_DOMAIN =
  "bch-cloak-apnt-v0:import-claim";
export const IMPORT_CLAIM_V0_COVENANT_TEMPLATE_ID =
  "apnt-import-covenant-v0-placeholder";
export const IMPORT_CLAIM_V0_BATCH_POLICY =
  "aggregator-batch-v0-placeholder";

export type ImportClaimBodyV0 = Readonly<{
  version: typeof IMPORT_CLAIM_BODY_V0_VERSION;
  network: StateCellNetworkV0;
  laneId: typeof IMPORT_CLAIM_V0_LANE_ID;
  importAmountSats: bigint;
  assetId: Bytes32;
  importNonce: Bytes32;
  privateNoteCommitment: Bytes32;
  selfRecoveryPacketHash: Bytes32;
  refundKeyCommitment: Bytes32;
  expiryHeight: bigint;
  batchPolicy: typeof IMPORT_CLAIM_V0_BATCH_POLICY;
  covenantTemplateId: typeof IMPORT_CLAIM_V0_COVENANT_TEMPLATE_ID;
}>;

export type ImportClaimExpectedOutputV0 = Readonly<{
  valueSats: bigint;
  covenantTemplateId: typeof IMPORT_CLAIM_V0_COVENANT_TEMPLATE_ID;
  claimCommitment: Bytes32;
  lockingBytecodeStatus: "not-finalized";
}>;

export type ImportClaimPlanV0 = Readonly<{
  claimBody: ImportClaimBodyV0;
  claimCommitment: Bytes32;
  expectedImportOutput: ImportClaimExpectedOutputV0;
}>;

export type BuildImportClaimPlanV0Args = Omit<ImportClaimBodyV0, "version" | "laneId" | "batchPolicy" | "covenantTemplateId"> &
  Readonly<{
    laneId?: typeof IMPORT_CLAIM_V0_LANE_ID;
    batchPolicy?: typeof IMPORT_CLAIM_V0_BATCH_POLICY;
    covenantTemplateId?: typeof IMPORT_CLAIM_V0_COVENANT_TEMPLATE_ID;
  }>;

const IMPORT_CLAIM_NETWORKS_V0 = new Set<StateCellNetworkV0>(["chipnet", "mainnet", "regtest"]);

function assertNetwork(name: string, network: StateCellNetworkV0): StateCellNetworkV0 {
  if (!IMPORT_CLAIM_NETWORKS_V0.has(network)) {
    throw new Error(`${name} must be chipnet, mainnet, or regtest`);
  }
  return network;
}

function assertPositiveBigInt(name: string, value: bigint): bigint {
  if (typeof value !== "bigint" || value <= 0n) {
    throw new Error(`${name} must be a positive bigint`);
  }
  return value;
}

export function normalizeImportClaimBodyV0(body: ImportClaimBodyV0): ImportClaimBodyV0 {
  if (body.version !== IMPORT_CLAIM_BODY_V0_VERSION) {
    throw new Error("ImportClaimBodyV0.version must be 0");
  }
  if (body.laneId !== IMPORT_CLAIM_V0_LANE_ID) {
    throw new Error("ImportClaimBodyV0.laneId must be 0");
  }
  if (body.batchPolicy !== IMPORT_CLAIM_V0_BATCH_POLICY) {
    throw new Error("ImportClaimBodyV0.batchPolicy is unsupported");
  }
  if (body.covenantTemplateId !== IMPORT_CLAIM_V0_COVENANT_TEMPLATE_ID) {
    throw new Error("ImportClaimBodyV0.covenantTemplateId is unsupported");
  }
  return Object.freeze({
    version: IMPORT_CLAIM_BODY_V0_VERSION,
    network: assertNetwork("ImportClaimBodyV0.network", body.network),
    laneId: IMPORT_CLAIM_V0_LANE_ID,
    importAmountSats: assertPositiveBigInt("ImportClaimBodyV0.importAmountSats", body.importAmountSats),
    assetId: asBytes32("ImportClaimBodyV0.assetId", body.assetId),
    importNonce: asBytes32("ImportClaimBodyV0.importNonce", body.importNonce),
    privateNoteCommitment: asBytes32("ImportClaimBodyV0.privateNoteCommitment", body.privateNoteCommitment),
    selfRecoveryPacketHash: asBytes32("ImportClaimBodyV0.selfRecoveryPacketHash", body.selfRecoveryPacketHash),
    refundKeyCommitment: asBytes32("ImportClaimBodyV0.refundKeyCommitment", body.refundKeyCommitment),
    expiryHeight: assertPositiveBigInt("ImportClaimBodyV0.expiryHeight", body.expiryHeight),
    batchPolicy: IMPORT_CLAIM_V0_BATCH_POLICY,
    covenantTemplateId: IMPORT_CLAIM_V0_COVENANT_TEMPLATE_ID,
  });
}

function serializeImportClaimBodyRecordV0(body: ImportClaimBodyV0) {
  const normalized = normalizeImportClaimBodyV0(body);
  return {
    assetId: normalized.assetId,
    batchPolicy: normalized.batchPolicy,
    covenantTemplateId: normalized.covenantTemplateId,
    expiryHeight: normalized.expiryHeight.toString(10),
    importAmountSats: normalized.importAmountSats.toString(10),
    importNonce: normalized.importNonce,
    laneId: normalized.laneId,
    network: normalized.network,
    privateNoteCommitment: normalized.privateNoteCommitment,
    refundKeyCommitment: normalized.refundKeyCommitment,
    selfRecoveryPacketHash: normalized.selfRecoveryPacketHash,
    version: normalized.version,
  };
}

export function serializeImportClaimBodyV0(body: ImportClaimBodyV0): Uint8Array {
  return serializeDeterministicUtf8(serializeImportClaimBodyRecordV0(body));
}

export function importClaimCommitmentV0(body: ImportClaimBodyV0): Promise<Bytes32> {
  return sha256DomainSeparated(
    IMPORT_CLAIM_V0_HASH_DOMAIN,
    serializeImportClaimBodyV0(body),
  );
}

export async function normalizeImportClaimPlanV0(plan: ImportClaimPlanV0): Promise<ImportClaimPlanV0> {
  const claimBody = normalizeImportClaimBodyV0(plan.claimBody);
  const claimCommitment = await importClaimCommitmentV0(claimBody);
  const suppliedCommitment = asBytes32("ImportClaimPlanV0.claimCommitment", plan.claimCommitment);
  if (bytesToHex(claimCommitment) !== bytesToHex(suppliedCommitment)) {
    throw new Error("ImportClaimPlanV0.claimCommitment mismatch");
  }
  const expectedOutput = plan.expectedImportOutput;
  if (expectedOutput.covenantTemplateId !== IMPORT_CLAIM_V0_COVENANT_TEMPLATE_ID) {
    throw new Error("ImportClaimPlanV0.expectedImportOutput.covenantTemplateId is unsupported");
  }
  if (expectedOutput.lockingBytecodeStatus !== "not-finalized") {
    throw new Error("ImportClaimPlanV0.expectedImportOutput.lockingBytecodeStatus must be not-finalized");
  }
  if (expectedOutput.valueSats !== claimBody.importAmountSats) {
    throw new Error("ImportClaimPlanV0.expectedImportOutput.valueSats must match claimBody.importAmountSats");
  }
  const outputCommitment = asBytes32("ImportClaimPlanV0.expectedImportOutput.claimCommitment", expectedOutput.claimCommitment);
  if (bytesToHex(outputCommitment) !== bytesToHex(claimCommitment)) {
    throw new Error("ImportClaimPlanV0.expectedImportOutput.claimCommitment mismatch");
  }
  return Object.freeze({
    claimBody,
    claimCommitment,
    expectedImportOutput: Object.freeze({
      valueSats: expectedOutput.valueSats,
      covenantTemplateId: IMPORT_CLAIM_V0_COVENANT_TEMPLATE_ID,
      claimCommitment,
      lockingBytecodeStatus: "not-finalized" as const,
    }),
  });
}

export async function buildImportClaimPlanV0(args: BuildImportClaimPlanV0Args): Promise<ImportClaimPlanV0> {
  const claimBody = normalizeImportClaimBodyV0({
    version: IMPORT_CLAIM_BODY_V0_VERSION,
    network: args.network,
    laneId: args.laneId ?? IMPORT_CLAIM_V0_LANE_ID,
    importAmountSats: args.importAmountSats,
    assetId: args.assetId,
    importNonce: args.importNonce,
    privateNoteCommitment: args.privateNoteCommitment,
    selfRecoveryPacketHash: args.selfRecoveryPacketHash,
    refundKeyCommitment: args.refundKeyCommitment,
    expiryHeight: args.expiryHeight,
    batchPolicy: args.batchPolicy ?? IMPORT_CLAIM_V0_BATCH_POLICY,
    covenantTemplateId: args.covenantTemplateId ?? IMPORT_CLAIM_V0_COVENANT_TEMPLATE_ID,
  });
  const claimCommitment = await importClaimCommitmentV0(claimBody);
  return Object.freeze({
    claimBody,
    claimCommitment,
    expectedImportOutput: Object.freeze({
      valueSats: claimBody.importAmountSats,
      covenantTemplateId: IMPORT_CLAIM_V0_COVENANT_TEMPLATE_ID,
      claimCommitment,
      lockingBytecodeStatus: "not-finalized" as const,
    }),
  });
}
