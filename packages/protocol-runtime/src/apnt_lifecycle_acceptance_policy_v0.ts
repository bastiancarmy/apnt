// Maturity: preview — measured zero published importers and no published
// artifact references it. Read it, don't build on it. See AGENTS.md, "The
// maturity ladder".
import type { Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { serializeDeterministicUtf8 } from "./serialization.js";

export const APNT_LIFECYCLE_ACCEPTANCE_POLICY_V0_VERSION = 0;
export const APNT_LIFECYCLE_ACCEPTANCE_POLICY_V0_DOMAIN =
  "bch-cloak-apnt-v0:lifecycle-acceptance-policy";

export type APNTLifecycleProofEvidenceGatesV0 = Readonly<{
  noteCommitmentOpeningAccepted: boolean;
  transitionValidityAccepted: boolean;
  valueConservationAccepted: boolean;
  nullifierCorrectnessAccepted: boolean;
  aggregationValidityAccepted: boolean;
}>;

export type APNTLifecycleChainSealEvidenceGatesV0 = Readonly<{
  chainTruthAccepted: boolean;
  fundingOutpointObserved: boolean;
  utxoSealObserved: boolean;
  utxoSealUnspentOrCorrectlyConsumed: boolean;
  outputCommitmentAnchored: boolean;
}>;

export type APNTLifecycleRecoveryEvidenceGatesV0 = Readonly<{
  recoveryPacketObserved: boolean;
  recoveryPacketDecryptableByWallet: boolean;
  recoveredNoteCommitmentMatches: boolean;
  ciphertextBindingAccepted: boolean;
  noPrivateRecoveryMaterialPublished: boolean;
}>;

export type APNTLifecycleCarrierEvidenceGatesV0 = Readonly<{
  transitionEvidenceObserved: boolean;
  transitionStatementBindMatches: boolean;
  proofTranscriptBindMatches: boolean;
  handoffPayloadCommitmentMatches: boolean;
  transportProtocolTruthAccepted: boolean;
}>;

export type APNTLifecyclePlaneBEvidenceGatesV0 = Readonly<{
  planeBRequired: boolean;
  planeBObserved: boolean;
  planeBPacketBindingAccepted: boolean;
  planeBRecoveryPathAccepted: boolean;
}>;

export type APNTLifecycleNonClaimBoundaryGatesV0 = Readonly<{
  bchConsensusProofVerificationClaimed: boolean;
  aggregatorAuthorityClaimed: boolean;
  aggregatorCustodyClaimed: boolean;
  aggregatorHoldsSecretsClaimed: boolean;
  aggregatorSequencerClaimed: boolean;
  aggregatorSettlementAuthorityClaimed: boolean;
  aggregatorNamespaceAuthorityClaimed: boolean;
  privateMaterialPublished: boolean;
  recipientMarkerPublished: boolean;
  productionPrivacyClaimed: boolean;
}>;

export type APNTLifecycleWalletRecordEvidenceGatesV0 = Readonly<{
  walletRecoveredNote: boolean;
  walletNoteCommitmentMatches: boolean;
  walletRecognizesSpendAuthority: boolean;
  walletNoteNotKnownSpent: boolean;
}>;

export type APNTLifecycleWalletSpendabilityEvidenceGatesV0 = Readonly<{
  walletHasSpendKeyMaterial: boolean;
  walletCanDeriveNullifier: boolean;
  nullifierNotSeenSpent: boolean;
  sealNotSpent: boolean;
  chainTipKnown: boolean;
  spendPathAvailable: boolean;
}>;

export type APNTLifecycleAcceptanceGateGroupsV0 = Readonly<{
  proofEvidence: APNTLifecycleProofEvidenceGatesV0;
  chainSealEvidence: APNTLifecycleChainSealEvidenceGatesV0;
  recoveryEvidence: APNTLifecycleRecoveryEvidenceGatesV0;
  carrierEvidence: APNTLifecycleCarrierEvidenceGatesV0;
  planeBEvidence: APNTLifecyclePlaneBEvidenceGatesV0;
  nonClaimBoundary: APNTLifecycleNonClaimBoundaryGatesV0;
  walletRecordEvidence: APNTLifecycleWalletRecordEvidenceGatesV0;
  walletSpendabilityEvidence: APNTLifecycleWalletSpendabilityEvidenceGatesV0;
}>;

export type APNTLifecycleAcceptancePolicyV0 = APNTLifecycleAcceptanceGateGroupsV0 &
  Readonly<{
    version: typeof APNT_LIFECYCLE_ACCEPTANCE_POLICY_V0_VERSION;
    domain: typeof APNT_LIFECYCLE_ACCEPTANCE_POLICY_V0_DOMAIN;
    relationId: string;
    proofEvidenceAccepted: boolean;
    chainSealEvidenceAccepted: boolean;
    recoveryEvidenceAccepted: boolean;
    carrierEvidenceAccepted: boolean;
    planeBEvidenceAccepted: boolean;
    nonClaimBoundaryAccepted: boolean;
    protocolEvidenceAccepted: boolean;
    walletRecordEvidenceAccepted: boolean;
    walletSpendabilityEvidenceAccepted: boolean;
    walletNoteRecorded: boolean;
    walletNoteSpendable: boolean;
    productionPrivacyClaimed: false;
    lifecycleAcceptanceFailureReason?: string;
  }>;

export type BuildAPNTLifecycleAcceptancePolicyV0Args =
  APNTLifecycleAcceptanceGateGroupsV0 &
    Readonly<{
      relationId: string;
    }>;

export type APNTLifecycleAcceptancePolicyEvaluationV0 = Readonly<{
  proofEvidenceAccepted: boolean;
  chainSealEvidenceAccepted: boolean;
  recoveryEvidenceAccepted: boolean;
  carrierEvidenceAccepted: boolean;
  planeBEvidenceAccepted: boolean;
  nonClaimBoundaryAccepted: boolean;
  protocolEvidenceAccepted: boolean;
  walletRecordEvidenceAccepted: boolean;
  walletSpendabilityEvidenceAccepted: boolean;
  walletNoteRecorded: boolean;
  walletNoteSpendable: boolean;
  productionPrivacyClaimed: false;
  lifecycleAcceptanceFailureReason?: string;
}>;

const PROOF_EVIDENCE_KEYS = [
  "noteCommitmentOpeningAccepted",
  "transitionValidityAccepted",
  "valueConservationAccepted",
  "nullifierCorrectnessAccepted",
  "aggregationValidityAccepted",
] as const;

const CHAIN_SEAL_EVIDENCE_KEYS = [
  "chainTruthAccepted",
  "fundingOutpointObserved",
  "utxoSealObserved",
  "utxoSealUnspentOrCorrectlyConsumed",
  "outputCommitmentAnchored",
] as const;

const RECOVERY_EVIDENCE_KEYS = [
  "recoveryPacketObserved",
  "recoveryPacketDecryptableByWallet",
  "recoveredNoteCommitmentMatches",
  "ciphertextBindingAccepted",
  "noPrivateRecoveryMaterialPublished",
] as const;

const CARRIER_EVIDENCE_KEYS = [
  "transitionEvidenceObserved",
  "transitionStatementBindMatches",
  "proofTranscriptBindMatches",
  "handoffPayloadCommitmentMatches",
  "transportProtocolTruthAccepted",
] as const;

const PLANE_B_EVIDENCE_KEYS = [
  "planeBRequired",
  "planeBObserved",
  "planeBPacketBindingAccepted",
  "planeBRecoveryPathAccepted",
] as const;

const NON_CLAIM_BOUNDARY_KEYS = [
  "bchConsensusProofVerificationClaimed",
  "aggregatorAuthorityClaimed",
  "aggregatorCustodyClaimed",
  "aggregatorHoldsSecretsClaimed",
  "aggregatorSequencerClaimed",
  "aggregatorSettlementAuthorityClaimed",
  "aggregatorNamespaceAuthorityClaimed",
  "privateMaterialPublished",
  "recipientMarkerPublished",
  "productionPrivacyClaimed",
] as const;

const WALLET_RECORD_EVIDENCE_KEYS = [
  "walletRecoveredNote",
  "walletNoteCommitmentMatches",
  "walletRecognizesSpendAuthority",
  "walletNoteNotKnownSpent",
] as const;

const WALLET_SPENDABILITY_EVIDENCE_KEYS = [
  "walletHasSpendKeyMaterial",
  "walletCanDeriveNullifier",
  "nullifierNotSeenSpent",
  "sealNotSpent",
  "chainTipKnown",
  "spendPathAvailable",
] as const;

function assertNonEmptyString(name: string, value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

function assertBoolean(name: string, value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${name} must be boolean`);
  }
  return value;
}

function normalizeBooleanGroupV0<K extends string>(
  name: string,
  value: Readonly<Record<K, boolean>>,
  keys: readonly K[],
): Readonly<Record<K, boolean>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }

  return Object.freeze(
    Object.fromEntries(
      keys.map((key) => [key, assertBoolean(`${name}.${key}`, value[key])]),
    ) as Record<K, boolean>,
  );
}

function normalizeGateGroupsV0(
  groups: APNTLifecycleAcceptanceGateGroupsV0,
): APNTLifecycleAcceptanceGateGroupsV0 {
  return Object.freeze({
    proofEvidence: normalizeBooleanGroupV0(
      "APNTLifecycleAcceptancePolicyV0.proofEvidence",
      groups.proofEvidence,
      PROOF_EVIDENCE_KEYS,
    ),
    chainSealEvidence: normalizeBooleanGroupV0(
      "APNTLifecycleAcceptancePolicyV0.chainSealEvidence",
      groups.chainSealEvidence,
      CHAIN_SEAL_EVIDENCE_KEYS,
    ),
    recoveryEvidence: normalizeBooleanGroupV0(
      "APNTLifecycleAcceptancePolicyV0.recoveryEvidence",
      groups.recoveryEvidence,
      RECOVERY_EVIDENCE_KEYS,
    ),
    carrierEvidence: normalizeBooleanGroupV0(
      "APNTLifecycleAcceptancePolicyV0.carrierEvidence",
      groups.carrierEvidence,
      CARRIER_EVIDENCE_KEYS,
    ),
    planeBEvidence: normalizeBooleanGroupV0(
      "APNTLifecycleAcceptancePolicyV0.planeBEvidence",
      groups.planeBEvidence,
      PLANE_B_EVIDENCE_KEYS,
    ),
    nonClaimBoundary: normalizeBooleanGroupV0(
      "APNTLifecycleAcceptancePolicyV0.nonClaimBoundary",
      groups.nonClaimBoundary,
      NON_CLAIM_BOUNDARY_KEYS,
    ),
    walletRecordEvidence: normalizeBooleanGroupV0(
      "APNTLifecycleAcceptancePolicyV0.walletRecordEvidence",
      groups.walletRecordEvidence,
      WALLET_RECORD_EVIDENCE_KEYS,
    ),
    walletSpendabilityEvidence: normalizeBooleanGroupV0(
      "APNTLifecycleAcceptancePolicyV0.walletSpendabilityEvidence",
      groups.walletSpendabilityEvidence,
      WALLET_SPENDABILITY_EVIDENCE_KEYS,
    ),
  });
}

function everyGateAcceptedV0<K extends string>(
  value: Readonly<Record<K, boolean>>,
  keys: readonly K[],
): boolean {
  return keys.every((key) => value[key]);
}

function lifecycleAcceptanceFailureReasonV0(
  evaluation: Omit<
    APNTLifecycleAcceptancePolicyEvaluationV0,
    "lifecycleAcceptanceFailureReason"
  >,
): string | undefined {
  if (!evaluation.proofEvidenceAccepted) return "proof evidence gates failed";
  if (!evaluation.chainSealEvidenceAccepted) return "chain/seal evidence gates failed";
  if (!evaluation.recoveryEvidenceAccepted) return "recovery evidence gates failed";
  if (!evaluation.carrierEvidenceAccepted) return "carrier evidence gates failed";
  if (!evaluation.planeBEvidenceAccepted) return "Plane B evidence gates failed";
  if (!evaluation.nonClaimBoundaryAccepted) return "non-claim boundary evidence gates failed";
  if (!evaluation.walletRecordEvidenceAccepted) return "wallet record evidence gates failed";
  if (!evaluation.walletSpendabilityEvidenceAccepted) {
    return "wallet spendability evidence gates failed";
  }
  return undefined;
}

function evaluateGateGroupsV0(
  groups: APNTLifecycleAcceptanceGateGroupsV0,
): APNTLifecycleAcceptancePolicyEvaluationV0 {
  const proofEvidenceAccepted = everyGateAcceptedV0(
    groups.proofEvidence,
    PROOF_EVIDENCE_KEYS,
  );
  const chainSealEvidenceAccepted = everyGateAcceptedV0(
    groups.chainSealEvidence,
    CHAIN_SEAL_EVIDENCE_KEYS,
  );
  const recoveryEvidenceAccepted = everyGateAcceptedV0(
    groups.recoveryEvidence,
    RECOVERY_EVIDENCE_KEYS,
  );
  const carrierEvidenceAccepted = everyGateAcceptedV0(
    groups.carrierEvidence,
    CARRIER_EVIDENCE_KEYS,
  );
  const planeBEvidenceAccepted =
    !groups.planeBEvidence.planeBRequired ||
    (groups.planeBEvidence.planeBObserved &&
      groups.planeBEvidence.planeBPacketBindingAccepted &&
      groups.planeBEvidence.planeBRecoveryPathAccepted);
  const nonClaimBoundaryAccepted = !NON_CLAIM_BOUNDARY_KEYS.some(
    (key) => groups.nonClaimBoundary[key],
  );
  const protocolEvidenceAccepted =
    proofEvidenceAccepted &&
    chainSealEvidenceAccepted &&
    recoveryEvidenceAccepted &&
    carrierEvidenceAccepted &&
    planeBEvidenceAccepted &&
    nonClaimBoundaryAccepted;
  const walletRecordEvidenceAccepted = everyGateAcceptedV0(
    groups.walletRecordEvidence,
    WALLET_RECORD_EVIDENCE_KEYS,
  );
  const walletNoteRecorded = protocolEvidenceAccepted && walletRecordEvidenceAccepted;
  const walletSpendabilityEvidenceAccepted = everyGateAcceptedV0(
    groups.walletSpendabilityEvidence,
    WALLET_SPENDABILITY_EVIDENCE_KEYS,
  );
  const walletNoteSpendable = walletNoteRecorded && walletSpendabilityEvidenceAccepted;
  const effective = {
    proofEvidenceAccepted,
    chainSealEvidenceAccepted,
    recoveryEvidenceAccepted,
    carrierEvidenceAccepted,
    planeBEvidenceAccepted,
    nonClaimBoundaryAccepted,
    protocolEvidenceAccepted,
    walletRecordEvidenceAccepted,
    walletSpendabilityEvidenceAccepted,
    walletNoteRecorded,
    walletNoteSpendable,
    productionPrivacyClaimed: false,
  } as const;
  const lifecycleAcceptanceFailureReason = lifecycleAcceptanceFailureReasonV0(effective);

  return Object.freeze({
    ...effective,
    ...(lifecycleAcceptanceFailureReason === undefined
      ? {}
      : { lifecycleAcceptanceFailureReason }),
  });
}

export function normalizeAPNTLifecycleAcceptancePolicyV0(
  model: APNTLifecycleAcceptancePolicyV0,
): APNTLifecycleAcceptancePolicyV0 {
  if (model.version !== APNT_LIFECYCLE_ACCEPTANCE_POLICY_V0_VERSION) {
    throw new Error("APNTLifecycleAcceptancePolicyV0.version must be 0");
  }
  if (model.domain !== APNT_LIFECYCLE_ACCEPTANCE_POLICY_V0_DOMAIN) {
    throw new Error("APNTLifecycleAcceptancePolicyV0.domain is invalid");
  }
  const relationId = assertNonEmptyString(
    "APNTLifecycleAcceptancePolicyV0.relationId",
    model.relationId,
  );
  const groups = normalizeGateGroupsV0(model);
  const aggregateBooleanNames = [
    "proofEvidenceAccepted",
    "chainSealEvidenceAccepted",
    "recoveryEvidenceAccepted",
    "carrierEvidenceAccepted",
    "planeBEvidenceAccepted",
    "nonClaimBoundaryAccepted",
    "protocolEvidenceAccepted",
    "walletRecordEvidenceAccepted",
    "walletSpendabilityEvidenceAccepted",
    "walletNoteRecorded",
    "walletNoteSpendable",
    "productionPrivacyClaimed",
  ] as const;
  const aggregateBooleans = Object.fromEntries(
    aggregateBooleanNames.map((name) => [
      name,
      assertBoolean(`APNTLifecycleAcceptancePolicyV0.${name}`, model[name]),
    ]),
  ) as Record<(typeof aggregateBooleanNames)[number], boolean>;
  const lifecycleAcceptanceFailureReason =
    model.lifecycleAcceptanceFailureReason === undefined
      ? undefined
      : assertNonEmptyString(
          "APNTLifecycleAcceptancePolicyV0.lifecycleAcceptanceFailureReason",
          model.lifecycleAcceptanceFailureReason,
        );

  return Object.freeze({
    version: APNT_LIFECYCLE_ACCEPTANCE_POLICY_V0_VERSION,
    domain: APNT_LIFECYCLE_ACCEPTANCE_POLICY_V0_DOMAIN,
    relationId,
    ...groups,
    proofEvidenceAccepted: aggregateBooleans.proofEvidenceAccepted,
    chainSealEvidenceAccepted: aggregateBooleans.chainSealEvidenceAccepted,
    recoveryEvidenceAccepted: aggregateBooleans.recoveryEvidenceAccepted,
    carrierEvidenceAccepted: aggregateBooleans.carrierEvidenceAccepted,
    planeBEvidenceAccepted: aggregateBooleans.planeBEvidenceAccepted,
    nonClaimBoundaryAccepted: aggregateBooleans.nonClaimBoundaryAccepted,
    protocolEvidenceAccepted: aggregateBooleans.protocolEvidenceAccepted,
    walletRecordEvidenceAccepted: aggregateBooleans.walletRecordEvidenceAccepted,
    walletSpendabilityEvidenceAccepted:
      aggregateBooleans.walletSpendabilityEvidenceAccepted,
    walletNoteRecorded: aggregateBooleans.walletNoteRecorded,
    walletNoteSpendable: aggregateBooleans.walletNoteSpendable,
    productionPrivacyClaimed: false,
    ...(lifecycleAcceptanceFailureReason === undefined
      ? {}
      : { lifecycleAcceptanceFailureReason }),
  });
}

export function buildAPNTLifecycleAcceptancePolicyV0(
  args: BuildAPNTLifecycleAcceptancePolicyV0Args,
): APNTLifecycleAcceptancePolicyV0 {
  const relationId = assertNonEmptyString(
    "BuildAPNTLifecycleAcceptancePolicyV0Args.relationId",
    args.relationId,
  );
  const groups = normalizeGateGroupsV0(args);
  const evaluation = evaluateGateGroupsV0(groups);

  return normalizeAPNTLifecycleAcceptancePolicyV0({
    version: APNT_LIFECYCLE_ACCEPTANCE_POLICY_V0_VERSION,
    domain: APNT_LIFECYCLE_ACCEPTANCE_POLICY_V0_DOMAIN,
    relationId,
    ...groups,
    ...evaluation,
  });
}

export function evaluateAPNTLifecycleAcceptancePolicyV0(
  model: APNTLifecycleAcceptancePolicyV0,
): APNTLifecycleAcceptancePolicyEvaluationV0 {
  const normalized = normalizeAPNTLifecycleAcceptancePolicyV0(model);
  return evaluateGateGroupsV0(normalized);
}

export function serializeAPNTLifecycleAcceptancePolicyV0(
  model: APNTLifecycleAcceptancePolicyV0,
): Uint8Array {
  const normalized = normalizeAPNTLifecycleAcceptancePolicyV0(model);
  const evaluation = evaluateAPNTLifecycleAcceptancePolicyV0(normalized);

  return serializeDeterministicUtf8({
    carrierEvidence: normalized.carrierEvidence,
    carrierEvidenceAccepted: evaluation.carrierEvidenceAccepted,
    chainSealEvidence: normalized.chainSealEvidence,
    chainSealEvidenceAccepted: evaluation.chainSealEvidenceAccepted,
    domain: normalized.domain,
    nonClaimBoundary: normalized.nonClaimBoundary,
    nonClaimBoundaryAccepted: evaluation.nonClaimBoundaryAccepted,
    planeBEvidence: normalized.planeBEvidence,
    planeBEvidenceAccepted: evaluation.planeBEvidenceAccepted,
    productionPrivacyClaimed: false,
    proofEvidence: normalized.proofEvidence,
    proofEvidenceAccepted: evaluation.proofEvidenceAccepted,
    protocolEvidenceAccepted: evaluation.protocolEvidenceAccepted,
    recoveryEvidence: normalized.recoveryEvidence,
    recoveryEvidenceAccepted: evaluation.recoveryEvidenceAccepted,
    relationId: normalized.relationId,
    version: normalized.version,
    walletNoteRecorded: evaluation.walletNoteRecorded,
    walletNoteSpendable: evaluation.walletNoteSpendable,
    walletRecordEvidence: normalized.walletRecordEvidence,
    walletRecordEvidenceAccepted: evaluation.walletRecordEvidenceAccepted,
    walletSpendabilityEvidence: normalized.walletSpendabilityEvidence,
    walletSpendabilityEvidenceAccepted:
      evaluation.walletSpendabilityEvidenceAccepted,
    ...(evaluation.lifecycleAcceptanceFailureReason === undefined
      ? {}
      : {
          lifecycleAcceptanceFailureReason:
            evaluation.lifecycleAcceptanceFailureReason,
        }),
  });
}

export async function apntLifecycleAcceptancePolicyHashV0(
  model: APNTLifecycleAcceptancePolicyV0,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_LIFECYCLE_ACCEPTANCE_POLICY_V0_DOMAIN,
    serializeAPNTLifecycleAcceptancePolicyV0(model),
  );
}
