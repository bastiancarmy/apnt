// Maturity: preview — measured zero published importers and zero published
// artifacts referencing its APNTISV1 wire magic. The import-created-note
// relation v1 identity itself is frozen (AGENTS.md, "What is frozen"), but
// nothing in this public tree currently exercises this statement encoding.
// See AGENTS.md, "The maturity ladder".
import { asBytes32, copyBytes, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { APNT_V1_BCH_MAX_MONEY_SATS } from "./apnt_bundle_backed_private_note_v1.js";
import {
  APNT_IMPORT_CREATED_NOTE_RELATION_V1_IDENTITY,
  deriveAPNTImportCreationScopeCommitmentV1,
  normalizeAPNTImportCreationScopeV1,
  parseAPNTImportCreationScopeV1,
  serializeAPNTImportCreationScopeV1,
  type APNTImportCreationScopeNetworkV1,
  type APNTImportCreationScopeV1,
} from "./apnt_import_creation_scope_v1.js";
import { serializeAPNTTransitionOutpointV1, type APNTTransitionOutpointV1 } from "./apnt_transaction_projection_v1.js";

export const APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_VERSION = 1;
export const APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_MAGIC = "APNTISV1";
export const APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_DOMAIN =
  "bch-cloak-apnt-v0:import-created-note-statement-v1";
export const APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_COMMITMENT_DOMAIN =
  "bch-cloak-apnt-v0:import-created-note-statement-commitment-v1";
export const APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_MAX_LOGICAL_NOTES = 1_024;
export const APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_MAX_BACKING_CELLS = 4_096;
export const APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_MAX_SCOPES = 1_024;

const MAGIC = new TextEncoder().encode(APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_MAGIC);
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });

export type APNTImportFundingIdentityV1 = Readonly<{
  outpoint: APNTTransitionOutpointV1;
  valueSats: bigint;
  importFundingCellCommitment32: Bytes32;
  eligibilityStatementBind32: Bytes32;
  outputFingerprint32: Bytes32;
}>;

export type APNTImportSealOpenIdentityV1 = Readonly<{
  sealCommitment32: Bytes32;
}>;

/** Proof-side seal close identity. The final settlement txid is intentionally absent. */
export type APNTImportSealCloseIdentityV1 = Readonly<{
  consumedOutpoint: APNTTransitionOutpointV1;
  inputIndex: number;
  previousSealCommitment32: Bytes32;
}>;

export type APNTImportCreatedLogicalNoteV1 = Readonly<{
  createdNoteCommitment32: Bytes32;
  creationScope32: Bytes32;
  recoveryPacketIndex: number;
  recoveryPacketHash32: Bytes32;
}>;

export type APNTImportCreatedBackingCellV1 = Readonly<{
  outputIndex: number;
  sealCellCommitment32: Bytes32;
  lockingProfileId32: Bytes32;
}>;

export type APNTImportCreationScopeReferenceV1 = Readonly<{
  creationScope32: Bytes32;
  scope: APNTImportCreationScopeV1;
}>;

/**
 * Closed non-circular statement. The actual projection is a separate public
 * proving input whose canonical commitment is bound here. The final
 * settlement transaction ID and all unlocking material are excluded.
 */
export type APNTImportCreatedNoteStatementV1 = Readonly<{
  version: typeof APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_VERSION;
  domain: typeof APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_DOMAIN;
  network: APNTImportCreationScopeNetworkV1;
  relationIdentity: typeof APNT_IMPORT_CREATED_NOTE_RELATION_V1_IDENTITY;
  privacyProfileId32: Bytes32;
  importFunding: APNTImportFundingIdentityV1;
  sealOpen: APNTImportSealOpenIdentityV1;
  sealClose: APNTImportSealCloseIdentityV1;
  settlementProjectionCommitment32: Bytes32;
  createdLogicalNotes: readonly APNTImportCreatedLogicalNoteV1[];
  createdBackingCells: readonly APNTImportCreatedBackingCellV1[];
  importCreationScopes: readonly APNTImportCreationScopeReferenceV1[];
  recoveryPacketTableCommitment32: Bytes32;
  authorizedImportFeeSats: bigint;
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

function assertU32(name: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new Error(`${name} must be a u32 number`);
  }
  return value;
}

