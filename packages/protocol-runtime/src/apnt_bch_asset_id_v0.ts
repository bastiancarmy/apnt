// Maturity: preview — measured zero published importers and no published
// artifact references it. Read it, don't build on it. See AGENTS.md, "The
// maturity ladder".
import { asBytes32, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";

/**
 * The canonical BCH-only asset identity for APNT v0.
 *
 * `openspec/changes/define-apnt-private-note-transition-and-conservation-v0`
 * specifies a single fixed asset ID for every APNT v0 private note:
 *
 * ```text
 * APNT_BCH_ASSET_ID_V0 = sha256DomainSeparated("bch-cloak-apnt-v0:asset-id-v0", UTF8("BCH"))
 * ```
 *
 * NON-CLAIM, read this before relying on anything in this module.
 *
 * The checks in this file are HOST POLICY checks. They are **not** proven by
 * the `apnt-private-note-transition-relation-v0` circuit. As of this module's
 * introduction the relation binds `assetId` into the note commitment but never
 * compares it against this constant and never compares the consumed and created
 * asset IDs to each other; the same is true of the Rust guest parity
 * implementation that the SP1 program actually executes. A party that
 * constructs its own witness can therefore still prove a transition over notes
 * carrying arbitrary asset IDs. Nothing here changes that.
 *
 * What this module does provide is a single package-owned definition of the
 * canonical constant, plus deterministic host-side conformance checks that
 * reference constructors and acceptance paths can apply so that this
 * implementation never *originates* or *accepts* a nonconforming note. In-circuit
 * enforcement requires a relation change, therefore a new SP1 guest, therefore a
 * new program verification key. See
 * `openspec/changes/define-apnt-private-spend-interface-v0/design.md`
 * ("The asset-ID gap is not a free fix") for why that is deliberately deferred
 * rather than landed here.
 */
export const APNT_BCH_ASSET_ID_V0_DOMAIN = "bch-cloak-apnt-v0:asset-id-v0";

/** The exact UTF-8 payload the canonical asset ID commits to. */
export const APNT_BCH_ASSET_ID_V0_PAYLOAD_UTF8 = "BCH";

/**
 * Pinned expected value of the canonical constant.
 *
 * This is a regression pin, not a second source of truth. The exported
 * derivation is authoritative; `deriveAPNTBchAssetIdV0` recomputes it from the
 * package hash primitive on every call, and the accompanying test asserts the
 * derived value equals this literal. An accidental change to the hash
 * personalization, the domain string, or the payload therefore fails loudly
 * rather than silently repartitioning the asset universe.
 */
export const APNT_BCH_ASSET_ID_V0_PINNED_HEX =
  "34d7a203396e2bd32b267dc9c4be2df17c674901b5d18d76d17bbd77cc9246e6";

const textEncoder = new TextEncoder();

let cached: Bytes32 | null = null;

/** Derives the canonical fixed BCH asset ID for APNT v0. */
export async function deriveAPNTBchAssetIdV0(): Promise<Bytes32> {
  if (cached !== null) return cached;
  const derived = await sha256DomainSeparated(
    APNT_BCH_ASSET_ID_V0_DOMAIN,
    textEncoder.encode(APNT_BCH_ASSET_ID_V0_PAYLOAD_UTF8),
  );
  cached = derived;
  return derived;
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index]! ^ right[index]!;
  }
  return diff === 0;
}

/** Closed host-policy outcome vocabulary. Deliberately witness-free. */
export const APNT_BCH_ASSET_POLICY_CODE_V0 = Object.freeze({
  CONFORMING: "asset-policy-conforming",
  CONSUMED_ASSET_NOT_CANONICAL: "consumed-asset-not-canonical",
  CREATED_ASSET_NOT_CANONICAL: "created-asset-not-canonical",
  CONSUMED_CREATED_ASSET_MISMATCH: "consumed-created-asset-mismatch",
  MALFORMED_ASSET_ID: "malformed-asset-id",
} as const);
export type APNTBchAssetPolicyCodeV0 =
  (typeof APNT_BCH_ASSET_POLICY_CODE_V0)[keyof typeof APNT_BCH_ASSET_POLICY_CODE_V0];

