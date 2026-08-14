// Maturity: preview — measured zero published importers and no published
// artifact references it. Read it, don't build on it. See AGENTS.md, "The
// maturity ladder".
import { asBytes32, bytesToHex, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { serializeDeterministicUtf8 } from "./serialization.js";

export const APNT_TRANSITION_VALIDITY_MODEL_V0_VERSION = 0;
export const APNT_TRANSITION_VALIDITY_MODEL_V0_DOMAIN =
  "bch-cloak-apnt-v0:transition-validity-model";
export const APNT_TRANSITION_VALIDITY_MODEL_V0_ACCEPTANCE_SCOPE =
  "transition-validity-only";

export type APNTTransitionValidityModelV0 = Readonly<{
  version: typeof APNT_TRANSITION_VALIDITY_MODEL_V0_VERSION;
  domain: typeof APNT_TRANSITION_VALIDITY_MODEL_V0_DOMAIN;
  relationId: string;
  acceptanceScope: typeof APNT_TRANSITION_VALIDITY_MODEL_V0_ACCEPTANCE_SCOPE;
  privateWitnessCommitment32: Bytes32;
  publicTransitionStatementBind32: Bytes32;
  derivedTransitionStatementBind32: Bytes32;
  transitionValidityAccepted: boolean;
  transitionValidityFailureReason?: string;
  privateMaterialPublished: false;
}>;

export type BuildAPNTTransitionValidityModelV0Args = Readonly<{
  relationId: string;
  privateWitnessCommitment32: Bytes32;
  publicTransitionStatementBind32: Bytes32;
}>;

export type APNTTransitionValidityModelEvaluationV0 = Readonly<{
  derivedBindMatchesWitnessCommitment: boolean;
  publicBindMatchesDerivedBind: boolean;
  privateWitnessToPublicTransitionStatementBindConsistent: boolean;
  transitionValidityAccepted: boolean;
  transitionValidityFailureReason?: string;
}>;

const PUBLIC_TRANSITION_STATEMENT_MODEL_V0_DOMAIN =
  "bch-cloak-apnt-v0:transition-validity-public-statement";

function assertNonEmptyString(name: string, value: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

function assertBytes32(name: string, value: Bytes32): Bytes32 {
  return asBytes32(name, value);
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return bytesToHex(left) === bytesToHex(right);
}

function assertAcceptanceScopeV0(value: string): typeof APNT_TRANSITION_VALIDITY_MODEL_V0_ACCEPTANCE_SCOPE {
  if (value !== APNT_TRANSITION_VALIDITY_MODEL_V0_ACCEPTANCE_SCOPE) {
    throw new Error("APNTTransitionValidityModelV0.acceptanceScope is invalid");
  }
  return APNT_TRANSITION_VALIDITY_MODEL_V0_ACCEPTANCE_SCOPE;
}

async function derivePublicTransitionStatementBindV0(args: {
  relationId: string;
  privateWitnessCommitment32: Bytes32;
}): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_TRANSITION_VALIDITY_MODEL_V0_DOMAIN,
    serializeDeterministicUtf8({
      acceptanceScope: APNT_TRANSITION_VALIDITY_MODEL_V0_ACCEPTANCE_SCOPE,
      domain: PUBLIC_TRANSITION_STATEMENT_MODEL_V0_DOMAIN,
      privateWitnessCommitment32: assertBytes32(
        "APNTTransitionValidityModelV0.privateWitnessCommitment32",
        args.privateWitnessCommitment32,
      ),
      relationId: assertNonEmptyString("APNTTransitionValidityModelV0.relationId", args.relationId),
      version: APNT_TRANSITION_VALIDITY_MODEL_V0_VERSION,
    }),
  );
}

export async function deriveAPNTTransitionValidityDerivedTransitionStatementBindV0(args: {
  relationId: string;
  privateWitnessCommitment32: Bytes32;
}): Promise<Bytes32> {
  return derivePublicTransitionStatementBindV0(args);
}

