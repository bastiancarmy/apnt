import { createHash } from "node:crypto";
import net from "node:net";
import tls from "node:tls";

export {
  normalizeChainIoNetworkIdentityV0,
  parseChainIoNetworkObservationV0,
  type ChainIoNetworkIdentityV0,
  type ChainIoNetworkObservationV0,
  type ChainIoNormalizedNetworkV0,
} from "./network_identity.js";

export const CHAIN_IO_EVIDENCE_SCHEMA_V0_VERSION = 0;

export type ChainNetworkV0 = "chipnet" | "mainnet" | "regtest";

export type ChainIoTransportV0 = "tcp" | "tls";

export type ChainIoEndpointV0 = Readonly<{
  network: ChainNetworkV0;
  host: string;
  port: number;
  transport: ChainIoTransportV0;
  label?: string;
}>;

export type ChainIoTrustBoundaryV0 = Readonly<{
  source: "fulcrum";
  evidenceKind: "indexer" | "relay-submission";
  consensusAuthority: false;
  apntProtocolTruth: false;
}>;

export type ChainIoTransparentUtxoStatusV0 = "confirmed" | "unconfirmed";

export type ChainIoTransparentUtxoSummaryV0 = Readonly<{
  txid: string;
  vout: number;
  valueSats: string;
  height?: number;
  status?: string;
  address?: string;
  lockingBytecode?: string;
}>;

export type ChainIoTransparentUtxoEvidenceV0 = Readonly<{
  version: typeof CHAIN_IO_EVIDENCE_SCHEMA_V0_VERSION;
  network: ChainNetworkV0;
  txid: string;
  vout: number;
  valueSats: string;
  lockingBytecode: string;
  address?: string;
  height?: number;
  status: ChainIoTransparentUtxoStatusV0;
  unspent: boolean;
  trustBoundary: ChainIoTrustBoundaryV0;
  evidencePath: string;
}>;

export type ChainIoTransactionEvidenceV0 = Readonly<{
  version: typeof CHAIN_IO_EVIDENCE_SCHEMA_V0_VERSION;
  network: ChainNetworkV0;
  txid: string;
  found: boolean;
  rawTransaction?: string;
  blockHeight?: number;
  confirmations?: number;
  trustBoundary: ChainIoTrustBoundaryV0;
  evidencePath: string;
}>;

export type ChainIoTransactionOutputEvidenceV0 = Readonly<{
  version: typeof CHAIN_IO_EVIDENCE_SCHEMA_V0_VERSION;
  network: ChainNetworkV0;
  txid: string;
  vout: number;
  found: boolean;
  valueSats?: string;
  lockingBytecode?: string;
  lockingBytecodeHash32?: string;
  address?: string;
  blockhash?: string;
  confirmations?: number;
  blocktime?: number;
  bestblock?: string;
  mempoolSeen?: boolean;
  trustBoundary: ChainIoTrustBoundaryV0;
  evidencePath: string;
}>;

export type ChainIoApntSealOpenEvidenceStatusV0 =
  | "unavailable"
  | "ambiguous"
  | "not-found"
  | "verified-output-exists";

