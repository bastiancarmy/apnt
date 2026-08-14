import {
  asBytes32,
  bytesToHex,
  hexToBytes,
  type Bytes32,
} from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import {
  noteCommitmentV0,
  normalizePrivateNoteV0,
  type PrivateNoteV0,
} from "./notes.js";
import {
  appendNoteCommitmentV0,
  noteTreeRootV0,
  type NoteTreeSnapshotV0,
} from "./note_tree.js";
import {
  normalizeStateCellStateV0,
  serializeStateCellStateV0,
  stateCellCommitmentV0,
  type StateCellNetworkV0,
  type StateCellStateV0,
} from "./state.js";
import { serializeDeterministicUtf8 } from "./serialization.js";

export const TRANSPARENT_FUNDING_SOURCE_V0_VERSION = 0;
export const IMPORT_PRIVATE_NOTE_CHECKPOINT_V0_VERSION = 0;
export const IMPORT_PRIVATE_NOTE_CHECKPOINT_V0_HASH_DOMAIN =
  "bch-cloak-apnt-v0:import-private-note-checkpoint";

export type TransparentFundingSourceV0 = Readonly<{
  version: typeof TRANSPARENT_FUNDING_SOURCE_V0_VERSION;
  network: StateCellNetworkV0;
  txid: Bytes32;
  vout: number;
  valueSats: bigint;
  lockingBytecode: string;
  importNonce: Bytes32;
}>;

export type ImportPrivateNoteCheckpointV0 = Readonly<{
  version: typeof IMPORT_PRIVATE_NOTE_CHECKPOINT_V0_VERSION;
  source: TransparentFundingSourceV0;
  privateNote: PrivateNoteV0;
  noteCommitment: Bytes32;
  preState: StateCellStateV0;
  postState: StateCellStateV0;
  preStateCommitment: Bytes32;
  postStateCommitment: Bytes32;
}>;

export type BuildInitialPrivateNoteFromFundingSourceV0Args = Readonly<{
  source: TransparentFundingSourceV0;
  assetId: Bytes32;
  ownerCommitment: Bytes32;
}>;

export type BuildImportPrivateNoteCheckpointV0Args =
  BuildInitialPrivateNoteFromFundingSourceV0Args &
    Readonly<{
      preState: StateCellStateV0;
      postState: StateCellStateV0;
    }>;

export type BuildDerivedImportPrivateNoteCheckpointV0Args =
  BuildInitialPrivateNoteFromFundingSourceV0Args &
    Readonly<{
      preState: StateCellStateV0;
      noteTree: NoteTreeSnapshotV0;
    }>;

const NETWORKS_V0 = new Set<StateCellNetworkV0>(["chipnet", "mainnet", "regtest"]);

function assertNetwork(name: string, network: StateCellNetworkV0): void {
  if (!NETWORKS_V0.has(network)) {
    throw new Error(`${name} must be chipnet, mainnet, or regtest`);
  }
}

function assertPositiveBigInt(name: string, value: bigint): void {
  if (typeof value !== "bigint" || value <= 0n) {
    throw new Error(`${name} must be a positive bigint`);
  }
}