function assertBchValue(name: string, value: unknown, positive = false): bigint {
  if (typeof value !== "bigint" || value < (positive ? 1n : 0n) || value > APNT_V1_BCH_MAX_MONEY_SATS) {
    throw new Error(`${name} must be a ${positive ? "positive" : "non-negative"} BCH bigint within range`);
  }
  return value;
}

function assertNonzeroBytes32(name: string, value: unknown): Bytes32 {
  if (!(value instanceof Uint8Array)) throw new Error(`${name} must be a Uint8Array`);
  const bytes = asBytes32(name, value);
  if (bytes.every((byte) => byte === 0)) throw new Error(`${name} must not be all zero`);
  return bytes;
}

function normalizeNetwork(value: unknown): APNTImportCreationScopeNetworkV1 {
  if (value !== "chipnet" && value !== "mainnet" && value !== "regtest") {
    throw new Error("APNTImportCreatedNoteStatementV1.network is unsupported");
  }
  return value;
}

function normalizeOutpoint(name: string, value: unknown): APNTTransitionOutpointV1 {
  assertRecord(name, value);
  assertKnownKeys(name, value, ["txid32", "vout"]);
  return Object.freeze({
    txid32: assertNonzeroBytes32(`${name}.txid32`, value.txid32),
    vout: assertU32(`${name}.vout`, value.vout),
  });
}

function normalizeImportFunding(value: unknown): APNTImportFundingIdentityV1 {
  const name = "APNTImportCreatedNoteStatementV1.importFunding";
  assertRecord(name, value);
  assertKnownKeys(name, value, [
    "outpoint", "valueSats", "importFundingCellCommitment32", "eligibilityStatementBind32",
    "outputFingerprint32",
  ]);
  return Object.freeze({
    outpoint: normalizeOutpoint(`${name}.outpoint`, value.outpoint),
    valueSats: assertBchValue(`${name}.valueSats`, value.valueSats, true),
    importFundingCellCommitment32: assertNonzeroBytes32(
      `${name}.importFundingCellCommitment32`, value.importFundingCellCommitment32,
    ),
    eligibilityStatementBind32: assertNonzeroBytes32(
      `${name}.eligibilityStatementBind32`, value.eligibilityStatementBind32,
    ),
    outputFingerprint32: assertNonzeroBytes32(`${name}.outputFingerprint32`, value.outputFingerprint32),
  });
}

function normalizeSealOpen(value: unknown): APNTImportSealOpenIdentityV1 {
  const name = "APNTImportCreatedNoteStatementV1.sealOpen";
  assertRecord(name, value);
  assertKnownKeys(name, value, ["sealCommitment32"]);
  return Object.freeze({ sealCommitment32: assertNonzeroBytes32(`${name}.sealCommitment32`, value.sealCommitment32) });
}

function normalizeSealClose(value: unknown): APNTImportSealCloseIdentityV1 {
  const name = "APNTImportCreatedNoteStatementV1.sealClose";
  assertRecord(name, value);
  assertKnownKeys(name, value, ["consumedOutpoint", "inputIndex", "previousSealCommitment32"]);
  return Object.freeze({
    consumedOutpoint: normalizeOutpoint(`${name}.consumedOutpoint`, value.consumedOutpoint),
    inputIndex: assertU32(`${name}.inputIndex`, value.inputIndex),
    previousSealCommitment32: assertNonzeroBytes32(
      `${name}.previousSealCommitment32`, value.previousSealCommitment32,
    ),
  });
}