export type ChainIoApntSealOpenEvidenceV0 = Readonly<{
  status: ChainIoApntSealOpenEvidenceStatusV0;
  network: ChainNetworkV0;
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

export type ChainIoConfiguredNetworkOutputEvidenceStatusV0 = ChainIoApntSealOpenEvidenceStatusV0;

export type ChainIoConfiguredNetworkOutputEvidenceV0 = Readonly<{
  status: ChainIoConfiguredNetworkOutputEvidenceStatusV0;
  network: ChainNetworkV0;
  txid: string;
  vout: number;
  expectedValueSats: string;
  expectedLockingBytecodeHash32: string;
  observedValueSats?: string;
  observedLockingBytecodeHash32?: string;
  reason?: string;
  chainInclusion: false;
  outputChainExistence: boolean;
  apntAcceptance: false;
  laneStateAdvanced: false;
  privateNoteSpendability: false;
  productionPrivacy: false;
  aggregatorAuthority: false;
  nostrWizardConnectProtocolTruth: false;
  trustBoundary: ChainIoTrustBoundaryV0;
  evidencePath: string;
}>;

export type ChainIoApntConsumedOutpointStatusV0 =
  | "spent-outpoint"
  | "unspent"
  | "not-found"
  | "unavailable"
  | "ambiguous";

export type ChainIoOutpointSpendEvidenceV0 = Readonly<{
  status: ChainIoApntConsumedOutpointStatusV0;
  network: ChainNetworkV0;
  txid: string;
  vout: number;
  consumptionTxid?: string;
  inputIndex?: number;
  reason?: string;
  trustBoundary: ChainIoTrustBoundaryV0;
  evidencePath: string;
}>;

export type ChainIoApntConsumedOutpointEvidenceV0 = Readonly<{
  status: ChainIoApntConsumedOutpointStatusV0;
  network: ChainNetworkV0;
  consumptionTxid?: string;
  inputIndex?: number;
  consumedOutpoint: Readonly<{ txid: string; vout: number }>;
}>;

export type ChainIoRawTransactionSubmissionPolicyV0 = Readonly<{
  network: ChainNetworkV0;
  allowChipnetSmokeSubmit?: boolean;
}>;

export type ChainIoRawTransactionSubmissionEvidenceV0 = Readonly<{
  version: typeof CHAIN_IO_EVIDENCE_SCHEMA_V0_VERSION;
  network: ChainNetworkV0;
  status: "submitted" | "refused";
  txid?: string;
  refusalReason?: "unsupported-network" | "chipnet-smoke-flag-required";
  trustBoundary: ChainIoTrustBoundaryV0;
  evidencePath: string;
}>;

export type ChainIoProviderV0 = Readonly<{
  lookupTransparentUtxoEvidence: (
    outpoint: Readonly<{ network: ChainNetworkV0; txid: string; vout: number }>,
  ) => Promise<ChainIoTransparentUtxoEvidenceV0 | undefined>;
  lookupTransparentUtxosByLockingBytecodeEvidence: (
    target: Readonly<{ network: ChainNetworkV0; lockingBytecode: string; address?: string }>,
  ) => Promise<readonly ChainIoTransparentUtxoEvidenceV0[]>;
  lookupTransactionEvidence: (
    request: Readonly<{ network: ChainNetworkV0; txid: string }>,
  ) => Promise<ChainIoTransactionEvidenceV0>;
  lookupTransactionOutputEvidence: (
    request: Readonly<{ network: ChainNetworkV0; txid: string; vout: number }>,
  ) => Promise<ChainIoTransactionOutputEvidenceV0>;
  lookupOutpointSpendEvidence?: (
    request: Readonly<{ network: ChainNetworkV0; txid: string; vout: number }>,
  ) => Promise<ChainIoOutpointSpendEvidenceV0>;
  submitRawTransaction: (
    request: Readonly<{ policy: ChainIoRawTransactionSubmissionPolicyV0; rawTransaction: string }>,
  ) => Promise<ChainIoRawTransactionSubmissionEvidenceV0>;
}>;

export const CHAIN_IO_TRANSPARENT_FUNDING_EVIDENCE_MAX_AGE_MS_V0 = 60_000;

export type ChainIoTransparentFundingCandidateV0 = Readonly<{
  network: "chipnet";
  txid: string;
  vout: number;
  valueSats: string;
  lockingBytecode: string;
  tokenState: "none" | "present";
}>;

export type ChainIoTransparentFundingEvidenceFailureCodeV0 =
  | "F-APNT-TRANSPARENT-UTXO-PROVIDER-UNAUTHENTICATED"
  | "F-APNT-TRANSPARENT-UTXO-PROVIDER-UNAVAILABLE"
  | "F-APNT-TRANSPARENT-UTXO-PROVIDER-AMBIGUOUS"
  | "F-APNT-TRANSPARENT-UTXO-EVIDENCE-STALE"
  | "F-APNT-TRANSPARENT-UTXO-TRANSACTION-MISSING"
  | "F-APNT-TRANSPARENT-UTXO-OUTPUT-MISSING"
  | "F-APNT-TRANSPARENT-UTXO-OUTPOINT-MISMATCH"
  | "F-APNT-TRANSPARENT-UTXO-LOCKING-PROGRAM-MISMATCH"
  | "F-APNT-TRANSPARENT-UTXO-VALUE-MISMATCH"
  | "F-APNT-TRANSPARENT-UTXO-TOKEN-NOT-PERMITTED"
  | "F-APNT-TRANSPARENT-UTXO-SPENT"
  | "F-APNT-TRANSPARENT-UTXO-NETWORK-MISMATCH"
  | "F-APNT-TRANSPARENT-UTXO-MALFORMED-EVIDENCE";

export type ChainIoTransparentFundingVerificationProgressV0 = Readonly<{
  candidateReported: true;
  transactionLocated: boolean;
  outputLocated: boolean;
  metadataMatched: boolean;
  unspent: boolean;
}>;

export class ChainIoTransparentFundingEvidenceErrorV0 extends Error {
  readonly code: ChainIoTransparentFundingEvidenceFailureCodeV0;
  readonly progress: ChainIoTransparentFundingVerificationProgressV0;

  constructor(
    code: ChainIoTransparentFundingEvidenceFailureCodeV0,
    message: string,
    progress: Omit<ChainIoTransparentFundingVerificationProgressV0, "candidateReported">,
  ) {
    super(message);
    this.name = "ChainIoTransparentFundingEvidenceErrorV0";
    this.code = code;
    this.progress = Object.freeze({ candidateReported: true, ...progress });
  }
}

export type ChainIoAuthenticatedTransparentFundingEvidenceV0 = Readonly<{
  version: 0;
  kind: "chain-io-authenticated-transparent-funding-evidence-v0";
  network: "chipnet";
  txid: string;
  vout: number;
  valueSats: string;
  lockingBytecode: string;
  tokenState: "none";
  transactionFound: true;
  outputFound: true;
  metadataMatched: true;
  unspent: true;
  eligibleForImportVerification: true;
  locationStatus: "mempool-or-unconfirmed" | "confirmed";
  confirmations?: number;
  evidenceSource: "fulcrum";
  providerAuthentication: "configured-provider-transport";
  observedAtMs: number;
  evaluatedAtMs: number;
  evidenceAgeMs: number;
  freshnessPolicyMaxAgeMs: typeof CHAIN_IO_TRANSPARENT_FUNDING_EVIDENCE_MAX_AGE_MS_V0;
  freshness: "fresh";
  trustBoundary: ChainIoTrustBoundaryV0;
  evidencePaths: readonly string[];
}>;

export type LookupChainIoAuthenticatedTransparentFundingEvidenceV0Args = Readonly<{
  provider: Pick<
    ChainIoProviderV0,
    | "lookupTransparentUtxoEvidence"
    | "lookupTransactionEvidence"
    | "lookupTransactionOutputEvidence"
    | "lookupOutpointSpendEvidence"
  >;
  candidate: ChainIoTransparentFundingCandidateV0;
  observedAtMs?: number;
  evaluatedAtMs?: number;
}>;

export type ChainIoFulcrumRequestV0 = (
  endpoint: ChainIoEndpointV0,
  method: string,
  params: readonly unknown[],
  timeoutMs: number,
) => Promise<unknown>;

export type CreateFulcrumChainIoProviderV0Args = Readonly<{
  network: ChainNetworkV0;
  endpoints?: readonly ChainIoEndpointV0[];
  requestTimeoutMs?: number;
  request?: ChainIoFulcrumRequestV0;
}>;

const DEFAULT_REQUEST_TIMEOUT_MS_V0 = 8_000;
/** Idle grace before a pooled Fulcrum socket is dropped rather than left to go stale. */
const FULCRUM_IDLE_CONNECTION_MS_V0 = 30_000;
const FULCRUM_REQUEST_ID_PREFIX_V0 = "bch-cloak-chain-io-fulcrum-v0";
const HASH_PERSONALIZATION_V0 = "BCH Cloak APNT v0 domain-separated SHA-256";
const APNT_IMPORT_FUNDING_HANDOFF_LOCKING_BYTECODE_HASH_V0_DOMAIN =
  "bch-cloak-apnt-v0:import-funding-handoff-locking-bytecode-hash";
const APNT_IMPORT_FUNDING_CELL_TEMPLATE_ID_V0 = "apnt_import_funding_cell_v0";
const APNT_IMPORT_FUNDING_CELL_TEMPLATE_OUTPUT_FINGERPRINT_V0_DOMAIN =
  "apnt_import_funding_cell_output_fingerprint_v0";
const HEX_RE_V0 = /^[0-9a-f]+$/u;
const TXID_RE_V0 = /^[0-9a-f]{64}$/u;
const authenticatedTransparentFundingEvidenceV0 = new WeakSet<object>();
const UNSAFE_TRANSPARENT_UTXO_FIELDS_V0 = new Set([
  "xpub",
  "tpub",
  "xpriv",
  "tpriv",
  "privateKey",
  "seed",
  "pairingSecret",
  "sessionPubkey",
  "rawWallet",
  "rawEvent",
  "uri",
]);

const DEFAULT_FULCRUM_ENDPOINTS_BY_NETWORK_V0: Readonly<Record<ChainNetworkV0, readonly ChainIoEndpointV0[]>> = Object.freeze({
  chipnet: Object.freeze([
    Object.freeze({
      network: "chipnet",
      host: "chipnet.imaginary.cash",
      port: 50002,
      transport: "tls",
      label: "chipnet.imaginary.cash",
    }),
  ]),
  mainnet: Object.freeze([]),
  regtest: Object.freeze([]),
});

const INDEXER_TRUST_BOUNDARY_V0: ChainIoTrustBoundaryV0 = Object.freeze({
  source: "fulcrum",
  evidenceKind: "indexer",
  consensusAuthority: false,
  apntProtocolTruth: false,
});

const RELAY_SUBMISSION_TRUST_BOUNDARY_V0: ChainIoTrustBoundaryV0 = Object.freeze({
  source: "fulcrum",
  evidenceKind: "relay-submission",
  consensusAuthority: false,
  apntProtocolTruth: false,
});

type ElectrumJsonResponseEnvelopeV0 = Readonly<{
  id?: unknown;
  result?: unknown;
  error?: unknown;
}>;

type ElectrumListUnspentEntryV0 = Readonly<{
  tx_hash: string;
  tx_pos: number;
  height?: number;
  value: string;
}>;

type ElectrumHistoryEntryV0 = Readonly<{
  tx_hash: string;
  height?: number;
}>;

function assertNetworkV0(name: string, network: unknown): ChainNetworkV0 {
  if (network !== "chipnet" && network !== "mainnet" && network !== "regtest") {
    throw new Error(`${name} must be chipnet, mainnet, or regtest`);
  }
  return network;
}

function assertNonEmptyStringV0(name: string, value: unknown): string {
  const normalized = String(value ?? "").trim();
  if (normalized.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return normalized;
}

function assertCanonicalHexV0(name: string, value: unknown): string {
  const normalized = assertNonEmptyStringV0(name, value).toLowerCase();
  if ((normalized.length & 1) !== 0 || !HEX_RE_V0.test(normalized)) {
    throw new Error(`${name} must be canonical lowercase even-length hex`);
  }
  return normalized;
}

export function normalizeChainIoTxidV0(name: string, value: unknown): string {
  const normalized = assertNonEmptyStringV0(name, value).toLowerCase();
  if (!TXID_RE_V0.test(normalized)) {
    throw new Error(`${name} must be canonical 32-byte lowercase hex`);
  }
  return normalized;
}

export function normalizeChainIoRawTransactionHexV0(name: string, value: unknown): string {
  return assertCanonicalHexV0(name, value);
}

export type ChainIoParsedTransactionInputV0 = Readonly<{
  txid: string;
  vout: number;
  unlockingBytecode: string;
  sequence: number;
}>;

export type ChainIoParsedTransactionOutputV0 = Readonly<{
  valueSats: string;
  lockingBytecode: string;
  tokenState: "none" | "present";
}>;

export type ChainIoParsedTransactionV0 = Readonly<{
  version: number;
  inputs: readonly ChainIoParsedTransactionInputV0[];
  outputs: readonly ChainIoParsedTransactionOutputV0[];
  locktime: number;
}>;

function reverseHexBytesV0(hex: string): string {
  return (hex.match(/../gu) ?? []).reverse().join("");
}

/** Parses the canonical non-SegWit BCH transaction fields used by Batch C. */
export function parseChainIoCanonicalTransactionV0(rawTransaction: string): ChainIoParsedTransactionV0 {
  const hex = normalizeChainIoRawTransactionHexV0("ChainIoCanonicalTransactionV0.rawTransaction", rawTransaction);
  let offset = 0;
  const readHex = (label: string, bytes: number): string => {
    const length = bytes * 2;
    if (offset + length > hex.length) {
      throw new Error(`ChainIoCanonicalTransactionV0 ended while reading ${label}`);
    }
    const value = hex.slice(offset, offset + length);
    offset += length;
    return value;
  };
  const readLe = (label: string, bytes: number): bigint => {
    const value = reverseHexBytesV0(readHex(label, bytes));
    return BigInt(`0x${value.length === 0 ? "0" : value}`);
  };
  const safeNumber = (label: string, value: bigint): number => {
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(`ChainIoCanonicalTransactionV0 ${label} exceeds safe integer range`);
    }
    return Number(value);
  };
  const compactSize = (label: string): bigint => {
    const prefix = safeNumber(`${label}.prefix`, readLe(`${label}.prefix`, 1));
    if (prefix < 0xfd) return BigInt(prefix);
    const value = prefix === 0xfd
      ? readLe(label, 2)
      : prefix === 0xfe
        ? readLe(label, 4)
        : readLe(label, 8);
    if (
      (prefix === 0xfd && value < 0xfdn) ||
      (prefix === 0xfe && value <= 0xffffn) ||
      (prefix === 0xff && value <= 0xffffffffn)
    ) {
      throw new Error(`ChainIoCanonicalTransactionV0 ${label} uses a non-canonical CompactSize encoding`);
    }
    return value;
  };
  const compactCount = (label: string): number => safeNumber(label, compactSize(label));

  const version = safeNumber("version", readLe("version", 4));
  const inputCount = compactCount("inputCount");
  if (inputCount === 0) throw new Error("ChainIoCanonicalTransactionV0 requires at least one input");
  const inputs: ChainIoParsedTransactionInputV0[] = [];
  for (let index = 0; index < inputCount; index += 1) {
    const txid = reverseHexBytesV0(readHex(`input[${String(index)}].txid`, 32));
    const vout = safeNumber(`input[${String(index)}].vout`, readLe(`input[${String(index)}].vout`, 4));
    const unlockingBytecodeLength = compactCount(`input[${String(index)}].unlockingBytecodeLength`);
    const unlockingBytecode = readHex(`input[${String(index)}].unlockingBytecode`, unlockingBytecodeLength);
    const sequence = safeNumber(`input[${String(index)}].sequence`, readLe(`input[${String(index)}].sequence`, 4));
    inputs.push(Object.freeze({ txid, vout, unlockingBytecode, sequence }));
  }
  const outputCount = compactCount("outputCount");
  if (outputCount === 0) throw new Error("ChainIoCanonicalTransactionV0 requires at least one output");
  const outputs: ChainIoParsedTransactionOutputV0[] = [];
  for (let index = 0; index < outputCount; index += 1) {
    const valueSats = readLe(`output[${String(index)}].valueSats`, 8).toString(10);
    const lockingBytecodeLength = compactCount(`output[${String(index)}].lockingBytecodeLength`);
    const lockingBytecode = readHex(`output[${String(index)}].lockingBytecode`, lockingBytecodeLength);
    outputs.push(Object.freeze({
      valueSats,
      lockingBytecode,
      tokenState: lockingBytecode.startsWith("ef") ? "present" : "none",
    }));
  }
  const locktime = safeNumber("locktime", readLe("locktime", 4));
  if (offset !== hex.length) throw new Error("ChainIoCanonicalTransactionV0 has trailing bytes");
  return Object.freeze({ version, inputs: Object.freeze(inputs), outputs: Object.freeze(outputs), locktime });
}

/** Derives the standard display-order BCH transaction ID from the exact bytes. */
export function chainIoTransactionIdFromRawTransactionV0(rawTransaction: string): string {
  const normalized = normalizeChainIoRawTransactionHexV0("ChainIoTransactionIdV0.rawTransaction", rawTransaction);
  const first = createHash("sha256").update(Buffer.from(normalized, "hex")).digest();
  return Buffer.from(createHash("sha256").update(first).digest()).reverse().toString("hex");
}

function assertNonNegativeSafeIntegerV0(name: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative safe integer`);
  }
  return value;
}

function assertOptionalNonNegativeSafeIntegerV0(name: string, value: unknown): number | undefined {
  if (value === undefined) return undefined;
  return assertNonNegativeSafeIntegerV0(name, value);
}

function assertPositiveIntegerStringV0(name: string, value: unknown): string {
  const normalized =
    typeof value === "number" && Number.isSafeInteger(value)
      ? String(value)
      : typeof value === "string"
        ? value.trim()
        : "";
  if (!/^[1-9][0-9]*$/u.test(normalized)) {
    throw new Error(`${name} must be a positive integer string`);
  }
  return normalized;
}

function assertNonNegativeIntegerStringV0(name: string, value: unknown): string {
  const normalized = assertNonEmptyStringV0(name, value);
  if (!/^(0|[1-9][0-9]*)$/u.test(normalized)) {
    throw new Error(`${name} must be a non-negative integer string`);
  }
  return normalized;
}

function assertEndpointPortV0(port: unknown): number {
  if (!Number.isSafeInteger(port) || Number(port) <= 0 || Number(port) > 65535) {
    throw new Error("ChainIoEndpointV0.port must be between 1 and 65535");
  }
  return Number(port);
}

function assertOptionalNonEmptyStringV0(name: string, value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return assertNonEmptyStringV0(name, value);
}

function requestTimeoutMsV0(value: number | undefined): number {
  if (value === undefined) return DEFAULT_REQUEST_TIMEOUT_MS_V0;
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("CreateFulcrumChainIoProviderV0Args.requestTimeoutMs must be a positive safe integer");
  }
  return value;
}

function rejectUnsafeRawFieldsV0(name: string, value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectUnsafeRawFieldsV0(`${name}[${String(index)}]`, entry));
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (UNSAFE_TRANSPARENT_UTXO_FIELDS_V0.has(key)) {
      throw new Error(`${name}.${key} is unsafe and must not be included`);
    }
    rejectUnsafeRawFieldsV0(`${name}.${key}`, child);
  }
}

function statusFromHeightV0(height: number | undefined): ChainIoTransparentUtxoStatusV0 {
  return height === undefined || height <= 0 ? "unconfirmed" : "confirmed";
}

function parseBchDecimalValueToSatsV0(value: unknown): string {
  const normalized =
    typeof value === "number"
      ? value.toFixed(8)
      : typeof value === "string"
        ? value.trim()
        : "";
  if (!/^[0-9]+(\.[0-9]{1,8})?$/u.test(normalized)) {
    throw new Error("ChainIoTransactionEvidenceV0 transaction output value must be BCH decimal with <=8 fractional digits");
  }
  const [wholeRaw = "0", fractionalRaw = ""] = normalized.split(".");
  const whole = wholeRaw.replace(/^0+/u, "") || "0";
  const fractional = fractionalRaw.padEnd(8, "0");
  const sats = BigInt(whole) * 100_000_000n + BigInt(fractional);
  if (sats <= 0n) {
    throw new Error("ChainIoTransactionEvidenceV0 transaction output value must be positive");
  }
  return sats.toString(10);
}

function parseErrorMessageV0(error: unknown): string {
  if (!error || typeof error !== "object") return String(error);
  const message = (error as Readonly<{ message?: unknown }>).message;
  return typeof message === "string" ? message : String(error);
}

function isTransactionNotFoundErrorV0(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  return normalized.includes("no such mempool or blockchain transaction") || normalized.includes("transaction not found");
}

export function normalizeChainIoEndpointV0(endpoint: ChainIoEndpointV0): ChainIoEndpointV0 {
  const network = assertNetworkV0("ChainIoEndpointV0.network", endpoint.network);
  const host = assertNonEmptyStringV0("ChainIoEndpointV0.host", endpoint.host);
  const port = assertEndpointPortV0(endpoint.port);
  if (endpoint.transport !== "tcp" && endpoint.transport !== "tls") {
    throw new Error("ChainIoEndpointV0.transport must be tcp or tls");
  }
  const label = assertOptionalNonEmptyStringV0("ChainIoEndpointV0.label", endpoint.label);
  return Object.freeze({
    network,
    host,
    port,
    transport: endpoint.transport,
    ...(label === undefined ? {} : { label }),
  });
}

export function defaultFulcrumChainIoEndpointsV0(network: ChainNetworkV0): readonly ChainIoEndpointV0[] {
  return DEFAULT_FULCRUM_ENDPOINTS_BY_NETWORK_V0[assertNetworkV0("network", network)];
}

export function chainIoIndexerTrustBoundaryV0(): ChainIoTrustBoundaryV0 {
  return INDEXER_TRUST_BOUNDARY_V0;
}

export function chainIoRelaySubmissionTrustBoundaryV0(): ChainIoTrustBoundaryV0 {
  return RELAY_SUBMISSION_TRUST_BOUNDARY_V0;
}

export function chainIoEvidenceJsonPathV0(args: Readonly<{
  network: ChainNetworkV0;
  evidenceKind: "transparent-utxo" | "transaction" | "outpoint-spend" | "raw-transaction-submission";
  id: string;
}>): string {
  const network = assertNetworkV0("ChainIoEvidencePathV0.network", args.network);
  const id = assertNonEmptyStringV0("ChainIoEvidencePathV0.id", args.id).replace(/[^0-9A-Za-z._-]/gu, "_");
  if (
    args.evidenceKind !== "transparent-utxo" &&
    args.evidenceKind !== "transaction" &&
    args.evidenceKind !== "outpoint-spend" &&
    args.evidenceKind !== "raw-transaction-submission"
  ) {
    throw new Error("ChainIoEvidencePathV0.evidenceKind is unsupported");
  }
  return `evidence/chain-io/${network}/${args.evidenceKind}/${id}.json`;
}

export function electrumScripthashForLockingBytecodeV0(lockingBytecode: string): string {
  const normalized = assertCanonicalHexV0("lockingBytecode", lockingBytecode);
  return createHash("sha256")
    .update(Buffer.from(normalized, "hex"))
    .digest()
    .reverse()
    .toString("hex");
}

export function normalizeChainIoTransparentUtxoSummaryV0(
  summary: ChainIoTransparentUtxoSummaryV0,
): ChainIoTransparentUtxoSummaryV0 {
  rejectUnsafeRawFieldsV0("ChainIoTransparentUtxoSummaryV0", summary);
  const height = assertOptionalNonNegativeSafeIntegerV0("ChainIoTransparentUtxoSummaryV0.height", summary.height);
  const lockingBytecode = summary.lockingBytecode === undefined
    ? undefined
    : assertCanonicalHexV0("ChainIoTransparentUtxoSummaryV0.lockingBytecode", summary.lockingBytecode);
  const status = summary.status === undefined
    ? undefined
    : assertNonEmptyStringV0("ChainIoTransparentUtxoSummaryV0.status", summary.status);
  const address = summary.address === undefined
    ? undefined
    : assertNonEmptyStringV0("ChainIoTransparentUtxoSummaryV0.address", summary.address);
  return Object.freeze({
    txid: normalizeChainIoTxidV0("ChainIoTransparentUtxoSummaryV0.txid", summary.txid),
    vout: assertNonNegativeSafeIntegerV0("ChainIoTransparentUtxoSummaryV0.vout", summary.vout),
    valueSats: assertNonNegativeIntegerStringV0("ChainIoTransparentUtxoSummaryV0.valueSats", summary.valueSats),
    ...(height === undefined ? {} : { height }),
    ...(status === undefined ? {} : { status }),
    ...(address === undefined ? {} : { address }),
    ...(lockingBytecode === undefined ? {} : { lockingBytecode }),
  });
}

function parseListUnspentResultV0(result: unknown): readonly ElectrumListUnspentEntryV0[] {
  if (!Array.isArray(result)) {
    throw new Error("Fulcrum blockchain.scripthash.listunspent result must be an array");
  }
  return Object.freeze(result.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Fulcrum listunspent[${String(index)}] must be an object`);
    }
    const record = entry as Readonly<Record<string, unknown>>;
    const height = assertOptionalNonNegativeSafeIntegerV0(`Fulcrum listunspent[${String(index)}].height`, record.height);
    return Object.freeze({
      tx_hash: normalizeChainIoTxidV0(`Fulcrum listunspent[${String(index)}].tx_hash`, record.tx_hash),
      tx_pos: assertNonNegativeSafeIntegerV0(`Fulcrum listunspent[${String(index)}].tx_pos`, record.tx_pos),
      value: assertPositiveIntegerStringV0(`Fulcrum listunspent[${String(index)}].value`, record.value),
      ...(height === undefined ? {} : { height }),
    });
  }));
}

