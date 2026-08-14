import { asBytes32, hexToBytes, hexToBytes32, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { serializeDeterministicUtf8 } from "./serialization.js";
import type { SealBoundPrivateNoteCandidateBindingEvidenceV0 } from "./seal_bound_private_note_candidate.js";

export const APNT_UTXO_SEAL_V0_VERSION = 0;
export const APNT_UTXO_SEAL_COMMITMENT_PREIMAGE_V0_DOMAIN =
  "bch-cloak-apnt-v0:utxo-seal-commitment-preimage";
export const APNT_UTXO_SEAL_COMMITMENT_V0_DOMAIN =
  "bch-cloak-apnt-v0:utxo-seal-commitment";
export const APNT_UTXO_SEAL_IDENTITY_EVIDENCE_V0_DOMAIN =
  "bch-cloak-apnt-v0:utxo-seal-identity-evidence";
export const APNT_UTXO_SEAL_IDENTITY_EVIDENCE_V0_KIND =
  "apnt-utxo-seal-identity-evidence-v0";
export const APNT_UTXO_SEAL_CLOSURE_EVIDENCE_V0_DOMAIN =
  "bch-cloak-apnt-v0:utxo-seal-closure-evidence";
export const APNT_UTXO_SEAL_CLOSURE_EVIDENCE_V0_KIND =
  "apnt-utxo-seal-closure-evidence-v0";
export const APNT_UTXO_SEAL_TRANSITION_BOUNDARY_EVIDENCE_V0_DOMAIN =
  "bch-cloak-apnt-v0:utxo-seal-transition-boundary-evidence";
export const APNT_UTXO_SEAL_TRANSITION_BOUNDARY_EVIDENCE_V0_KIND =
  "apnt-utxo-seal-transition-boundary-evidence-v0";

export type ApntUtxoSealNetworkV0 = "chipnet" | "mainnet" | "regtest";

export type ApntUtxoSealOutpointV0 = Readonly<{
  txid: string;
  vout: number;
}>;

export type ApntUtxoSealCommitmentPreimageV0 = Readonly<{
  version: typeof APNT_UTXO_SEAL_V0_VERSION;
  domain: typeof APNT_UTXO_SEAL_COMMITMENT_PREIMAGE_V0_DOMAIN;
  network: ApntUtxoSealNetworkV0;
  sealOutpoint: ApntUtxoSealOutpointV0;
  valueSats: string;
  importFundingCellCommitment32: Bytes32;
  eligibilityStatementBind32: Bytes32;
  outputFingerprint32: Bytes32;
  lockingBytecodeHash32: Bytes32;
}>;

export type ApntUtxoSealCurrentTruthFlagsV0 = Readonly<{
  aggregatorConsumeObserved: false;
  sealCloseObserved: false;
  transitionValidationAccepted: false;
  proofVerificationAccepted: false;
  apntAcceptance: false;
  acceptedPrivateNote: false;
  privateNoteSpendability: false;
  transparentImportFundingAmountPublic: true;
}>;

export type ApntUtxoSealIdentityEvidenceV0 = Readonly<{
  version: typeof APNT_UTXO_SEAL_V0_VERSION;
  domain: typeof APNT_UTXO_SEAL_IDENTITY_EVIDENCE_V0_DOMAIN;
  evidenceKind: typeof APNT_UTXO_SEAL_IDENTITY_EVIDENCE_V0_KIND;
  network: ApntUtxoSealNetworkV0;
  sealOutpoint: ApntUtxoSealOutpointV0;
  valueSats: string;
  importFundingCellCommitment32: Bytes32;
  eligibilityStatementBind32: Bytes32;
  outputFingerprint32: Bytes32;
  lockingBytecodeHash32: Bytes32;
  sealCommitment32: Bytes32;
  currentTruth: ApntUtxoSealCurrentTruthFlagsV0;
}>;

export type ApntImportFundingOutputExistenceForSealOpenStatusV0 =
  | "verified-output-exists"
  | "not-found"
  | "unavailable";

export type ApntImportFundingOutputExistenceForSealOpenV0 = Readonly<{
  status: ApntImportFundingOutputExistenceForSealOpenStatusV0;
  network: ApntUtxoSealNetworkV0;
  txid: string;
  outputIndex: number;
  outputChainExistence: boolean;
  expectedValueSats: string;
  actualValueSats: string | null;
  expectedLockingBytecodeHash32: string;
  actualLockingBytecodeHash32: string | null;
  expectedOutputFingerprint32: string;
  actualOutputFingerprint32: string | null;
  importFundingCellCommitment32: string;
  eligibilityStatementBind32: string;
}>;

export type ApntUtxoSealClosureChainInputEvidenceStatusV0 =
  | "spent-outpoint"
  | "unspent"
  | "not-found"
  | "unavailable"
  | "ambiguous";

export type ApntUtxoSealClosureChainInputEvidenceV0 = Readonly<{
  status: ApntUtxoSealClosureChainInputEvidenceStatusV0;
  network: ApntUtxoSealNetworkV0;
  consumptionTxid?: string;
  inputIndex?: number;
  consumedOutpoint: ApntUtxoSealOutpointV0;
}>;

export type ApntUtxoSealClosureEvidenceV0 = Readonly<{
  version: typeof APNT_UTXO_SEAL_V0_VERSION;
  domain: typeof APNT_UTXO_SEAL_CLOSURE_EVIDENCE_V0_DOMAIN;
  evidenceKind: typeof APNT_UTXO_SEAL_CLOSURE_EVIDENCE_V0_KIND;
  network: ApntUtxoSealNetworkV0;
  consumedSealOutpoint: ApntUtxoSealOutpointV0;
  consumptionTxid: string;
  inputIndex: number;
  previousSealCommitment32: Bytes32;
  previousOutputFingerprint32: Bytes32;
  importFundingCellCommitment32: Bytes32;
  eligibilityStatementBind32: Bytes32;
  aggregatorConsumeObserved: true;
  sealCloseObserved: true;
  aggregatorCustody: false;
  aggregatorValidatorAuthority: false;
  aggregatorSequencerAuthority: false;
  aggregatorProtocolAuthority: false;
  transitionValidationAccepted: false;
  proofVerificationAccepted: false;
  apntAcceptance: false;
  acceptedPrivateNote: false;
  privateNoteSpendability: false;
}>;

export type ApntUtxoSealTransitionBoundaryEvidenceV0 = Readonly<{
  version: typeof APNT_UTXO_SEAL_V0_VERSION;
  domain: typeof APNT_UTXO_SEAL_TRANSITION_BOUNDARY_EVIDENCE_V0_DOMAIN;
  evidenceKind: typeof APNT_UTXO_SEAL_TRANSITION_BOUNDARY_EVIDENCE_V0_KIND;
  network: ApntUtxoSealNetworkV0;
  consumedSealOutpoint: ApntUtxoSealOutpointV0;
  consumptionTxid: string;
  inputIndex: number;
  previousSealCommitment32: Bytes32;
  previousOutputFingerprint32: Bytes32;
  importFundingCellCommitment32: Bytes32;
  eligibilityStatementBind32: Bytes32;
  candidateBinding32: Bytes32;
  noteCommitment32: Bytes32;
  recoveryPacketHash32: Bytes32;
  transitionStatementBind32: Bytes32;
  proofTranscriptBind32: Bytes32;
  transitionBoundaryVerified: true;
  boundaryEvidenceOnly: true;
  proofTranscriptBindingRequiredSeparately: true;
  proofVerificationRequiredSeparately: true;
  aggregatorCustody: false;
  aggregatorValidatorAuthority: false;
  aggregatorSequencerAuthority: false;
  aggregatorProtocolAuthority: false;
  proofVerificationAccepted: false;
  apntAcceptance: false;
  acceptedPrivateNote: false;
  privateNoteSpendability: false;
}>;

const NETWORKS = new Set<ApntUtxoSealNetworkV0>(["chipnet", "mainnet", "regtest"]);
const CANONICAL_DECIMAL_RE = /^(0|[1-9][0-9]*)$/u;

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

function assertLiteral<T extends string | number | boolean>(
  name: string,
  value: unknown,
  expected: T,
): T {
  if (value !== expected) {
    throw new Error(`${name} must be ${String(expected)}`);
  }
  return expected;
}

function assertNetwork(name: string, value: unknown): ApntUtxoSealNetworkV0 {
  if (typeof value !== "string" || !NETWORKS.has(value as ApntUtxoSealNetworkV0)) {
    throw new Error(`${name} must be chipnet, mainnet, or regtest`);
  }
  return value as ApntUtxoSealNetworkV0;
}

function assertTxid(name: string, value: unknown): string {
  if (typeof value !== "string") {
    throw new Error(`${name} must be a lowercase 32-byte transaction id hex string`);
  }
  hexToBytes(name, value);
  if (value.length !== 64) {
    throw new Error(`${name} must be a lowercase 32-byte transaction id hex string`);
  }
  return value;
}

function assertNonNegativeSafeInteger(name: string, value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`${name} must be a non-negative safe integer`);
  }
  return value as number;
}

