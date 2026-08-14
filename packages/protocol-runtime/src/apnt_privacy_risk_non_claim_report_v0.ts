// Maturity: preview — measured zero published importers and no published
// artifact references it. Read it, don't build on it. See AGENTS.md, "The
// maturity ladder".
import type { Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { serializeDeterministicUtf8 } from "./serialization.js";

export const APNT_PRIVACY_RISK_NON_CLAIM_REPORT_V0_VERSION = 0;
export const APNT_PRIVACY_RISK_NON_CLAIM_REPORT_V0_DOMAIN =
  "bch-cloak-apnt-v0:privacy-risk-non-claim-report";

export const APNT_PRIVACY_RISK_NON_CLAIM_REPORT_V0_KNOWN_RESIDUAL_CORRELATIONS =
  Object.freeze([
    "transaction timing",
    "batch participation timing",
    "aggregator network metadata unless transport mitigated",
    "wallet recovery scanning patterns",
    "public nullifier and commitment set growth",
    "ciphertext presence and size",
  ] as const);

export type APNTPrivacyRiskNonClaimReportV0 = Readonly<{
  version: typeof APNT_PRIVACY_RISK_NON_CLAIM_REPORT_V0_VERSION;
  domain: typeof APNT_PRIVACY_RISK_NON_CLAIM_REPORT_V0_DOMAIN;
  relationId: string;
  productionPrivacyClaimed: false;
  residualCorrelationDisclosed: true;
  knownResidualCorrelations: readonly string[];
  bchConsensusProofVerificationClaimed: false;
  privateMaterialPublished: false;
  recipientMarkerPublished: false;
  aggregatorAuthorityClaimed: false;
  aggregatorCustodyClaimed: false;
  aggregatorHoldsSecretsClaimed: false;
  aggregatorSequencerClaimed: false;
  aggregatorSettlementAuthorityClaimed: false;
  aggregatorNamespaceAuthorityClaimed: false;
}>;

export type BuildAPNTPrivacyRiskNonClaimReportV0Args = Readonly<{
  relationId: string;
}>;

function assertNonEmptyString(name: string, value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

function assertFalse(name: string, value: unknown): false {
  if (value !== false) {
    throw new Error(`${name} must be false`);
  }
  return false;
}

function assertTrue(name: string, value: unknown): true {
  if (value !== true) {
    throw new Error(`${name} must be true`);
  }
  return true;
}

function normalizeKnownResidualCorrelationsV0(value: unknown): readonly string[] {
  const expected =
    APNT_PRIVACY_RISK_NON_CLAIM_REPORT_V0_KNOWN_RESIDUAL_CORRELATIONS;
  if (!Array.isArray(value) || value.length !== expected.length) {
    throw new Error(
      `APNTPrivacyRiskNonClaimReportV0.knownResidualCorrelations must contain ${expected.length} entries`,
    );
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (value[index] !== expected[index]) {
      throw new Error(
        `APNTPrivacyRiskNonClaimReportV0.knownResidualCorrelations entry ${index} is invalid`,
      );
    }
  }
  return Object.freeze([...expected]);
}

export function normalizeAPNTPrivacyRiskNonClaimReportV0(
  report: APNTPrivacyRiskNonClaimReportV0,
): APNTPrivacyRiskNonClaimReportV0 {
  if (report.version !== APNT_PRIVACY_RISK_NON_CLAIM_REPORT_V0_VERSION) {
    throw new Error("APNTPrivacyRiskNonClaimReportV0.version must be 0");
  }
  if (report.domain !== APNT_PRIVACY_RISK_NON_CLAIM_REPORT_V0_DOMAIN) {
    throw new Error("APNTPrivacyRiskNonClaimReportV0.domain is invalid");
  }

  return Object.freeze({
    version: APNT_PRIVACY_RISK_NON_CLAIM_REPORT_V0_VERSION,
    domain: APNT_PRIVACY_RISK_NON_CLAIM_REPORT_V0_DOMAIN,
    relationId: assertNonEmptyString(
      "APNTPrivacyRiskNonClaimReportV0.relationId",
      report.relationId,
    ),
    productionPrivacyClaimed: assertFalse(
      "APNTPrivacyRiskNonClaimReportV0.productionPrivacyClaimed",
      report.productionPrivacyClaimed,
    ),
    residualCorrelationDisclosed: assertTrue(
      "APNTPrivacyRiskNonClaimReportV0.residualCorrelationDisclosed",
      report.residualCorrelationDisclosed,
    ),
    knownResidualCorrelations: normalizeKnownResidualCorrelationsV0(
      report.knownResidualCorrelations,
    ),
    bchConsensusProofVerificationClaimed: assertFalse(
      "APNTPrivacyRiskNonClaimReportV0.bchConsensusProofVerificationClaimed",
      report.bchConsensusProofVerificationClaimed,
    ),
    privateMaterialPublished: assertFalse(
      "APNTPrivacyRiskNonClaimReportV0.privateMaterialPublished",
      report.privateMaterialPublished,
    ),
    recipientMarkerPublished: assertFalse(
      "APNTPrivacyRiskNonClaimReportV0.recipientMarkerPublished",
      report.recipientMarkerPublished,
    ),
    aggregatorAuthorityClaimed: assertFalse(
      "APNTPrivacyRiskNonClaimReportV0.aggregatorAuthorityClaimed",
      report.aggregatorAuthorityClaimed,
    ),
    aggregatorCustodyClaimed: assertFalse(
      "APNTPrivacyRiskNonClaimReportV0.aggregatorCustodyClaimed",
      report.aggregatorCustodyClaimed,
    ),
    aggregatorHoldsSecretsClaimed: assertFalse(
      "APNTPrivacyRiskNonClaimReportV0.aggregatorHoldsSecretsClaimed",
      report.aggregatorHoldsSecretsClaimed,
    ),
    aggregatorSequencerClaimed: assertFalse(
      "APNTPrivacyRiskNonClaimReportV0.aggregatorSequencerClaimed",
      report.aggregatorSequencerClaimed,
    ),
    aggregatorSettlementAuthorityClaimed: assertFalse(
      "APNTPrivacyRiskNonClaimReportV0.aggregatorSettlementAuthorityClaimed",
      report.aggregatorSettlementAuthorityClaimed,
    ),
    aggregatorNamespaceAuthorityClaimed: assertFalse(
      "APNTPrivacyRiskNonClaimReportV0.aggregatorNamespaceAuthorityClaimed",
      report.aggregatorNamespaceAuthorityClaimed,
    ),
  });
}

export function buildAPNTPrivacyRiskNonClaimReportV0(
  args: BuildAPNTPrivacyRiskNonClaimReportV0Args,
): APNTPrivacyRiskNonClaimReportV0 {
  return normalizeAPNTPrivacyRiskNonClaimReportV0({
    version: APNT_PRIVACY_RISK_NON_CLAIM_REPORT_V0_VERSION,
    domain: APNT_PRIVACY_RISK_NON_CLAIM_REPORT_V0_DOMAIN,
    relationId: args.relationId,
    productionPrivacyClaimed: false,
    residualCorrelationDisclosed: true,
    knownResidualCorrelations:
      APNT_PRIVACY_RISK_NON_CLAIM_REPORT_V0_KNOWN_RESIDUAL_CORRELATIONS,
    bchConsensusProofVerificationClaimed: false,
    privateMaterialPublished: false,
    recipientMarkerPublished: false,
    aggregatorAuthorityClaimed: false,
    aggregatorCustodyClaimed: false,
    aggregatorHoldsSecretsClaimed: false,
    aggregatorSequencerClaimed: false,
    aggregatorSettlementAuthorityClaimed: false,
    aggregatorNamespaceAuthorityClaimed: false,
  });
}

export function serializeAPNTPrivacyRiskNonClaimReportV0(
  report: APNTPrivacyRiskNonClaimReportV0,
): Uint8Array {
  const normalized = normalizeAPNTPrivacyRiskNonClaimReportV0(report);
  return serializeDeterministicUtf8({
    aggregatorAuthorityClaimed: normalized.aggregatorAuthorityClaimed,
    aggregatorCustodyClaimed: normalized.aggregatorCustodyClaimed,
    aggregatorHoldsSecretsClaimed: normalized.aggregatorHoldsSecretsClaimed,
    aggregatorNamespaceAuthorityClaimed:
      normalized.aggregatorNamespaceAuthorityClaimed,
    aggregatorSequencerClaimed: normalized.aggregatorSequencerClaimed,
    aggregatorSettlementAuthorityClaimed:
      normalized.aggregatorSettlementAuthorityClaimed,
    bchConsensusProofVerificationClaimed:
      normalized.bchConsensusProofVerificationClaimed,
    domain: normalized.domain,
    knownResidualCorrelations: normalized.knownResidualCorrelations,
    privateMaterialPublished: normalized.privateMaterialPublished,
    productionPrivacyClaimed: normalized.productionPrivacyClaimed,
    recipientMarkerPublished: normalized.recipientMarkerPublished,
    relationId: normalized.relationId,
    residualCorrelationDisclosed: normalized.residualCorrelationDisclosed,
    version: normalized.version,
  });
}

export async function apntPrivacyRiskNonClaimReportHashV0(
  report: APNTPrivacyRiskNonClaimReportV0,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_PRIVACY_RISK_NON_CLAIM_REPORT_V0_DOMAIN,
    serializeAPNTPrivacyRiskNonClaimReportV0(report),
  );
}