function compareBytes(left: Uint8Array, right: Uint8Array): number {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const difference = left[index]! - right[index]!;
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

function outpointsEqual(left: APNTTransitionOutpointV1, right: APNTTransitionOutpointV1): boolean {
  return left.vout === right.vout && bytesEqual(left.txid32, right.txid32);
}

async function normalizeScopeReferences(value: unknown): Promise<readonly APNTImportCreationScopeReferenceV1[]> {
  const name = "APNTImportCreatedNoteStatementV1.importCreationScopes";
  if (!Array.isArray(value) || value.length === 0 || value.length > APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_MAX_SCOPES) {
    throw new Error(`${name} must be a non-empty bounded array`);
  }
  const references = await Promise.all(value.map(async (candidate, index) => {
    const itemName = `${name}[${String(index)}]`;
    assertRecord(itemName, candidate);
    assertKnownKeys(itemName, candidate, ["creationScope32", "scope"]);
    const scope = normalizeAPNTImportCreationScopeV1(candidate.scope);
    const creationScope32 = assertNonzeroBytes32(`${itemName}.creationScope32`, candidate.creationScope32);
    if (!bytesEqual(await deriveAPNTImportCreationScopeCommitmentV1(scope), creationScope32)) {
      throw new Error(`${itemName}.creationScope32 does not match scope`);
    }
    return Object.freeze({ creationScope32, scope });
  }));
  references.sort((left, right) => compareBytes(left.creationScope32, right.creationScope32));
  if (new Set(references.map((item) => bytesKey(item.creationScope32))).size !== references.length) {
    throw new Error(`${name} contains duplicate scope commitments`);
  }
  return Object.freeze(references);
}

function normalizeLogicalNotes(value: unknown): readonly APNTImportCreatedLogicalNoteV1[] {
  const name = "APNTImportCreatedNoteStatementV1.createdLogicalNotes";
  if (!Array.isArray(value) || value.length === 0 || value.length > APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_MAX_LOGICAL_NOTES) {
    throw new Error(`${name} must be a non-empty bounded array`);
  }
  const notes = value.map((candidate, index) => {
    const itemName = `${name}[${String(index)}]`;
    assertRecord(itemName, candidate);
    assertKnownKeys(itemName, candidate, [
      "createdNoteCommitment32", "creationScope32", "recoveryPacketIndex", "recoveryPacketHash32",
    ]);
    return Object.freeze({
      createdNoteCommitment32: assertNonzeroBytes32(`${itemName}.createdNoteCommitment32`, candidate.createdNoteCommitment32),
      creationScope32: assertNonzeroBytes32(`${itemName}.creationScope32`, candidate.creationScope32),
      recoveryPacketIndex: assertU32(`${itemName}.recoveryPacketIndex`, candidate.recoveryPacketIndex),
      recoveryPacketHash32: assertNonzeroBytes32(`${itemName}.recoveryPacketHash32`, candidate.recoveryPacketHash32),
    });
  }).sort((left, right) => compareBytes(left.createdNoteCommitment32, right.createdNoteCommitment32));
  if (new Set(notes.map((item) => bytesKey(item.createdNoteCommitment32))).size !== notes.length ||
      new Set(notes.map((item) => bytesKey(item.recoveryPacketHash32))).size !== notes.length ||
      notes.some((item, index) => item.recoveryPacketIndex !== index)) {
    throw new Error(`${name} is not canonical or contains duplicate identities`);
  }
  return Object.freeze(notes);
}

function normalizeBackingCells(value: unknown): readonly APNTImportCreatedBackingCellV1[] {
  const name = "APNTImportCreatedNoteStatementV1.createdBackingCells";
  if (!Array.isArray(value) || value.length === 0 || value.length > APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_MAX_BACKING_CELLS) {
    throw new Error(`${name} must be a non-empty bounded array`);
  }
  const cells = value.map((candidate, index) => {
    const itemName = `${name}[${String(index)}]`;
    assertRecord(itemName, candidate);
    assertKnownKeys(itemName, candidate, ["outputIndex", "sealCellCommitment32", "lockingProfileId32"]);
    return Object.freeze({
      outputIndex: assertU32(`${itemName}.outputIndex`, candidate.outputIndex),
      sealCellCommitment32: assertNonzeroBytes32(`${itemName}.sealCellCommitment32`, candidate.sealCellCommitment32),
      lockingProfileId32: assertNonzeroBytes32(`${itemName}.lockingProfileId32`, candidate.lockingProfileId32),
    });
  }).sort((left, right) => left.outputIndex - right.outputIndex);
  if (new Set(cells.map((item) => String(item.outputIndex))).size !== cells.length ||
      new Set(cells.map((item) => bytesKey(item.sealCellCommitment32))).size !== cells.length) {
    throw new Error(`${name} contains duplicate identities`);
  }
  return Object.freeze(cells);
}

export async function normalizeAPNTImportCreatedNoteStatementV1(
  value: unknown,
): Promise<APNTImportCreatedNoteStatementV1> {
  const name = "APNTImportCreatedNoteStatementV1";
  assertRecord(name, value);
  assertKnownKeys(name, value, [
    "version", "domain", "network", "relationIdentity", "privacyProfileId32", "importFunding",
    "sealOpen", "sealClose", "settlementProjectionCommitment32", "createdLogicalNotes",
    "createdBackingCells", "importCreationScopes", "recoveryPacketTableCommitment32",
    "authorizedImportFeeSats",
  ]);
  if (value.version !== APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_VERSION ||
      value.domain !== APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_DOMAIN ||
      value.relationIdentity !== APNT_IMPORT_CREATED_NOTE_RELATION_V1_IDENTITY) {
    throw new Error(`${name} has an unsupported identity`);
  }
  const network = normalizeNetwork(value.network);
  const privacyProfileId32 = assertNonzeroBytes32(`${name}.privacyProfileId32`, value.privacyProfileId32);
  const importFunding = normalizeImportFunding(value.importFunding);
  const sealOpen = normalizeSealOpen(value.sealOpen);
  const sealClose = normalizeSealClose(value.sealClose);
  const settlementProjectionCommitment32 = assertNonzeroBytes32(
    `${name}.settlementProjectionCommitment32`, value.settlementProjectionCommitment32,
  );
  const createdLogicalNotes = normalizeLogicalNotes(value.createdLogicalNotes);
  const createdBackingCells = normalizeBackingCells(value.createdBackingCells);
  const importCreationScopes = await normalizeScopeReferences(value.importCreationScopes);
  if (!outpointsEqual(importFunding.outpoint, sealClose.consumedOutpoint) ||
      !bytesEqual(sealOpen.sealCommitment32, sealClose.previousSealCommitment32)) {
    throw new Error(`${name} import funding and seal-close identity mismatch`);
  }
  const scopeKeys = new Set(importCreationScopes.map((reference) => bytesKey(reference.creationScope32)));
  for (const reference of importCreationScopes) {
    const scope = reference.scope;
    if (scope.network !== network || scope.relationIdentity !== APNT_IMPORT_CREATED_NOTE_RELATION_V1_IDENTITY ||
        !bytesEqual(scope.privacyProfileId32, privacyProfileId32) ||
        !outpointsEqual(scope.importFundingOutpoint, importFunding.outpoint)) {
      throw new Error(`${name} import creation scope identity mismatch`);
    }
  }
  if (createdLogicalNotes.some((note) => !scopeKeys.has(bytesKey(note.creationScope32))) ||
      importCreationScopes.some((reference) => !createdLogicalNotes.some(
        (note) => bytesEqual(note.creationScope32, reference.creationScope32),
      ))) {
    throw new Error(`${name} creation scope references are incomplete`);
  }
  return Object.freeze({
    version: APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_VERSION,
    domain: APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_DOMAIN,
    network,
    relationIdentity: APNT_IMPORT_CREATED_NOTE_RELATION_V1_IDENTITY,
    privacyProfileId32,
    importFunding,
    sealOpen,
    sealClose,
    settlementProjectionCommitment32,
    createdLogicalNotes,
    createdBackingCells,
    importCreationScopes,
    recoveryPacketTableCommitment32: assertNonzeroBytes32(
      `${name}.recoveryPacketTableCommitment32`, value.recoveryPacketTableCommitment32,
    ),
    authorizedImportFeeSats: assertBchValue(`${name}.authorizedImportFeeSats`, value.authorizedImportFeeSats),
  });
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

function writeU16(value: number): Uint8Array { return Uint8Array.of(value & 0xff, (value >>> 8) & 0xff); }
function writeU32(value: number): Uint8Array {
  return Uint8Array.of(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}
function writeU64(value: bigint): Uint8Array {
  return Uint8Array.from({ length: 8 }, (_unused, index) => Number((value >> BigInt(index * 8)) & 0xffn));
}
function encodeBytes(value: Uint8Array): Uint8Array { return concatBytes([writeU32(value.length), value]); }
function networkByte(value: APNTImportCreationScopeNetworkV1): number { return value === "chipnet" ? 0 : value === "mainnet" ? 1 : 2; }
function networkFromByte(value: number): APNTImportCreationScopeNetworkV1 {
  if (value === 0) return "chipnet";
  if (value === 1) return "mainnet";
  if (value === 2) return "regtest";
  throw new Error("APNTImportCreatedNoteStatementV1 bytes have unsupported network");
}

function encodeNormalized(statement: APNTImportCreatedNoteStatementV1): Uint8Array {
  const domain = TEXT_ENCODER.encode(statement.domain);
  const relationIdentity = TEXT_ENCODER.encode(statement.relationIdentity);
  return concatBytes([
    MAGIC, Uint8Array.of(statement.version), writeU16(domain.length), domain,
    Uint8Array.of(networkByte(statement.network)), writeU16(relationIdentity.length), relationIdentity,
    statement.privacyProfileId32, serializeAPNTTransitionOutpointV1(statement.importFunding.outpoint),
    writeU64(statement.importFunding.valueSats), statement.importFunding.importFundingCellCommitment32,
    statement.importFunding.eligibilityStatementBind32, statement.importFunding.outputFingerprint32,
    statement.sealOpen.sealCommitment32, serializeAPNTTransitionOutpointV1(statement.sealClose.consumedOutpoint),
    writeU32(statement.sealClose.inputIndex), statement.sealClose.previousSealCommitment32,
    statement.settlementProjectionCommitment32,
    writeU32(statement.createdLogicalNotes.length),
    ...statement.createdLogicalNotes.map((note) => concatBytes([
      note.createdNoteCommitment32, note.creationScope32, writeU32(note.recoveryPacketIndex), note.recoveryPacketHash32,
    ])),
    writeU32(statement.createdBackingCells.length),
    ...statement.createdBackingCells.map((cell) => concatBytes([
      writeU32(cell.outputIndex), cell.sealCellCommitment32, cell.lockingProfileId32,
    ])),
    writeU32(statement.importCreationScopes.length),
    ...statement.importCreationScopes.map((reference) => concatBytes([
      reference.creationScope32, encodeBytes(serializeAPNTImportCreationScopeV1(reference.scope)),
    ])),
    statement.recoveryPacketTableCommitment32, writeU64(statement.authorizedImportFeeSats),
  ]);
}

export async function serializeAPNTImportCreatedNoteStatementV1(value: unknown): Promise<Uint8Array> {
  return encodeNormalized(await normalizeAPNTImportCreatedNoteStatementV1(value));
}

class Reader {
  private offset = 0;
  public constructor(private readonly bytes: Uint8Array) {}
  public take(name: string, length: number): Uint8Array {
    if (!Number.isSafeInteger(length) || length < 0 || this.offset + length > this.bytes.length) {
      throw new Error(`APNTImportCreatedNoteStatementV1 bytes are truncated at ${name}`);
    }
    const output = this.bytes.slice(this.offset, this.offset + length); this.offset += length; return output;
  }
  public u8(name: string): number { return this.take(name, 1)[0]!; }
  public u16(name: string): number { const value = this.take(name, 2); return value[0]! | (value[1]! << 8); }
  public u32(name: string): number {
    const value = this.take(name, 4); return (value[0]! | (value[1]! << 8) | (value[2]! << 16) | (value[3]! << 24)) >>> 0;
  }
  public u64(name: string): bigint {
    const value = this.take(name, 8); return value.reduce((sum, byte, index) => sum | (BigInt(byte) << BigInt(index * 8)), 0n);
  }
  public bytes32(name: string): Bytes32 { return asBytes32(name, this.take(name, 32)); }
  public blob(name: string): Uint8Array { return this.take(name, this.u32(`${name}.length`)); }
  public done(): boolean { return this.offset === this.bytes.length; }
}

function readText(reader: Reader, name: string): string {
  try { return TEXT_DECODER.decode(reader.take(name, reader.u16(`${name}.length`))); }
  catch { throw new Error(`APNTImportCreatedNoteStatementV1 bytes have invalid ${name}`); }
}

function readOutpoint(reader: Reader, name: string): APNTTransitionOutpointV1 {
  return Object.freeze({
    txid32: asBytes32(`${name}.txid32`, reader.take(`${name}.txid32`, 32).reverse()),
    vout: reader.u32(`${name}.vout`),
  });
}

export async function parseAPNTImportCreatedNoteStatementV1(value: unknown): Promise<APNTImportCreatedNoteStatementV1> {
  if (!(value instanceof Uint8Array)) throw new Error("APNTImportCreatedNoteStatementV1 bytes must be a Uint8Array");
  const source = copyBytes(value); const reader = new Reader(source);
  if (!bytesEqual(reader.take("magic", MAGIC.length), MAGIC)) throw new Error("APNTImportCreatedNoteStatementV1 bytes have invalid magic");
  const version = reader.u8("version"); const domain = readText(reader, "domain");
  const network = networkFromByte(reader.u8("network")); const relationIdentity = readText(reader, "relationIdentity");
  const privacyProfileId32 = reader.bytes32("privacyProfileId32");
  const importFunding = {
    outpoint: readOutpoint(reader, "importFunding.outpoint"), valueSats: reader.u64("importFunding.valueSats"),
    importFundingCellCommitment32: reader.bytes32("importFunding.importFundingCellCommitment32"),
    eligibilityStatementBind32: reader.bytes32("importFunding.eligibilityStatementBind32"),
    outputFingerprint32: reader.bytes32("importFunding.outputFingerprint32"),
  };
  const sealOpen = { sealCommitment32: reader.bytes32("sealOpen.sealCommitment32") };
  const sealClose = {
    consumedOutpoint: readOutpoint(reader, "sealClose.consumedOutpoint"), inputIndex: reader.u32("sealClose.inputIndex"),
    previousSealCommitment32: reader.bytes32("sealClose.previousSealCommitment32"),
  };
  const settlementProjectionCommitment32 = reader.bytes32("settlementProjectionCommitment32");
  const logicalCount = reader.u32("createdLogicalNotes.count");
  if (logicalCount === 0 || logicalCount > APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_MAX_LOGICAL_NOTES) throw new Error("APNTImportCreatedNoteStatementV1 logical-note count is invalid");
  const createdLogicalNotes = Array.from({ length: logicalCount }, () => ({
    createdNoteCommitment32: reader.bytes32("createdLogicalNote.createdNoteCommitment32"),
    creationScope32: reader.bytes32("createdLogicalNote.creationScope32"),
    recoveryPacketIndex: reader.u32("createdLogicalNote.recoveryPacketIndex"),
    recoveryPacketHash32: reader.bytes32("createdLogicalNote.recoveryPacketHash32"),
  }));
  const cellCount = reader.u32("createdBackingCells.count");
  if (cellCount === 0 || cellCount > APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_MAX_BACKING_CELLS) throw new Error("APNTImportCreatedNoteStatementV1 backing-cell count is invalid");
  const createdBackingCells = Array.from({ length: cellCount }, () => ({
    outputIndex: reader.u32("createdBackingCell.outputIndex"),
    sealCellCommitment32: reader.bytes32("createdBackingCell.sealCellCommitment32"),
    lockingProfileId32: reader.bytes32("createdBackingCell.lockingProfileId32"),
  }));
  const scopeCount = reader.u32("importCreationScopes.count");
  if (scopeCount === 0 || scopeCount > APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_MAX_SCOPES) throw new Error("APNTImportCreatedNoteStatementV1 scope count is invalid");
  const importCreationScopes = [];
  for (let index = 0; index < scopeCount; index += 1) {
    importCreationScopes.push({
      creationScope32: reader.bytes32("importCreationScope.creationScope32"),
      scope: parseAPNTImportCreationScopeV1(reader.blob("importCreationScope.scope")),
    });
  }
  const normalized = await normalizeAPNTImportCreatedNoteStatementV1({
    version, domain, network, relationIdentity, privacyProfileId32, importFunding, sealOpen, sealClose,
    settlementProjectionCommitment32, createdLogicalNotes, createdBackingCells, importCreationScopes,
    recoveryPacketTableCommitment32: reader.bytes32("recoveryPacketTableCommitment32"),
    authorizedImportFeeSats: reader.u64("authorizedImportFeeSats"),
  });
  if (!reader.done()) throw new Error("APNTImportCreatedNoteStatementV1 bytes contain trailing data");
  if (!bytesEqual(source, encodeNormalized(normalized))) throw new Error("APNTImportCreatedNoteStatementV1 bytes are not canonical");
  return normalized;
}

export async function deriveAPNTImportCreatedNoteStatementCommitmentV1(value: unknown): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_IMPORT_CREATED_NOTE_STATEMENT_V1_COMMITMENT_DOMAIN,
    await serializeAPNTImportCreatedNoteStatementV1(value),
  );
}