function parseHistoryResultV0(result: unknown): readonly ElectrumHistoryEntryV0[] {
  if (!Array.isArray(result)) {
    throw new Error("Fulcrum blockchain.scripthash.get_history result must be an array");
  }
  return Object.freeze(result.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Fulcrum history[${String(index)}] must be an object`);
    }
    const record = entry as Readonly<Record<string, unknown>>;
    const height = assertOptionalNonNegativeSafeIntegerV0(`Fulcrum history[${String(index)}].height`, record.height);
    return Object.freeze({
      tx_hash: normalizeChainIoTxidV0(`Fulcrum history[${String(index)}].tx_hash`, record.tx_hash),
      ...(height === undefined ? {} : { height }),
    });
  }));
}

function evidenceFromListEntryV0(
  network: ChainNetworkV0,
  entry: ElectrumListUnspentEntryV0,
  target: Readonly<{ lockingBytecode: string; address?: string }>,
): ChainIoTransparentUtxoEvidenceV0 {
  const height = entry.height === undefined ? undefined : assertNonNegativeSafeIntegerV0("Fulcrum listunspent.height", entry.height);
  const txid = normalizeChainIoTxidV0("Fulcrum listunspent.tx_hash", entry.tx_hash);
  const vout = assertNonNegativeSafeIntegerV0("Fulcrum listunspent.tx_pos", entry.tx_pos);
  return Object.freeze({
    version: CHAIN_IO_EVIDENCE_SCHEMA_V0_VERSION,
    network,
    txid,
    vout,
    valueSats: assertPositiveIntegerStringV0("Fulcrum listunspent.value", entry.value),
    lockingBytecode: assertCanonicalHexV0("Fulcrum target.lockingBytecode", target.lockingBytecode),
    ...(target.address === undefined ? {} : { address: assertNonEmptyStringV0("Fulcrum target.address", target.address) }),
    ...(height === undefined || height <= 0 ? {} : { height }),
    status: statusFromHeightV0(height),
    unspent: true,
    trustBoundary: INDEXER_TRUST_BOUNDARY_V0,
    evidencePath: chainIoEvidenceJsonPathV0({
      network,
      evidenceKind: "transparent-utxo",
      id: `${txid}-${String(vout)}`,
    }),
  });
}

function extractAddressFromScriptPubKeyV0(scriptPubKey: Readonly<Record<string, unknown>>): string | undefined {
  if (typeof scriptPubKey.address === "string" && scriptPubKey.address.trim().length > 0) {
    return scriptPubKey.address.trim();
  }
  if (Array.isArray(scriptPubKey.addresses) && typeof scriptPubKey.addresses[0] === "string") {
    const address = scriptPubKey.addresses[0].trim();
    return address.length === 0 ? undefined : address;
  }
  return undefined;
}

function extractOutputFromTransactionV0(
  tx: unknown,
  vout: number,
): Readonly<{ valueSats: string; lockingBytecode: string; address?: string }> {
  if (!tx || typeof tx !== "object") {
    throw new Error("Fulcrum transaction response must be an object");
  }
  const rawOutputs = (tx as Readonly<{ vout?: unknown }>).vout;
  if (!Array.isArray(rawOutputs)) {
    throw new Error("Fulcrum transaction response vout must be an array");
  }
  for (const output of rawOutputs) {
    if (!output || typeof output !== "object") continue;
    const record = output as Readonly<{ n?: unknown; value?: unknown; scriptPubKey?: unknown }>;
    if (assertNonNegativeSafeIntegerV0("Fulcrum transaction.vout.n", record.n) !== vout) continue;
    if (!record.scriptPubKey || typeof record.scriptPubKey !== "object") {
      throw new Error("Fulcrum transaction output scriptPubKey must be an object");
    }
    const scriptPubKey = record.scriptPubKey as Readonly<Record<string, unknown>>;
    const lockingBytecode = assertCanonicalHexV0("Fulcrum transaction.vout.scriptPubKey.hex", scriptPubKey.hex);
    const address = extractAddressFromScriptPubKeyV0(scriptPubKey);
    return Object.freeze({
      valueSats: parseBchDecimalValueToSatsV0(record.value),
      lockingBytecode,
      ...(address === undefined ? {} : { address }),
    });
  }
  throw new Error("Fulcrum transaction output vout was not found");
}

function transactionInclusionFieldsV0(tx: unknown): Pick<
  ChainIoTransactionOutputEvidenceV0,
  "blockhash" | "confirmations" | "blocktime" | "bestblock" | "mempoolSeen"
> {
  if (!tx || typeof tx !== "object") return {};
  const record = tx as Readonly<Record<string, unknown>>;
  const blockhash = typeof record.blockhash === "string" && record.blockhash.trim().length > 0
    ? normalizeChainIoTxidV0("Fulcrum transaction.blockhash", record.blockhash)
    : undefined;
  const bestblock = typeof record.bestblock === "string" && record.bestblock.trim().length > 0
    ? normalizeChainIoTxidV0("Fulcrum transaction.bestblock", record.bestblock)
    : undefined;
  const confirmations = assertOptionalNonNegativeSafeIntegerV0(
    "Fulcrum transaction.confirmations",
    record.confirmations,
  );
  const blocktime = assertOptionalNonNegativeSafeIntegerV0(
    "Fulcrum transaction.blocktime",
    record.blocktime,
  );
  const mempoolSeen =
    blockhash === undefined &&
    (confirmations === 0 || record.in_active_chain === false || record.blockheight === undefined);
  return {
    ...(blockhash === undefined ? {} : { blockhash }),
    ...(confirmations === undefined ? {} : { confirmations }),
    ...(blocktime === undefined ? {} : { blocktime }),
    ...(bestblock === undefined ? {} : { bestblock }),
    ...(mempoolSeen ? { mempoolSeen: true } : {}),
  };
}

function lockingBytecodeHash32V0(lockingBytecode: string): string {
  return createHash("sha256").update(assertCanonicalHexV0("lockingBytecode", lockingBytecode), "hex").digest("hex");
}

function u16beV0(value: number): Buffer {
  const out = Buffer.alloc(2);
  out.writeUInt16BE(value, 0);
  return out;
}

function u32beV0(value: number): Buffer {
  const out = Buffer.alloc(4);
  out.writeUInt32BE(value, 0);
  return out;
}

function sha256DomainSeparatedHexV0(domain: string, payload: Buffer): string {
  const personalization = Buffer.from(HASH_PERSONALIZATION_V0, "utf8");
  const domainBytes = Buffer.from(assertNonEmptyStringV0("domain", domain), "utf8");
  return createHash("sha256")
    .update(Buffer.concat([
      u16beV0(personalization.length),
      personalization,
      u16beV0(domainBytes.length),
      domainBytes,
      u32beV0(payload.length),
      payload,
    ]))
    .digest("hex");
}

function apntImportFundingHandoffLockingBytecodeHash32V0(lockingBytecode: string): string {
  return sha256DomainSeparatedHexV0(
    APNT_IMPORT_FUNDING_HANDOFF_LOCKING_BYTECODE_HASH_V0_DOMAIN,
    Buffer.from(assertCanonicalHexV0("lockingBytecode", lockingBytecode), "hex"),
  );
}

function apntImportFundingCellTemplateOutputFingerprint32V0(args: Readonly<{
  valueSats: string;
  lockingBytecode: string;
}>): string {
  const valueSats = assertPositiveIntegerStringV0("ApntImportFundingCellTemplateOutputFingerprintV0.valueSats", args.valueSats);
  const lockingBytecode = assertCanonicalHexV0("ApntImportFundingCellTemplateOutputFingerprintV0.lockingBytecode", args.lockingBytecode);
  return sha256DomainSeparatedHexV0(
    APNT_IMPORT_FUNDING_CELL_TEMPLATE_OUTPUT_FINGERPRINT_V0_DOMAIN,
    Buffer.from(JSON.stringify({
      lockingBytecode,
      templateId: APNT_IMPORT_FUNDING_CELL_TEMPLATE_ID_V0,
      valueSats,
    }), "utf8"),
  );
}

function transactionOutputEvidencePathV0(network: ChainNetworkV0, txid: string, vout: number): string {
  return chainIoEvidenceJsonPathV0({
    network,
    evidenceKind: "transaction",
    id: `${txid}-${String(vout)}-output`,
  });
}

function outpointSpendEvidencePathV0(network: ChainNetworkV0, txid: string, vout: number): string {
  return chainIoEvidenceJsonPathV0({
    network,
    evidenceKind: "outpoint-spend",
    id: `${txid}-${String(vout)}-spend`,
  });
}

function outpointSpendEvidenceBaseV0(args: Readonly<{
  status: ChainIoApntConsumedOutpointStatusV0;
  network: ChainNetworkV0;
  txid: string;
  vout: number;
  consumptionTxid?: string;
  inputIndex?: number;
  reason?: string;
}>): ChainIoOutpointSpendEvidenceV0 {
  const network = assertNetworkV0("ChainIoOutpointSpendEvidenceV0.network", args.network);
  const txid = normalizeChainIoTxidV0("ChainIoOutpointSpendEvidenceV0.txid", args.txid);
  const vout = assertNonNegativeSafeIntegerV0("ChainIoOutpointSpendEvidenceV0.vout", args.vout);
  const status = assertApntConsumedOutpointStatusV0("ChainIoOutpointSpendEvidenceV0.status", args.status);
  const consumptionTxid = args.consumptionTxid === undefined
    ? undefined
    : normalizeChainIoTxidV0("ChainIoOutpointSpendEvidenceV0.consumptionTxid", args.consumptionTxid);
  const inputIndex = args.inputIndex === undefined
    ? undefined
    : assertNonNegativeSafeIntegerV0("ChainIoOutpointSpendEvidenceV0.inputIndex", args.inputIndex);
  const reason = args.reason === undefined ? undefined : assertNonEmptyStringV0("ChainIoOutpointSpendEvidenceV0.reason", args.reason);
  return Object.freeze({
    status,
    network,
    txid,
    vout,
    ...(consumptionTxid === undefined ? {} : { consumptionTxid }),
    ...(inputIndex === undefined ? {} : { inputIndex }),
    ...(reason === undefined ? {} : { reason }),
    trustBoundary: INDEXER_TRUST_BOUNDARY_V0,
    evidencePath: outpointSpendEvidencePathV0(network, txid, vout),
  });
}

function extractSpendCandidatesFromTransactionV0(
  tx: unknown,
  target: Readonly<{ txid: string; vout: number; consumptionTxid: string }>,
): readonly Readonly<{ consumptionTxid: string; inputIndex: number }>[] {
  if (!tx || typeof tx !== "object") {
    throw new Error("Fulcrum candidate transaction response must be an object");
  }
  const vin = (tx as Readonly<{ vin?: unknown }>).vin;
  if (!Array.isArray(vin)) {
    throw new Error("Fulcrum candidate transaction vin must be an array");
  }
  const matches: Readonly<{ consumptionTxid: string; inputIndex: number }>[] = [];
  vin.forEach((input, index) => {
    if (!input || typeof input !== "object") {
      throw new Error(`Fulcrum candidate transaction vin[${String(index)}] must be an object`);
    }
    const record = input as Readonly<Record<string, unknown>>;
    if (record.coinbase !== undefined) return;
    const inputTxid = normalizeChainIoTxidV0(`Fulcrum candidate transaction vin[${String(index)}].txid`, record.txid);
    const inputVout = assertNonNegativeSafeIntegerV0(`Fulcrum candidate transaction vin[${String(index)}].vout`, record.vout);
    if (inputTxid === target.txid && inputVout === target.vout) {
      matches.push(Object.freeze({
        consumptionTxid: target.consumptionTxid,
        inputIndex: index,
      }));
    }
  });
  return Object.freeze(matches);
}

function assertApntSealOpenStatusV0(name: string, status: unknown): ChainIoApntSealOpenEvidenceStatusV0 {
  if (
    status !== "verified-output-exists" &&
    status !== "not-found" &&
    status !== "unavailable" &&
    status !== "ambiguous"
  ) {
    throw new Error(`${name} must be verified-output-exists, not-found, unavailable, or ambiguous`);
  }
  return status;
}

function assertApntConsumedOutpointStatusV0(name: string, status: unknown): ChainIoApntConsumedOutpointStatusV0 {
  if (
    status !== "spent-outpoint" &&
    status !== "unspent" &&
    status !== "not-found" &&
    status !== "unavailable" &&
    status !== "ambiguous"
  ) {
    throw new Error(`${name} must be spent-outpoint, unspent, not-found, unavailable, or ambiguous`);
  }
  return status;
}

function apntSealOpenEvidenceBaseV0(args: Readonly<{
  status: ChainIoApntSealOpenEvidenceStatusV0;
  network: ChainNetworkV0;
  txid: string;
  outputIndex: number;
  expectedValueSats: string;
  expectedLockingBytecodeHash32: string;
  expectedOutputFingerprint32: string;
  importFundingCellCommitment32: string;
  eligibilityStatementBind32: string;
  actualValueSats?: string | null;
  actualLockingBytecodeHash32?: string | null;
  actualOutputFingerprint32?: string | null;
}>): ChainIoApntSealOpenEvidenceV0 {
  const network = assertNetworkV0("ChainIoApntSealOpenEvidenceV0.network", args.network);
  const txid = normalizeChainIoTxidV0("ChainIoApntSealOpenEvidenceV0.txid", args.txid);
  const outputIndex = assertNonNegativeSafeIntegerV0("ChainIoApntSealOpenEvidenceV0.outputIndex", args.outputIndex);
  const expectedValueSats = assertPositiveIntegerStringV0(
    "ChainIoApntSealOpenEvidenceV0.expectedValueSats",
    args.expectedValueSats,
  );
  const expectedLockingBytecodeHash32 = normalizeChainIoTxidV0(
    "ChainIoApntSealOpenEvidenceV0.expectedLockingBytecodeHash32",
    args.expectedLockingBytecodeHash32,
  );
  const expectedOutputFingerprint32 = normalizeChainIoTxidV0(
    "ChainIoApntSealOpenEvidenceV0.expectedOutputFingerprint32",
    args.expectedOutputFingerprint32,
  );
  const importFundingCellCommitment32 = normalizeChainIoTxidV0(
    "ChainIoApntSealOpenEvidenceV0.importFundingCellCommitment32",
    args.importFundingCellCommitment32,
  );
  const eligibilityStatementBind32 = normalizeChainIoTxidV0(
    "ChainIoApntSealOpenEvidenceV0.eligibilityStatementBind32",
    args.eligibilityStatementBind32,
  );
  const actualValueSats = args.actualValueSats === undefined || args.actualValueSats === null
    ? null
    : assertPositiveIntegerStringV0("ChainIoApntSealOpenEvidenceV0.actualValueSats", args.actualValueSats);
  const actualLockingBytecodeHash32 = args.actualLockingBytecodeHash32 === undefined || args.actualLockingBytecodeHash32 === null
    ? null
    : normalizeChainIoTxidV0("ChainIoApntSealOpenEvidenceV0.actualLockingBytecodeHash32", args.actualLockingBytecodeHash32);
  const actualOutputFingerprint32 = args.actualOutputFingerprint32 === undefined || args.actualOutputFingerprint32 === null
    ? null
    : normalizeChainIoTxidV0("ChainIoApntSealOpenEvidenceV0.actualOutputFingerprint32", args.actualOutputFingerprint32);
  return Object.freeze({
    status: assertApntSealOpenStatusV0("ChainIoApntSealOpenEvidenceV0.status", args.status),
    network,
    txid,
    outputIndex,
    outputChainExistence: args.status === "verified-output-exists",
    expectedValueSats,
    actualValueSats,
    expectedLockingBytecodeHash32,
    actualLockingBytecodeHash32,
    expectedOutputFingerprint32,
    actualOutputFingerprint32,
    importFundingCellCommitment32,
    eligibilityStatementBind32,
  });
}

function configuredNetworkOutputEvidenceBaseV0(args: Readonly<{
  status: ChainIoConfiguredNetworkOutputEvidenceStatusV0;
  network: ChainNetworkV0;
  txid: string;
  vout: number;
  expectedValueSats: string;
  expectedLockingBytecodeHash32: string;
  observedValueSats?: string;
  observedLockingBytecodeHash32?: string;
  reason?: string;
}>): ChainIoConfiguredNetworkOutputEvidenceV0 {
  const network = assertNetworkV0("ChainIoConfiguredNetworkOutputEvidenceV0.network", args.network);
  const txid = normalizeChainIoTxidV0("ChainIoConfiguredNetworkOutputEvidenceV0.txid", args.txid);
  const vout = assertNonNegativeSafeIntegerV0("ChainIoConfiguredNetworkOutputEvidenceV0.vout", args.vout);
  const expectedValueSats = assertPositiveIntegerStringV0(
    "ChainIoConfiguredNetworkOutputEvidenceV0.expectedValueSats",
    args.expectedValueSats,
  );
  const expectedLockingBytecodeHash32 = normalizeChainIoTxidV0(
    "ChainIoConfiguredNetworkOutputEvidenceV0.expectedLockingBytecodeHash32",
    args.expectedLockingBytecodeHash32,
  );
  const observedValueSats = args.observedValueSats === undefined
    ? undefined
    : assertPositiveIntegerStringV0("ChainIoConfiguredNetworkOutputEvidenceV0.observedValueSats", args.observedValueSats);
  const observedLockingBytecodeHash32 = args.observedLockingBytecodeHash32 === undefined
    ? undefined
    : normalizeChainIoTxidV0("ChainIoConfiguredNetworkOutputEvidenceV0.observedLockingBytecodeHash32", args.observedLockingBytecodeHash32);
  const reason = args.reason === undefined ? undefined : assertNonEmptyStringV0("ChainIoConfiguredNetworkOutputEvidenceV0.reason", args.reason);
  return Object.freeze({
    status: args.status,
    network,
    txid,
    vout,
    expectedValueSats,
    expectedLockingBytecodeHash32,
    ...(observedValueSats === undefined ? {} : { observedValueSats }),
    ...(observedLockingBytecodeHash32 === undefined ? {} : { observedLockingBytecodeHash32 }),
    ...(reason === undefined ? {} : { reason }),
    chainInclusion: false,
    outputChainExistence: args.status === "verified-output-exists",
    apntAcceptance: false,
    laneStateAdvanced: false,
    privateNoteSpendability: false,
    productionPrivacy: false,
    aggregatorAuthority: false,
    nostrWizardConnectProtocolTruth: false,
    trustBoundary: INDEXER_TRUST_BOUNDARY_V0,
    evidencePath: transactionOutputEvidencePathV0(network, txid, vout),
  });
}

export async function lookupConfiguredNetworkOutputEvidenceV0(args: Readonly<{
  provider?: Pick<ChainIoProviderV0, "lookupTransactionOutputEvidence">;
  network: ChainNetworkV0;
  txid: string;
  vout: number;
  expectedValueSats: string;
  expectedLockingBytecodeHash32: string;
}>): Promise<ChainIoConfiguredNetworkOutputEvidenceV0> {
  const network = assertNetworkV0("lookupConfiguredNetworkOutputEvidenceV0.network", args.network);
  const txid = normalizeChainIoTxidV0("lookupConfiguredNetworkOutputEvidenceV0.txid", args.txid);
  const vout = assertNonNegativeSafeIntegerV0("lookupConfiguredNetworkOutputEvidenceV0.vout", args.vout);
  const expectedValueSats = assertPositiveIntegerStringV0("lookupConfiguredNetworkOutputEvidenceV0.expectedValueSats", args.expectedValueSats);
  const expectedLockingBytecodeHash32 = normalizeChainIoTxidV0(
    "lookupConfiguredNetworkOutputEvidenceV0.expectedLockingBytecodeHash32",
    args.expectedLockingBytecodeHash32,
  );
  const baseArgs = {
    network,
    txid,
    vout,
    expectedValueSats,
    expectedLockingBytecodeHash32,
  };
  if (args.provider === undefined) {
    return configuredNetworkOutputEvidenceBaseV0({
      ...baseArgs,
      status: "unavailable",
      reason: "no trusted configured-network output lookup provider was supplied",
    });
  }
  let found: ChainIoTransactionOutputEvidenceV0;
  try {
    found = await args.provider.lookupTransactionOutputEvidence({ network, txid, vout });
  } catch (error: unknown) {
    return configuredNetworkOutputEvidenceBaseV0({
      ...baseArgs,
      status: "unavailable",
      reason: `configured-network output lookup failed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
  if (!found.found) {
    return configuredNetworkOutputEvidenceBaseV0({
      ...baseArgs,
      status: "not-found",
      reason: "configured-network lookup did not find the requested output",
    });
  }
  const observedValueSats = found.valueSats;
  const observedLockingBytecodeHash32 = found.lockingBytecodeHash32;
  if (observedValueSats === undefined || observedLockingBytecodeHash32 === undefined) {
    return configuredNetworkOutputEvidenceBaseV0({
      ...baseArgs,
      status: "not-found",
      reason: "configured-network lookup returned incomplete output evidence",
    });
  }
  if (observedValueSats !== expectedValueSats) {
    return configuredNetworkOutputEvidenceBaseV0({
      ...baseArgs,
      status: "not-found",
      observedValueSats,
      observedLockingBytecodeHash32,
      reason: "configured-network output value did not match expected value",
    });
  }
  if (observedLockingBytecodeHash32 !== expectedLockingBytecodeHash32) {
    return configuredNetworkOutputEvidenceBaseV0({
      ...baseArgs,
      status: "not-found",
      observedValueSats,
      observedLockingBytecodeHash32,
      reason: "configured-network output locking bytecode hash did not match expected hash",
    });
  }
  return configuredNetworkOutputEvidenceBaseV0({
    ...baseArgs,
    status: "verified-output-exists",
    observedValueSats,
    observedLockingBytecodeHash32,
  });
}

export async function lookupApntSealOpenEvidenceV0(args: Readonly<{
  provider?: Pick<ChainIoProviderV0, "lookupTransactionOutputEvidence">;
  network: ChainNetworkV0;
  txid: string;
  outputIndex: number;
  expectedValueSats: string;
  expectedLockingBytecodeHash32: string;
  expectedOutputFingerprint32: string;
  importFundingCellCommitment32: string;
  eligibilityStatementBind32: string;
}>): Promise<ChainIoApntSealOpenEvidenceV0> {
  const network = assertNetworkV0("lookupApntSealOpenEvidenceV0.network", args.network);
  const txid = normalizeChainIoTxidV0("lookupApntSealOpenEvidenceV0.txid", args.txid);
  const outputIndex = assertNonNegativeSafeIntegerV0("lookupApntSealOpenEvidenceV0.outputIndex", args.outputIndex);
  const baseArgs = {
    network,
    txid,
    outputIndex,
    expectedValueSats: assertPositiveIntegerStringV0("lookupApntSealOpenEvidenceV0.expectedValueSats", args.expectedValueSats),
    expectedLockingBytecodeHash32: normalizeChainIoTxidV0(
      "lookupApntSealOpenEvidenceV0.expectedLockingBytecodeHash32",
      args.expectedLockingBytecodeHash32,
    ),
    expectedOutputFingerprint32: normalizeChainIoTxidV0(
      "lookupApntSealOpenEvidenceV0.expectedOutputFingerprint32",
      args.expectedOutputFingerprint32,
    ),
    importFundingCellCommitment32: normalizeChainIoTxidV0(
      "lookupApntSealOpenEvidenceV0.importFundingCellCommitment32",
      args.importFundingCellCommitment32,
    ),
    eligibilityStatementBind32: normalizeChainIoTxidV0(
      "lookupApntSealOpenEvidenceV0.eligibilityStatementBind32",
      args.eligibilityStatementBind32,
    ),
  };
  if (args.provider === undefined) {
    return apntSealOpenEvidenceBaseV0({
      ...baseArgs,
      status: "unavailable",
    });
  }
  let providerEvidence: ChainIoTransactionOutputEvidenceV0;
  try {
    providerEvidence = await args.provider.lookupTransactionOutputEvidence({ network, txid, vout: outputIndex });
  } catch (error: unknown) {
    void error;
    return apntSealOpenEvidenceBaseV0({
      ...baseArgs,
      status: "unavailable",
    });
  }
  if (!providerEvidence.found) {
    return apntSealOpenEvidenceBaseV0({
      ...baseArgs,
      status: "not-found",
    });
  }
  if (providerEvidence.txid !== txid || providerEvidence.vout !== outputIndex) {
    return apntSealOpenEvidenceBaseV0({
      ...baseArgs,
      status: "ambiguous",
    });
  }
  const actualValueSats = providerEvidence.valueSats ?? null;
  const actualLockingBytecodeHash32 = providerEvidence.lockingBytecode === undefined
    ? null
    : apntImportFundingHandoffLockingBytecodeHash32V0(providerEvidence.lockingBytecode);
  const actualOutputFingerprint32 =
    providerEvidence.lockingBytecode === undefined || actualValueSats === null
      ? null
      : apntImportFundingCellTemplateOutputFingerprint32V0({
          valueSats: actualValueSats,
          lockingBytecode: providerEvidence.lockingBytecode,
        });
  if (
    actualValueSats === null ||
    actualLockingBytecodeHash32 === null ||
    actualOutputFingerprint32 === null
  ) {
    return apntSealOpenEvidenceBaseV0({
      ...baseArgs,
      status: "not-found",
      actualValueSats,
      actualLockingBytecodeHash32,
      actualOutputFingerprint32,
    });
  }
  if (actualValueSats !== baseArgs.expectedValueSats) {
    return apntSealOpenEvidenceBaseV0({
      ...baseArgs,
      status: "not-found",
      actualValueSats,
      actualLockingBytecodeHash32,
      actualOutputFingerprint32,
    });
  }
  if (actualLockingBytecodeHash32 !== baseArgs.expectedLockingBytecodeHash32) {
    return apntSealOpenEvidenceBaseV0({
      ...baseArgs,
      status: "not-found",
      actualValueSats,
      actualLockingBytecodeHash32,
      actualOutputFingerprint32,
    });
  }
  if (actualOutputFingerprint32 !== baseArgs.expectedOutputFingerprint32) {
    return apntSealOpenEvidenceBaseV0({
      ...baseArgs,
      status: "not-found",
      actualValueSats,
      actualLockingBytecodeHash32,
      actualOutputFingerprint32,
    });
  }
  return apntSealOpenEvidenceBaseV0({
    ...baseArgs,
    status: "verified-output-exists",
    actualValueSats,
    actualLockingBytecodeHash32,
    actualOutputFingerprint32,
  });
}

function apntConsumedOutpointEvidenceBaseV0(args: Readonly<{
  status: ChainIoApntConsumedOutpointStatusV0;
  network: ChainNetworkV0;
  txid: string;
  vout: number;
  consumptionTxid?: string;
  inputIndex?: number;
}>): ChainIoApntConsumedOutpointEvidenceV0 {
  const network = assertNetworkV0("ChainIoApntConsumedOutpointEvidenceV0.network", args.network);
  const txid = normalizeChainIoTxidV0("ChainIoApntConsumedOutpointEvidenceV0.txid", args.txid);
  const vout = assertNonNegativeSafeIntegerV0("ChainIoApntConsumedOutpointEvidenceV0.vout", args.vout);
  const status = assertApntConsumedOutpointStatusV0("ChainIoApntConsumedOutpointEvidenceV0.status", args.status);
  const consumptionTxid = args.consumptionTxid === undefined
    ? undefined
    : normalizeChainIoTxidV0("ChainIoApntConsumedOutpointEvidenceV0.consumptionTxid", args.consumptionTxid);
  const inputIndex = args.inputIndex === undefined
    ? undefined
    : assertNonNegativeSafeIntegerV0("ChainIoApntConsumedOutpointEvidenceV0.inputIndex", args.inputIndex);
  return Object.freeze({
    status,
    network,
    consumedOutpoint: Object.freeze({ txid, vout }),
    ...(consumptionTxid === undefined ? {} : { consumptionTxid }),
    ...(inputIndex === undefined ? {} : { inputIndex }),
  });
}

export async function lookupApntConsumedOutpointEvidenceV0(args: Readonly<{
  provider?: Pick<ChainIoProviderV0, "lookupOutpointSpendEvidence">;
  network: ChainNetworkV0;
  txid: string;
  vout: number;
}>): Promise<ChainIoApntConsumedOutpointEvidenceV0> {
  const network = assertNetworkV0("lookupApntConsumedOutpointEvidenceV0.network", args.network);
  const txid = normalizeChainIoTxidV0("lookupApntConsumedOutpointEvidenceV0.txid", args.txid);
  const vout = assertNonNegativeSafeIntegerV0("lookupApntConsumedOutpointEvidenceV0.vout", args.vout);
  const baseArgs = { network, txid, vout };
  if (args.provider?.lookupOutpointSpendEvidence === undefined) {
    return apntConsumedOutpointEvidenceBaseV0({
      ...baseArgs,
      status: "unavailable",
    });
  }
  let providerEvidence: ChainIoOutpointSpendEvidenceV0;
  try {
    providerEvidence = await args.provider.lookupOutpointSpendEvidence({ network, txid, vout });
  } catch (error: unknown) {
    void error;
    return apntConsumedOutpointEvidenceBaseV0({
      ...baseArgs,
      status: "unavailable",
    });
  }
  if (providerEvidence.network !== network || providerEvidence.txid !== txid || providerEvidence.vout !== vout) {
    return apntConsumedOutpointEvidenceBaseV0({
      ...baseArgs,
      status: "ambiguous",
    });
  }
  if (providerEvidence.status !== "spent-outpoint") {
    return apntConsumedOutpointEvidenceBaseV0({
      ...baseArgs,
      status: providerEvidence.status,
    });
  }
  if (providerEvidence.consumptionTxid === undefined || providerEvidence.inputIndex === undefined) {
    return apntConsumedOutpointEvidenceBaseV0({
      ...baseArgs,
      status: "ambiguous",
    });
  }
  return apntConsumedOutpointEvidenceBaseV0({
    ...baseArgs,
    status: "spent-outpoint",
    consumptionTxid: providerEvidence.consumptionTxid,
    inputIndex: providerEvidence.inputIndex,
  });
}

/**
 * Transport-level failure. `retryable` marks failures that are explained by a
 * pooled socket having gone stale (server-side idle close, reset), so the same
 * request may be redialed once on a fresh connection. Timeouts and JSON-RPC
 * errors are never retryable: the peer may already have acted on the request.
 */
class FulcrumTransportErrorV0 extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "FulcrumTransportErrorV0";
    this.retryable = retryable;
  }
}

