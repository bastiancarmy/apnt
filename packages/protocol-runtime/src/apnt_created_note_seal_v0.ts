// Maturity: stable — the current, single implementation of the created-note
// seal (the on-chain lock for a newly created private note). Not yet
// exercised by any published verify:* command. See AGENTS.md, "The maturity
// ladder".
import { readFileSync } from "node:fs";

import { asBytes32, asFixedBytes, bytesToHex, type Bytes32 } from "./bytes.js";
import { compileApntCashAssemblySourceV0 } from "./apnt_cashassembly_compiler_v0.js";
import {
  APNT_SETTLEMENT_AUTHORIZATION_COVENANT_V0_P2SH32_LOCKING_BYTES,
  buildApntCreatedNoteSealAggregateBranchBytecodeV0,
  buildApntCreatedNoteSealAggregateBranchUnlockingBytecodeV0,
  getApntCreatedNoteSealAggregateBranchCasmSourceV0,
  type ApntCreatedNoteSealAggregateBranchParametersV0,
} from "./apnt_settlement_authorization_covenant_v0.js";
import {
  APNT_CREATED_NOTE_SEAL_EXIT_BRANCH_V0_BYTES,
  buildApntCreatedNoteSealExitBranchBytecodeV0,
  buildApntCreatedNoteSealExitBranchUnlockingBytecodeV0,
  getApntCreatedNoteSealExitBranchCasmSourceV0,
} from "./apnt_created_note_seal_exit_branch_v0.js";

/**
 * APNT created-note seal v0 — wallet-side assembly of the complete locking
 * template from its two landed branches.
 *
 * Target architecture:
 * `openspec/changes/define-apnt-private-spend-covenant-v0/design.md` §3.1, over
 * the aggregate branch decided in §1.1.6a and the exit branch specified in §1.2.
 *
 * This module owns **locking-template assembly only**. It compiles the two
 * already-landed branch sources into one `OP_IF`/`OP_ELSE`/`OP_ENDIF` script and
 * builds the two seal-level unlocking bytecodes. It does not generate keys, does
 * not sign, does not execute a virtual machine, and does not decide what a note
 * is. Signing and VM execution belong to `@bch-cloak/reference-aggregator`
 * (`apnt_created_note_seal_local_vm_verification.ts`) — the same split the two
 * branch modules already use.
 *
 * ## What "mandatory exit" does and does not mean here
 *
 * design.md §3.2 requires TWO independent enforcement levels:
 *
 * ```text
 * on-chain, at creation    any observer can verify the exit branch exists
 *                          and which key it commits to      <- THIS MODULE
 * in-circuit, at creation  no accepted transition can create a seal without
 *                          it (the relation recomputes this template and
 *                          requires byte equality)
 *                          <- apnt_created_note_seal_skeleton_v0.ts, enforced
 *                             by the v1 structural validator and the
 *                             transition relation
 * ```
 *
 * Both levels now exist. The second one lives in
 * `apnt_created_note_seal_skeleton_v0.ts` as a fixed-offset byte matcher over a
 * pinned skeleton, because a guest must not read files or run the CASM
 * compiler; that module's test proves the pinned bytes are exactly what this
 * builder emits.
 *
 * Matching the skeleton proves a created output is a conforming seal committing
 * to SOME exit key. Binding that key to the intended recipient is the
 * relation's separate `exitAuthorityCommitment32` check over the same `E_i`.
 * Neither half is sufficient alone.
 *
 * The exit key is per CELL, never per note: outside the 32-byte hole the seal
 * is a deployment constant, so a per-note key would give every backing cell of
 * one note identical locking bytecode and publish the note-to-cell partition.
 * See `generateApntOneTimeExitAuthorityKeyPairSetV0`.
 */

// ---------------------------------------------------------------------------
// Pinned structural constants
// ---------------------------------------------------------------------------

/** `OP_IF`, `OP_ELSE`, `OP_ENDIF` — the three bytes of branch structure. */
export const APNT_CREATED_NOTE_SEAL_V0_STRUCTURE_BYTES = 3;

/**
 * The aggregate branch's compiled length, 74 bytes (the adopted witness-index
 * variant, design.md §1.1.6a). Asserted rather than assumed: the branch module
 * does not pin its own length, and a 76-byte last-input branch would silently
 * produce design.md §3.1's superseded 130-byte seal.
 */
export const APNT_CREATED_NOTE_SEAL_V0_AGGREGATE_BRANCH_BYTES = 74;

/** The exit branch's compiled length, imported rather than restated. */
export const APNT_CREATED_NOTE_SEAL_V0_EXIT_BRANCH_BYTES =
  APNT_CREATED_NOTE_SEAL_EXIT_BRANCH_V0_BYTES;

