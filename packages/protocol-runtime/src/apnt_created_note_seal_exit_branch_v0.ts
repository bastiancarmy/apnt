// Maturity: stable — the mandatory direct-exit branch of the created-note
// seal; imported by apnt_created_note_seal_v0.ts. Not yet exercised by any
// published verify:* command. See AGENTS.md, "The maturity ladder".
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { asBytes32, asFixedBytes, bytesToHex, type Bytes32 } from "./bytes.js";
import {
  compileApntCashAssemblySourceV0,
  pushScriptData,
} from "./apnt_cashassembly_compiler_v0.js";

/**
 * APNT created-note seal, direct-exit branch v0.
 *
 * Target architecture:
 * `openspec/changes/define-apnt-private-spend-covenant-v0/design.md` §1.2, with
 * the coexistence framing in §3.1.
 *
 * This is the seal's other branch. Where the aggregate branch
 * (`apnt_settlement_authorization_covenant_v0.ts`) delegates authority to the
 * settlement authorization covenant and checks no signature at all, this branch
 * is an ordinary transparent BCH spend authorized by a one-time key committed at
 * note-creation time. It is the non-custodial floor: a note holder can always
 * move their own funds without an aggregator, a prover, a relay, or any other
 * counterparty.
 *
 * This module owns **locking-template construction only**: it compiles real BCH
 * bytecode from the CashAssembly source in `./cashassembly/`, and it derives the
 * committed key hash. It does not generate keys, does not sign, and does not
 * execute anything against a virtual machine. Those boundaries belong to
 * `@bch-cloak/reference-aggregator`
 * (`apnt_created_note_seal_exit_branch_local_vm_verification.ts`), which is the
 * package that depends on Libauth — the same split
 * `apnt_settlement_authorization_covenant_v0.ts` already uses.
 *
 * Deliberately NOT here, and deliberately not implied by anything here:
 * wallet-side seal construction, the combined `OP_IF`/`OP_ELSE`/`OP_ENDIF` seal
 * template, how a note is assigned an exit key at creation time, and
 * recipient-side exit-key recovery. Those are later tasks.
 *
 * Nothing here is APNT acceptance, proof verification, chain validation, wallet
 * acceptance, or note spendability. Nor is it privacy: taking this branch is a
 * public, transparent exit, and it forfeits the shielding the aggregate path
 * provides.
 */

// ---------------------------------------------------------------------------
// Pinned structural constants
// ---------------------------------------------------------------------------

/** Length of the 33-byte compressed one-time exit public key `E`. */
export const APNT_CREATED_NOTE_SEAL_EXIT_BRANCH_V0_PUBLIC_KEY_BYTES = 33;

/**
 * Length of the signature the branch accepts: a 64-byte signature plus one
 * sighash byte. Requiring exactly this forces Schnorr rather than DER-encoded
 * ECDSA, which makes the spend deterministically sized and removes signature
 * malleability as a consideration (design.md §1.2).
 */
export const APNT_CREATED_NOTE_SEAL_EXIT_BRANCH_V0_SIGNATURE_BYTES = 65;

/**
 * The only sighash byte the branch accepts: `SIGHASH_ALL | SIGHASH_FORKID`.
 *
 * `SIGHASH_NONE|FORKID` (0x42) and `SIGHASH_SINGLE|FORKID` (0x43) both pass the
 * VM's own signature-encoding check, so this comparison is the only thing that
 * rejects them. Without it a spender could sign `SIGHASH_NONE` and let a miner
 * or relay redirect the exit output.
 */
export const APNT_CREATED_NOTE_SEAL_EXIT_BRANCH_V0_SIGHASH_BYTE = 0x41;

/**
 * The compiled branch length, pinned. design.md §1.2 measured 51 bytes; this
 * module asserts it rather than assuming it, because the branch is a fixed-shape
 * script over one 32-byte parameter and any drift means the design's own
 * measurement or this template is wrong.
 */
export const APNT_CREATED_NOTE_SEAL_EXIT_BRANCH_V0_BYTES = 51;

/**
 * The branch's own unlocking bytecode: a minimal push of the 65-byte signature
 * plus a minimal push of the 33-byte public key.
 *
 * `(1 + 65) + (1 + 33) = 100`. Spending the branch as part of a complete
 * `OP_IF`/`OP_ELSE`/`OP_ENDIF` seal additionally requires a one-byte `OP_0`
 * branch selector, giving design.md §1.2's measured 101 bytes. That selector is
 * a seal-level concern and is not emitted here.
 */