function assertNonNegativeSafeInteger(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative safe integer`);
  }
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return bytesToHex(left) === bytesToHex(right);
}

function serializeTransparentFundingSourceRecordV0(source: TransparentFundingSourceV0) {
  return {
    importNonce: source.importNonce,
    lockingBytecode: source.lockingBytecode,
    network: source.network,
    txid: source.txid,
    valueSats: source.valueSats.toString(10),
    version: source.version,
    vout: source.vout,
  };
}

function serializePrivateNoteRecordV0(note: PrivateNoteV0) {
  return {
    assetId: note.assetId,
    noteNonce: note.noteNonce,
    ownerCommitment: note.ownerCommitment,
    valueSats: note.valueSats.toString(10),
    version: note.version,
  };
}

function serializeStateCellStateRecordV0(state: StateCellStateV0) {
  return {
    batchCounter: state.batchCounter.toString(10),
    network: state.network,
    noteRoot: state.noteRoot,
    nullifierRoot: state.nullifierRoot,
    packetRoot: state.packetRoot,
    version: state.version,
  };
}

export function normalizeTransparentFundingSourceV0(
  source: TransparentFundingSourceV0,
): TransparentFundingSourceV0 {
  if (source.version !== TRANSPARENT_FUNDING_SOURCE_V0_VERSION) {
    throw new Error("TransparentFundingSourceV0.version must be 0");
  }
  assertNetwork("TransparentFundingSourceV0.network", source.network);
  assertNonNegativeSafeInteger("TransparentFundingSourceV0.vout", source.vout);
  assertPositiveBigInt("TransparentFundingSourceV0.valueSats", source.valueSats);
  hexToBytes("TransparentFundingSourceV0.lockingBytecode", source.lockingBytecode);
  return Object.freeze({
    version: TRANSPARENT_FUNDING_SOURCE_V0_VERSION,
    network: source.network,
    txid: asBytes32("TransparentFundingSourceV0.txid", source.txid),
    vout: source.vout,
    valueSats: source.valueSats,
    lockingBytecode: source.lockingBytecode,
    importNonce: asBytes32("TransparentFundingSourceV0.importNonce", source.importNonce),
  });
}

export function buildInitialPrivateNoteFromFundingSourceV0(
  args: BuildInitialPrivateNoteFromFundingSourceV0Args,
): PrivateNoteV0 {
  const source = normalizeTransparentFundingSourceV0(args.source);
  return normalizePrivateNoteV0({
    version: 0,
    assetId: asBytes32("buildInitialPrivateNoteFromFundingSourceV0.assetId", args.assetId),
    valueSats: source.valueSats,
    ownerCommitment: asBytes32(
      "buildInitialPrivateNoteFromFundingSourceV0.ownerCommitment",
      args.ownerCommitment,
    ),
    noteNonce: source.importNonce,
  });
}

export async function buildImportPrivateNoteCheckpointV0(
  args: BuildImportPrivateNoteCheckpointV0Args,
): Promise<ImportPrivateNoteCheckpointV0> {
  const source = normalizeTransparentFundingSourceV0(args.source);
  const privateNote = buildInitialPrivateNoteFromFundingSourceV0({
    source,
    assetId: args.assetId,
    ownerCommitment: args.ownerCommitment,
  });
  const preState = normalizeStateCellStateV0(args.preState);
  const postState = normalizeStateCellStateV0(args.postState);
  const [
    noteCommitment,
    preStateCommitment,
    postStateCommitment,
  ] = await Promise.all([
    noteCommitmentV0(privateNote),
    stateCellCommitmentV0(preState),
    stateCellCommitmentV0(postState),
  ]);

  const statesDiffer =
    bytesToHex(serializeStateCellStateV0(preState)) !== bytesToHex(serializeStateCellStateV0(postState));
  if (statesDiffer && bytesEqual(preStateCommitment, postStateCommitment)) {
    throw new Error("ImportPrivateNoteCheckpointV0 state commitments must differ when states differ");
  }

  return Object.freeze({
    version: IMPORT_PRIVATE_NOTE_CHECKPOINT_V0_VERSION,
    source,
    privateNote,
    noteCommitment,
    preState,
    postState,
    preStateCommitment,
    postStateCommitment,
  });
}

export async function buildDerivedImportPrivateNoteCheckpointV0(
  args: BuildDerivedImportPrivateNoteCheckpointV0Args,
): Promise<ImportPrivateNoteCheckpointV0> {
  if (Object.prototype.hasOwnProperty.call(args, "postState")) {
    throw new Error("buildDerivedImportPrivateNoteCheckpointV0 does not accept caller-supplied postState");
  }
  const source = normalizeTransparentFundingSourceV0(args.source);
  const privateNote = buildInitialPrivateNoteFromFundingSourceV0({
    source,
    assetId: args.assetId,
    ownerCommitment: args.ownerCommitment,
  });
  const preState = normalizeStateCellStateV0(args.preState);
  const noteCommitment = await noteCommitmentV0(privateNote);
  const updatedTree = appendNoteCommitmentV0(args.noteTree, noteCommitment);
  const postNoteRoot = await noteTreeRootV0(updatedTree);
  const postState = normalizeStateCellStateV0({
    version: 0,
    network: preState.network,
    noteRoot: postNoteRoot,
    nullifierRoot: preState.nullifierRoot,
    packetRoot: preState.packetRoot,
    batchCounter: preState.batchCounter,
  });
  if (!bytesEqual(postState.noteRoot, postNoteRoot)) {
    throw new Error("derived postState.noteRoot must equal appended tree root");
  }
  if (!bytesEqual(postState.nullifierRoot, preState.nullifierRoot)) {
    throw new Error("derived postState.nullifierRoot must equal preState.nullifierRoot");
  }
  if (!bytesEqual(postState.packetRoot, preState.packetRoot)) {
    throw new Error("derived postState.packetRoot must equal preState.packetRoot");
  }

  const [preStateCommitment, postStateCommitment] = await Promise.all([
    stateCellCommitmentV0(preState),
    stateCellCommitmentV0(postState),
  ]);

  return Object.freeze({
    version: IMPORT_PRIVATE_NOTE_CHECKPOINT_V0_VERSION,
    source,
    privateNote,
    noteCommitment,
    preState,
    postState,
    preStateCommitment,
    postStateCommitment,
  });
}

export function serializeImportPrivateNoteCheckpointV0(
  checkpoint: ImportPrivateNoteCheckpointV0,
): Uint8Array {
  if (checkpoint.version !== IMPORT_PRIVATE_NOTE_CHECKPOINT_V0_VERSION) {
    throw new Error("ImportPrivateNoteCheckpointV0.version must be 0");
  }
  return serializeDeterministicUtf8({
    noteCommitment: asBytes32("ImportPrivateNoteCheckpointV0.noteCommitment", checkpoint.noteCommitment),
    postState: serializeStateCellStateRecordV0(normalizeStateCellStateV0(checkpoint.postState)),
    postStateCommitment: asBytes32(
      "ImportPrivateNoteCheckpointV0.postStateCommitment",
      checkpoint.postStateCommitment,
    ),
    preState: serializeStateCellStateRecordV0(normalizeStateCellStateV0(checkpoint.preState)),
    preStateCommitment: asBytes32(
      "ImportPrivateNoteCheckpointV0.preStateCommitment",
      checkpoint.preStateCommitment,
    ),
    privateNote: serializePrivateNoteRecordV0(normalizePrivateNoteV0(checkpoint.privateNote)),
    source: serializeTransparentFundingSourceRecordV0(
      normalizeTransparentFundingSourceV0(checkpoint.source),
    ),
    version: checkpoint.version,
  });
}

export function importPrivateNoteCheckpointHashV0(
  checkpoint: ImportPrivateNoteCheckpointV0,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    IMPORT_PRIVATE_NOTE_CHECKPOINT_V0_HASH_DOMAIN,
    serializeImportPrivateNoteCheckpointV0(checkpoint),
  );
}