/**
 * The complete seal, `1 + 74 + 1 + 51 + 1 = 128` bytes.
 *
 * design.md §3.1 originally measured 130; that figure summed §1.1.6's 76-byte
 * last-input aggregate branch, which §1.1.6a superseded with the 74-byte
 * witness-index variant. 128 is the real figure and is asserted at build time.
 */
export const APNT_CREATED_NOTE_SEAL_V0_BYTES =
  APNT_CREATED_NOTE_SEAL_V0_STRUCTURE_BYTES +
  APNT_CREATED_NOTE_SEAL_V0_AGGREGATE_BRANCH_BYTES +
  APNT_CREATED_NOTE_SEAL_V0_EXIT_BRANCH_BYTES;

/** Byte offset of the aggregate branch inside the seal (just past `OP_IF`). */
export const APNT_CREATED_NOTE_SEAL_V0_AGGREGATE_BRANCH_OFFSET = 1;

/** Byte offset of the exit branch inside the seal (just past `OP_ELSE`). */
export const APNT_CREATED_NOTE_SEAL_V0_EXIT_BRANCH_OFFSET =
  1 + APNT_CREATED_NOTE_SEAL_V0_AGGREGATE_BRANCH_BYTES + 1;

/**
 * The branch selector a spender pushes LAST, so it is the item `OP_IF` pops.
 *
 * `OP_1` (0x01) takes the aggregate arm, `OP_0` (an empty stack item) takes the
 * exit arm. Both are minimal encodings, which the VM's minimal-`OP_IF` rule
 * requires; a non-minimal truthy push such as `0x0100` is rejected.
 */
export const APNT_CREATED_NOTE_SEAL_V0_AGGREGATE_SELECTOR = 0x51;
export const APNT_CREATED_NOTE_SEAL_V0_EXIT_SELECTOR = 0x00;
export const APNT_CREATED_NOTE_SEAL_V0_SELECTOR_BYTES = 1;

const AGGREGATE_BRANCH_SOURCE_MARKER = "@AGGREGATE_BRANCH_SOURCE@";
const EXIT_BRANCH_SOURCE_MARKER = "@EXIT_BRANCH_SOURCE@";

const OP_IF = 0x63;
const OP_ELSE = 0x67;
const OP_ENDIF = 0x68;

function readCasmTemplate(fileName: string): string {
  return readFileSync(new URL(`./cashassembly/${fileName}`, import.meta.url), "utf8");
}

