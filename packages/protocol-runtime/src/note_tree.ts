import { asBytes32, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";

export const NOTE_TREE_SNAPSHOT_V0_VERSION = 0;
export const NOTE_TREE_PARENT_V0_HASH_DOMAIN = "bch-cloak-apnt-v0:note-tree-parent";
export const EMPTY_NOTE_LEAF_V0 = asBytes32("EMPTY_NOTE_LEAF_V0", new Uint8Array(32));

export type NoteTreeSnapshotV0 = Readonly<{
  version: typeof NOTE_TREE_SNAPSHOT_V0_VERSION;
  depth: number;
  leaves: readonly Bytes32[];
}>;

function assertDepth(depth: number): void {
  if (!Number.isSafeInteger(depth) || depth < 0) {
    throw new Error("NoteTreeSnapshotV0.depth must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(2 ** depth)) {
    throw new Error("NoteTreeSnapshotV0.depth creates an unsafe leaf capacity");
  }
}

function capacityForDepth(depth: number): number {
  assertDepth(depth);
  return 2 ** depth;
}

function concatBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  const out = new Uint8Array(left.length + right.length);
  out.set(left, 0);
  out.set(right, left.length);
  return out;
}

export function normalizeNoteTreeSnapshotV0(snapshot: NoteTreeSnapshotV0): NoteTreeSnapshotV0 {
  if (snapshot.version !== NOTE_TREE_SNAPSHOT_V0_VERSION) {
    throw new Error("NoteTreeSnapshotV0.version must be 0");
  }
  const capacity = capacityForDepth(snapshot.depth);
  if (!Array.isArray(snapshot.leaves)) {
    throw new Error("NoteTreeSnapshotV0.leaves must be an array");
  }
  if (snapshot.leaves.length > capacity) {
    throw new Error("NoteTreeSnapshotV0.leaves exceeds tree capacity");
  }
  return Object.freeze({
    version: NOTE_TREE_SNAPSHOT_V0_VERSION,
    depth: snapshot.depth,
    leaves: Object.freeze(
      snapshot.leaves.map((leaf, index) =>
        asBytes32(`NoteTreeSnapshotV0.leaves[${String(index)}]`, leaf),
      ),
    ),
  });
}

export async function noteTreeRootV0(snapshot: NoteTreeSnapshotV0): Promise<Bytes32> {
  const normalized = normalizeNoteTreeSnapshotV0(snapshot);
  const capacity = capacityForDepth(normalized.depth);
  let level: Bytes32[] = Array.from({ length: capacity }, (_, index) =>
    index < normalized.leaves.length ? normalized.leaves[index]! : EMPTY_NOTE_LEAF_V0,
  );

  if (normalized.depth === 0) {
    return asBytes32("NoteTreeSnapshotV0.root", level[0] ?? EMPTY_NOTE_LEAF_V0);
  }

  while (level.length > 1) {
    const nextLevel: Bytes32[] = [];
    for (let index = 0; index < level.length; index += 2) {
      nextLevel.push(
        await sha256DomainSeparated(
          NOTE_TREE_PARENT_V0_HASH_DOMAIN,
          concatBytes(level[index]!, level[index + 1]!),
        ),
      );
    }
    level = nextLevel;
  }

  return asBytes32("NoteTreeSnapshotV0.root", level[0]!);
}

export function appendNoteCommitmentV0(
  snapshot: NoteTreeSnapshotV0,
  noteCommitment: Bytes32,
): NoteTreeSnapshotV0 {
  const normalized = normalizeNoteTreeSnapshotV0(snapshot);
  const capacity = capacityForDepth(normalized.depth);
  if (normalized.leaves.length >= capacity) {
    throw new Error("NoteTreeSnapshotV0 is full");
  }
  return Object.freeze({
    version: NOTE_TREE_SNAPSHOT_V0_VERSION,
    depth: normalized.depth,
    leaves: Object.freeze([
      ...normalized.leaves,
      asBytes32("appendNoteCommitmentV0.noteCommitment", noteCommitment),
    ]),
  });
}