function normalizeCanonicalDecimalString(name: string, value: unknown): string {
  if (typeof value === "bigint") {
    if (value < 0n) {
      throw new Error(`${name} must be a canonical non-negative decimal string`);
    }
    return value.toString(10);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`${name} must be a canonical non-negative decimal string`);
    }
    return String(value);
  }
  if (typeof value !== "string" || !CANONICAL_DECIMAL_RE.test(value)) {
    throw new Error(`${name} must be a canonical non-negative decimal string`);
  }
  return value;
}

function assertBytes32(name: string, value: unknown): Bytes32 {
  if (!(value instanceof Uint8Array)) {
    throw new Error(`${name} must be a Uint8Array`);
  }
  return asBytes32(name, value);
}

function assertHexBytes32(name: string, value: unknown): Bytes32 {
  if (typeof value !== "string") {
    throw new Error(`${name} must be a lowercase bytes32 hex string`);
  }
  return hexToBytes32(name, value);
}

function assertOutputExistenceStatus(
  name: string,
  value: unknown,
): ApntImportFundingOutputExistenceForSealOpenStatusV0 {
  if (
    value !== "verified-output-exists" &&
    value !== "not-found" &&
    value !== "unavailable"
  ) {
    throw new Error(`${name} must be verified-output-exists, not-found, or unavailable`);
  }
  return value;
}