export const APNT_CREATED_NOTE_SEAL_EXIT_BRANCH_V0_UNLOCKING_BYTES = 100;

/**
 * The one additional byte a seal-level exit spend carries: the `OP_0` selector
 * that takes the `OP_ELSE` arm. Recorded so callers reconciling against
 * design.md §1.2's 101-byte figure do not have to rediscover the difference.
 */
export const APNT_CREATED_NOTE_SEAL_EXIT_BRANCH_V0_SEAL_SELECTOR_BYTES = 1;

/**
 * The signature construction BCH's `OP_CHECKSIG` actually verifies for 64-byte
 * signatures.
 *
 * Measured, not assumed: this is EC-Schnorr-SHA256 as specified for Bitcoin
 * Cash — challenge `SHA256(r || compressedPublicKey33 || m)` — and it is **not**
 * BIP-340, which uses tagged hashes over a 32-byte x-only key. A BIP-340
 * signature over the identical digest is rejected by the real BCH 2026 VM. The
 * note authority key in `apnt_note_authority_v0.ts` is BIP-340 and is verified
 * in-circuit; that is a different key with a different construction, and the two
 * are not interchangeable.
 */
export const APNT_CREATED_NOTE_SEAL_EXIT_BRANCH_V0_SIGNING_ALGORITHM =
  "EC-Schnorr-SHA256-bch";

const EXIT_KEY_HASH_MARKER = "@EXIT_KEY_HASH_PUSH@";

/** Synchronous raw SHA-256, the same `node:crypto` idiom the SAC module uses. */
function sha256Raw(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(createHash("sha256").update(bytes).digest());
}

function readCasmTemplate(fileName: string): string {
  return readFileSync(new URL(`./cashassembly/${fileName}`, import.meta.url), "utf8");
}

function substituteOnce(source: string, marker: string, replacement: string): string {
  if (!source.includes(marker)) {
    throw new Error(
      `ApntCreatedNoteSealExitBranchV0 template is missing marker ${marker}`,
    );
  }
  if (source.indexOf(marker) !== source.lastIndexOf(marker)) {
    throw new Error(
      `ApntCreatedNoteSealExitBranchV0 template repeats marker ${marker}`,
    );
  }
  return source.replace(marker, replacement);
}

/** Formats arbitrary bytes as a single CashAssembly raw-hex data-push token. */
function casmDataPushToken(bytes: Uint8Array): string {
  return `0x${bytesToHex(pushScriptData(bytes))}`;
}

export type ApntCreatedNoteSealExitBranchParametersV0 = Readonly<{
  /**
   * `exitKeyHash32 = sha256(E33)`. Plain SHA-256 over the 33-byte compressed
   * one-time exit public key, NOT `sha256DomainSeparated` — see
   * {@link deriveApntCreatedNoteSealExitKeyHashV0}.
   */
  exitKeyHash32: Bytes32;
}>;

/**
 * `exitKeyHash32 = sha256(E33)`.
 *
 * Plain SHA-256, deliberately (design.md §1.2). The domain-separated commitment
 * the relation binds is a *different* value over the same key (design.md §4.3),
 * so the on-chain preimage check stays two opcodes (`OP_SHA256` + a 32-byte
 * compare) instead of the five a domain-separated preimage would need, and the
 * two commitments are not interchangeable by construction: no value that opens
 * one opens the other.
 *
 * This function does not generate `E` and does not know its private scalar.
 */
export function deriveApntCreatedNoteSealExitKeyHashV0(
  exitPublicKey33: Uint8Array,
): Bytes32 {
  const publicKey = asFixedBytes(
    "ApntCreatedNoteSealExitBranchV0.exitPublicKey33",
    exitPublicKey33,
    APNT_CREATED_NOTE_SEAL_EXIT_BRANCH_V0_PUBLIC_KEY_BYTES,
  );
  const prefix = publicKey[0];
  if (prefix !== 0x02 && prefix !== 0x03) {
    throw new Error(
      "ApntCreatedNoteSealExitBranchV0.exitPublicKey33 must be a compressed secp256k1 point (0x02/0x03 prefix)",
    );
  }
  return asBytes32(
    "ApntCreatedNoteSealExitBranchV0.exitKeyHash32",
    sha256Raw(publicKey),
  );
}

