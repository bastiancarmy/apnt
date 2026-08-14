import { asBytes32, copyBytes, hexToBytes, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { serializeDeterministicUtf8 } from "./serialization.js";
import type { ApntUtxoSealIdentityEvidenceV0 } from "./apnt_utxo_seal.js";

export const SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_VERSION = 0;
export const SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_DOMAIN =
  "bch-cloak-apnt-v0:seal-bound-private-note-candidate";
export const SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_KIND =
  "seal-bound-private-note-candidate-v0";
export const SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_BINDING_V0_DOMAIN =
  "bch-cloak-apnt-v0:seal-bound-private-note-candidate-binding";
export const SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_BINDING_PREIMAGE_V0_DOMAIN =
  "bch-cloak-apnt-v0:seal-bound-private-note-candidate-binding-preimage";
export const SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_BINDING_EVIDENCE_V0_DOMAIN =
  "bch-cloak-apnt-v0:seal-bound-private-note-candidate-binding-evidence";
export const SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_BINDING_EVIDENCE_V0_KIND =
  "seal-bound-private-note-candidate-binding-evidence-v0";
export const SEAL_BOUND_CANDIDATE_SEAL_COMMITMENT_V0_DOMAIN =
  "bch-cloak-apnt-v0:seal-bound-candidate-seal-commitment";
export const SEAL_BOUND_CANDIDATE_SEAL_COMMITMENT_PREIMAGE_V0_DOMAIN =
  "bch-cloak-apnt-v0:seal-bound-candidate-seal-commitment-preimage";
export const SEAL_BOUND_CANDIDATE_SEAL_BINDING_COMMITMENT_V0_DOMAIN =
  "bch-cloak-apnt-v0:seal-bound-candidate-seal-binding-commitment";
export const SEAL_BOUND_CANDIDATE_SEAL_BINDING_COMMITMENT_PREIMAGE_V0_DOMAIN =
  "bch-cloak-apnt-v0:seal-bound-candidate-seal-binding-commitment-preimage";
export const SEAL_BOUND_CANDIDATE_NOTE_COMMITMENT_V0_DOMAIN =
  "bch-cloak-apnt-v0:seal-bound-candidate-note-commitment";
export const SEAL_BOUND_CANDIDATE_NOTE_COMMITMENT_PREIMAGE_V0_DOMAIN =
  "bch-cloak-apnt-v0:seal-bound-candidate-note-commitment-preimage";
export const SEAL_BOUND_CANDIDATE_OUTPUT_FINGERPRINT_V0_DOMAIN =
  "bch-cloak-apnt-v0:seal-bound-candidate-output-fingerprint";
export const SEAL_BOUND_CANDIDATE_OUTPUT_FINGERPRINT_PREIMAGE_V0_DOMAIN =
  "bch-cloak-apnt-v0:seal-bound-candidate-output-fingerprint-preimage";
export const SEAL_BOUND_CANDIDATE_NOTE_COMMITMENT_SCHEME_V0 =
  "apnt-note-commitment-hash-v0";
export const SEAL_BOUND_CANDIDATE_OUTPUT_BINDING_PROFILE_V0 =
  "beaconless-output-binding-v0";
export const APNT_PROOF_TRANSCRIPT_BIND_V0_DOMAIN =
  "bch-cloak-apnt-v0:proof-transcript-bind";
export const APNT_PROOF_TRANSCRIPT_BIND_PREIMAGE_V0_DOMAIN =
  "bch-cloak-apnt-v0:proof-transcript-bind-preimage";
// FROZEN, task 21.8(d): this string is a value inside a domain-separated
// commitment preimage, so renaming it moves the commitment and invalidates
// every retained proof/evidence artifact bound under it. The "srq3-trq1" text
// carries no remaining SRQ3/TRQ1 semantics — it is an opaque profile label.
// Do not rename it when the SRQ3/TRQ1 lock is otherwise cleaned up.
export const APNT_PROOF_TRANSCRIPT_BIND_CARRIER_PROFILE_V0 =
  "bch2026-srq3-trq1-structural-carrier-v0";

export type ApntValueCommitmentSchemeV0 =
  | "hash-placeholder-v0"
  | "pedersen-secp256k1-v0"
  | "future-pq-proof-profile-v0";

export type ApntValueCommitmentV0 = Readonly<{
  scheme: ApntValueCommitmentSchemeV0;
  commitmentBytes: Uint8Array;
}>;

export type SealBoundPrivateNoteCandidateNetworkV0 = "chipnet" | "mainnet" | "regtest";

export type SealBoundCandidateSealCommitmentPreimageV0 = Readonly<{
  version: typeof SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_VERSION;
  domain: typeof SEAL_BOUND_CANDIDATE_SEAL_COMMITMENT_PREIMAGE_V0_DOMAIN;
  network: SealBoundPrivateNoteCandidateNetworkV0;
  sealOutpointTxid: string;
  sealOutpointVout: number;
  importFundingCellCommitment32: Bytes32;
}>;

export type SealBoundCandidateOutputFingerprintPreimageV0 = Readonly<{
  version: typeof SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_VERSION;
  domain: typeof SEAL_BOUND_CANDIDATE_OUTPUT_FINGERPRINT_PREIMAGE_V0_DOMAIN;
  network: SealBoundPrivateNoteCandidateNetworkV0;
  outputBindingProfile: typeof SEAL_BOUND_CANDIDATE_OUTPUT_BINDING_PROFILE_V0;
  txid: string;
  vout: number;
  lockingBytecodeHash32: Bytes32;
  valueSats: number;
}>;

export type SealBoundCandidateNoteCommitmentPreimageV0 = Readonly<{
  version: typeof SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_VERSION;
  domain: typeof SEAL_BOUND_CANDIDATE_NOTE_COMMITMENT_PREIMAGE_V0_DOMAIN;
  noteCommitmentScheme: typeof SEAL_BOUND_CANDIDATE_NOTE_COMMITMENT_SCHEME_V0;
  valueCommitment: ApntValueCommitmentV0;
  recoveryPacketHash32: Bytes32;
  sealCommitment32: Bytes32;
  outputFingerprint32: Bytes32;
}>;

export type SealBoundCandidateSealBindingCommitmentPreimageV0 = Readonly<{
  version: typeof SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_VERSION;
  domain: typeof SEAL_BOUND_CANDIDATE_SEAL_BINDING_COMMITMENT_PREIMAGE_V0_DOMAIN;
  sealCommitment32: Bytes32;
  importFundingCellCommitment32: Bytes32;
  claimCommitment32: Bytes32;
  noteCommitment32: Bytes32;
  outputFingerprint32: Bytes32;
}>;

export type ApntProofTranscriptBindPreimageV0 = Readonly<{
  version: typeof SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_VERSION;
  domain: typeof APNT_PROOF_TRANSCRIPT_BIND_PREIMAGE_V0_DOMAIN;
  network: SealBoundPrivateNoteCandidateNetworkV0;
  verifierProfile: string;
  proofSystemProfile: string;
  carrierProfile: typeof APNT_PROOF_TRANSCRIPT_BIND_CARRIER_PROFILE_V0;
  apntVerifierStatementBind32: Bytes32;
  transitionStatementBind32: Bytes32;
  sealCommitments32: readonly Bytes32[];
  sealBindingCommitments32: readonly Bytes32[];
  noteCommitments32: readonly Bytes32[];
  outputFingerprints32: readonly Bytes32[];
  valueCommitments: readonly ApntValueCommitmentV0[];
  publicFeeSats: string;
  participantCount: number;
}>;

export type SealBoundPrivateNoteCandidateBindingPreimageV0 = Readonly<{
  version: typeof SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_VERSION;
  domain: typeof SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_BINDING_PREIMAGE_V0_DOMAIN;
  network: SealBoundPrivateNoteCandidateNetworkV0;
  sealOutpointTxid: string;
  sealOutpointVout: number;
  sealCommitment32: Bytes32;
  importFundingCellCommitment32: Bytes32;
  eligibilityStatementBind32: Bytes32;
  claimCommitment32: Bytes32;
  noteCommitment32: Bytes32;
  recoveryPacketHash32: Bytes32;
  ciphertextHash32: Bytes32;
  outputFingerprint32: Bytes32;
  valueCommitment: ApntValueCommitmentV0;
}>;

export type SealBoundPrivateNoteCandidateBindingEvidenceV0 = Readonly<{
  version: typeof SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_VERSION;
  domain: typeof SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_BINDING_EVIDENCE_V0_DOMAIN;
  evidenceKind: typeof SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_BINDING_EVIDENCE_V0_KIND;
  candidateBinding32: Bytes32;
  sealCommitment32: Bytes32;
  importFundingCellCommitment32: Bytes32;
  eligibilityStatementBind32: Bytes32;
  noteCommitment32: Bytes32;
  recoveryPacketHash32: Bytes32;
  outputFingerprint32: Bytes32;
  aggregatorConsumeObserved: false;
  sealCloseObserved: false;
  transitionValidationAccepted: false;
  proofVerificationAccepted: false;
  apntAcceptance: false;
  acceptedPrivateNote: false;
  privateNoteSpendability: false;
}>;

export type SealBoundPrivateNoteCandidateV0 = Readonly<{
  version: typeof SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_VERSION;
  domain: typeof SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_DOMAIN;
  candidateKind: typeof SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_KIND;
  network: SealBoundPrivateNoteCandidateNetworkV0;
  importEvidence: Readonly<{
    importTxid: string;
    importVout: number;
    importFundingCellCommitment32: Bytes32;
    eligibilityStatementBind32: Bytes32;
    claimCommitment32: Bytes32;
  }>;
  sealBinding: Readonly<{
    sealOutpointTxid: string;
    sealOutpointVout: number;
    sealCommitment32: Bytes32;
    sealBindingCommitment32: Bytes32;
  }>;
  noteCommitment: Readonly<{
    noteCommitment32: Bytes32;
    noteCommitmentScheme: "apnt-note-commitment-hash-v0";
  }>;
  valueCommitment: ApntValueCommitmentV0;
  recoveryPacket: Readonly<{
    packetHash32: Bytes32;
    encryptionProfile: "ml-kem-768-hkdf-aead-v0";
    ciphertextLocation: "on-chain" | "handoff" | "local-fixture";
    ciphertextHash32: Bytes32;
  }>;
  outputBinding: Readonly<{
    outputFingerprint32: Bytes32;
    outputBindingProfile: "beaconless-output-binding-v0";
  }>;
  aggregatorEvidence?: Readonly<{
    handoffPayloadCommitment32: Bytes32;
    batchCommitment32?: Bytes32;
    aggregationProfile: "local-json-aggregator-handoff-v0";
  }>;
  walletVerification: Readonly<{
    verifiedAtUnixMs: number;
    noteCommitmentMatchesRecoveredPlaintext: boolean;
    packetHashMatchesCiphertext: boolean;
    sealBindingMatchesImportEvidence: boolean;
    outputBindingMatchesChainEvidence: boolean;
    noStaticRecipientMarkerRequired: boolean;
  }>;
}>;

const NETWORKS = new Set<SealBoundPrivateNoteCandidateNetworkV0>(["chipnet", "mainnet", "regtest"]);
const VALUE_COMMITMENT_SCHEMES = new Set<ApntValueCommitmentSchemeV0>([
  "hash-placeholder-v0",
  "pedersen-secp256k1-v0",
  "future-pq-proof-profile-v0",
]);
const CIPHERTEXT_LOCATIONS = new Set<SealBoundPrivateNoteCandidateV0["recoveryPacket"]["ciphertextLocation"]>([
  "on-chain",
  "handoff",
  "local-fixture",
]);

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

function assertNetwork(name: string, value: unknown): SealBoundPrivateNoteCandidateNetworkV0 {
  if (typeof value !== "string" || !NETWORKS.has(value as SealBoundPrivateNoteCandidateNetworkV0)) {
    throw new Error(`${name} must be chipnet, mainnet, or regtest`);
  }
  return value as SealBoundPrivateNoteCandidateNetworkV0;
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

function assertBoolean(name: string, value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${name} must be a boolean`);
  }
  return value;
}

function assertNonNegativeSafeNumber(name: string, value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`${name} must be a non-negative safe integer`);
  }
  return value as number;
}

function assertNonNegativeBigInt(name: string, value: unknown): bigint {
  if (typeof value !== "bigint" || value < 0n) {
    throw new Error(`${name} must be a non-negative bigint`);
  }
  return value;
}

function assertCanonicalDecimalString(name: string, value: unknown): string {
  if (typeof value === "bigint") {
    if (value < 0n) {
      throw new Error(`${name} must be a canonical non-negative integer decimal string`);
    }
    return value.toString(10);
  }
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/u.test(value)) {
    throw new Error(`${name} must be a canonical non-negative integer decimal string`);
  }
  return value;
}

function assertBytes(name: string, value: unknown): Uint8Array {
  if (!(value instanceof Uint8Array)) {
    throw new Error(`${name} must be a Uint8Array`);
  }
  return copyBytes(value);
}

function assertBytes32(name: string, value: unknown): Bytes32 {
  return asBytes32(name, assertBytes(name, value));
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

function assertNonEmptyString(name: string, value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

function normalizeBytes32Array(name: string, value: unknown): readonly Bytes32[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${name} must be a non-empty array`);
  }
  return Object.freeze(value.map((entry, index) => assertBytes32(`${name}[${String(index)}]`, entry)));
}