type FulcrumPendingRequestV0 = Readonly<{
  method: string;
  settle: (error?: Error, value?: unknown) => void;
}>;

type FulcrumConnectionV0 = {
  readonly key: string;
  readonly socket: net.Socket;
  readonly pending: Map<string, FulcrumPendingRequestV0>;
  readonly ready: Promise<void>;
  buffer: string;
  closed: boolean;
  connectTimer: ReturnType<typeof setTimeout> | undefined;
  idleTimer: ReturnType<typeof setTimeout> | undefined;
  closeWhenIdle: () => void;
};

function unrefTimerV0(timer: ReturnType<typeof setTimeout>): void {
  (timer as unknown as { unref?: () => void }).unref?.();
}

function fulcrumEndpointKeyV0(endpoint: ChainIoEndpointV0): string {
  return `${endpoint.transport}://${endpoint.host}:${String(endpoint.port)}`;
}

function fulcrumEndpointLabelV0(endpoint: ChainIoEndpointV0): string {
  return `${endpoint.host}:${String(endpoint.port)} (${endpoint.transport})`;
}

/**
 * Opens one Electrum-protocol connection that many requests share. Responses
 * are matched back to their caller by the JSON-RPC `id` already carried on
 * every request, which is what makes pipelining safe here.
 */
