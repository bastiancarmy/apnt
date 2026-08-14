import { asBytes32, bytesToHex, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import {
  importPrivateNoteCheckpointHashV0,
  serializeImportPrivateNoteCheckpointV0,
  type ImportPrivateNoteCheckpointV0,
} from "./import.js";
import {
  normalizeNoteTreeSnapshotV0,
  type NoteTreeSnapshotV0,
} from "./note_tree.js";
import { type StateCellNetworkV0 } from "./state.js";
import { serializeDeterministicUtf8 } from "./serialization.js";

export const IMPORT_PRIVATE_NOTE_EVIDENCE_V0_VERSION = 0;
export const IMPORT_PRIVATE_NOTE_EVIDENCE_V0_KIND =
  "bch-cloak-apnt-v0-import-private-note-evidence";
export const IMPORT_PRIVATE_NOTE_EVIDENCE_V0_HASH_DOMAIN =
  "bch-cloak-apnt-v0:import-private-note-evidence";

export type ImportPrivateNoteEvidenceV0 = Readonly<{
  version: typeof IMPORT_PRIVATE_NOTE_EVIDENCE_V0_VERSION;
  kind: typeof IMPORT_PRIVATE_NOTE_EVIDENCE_V0_KIND;
  network: StateCellNetworkV0;
  checkpointHash: Bytes32;
  checkpoint: ImportPrivateNoteCheckpointV0;
  noteTree: NoteTreeSnapshotV0;
  createdAt: string;
}>;

export type BuildImportPrivateNoteEvidenceV0Args = Readonly<{
  checkpoint: ImportPrivateNoteCheckpointV0;
  noteTree: NoteTreeSnapshotV0;
  createdAt: string;
}>;

function assertCreatedAt(createdAt: string): void {
  if (typeof createdAt !== "string" || createdAt.length === 0) {
    throw new Error("ImportPrivateNoteEvidenceV0.createdAt must be a non-empty string");
  }
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return bytesToHex(left) === bytesToHex(right);
}

function noteTreeRecordV0(noteTree: NoteTreeSnapshotV0) {
  const normalized = normalizeNoteTreeSnapshotV0(noteTree);
  return {
    depth: normalized.depth,
    leaves: normalized.leaves,
    version: normalized.version,
  };
}

function assertEvidenceNetworksV0(evidence: ImportPrivateNoteEvidenceV0): void {
  const { checkpoint, network } = evidence;
  if (network !== checkpoint.source.network) {
    throw new Error("ImportPrivateNoteEvidenceV0.network must match checkpoint.source.network");
  }
  if (network !== checkpoint.preState.network) {
    throw new Error("ImportPrivateNoteEvidenceV0.network must match checkpoint.preState.network");
  }
  if (network !== checkpoint.postState.network) {
    throw new Error("ImportPrivateNoteEvidenceV0.network must match checkpoint.postState.network");
  }
}

export async function normalizeImportPrivateNoteEvidenceV0(
  evidence: ImportPrivateNoteEvidenceV0,
): Promise<ImportPrivateNoteEvidenceV0> {
  if (evidence.version !== IMPORT_PRIVATE_NOTE_EVIDENCE_V0_VERSION) {
    throw new Error("ImportPrivateNoteEvidenceV0.version must be 0");
  }
  if (evidence.kind !== IMPORT_PRIVATE_NOTE_EVIDENCE_V0_KIND) {
    throw new Error("ImportPrivateNoteEvidenceV0.kind is invalid");
  }
  assertCreatedAt(evidence.createdAt);
  assertEvidenceNetworksV0(evidence);
  const checkpointHash = await importPrivateNoteCheckpointHashV0(evidence.checkpoint);
  const suppliedCheckpointHash = asBytes32(
    "ImportPrivateNoteEvidenceV0.checkpointHash",
    evidence.checkpointHash,
  );
  if (!bytesEqual(checkpointHash, suppliedCheckpointHash)) {
    throw new Error("ImportPrivateNoteEvidenceV0.checkpointHash mismatch");
  }
  return Object.freeze({
    version: IMPORT_PRIVATE_NOTE_EVIDENCE_V0_VERSION,
    kind: IMPORT_PRIVATE_NOTE_EVIDENCE_V0_KIND,
    network: evidence.network,
    checkpointHash,
    checkpoint: evidence.checkpoint,
    noteTree: normalizeNoteTreeSnapshotV0(evidence.noteTree),
    createdAt: evidence.createdAt,
  });
}

export async function serializeImportPrivateNoteEvidenceV0(
  evidence: ImportPrivateNoteEvidenceV0,
): Promise<Uint8Array> {
  const normalized = await normalizeImportPrivateNoteEvidenceV0(evidence);
  return serializeDeterministicUtf8({
    checkpoint: serializeImportPrivateNoteCheckpointV0(normalized.checkpoint),
    checkpointHash: normalized.checkpointHash,
    createdAt: normalized.createdAt,
    kind: normalized.kind,
    network: normalized.network,
    noteTree: noteTreeRecordV0(normalized.noteTree),
    version: normalized.version,
  });
}

export async function importPrivateNoteEvidenceHashV0(
  evidence: ImportPrivateNoteEvidenceV0,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    IMPORT_PRIVATE_NOTE_EVIDENCE_V0_HASH_DOMAIN,
    await serializeImportPrivateNoteEvidenceV0(evidence),
  );
}

export async function buildImportPrivateNoteEvidenceV0(
  args: BuildImportPrivateNoteEvidenceV0Args,
): Promise<ImportPrivateNoteEvidenceV0> {
  assertCreatedAt(args.createdAt);
  const checkpointHash = await importPrivateNoteCheckpointHashV0(args.checkpoint);
  return normalizeImportPrivateNoteEvidenceV0({
    version: IMPORT_PRIVATE_NOTE_EVIDENCE_V0_VERSION,
    kind: IMPORT_PRIVATE_NOTE_EVIDENCE_V0_KIND,
    network: args.checkpoint.source.network,
    checkpointHash,
    checkpoint: args.checkpoint,
    noteTree: args.noteTree,
    createdAt: args.createdAt,
  });
}
