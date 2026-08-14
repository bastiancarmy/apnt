// Maturity: frozen — its L_verdict / redeem bytecode is independently
// re-derived and required to equal the pinned deployment constant by
// `npm run verify:settlement-authorization-covenant-independent`, and is the
// source of
// packages/reference-aggregator/fixtures/apnt-settlement-authorization-covenant-bytecode-v0.json.
// See AGENTS.md, "The maturity ladder".
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { asBytes32, asFixedBytes, bytesToHex, type Bytes32 } from "./bytes.js";
import {
  compileApntCashAssemblySourceV0,
  pushScriptData,
} from "./apnt_cashassembly_compiler_v0.js";
import {
  APNT_TRANSITION_SETTLEMENT_PROJECTION_V0_COMMITMENT_DOMAIN,
  APNT_TRANSITION_SETTLEMENT_PROJECTION_V0_MAGIC,
  APNT_TRANSITION_SETTLEMENT_PROJECTION_V0_VERSION,
} from "./apnt_transition_settlement_projection_v0.js";
import { APNT_DOMAIN_SEPARATED_SHA256_PERSONALIZATION } from "./hash.js";

/**
 * APNT settlement authorization covenant (SAC) v0 and the created-note seal's
 * aggregate branch.
 *
 * Target architecture:
 * `openspec/changes/define-apnt-private-spend-covenant-v0/design.md` §1.1.3 /
 * §1.1.5 / §1.1.6, as corrected and decided by §1.1.6a.
 *
 * This module owns **locking-template construction only**: it compiles real
 * BCH bytecode from the CashAssembly sources in `./cashassembly/`. It does not
 * execute anything against a virtual machine — that boundary belongs to
 * `@bch-cloak/reference-aggregator`
 * (`apnt_settlement_authorization_covenant_local_vm_verification.ts`), which is
 * the package that depends on Libauth, exactly as
 * `apnt_import_funding_cell.ts` and
 * `apnt_import_funding_direct_p2s_local_vm_verification.ts` already divide
 * "build bytecode" from "verify against the real VM".
 *
 * Nothing here is APNT acceptance, proof verification, chain validation, wallet
 * acceptance, or note spendability.
 */

// ---------------------------------------------------------------------------
// The unroll bound. Pinned deployment parameter.
// ---------------------------------------------------------------------------

/**
 * Maximum number of transaction inputs the SAC can project.
 *
 * Chosen deliberately, once (design.md §8, decided §1.1.6a): the largest real
 * batch this repository has built is `live-chipnet-26x2000-two-source`, 27
 * inputs including the designated verifier input, so 64 carries 2.4x margin,
 * and it matches existing repository precedent
 * (`APNT_IMPORT_CURRENT_TRANSACTION_PROJECTION_V0_MAX_INPUTS`).
 *
 * Changing this changes the redeem script, therefore `L_verdict`, therefore
 * every seal's locking bytecode and the note format. It is not a tunable.
 */
export const APNT_SETTLEMENT_AUTHORIZATION_COVENANT_V0_MAX_INPUTS = 64;

/**
 * Maximum number of transaction outputs the SAC can project.
 *
 * Real batches are profile-fixed at 20 outputs (5 created seals + 15 recovery
 * carriers) at both 9 and 26 consumed cells, so the output side does not scale
 * with batch size. 32 is chosen because it is close to where the VM's
 * `maximumStackItemLength` transcript ceiling begins to bind at realistic
 * (~197-byte) carrier-output locking sizes; raising it further buys headroom
 * that the transcript ceiling makes unusable (design.md §1.1.6a correction 4).
 */
export const APNT_SETTLEMENT_AUTHORIZATION_COVENANT_V0_MAX_OUTPUTS = 32;

/**
 * The constant part of the domain-separated preimage,
 * `u16be(len(P)) || P || u16be(len(D)) || D`, in bytes.
 *
 * design.md originally recorded this as 109 (from "2+41+2+64"). The
 * personalization is **42** bytes, not 41, so the real value is 110. A one-byte
 * error here produces an unspendable covenant, so it is asserted at build time
 * rather than assumed.
 */
export const APNT_SETTLEMENT_AUTHORIZATION_COVENANT_V0_DOMAIN_PREFIX_BYTES = 110;

/** Length of the P2SH32 locking bytecode `L_verdict`. */
export const APNT_SETTLEMENT_AUTHORIZATION_COVENANT_V0_P2SH32_LOCKING_BYTES = 35;