/** The complete CashAssembly source of the seal's direct-exit branch. */
export function getApntCreatedNoteSealExitBranchCasmSourceV0(
  parameters: ApntCreatedNoteSealExitBranchParametersV0,
): string {
  const exitKeyHash32 = asBytes32(
    "ApntCreatedNoteSealExitBranchV0.exitKeyHash32",
    parameters.exitKeyHash32,
  );
  const template = readCasmTemplate("apnt_created_note_seal_exit_branch_v0.casm");
  return substituteOnce(
    template,
    EXIT_KEY_HASH_MARKER,
    casmDataPushToken(exitKeyHash32),
  ).trim();
}

/**
 * The compiled direct-exit branch bytecode.
 *
 * The 51-byte length is asserted, not merely measured: the branch's shape is
 * fixed and its only parameter is a 32-byte hash, so any other length means the
 * template drifted from what design.md §1.2 specified and measured.
 */
export function buildApntCreatedNoteSealExitBranchBytecodeV0(
  parameters: ApntCreatedNoteSealExitBranchParametersV0,
): Uint8Array {
  const bytecode = compileApntCashAssemblySourceV0(
    getApntCreatedNoteSealExitBranchCasmSourceV0(parameters),
  );
  if (bytecode.length !== APNT_CREATED_NOTE_SEAL_EXIT_BRANCH_V0_BYTES) {
    throw new Error(
      `ApntCreatedNoteSealExitBranchV0 must compile to ${String(
        APNT_CREATED_NOTE_SEAL_EXIT_BRANCH_V0_BYTES,
      )} bytes, compiled ${String(bytecode.length)}`,
    );
  }
  return bytecode;
}

/**
 * The unlocking bytecode an exit spender supplies for the branch itself:
 * `push(signature65) push(exitPublicKey33)`, leaving the witness stack the
 * branch expects.
 *
 * The 65-byte length and the trailing `0x41` are rejected here as well as
 * on-chain. That is not redundancy for its own sake: an unlocking script that
 * fails these locally is unspendable, and finding that out from a VM error at
 * broadcast time is strictly worse than finding it out from the builder.
 */
export function buildApntCreatedNoteSealExitBranchUnlockingBytecodeV0(args: Readonly<{
  signature65: Uint8Array;
  exitPublicKey33: Uint8Array;
}>): Uint8Array {
  const signature = asFixedBytes(
    "ApntCreatedNoteSealExitBranchV0.signature65",
    args.signature65,
    APNT_CREATED_NOTE_SEAL_EXIT_BRANCH_V0_SIGNATURE_BYTES,
  );
  if (
    signature[APNT_CREATED_NOTE_SEAL_EXIT_BRANCH_V0_SIGNATURE_BYTES - 1] !==
    APNT_CREATED_NOTE_SEAL_EXIT_BRANCH_V0_SIGHASH_BYTE
  ) {
    throw new Error(
      "ApntCreatedNoteSealExitBranchV0.signature65 must end in SIGHASH_ALL|SIGHASH_FORKID (0x41)",
    );
  }
  const publicKey = asFixedBytes(
    "ApntCreatedNoteSealExitBranchV0.exitPublicKey33",
    args.exitPublicKey33,
    APNT_CREATED_NOTE_SEAL_EXIT_BRANCH_V0_PUBLIC_KEY_BYTES,
  );
  const signaturePush = pushScriptData(signature);
  const publicKeyPush = pushScriptData(publicKey);
  const unlocking = new Uint8Array(signaturePush.length + publicKeyPush.length);
  unlocking.set(signaturePush, 0);
  unlocking.set(publicKeyPush, signaturePush.length);
  if (unlocking.length !== APNT_CREATED_NOTE_SEAL_EXIT_BRANCH_V0_UNLOCKING_BYTES) {
    throw new Error(
      `ApntCreatedNoteSealExitBranchV0 unlocking bytecode must be ${String(
        APNT_CREATED_NOTE_SEAL_EXIT_BRANCH_V0_UNLOCKING_BYTES,
      )} bytes, built ${String(unlocking.length)}`,
    );
  }
  return unlocking;
}
