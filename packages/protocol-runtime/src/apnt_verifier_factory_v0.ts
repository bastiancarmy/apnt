// Maturity: frozen — builds the pinned CashVM verifier profile identity
// 0bf091d8e7036ae834cfdf9113ffe4ff240946a0e0167d60cb911924af01354c (AGENTS.md,
// "What is frozen"), independently re-derived and matched byte-for-byte
// against the transaction that gated the first live Chipnet settlement.
// See AGENTS.md, "The maturity ladder".
import { readFileSync } from "node:fs";

import { asBytes32, bytesToHex, type Bytes32 } from "./bytes.js";
import {
  compileApntCashAssemblySourceV0,
  pushScriptData,
} from "./apnt_cashassembly_compiler_v0.js";

/** Category suffix emitted by BCH introspection for a mutable NFT. */
export const APNT_VERIFIER_FACTORY_V0_MUTABLE_CAPABILITY_BYTE = 0x01;

/** Category suffix emitted by BCH introspection for a minting NFT. */
export const APNT_VERIFIER_FACTORY_V0_MINTING_CAPABILITY_BYTE = 0x02;

const INPUT_CATEGORY_MINTING_MARKER = "@INPUT_CATEGORY_MINTING_PUSH@";
const OUTPUT_CATEGORY_MINTING_MARKER = "@OUTPUT_CATEGORY_MINTING_PUSH@";
const CATEGORY_MUTABLE_MARKER = "@CATEGORY_MUTABLE_PUSH@";
const STAGE_ZERO_LOCKING_MARKER = "@STAGE_ZERO_LOCKING_PUSH@";

export type ApntVerifierFactoryParametersV0 = Readonly<{
  /** CashToken category in VM/wire order, as introspection opcodes emit it. */
  verifierTokenCategoryVmOrder32: Bytes32;
  /** Exact first verifier-stage locking bytecode, L_0. */
  stageZeroLockingBytecode: Uint8Array;
}>;

function readTemplate(): string {
  return readFileSync(
    new URL("./cashassembly/apnt_verifier_factory_v0.casm", import.meta.url),
    "utf8",
  );
}

function substituteOnce(source: string, marker: string, replacement: string): string {
  if (!source.includes(marker)) {
    throw new Error(`ApntVerifierFactoryV0 template is missing marker ${marker}`);
  }
  if (source.indexOf(marker) !== source.lastIndexOf(marker)) {
    throw new Error(`ApntVerifierFactoryV0 template repeats marker ${marker}`);
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

function casmDataPushToken(bytes: Uint8Array): string {
  return `0x${bytesToHex(pushScriptData(bytes))}`;
}

function normalizeParameters(
  parameters: ApntVerifierFactoryParametersV0,
): ApntVerifierFactoryParametersV0 {
  const stageZeroLockingBytecode = Uint8Array.from(parameters.stageZeroLockingBytecode);
  if (stageZeroLockingBytecode.length === 0) {
    throw new Error("ApntVerifierFactoryV0 stageZeroLockingBytecode must not be empty");
  }
  return Object.freeze({
    verifierTokenCategoryVmOrder32: asBytes32(
      "ApntVerifierFactoryV0.verifierTokenCategoryVmOrder32",
      parameters.verifierTokenCategoryVmOrder32,
    ),
    stageZeroLockingBytecode,
  });
}

/**
 * Produces category plus capability exactly as token-category introspection
 * emits it for a non-immutable NFT.
 */
export function apntVerifierFactoryCategoryWithCapabilityV0(
  categoryVmOrder32: Uint8Array,
  capability: "mutable" | "minting",
): Uint8Array {
  const category = asBytes32(
    "ApntVerifierFactoryV0.categoryVmOrder32",
    categoryVmOrder32,
  );
  return concatBytes([
    category,
    Uint8Array.of(
      capability === "mutable"
        ? APNT_VERIFIER_FACTORY_V0_MUTABLE_CAPABILITY_BYTE
        : APNT_VERIFIER_FACTORY_V0_MINTING_CAPABILITY_BYTE,
    ),
  ]);
}

/** The fully substituted CashAssembly source of deployment-specific L_factory. */
export function getApntVerifierFactoryCasmSourceV0(
  parameters: ApntVerifierFactoryParametersV0,
): string {
  const normalized = normalizeParameters(parameters);
  let source = substituteOnce(
    readTemplate(),
    INPUT_CATEGORY_MINTING_MARKER,
    casmDataPushToken(apntVerifierFactoryCategoryWithCapabilityV0(
      normalized.verifierTokenCategoryVmOrder32,
      "minting",
    )),
  );
  source = substituteOnce(
    source,
    OUTPUT_CATEGORY_MINTING_MARKER,
    casmDataPushToken(apntVerifierFactoryCategoryWithCapabilityV0(
      normalized.verifierTokenCategoryVmOrder32,
      "minting",
    )),
  );
  source = substituteOnce(
    source,
    CATEGORY_MUTABLE_MARKER,
    casmDataPushToken(apntVerifierFactoryCategoryWithCapabilityV0(
      normalized.verifierTokenCategoryVmOrder32,
      "mutable",
    )),
  );
  source = substituteOnce(
    source,
    STAGE_ZERO_LOCKING_MARKER,
    casmDataPushToken(normalized.stageZeroLockingBytecode),
  );
  return source.trim();
}

/** Build the bare P2S verifier factory covenant for one category and L_0. */
export function buildApntVerifierFactoryLockingBytecodeV0(
  parameters: ApntVerifierFactoryParametersV0,
): Uint8Array {
  return compileApntCashAssemblySourceV0(getApntVerifierFactoryCasmSourceV0(parameters));
}