function substituteOnce(source: string, marker: string, replacement: string): string {
  if (!source.includes(marker)) {
    throw new Error(`ApntCreatedNoteSealV0 template is missing marker ${marker}`);
  }
  if (source.indexOf(marker) !== source.lastIndexOf(marker)) {
    throw new Error(`ApntCreatedNoteSealV0 template repeats marker ${marker}`);
  }
  return source.replace(marker, replacement);
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export type ApntCreatedNoteSealParametersV0 = ApntCreatedNoteSealAggregateBranchParametersV0 &
  Readonly<{
    /**
     * `exitKeyHash32 = sha256(E33)` over the recipient's 33-byte compressed
     * one-time exit public key. Derive it with
     * `deriveApntCreatedNoteSealExitKeyHashV0`; it is deliberately NOT the
     * domain-separated `exitAuthorityCommitment32` the relation binds over the
     * same key (design.md §4.3).
     */
    exitKeyHash32: Bytes32;
  }>;

function normalizeParameters(
  parameters: ApntCreatedNoteSealParametersV0,
): ApntCreatedNoteSealParametersV0 {
  return Object.freeze({
    verifierTokenCategoryVmOrder32: asBytes32(
      "ApntCreatedNoteSealV0.verifierTokenCategoryVmOrder32",
      parameters.verifierTokenCategoryVmOrder32,
    ),
    verdictLockingBytecode35: asFixedBytes(
      "ApntCreatedNoteSealV0.verdictLockingBytecode35",
      parameters.verdictLockingBytecode35,
      APNT_SETTLEMENT_AUTHORIZATION_COVENANT_V0_P2SH32_LOCKING_BYTES,
    ),
    exitKeyHash32: asBytes32("ApntCreatedNoteSealV0.exitKeyHash32", parameters.exitKeyHash32),
  });
}

/**
 * The complete CashAssembly source of a created-note seal: the tracked seal
 * template with each branch's own tracked source substituted verbatim into it.
 *
 * The branches are composed as SOURCE, not as pre-compiled bytes, so the seal
 * and the standalone branches always go through one compiler and one set of
 * templates. `buildApntCreatedNoteSealLockingBytecodeV0` then re-checks the
 * compiled result against the separately compiled branches, so the two
 * composition paths must agree byte for byte.
 */
export function getApntCreatedNoteSealCasmSourceV0(
  parameters: ApntCreatedNoteSealParametersV0,
): string {
  const normalized = normalizeParameters(parameters);
  let source = substituteOnce(
    readCasmTemplate("apnt_created_note_seal_v0.casm"),
    AGGREGATE_BRANCH_SOURCE_MARKER,
    getApntCreatedNoteSealAggregateBranchCasmSourceV0(normalized),
  );
  source = substituteOnce(
    source,
    EXIT_BRANCH_SOURCE_MARKER,
    getApntCreatedNoteSealExitBranchCasmSourceV0(normalized),
  );
  return source.trim();
}

/**
 * The complete 128-byte created-note seal locking bytecode.
 *
 * Three properties are asserted rather than measured-and-hoped, because each one
 * failing silently produces an unspendable or non-relayable note:
 *
 *   * the compiled result equals `OP_IF || aggregate || OP_ELSE || exit ||
 *     OP_ENDIF` over the separately compiled branches, byte for byte;
 *   * each branch is at its pinned length (74 / 51);
 *   * the whole seal is 128 bytes (design.md §3.1 as corrected by §1.1.6a).
 *
 * The 201-byte standard locking-bytecode ceiling is a property of the VM and is
 * checked where the VM lives (`@bch-cloak/reference-aggregator`), not here.
 */
export function buildApntCreatedNoteSealLockingBytecodeV0(
  parameters: ApntCreatedNoteSealParametersV0,
): Uint8Array {
  const normalized = normalizeParameters(parameters);
  const aggregateBranch = buildApntCreatedNoteSealAggregateBranchBytecodeV0(normalized);
  const exitBranch = buildApntCreatedNoteSealExitBranchBytecodeV0(normalized);
  if (aggregateBranch.length !== APNT_CREATED_NOTE_SEAL_V0_AGGREGATE_BRANCH_BYTES) {
    throw new Error(
      `ApntCreatedNoteSealV0 aggregate branch must be ${String(
        APNT_CREATED_NOTE_SEAL_V0_AGGREGATE_BRANCH_BYTES,
      )} bytes, compiled ${String(aggregateBranch.length)}`,
    );
  }
  const expected = concatBytes([
    Uint8Array.of(OP_IF),
    aggregateBranch,
    Uint8Array.of(OP_ELSE),
    exitBranch,
    Uint8Array.of(OP_ENDIF),
  ]);
  const seal = compileApntCashAssemblySourceV0(
    getApntCreatedNoteSealCasmSourceV0(normalized),
  );
  if (bytesToHex(seal) !== bytesToHex(expected)) {
    throw new Error(
      "ApntCreatedNoteSealV0 compiled seal does not equal OP_IF || aggregate branch || OP_ELSE || exit branch || OP_ENDIF",
    );
  }
  if (seal.length !== APNT_CREATED_NOTE_SEAL_V0_BYTES) {
    throw new Error(
      `ApntCreatedNoteSealV0 must compile to ${String(
        APNT_CREATED_NOTE_SEAL_V0_BYTES,
      )} bytes, compiled ${String(seal.length)}`,
    );
  }
  return seal;
}

/**
 * Seal-level unlocking bytecode for an AGGREGATE spend:
 * `push(designatedVerifierInputIndex) OP_1`.
 *
 * design.md §3.1's budget table records 1 byte for an aggregate spend. That row
 * predates §1.1.6a's witness-index decision: the adopted branch takes the
 * verifier input's index as a witness, so a real aggregate spend is 2 bytes —
 * the index push plus the selector.
 */
export function buildApntCreatedNoteSealAggregateSpendUnlockingBytecodeV0(
  designatedVerifierInputIndex: number,
): Uint8Array {
  return concatBytes([
    buildApntCreatedNoteSealAggregateBranchUnlockingBytecodeV0(designatedVerifierInputIndex),
    Uint8Array.of(APNT_CREATED_NOTE_SEAL_V0_AGGREGATE_SELECTOR),
  ]);
}

/**
 * Seal-level unlocking bytecode for an EXIT spend:
 * `push(signature65) push(exitPublicKey33) OP_0`, 101 bytes (design.md §1.2).
 *
 * The signature must have been produced over a signing serialization whose
 * covered bytecode is the COMPLETE seal, not the 51-byte exit branch. This
 * builder cannot check that — a signature is opaque bytes until a VM verifies it
 * — so it is stated here and executed as a real rejection in the
 * reference-aggregator seal-level verification tests.
 */
export function buildApntCreatedNoteSealExitSpendUnlockingBytecodeV0(args: Readonly<{
  signature65: Uint8Array;
  exitPublicKey33: Uint8Array;
}>): Uint8Array {
  return concatBytes([
    buildApntCreatedNoteSealExitBranchUnlockingBytecodeV0(args),
    Uint8Array.of(APNT_CREATED_NOTE_SEAL_V0_EXIT_SELECTOR),
  ]);
}