function openFulcrumConnectionV0(
  endpoint: ChainIoEndpointV0,
  connectTimeoutMs: number,
  onClosed: (connection: FulcrumConnectionV0) => void,
): FulcrumConnectionV0 {
  const socket: net.Socket =
    endpoint.transport === "tls"
      ? tls.connect({
        host: endpoint.host,
        port: endpoint.port,
        rejectUnauthorized: false,
      })
      : net.connect({
        host: endpoint.host,
        port: endpoint.port,
      });
  socket.setEncoding("utf8");
  socket.setNoDelay(true);

  let markReady: () => void = () => undefined;
  let failReady: (error: Error) => void = () => undefined;
  const ready = new Promise<void>((resolve, reject) => {
    markReady = resolve;
    failReady = reject;
  });
  // Callers observe connection failure through their own request promise; keep
  // an always-attached handler so a failed dial is never an unhandled rejection.
  void ready.catch(() => undefined);

  const connection: FulcrumConnectionV0 = {
    key: fulcrumEndpointKeyV0(endpoint),
    socket,
    pending: new Map<string, FulcrumPendingRequestV0>(),
    ready,
    buffer: "",
    closed: false,
    connectTimer: undefined,
    idleTimer: undefined,
    closeWhenIdle: () => undefined,
  };

  const teardown = (): void => {
    connection.closed = true;
    if (connection.connectTimer !== undefined) clearTimeout(connection.connectTimer);
    connection.connectTimer = undefined;
    if (connection.idleTimer !== undefined) clearTimeout(connection.idleTimer);
    connection.idleTimer = undefined;
    onClosed(connection);
    socket.removeAllListeners();
    socket.destroy();
  };

  const failConnection = (error: FulcrumTransportErrorV0): void => {
    if (connection.closed) return;
    teardown();
    failReady(error);
    const orphaned = [...connection.pending.values()];
    connection.pending.clear();
    for (const entry of orphaned) entry.settle(error);
  };

  connection.closeWhenIdle = (): void => {
    if (connection.closed || connection.pending.size > 0) return;
    teardown();
  };

  socket.on("data", (chunk: string) => {
    connection.buffer += chunk;
    let newline = connection.buffer.indexOf("\n");
    while (newline >= 0) {
      const line = connection.buffer.slice(0, newline).trim();
      connection.buffer = connection.buffer.slice(newline + 1);
      newline = connection.buffer.indexOf("\n");
      if (line.length === 0) continue;

      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        // The line framing is desynchronized; nothing further on this socket
        // can be trusted, so fail every request riding on it.
        failConnection(new FulcrumTransportErrorV0(
          `invalid Fulcrum response line from ${endpoint.host}:${String(endpoint.port)}`,
          false,
        ));
        return;
      }
      if (!parsed || typeof parsed !== "object") continue;
      const envelope = parsed as ElectrumJsonResponseEnvelopeV0;
      if (typeof envelope.id !== "string") continue;
      const entry = connection.pending.get(envelope.id);
      // Unknown ids are subscription notifications or late answers to requests
      // that already timed out; both are discarded without touching the others.
      if (entry === undefined) continue;
      connection.pending.delete(envelope.id);
      if (envelope.error) {
        entry.settle(new Error(
          `Fulcrum ${entry.method} error from ${endpoint.host}:${String(endpoint.port)}: ${parseErrorMessageV0(envelope.error)}`,
        ));
        continue;
      }
      entry.settle(undefined, envelope.result);
    }
    noteFulcrumConnectionActivityV0(connection);
  });

  socket.on("error", (error) => {
    failConnection(new FulcrumTransportErrorV0(
      `failed to connect Fulcrum endpoint ${fulcrumEndpointLabelV0(endpoint)}: ${error.message}`,
      true,
    ));
  });
  socket.on("close", () => {
    failConnection(new FulcrumTransportErrorV0(
      `Fulcrum connection to ${fulcrumEndpointLabelV0(endpoint)} closed`,
      true,
    ));
  });

  connection.connectTimer = setTimeout(() => {
    failConnection(new FulcrumTransportErrorV0(
      `timeout connecting Fulcrum endpoint ${fulcrumEndpointLabelV0(endpoint)}`,
      true,
    ));
  }, connectTimeoutMs);
  unrefTimerV0(connection.connectTimer);

  const onConnected = (): void => {
    if (connection.connectTimer !== undefined) clearTimeout(connection.connectTimer);
    connection.connectTimer = undefined;
    markReady();
    noteFulcrumConnectionActivityV0(connection);
  };
  socket.once(endpoint.transport === "tls" ? "secureConnect" : "connect", onConnected);

  return connection;
}

/**
 * Keeps the socket ref()ed while it is dialling or carrying requests and
 * unref()ed once idle, so a pooled connection never keeps the host process
 * alive on its own and an idle socket is dropped before it can go stale.
 */
function noteFulcrumConnectionActivityV0(connection: FulcrumConnectionV0): void {
  if (connection.closed) return;
  if (connection.idleTimer !== undefined) {
    clearTimeout(connection.idleTimer);
    connection.idleTimer = undefined;
  }
  if (connection.pending.size > 0) {
    connection.socket.ref();
    return;
  }
  connection.socket.unref();
  connection.idleTimer = setTimeout(connection.closeWhenIdle, FULCRUM_IDLE_CONNECTION_MS_V0);
  unrefTimerV0(connection.idleTimer);
}

/**
 * Builds a request function backed by one persistent, pipelined socket per
 * endpoint. Reconnection is transparent: a pooled socket that the peer dropped
 * is discarded and the request is redialed once on a fresh connection.
 */