export function normalizeAPNTTransitionValidityModelV0(
  model: APNTTransitionValidityModelV0,
): APNTTransitionValidityModelV0 {
  if (model.version !== APNT_TRANSITION_VALIDITY_MODEL_V0_VERSION) {
    throw new Error("APNTTransitionValidityModelV0.version must be 0");
  }
  if (model.domain !== APNT_TRANSITION_VALIDITY_MODEL_V0_DOMAIN) {
    throw new Error("APNTTransitionValidityModelV0.domain is invalid");
  }
  const relationId = assertNonEmptyString("APNTTransitionValidityModelV0.relationId", model.relationId);
  const acceptanceScope = assertAcceptanceScopeV0(model.acceptanceScope);
  const privateWitnessCommitment32 = assertBytes32(
    "APNTTransitionValidityModelV0.privateWitnessCommitment32",
    model.privateWitnessCommitment32,
  );
  const publicTransitionStatementBind32 = assertBytes32(
    "APNTTransitionValidityModelV0.publicTransitionStatementBind32",
    model.publicTransitionStatementBind32,
  );
  const derivedTransitionStatementBind32 = assertBytes32(
    "APNTTransitionValidityModelV0.derivedTransitionStatementBind32",
    model.derivedTransitionStatementBind32,
  );
  if (typeof model.transitionValidityAccepted !== "boolean") {
    throw new Error("APNTTransitionValidityModelV0.transitionValidityAccepted must be boolean");
  }
  if (model.privateMaterialPublished !== false) {
    throw new Error("APNTTransitionValidityModelV0.privateMaterialPublished must be false");
  }

  if (model.transitionValidityAccepted) {
    if (model.transitionValidityFailureReason !== undefined) {
      throw new Error(
        "APNTTransitionValidityModelV0.transitionValidityFailureReason must be absent when accepted",
      );
    }
  } else {
    assertNonEmptyString(
      "APNTTransitionValidityModelV0.transitionValidityFailureReason",
      model.transitionValidityFailureReason ?? "",
    );
  }

  const transitionValidityFailureReason =
    model.transitionValidityFailureReason === undefined
      ? undefined
      : assertNonEmptyString(
          "APNTTransitionValidityModelV0.transitionValidityFailureReason",
          model.transitionValidityFailureReason,
        );

  return Object.freeze({
    version: APNT_TRANSITION_VALIDITY_MODEL_V0_VERSION,
    domain: APNT_TRANSITION_VALIDITY_MODEL_V0_DOMAIN,
    relationId,
    acceptanceScope,
    privateWitnessCommitment32,
    publicTransitionStatementBind32,
    derivedTransitionStatementBind32,
    transitionValidityAccepted: model.transitionValidityAccepted,
    privateMaterialPublished: false,
    ...(transitionValidityFailureReason === undefined
      ? {}
      : { transitionValidityFailureReason }),
  });
}

export async function buildAPNTTransitionValidityModelV0(
  args: BuildAPNTTransitionValidityModelV0Args,
): Promise<APNTTransitionValidityModelV0> {
  const relationId = assertNonEmptyString("BuildAPNTTransitionValidityModelV0Args.relationId", args.relationId);
  const privateWitnessCommitment32 = assertBytes32(
    "BuildAPNTTransitionValidityModelV0Args.privateWitnessCommitment32",
    args.privateWitnessCommitment32,
  );
  const publicTransitionStatementBind32 = assertBytes32(
    "BuildAPNTTransitionValidityModelV0Args.publicTransitionStatementBind32",
    args.publicTransitionStatementBind32,
  );
  const derivedTransitionStatementBind32 = await derivePublicTransitionStatementBindV0({
    relationId,
    privateWitnessCommitment32,
  });
  const transitionValidityAccepted = bytesEqual(
    publicTransitionStatementBind32,
    derivedTransitionStatementBind32,
  );

  return normalizeAPNTTransitionValidityModelV0({
    version: APNT_TRANSITION_VALIDITY_MODEL_V0_VERSION,
    domain: APNT_TRANSITION_VALIDITY_MODEL_V0_DOMAIN,
    relationId,
    acceptanceScope: APNT_TRANSITION_VALIDITY_MODEL_V0_ACCEPTANCE_SCOPE,
    privateWitnessCommitment32,
    publicTransitionStatementBind32,
    derivedTransitionStatementBind32,
    transitionValidityAccepted,
    privateMaterialPublished: false,
    ...(transitionValidityAccepted
      ? {}
      : {
          transitionValidityFailureReason:
            "publicTransitionStatementBind32 does not match derivedTransitionStatementBind32",
        }),
  });
}

