// Maturity: preview — measured zero published importers and no published
// artifact references it. Read it, don't build on it. See AGENTS.md, "The
// maturity ladder".
import { sha256DomainSeparated } from "./hash.js";
import { serializeDeterministicUtf8 } from "./serialization.js";
import type { Bytes32 } from "./bytes.js";

export const APNT_VALUE_CONSERVATION_MODEL_V0_VERSION = 0;
export const APNT_VALUE_CONSERVATION_MODEL_V0_DOMAIN =
  "bch-cloak-apnt-v0:value-conservation-model";
export const APNT_VALUE_CONSERVATION_MODEL_V0_ACCEPTANCE_SCOPE =
  "value-conservation-only";

export type APNTValueConservationModelV0 = Readonly<{
  version: typeof APNT_VALUE_CONSERVATION_MODEL_V0_VERSION;
  domain: typeof APNT_VALUE_CONSERVATION_MODEL_V0_DOMAIN;
  relationId: string;
  acceptanceScope: typeof APNT_VALUE_CONSERVATION_MODEL_V0_ACCEPTANCE_SCOPE;
  inputValueCount: number;
  outputValueCount: number;
  inputValueSumSats: string;
  outputValueSumSats: string;
  feeSats: string;
  derivedBalanceSatisfied: boolean;
  valueConservationAccepted: boolean;
  valueConservationFailureReason?: string;
  privateMaterialPublished: false;
}>;

export type BuildAPNTValueConservationModelV0Args = Readonly<{
  relationId: string;
  inputValueCount: number;
  outputValueCount: number;
  inputValueSumSats: string;
  outputValueSumSats: string;
  feeSats: string;
}>;

export type APNTValueConservationModelEvaluationV0 = Readonly<{
  derivedBalanceSatisfied: boolean;
  valueConservationAccepted: boolean;
  valueConservationFailureReason?: string;
}>;

const CANONICAL_NON_NEGATIVE_DECIMAL_RE = /^(?:0|[1-9][0-9]*)$/u;

function assertNonEmptyString(name: string, value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

function assertNonNegativeSafeInteger(name: string, value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`${name} must be a non-negative safe integer`);
  }
  return value as number;
}

function assertCanonicalSatoshiString(name: string, value: unknown): string {
  if (typeof value !== "string" || !CANONICAL_NON_NEGATIVE_DECIMAL_RE.test(value)) {
    throw new Error(`${name} must be a canonical non-negative decimal string`);
  }
  return value;
}

function assertAcceptanceScopeV0(
  value: unknown,
): typeof APNT_VALUE_CONSERVATION_MODEL_V0_ACCEPTANCE_SCOPE {
  if (value !== APNT_VALUE_CONSERVATION_MODEL_V0_ACCEPTANCE_SCOPE) {
    throw new Error("APNTValueConservationModelV0.acceptanceScope is invalid");
  }
  return APNT_VALUE_CONSERVATION_MODEL_V0_ACCEPTANCE_SCOPE;
}

function derivedBalanceSatisfiedV0(
  inputValueSumSats: string,
  outputValueSumSats: string,
  feeSats: string,
): boolean {
  return BigInt(inputValueSumSats) === BigInt(outputValueSumSats) + BigInt(feeSats);
}

export function normalizeAPNTValueConservationModelV0(
  model: APNTValueConservationModelV0,
): APNTValueConservationModelV0 {
  if (model.version !== APNT_VALUE_CONSERVATION_MODEL_V0_VERSION) {
    throw new Error("APNTValueConservationModelV0.version must be 0");
  }
  if (model.domain !== APNT_VALUE_CONSERVATION_MODEL_V0_DOMAIN) {
    throw new Error("APNTValueConservationModelV0.domain is invalid");
  }
  const relationId = assertNonEmptyString("APNTValueConservationModelV0.relationId", model.relationId);
  const acceptanceScope = assertAcceptanceScopeV0(model.acceptanceScope);
  const inputValueCount = assertNonNegativeSafeInteger(
    "APNTValueConservationModelV0.inputValueCount",
    model.inputValueCount,
  );
  const outputValueCount = assertNonNegativeSafeInteger(
    "APNTValueConservationModelV0.outputValueCount",
    model.outputValueCount,
  );
  const inputValueSumSats = assertCanonicalSatoshiString(
    "APNTValueConservationModelV0.inputValueSumSats",
    model.inputValueSumSats,
  );
  const outputValueSumSats = assertCanonicalSatoshiString(
    "APNTValueConservationModelV0.outputValueSumSats",
    model.outputValueSumSats,
  );
  const feeSats = assertCanonicalSatoshiString("APNTValueConservationModelV0.feeSats", model.feeSats);
  if (typeof model.derivedBalanceSatisfied !== "boolean") {
    throw new Error("APNTValueConservationModelV0.derivedBalanceSatisfied must be boolean");
  }
  if (typeof model.valueConservationAccepted !== "boolean") {
    throw new Error("APNTValueConservationModelV0.valueConservationAccepted must be boolean");
  }
  if (model.privateMaterialPublished !== false) {
    throw new Error("APNTValueConservationModelV0.privateMaterialPublished must be false");
  }
  if (model.valueConservationAccepted) {
    if (model.valueConservationFailureReason !== undefined) {
      throw new Error(
        "APNTValueConservationModelV0.valueConservationFailureReason must be absent when accepted",
      );
    }
  } else {
    assertNonEmptyString(
      "APNTValueConservationModelV0.valueConservationFailureReason",
      model.valueConservationFailureReason ?? "",
    );
  }
  const valueConservationFailureReason =
    model.valueConservationFailureReason === undefined
      ? undefined
      : assertNonEmptyString(
          "APNTValueConservationModelV0.valueConservationFailureReason",
          model.valueConservationFailureReason,
        );

  return Object.freeze({
    version: APNT_VALUE_CONSERVATION_MODEL_V0_VERSION,
    domain: APNT_VALUE_CONSERVATION_MODEL_V0_DOMAIN,
    relationId,
    acceptanceScope,
    inputValueCount,
    outputValueCount,
    inputValueSumSats,
    outputValueSumSats,
    feeSats,
    derivedBalanceSatisfied: model.derivedBalanceSatisfied,
    valueConservationAccepted: model.valueConservationAccepted,
    privateMaterialPublished: false,
    ...(valueConservationFailureReason === undefined ? {} : { valueConservationFailureReason }),
  });
}