/**
 * The VM's maximum stack item length on BCH 2026. The SAC accumulates the whole
 * `APNTTSP0` transcript into one stack item, so this caps the transcript and is
 * the ceiling that actually binds on batch shape — not script size and not
 * operation cost (design.md §1.1.6a correction 4). Recorded here because
 * callers sizing a batch need it; this package does not execute a VM.
 */
export const APNT_SETTLEMENT_AUTHORIZATION_COVENANT_V0_MAX_TRANSCRIPT_BYTES = 10_000;

const UNROLLED_INPUT_SLOTS_MARKER = "@UNROLLED_INPUT_SLOTS@";
const UNROLLED_OUTPUT_SLOTS_MARKER = "@UNROLLED_OUTPUT_SLOTS@";
const DOMAIN_SEPARATION_PREFIX_MARKER = "@DOMAIN_SEPARATION_PREFIX_PUSH@";
const VERIFIER_CATEGORY_MARKER = "@VERIFIER_CATEGORY_PUSH@";
const VERDICT_LOCKING_MARKER = "@VERDICT_LOCKING_PUSH@";

const textEncoder = new TextEncoder();

/** Synchronous raw SHA-256, same `node:crypto` idiom as `packet_envelope.ts`. */
function sha256Raw(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(createHash("sha256").update(bytes).digest());
}

function readCasmTemplate(fileName: string): string {
  return readFileSync(new URL(`./cashassembly/${fileName}`, import.meta.url), "utf8");
}

function substituteOnce(source: string, marker: string, replacement: string): string {
  if (!source.includes(marker)) {
    throw new Error(
      `ApntSettlementAuthorizationCovenantV0 template is missing marker ${marker}`,
    );
  }
  if (source.indexOf(marker) !== source.lastIndexOf(marker)) {
    throw new Error(
      `ApntSettlementAuthorizationCovenantV0 template repeats marker ${marker}`,
    );
  }
  return source.replace(marker, replacement);
}

/** Formats arbitrary bytes as a single CashAssembly raw-hex data-push token. */
function casmDataPushToken(bytes: Uint8Array): string {
  return `0x${bytesToHex(pushScriptData(bytes))}`;
}