function createPooledFulcrumRequestV0(): ChainIoFulcrumRequestV0 {
  const connections = new Map<string, FulcrumConnectionV0>();
  let requestCounter = 0;

  const release = (connection: FulcrumConnectionV0): void => {
    if (connections.get(connection.key) === connection) connections.delete(connection.key);
  };

  const acquire = (
    endpoint: ChainIoEndpointV0,
    connectTimeoutMs: number,
  ): Readonly<{ connection: FulcrumConnectionV0; reused: boolean }> => {
    const key = fulcrumEndpointKeyV0(endpoint);
    const existing = connections.get(key);
    if (existing !== undefined && !existing.closed) return { connection: existing, reused: true };
    const connection = openFulcrumConnectionV0(endpoint, connectTimeoutMs, release);
    connections.set(key, connection);
    return { connection, reused: false };
  };

  const attemptV0 = async (
    endpoint: ChainIoEndpointV0,
    method: string,
    params: readonly unknown[],
    timeoutMs: number,
  ): Promise<unknown> => {
    const { connection, reused } = acquire(endpoint, timeoutMs);
    try {
      await connection.ready;
    } catch (error: unknown) {
      throw error instanceof FulcrumTransportErrorV0
        ? error
        : new FulcrumTransportErrorV0(
          `failed to connect Fulcrum endpoint ${fulcrumEndpointLabelV0(endpoint)}: ${error instanceof Error ? error.message : String(error)}`,
          reused,
        );
    }
    if (connection.closed) {
      throw new FulcrumTransportErrorV0(
        `Fulcrum connection to ${fulcrumEndpointLabelV0(endpoint)} closed before ${method} was sent`,
        reused,
      );
    }
    requestCounter += 1;
    const requestId = `${FULCRUM_REQUEST_ID_PREFIX_V0}:${method}:${Date.now().toString(10)}:${String(requestCounter)}:${Math.random().toString(16).slice(2)}`;
    return await new Promise<unknown>((resolve, reject) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const settle = (error?: Error, value?: unknown): void => {
        if (settled) return;
        settled = true;
        if (timer !== undefined) clearTimeout(timer);
        connection.pending.delete(requestId);
        noteFulcrumConnectionActivityV0(connection);
        if (error) {
          reject(error);
          return;
        }
        resolve(value);
      };
      timer = setTimeout(() => {
        // Only this caller's request is abandoned; every other request
        // pipelined on the shared socket keeps waiting for its own id.
        settle(new FulcrumTransportErrorV0(
          `timeout calling Fulcrum ${method} at ${fulcrumEndpointLabelV0(endpoint)}`,
          false,
        ));
      }, timeoutMs);
      unrefTimerV0(timer);
      connection.pending.set(requestId, { method, settle });
      noteFulcrumConnectionActivityV0(connection);
      try {
        connection.socket.write(`${JSON.stringify({
          jsonrpc: "2.0",
          id: requestId,
          method,
          params,
        })}\n`);
      } catch (error: unknown) {
        settle(new FulcrumTransportErrorV0(
          `failed to write Fulcrum ${method} to ${fulcrumEndpointLabelV0(endpoint)}: ${error instanceof Error ? error.message : String(error)}`,
          reused,
        ));
      }
    });
  };

  return async (endpoint, method, params, timeoutMs) => {
    try {
      return await attemptV0(endpoint, method, params, timeoutMs);
    } catch (error: unknown) {
      const retryable = error instanceof FulcrumTransportErrorV0 && error.retryable;
      // A submission is never replayed: the peer may already have relayed it.
      if (!retryable || method === "blockchain.transaction.broadcast") throw error;
      return await attemptV0(endpoint, method, params, timeoutMs);
    }
  };
}

function transparentFundingFailureV0(
  code: ChainIoTransparentFundingEvidenceFailureCodeV0,
  message: string,
  progress: Omit<ChainIoTransparentFundingVerificationProgressV0, "candidateReported">,
): never {
  throw new ChainIoTransparentFundingEvidenceErrorV0(code, message, progress);
}

function assertAuthenticatedIndexerEvidenceV0(
  name: string,
  evidence: Readonly<{ trustBoundary: ChainIoTrustBoundaryV0; evidencePath: string }>,
  progress: Omit<ChainIoTransparentFundingVerificationProgressV0, "candidateReported">,
): void {
  const trust = evidence.trustBoundary;
  if (
    trust?.source !== "fulcrum" ||
    trust.evidenceKind !== "indexer" ||
    trust.consensusAuthority !== false ||
    trust.apntProtocolTruth !== false ||
    typeof evidence.evidencePath !== "string" ||
    evidence.evidencePath.length === 0
  ) {
    transparentFundingFailureV0(
      "F-APNT-TRANSPARENT-UTXO-PROVIDER-UNAUTHENTICATED",
      `${name} is not normalized authenticated indexer evidence`,
      progress,
    );
  }
}

function transparentFundingProviderFailureV0(
  error: unknown,
  progress: Omit<ChainIoTransparentFundingVerificationProgressV0, "candidateReported">,
): never {
  const message = error instanceof Error ? error.message : String(error);
  transparentFundingFailureV0(
    message.toLowerCase().includes("ambiguous")
      ? "F-APNT-TRANSPARENT-UTXO-PROVIDER-AMBIGUOUS"
      : "F-APNT-TRANSPARENT-UTXO-PROVIDER-UNAVAILABLE",
    `transparent funding provider lookup failed: ${message}`,
    progress,
  );
}

/**
 * Independently cross-checks transaction bytes, output evidence, list-unspent,
 * and spend evidence. The result is authenticated evidence for a wallet
 * decision, never consensus truth or APNT acceptance by provider authority.
 */
export async function lookupChainIoAuthenticatedTransparentFundingEvidenceV0(
  args: LookupChainIoAuthenticatedTransparentFundingEvidenceV0Args,
): Promise<ChainIoAuthenticatedTransparentFundingEvidenceV0> {
  const candidateKeys = Object.keys(args.candidate).sort();
  const expectedCandidateKeys = ["lockingBytecode", "network", "tokenState", "txid", "valueSats", "vout"].sort();
  if (
    candidateKeys.length !== expectedCandidateKeys.length ||
    candidateKeys.some((key, index) => key !== expectedCandidateKeys[index])
  ) {
    transparentFundingFailureV0(
      "F-APNT-TRANSPARENT-UTXO-MALFORMED-EVIDENCE",
      "transparent funding candidate has unknown or missing fields",
      { transactionLocated: false, outputLocated: false, metadataMatched: false, unspent: false },
    );
  }
  if (args.candidate.network !== "chipnet") {
    transparentFundingFailureV0(
      "F-APNT-TRANSPARENT-UTXO-NETWORK-MISMATCH",
      "transparent funding candidate must be exact Chipnet",
      { transactionLocated: false, outputLocated: false, metadataMatched: false, unspent: false },
    );
  }
  let txid: string;
  let vout: number;
  let valueSats: string;
  let lockingBytecode: string;
  try {
    txid = normalizeChainIoTxidV0("ChainIoTransparentFundingCandidateV0.txid", args.candidate.txid);
    vout = assertNonNegativeSafeIntegerV0("ChainIoTransparentFundingCandidateV0.vout", args.candidate.vout);
    valueSats = assertPositiveIntegerStringV0("ChainIoTransparentFundingCandidateV0.valueSats", args.candidate.valueSats);
    lockingBytecode = assertCanonicalHexV0("ChainIoTransparentFundingCandidateV0.lockingBytecode", args.candidate.lockingBytecode);
  } catch (error: unknown) {
    transparentFundingFailureV0(
      "F-APNT-TRANSPARENT-UTXO-MALFORMED-EVIDENCE",
      error instanceof Error ? error.message : String(error),
      { transactionLocated: false, outputLocated: false, metadataMatched: false, unspent: false },
    );
  }
  if (args.candidate.tokenState !== "none") {
    transparentFundingFailureV0(
      "F-APNT-TRANSPARENT-UTXO-TOKEN-NOT-PERMITTED",
      "transparent import funding candidate must be BCH-only",
      { transactionLocated: false, outputLocated: false, metadataMatched: false, unspent: false },
    );
  }
  const observedAtMs = assertNonNegativeSafeIntegerV0(
    "ChainIoTransparentFundingEvidenceV0.observedAtMs",
    args.observedAtMs ?? Date.now(),
  );
  const evaluatedAtMs = assertNonNegativeSafeIntegerV0(
    "ChainIoTransparentFundingEvidenceV0.evaluatedAtMs",
    args.evaluatedAtMs ?? observedAtMs,
  );
  if (evaluatedAtMs < observedAtMs) {
    transparentFundingFailureV0(
      "F-APNT-TRANSPARENT-UTXO-MALFORMED-EVIDENCE",
      "transparent funding evidence evaluation time precedes observation",
      { transactionLocated: false, outputLocated: false, metadataMatched: false, unspent: false },
    );
  }
  const evidenceAgeMs = evaluatedAtMs - observedAtMs;
  if (evidenceAgeMs > CHAIN_IO_TRANSPARENT_FUNDING_EVIDENCE_MAX_AGE_MS_V0) {
    transparentFundingFailureV0(
      "F-APNT-TRANSPARENT-UTXO-EVIDENCE-STALE",
      "transparent funding evidence exceeds the repository freshness policy",
      { transactionLocated: false, outputLocated: false, metadataMatched: false, unspent: false },
    );
  }

  let transaction: ChainIoTransactionEvidenceV0;
  try {
    transaction = await args.provider.lookupTransactionEvidence({ network: "chipnet", txid });
  } catch (error: unknown) {
    return transparentFundingProviderFailureV0(error, {
      transactionLocated: false, outputLocated: false, metadataMatched: false, unspent: false,
    });
  }
  assertAuthenticatedIndexerEvidenceV0("transaction evidence", transaction, {
    transactionLocated: transaction.found, outputLocated: false, metadataMatched: false, unspent: false,
  });
  if (transaction.network !== "chipnet") {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-NETWORK-MISMATCH", "transaction evidence network mismatch", {
      transactionLocated: transaction.found, outputLocated: false, metadataMatched: false, unspent: false,
    });
  }
  if (transaction.txid !== txid) {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-OUTPOINT-MISMATCH", "transaction evidence txid mismatch", {
      transactionLocated: transaction.found, outputLocated: false, metadataMatched: false, unspent: false,
    });
  }
  if (!transaction.found || transaction.rawTransaction === undefined) {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-TRANSACTION-MISSING", "candidate transaction was not located", {
      transactionLocated: false, outputLocated: false, metadataMatched: false, unspent: false,
    });
  }
  const rawTransaction = normalizeChainIoRawTransactionHexV0("transaction.rawTransaction", transaction.rawTransaction);
  if (chainIoTransactionIdFromRawTransactionV0(rawTransaction) !== txid) {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-OUTPOINT-MISMATCH", "transaction bytes do not derive the candidate txid", {
      transactionLocated: true, outputLocated: false, metadataMatched: false, unspent: false,
    });
  }
  let parsed: ChainIoParsedTransactionV0;
  try {
    parsed = parseChainIoCanonicalTransactionV0(rawTransaction);
  } catch (error: unknown) {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-MALFORMED-EVIDENCE", error instanceof Error ? error.message : String(error), {
      transactionLocated: true, outputLocated: false, metadataMatched: false, unspent: false,
    });
  }
  const parsedOutput = parsed.outputs[vout];
  if (parsedOutput === undefined) {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-OUTPUT-MISSING", "candidate output index does not exist", {
      transactionLocated: true, outputLocated: false, metadataMatched: false, unspent: false,
    });
  }
  if (parsedOutput.tokenState !== "none") {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-TOKEN-NOT-PERMITTED", "candidate output carries CashTokens state", {
      transactionLocated: true, outputLocated: true, metadataMatched: false, unspent: false,
    });
  }
  if (parsedOutput.lockingBytecode !== lockingBytecode) {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-LOCKING-PROGRAM-MISMATCH", "candidate locking program does not match transaction bytes", {
      transactionLocated: true, outputLocated: true, metadataMatched: false, unspent: false,
    });
  }
  if (parsedOutput.valueSats !== valueSats) {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-VALUE-MISMATCH", "candidate value does not match transaction bytes", {
      transactionLocated: true, outputLocated: true, metadataMatched: false, unspent: false,
    });
  }

  let output: ChainIoTransactionOutputEvidenceV0;
  try {
    output = await args.provider.lookupTransactionOutputEvidence({ network: "chipnet", txid, vout });
  } catch (error: unknown) {
    return transparentFundingProviderFailureV0(error, {
      transactionLocated: true, outputLocated: true, metadataMatched: false, unspent: false,
    });
  }
  assertAuthenticatedIndexerEvidenceV0("transaction output evidence", output, {
    transactionLocated: true, outputLocated: output.found, metadataMatched: false, unspent: false,
  });
  if (output.network !== "chipnet") {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-NETWORK-MISMATCH", "output evidence network mismatch", {
      transactionLocated: true, outputLocated: output.found, metadataMatched: false, unspent: false,
    });
  }
  if (output.txid !== txid || output.vout !== vout) {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-OUTPOINT-MISMATCH", "output evidence outpoint mismatch", {
      transactionLocated: true, outputLocated: output.found, metadataMatched: false, unspent: false,
    });
  }
  if (!output.found || output.lockingBytecode === undefined || output.valueSats === undefined) {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-OUTPUT-MISSING", "provider did not locate the candidate output", {
      transactionLocated: true, outputLocated: false, metadataMatched: false, unspent: false,
    });
  }
  if (output.lockingBytecode !== lockingBytecode) {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-LOCKING-PROGRAM-MISMATCH", "output evidence locking program mismatch", {
      transactionLocated: true, outputLocated: true, metadataMatched: false, unspent: false,
    });
  }
  if (output.valueSats !== valueSats) {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-VALUE-MISMATCH", "output evidence value mismatch", {
      transactionLocated: true, outputLocated: true, metadataMatched: false, unspent: false,
    });
  }
  let transactionConfirmations: number | undefined;
  let outputConfirmations: number | undefined;
  try {
    transactionConfirmations = assertOptionalNonNegativeSafeIntegerV0(
      "ChainIoTransparentFundingEvidenceV0.transaction.confirmations",
      transaction.confirmations,
    );
    outputConfirmations = assertOptionalNonNegativeSafeIntegerV0(
      "ChainIoTransparentFundingEvidenceV0.output.confirmations",
      output.confirmations,
    );
  } catch (error: unknown) {
    transparentFundingFailureV0(
      "F-APNT-TRANSPARENT-UTXO-MALFORMED-EVIDENCE",
      error instanceof Error ? error.message : String(error),
      { transactionLocated: true, outputLocated: true, metadataMatched: false, unspent: false },
    );
  }
  if (
    transactionConfirmations !== undefined &&
    outputConfirmations !== undefined &&
    transactionConfirmations !== outputConfirmations
  ) {
    transparentFundingFailureV0(
      "F-APNT-TRANSPARENT-UTXO-PROVIDER-AMBIGUOUS",
      "transaction and output confirmation evidence disagree",
      { transactionLocated: true, outputLocated: true, metadataMatched: false, unspent: false },
    );
  }

  if (args.provider.lookupOutpointSpendEvidence === undefined) {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-PROVIDER-UNAUTHENTICATED", "provider lacks independent spend evidence", {
      transactionLocated: true, outputLocated: true, metadataMatched: true, unspent: false,
    });
  }
  let spend: ChainIoOutpointSpendEvidenceV0;
  try {
    spend = await args.provider.lookupOutpointSpendEvidence({ network: "chipnet", txid, vout });
  } catch (error: unknown) {
    return transparentFundingProviderFailureV0(error, {
      transactionLocated: true, outputLocated: true, metadataMatched: true, unspent: false,
    });
  }
  assertAuthenticatedIndexerEvidenceV0("outpoint spend evidence", spend, {
    transactionLocated: true, outputLocated: true, metadataMatched: true, unspent: false,
  });
  if (spend.network !== "chipnet") {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-NETWORK-MISMATCH", "spend evidence network mismatch", {
      transactionLocated: true, outputLocated: true, metadataMatched: true, unspent: false,
    });
  }
  if (spend.txid !== txid || spend.vout !== vout) {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-OUTPOINT-MISMATCH", "spend evidence outpoint mismatch", {
      transactionLocated: true, outputLocated: true, metadataMatched: true, unspent: false,
    });
  }
  if (spend.status === "ambiguous") {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-PROVIDER-AMBIGUOUS", "provider returned ambiguous spend evidence", {
      transactionLocated: true, outputLocated: true, metadataMatched: true, unspent: false,
    });
  }
  if (spend.status !== "unspent") {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-SPENT", "candidate outpoint is not currently unspent", {
      transactionLocated: true, outputLocated: true, metadataMatched: true, unspent: false,
    });
  }

  let utxo: ChainIoTransparentUtxoEvidenceV0 | undefined;
  try {
    utxo = await args.provider.lookupTransparentUtxoEvidence({ network: "chipnet", txid, vout });
  } catch (error: unknown) {
    return transparentFundingProviderFailureV0(error, {
      transactionLocated: true, outputLocated: true, metadataMatched: true, unspent: false,
    });
  }
  if (utxo === undefined) {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-PROVIDER-AMBIGUOUS", "spend and list-unspent evidence are inconsistent", {
      transactionLocated: true, outputLocated: true, metadataMatched: true, unspent: false,
    });
  }
  assertAuthenticatedIndexerEvidenceV0("transparent UTXO evidence", utxo, {
    transactionLocated: true, outputLocated: true, metadataMatched: true, unspent: false,
  });
  if (utxo.network !== "chipnet") {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-NETWORK-MISMATCH", "UTXO evidence network mismatch", {
      transactionLocated: true, outputLocated: true, metadataMatched: true, unspent: false,
    });
  }
  if (utxo.txid !== txid || utxo.vout !== vout) {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-OUTPOINT-MISMATCH", "UTXO evidence outpoint mismatch", {
      transactionLocated: true, outputLocated: true, metadataMatched: true, unspent: false,
    });
  }
  if (utxo.lockingBytecode !== lockingBytecode) {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-LOCKING-PROGRAM-MISMATCH", "UTXO evidence locking program mismatch", {
      transactionLocated: true, outputLocated: true, metadataMatched: true, unspent: false,
    });
  }
  if (utxo.valueSats !== valueSats) {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-VALUE-MISMATCH", "UTXO evidence value mismatch", {
      transactionLocated: true, outputLocated: true, metadataMatched: true, unspent: false,
    });
  }
  if (!utxo.unspent) {
    transparentFundingFailureV0("F-APNT-TRANSPARENT-UTXO-SPENT", "UTXO evidence reports the candidate spent", {
      transactionLocated: true, outputLocated: true, metadataMatched: true, unspent: false,
    });
  }

  const confirmations = outputConfirmations ?? transactionConfirmations;
  if (
    (utxo.status === "confirmed" && (confirmations === undefined || confirmations === 0)) ||
    (utxo.status === "unconfirmed" && confirmations !== undefined && confirmations > 0)
  ) {
    transparentFundingFailureV0(
      "F-APNT-TRANSPARENT-UTXO-PROVIDER-AMBIGUOUS",
      "confirmation and list-unspent status evidence disagree",
      { transactionLocated: true, outputLocated: true, metadataMatched: true, unspent: false },
    );
  }
  const result = Object.freeze({
    version: 0 as const,
    kind: "chain-io-authenticated-transparent-funding-evidence-v0" as const,
    network: "chipnet" as const,
    txid,
    vout,
    valueSats,
    lockingBytecode,
    tokenState: "none" as const,
    transactionFound: true as const,
    outputFound: true as const,
    metadataMatched: true as const,
    unspent: true as const,
    eligibleForImportVerification: true as const,
    locationStatus: confirmations !== undefined && confirmations > 0 ? "confirmed" as const : "mempool-or-unconfirmed" as const,
    ...(confirmations === undefined ? {} : { confirmations }),
    evidenceSource: "fulcrum" as const,
    providerAuthentication: "configured-provider-transport" as const,
    observedAtMs,
    evaluatedAtMs,
    evidenceAgeMs,
    freshnessPolicyMaxAgeMs: CHAIN_IO_TRANSPARENT_FUNDING_EVIDENCE_MAX_AGE_MS_V0,
    freshness: "fresh" as const,
    trustBoundary: INDEXER_TRUST_BOUNDARY_V0,
    evidencePaths: Object.freeze([
      transaction.evidencePath,
      output.evidencePath,
      spend.evidencePath,
      utxo.evidencePath,
    ].sort((left, right) => left.localeCompare(right))),
  });
  authenticatedTransparentFundingEvidenceV0.add(result);
  return result;
}