export type APNTBchAssetPolicyResultV0 = Readonly<{
  version: 0;
  kind: "apnt-bch-asset-policy-v0";
  /** Always false for a proven property; this result is host policy only. */
  provenInRelation: false;
  conforming: boolean;
  code: APNTBchAssetPolicyCodeV0;
  consumedCount: number;
  createdCount: number;
}>;

function frozen(
  conforming: boolean,
  code: APNTBchAssetPolicyCodeV0,
  consumedCount: number,
  createdCount: number,
): APNTBchAssetPolicyResultV0 {
  return Object.freeze({
    version: 0 as const,
    kind: "apnt-bch-asset-policy-v0" as const,
    provenInRelation: false as const,
    conforming,
    code,
    consumedCount,
    createdCount,
  });
}

/** True only when `value` is exactly the canonical APNT v0 BCH asset ID. */
export async function isAPNTCanonicalBchAssetIdV0(value: unknown): Promise<boolean> {
  if (!(value instanceof Uint8Array) || value.length !== 32) return false;
  return bytesEqual(value, await deriveAPNTBchAssetIdV0());
}

/**
 * Host-policy conformance for one proposed transition's note asset IDs.
 *
 * Enforces both halves of the deferred relation task: every asset ID equals the
 * canonical constant, and the consumed and created sides agree. The second check
 * is redundant given the first and is evaluated anyway so that a future
 * multi-asset revision inherits a meaningful cross-side check rather than a
 * vacuous one.
 */
export async function evaluateAPNTBchAssetPolicyV0(args: Readonly<{
  consumedAssetIds: readonly Uint8Array[];
  createdAssetIds: readonly Uint8Array[];
}>): Promise<APNTBchAssetPolicyResultV0> {
  const consumed = args.consumedAssetIds;
  const created = args.createdAssetIds;
  if (!Array.isArray(consumed) || !Array.isArray(created)) {
    throw new Error("evaluateAPNTBchAssetPolicyV0 requires consumed and created asset ID arrays");
  }
  const consumedCount = consumed.length;
  const createdCount = created.length;

  for (const value of [...consumed, ...created]) {
    if (!(value instanceof Uint8Array) || value.length !== 32) {
      return frozen(false, APNT_BCH_ASSET_POLICY_CODE_V0.MALFORMED_ASSET_ID, consumedCount, createdCount);
    }
  }

  const canonical = await deriveAPNTBchAssetIdV0();
  if (consumed.some((value) => !bytesEqual(value, canonical))) {
    return frozen(
      false,
      APNT_BCH_ASSET_POLICY_CODE_V0.CONSUMED_ASSET_NOT_CANONICAL,
      consumedCount,
      createdCount,
    );
  }
  if (created.some((value) => !bytesEqual(value, canonical))) {
    return frozen(
      false,
      APNT_BCH_ASSET_POLICY_CODE_V0.CREATED_ASSET_NOT_CANONICAL,
      consumedCount,
      createdCount,
    );
  }
  const reference = consumed[0] ?? created[0];
  if (
    reference !== undefined &&
    [...consumed, ...created].some((value) => !bytesEqual(value, reference))
  ) {
    return frozen(
      false,
      APNT_BCH_ASSET_POLICY_CODE_V0.CONSUMED_CREATED_ASSET_MISMATCH,
      consumedCount,
      createdCount,
    );
  }
  return frozen(true, APNT_BCH_ASSET_POLICY_CODE_V0.CONFORMING, consumedCount, createdCount);
}

/**
 * Normalizes a caller-supplied asset ID, rejecting anything but the canonical
 * constant. Use this in note-construction paths so nonconforming notes are never
 * originated by this implementation.
 */
export async function assertAPNTCanonicalBchAssetIdV0(
  name: string,
  value: unknown,
): Promise<Bytes32> {
  if (!(value instanceof Uint8Array)) {
    throw new Error(`${name} must be a Uint8Array`);
  }
  const bytes = asBytes32(name, value);
  if (!bytesEqual(bytes, await deriveAPNTBchAssetIdV0())) {
    throw new Error(`${name} must be the canonical APNT v0 BCH asset ID`);
  }
  return bytes;
}