function u16be(value: number): Uint8Array {
  return Uint8Array.of((value >>> 8) & 0xff, value & 0xff);
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

/**
 * The 110 compile-time-constant leading bytes of the domain-separated preimage
 * `sha256DomainSeparated` builds, derived from the same real constants that
 * function uses so the covenant can never drift from `hash.ts`.
 */
export function getApntSettlementAuthorizationCovenantDomainPrefixV0(): Uint8Array {
  const personalization = textEncoder.encode(APNT_DOMAIN_SEPARATED_SHA256_PERSONALIZATION);
  const domain = textEncoder.encode(
    APNT_TRANSITION_SETTLEMENT_PROJECTION_V0_COMMITMENT_DOMAIN,
  );
  const prefix = concatBytes([
    u16be(personalization.length),
    personalization,
    u16be(domain.length),
    domain,
  ]);
  if (prefix.length !== APNT_SETTLEMENT_AUTHORIZATION_COVENANT_V0_DOMAIN_PREFIX_BYTES) {
    throw new Error(
      `ApntSettlementAuthorizationCovenantV0 domain prefix must be ${String(
        APNT_SETTLEMENT_AUTHORIZATION_COVENANT_V0_DOMAIN_PREFIX_BYTES,
      )} bytes, derived ${String(prefix.length)}`,
    );
  }
  return prefix;
}

/**
 * The 9 constant transcript head bytes, derived from the projection module's
 * own magic and version rather than restated.
 */
function transcriptHeadBytes(): Uint8Array {
  const magic = textEncoder.encode(APNT_TRANSITION_SETTLEMENT_PROJECTION_V0_MAGIC);
  if (magic.length !== 8) {
    throw new Error("ApntSettlementAuthorizationCovenantV0 transcript magic must be 8 bytes");
  }
  return concatBytes([
    magic,
    Uint8Array.of(APNT_TRANSITION_SETTLEMENT_PROJECTION_V0_VERSION),
  ]);
}

/**
 * `u32le` of a value that may reach or exceed 2**31 (locktime, sequence
 * number, outpoint index): such a VM number carries a fifth sign byte, so it is
 * widened to 5 bytes and truncated to 4.
 */
const U32LE_WIDE = "<5> OP_NUM2BIN <4> OP_SPLIT OP_DROP";
/** `u32le` of a value structurally bounded well below 2**31 (counts, lengths). */
const U32LE_NARROW = "<4> OP_NUM2BIN";

function unrolledInputSlots(maxInputs: number): string {
  const lines: string[] = [];
  for (let index = 0; index < maxInputs; index += 1) {
    lines.push(
      `// input slot ${String(index)}`,
      `<${String(index)}> OP_TXINPUTCOUNT OP_LESSTHAN`,
      `OP_IF`,
      // every input contributes to networkFeeSats, including the designated one
      `  OP_FROMALTSTACK <${String(index)}> OP_UTXOVALUE OP_ADD OP_TOALTSTACK`,
      // ...but the designated verifier input is excluded from the transcript body
      `  <${String(index)}> OP_INPUTINDEX OP_NUMEQUAL OP_NOT`,
      `  OP_IF`,
      `    <${String(index)}> OP_OUTPOINTTXHASH OP_CAT`,
      `    <${String(index)}> OP_OUTPOINTINDEX ${U32LE_WIDE} OP_CAT`,
      `    <${String(index)}> OP_INPUTSEQUENCENUMBER ${U32LE_WIDE} OP_CAT`,
      `    <${String(index)}> OP_UTXOVALUE <8> OP_NUM2BIN OP_CAT`,
      `  OP_ENDIF`,
      `OP_ENDIF`,
    );
  }
  return lines.join("\n");
}

function unrolledOutputSlots(maxOutputs: number): string {
  const lines: string[] = [];
  for (let index = 0; index < maxOutputs; index += 1) {
    lines.push(
      `// output slot ${String(index)}`,
      `<${String(index)}> OP_TXOUTPUTCOUNT OP_LESSTHAN`,
      `OP_IF`,
      `  <${String(index)}> OP_OUTPUTTOKENCATEGORY OP_SIZE OP_NIP OP_NOT OP_VERIFY`,
      `  OP_FROMALTSTACK <${String(index)}> OP_OUTPUTVALUE OP_SUB OP_TOALTSTACK`,
      `  <${String(index)}> OP_OUTPUTVALUE <8> OP_NUM2BIN OP_CAT`,
      `  <${String(index)}> OP_OUTPUTBYTECODE OP_SIZE ${U32LE_NARROW} OP_SWAP OP_CAT OP_CAT`,
      `OP_ENDIF`,
    );
  }
  return lines.join("\n");
}

/**
 * The complete CashAssembly source of the settlement authorization covenant's
 * redeem script, with the unrolled slot bodies and the derived 110-byte
 * domain-separation prefix substituted into the tracked template.
 */
export function getApntSettlementAuthorizationCovenantCasmSourceV0(): string {
  const template = readCasmTemplate("apnt_settlement_authorization_covenant_v0.casm");
  // The template carries the 9 transcript-head bytes literally so the file
  // reads as real CashAssembly. Require them to still equal the projection
  // module's own magic and version, so the two can never drift apart.
  const head = transcriptHeadBytes();
  if (!template.includes(bytesToHex(head))) {
    throw new Error(
      "ApntSettlementAuthorizationCovenantV0 template transcript head does not match the projection module's magic and version",
    );
  }
  let source = substituteOnce(
    template,
    UNROLLED_INPUT_SLOTS_MARKER,
    unrolledInputSlots(APNT_SETTLEMENT_AUTHORIZATION_COVENANT_V0_MAX_INPUTS),
  );
  source = substituteOnce(
    source,
    UNROLLED_OUTPUT_SLOTS_MARKER,
    unrolledOutputSlots(APNT_SETTLEMENT_AUTHORIZATION_COVENANT_V0_MAX_OUTPUTS),
  );
  source = substituteOnce(
    source,
    DOMAIN_SEPARATION_PREFIX_MARKER,
    casmDataPushToken(getApntSettlementAuthorizationCovenantDomainPrefixV0()),
  );
  return source.trim();
}

/** The compiled SAC redeem bytecode. */
export function buildApntSettlementAuthorizationCovenantRedeemBytecodeV0(): Uint8Array {
  return compileApntCashAssemblySourceV0(
    getApntSettlementAuthorizationCovenantCasmSourceV0(),
  );
}

/**
 * `L_verdict`: the 35-byte P2SH32 locking bytecode every created seal pins.
 *
 * `OP_HASH256 <32-byte redeem hash> OP_EQUAL`. The double SHA-256 here is
 * P2SH32's own address construction and is unrelated to the covenant's single
 * domain-separated `OP_SHA256`.
 */
export function getApntSettlementAuthorizationCovenantP2sh32LockingBytecodeV0(): Uint8Array {
  const redeem = buildApntSettlementAuthorizationCovenantRedeemBytecodeV0();
  const digest = asBytes32(
    "ApntSettlementAuthorizationCovenantV0.redeemScriptHash256",
    sha256Raw(sha256Raw(redeem)),
  );
  const locking = concatBytes([Uint8Array.of(0xaa, 0x20), digest, Uint8Array.of(0x87)]);
  if (locking.length !== APNT_SETTLEMENT_AUTHORIZATION_COVENANT_V0_P2SH32_LOCKING_BYTES) {
    throw new Error("ApntSettlementAuthorizationCovenantV0 P2SH32 locking must be 35 bytes");
  }
  return locking;
}

// ---------------------------------------------------------------------------
// The created-note seal's aggregate branch (witness-index variant)
// ---------------------------------------------------------------------------

export type ApntCreatedNoteSealAggregateBranchParametersV0 = Readonly<{
  /**
   * `C_verifier`, in **VM byte order** — reversed relative to the JSON/RPC
   * representation. Embedding the JSON order here silently produces an
   * unspendable seal.
   */
  verifierTokenCategoryVmOrder32: Bytes32;
  /** `L_verdict`, the 35-byte P2SH32 locking bytecode of the SAC. */
  verdictLockingBytecode35: Uint8Array;
}>;

/** The complete CashAssembly source of the seal's aggregate branch. */
export function getApntCreatedNoteSealAggregateBranchCasmSourceV0(
  parameters: ApntCreatedNoteSealAggregateBranchParametersV0,
): string {
  const category = asBytes32(
    "ApntCreatedNoteSealAggregateBranchV0.verifierTokenCategoryVmOrder32",
    parameters.verifierTokenCategoryVmOrder32,
  );
  const verdictLocking = asFixedBytes(
    "ApntCreatedNoteSealAggregateBranchV0.verdictLockingBytecode35",
    parameters.verdictLockingBytecode35,
    APNT_SETTLEMENT_AUTHORIZATION_COVENANT_V0_P2SH32_LOCKING_BYTES,
  );
  const template = readCasmTemplate("apnt_created_note_seal_aggregate_branch_v0.casm");
  let source = substituteOnce(
    template,
    VERIFIER_CATEGORY_MARKER,
    casmDataPushToken(category),
  );
  source = substituteOnce(
    source,
    VERDICT_LOCKING_MARKER,
    casmDataPushToken(verdictLocking),
  );
  return source.trim();
}

/** The compiled aggregate-branch bytecode. */
export function buildApntCreatedNoteSealAggregateBranchBytecodeV0(
  parameters: ApntCreatedNoteSealAggregateBranchParametersV0,
): Uint8Array {
  return compileApntCashAssemblySourceV0(
    getApntCreatedNoteSealAggregateBranchCasmSourceV0(parameters),
  );
}

/**
 * The unlocking bytecode a seal spender supplies to take the aggregate branch:
 * a single minimal push of the designated verifier input's index.
 *
 * This is what makes the branch index-agnostic. The spender chooses the index,
 * but the branch still requires the named input to carry the pinned category
 * and be locked by the pinned `L_verdict`, so it must be a genuine verdict
 * input.
 */
export function buildApntCreatedNoteSealAggregateBranchUnlockingBytecodeV0(
  designatedVerifierInputIndex: number,
): Uint8Array {
  if (
    !Number.isSafeInteger(designatedVerifierInputIndex) ||
    designatedVerifierInputIndex < 0 ||
    designatedVerifierInputIndex >= APNT_SETTLEMENT_AUTHORIZATION_COVENANT_V0_MAX_INPUTS
  ) {
    throw new Error(
      "ApntCreatedNoteSealAggregateBranchV0 designated verifier input index is out of range",
    );
  }
  if (designatedVerifierInputIndex === 0) return Uint8Array.of(0x00);
  if (designatedVerifierInputIndex <= 16) {
    return Uint8Array.of(0x50 + designatedVerifierInputIndex);
  }
  return pushScriptData(Uint8Array.of(designatedVerifierInputIndex));
}