/** Process-local provenance check; cloned/provider-authored summaries fail. */
export function isChainIoAuthenticatedTransparentFundingEvidenceV0(
  value: unknown,
): value is ChainIoAuthenticatedTransparentFundingEvidenceV0 {
  return typeof value === "object" && value !== null && authenticatedTransparentFundingEvidenceV0.has(value);
}

async function requestFromAnyEndpointV0(
  request: ChainIoFulcrumRequestV0,
  endpoints: readonly ChainIoEndpointV0[],
  method: string,
  params: readonly unknown[],
  timeoutMs: number,
): Promise<unknown> {
  const errors: string[] = [];
  for (const endpoint of endpoints) {
    try {
      return await request(endpoint, method, params, timeoutMs);
    } catch (error: unknown) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(`FulcrumChainIoProviderV0 unable to call ${method}: ${errors.join(" | ")}`);
}

export function createFulcrumChainIoProviderV0(args: CreateFulcrumChainIoProviderV0Args): ChainIoProviderV0 {
  const network = assertNetworkV0("CreateFulcrumChainIoProviderV0Args.network", args.network);
  const endpoints = (args.endpoints ?? defaultFulcrumChainIoEndpointsV0(network)).map(normalizeChainIoEndpointV0);
  if (endpoints.length === 0) {
    throw new Error(`FulcrumChainIoProviderV0 no Fulcrum endpoints configured for network ${network}`);
  }
  if (endpoints.some((endpoint) => endpoint.network !== network)) {
    throw new Error("FulcrumChainIoProviderV0 endpoint network mismatch");
  }
  const timeoutMs = requestTimeoutMsV0(args.requestTimeoutMs);
  // One pool per provider instance: every lookup this provider performs reuses
  // the same open socket per endpoint instead of paying a fresh TLS handshake.
  const request = args.request ?? createPooledFulcrumRequestV0();

  const listUnspentForLockingBytecode = async (lockingBytecode: string): Promise<readonly ElectrumListUnspentEntryV0[]> => {
    const scripthash = electrumScripthashForLockingBytecodeV0(lockingBytecode);
    return parseListUnspentResultV0(await requestFromAnyEndpointV0(
      request,
      endpoints,
      "blockchain.scripthash.listunspent",
      [scripthash],
      timeoutMs,
    ));
  };

  const historyForLockingBytecode = async (lockingBytecode: string): Promise<readonly ElectrumHistoryEntryV0[]> => {
    const scripthash = electrumScripthashForLockingBytecodeV0(lockingBytecode);
    return parseHistoryResultV0(await requestFromAnyEndpointV0(
      request,
      endpoints,
      "blockchain.scripthash.get_history",
      [scripthash],
      timeoutMs,
    ));
  };

  return Object.freeze({
    lookupTransparentUtxosByLockingBytecodeEvidence: async (target) => {
      if (target.network !== network) {
        throw new Error("FulcrumChainIoProviderV0 target network mismatch");
      }
      const lockingBytecode = assertCanonicalHexV0("target.lockingBytecode", target.lockingBytecode);
      const address = target.address === undefined
        ? undefined
        : assertNonEmptyStringV0("target.address", target.address);
      const entries = await listUnspentForLockingBytecode(lockingBytecode);
      return Object.freeze(entries.map((entry) =>
        evidenceFromListEntryV0(network, entry, {
          lockingBytecode,
          ...(address === undefined ? {} : { address }),
        }),
      ));
    },
    lookupTransparentUtxoEvidence: async (outpoint) => {
      if (outpoint.network !== network) {
        throw new Error("FulcrumChainIoProviderV0 outpoint network mismatch");
      }
      const txid = normalizeChainIoTxidV0("outpoint.txid", outpoint.txid);
      const vout = assertNonNegativeSafeIntegerV0("outpoint.vout", outpoint.vout);
      const tx = await requestFromAnyEndpointV0(
        request,
        endpoints,
        "blockchain.transaction.get",
        [txid, true],
        timeoutMs,
      );
      const output = extractOutputFromTransactionV0(tx, vout);
      const entries = await listUnspentForLockingBytecode(output.lockingBytecode);
      const match = entries.find((entry) => entry.tx_hash === txid && entry.tx_pos === vout);
      if (match === undefined) return undefined;
      return evidenceFromListEntryV0(network, match, output);
    },
    lookupTransactionEvidence: async (lookup) => {
      if (lookup.network !== network) {
        throw new Error("FulcrumChainIoProviderV0 transaction lookup network mismatch");
      }
      const txid = normalizeChainIoTxidV0("transaction.txid", lookup.txid);
      try {
        const result = await requestFromAnyEndpointV0(
          request,
          endpoints,
          "blockchain.transaction.get",
          [txid, false],
          timeoutMs,
        );
        const rawTransaction = result === null ? undefined : normalizeChainIoRawTransactionHexV0("Fulcrum transaction raw hex", result);
        return Object.freeze({
          version: CHAIN_IO_EVIDENCE_SCHEMA_V0_VERSION,
          network,
          txid,
          found: rawTransaction !== undefined,
          ...(rawTransaction === undefined ? {} : { rawTransaction }),
          trustBoundary: INDEXER_TRUST_BOUNDARY_V0,
          evidencePath: chainIoEvidenceJsonPathV0({ network, evidenceKind: "transaction", id: txid }),
        });
      } catch (error: unknown) {
        if (!isTransactionNotFoundErrorV0(error)) throw error;
        return Object.freeze({
          version: CHAIN_IO_EVIDENCE_SCHEMA_V0_VERSION,
          network,
          txid,
          found: false,
          trustBoundary: INDEXER_TRUST_BOUNDARY_V0,
          evidencePath: chainIoEvidenceJsonPathV0({ network, evidenceKind: "transaction", id: txid }),
        });
      }
    },
    lookupTransactionOutputEvidence: async (lookup) => {
      if (lookup.network !== network) {
        throw new Error("FulcrumChainIoProviderV0 transaction output lookup network mismatch");
      }
      const txid = normalizeChainIoTxidV0("transactionOutput.txid", lookup.txid);
      const vout = assertNonNegativeSafeIntegerV0("transactionOutput.vout", lookup.vout);
      try {
        const tx = await requestFromAnyEndpointV0(
          request,
          endpoints,
          "blockchain.transaction.get",
          [txid, true],
          timeoutMs,
        );
        const output = extractOutputFromTransactionV0(tx, vout);
        const inclusionFields = transactionInclusionFieldsV0(tx);
        return Object.freeze({
          version: CHAIN_IO_EVIDENCE_SCHEMA_V0_VERSION,
          network,
          txid,
          vout,
          found: true,
          valueSats: output.valueSats,
          lockingBytecode: output.lockingBytecode,
          lockingBytecodeHash32: lockingBytecodeHash32V0(output.lockingBytecode),
          ...(output.address === undefined ? {} : { address: output.address }),
          ...inclusionFields,
          trustBoundary: INDEXER_TRUST_BOUNDARY_V0,
          evidencePath: transactionOutputEvidencePathV0(network, txid, vout),
        });
      } catch (error: unknown) {
        if (!isTransactionNotFoundErrorV0(error) && !(error instanceof Error && error.message.includes("output vout was not found"))) {
          throw error;
        }
        return Object.freeze({
          version: CHAIN_IO_EVIDENCE_SCHEMA_V0_VERSION,
          network,
          txid,
          vout,
          found: false,
          trustBoundary: INDEXER_TRUST_BOUNDARY_V0,
          evidencePath: transactionOutputEvidencePathV0(network, txid, vout),
        });
      }
    },
    lookupOutpointSpendEvidence: async (lookup) => {
      if (lookup.network !== network) {
        throw new Error("FulcrumChainIoProviderV0 outpoint spend lookup network mismatch");
      }
      const txid = normalizeChainIoTxidV0("outpointSpend.txid", lookup.txid);
      const vout = assertNonNegativeSafeIntegerV0("outpointSpend.vout", lookup.vout);
      const baseArgs = { network, txid, vout };

      let output: Readonly<{ lockingBytecode: string }>;
      try {
        const originalTx = await requestFromAnyEndpointV0(
          request,
          endpoints,
          "blockchain.transaction.get",
          [txid, true],
          timeoutMs,
        );
        output = extractOutputFromTransactionV0(originalTx, vout);
      } catch (error: unknown) {
        if (isTransactionNotFoundErrorV0(error) || (error instanceof Error && error.message.includes("output vout was not found"))) {
          return outpointSpendEvidenceBaseV0({
            ...baseArgs,
            status: "not-found",
            reason: "Fulcrum did not find the requested outpoint",
          });
        }
        return outpointSpendEvidenceBaseV0({
          ...baseArgs,
          status: "unavailable",
          reason: `Fulcrum outpoint output lookup failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      }

      let history: readonly ElectrumHistoryEntryV0[];
      try {
        history = await historyForLockingBytecode(output.lockingBytecode);
      } catch (error: unknown) {
        return outpointSpendEvidenceBaseV0({
          ...baseArgs,
          status: "unavailable",
          reason: `Fulcrum script history lookup failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      }

      const matches: Readonly<{ consumptionTxid: string; inputIndex: number }>[] = [];
      for (const entry of history) {
        try {
          const candidateTxid = normalizeChainIoTxidV0("Fulcrum history tx_hash", entry.tx_hash);
          const candidateTx = await requestFromAnyEndpointV0(
            request,
            endpoints,
            "blockchain.transaction.get",
            [candidateTxid, true],
            timeoutMs,
          );
          matches.push(...extractSpendCandidatesFromTransactionV0(candidateTx, {
            txid,
            vout,
            consumptionTxid: candidateTxid,
          }));
        } catch (error: unknown) {
          return outpointSpendEvidenceBaseV0({
            ...baseArgs,
            status: "unavailable",
            reason: `Fulcrum script history transaction scan failed: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }

      if (matches.length === 1) {
        const match = matches[0]!;
        return outpointSpendEvidenceBaseV0({
          ...baseArgs,
          status: "spent-outpoint",
          consumptionTxid: match.consumptionTxid,
          inputIndex: match.inputIndex,
        });
      }
      if (matches.length > 1) {
        return outpointSpendEvidenceBaseV0({
          ...baseArgs,
          status: "ambiguous",
          reason: "Fulcrum script history scan found multiple spending inputs for the outpoint",
        });
      }

      let unspentEntries: readonly ElectrumListUnspentEntryV0[];
      try {
        unspentEntries = await listUnspentForLockingBytecode(output.lockingBytecode);
      } catch (error: unknown) {
        return outpointSpendEvidenceBaseV0({
          ...baseArgs,
          status: "unavailable",
          reason: `Fulcrum script listunspent lookup failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
      if (unspentEntries.some((entry) => entry.tx_hash === txid && entry.tx_pos === vout)) {
        return outpointSpendEvidenceBaseV0({
          ...baseArgs,
          status: "unspent",
          reason: "outpoint is present in script listunspent and no spending input was found in script history",
        });
      }

      return outpointSpendEvidenceBaseV0({
        ...baseArgs,
        status: "unavailable",
        reason: "no spending input was found and Fulcrum did not positively confirm the outpoint is unspent",
      });
    },
    submitRawTransaction: async ({ policy, rawTransaction }) => {
      const policyNetwork = assertNetworkV0("ChainIoRawTransactionSubmissionPolicyV0.network", policy.network);
      if (policyNetwork !== network) {
        throw new Error("FulcrumChainIoProviderV0 submission policy network mismatch");
      }
      normalizeChainIoRawTransactionHexV0("rawTransaction", rawTransaction);
      const refusedEvidence = (
        refusalReason: "unsupported-network" | "chipnet-smoke-flag-required",
      ): ChainIoRawTransactionSubmissionEvidenceV0 => Object.freeze({
        version: CHAIN_IO_EVIDENCE_SCHEMA_V0_VERSION,
        network,
        status: "refused",
        refusalReason,
        trustBoundary: RELAY_SUBMISSION_TRUST_BOUNDARY_V0,
        evidencePath: chainIoEvidenceJsonPathV0({
          network,
          evidenceKind: "raw-transaction-submission",
          id: refusalReason,
        }),
      });
      if (network !== "chipnet") return refusedEvidence("unsupported-network");
      if (policy.allowChipnetSmokeSubmit !== true) return refusedEvidence("chipnet-smoke-flag-required");
      const result = await requestFromAnyEndpointV0(
        request,
        endpoints,
        "blockchain.transaction.broadcast",
        [rawTransaction],
        timeoutMs,
      );
      const txid = normalizeChainIoTxidV0("Fulcrum broadcast txid", result);
      return Object.freeze({
        version: CHAIN_IO_EVIDENCE_SCHEMA_V0_VERSION,
        network,
        status: "submitted",
        txid,
        trustBoundary: RELAY_SUBMISSION_TRUST_BOUNDARY_V0,
        evidencePath: chainIoEvidenceJsonPathV0({
          network,
          evidenceKind: "raw-transaction-submission",
          id: txid,
        }),
      });
    },
  });
}

/* ------------------------------------------------------------------------- *
 * Batch E (Task 16.6): transaction location and inclusion evidence.
 *
 * `packages/reference-aggregator` owns settlement assembly and CashVM results;
 * `packages/reference-cli` owns orchestration. Neither may decide, from its own
 * state, whether a transaction is on chain. This authenticator is the only
 * place that answers "is it located, and is it included", and it answers only
 * from indexer evidence this package already produces.
 *
 * It composes two existing provider lookups rather than adding a third network
 * method: `lookupTransactionEvidence` supplies the raw transaction — from which
 * the identifier is RE-DERIVED and required to match, never copied — and
 * `lookupTransactionOutputEvidence` supplies block placement and confirmation
 * depth. Every absence, disagreement, or ambiguity fails closed to
 * `not-located` or `unavailable` with a code, never to a partial success.
 *
 * **Non-claims, carried in the evidence itself.** An indexer report is not
 * consensus authority, chain inclusion is not wallet acceptance, and location is
 * not APNT protocol truth.
 * ------------------------------------------------------------------------- */

export const CHAIN_IO_TRANSACTION_LOCATION_EVIDENCE_V0_CLASSIFICATION =
  "chain-io-transaction-location-and-inclusion-evidence-v0";

export type ChainIoTransactionLocationStatusV0 =
  | "located-confirmed"
  | "located-unconfirmed"
  | "not-located"
  | "unavailable";

export type ChainIoTransactionLocationFailureCodeV0 =
  | "chain-io-transaction-not-found"
  | "chain-io-transaction-identity-mismatch"
  | "chain-io-transaction-raw-bytes-absent"
  | "chain-io-transaction-output-absent"
  | "chain-io-transaction-confirmation-ambiguous"
  | "chain-io-transaction-network-mismatch"
  | "chain-io-transaction-provider-unavailable";

export type ChainIoTransactionLocationEvidenceV0 = Readonly<{
  version: typeof CHAIN_IO_EVIDENCE_SCHEMA_V0_VERSION;
  classification: typeof CHAIN_IO_TRANSACTION_LOCATION_EVIDENCE_V0_CLASSIFICATION;
  network: ChainNetworkV0;
  txid: string;
  status: ChainIoTransactionLocationStatusV0;
  /** Re-derived from the raw bytes the indexer returned, never copied. */
  derivedTxidFromRawTransaction: string | null;
  rawTransactionBytes: number | null;
  blockhash: string | null;
  confirmations: number | null;
  blocktime: number | null;
  failureCode: ChainIoTransactionLocationFailureCodeV0 | null;
  failureDetail: string | null;
  trustBoundary: ChainIoTrustBoundaryV0;
  evidencePath: string;
  /** Fixed non-claims. An indexer report is evidence, not authority. */
  indexerReportIsConsensusAuthority: false;
  chainInclusionIsWalletAcceptance: false;
  chainInclusionIsApntProtocolTruth: false;
}>;

function chainIoTransactionLocationEvidenceV0(
  args: Readonly<{
    network: ChainNetworkV0;
    txid: string;
    status: ChainIoTransactionLocationStatusV0;
    derivedTxidFromRawTransaction?: string | null;
    rawTransactionBytes?: number | null;
    blockhash?: string | null;
    confirmations?: number | null;
    blocktime?: number | null;
    failureCode?: ChainIoTransactionLocationFailureCodeV0 | null;
    failureDetail?: string | null;
  }>,
): ChainIoTransactionLocationEvidenceV0 {
  return Object.freeze({
    version: CHAIN_IO_EVIDENCE_SCHEMA_V0_VERSION,
    classification: CHAIN_IO_TRANSACTION_LOCATION_EVIDENCE_V0_CLASSIFICATION,
    network: args.network,
    txid: args.txid,
    status: args.status,
    derivedTxidFromRawTransaction: args.derivedTxidFromRawTransaction ?? null,
    rawTransactionBytes: args.rawTransactionBytes ?? null,
    blockhash: args.blockhash ?? null,
    confirmations: args.confirmations ?? null,
    blocktime: args.blocktime ?? null,
    failureCode: args.failureCode ?? null,
    failureDetail: args.failureDetail ?? null,
    trustBoundary: INDEXER_TRUST_BOUNDARY_V0,
    evidencePath: chainIoEvidenceJsonPathV0({
      network: args.network,
      evidenceKind: "transaction",
      id: `${args.txid}-location`,
    }),
    indexerReportIsConsensusAuthority: false,
    chainInclusionIsWalletAcceptance: false,
    chainInclusionIsApntProtocolTruth: false,
  });
}

export async function lookupChainIoTransactionLocationEvidenceV0(args: Readonly<{
  provider: ChainIoProviderV0;
  network: ChainNetworkV0;
  txid: string;
  /**
   * The output index used to obtain block placement. Location is a property of
   * the transaction, but Fulcrum reports placement per output, so one existing
   * output index must be named rather than assumed.
   */
  vout: number;
}>): Promise<ChainIoTransactionLocationEvidenceV0> {
  const network = assertNetworkV0("ChainIoTransactionLocation.network", args.network);
  const txid = normalizeChainIoTxidV0("ChainIoTransactionLocation.txid", args.txid);
  const vout = assertNonNegativeSafeIntegerV0("ChainIoTransactionLocation.vout", args.vout);

  let transaction: ChainIoTransactionEvidenceV0;
  let output: ChainIoTransactionOutputEvidenceV0;
  try {
    transaction = await args.provider.lookupTransactionEvidence({ network, txid });
    output = await args.provider.lookupTransactionOutputEvidence({ network, txid, vout });
  } catch (error: unknown) {
    return chainIoTransactionLocationEvidenceV0({
      network,
      txid,
      status: "unavailable",
      failureCode: "chain-io-transaction-provider-unavailable",
      failureDetail: error instanceof Error ? error.message : String(error),
    });
  }
  if (transaction.network !== network || output.network !== network) {
    return chainIoTransactionLocationEvidenceV0({
      network,
      txid,
      status: "unavailable",
      failureCode: "chain-io-transaction-network-mismatch",
      failureDetail: "provider evidence was produced for a different network",
    });
  }
  if (!transaction.found) {
    return chainIoTransactionLocationEvidenceV0({
      network,
      txid,
      status: "not-located",
      failureCode: "chain-io-transaction-not-found",
      failureDetail: "the indexer reports no transaction at this identifier",
    });
  }
  if (transaction.rawTransaction === undefined) {
    return chainIoTransactionLocationEvidenceV0({
      network,
      txid,
      status: "unavailable",
      failureCode: "chain-io-transaction-raw-bytes-absent",
      failureDetail:
        "the indexer reported the transaction without its bytes, so its identity cannot be re-derived",
    });
  }
  const derivedTxid = chainIoTransactionIdFromRawTransactionV0(transaction.rawTransaction);
  const rawTransactionBytes = transaction.rawTransaction.length / 2;
  if (derivedTxid !== txid) {
    return chainIoTransactionLocationEvidenceV0({
      network,
      txid,
      status: "unavailable",
      derivedTxidFromRawTransaction: derivedTxid,
      rawTransactionBytes,
      failureCode: "chain-io-transaction-identity-mismatch",
      failureDetail: "the returned bytes do not hash to the requested transaction identifier",
    });
  }
  if (!output.found) {
    return chainIoTransactionLocationEvidenceV0({
      network,
      txid,
      status: "unavailable",
      derivedTxidFromRawTransaction: derivedTxid,
      rawTransactionBytes,
      failureCode: "chain-io-transaction-output-absent",
      failureDetail: `the indexer located the transaction but not output ${String(vout)}`,
    });
  }
  const confirmations = output.confirmations;
  if (confirmations === undefined || !Number.isSafeInteger(confirmations) || confirmations < 0) {
    return chainIoTransactionLocationEvidenceV0({
      network,
      txid,
      status: "unavailable",
      derivedTxidFromRawTransaction: derivedTxid,
      rawTransactionBytes,
      blockhash: output.blockhash ?? null,
      failureCode: "chain-io-transaction-confirmation-ambiguous",
      failureDetail: "the indexer reported no usable confirmation depth",
    });
  }
  // A confirmed placement must carry a block. Anything else is ambiguous and
  // fails closed rather than being rounded up into an inclusion claim.
  const blockhash = output.blockhash ?? null;
  if (confirmations > 0 && blockhash === null) {
    return chainIoTransactionLocationEvidenceV0({
      network,
      txid,
      status: "unavailable",
      derivedTxidFromRawTransaction: derivedTxid,
      rawTransactionBytes,
      confirmations,
      failureCode: "chain-io-transaction-confirmation-ambiguous",
      failureDetail: "the indexer reported confirmations without a block hash",
    });
  }
  return chainIoTransactionLocationEvidenceV0({
    network,
    txid,
    status: confirmations > 0 ? "located-confirmed" : "located-unconfirmed",
    derivedTxidFromRawTransaction: derivedTxid,
    rawTransactionBytes,
    blockhash,
    confirmations,
    blocktime: output.blocktime ?? null,
  });
}