function assertSealClosureInputStatus(
  name: string,
  value: unknown,
): ApntUtxoSealClosureChainInputEvidenceStatusV0 {
  if (
    value !== "spent-outpoint" &&
    value !== "unspent" &&
    value !== "not-found" &&
    value !== "unavailable" &&
    value !== "ambiguous"
  ) {
    throw new Error(`${name} must be spent-outpoint, unspent, not-found, unavailable, or ambiguous`);
  }
  return value;
}

function assertBoolean(name: string, value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${name} must be a boolean`);
  }
  return value;
}

function normalizeSealOutpointV0(name: string, value: unknown): ApntUtxoSealOutpointV0 {
  assertRecord(name, value);
  assertKnownKeys(name, value, ["txid", "vout"]);
  return Object.freeze({
    txid: assertTxid(`${name}.txid`, value.txid),
    vout: assertNonNegativeSafeInteger(`${name}.vout`, value.vout),
  });
}

function normalizeSealClosureChainInputEvidenceV0(
  evidence: unknown,
): ApntUtxoSealClosureChainInputEvidenceV0 {
  assertRecord("ApntUtxoSealClosureChainInputEvidenceV0", evidence);
  assertKnownKeys("ApntUtxoSealClosureChainInputEvidenceV0", evidence, [
    "status",
    "network",
    "consumptionTxid",
    "inputIndex",
    "consumedOutpoint",
  ]);
  const status = assertSealClosureInputStatus(
    "ApntUtxoSealClosureChainInputEvidenceV0.status",
    evidence.status,
  );
  const consumptionTxid = evidence.consumptionTxid === undefined
    ? undefined
    : assertTxid(
        "ApntUtxoSealClosureChainInputEvidenceV0.consumptionTxid",
        evidence.consumptionTxid,
      );
  const inputIndex = evidence.inputIndex === undefined
    ? undefined
    : assertNonNegativeSafeInteger(
        "ApntUtxoSealClosureChainInputEvidenceV0.inputIndex",
        evidence.inputIndex,
      );
  return Object.freeze({
    status,
    network: assertNetwork("ApntUtxoSealClosureChainInputEvidenceV0.network", evidence.network),
    ...(consumptionTxid === undefined ? {} : { consumptionTxid }),
    ...(inputIndex === undefined ? {} : { inputIndex }),
    consumedOutpoint: normalizeSealOutpointV0(
      "ApntUtxoSealClosureChainInputEvidenceV0.consumedOutpoint",
      evidence.consumedOutpoint,
    ),
  });
}

export function normalizeApntUtxoSealCommitmentPreimageV0(
  preimage: unknown,
): ApntUtxoSealCommitmentPreimageV0 {
  assertRecord("ApntUtxoSealCommitmentPreimageV0", preimage);
  assertKnownKeys("ApntUtxoSealCommitmentPreimageV0", preimage, [
    "version",
    "domain",
    "network",
    "sealOutpoint",
    "valueSats",
    "importFundingCellCommitment32",
    "eligibilityStatementBind32",
    "outputFingerprint32",
    "lockingBytecodeHash32",
  ]);

  return Object.freeze({
    version: assertLiteral(
      "ApntUtxoSealCommitmentPreimageV0.version",
      preimage.version,
      APNT_UTXO_SEAL_V0_VERSION,
    ),
    domain: assertLiteral(
      "ApntUtxoSealCommitmentPreimageV0.domain",
      preimage.domain,
      APNT_UTXO_SEAL_COMMITMENT_PREIMAGE_V0_DOMAIN,
    ),
    network: assertNetwork("ApntUtxoSealCommitmentPreimageV0.network", preimage.network),
    sealOutpoint: normalizeSealOutpointV0(
      "ApntUtxoSealCommitmentPreimageV0.sealOutpoint",
      preimage.sealOutpoint,
    ),
    valueSats: normalizeCanonicalDecimalString(
      "ApntUtxoSealCommitmentPreimageV0.valueSats",
      preimage.valueSats,
    ),
    importFundingCellCommitment32: assertBytes32(
      "ApntUtxoSealCommitmentPreimageV0.importFundingCellCommitment32",
      preimage.importFundingCellCommitment32,
    ),
    eligibilityStatementBind32: assertBytes32(
      "ApntUtxoSealCommitmentPreimageV0.eligibilityStatementBind32",
      preimage.eligibilityStatementBind32,
    ),
    outputFingerprint32: assertBytes32(
      "ApntUtxoSealCommitmentPreimageV0.outputFingerprint32",
      preimage.outputFingerprint32,
    ),
    lockingBytecodeHash32: assertBytes32(
      "ApntUtxoSealCommitmentPreimageV0.lockingBytecodeHash32",
      preimage.lockingBytecodeHash32,
    ),
  });
}

function normalizeApntUtxoSealCurrentTruthFlagsV0(
  value: unknown,
): ApntUtxoSealCurrentTruthFlagsV0 {
  const name = "ApntUtxoSealCurrentTruthFlagsV0";
  assertRecord(name, value);
  assertKnownKeys(name, value, [
    "aggregatorConsumeObserved",
    "sealCloseObserved",
    "transitionValidationAccepted",
    "proofVerificationAccepted",
    "apntAcceptance",
    "acceptedPrivateNote",
    "privateNoteSpendability",
    "transparentImportFundingAmountPublic",
  ]);
  return Object.freeze({
    aggregatorConsumeObserved: assertLiteral(
      `${name}.aggregatorConsumeObserved`,
      value.aggregatorConsumeObserved,
      false,
    ),
    sealCloseObserved: assertLiteral(`${name}.sealCloseObserved`, value.sealCloseObserved, false),
    transitionValidationAccepted: assertLiteral(
      `${name}.transitionValidationAccepted`,
      value.transitionValidationAccepted,
      false,
    ),
    proofVerificationAccepted: assertLiteral(
      `${name}.proofVerificationAccepted`,
      value.proofVerificationAccepted,
      false,
    ),
    apntAcceptance: assertLiteral(`${name}.apntAcceptance`, value.apntAcceptance, false),
    acceptedPrivateNote: assertLiteral(
      `${name}.acceptedPrivateNote`,
      value.acceptedPrivateNote,
      false,
    ),
    privateNoteSpendability: assertLiteral(
      `${name}.privateNoteSpendability`,
      value.privateNoteSpendability,
      false,
    ),
    transparentImportFundingAmountPublic: assertLiteral(
      `${name}.transparentImportFundingAmountPublic`,
      value.transparentImportFundingAmountPublic,
      true,
    ),
  });
}

/** Closed normalizer for already-produced public seal-open identity evidence. */
export function normalizeApntUtxoSealIdentityEvidenceV0(
  evidence: unknown,
): ApntUtxoSealIdentityEvidenceV0 {
  const name = "ApntUtxoSealIdentityEvidenceV0";
  assertRecord(name, evidence);
  assertKnownKeys(name, evidence, [
    "version",
    "domain",
    "evidenceKind",
    "network",
    "sealOutpoint",
    "valueSats",
    "importFundingCellCommitment32",
    "eligibilityStatementBind32",
    "outputFingerprint32",
    "lockingBytecodeHash32",
    "sealCommitment32",
    "currentTruth",
  ]);
  return Object.freeze({
    version: assertLiteral(`${name}.version`, evidence.version, APNT_UTXO_SEAL_V0_VERSION),
    domain: assertLiteral(
      `${name}.domain`,
      evidence.domain,
      APNT_UTXO_SEAL_IDENTITY_EVIDENCE_V0_DOMAIN,
    ),
    evidenceKind: assertLiteral(
      `${name}.evidenceKind`,
      evidence.evidenceKind,
      APNT_UTXO_SEAL_IDENTITY_EVIDENCE_V0_KIND,
    ),
    network: assertNetwork(`${name}.network`, evidence.network),
    sealOutpoint: normalizeSealOutpointV0(`${name}.sealOutpoint`, evidence.sealOutpoint),
    valueSats: normalizeCanonicalDecimalString(`${name}.valueSats`, evidence.valueSats),
    importFundingCellCommitment32: assertBytes32(
      `${name}.importFundingCellCommitment32`,
      evidence.importFundingCellCommitment32,
    ),
    eligibilityStatementBind32: assertBytes32(
      `${name}.eligibilityStatementBind32`,
      evidence.eligibilityStatementBind32,
    ),
    outputFingerprint32: assertBytes32(`${name}.outputFingerprint32`, evidence.outputFingerprint32),
    lockingBytecodeHash32: assertBytes32(
      `${name}.lockingBytecodeHash32`,
      evidence.lockingBytecodeHash32,
    ),
    sealCommitment32: assertBytes32(`${name}.sealCommitment32`, evidence.sealCommitment32),
    currentTruth: normalizeApntUtxoSealCurrentTruthFlagsV0(evidence.currentTruth),
  });
}

/** Closed normalizer for already-produced exact public seal-close evidence. */
export function normalizeApntUtxoSealClosureEvidenceV0(
  evidence: unknown,
): ApntUtxoSealClosureEvidenceV0 {
  const name = "ApntUtxoSealClosureEvidenceV0";
  assertRecord(name, evidence);
  assertKnownKeys(name, evidence, [
    "version",
    "domain",
    "evidenceKind",
    "network",
    "consumedSealOutpoint",
    "consumptionTxid",
    "inputIndex",
    "previousSealCommitment32",
    "previousOutputFingerprint32",
    "importFundingCellCommitment32",
    "eligibilityStatementBind32",
    "aggregatorConsumeObserved",
    "sealCloseObserved",
    "aggregatorCustody",
    "aggregatorValidatorAuthority",
    "aggregatorSequencerAuthority",
    "aggregatorProtocolAuthority",
    "transitionValidationAccepted",
    "proofVerificationAccepted",
    "apntAcceptance",
    "acceptedPrivateNote",
    "privateNoteSpendability",
  ]);
  return Object.freeze({
    version: assertLiteral(`${name}.version`, evidence.version, APNT_UTXO_SEAL_V0_VERSION),
    domain: assertLiteral(
      `${name}.domain`,
      evidence.domain,
      APNT_UTXO_SEAL_CLOSURE_EVIDENCE_V0_DOMAIN,
    ),
    evidenceKind: assertLiteral(
      `${name}.evidenceKind`,
      evidence.evidenceKind,
      APNT_UTXO_SEAL_CLOSURE_EVIDENCE_V0_KIND,
    ),
    network: assertNetwork(`${name}.network`, evidence.network),
    consumedSealOutpoint: normalizeSealOutpointV0(
      `${name}.consumedSealOutpoint`,
      evidence.consumedSealOutpoint,
    ),
    consumptionTxid: assertTxid(`${name}.consumptionTxid`, evidence.consumptionTxid),
    inputIndex: assertNonNegativeSafeInteger(`${name}.inputIndex`, evidence.inputIndex),
    previousSealCommitment32: assertBytes32(
      `${name}.previousSealCommitment32`,
      evidence.previousSealCommitment32,
    ),
    previousOutputFingerprint32: assertBytes32(
      `${name}.previousOutputFingerprint32`,
      evidence.previousOutputFingerprint32,
    ),
    importFundingCellCommitment32: assertBytes32(
      `${name}.importFundingCellCommitment32`,
      evidence.importFundingCellCommitment32,
    ),
    eligibilityStatementBind32: assertBytes32(
      `${name}.eligibilityStatementBind32`,
      evidence.eligibilityStatementBind32,
    ),
    aggregatorConsumeObserved: assertLiteral(
      `${name}.aggregatorConsumeObserved`,
      evidence.aggregatorConsumeObserved,
      true,
    ),
    sealCloseObserved: assertLiteral(`${name}.sealCloseObserved`, evidence.sealCloseObserved, true),
    aggregatorCustody: assertLiteral(`${name}.aggregatorCustody`, evidence.aggregatorCustody, false),
    aggregatorValidatorAuthority: assertLiteral(
      `${name}.aggregatorValidatorAuthority`,
      evidence.aggregatorValidatorAuthority,
      false,
    ),
    aggregatorSequencerAuthority: assertLiteral(
      `${name}.aggregatorSequencerAuthority`,
      evidence.aggregatorSequencerAuthority,
      false,
    ),
    aggregatorProtocolAuthority: assertLiteral(
      `${name}.aggregatorProtocolAuthority`,
      evidence.aggregatorProtocolAuthority,
      false,
    ),
    transitionValidationAccepted: assertLiteral(
      `${name}.transitionValidationAccepted`,
      evidence.transitionValidationAccepted,
      false,
    ),
    proofVerificationAccepted: assertLiteral(
      `${name}.proofVerificationAccepted`,
      evidence.proofVerificationAccepted,
      false,
    ),
    apntAcceptance: assertLiteral(`${name}.apntAcceptance`, evidence.apntAcceptance, false),
    acceptedPrivateNote: assertLiteral(
      `${name}.acceptedPrivateNote`,
      evidence.acceptedPrivateNote,
      false,
    ),
    privateNoteSpendability: assertLiteral(
      `${name}.privateNoteSpendability`,
      evidence.privateNoteSpendability,
      false,
    ),
  });
}

export function serializeApntUtxoSealCommitmentPreimageV0(preimage: unknown): Uint8Array {
  return serializeDeterministicUtf8(normalizeApntUtxoSealCommitmentPreimageV0(preimage));
}

export function apntUtxoSealCommitment32V0(preimage: unknown): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_UTXO_SEAL_COMMITMENT_V0_DOMAIN,
    serializeApntUtxoSealCommitmentPreimageV0(preimage),
  );
}

export async function buildApntUtxoSealIdentityEvidenceV0(
  preimage: unknown,
): Promise<ApntUtxoSealIdentityEvidenceV0> {
  const normalized = normalizeApntUtxoSealCommitmentPreimageV0(preimage);
  const sealCommitment32 = await apntUtxoSealCommitment32V0(normalized);

  return Object.freeze({
    version: APNT_UTXO_SEAL_V0_VERSION,
    domain: APNT_UTXO_SEAL_IDENTITY_EVIDENCE_V0_DOMAIN,
    evidenceKind: APNT_UTXO_SEAL_IDENTITY_EVIDENCE_V0_KIND,
    network: normalized.network,
    sealOutpoint: normalized.sealOutpoint,
    valueSats: normalized.valueSats,
    importFundingCellCommitment32: normalized.importFundingCellCommitment32,
    eligibilityStatementBind32: normalized.eligibilityStatementBind32,
    outputFingerprint32: normalized.outputFingerprint32,
    lockingBytecodeHash32: normalized.lockingBytecodeHash32,
    sealCommitment32,
    currentTruth: Object.freeze({
      aggregatorConsumeObserved: false,
      sealCloseObserved: false,
      transitionValidationAccepted: false,
      proofVerificationAccepted: false,
      apntAcceptance: false,
      acceptedPrivateNote: false,
      privateNoteSpendability: false,
      transparentImportFundingAmountPublic: true,
    }),
  });
}

function normalizeImportFundingOutputExistenceForSealOpenV0(
  evidence: unknown,
): ApntImportFundingOutputExistenceForSealOpenV0 {
  assertRecord("ApntImportFundingOutputExistenceForSealOpenV0", evidence);
  assertKnownKeys("ApntImportFundingOutputExistenceForSealOpenV0", evidence, [
    "status",
    "network",
    "txid",
    "outputIndex",
    "outputChainExistence",
    "expectedValueSats",
    "actualValueSats",
    "expectedLockingBytecodeHash32",
    "actualLockingBytecodeHash32",
    "expectedOutputFingerprint32",
    "actualOutputFingerprint32",
    "importFundingCellCommitment32",
    "eligibilityStatementBind32",
  ]);

  const actualValueSats = evidence.actualValueSats;
  const actualLockingBytecodeHash32 = evidence.actualLockingBytecodeHash32;
  const actualOutputFingerprint32 = evidence.actualOutputFingerprint32;

  return Object.freeze({
    status: assertOutputExistenceStatus(
      "ApntImportFundingOutputExistenceForSealOpenV0.status",
      evidence.status,
    ),
    network: assertNetwork("ApntImportFundingOutputExistenceForSealOpenV0.network", evidence.network),
    txid: assertTxid("ApntImportFundingOutputExistenceForSealOpenV0.txid", evidence.txid),
    outputIndex: assertNonNegativeSafeInteger(
      "ApntImportFundingOutputExistenceForSealOpenV0.outputIndex",
      evidence.outputIndex,
    ),
    outputChainExistence: assertBoolean(
      "ApntImportFundingOutputExistenceForSealOpenV0.outputChainExistence",
      evidence.outputChainExistence,
    ),
    expectedValueSats: normalizeCanonicalDecimalString(
      "ApntImportFundingOutputExistenceForSealOpenV0.expectedValueSats",
      evidence.expectedValueSats,
    ),
    actualValueSats: actualValueSats === null
      ? null
      : normalizeCanonicalDecimalString(
          "ApntImportFundingOutputExistenceForSealOpenV0.actualValueSats",
          actualValueSats,
        ),
    expectedLockingBytecodeHash32: bytes32Hex(
      "ApntImportFundingOutputExistenceForSealOpenV0.expectedLockingBytecodeHash32",
      evidence.expectedLockingBytecodeHash32,
    ),
    actualLockingBytecodeHash32: actualLockingBytecodeHash32 === null
      ? null
      : bytes32Hex(
          "ApntImportFundingOutputExistenceForSealOpenV0.actualLockingBytecodeHash32",
          actualLockingBytecodeHash32,
        ),
    expectedOutputFingerprint32: bytes32Hex(
      "ApntImportFundingOutputExistenceForSealOpenV0.expectedOutputFingerprint32",
      evidence.expectedOutputFingerprint32,
    ),
    actualOutputFingerprint32: actualOutputFingerprint32 === null
      ? null
      : bytes32Hex(
          "ApntImportFundingOutputExistenceForSealOpenV0.actualOutputFingerprint32",
          actualOutputFingerprint32,
        ),
    importFundingCellCommitment32: bytes32Hex(
      "ApntImportFundingOutputExistenceForSealOpenV0.importFundingCellCommitment32",
      evidence.importFundingCellCommitment32,
    ),
    eligibilityStatementBind32: bytes32Hex(
      "ApntImportFundingOutputExistenceForSealOpenV0.eligibilityStatementBind32",
      evidence.eligibilityStatementBind32,
    ),
  });
}

function bytes32Hex(name: string, value: unknown): string {
  assertHexBytes32(name, value);
  return value as string;
}

export async function buildApntUtxoSealOpenEvidenceFromImportFundingOutputV0(
  evidence: unknown,
): Promise<ApntUtxoSealIdentityEvidenceV0> {
  const normalized = normalizeImportFundingOutputExistenceForSealOpenV0(evidence);

  if (normalized.status !== "verified-output-exists") {
    throw new Error("ApntUtxoSealOpenEvidenceFromImportFundingOutputV0 requires verified-output-exists evidence");
  }
  if (normalized.outputChainExistence !== true) {
    throw new Error("ApntUtxoSealOpenEvidenceFromImportFundingOutputV0 requires outputChainExistence true");
  }
  if (normalized.actualValueSats === null) {
    throw new Error("ApntUtxoSealOpenEvidenceFromImportFundingOutputV0 requires actualValueSats");
  }
  if (normalized.actualLockingBytecodeHash32 === null) {
    throw new Error("ApntUtxoSealOpenEvidenceFromImportFundingOutputV0 requires actualLockingBytecodeHash32");
  }
  if (normalized.actualOutputFingerprint32 === null) {
    throw new Error("ApntUtxoSealOpenEvidenceFromImportFundingOutputV0 requires actualOutputFingerprint32");
  }
  if (normalized.actualValueSats !== normalized.expectedValueSats) {
    throw new Error("ApntUtxoSealOpenEvidenceFromImportFundingOutputV0 output value mismatch");
  }
  if (normalized.actualLockingBytecodeHash32 !== normalized.expectedLockingBytecodeHash32) {
    throw new Error("ApntUtxoSealOpenEvidenceFromImportFundingOutputV0 locking bytecode hash mismatch");
  }
  if (normalized.actualOutputFingerprint32 !== normalized.expectedOutputFingerprint32) {
    throw new Error("ApntUtxoSealOpenEvidenceFromImportFundingOutputV0 output fingerprint mismatch");
  }

  return buildApntUtxoSealIdentityEvidenceV0({
    version: APNT_UTXO_SEAL_V0_VERSION,
    domain: APNT_UTXO_SEAL_COMMITMENT_PREIMAGE_V0_DOMAIN,
    network: normalized.network,
    sealOutpoint: {
      txid: normalized.txid,
      vout: normalized.outputIndex,
    },
    valueSats: normalized.actualValueSats,
    importFundingCellCommitment32: hexToBytes32(
      "ApntUtxoSealOpenEvidenceFromImportFundingOutputV0.importFundingCellCommitment32",
      normalized.importFundingCellCommitment32,
    ),
    eligibilityStatementBind32: hexToBytes32(
      "ApntUtxoSealOpenEvidenceFromImportFundingOutputV0.eligibilityStatementBind32",
      normalized.eligibilityStatementBind32,
    ),
    outputFingerprint32: hexToBytes32(
      "ApntUtxoSealOpenEvidenceFromImportFundingOutputV0.outputFingerprint32",
      normalized.actualOutputFingerprint32,
    ),
    lockingBytecodeHash32: hexToBytes32(
      "ApntUtxoSealOpenEvidenceFromImportFundingOutputV0.lockingBytecodeHash32",
      normalized.actualLockingBytecodeHash32,
    ),
  });
}

export function buildApntUtxoSealClosureEvidenceV0(
  args: Readonly<{
    sealOpenEvidence: ApntUtxoSealIdentityEvidenceV0;
    chainInputEvidence: unknown;
  }>,
): ApntUtxoSealClosureEvidenceV0 {
  const chainInputEvidence = normalizeSealClosureChainInputEvidenceV0(args.chainInputEvidence);
  const sealOpenEvidence = args.sealOpenEvidence;

  if (chainInputEvidence.status !== "spent-outpoint") {
    throw new Error("ApntUtxoSealClosureEvidenceV0 requires spent-outpoint chain input evidence");
  }
  if (chainInputEvidence.consumptionTxid === undefined) {
    throw new Error("ApntUtxoSealClosureEvidenceV0 requires consumptionTxid");
  }
  if (chainInputEvidence.inputIndex === undefined) {
    throw new Error("ApntUtxoSealClosureEvidenceV0 requires inputIndex");
  }
  if (chainInputEvidence.network !== sealOpenEvidence.network) {
    throw new Error("ApntUtxoSealClosureEvidenceV0 network mismatch");
  }
  if (chainInputEvidence.consumedOutpoint.txid !== sealOpenEvidence.sealOutpoint.txid) {
    throw new Error("ApntUtxoSealClosureEvidenceV0 consumed seal txid mismatch");
  }
  if (chainInputEvidence.consumedOutpoint.vout !== sealOpenEvidence.sealOutpoint.vout) {
    throw new Error("ApntUtxoSealClosureEvidenceV0 consumed seal vout mismatch");
  }

  return Object.freeze({
    version: APNT_UTXO_SEAL_V0_VERSION,
    domain: APNT_UTXO_SEAL_CLOSURE_EVIDENCE_V0_DOMAIN,
    evidenceKind: APNT_UTXO_SEAL_CLOSURE_EVIDENCE_V0_KIND,
    network: sealOpenEvidence.network,
    consumedSealOutpoint: sealOpenEvidence.sealOutpoint,
    consumptionTxid: chainInputEvidence.consumptionTxid,
    inputIndex: chainInputEvidence.inputIndex,
    previousSealCommitment32: sealOpenEvidence.sealCommitment32,
    previousOutputFingerprint32: sealOpenEvidence.outputFingerprint32,
    importFundingCellCommitment32: sealOpenEvidence.importFundingCellCommitment32,
    eligibilityStatementBind32: sealOpenEvidence.eligibilityStatementBind32,
    aggregatorConsumeObserved: true,
    sealCloseObserved: true,
    aggregatorCustody: false,
    aggregatorValidatorAuthority: false,
    aggregatorSequencerAuthority: false,
    aggregatorProtocolAuthority: false,
    transitionValidationAccepted: false,
    proofVerificationAccepted: false,
    apntAcceptance: false,
    acceptedPrivateNote: false,
    privateNoteSpendability: false,
  });
}

export function buildApntUtxoSealTransitionBoundaryEvidenceV0(
  args: Readonly<{
    sealClosureEvidence: ApntUtxoSealClosureEvidenceV0;
    candidateBindingEvidence: SealBoundPrivateNoteCandidateBindingEvidenceV0;
    transitionStatementBind32: Bytes32;
    proofTranscriptBind32: Bytes32;
  }>,
): ApntUtxoSealTransitionBoundaryEvidenceV0 {
  const transitionStatementBind32 = assertBytes32(
    "ApntUtxoSealTransitionBoundaryEvidenceV0.transitionStatementBind32",
    args.transitionStatementBind32,
  );
  const proofTranscriptBind32 = assertBytes32(
    "ApntUtxoSealTransitionBoundaryEvidenceV0.proofTranscriptBind32",
    args.proofTranscriptBind32,
  );

  const closure = args.sealClosureEvidence;
  const candidate = args.candidateBindingEvidence;

  if (closure.network !== candidateBindingNetwork(closure.network, candidate)) {
    throw new Error("ApntUtxoSealTransitionBoundaryEvidenceV0 network mismatch");
  }
  assertBytes32Equal(
    "ApntUtxoSealTransitionBoundaryEvidenceV0 seal commitment",
    closure.previousSealCommitment32,
    candidate.sealCommitment32,
  );
  assertBytes32Equal(
    "ApntUtxoSealTransitionBoundaryEvidenceV0 import funding commitment",
    closure.importFundingCellCommitment32,
    candidate.importFundingCellCommitment32,
  );
  assertBytes32Equal(
    "ApntUtxoSealTransitionBoundaryEvidenceV0 eligibility statement bind",
    closure.eligibilityStatementBind32,
    candidate.eligibilityStatementBind32,
  );
  assertBytes32Equal(
    "ApntUtxoSealTransitionBoundaryEvidenceV0 output fingerprint",
    closure.previousOutputFingerprint32,
    candidate.outputFingerprint32,
  );

  return Object.freeze({
    version: APNT_UTXO_SEAL_V0_VERSION,
    domain: APNT_UTXO_SEAL_TRANSITION_BOUNDARY_EVIDENCE_V0_DOMAIN,
    evidenceKind: APNT_UTXO_SEAL_TRANSITION_BOUNDARY_EVIDENCE_V0_KIND,
    network: closure.network,
    consumedSealOutpoint: closure.consumedSealOutpoint,
    consumptionTxid: closure.consumptionTxid,
    inputIndex: closure.inputIndex,
    previousSealCommitment32: closure.previousSealCommitment32,
    previousOutputFingerprint32: closure.previousOutputFingerprint32,
    importFundingCellCommitment32: closure.importFundingCellCommitment32,
    eligibilityStatementBind32: closure.eligibilityStatementBind32,
    candidateBinding32: candidate.candidateBinding32,
    noteCommitment32: candidate.noteCommitment32,
    recoveryPacketHash32: candidate.recoveryPacketHash32,
    transitionStatementBind32,
    proofTranscriptBind32,
    transitionBoundaryVerified: true,
    boundaryEvidenceOnly: true,
    proofTranscriptBindingRequiredSeparately: true,
    proofVerificationRequiredSeparately: true,
    aggregatorCustody: false,
    aggregatorValidatorAuthority: false,
    aggregatorSequencerAuthority: false,
    aggregatorProtocolAuthority: false,
    proofVerificationAccepted: false,
    apntAcceptance: false,
    acceptedPrivateNote: false,
    privateNoteSpendability: false,
  });
}

function candidateBindingNetwork(
  expectedNetwork: ApntUtxoSealNetworkV0,
  candidate: SealBoundPrivateNoteCandidateBindingEvidenceV0,
): ApntUtxoSealNetworkV0 {
  if (candidate.apntAcceptance !== false || candidate.acceptedPrivateNote !== false || candidate.privateNoteSpendability !== false) {
    throw new Error("ApntUtxoSealTransitionBoundaryEvidenceV0 candidate evidence must be non-accepting");
  }
  return expectedNetwork;
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index]! ^ right[index]!;
  }
  return diff === 0;
}

function assertBytes32Equal(name: string, actual: Bytes32, expected: Bytes32): void {
  if (!bytesEqual(actual, expected)) {
    throw new Error(`${name} mismatch`);
  }
}