export async function evaluateAPNTTransitionValidityModelV0(
  model: APNTTransitionValidityModelV0,
): Promise<APNTTransitionValidityModelEvaluationV0> {
  const normalized = normalizeAPNTTransitionValidityModelV0(model);
  const recomputedDerivedTransitionStatementBind32 =
    await deriveAPNTTransitionValidityDerivedTransitionStatementBindV0({
      relationId: normalized.relationId,
      privateWitnessCommitment32: normalized.privateWitnessCommitment32,
    });
  const derivedBindMatchesWitnessCommitment = bytesEqual(
    normalized.derivedTransitionStatementBind32,
    recomputedDerivedTransitionStatementBind32,
  );
  const publicBindMatchesDerivedBind = bytesEqual(
    normalized.publicTransitionStatementBind32,
    normalized.derivedTransitionStatementBind32,
  );
  const transitionValidityAccepted =
    derivedBindMatchesWitnessCommitment && publicBindMatchesDerivedBind;

  return Object.freeze({
    derivedBindMatchesWitnessCommitment,
    publicBindMatchesDerivedBind,
    privateWitnessToPublicTransitionStatementBindConsistent: transitionValidityAccepted,
    transitionValidityAccepted,
    ...(transitionValidityAccepted
      ? {}
      : {
          transitionValidityFailureReason:
            "transition validity model bind consistency failed",
        }),
  });
}

export async function serializeAPNTTransitionValidityModelV0(
  model: APNTTransitionValidityModelV0,
): Promise<Uint8Array> {
  const normalized = normalizeAPNTTransitionValidityModelV0(model);
  const evaluation = await evaluateAPNTTransitionValidityModelV0(normalized);

  return serializeDeterministicUtf8({
    acceptanceScope: normalized.acceptanceScope,
    derivedBindMatchesWitnessCommitment: evaluation.derivedBindMatchesWitnessCommitment,
    derivedTransitionStatementBind32: normalized.derivedTransitionStatementBind32,
    domain: normalized.domain,
    privateMaterialPublished: normalized.privateMaterialPublished,
    privateWitnessCommitment32: normalized.privateWitnessCommitment32,
    privateWitnessToPublicTransitionStatementBindConsistent:
      evaluation.privateWitnessToPublicTransitionStatementBindConsistent,
    publicBindMatchesDerivedBind: evaluation.publicBindMatchesDerivedBind,
    publicTransitionStatementBind32: normalized.publicTransitionStatementBind32,
    relationId: normalized.relationId,
    transitionValidityAccepted: evaluation.transitionValidityAccepted,
    version: normalized.version,
    ...(evaluation.transitionValidityFailureReason === undefined
      ? {}
      : { transitionValidityFailureReason: evaluation.transitionValidityFailureReason }),
  });
}

export async function apntTransitionValidityModelHashV0(
  model: APNTTransitionValidityModelV0,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_TRANSITION_VALIDITY_MODEL_V0_DOMAIN,
    await serializeAPNTTransitionValidityModelV0(model),
  );
}