function normalizeValueCommitmentArray(name: string, value: unknown): readonly ApntValueCommitmentV0[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${name} must be a non-empty array`);
  }
  return Object.freeze(value.map((entry) => normalizeApntValueCommitmentV0(entry)));
}

function assertParticipantArrayLength(name: string, value: readonly unknown[], participantCount: number): void {
  if (value.length !== participantCount) {
    throw new Error(`${name} length must equal participantCount`);
  }
}

export function normalizeApntValueCommitmentV0(
  commitment: unknown,
): ApntValueCommitmentV0 {
  assertRecord("ApntValueCommitmentV0", commitment);
  assertKnownKeys("ApntValueCommitmentV0", commitment, ["scheme", "commitmentBytes"]);
  if (
    typeof commitment.scheme !== "string" ||
    !VALUE_COMMITMENT_SCHEMES.has(commitment.scheme as ApntValueCommitmentSchemeV0)
  ) {
    throw new Error("ApntValueCommitmentV0.scheme is unsupported");
  }
  return Object.freeze({
    scheme: commitment.scheme as ApntValueCommitmentSchemeV0,
    commitmentBytes: assertBytes("ApntValueCommitmentV0.commitmentBytes", commitment.commitmentBytes),
  });
}

export function normalizeSealBoundCandidateSealCommitmentPreimageV0(
  preimage: unknown,
): SealBoundCandidateSealCommitmentPreimageV0 {
  assertRecord("SealBoundCandidateSealCommitmentPreimageV0", preimage);
  assertKnownKeys("SealBoundCandidateSealCommitmentPreimageV0", preimage, [
    "version",
    "domain",
    "network",
    "sealOutpointTxid",
    "sealOutpointVout",
    "importFundingCellCommitment32",
  ]);
  return Object.freeze({
    version: assertLiteral(
      "SealBoundCandidateSealCommitmentPreimageV0.version",
      preimage.version,
      SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_VERSION,
    ),
    domain: assertLiteral(
      "SealBoundCandidateSealCommitmentPreimageV0.domain",
      preimage.domain,
      SEAL_BOUND_CANDIDATE_SEAL_COMMITMENT_PREIMAGE_V0_DOMAIN,
    ),
    network: assertNetwork("SealBoundCandidateSealCommitmentPreimageV0.network", preimage.network),
    sealOutpointTxid: assertTxid(
      "SealBoundCandidateSealCommitmentPreimageV0.sealOutpointTxid",
      preimage.sealOutpointTxid,
    ),
    sealOutpointVout: assertNonNegativeSafeInteger(
      "SealBoundCandidateSealCommitmentPreimageV0.sealOutpointVout",
      preimage.sealOutpointVout,
    ),
    importFundingCellCommitment32: assertBytes32(
      "SealBoundCandidateSealCommitmentPreimageV0.importFundingCellCommitment32",
      preimage.importFundingCellCommitment32,
    ),
  });
}

export function serializeSealBoundCandidateSealCommitmentPreimageV0(
  preimage: unknown,
): Uint8Array {
  return serializeDeterministicUtf8(normalizeSealBoundCandidateSealCommitmentPreimageV0(preimage));
}

export function sealBoundCandidateSealCommitmentV0(
  preimage: unknown,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    SEAL_BOUND_CANDIDATE_SEAL_COMMITMENT_V0_DOMAIN,
    serializeSealBoundCandidateSealCommitmentPreimageV0(preimage),
  );
}

export function normalizeSealBoundCandidateOutputFingerprintPreimageV0(
  preimage: unknown,
): SealBoundCandidateOutputFingerprintPreimageV0 {
  assertRecord("SealBoundCandidateOutputFingerprintPreimageV0", preimage);
  assertKnownKeys("SealBoundCandidateOutputFingerprintPreimageV0", preimage, [
    "version",
    "domain",
    "network",
    "outputBindingProfile",
    "txid",
    "vout",
    "lockingBytecodeHash32",
    "valueSats",
  ]);
  return Object.freeze({
    version: assertLiteral(
      "SealBoundCandidateOutputFingerprintPreimageV0.version",
      preimage.version,
      SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_VERSION,
    ),
    domain: assertLiteral(
      "SealBoundCandidateOutputFingerprintPreimageV0.domain",
      preimage.domain,
      SEAL_BOUND_CANDIDATE_OUTPUT_FINGERPRINT_PREIMAGE_V0_DOMAIN,
    ),
    network: assertNetwork("SealBoundCandidateOutputFingerprintPreimageV0.network", preimage.network),
    outputBindingProfile: assertLiteral(
      "SealBoundCandidateOutputFingerprintPreimageV0.outputBindingProfile",
      preimage.outputBindingProfile,
      SEAL_BOUND_CANDIDATE_OUTPUT_BINDING_PROFILE_V0,
    ),
    txid: assertTxid("SealBoundCandidateOutputFingerprintPreimageV0.txid", preimage.txid),
    vout: assertNonNegativeSafeInteger("SealBoundCandidateOutputFingerprintPreimageV0.vout", preimage.vout),
    lockingBytecodeHash32: assertBytes32(
      "SealBoundCandidateOutputFingerprintPreimageV0.lockingBytecodeHash32",
      preimage.lockingBytecodeHash32,
    ),
    valueSats: assertNonNegativeSafeNumber(
      "SealBoundCandidateOutputFingerprintPreimageV0.valueSats",
      preimage.valueSats,
    ),
  });
}

export function serializeSealBoundCandidateOutputFingerprintPreimageV0(
  preimage: unknown,
): Uint8Array {
  return serializeDeterministicUtf8(normalizeSealBoundCandidateOutputFingerprintPreimageV0(preimage));
}

export function sealBoundCandidateOutputFingerprintV0(
  preimage: unknown,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    SEAL_BOUND_CANDIDATE_OUTPUT_FINGERPRINT_V0_DOMAIN,
    serializeSealBoundCandidateOutputFingerprintPreimageV0(preimage),
  );
}

export function normalizeSealBoundCandidateNoteCommitmentPreimageV0(
  preimage: unknown,
): SealBoundCandidateNoteCommitmentPreimageV0 {
  assertRecord("SealBoundCandidateNoteCommitmentPreimageV0", preimage);
  assertKnownKeys("SealBoundCandidateNoteCommitmentPreimageV0", preimage, [
    "version",
    "domain",
    "noteCommitmentScheme",
    "valueCommitment",
    "recoveryPacketHash32",
    "sealCommitment32",
    "outputFingerprint32",
  ]);
  return Object.freeze({
    version: assertLiteral(
      "SealBoundCandidateNoteCommitmentPreimageV0.version",
      preimage.version,
      SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_VERSION,
    ),
    domain: assertLiteral(
      "SealBoundCandidateNoteCommitmentPreimageV0.domain",
      preimage.domain,
      SEAL_BOUND_CANDIDATE_NOTE_COMMITMENT_PREIMAGE_V0_DOMAIN,
    ),
    noteCommitmentScheme: assertLiteral(
      "SealBoundCandidateNoteCommitmentPreimageV0.noteCommitmentScheme",
      preimage.noteCommitmentScheme,
      SEAL_BOUND_CANDIDATE_NOTE_COMMITMENT_SCHEME_V0,
    ),
    valueCommitment: normalizeApntValueCommitmentV0(preimage.valueCommitment),
    recoveryPacketHash32: assertBytes32(
      "SealBoundCandidateNoteCommitmentPreimageV0.recoveryPacketHash32",
      preimage.recoveryPacketHash32,
    ),
    sealCommitment32: assertBytes32(
      "SealBoundCandidateNoteCommitmentPreimageV0.sealCommitment32",
      preimage.sealCommitment32,
    ),
    outputFingerprint32: assertBytes32(
      "SealBoundCandidateNoteCommitmentPreimageV0.outputFingerprint32",
      preimage.outputFingerprint32,
    ),
  });
}

export function serializeSealBoundCandidateNoteCommitmentPreimageV0(
  preimage: unknown,
): Uint8Array {
  return serializeDeterministicUtf8(normalizeSealBoundCandidateNoteCommitmentPreimageV0(preimage));
}

export function sealBoundCandidateNoteCommitmentV0(
  preimage: unknown,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    SEAL_BOUND_CANDIDATE_NOTE_COMMITMENT_V0_DOMAIN,
    serializeSealBoundCandidateNoteCommitmentPreimageV0(preimage),
  );
}

export function normalizeSealBoundCandidateSealBindingCommitmentPreimageV0(
  preimage: unknown,
): SealBoundCandidateSealBindingCommitmentPreimageV0 {
  assertRecord("SealBoundCandidateSealBindingCommitmentPreimageV0", preimage);
  assertKnownKeys("SealBoundCandidateSealBindingCommitmentPreimageV0", preimage, [
    "version",
    "domain",
    "sealCommitment32",
    "importFundingCellCommitment32",
    "claimCommitment32",
    "noteCommitment32",
    "outputFingerprint32",
  ]);
  return Object.freeze({
    version: assertLiteral(
      "SealBoundCandidateSealBindingCommitmentPreimageV0.version",
      preimage.version,
      SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_VERSION,
    ),
    domain: assertLiteral(
      "SealBoundCandidateSealBindingCommitmentPreimageV0.domain",
      preimage.domain,
      SEAL_BOUND_CANDIDATE_SEAL_BINDING_COMMITMENT_PREIMAGE_V0_DOMAIN,
    ),
    sealCommitment32: assertBytes32(
      "SealBoundCandidateSealBindingCommitmentPreimageV0.sealCommitment32",
      preimage.sealCommitment32,
    ),
    importFundingCellCommitment32: assertBytes32(
      "SealBoundCandidateSealBindingCommitmentPreimageV0.importFundingCellCommitment32",
      preimage.importFundingCellCommitment32,
    ),
    claimCommitment32: assertBytes32(
      "SealBoundCandidateSealBindingCommitmentPreimageV0.claimCommitment32",
      preimage.claimCommitment32,
    ),
    noteCommitment32: assertBytes32(
      "SealBoundCandidateSealBindingCommitmentPreimageV0.noteCommitment32",
      preimage.noteCommitment32,
    ),
    outputFingerprint32: assertBytes32(
      "SealBoundCandidateSealBindingCommitmentPreimageV0.outputFingerprint32",
      preimage.outputFingerprint32,
    ),
  });
}

export function serializeSealBoundCandidateSealBindingCommitmentPreimageV0(
  preimage: unknown,
): Uint8Array {
  return serializeDeterministicUtf8(normalizeSealBoundCandidateSealBindingCommitmentPreimageV0(preimage));
}

export function sealBoundCandidateSealBindingCommitmentV0(
  preimage: unknown,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    SEAL_BOUND_CANDIDATE_SEAL_BINDING_COMMITMENT_V0_DOMAIN,
    serializeSealBoundCandidateSealBindingCommitmentPreimageV0(preimage),
  );
}

export function normalizeApntProofTranscriptBindPreimageV0(
  preimage: unknown,
): ApntProofTranscriptBindPreimageV0 {
  assertRecord("ApntProofTranscriptBindPreimageV0", preimage);
  assertKnownKeys("ApntProofTranscriptBindPreimageV0", preimage, [
    "version",
    "domain",
    "network",
    "verifierProfile",
    "proofSystemProfile",
    "carrierProfile",
    "apntVerifierStatementBind32",
    "transitionStatementBind32",
    "sealCommitments32",
    "sealBindingCommitments32",
    "noteCommitments32",
    "outputFingerprints32",
    "valueCommitments",
    "publicFeeSats",
    "participantCount",
  ]);
  const participantCount = assertNonNegativeSafeInteger(
    "ApntProofTranscriptBindPreimageV0.participantCount",
    preimage.participantCount,
  );
  if (participantCount === 0) {
    throw new Error("ApntProofTranscriptBindPreimageV0.participantCount must be positive");
  }
  const sealCommitments32 = normalizeBytes32Array(
    "ApntProofTranscriptBindPreimageV0.sealCommitments32",
    preimage.sealCommitments32,
  );
  const sealBindingCommitments32 = normalizeBytes32Array(
    "ApntProofTranscriptBindPreimageV0.sealBindingCommitments32",
    preimage.sealBindingCommitments32,
  );
  const noteCommitments32 = normalizeBytes32Array(
    "ApntProofTranscriptBindPreimageV0.noteCommitments32",
    preimage.noteCommitments32,
  );
  const outputFingerprints32 = normalizeBytes32Array(
    "ApntProofTranscriptBindPreimageV0.outputFingerprints32",
    preimage.outputFingerprints32,
  );
  const valueCommitments = normalizeValueCommitmentArray(
    "ApntProofTranscriptBindPreimageV0.valueCommitments",
    preimage.valueCommitments,
  );
  assertParticipantArrayLength("ApntProofTranscriptBindPreimageV0.sealCommitments32", sealCommitments32, participantCount);
  assertParticipantArrayLength("ApntProofTranscriptBindPreimageV0.sealBindingCommitments32", sealBindingCommitments32, participantCount);
  assertParticipantArrayLength("ApntProofTranscriptBindPreimageV0.noteCommitments32", noteCommitments32, participantCount);
  assertParticipantArrayLength("ApntProofTranscriptBindPreimageV0.outputFingerprints32", outputFingerprints32, participantCount);
  assertParticipantArrayLength("ApntProofTranscriptBindPreimageV0.valueCommitments", valueCommitments, participantCount);
  return Object.freeze({
    version: assertLiteral(
      "ApntProofTranscriptBindPreimageV0.version",
      preimage.version,
      SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_VERSION,
    ),
    domain: assertLiteral(
      "ApntProofTranscriptBindPreimageV0.domain",
      preimage.domain,
      APNT_PROOF_TRANSCRIPT_BIND_PREIMAGE_V0_DOMAIN,
    ),
    network: assertNetwork("ApntProofTranscriptBindPreimageV0.network", preimage.network),
    verifierProfile: assertNonEmptyString(
      "ApntProofTranscriptBindPreimageV0.verifierProfile",
      preimage.verifierProfile,
    ),
    proofSystemProfile: assertNonEmptyString(
      "ApntProofTranscriptBindPreimageV0.proofSystemProfile",
      preimage.proofSystemProfile,
    ),
    carrierProfile: assertLiteral(
      "ApntProofTranscriptBindPreimageV0.carrierProfile",
      preimage.carrierProfile,
      APNT_PROOF_TRANSCRIPT_BIND_CARRIER_PROFILE_V0,
    ),
    apntVerifierStatementBind32: assertBytes32(
      "ApntProofTranscriptBindPreimageV0.apntVerifierStatementBind32",
      preimage.apntVerifierStatementBind32,
    ),
    transitionStatementBind32: assertBytes32(
      "ApntProofTranscriptBindPreimageV0.transitionStatementBind32",
      preimage.transitionStatementBind32,
    ),
    sealCommitments32,
    sealBindingCommitments32,
    noteCommitments32,
    outputFingerprints32,
    valueCommitments,
    publicFeeSats: assertCanonicalDecimalString(
      "ApntProofTranscriptBindPreimageV0.publicFeeSats",
      preimage.publicFeeSats,
    ),
    participantCount,
  });
}

function normalizeApntProofTranscriptBindPreimageRecordV0(
  preimage: ApntProofTranscriptBindPreimageV0,
) {
  const normalized = normalizeApntProofTranscriptBindPreimageV0(preimage);
  return {
    apntVerifierStatementBind32: normalized.apntVerifierStatementBind32,
    carrierProfile: normalized.carrierProfile,
    domain: normalized.domain,
    network: normalized.network,
    noteCommitments32: normalized.noteCommitments32,
    outputFingerprints32: normalized.outputFingerprints32,
    participantCount: normalized.participantCount,
    proofSystemProfile: normalized.proofSystemProfile,
    publicFeeSats: normalized.publicFeeSats,
    sealBindingCommitments32: normalized.sealBindingCommitments32,
    sealCommitments32: normalized.sealCommitments32,
    transitionStatementBind32: normalized.transitionStatementBind32,
    valueCommitments: normalized.valueCommitments,
    verifierProfile: normalized.verifierProfile,
    version: normalized.version,
  };
}

export function serializeApntProofTranscriptBindPreimageV0(
  preimage: unknown,
): Uint8Array {
  return serializeDeterministicUtf8(
    normalizeApntProofTranscriptBindPreimageRecordV0(
      normalizeApntProofTranscriptBindPreimageV0(preimage),
    ),
  );
}

export function apntProofTranscriptBind32V0(
  preimage: unknown,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_PROOF_TRANSCRIPT_BIND_V0_DOMAIN,
    serializeApntProofTranscriptBindPreimageV0(preimage),
  );
}

export function normalizeSealBoundPrivateNoteCandidateBindingPreimageV0(
  preimage: unknown,
): SealBoundPrivateNoteCandidateBindingPreimageV0 {
  assertRecord("SealBoundPrivateNoteCandidateBindingPreimageV0", preimage);
  assertKnownKeys("SealBoundPrivateNoteCandidateBindingPreimageV0", preimage, [
    "version",
    "domain",
    "network",
    "sealOutpointTxid",
    "sealOutpointVout",
    "sealCommitment32",
    "importFundingCellCommitment32",
    "eligibilityStatementBind32",
    "claimCommitment32",
    "noteCommitment32",
    "recoveryPacketHash32",
    "ciphertextHash32",
    "outputFingerprint32",
    "valueCommitment",
  ]);
  return Object.freeze({
    version: assertLiteral(
      "SealBoundPrivateNoteCandidateBindingPreimageV0.version",
      preimage.version,
      SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_VERSION,
    ),
    domain: assertLiteral(
      "SealBoundPrivateNoteCandidateBindingPreimageV0.domain",
      preimage.domain,
      SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_BINDING_PREIMAGE_V0_DOMAIN,
    ),
    network: assertNetwork("SealBoundPrivateNoteCandidateBindingPreimageV0.network", preimage.network),
    sealOutpointTxid: assertTxid(
      "SealBoundPrivateNoteCandidateBindingPreimageV0.sealOutpointTxid",
      preimage.sealOutpointTxid,
    ),
    sealOutpointVout: assertNonNegativeSafeInteger(
      "SealBoundPrivateNoteCandidateBindingPreimageV0.sealOutpointVout",
      preimage.sealOutpointVout,
    ),
    sealCommitment32: assertBytes32(
      "SealBoundPrivateNoteCandidateBindingPreimageV0.sealCommitment32",
      preimage.sealCommitment32,
    ),
    importFundingCellCommitment32: assertBytes32(
      "SealBoundPrivateNoteCandidateBindingPreimageV0.importFundingCellCommitment32",
      preimage.importFundingCellCommitment32,
    ),
    eligibilityStatementBind32: assertBytes32(
      "SealBoundPrivateNoteCandidateBindingPreimageV0.eligibilityStatementBind32",
      preimage.eligibilityStatementBind32,
    ),
    claimCommitment32: assertBytes32(
      "SealBoundPrivateNoteCandidateBindingPreimageV0.claimCommitment32",
      preimage.claimCommitment32,
    ),
    noteCommitment32: assertBytes32(
      "SealBoundPrivateNoteCandidateBindingPreimageV0.noteCommitment32",
      preimage.noteCommitment32,
    ),
    recoveryPacketHash32: assertBytes32(
      "SealBoundPrivateNoteCandidateBindingPreimageV0.recoveryPacketHash32",
      preimage.recoveryPacketHash32,
    ),
    ciphertextHash32: assertBytes32(
      "SealBoundPrivateNoteCandidateBindingPreimageV0.ciphertextHash32",
      preimage.ciphertextHash32,
    ),
    outputFingerprint32: assertBytes32(
      "SealBoundPrivateNoteCandidateBindingPreimageV0.outputFingerprint32",
      preimage.outputFingerprint32,
    ),
    valueCommitment: normalizeApntValueCommitmentV0(preimage.valueCommitment),
  });
}

export function serializeSealBoundPrivateNoteCandidateBindingPreimageV0(
  preimage: unknown,
): Uint8Array {
  return serializeDeterministicUtf8(
    normalizeSealBoundPrivateNoteCandidateBindingPreimageV0(preimage),
  );
}

export function sealBoundPrivateNoteCandidateBindingV0(
  preimage: unknown,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_BINDING_V0_DOMAIN,
    serializeSealBoundPrivateNoteCandidateBindingPreimageV0(preimage),
  );
}

export async function buildSealBoundPrivateNoteCandidateBindingEvidenceV0(
  args: Readonly<{
    candidate: unknown;
    sealOpenEvidence: ApntUtxoSealIdentityEvidenceV0;
  }>,
): Promise<SealBoundPrivateNoteCandidateBindingEvidenceV0> {
  const candidate = normalizeSealBoundPrivateNoteCandidateV0(args.candidate);
  const sealOpenEvidence = args.sealOpenEvidence;

  if (candidate.network !== sealOpenEvidence.network) {
    throw new Error("SealBoundPrivateNoteCandidateBindingEvidenceV0 network mismatch");
  }
  if (candidate.sealBinding.sealOutpointTxid !== sealOpenEvidence.sealOutpoint.txid) {
    throw new Error("SealBoundPrivateNoteCandidateBindingEvidenceV0 seal outpoint txid mismatch");
  }
  if (candidate.sealBinding.sealOutpointVout !== sealOpenEvidence.sealOutpoint.vout) {
    throw new Error("SealBoundPrivateNoteCandidateBindingEvidenceV0 seal outpoint vout mismatch");
  }
  assertBytes32Equal(
    "SealBoundPrivateNoteCandidateBindingEvidenceV0 seal commitment",
    candidate.sealBinding.sealCommitment32,
    sealOpenEvidence.sealCommitment32,
  );
  assertBytes32Equal(
    "SealBoundPrivateNoteCandidateBindingEvidenceV0 import funding commitment",
    candidate.importEvidence.importFundingCellCommitment32,
    sealOpenEvidence.importFundingCellCommitment32,
  );
  assertBytes32Equal(
    "SealBoundPrivateNoteCandidateBindingEvidenceV0 eligibility statement bind",
    candidate.importEvidence.eligibilityStatementBind32,
    sealOpenEvidence.eligibilityStatementBind32,
  );
  assertBytes32Equal(
    "SealBoundPrivateNoteCandidateBindingEvidenceV0 output fingerprint",
    candidate.outputBinding.outputFingerprint32,
    sealOpenEvidence.outputFingerprint32,
  );

  const candidateBinding32 = await sealBoundPrivateNoteCandidateBindingV0({
    version: SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_VERSION,
    domain: SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_BINDING_PREIMAGE_V0_DOMAIN,
    network: candidate.network,
    sealOutpointTxid: candidate.sealBinding.sealOutpointTxid,
    sealOutpointVout: candidate.sealBinding.sealOutpointVout,
    sealCommitment32: candidate.sealBinding.sealCommitment32,
    importFundingCellCommitment32: candidate.importEvidence.importFundingCellCommitment32,
    eligibilityStatementBind32: candidate.importEvidence.eligibilityStatementBind32,
    claimCommitment32: candidate.importEvidence.claimCommitment32,
    noteCommitment32: candidate.noteCommitment.noteCommitment32,
    recoveryPacketHash32: candidate.recoveryPacket.packetHash32,
    ciphertextHash32: candidate.recoveryPacket.ciphertextHash32,
    outputFingerprint32: candidate.outputBinding.outputFingerprint32,
    valueCommitment: candidate.valueCommitment,
  });

  return Object.freeze({
    version: SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_VERSION,
    domain: SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_BINDING_EVIDENCE_V0_DOMAIN,
    evidenceKind: SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_BINDING_EVIDENCE_V0_KIND,
    candidateBinding32,
    sealCommitment32: candidate.sealBinding.sealCommitment32,
    importFundingCellCommitment32: candidate.importEvidence.importFundingCellCommitment32,
    eligibilityStatementBind32: candidate.importEvidence.eligibilityStatementBind32,
    noteCommitment32: candidate.noteCommitment.noteCommitment32,
    recoveryPacketHash32: candidate.recoveryPacket.packetHash32,
    outputFingerprint32: candidate.outputBinding.outputFingerprint32,
    aggregatorConsumeObserved: false,
    sealCloseObserved: false,
    transitionValidationAccepted: false,
    proofVerificationAccepted: false,
    apntAcceptance: false,
    acceptedPrivateNote: false,
    privateNoteSpendability: false,
  });
}

function normalizeImportEvidence(
  value: unknown,
): SealBoundPrivateNoteCandidateV0["importEvidence"] {
  assertRecord("SealBoundPrivateNoteCandidateV0.importEvidence", value);
  assertKnownKeys("SealBoundPrivateNoteCandidateV0.importEvidence", value, [
    "importTxid",
    "importVout",
    "importFundingCellCommitment32",
    "eligibilityStatementBind32",
    "claimCommitment32",
  ]);
  return Object.freeze({
    importTxid: assertTxid("SealBoundPrivateNoteCandidateV0.importEvidence.importTxid", value.importTxid),
    importVout: assertNonNegativeSafeInteger(
      "SealBoundPrivateNoteCandidateV0.importEvidence.importVout",
      value.importVout,
    ),
    importFundingCellCommitment32: assertBytes32(
      "SealBoundPrivateNoteCandidateV0.importEvidence.importFundingCellCommitment32",
      value.importFundingCellCommitment32,
    ),
    eligibilityStatementBind32: assertBytes32(
      "SealBoundPrivateNoteCandidateV0.importEvidence.eligibilityStatementBind32",
      value.eligibilityStatementBind32,
    ),
    claimCommitment32: assertBytes32(
      "SealBoundPrivateNoteCandidateV0.importEvidence.claimCommitment32",
      value.claimCommitment32,
    ),
  });
}

function normalizeSealBinding(
  value: unknown,
): SealBoundPrivateNoteCandidateV0["sealBinding"] {
  assertRecord("SealBoundPrivateNoteCandidateV0.sealBinding", value);
  assertKnownKeys("SealBoundPrivateNoteCandidateV0.sealBinding", value, [
    "sealOutpointTxid",
    "sealOutpointVout",
    "sealCommitment32",
    "sealBindingCommitment32",
  ]);
  return Object.freeze({
    sealOutpointTxid: assertTxid(
      "SealBoundPrivateNoteCandidateV0.sealBinding.sealOutpointTxid",
      value.sealOutpointTxid,
    ),
    sealOutpointVout: assertNonNegativeSafeInteger(
      "SealBoundPrivateNoteCandidateV0.sealBinding.sealOutpointVout",
      value.sealOutpointVout,
    ),
    sealCommitment32: assertBytes32(
      "SealBoundPrivateNoteCandidateV0.sealBinding.sealCommitment32",
      value.sealCommitment32,
    ),
    sealBindingCommitment32: assertBytes32(
      "SealBoundPrivateNoteCandidateV0.sealBinding.sealBindingCommitment32",
      value.sealBindingCommitment32,
    ),
  });
}

function normalizeNoteCommitment(
  value: unknown,
): SealBoundPrivateNoteCandidateV0["noteCommitment"] {
  assertRecord("SealBoundPrivateNoteCandidateV0.noteCommitment", value);
  assertKnownKeys("SealBoundPrivateNoteCandidateV0.noteCommitment", value, [
    "noteCommitment32",
    "noteCommitmentScheme",
  ]);
  return Object.freeze({
    noteCommitment32: assertBytes32(
      "SealBoundPrivateNoteCandidateV0.noteCommitment.noteCommitment32",
      value.noteCommitment32,
    ),
    noteCommitmentScheme: assertLiteral(
      "SealBoundPrivateNoteCandidateV0.noteCommitment.noteCommitmentScheme",
      value.noteCommitmentScheme,
      "apnt-note-commitment-hash-v0",
    ),
  });
}

function normalizeRecoveryPacket(
  value: unknown,
): SealBoundPrivateNoteCandidateV0["recoveryPacket"] {
  assertRecord("SealBoundPrivateNoteCandidateV0.recoveryPacket", value);
  assertKnownKeys("SealBoundPrivateNoteCandidateV0.recoveryPacket", value, [
    "packetHash32",
    "encryptionProfile",
    "ciphertextLocation",
    "ciphertextHash32",
  ]);
  if (
    typeof value.ciphertextLocation !== "string" ||
    !CIPHERTEXT_LOCATIONS.has(value.ciphertextLocation as SealBoundPrivateNoteCandidateV0["recoveryPacket"]["ciphertextLocation"])
  ) {
    throw new Error("SealBoundPrivateNoteCandidateV0.recoveryPacket.ciphertextLocation is unsupported");
  }
  return Object.freeze({
    packetHash32: assertBytes32(
      "SealBoundPrivateNoteCandidateV0.recoveryPacket.packetHash32",
      value.packetHash32,
    ),
    encryptionProfile: assertLiteral(
      "SealBoundPrivateNoteCandidateV0.recoveryPacket.encryptionProfile",
      value.encryptionProfile,
      "ml-kem-768-hkdf-aead-v0",
    ),
    ciphertextLocation: value.ciphertextLocation as SealBoundPrivateNoteCandidateV0["recoveryPacket"]["ciphertextLocation"],
    ciphertextHash32: assertBytes32(
      "SealBoundPrivateNoteCandidateV0.recoveryPacket.ciphertextHash32",
      value.ciphertextHash32,
    ),
  });
}

function normalizeOutputBinding(
  value: unknown,
): SealBoundPrivateNoteCandidateV0["outputBinding"] {
  assertRecord("SealBoundPrivateNoteCandidateV0.outputBinding", value);
  assertKnownKeys("SealBoundPrivateNoteCandidateV0.outputBinding", value, [
    "outputFingerprint32",
    "outputBindingProfile",
  ]);
  return Object.freeze({
    outputFingerprint32: assertBytes32(
      "SealBoundPrivateNoteCandidateV0.outputBinding.outputFingerprint32",
      value.outputFingerprint32,
    ),
    outputBindingProfile: assertLiteral(
      "SealBoundPrivateNoteCandidateV0.outputBinding.outputBindingProfile",
      value.outputBindingProfile,
      "beaconless-output-binding-v0",
    ),
  });
}

function normalizeAggregatorEvidence(
  value: unknown,
): SealBoundPrivateNoteCandidateV0["aggregatorEvidence"] {
  if (value === undefined) return undefined;
  assertRecord("SealBoundPrivateNoteCandidateV0.aggregatorEvidence", value);
  assertKnownKeys("SealBoundPrivateNoteCandidateV0.aggregatorEvidence", value, [
    "handoffPayloadCommitment32",
    "batchCommitment32",
    "aggregationProfile",
  ]);
  return Object.freeze({
    handoffPayloadCommitment32: assertBytes32(
      "SealBoundPrivateNoteCandidateV0.aggregatorEvidence.handoffPayloadCommitment32",
      value.handoffPayloadCommitment32,
    ),
    ...(value.batchCommitment32 === undefined
      ? {}
      : {
          batchCommitment32: assertBytes32(
            "SealBoundPrivateNoteCandidateV0.aggregatorEvidence.batchCommitment32",
            value.batchCommitment32,
          ),
        }),
    aggregationProfile: assertLiteral(
      "SealBoundPrivateNoteCandidateV0.aggregatorEvidence.aggregationProfile",
      value.aggregationProfile,
      "local-json-aggregator-handoff-v0",
    ),
  });
}

function normalizeWalletVerification(
  value: unknown,
): SealBoundPrivateNoteCandidateV0["walletVerification"] {
  assertRecord("SealBoundPrivateNoteCandidateV0.walletVerification", value);
  assertKnownKeys("SealBoundPrivateNoteCandidateV0.walletVerification", value, [
    "verifiedAtUnixMs",
    "noteCommitmentMatchesRecoveredPlaintext",
    "packetHashMatchesCiphertext",
    "sealBindingMatchesImportEvidence",
    "outputBindingMatchesChainEvidence",
    "noStaticRecipientMarkerRequired",
  ]);
  return Object.freeze({
    verifiedAtUnixMs: assertNonNegativeSafeInteger(
      "SealBoundPrivateNoteCandidateV0.walletVerification.verifiedAtUnixMs",
      value.verifiedAtUnixMs,
    ),
    noteCommitmentMatchesRecoveredPlaintext: assertBoolean(
      "SealBoundPrivateNoteCandidateV0.walletVerification.noteCommitmentMatchesRecoveredPlaintext",
      value.noteCommitmentMatchesRecoveredPlaintext,
    ),
    packetHashMatchesCiphertext: assertBoolean(
      "SealBoundPrivateNoteCandidateV0.walletVerification.packetHashMatchesCiphertext",
      value.packetHashMatchesCiphertext,
    ),
    sealBindingMatchesImportEvidence: assertBoolean(
      "SealBoundPrivateNoteCandidateV0.walletVerification.sealBindingMatchesImportEvidence",
      value.sealBindingMatchesImportEvidence,
    ),
    outputBindingMatchesChainEvidence: assertBoolean(
      "SealBoundPrivateNoteCandidateV0.walletVerification.outputBindingMatchesChainEvidence",
      value.outputBindingMatchesChainEvidence,
    ),
    noStaticRecipientMarkerRequired: assertBoolean(
      "SealBoundPrivateNoteCandidateV0.walletVerification.noStaticRecipientMarkerRequired",
      value.noStaticRecipientMarkerRequired,
    ),
  });
}

export function normalizeSealBoundPrivateNoteCandidateV0(
  candidate: unknown,
): SealBoundPrivateNoteCandidateV0 {
  assertRecord("SealBoundPrivateNoteCandidateV0", candidate);
  assertKnownKeys("SealBoundPrivateNoteCandidateV0", candidate, [
    "version",
    "domain",
    "candidateKind",
    "network",
    "importEvidence",
    "sealBinding",
    "noteCommitment",
    "valueCommitment",
    "recoveryPacket",
    "outputBinding",
    "aggregatorEvidence",
    "walletVerification",
  ]);
  const aggregatorEvidence = normalizeAggregatorEvidence(candidate.aggregatorEvidence);
  const normalized = {
    version: assertLiteral(
      "SealBoundPrivateNoteCandidateV0.version",
      candidate.version,
      SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_VERSION,
    ),
    domain: assertLiteral(
      "SealBoundPrivateNoteCandidateV0.domain",
      candidate.domain,
      SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_DOMAIN,
    ),
    candidateKind: assertLiteral(
      "SealBoundPrivateNoteCandidateV0.candidateKind",
      candidate.candidateKind,
      SEAL_BOUND_PRIVATE_NOTE_CANDIDATE_V0_KIND,
    ),
    network: assertNetwork("SealBoundPrivateNoteCandidateV0.network", candidate.network),
    importEvidence: normalizeImportEvidence(candidate.importEvidence),
    sealBinding: normalizeSealBinding(candidate.sealBinding),
    noteCommitment: normalizeNoteCommitment(candidate.noteCommitment),
    valueCommitment: normalizeApntValueCommitmentV0(candidate.valueCommitment),
    recoveryPacket: normalizeRecoveryPacket(candidate.recoveryPacket),
    outputBinding: normalizeOutputBinding(candidate.outputBinding),
    walletVerification: normalizeWalletVerification(candidate.walletVerification),
  };
  return Object.freeze(aggregatorEvidence === undefined
    ? normalized
    : { ...normalized, aggregatorEvidence });
}

export function assertSealBoundPrivateNoteCandidateV0(
  candidate: unknown,
): asserts candidate is SealBoundPrivateNoteCandidateV0 {
  normalizeSealBoundPrivateNoteCandidateV0(candidate);
}