export function buildAPNTValueConservationModelV0(
  args: BuildAPNTValueConservationModelV0Args,
): APNTValueConservationModelV0 {
  const relationId = assertNonEmptyString("BuildAPNTValueConservationModelV0Args.relationId", args.relationId);
  const inputValueCount = assertNonNegativeSafeInteger(
    "BuildAPNTValueConservationModelV0Args.inputValueCount",
    args.inputValueCount,
  );
  const outputValueCount = assertNonNegativeSafeInteger(
    "BuildAPNTValueConservationModelV0Args.outputValueCount",
    args.outputValueCount,
  );
  const inputValueSumSats = assertCanonicalSatoshiString(
    "BuildAPNTValueConservationModelV0Args.inputValueSumSats",
    args.inputValueSumSats,
  );
  const outputValueSumSats = assertCanonicalSatoshiString(
    "BuildAPNTValueConservationModelV0Args.outputValueSumSats",
    args.outputValueSumSats,
  );
  const feeSats = assertCanonicalSatoshiString(
    "BuildAPNTValueConservationModelV0Args.feeSats",
    args.feeSats,
  );
  const derivedBalanceSatisfied = derivedBalanceSatisfiedV0(
    inputValueSumSats,
    outputValueSumSats,
    feeSats,
  );

  return normalizeAPNTValueConservationModelV0({
    version: APNT_VALUE_CONSERVATION_MODEL_V0_VERSION,
    domain: APNT_VALUE_CONSERVATION_MODEL_V0_DOMAIN,
    relationId,
    acceptanceScope: APNT_VALUE_CONSERVATION_MODEL_V0_ACCEPTANCE_SCOPE,
    inputValueCount,
    outputValueCount,
    inputValueSumSats,
    outputValueSumSats,
    feeSats,
    derivedBalanceSatisfied,
    valueConservationAccepted: derivedBalanceSatisfied,
    privateMaterialPublished: false,
    ...(derivedBalanceSatisfied
      ? {}
      : {
          valueConservationFailureReason:
            "inputValueSumSats does not equal outputValueSumSats plus feeSats",
        }),
  });
}

export function evaluateAPNTValueConservationModelV0(
  model: APNTValueConservationModelV0,
): APNTValueConservationModelEvaluationV0 {
  const normalized = normalizeAPNTValueConservationModelV0(model);
  const derivedBalanceSatisfied = derivedBalanceSatisfiedV0(
    normalized.inputValueSumSats,
    normalized.outputValueSumSats,
    normalized.feeSats,
  );

  return Object.freeze({
    derivedBalanceSatisfied,
    valueConservationAccepted: derivedBalanceSatisfied,
    ...(derivedBalanceSatisfied
      ? {}
      : {
          valueConservationFailureReason:
            "inputValueSumSats does not equal outputValueSumSats plus feeSats",
        }),
  });
}

export function serializeAPNTValueConservationModelV0(
  model: APNTValueConservationModelV0,
): Uint8Array {
  const normalized = normalizeAPNTValueConservationModelV0(model);
  const evaluation = evaluateAPNTValueConservationModelV0(normalized);

  return serializeDeterministicUtf8({
    acceptanceScope: normalized.acceptanceScope,
    derivedBalanceSatisfied: evaluation.derivedBalanceSatisfied,
    domain: normalized.domain,
    feeSats: normalized.feeSats,
    inputValueCount: normalized.inputValueCount,
    inputValueSumSats: normalized.inputValueSumSats,
    outputValueCount: normalized.outputValueCount,
    outputValueSumSats: normalized.outputValueSumSats,
    privateMaterialPublished: false,
    relationId: normalized.relationId,
    valueConservationAccepted: evaluation.valueConservationAccepted,
    version: normalized.version,
    ...(evaluation.valueConservationFailureReason === undefined
      ? {}
      : { valueConservationFailureReason: evaluation.valueConservationFailureReason }),
  });
}

export async function apntValueConservationModelHashV0(
  model: APNTValueConservationModelV0,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_VALUE_CONSERVATION_MODEL_V0_DOMAIN,
    serializeAPNTValueConservationModelV0(model),
  );
}
