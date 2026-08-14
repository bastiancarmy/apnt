// Maturity: preview — measured zero published importers and no published
// artifact references it. Read it, don't build on it. See AGENTS.md, "The
// maturity ladder".
import { asBytes32, bytesToHex, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { serializeDeterministicUtf8 } from "./serialization.js";

export const APNT_AGGREGATION_VALIDITY_MODEL_V0_VERSION = 0;
export const APNT_AGGREGATION_VALIDITY_MODEL_V0_DOMAIN =
  "bch-cloak-apnt-v0:aggregation-validity-model";
export const APNT_AGGREGATION_VALIDITY_MODEL_V0_OUTPUT_ROOT_DOMAIN =
  "bch-cloak-apnt-v0:aggregation-output-root-model";
export const APNT_AGGREGATION_VALIDITY_MODEL_V0_BATCH_BIND_DOMAIN =
  "bch-cloak-apnt-v0:aggregation-batch-bind-model";
export const APNT_AGGREGATION_VALIDITY_MODEL_V0_ACCEPTANCE_SCOPE =
  "aggregation-validity-only";

export type APNTAggregationValidityModelTransitionV0 = Readonly<{
  transitionId: string;
  transitionValidityAccepted: boolean;
  nullifiers32: readonly Bytes32[];
  outputCommitments32: readonly Bytes32[];
  inputValueSumSats: string;
  outputValueSumSats: string;
  feeSats: string;
}>;

export type APNTAggregationValidityModelV0 = Readonly<{
  version: typeof APNT_AGGREGATION_VALIDITY_MODEL_V0_VERSION;
  domain: typeof APNT_AGGREGATION_VALIDITY_MODEL_V0_DOMAIN;
  relationId: string;
  acceptanceScope: typeof APNT_AGGREGATION_VALIDITY_MODEL_V0_ACCEPTANCE_SCOPE;
  transitionCount: number;
  transitions: readonly APNTAggregationValidityModelTransitionV0[];
  batchNullifierCount: number;
  batchOutputCommitmentCount: number;
  aggregateInputValueSumSats: string;
  aggregateOutputValueSumSats: string;
  aggregateFeeSats: string;
  publicOutputCommitmentRoot32: Bytes32;
  derivedOutputCommitmentRoot32: Bytes32;
  publicBatchBind32: Bytes32;
  derivedBatchBind32: Bytes32;
  transitionValidityAccepted: boolean;
  batchNullifierUniquenessAccepted: boolean;
  aggregateValueConservationAccepted: boolean;
  outputRootAccepted: boolean;
  publicBatchBindAccepted: boolean;
  aggregationValidityAccepted: boolean;
  aggregationValidityFailureReason?: string;
  aggregatorAssemblesTransactions: boolean;
  aggregatorCustody: boolean;
  aggregatorHoldsSecrets: boolean;
  aggregatorValidatesByAuthority: boolean;
  aggregatorSequencesUsersAsTrustBase: boolean;
  aggregatorNamespaceAuthority: boolean;
  privateMaterialPublished: false;
}>;

export type BuildAPNTAggregationValidityModelV0Args = Readonly<{
  relationId: string;
  transitions: readonly APNTAggregationValidityModelTransitionV0[];
  publicOutputCommitmentRoot32: Bytes32;
  publicBatchBind32: Bytes32;
  aggregatorAssemblesTransactions: boolean;
  aggregatorCustody: boolean;
  aggregatorHoldsSecrets: boolean;
  aggregatorValidatesByAuthority: boolean;
  aggregatorSequencesUsersAsTrustBase: boolean;
  aggregatorNamespaceAuthority: boolean;
}>;

export type DeriveAPNTAggregationBatchBindV0Args = Readonly<{
  transitionIds: readonly string[];
  nullifiers32: readonly Bytes32[];
  outputCommitmentRoot32: Bytes32;
  aggregateInputValueSumSats: string;
  aggregateOutputValueSumSats: string;
  aggregateFeeSats: string;
}>;

export type APNTAggregationValidityModelEvaluationV0 = Readonly<{
  transitionCount: number;
  batchNullifierCount: number;
  batchOutputCommitmentCount: number;
  aggregateInputValueSumSats: string;
  aggregateOutputValueSumSats: string;
  aggregateFeeSats: string;
  aggregateSumsMatchTransitions: boolean;
  derivedOutputCommitmentRoot32: Bytes32;
  derivedOutputCommitmentRootMatchesRecomputed: boolean;
  derivedBatchBind32: Bytes32;
  derivedBatchBindMatchesRecomputed: boolean;
  transitionValidityAccepted: boolean;
  batchNullifierUniquenessAccepted: boolean;
  aggregateValueConservationAccepted: boolean;
  outputRootAccepted: boolean;
  publicBatchBindAccepted: boolean;
  aggregatorTrustBoundaryAccepted: boolean;
  aggregationValidityAccepted: boolean;
  aggregationValidityFailureReason?: string;
}>;

const CANONICAL_NON_NEGATIVE_DECIMAL_RE = /^(?:0|[1-9][0-9]*)$/u;
const AGGREGATION_VALIDITY_FAILURE_REASON =
  "aggregation validity model requirements failed";

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

function assertBoolean(name: string, value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${name} must be boolean`);
  }
  return value;
}

function assertBytes32(name: string, value: unknown): Bytes32 {
  if (!(value instanceof Uint8Array)) {
    throw new Error(`${name} must be a Uint8Array`);
  }
  return asBytes32(name, value);
}

function assertCanonicalSatoshiString(name: string, value: unknown): string {
  if (typeof value !== "string" || !CANONICAL_NON_NEGATIVE_DECIMAL_RE.test(value)) {
    throw new Error(`${name} must be a canonical non-negative decimal string`);
  }
  return value;
}

function assertAcceptanceScopeV0(
  value: unknown,
): typeof APNT_AGGREGATION_VALIDITY_MODEL_V0_ACCEPTANCE_SCOPE {
  if (value !== APNT_AGGREGATION_VALIDITY_MODEL_V0_ACCEPTANCE_SCOPE) {
    throw new Error("APNTAggregationValidityModelV0.acceptanceScope is invalid");
  }
  return APNT_AGGREGATION_VALIDITY_MODEL_V0_ACCEPTANCE_SCOPE;
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return bytesToHex(left) === bytesToHex(right);
}

function normalizeTransitionV0(
  transition: APNTAggregationValidityModelTransitionV0,
): APNTAggregationValidityModelTransitionV0 {
  if (!Array.isArray(transition.nullifiers32)) {
    throw new Error("APNTAggregationValidityModelV0.transitions.nullifiers32 must be an array");
  }
  if (!Array.isArray(transition.outputCommitments32)) {
    throw new Error(
      "APNTAggregationValidityModelV0.transitions.outputCommitments32 must be an array",
    );
  }

  return Object.freeze({
    transitionId: assertNonEmptyString(
      "APNTAggregationValidityModelV0.transitions.transitionId",
      transition.transitionId,
    ),
    transitionValidityAccepted: assertBoolean(
      "APNTAggregationValidityModelV0.transitions.transitionValidityAccepted",
      transition.transitionValidityAccepted,
    ),
    nullifiers32: Object.freeze(
      transition.nullifiers32.map((nullifier32) =>
        assertBytes32(
          "APNTAggregationValidityModelV0.transitions.nullifiers32",
          nullifier32,
        ),
      ),
    ),
    outputCommitments32: Object.freeze(
      transition.outputCommitments32.map((outputCommitment32) =>
        assertBytes32(
          "APNTAggregationValidityModelV0.transitions.outputCommitments32",
          outputCommitment32,
        ),
      ),
    ),
    inputValueSumSats: assertCanonicalSatoshiString(
      "APNTAggregationValidityModelV0.transitions.inputValueSumSats",
      transition.inputValueSumSats,
    ),
    outputValueSumSats: assertCanonicalSatoshiString(
      "APNTAggregationValidityModelV0.transitions.outputValueSumSats",
      transition.outputValueSumSats,
    ),
    feeSats: assertCanonicalSatoshiString(
      "APNTAggregationValidityModelV0.transitions.feeSats",
      transition.feeSats,
    ),
  });
}

function flattenNullifiersV0(
  transitions: readonly APNTAggregationValidityModelTransitionV0[],
): readonly Bytes32[] {
  return Object.freeze(transitions.flatMap((transition) => transition.nullifiers32));
}

function flattenOutputCommitmentsV0(
  transitions: readonly APNTAggregationValidityModelTransitionV0[],
): readonly Bytes32[] {
  return Object.freeze(transitions.flatMap((transition) => transition.outputCommitments32));
}

function sumSatoshiStringsV0(values: readonly string[]): string {
  return values.reduce((sum, value) => sum + BigInt(value), 0n).toString();
}

function deriveAggregateSumsV0(
  transitions: readonly APNTAggregationValidityModelTransitionV0[],
): Readonly<{
  aggregateInputValueSumSats: string;
  aggregateOutputValueSumSats: string;
  aggregateFeeSats: string;
}> {
  return Object.freeze({
    aggregateInputValueSumSats: sumSatoshiStringsV0(
      transitions.map((transition) => transition.inputValueSumSats),
    ),
    aggregateOutputValueSumSats: sumSatoshiStringsV0(
      transitions.map((transition) => transition.outputValueSumSats),
    ),
    aggregateFeeSats: sumSatoshiStringsV0(
      transitions.map((transition) => transition.feeSats),
    ),
  });
}

function hasDuplicateNullifiersV0(nullifiers32: readonly Bytes32[]): boolean {
  const nullifierHexes = nullifiers32.map((nullifier32) => bytesToHex(nullifier32));
  return new Set(nullifierHexes).size !== nullifierHexes.length;
}

function aggregateBalanceSatisfiedV0(args: {
  aggregateInputValueSumSats: string;
  aggregateOutputValueSumSats: string;
  aggregateFeeSats: string;
}): boolean {
  return (
    BigInt(args.aggregateInputValueSumSats) ===
    BigInt(args.aggregateOutputValueSumSats) + BigInt(args.aggregateFeeSats)
  );
}

function aggregatorTrustBoundaryAcceptedV0(args: {
  aggregatorAssemblesTransactions: boolean;
  aggregatorCustody: boolean;
  aggregatorHoldsSecrets: boolean;
  aggregatorValidatesByAuthority: boolean;
  aggregatorSequencesUsersAsTrustBase: boolean;
  aggregatorNamespaceAuthority: boolean;
}): boolean {
  return (
    args.aggregatorAssemblesTransactions === true &&
    args.aggregatorCustody === false &&
    args.aggregatorHoldsSecrets === false &&
    args.aggregatorValidatesByAuthority === false &&
    args.aggregatorSequencesUsersAsTrustBase === false &&
    args.aggregatorNamespaceAuthority === false
  );
}

export async function deriveAPNTAggregationOutputCommitmentRootV0(
  outputCommitments32: readonly Bytes32[],
): Promise<Bytes32> {
  if (!Array.isArray(outputCommitments32)) {
    throw new Error("outputCommitments32 must be an array");
  }
  const normalizedOutputCommitments32 = outputCommitments32.map((outputCommitment32) =>
    assertBytes32(
      "deriveAPNTAggregationOutputCommitmentRootV0.outputCommitments32",
      outputCommitment32,
    ),
  );

  return sha256DomainSeparated(
    APNT_AGGREGATION_VALIDITY_MODEL_V0_OUTPUT_ROOT_DOMAIN,
    serializeDeterministicUtf8({ outputCommitments32: normalizedOutputCommitments32 }),
  );
}

export async function deriveAPNTAggregationBatchBindV0(
  args: DeriveAPNTAggregationBatchBindV0Args,
): Promise<Bytes32> {
  if (!Array.isArray(args.transitionIds)) {
    throw new Error("DeriveAPNTAggregationBatchBindV0Args.transitionIds must be an array");
  }
  if (!Array.isArray(args.nullifiers32)) {
    throw new Error("DeriveAPNTAggregationBatchBindV0Args.nullifiers32 must be an array");
  }
  const transitionIds = args.transitionIds.map((transitionId) =>
    assertNonEmptyString("DeriveAPNTAggregationBatchBindV0Args.transitionIds", transitionId),
  );
  const nullifiers32 = args.nullifiers32.map((nullifier32) =>
    assertBytes32("DeriveAPNTAggregationBatchBindV0Args.nullifiers32", nullifier32),
  );
  const outputCommitmentRoot32 = assertBytes32(
    "DeriveAPNTAggregationBatchBindV0Args.outputCommitmentRoot32",
    args.outputCommitmentRoot32,
  );
  const aggregateInputValueSumSats = assertCanonicalSatoshiString(
    "DeriveAPNTAggregationBatchBindV0Args.aggregateInputValueSumSats",
    args.aggregateInputValueSumSats,
  );
  const aggregateOutputValueSumSats = assertCanonicalSatoshiString(
    "DeriveAPNTAggregationBatchBindV0Args.aggregateOutputValueSumSats",
    args.aggregateOutputValueSumSats,
  );
  const aggregateFeeSats = assertCanonicalSatoshiString(
    "DeriveAPNTAggregationBatchBindV0Args.aggregateFeeSats",
    args.aggregateFeeSats,
  );

  return sha256DomainSeparated(
    APNT_AGGREGATION_VALIDITY_MODEL_V0_BATCH_BIND_DOMAIN,
    serializeDeterministicUtf8({
      aggregateFeeSats,
      aggregateInputValueSumSats,
      aggregateOutputValueSumSats,
      nullifiers32,
      outputCommitmentRoot32,
      transitionIds,
    }),
  );
}

export function normalizeAPNTAggregationValidityModelV0(
  model: APNTAggregationValidityModelV0,
): APNTAggregationValidityModelV0 {
  if (model.version !== APNT_AGGREGATION_VALIDITY_MODEL_V0_VERSION) {
    throw new Error("APNTAggregationValidityModelV0.version must be 0");
  }
  if (model.domain !== APNT_AGGREGATION_VALIDITY_MODEL_V0_DOMAIN) {
    throw new Error("APNTAggregationValidityModelV0.domain is invalid");
  }
  const relationId = assertNonEmptyString(
    "APNTAggregationValidityModelV0.relationId",
    model.relationId,
  );
  const acceptanceScope = assertAcceptanceScopeV0(model.acceptanceScope);
  const transitionCount = assertNonNegativeSafeInteger(
    "APNTAggregationValidityModelV0.transitionCount",
    model.transitionCount,
  );
  if (!Array.isArray(model.transitions)) {
    throw new Error("APNTAggregationValidityModelV0.transitions must be an array");
  }
  const transitions = Object.freeze(
    model.transitions.map((transition) => normalizeTransitionV0(transition)),
  );
  if (transitionCount !== transitions.length) {
    throw new Error("APNTAggregationValidityModelV0.transitionCount must equal transitions.length");
  }
  const batchNullifierCount = assertNonNegativeSafeInteger(
    "APNTAggregationValidityModelV0.batchNullifierCount",
    model.batchNullifierCount,
  );
  if (batchNullifierCount !== flattenNullifiersV0(transitions).length) {
    throw new Error(
      "APNTAggregationValidityModelV0.batchNullifierCount must equal the flattened nullifier count",
    );
  }
  const batchOutputCommitmentCount = assertNonNegativeSafeInteger(
    "APNTAggregationValidityModelV0.batchOutputCommitmentCount",
    model.batchOutputCommitmentCount,
  );
  if (batchOutputCommitmentCount !== flattenOutputCommitmentsV0(transitions).length) {
    throw new Error(
      "APNTAggregationValidityModelV0.batchOutputCommitmentCount must equal the flattened output commitment count",
    );
  }
  const aggregateInputValueSumSats = assertCanonicalSatoshiString(
    "APNTAggregationValidityModelV0.aggregateInputValueSumSats",
    model.aggregateInputValueSumSats,
  );
  const aggregateOutputValueSumSats = assertCanonicalSatoshiString(
    "APNTAggregationValidityModelV0.aggregateOutputValueSumSats",
    model.aggregateOutputValueSumSats,
  );
  const aggregateFeeSats = assertCanonicalSatoshiString(
    "APNTAggregationValidityModelV0.aggregateFeeSats",
    model.aggregateFeeSats,
  );
  const publicOutputCommitmentRoot32 = assertBytes32(
    "APNTAggregationValidityModelV0.publicOutputCommitmentRoot32",
    model.publicOutputCommitmentRoot32,
  );
  const derivedOutputCommitmentRoot32 = assertBytes32(
    "APNTAggregationValidityModelV0.derivedOutputCommitmentRoot32",
    model.derivedOutputCommitmentRoot32,
  );
  const publicBatchBind32 = assertBytes32(
    "APNTAggregationValidityModelV0.publicBatchBind32",
    model.publicBatchBind32,
  );
  const derivedBatchBind32 = assertBytes32(
    "APNTAggregationValidityModelV0.derivedBatchBind32",
    model.derivedBatchBind32,
  );
  const transitionValidityAccepted = assertBoolean(
    "APNTAggregationValidityModelV0.transitionValidityAccepted",
    model.transitionValidityAccepted,
  );
  const batchNullifierUniquenessAccepted = assertBoolean(
    "APNTAggregationValidityModelV0.batchNullifierUniquenessAccepted",
    model.batchNullifierUniquenessAccepted,
  );
  const aggregateValueConservationAccepted = assertBoolean(
    "APNTAggregationValidityModelV0.aggregateValueConservationAccepted",
    model.aggregateValueConservationAccepted,
  );
  const outputRootAccepted = assertBoolean(
    "APNTAggregationValidityModelV0.outputRootAccepted",
    model.outputRootAccepted,
  );
  const publicBatchBindAccepted = assertBoolean(
    "APNTAggregationValidityModelV0.publicBatchBindAccepted",
    model.publicBatchBindAccepted,
  );
  const aggregationValidityAccepted = assertBoolean(
    "APNTAggregationValidityModelV0.aggregationValidityAccepted",
    model.aggregationValidityAccepted,
  );
  const aggregatorAssemblesTransactions = assertBoolean(
    "APNTAggregationValidityModelV0.aggregatorAssemblesTransactions",
    model.aggregatorAssemblesTransactions,
  );
  const aggregatorCustody = assertBoolean(
    "APNTAggregationValidityModelV0.aggregatorCustody",
    model.aggregatorCustody,
  );
  const aggregatorHoldsSecrets = assertBoolean(
    "APNTAggregationValidityModelV0.aggregatorHoldsSecrets",
    model.aggregatorHoldsSecrets,
  );
  const aggregatorValidatesByAuthority = assertBoolean(
    "APNTAggregationValidityModelV0.aggregatorValidatesByAuthority",
    model.aggregatorValidatesByAuthority,
  );
  const aggregatorSequencesUsersAsTrustBase = assertBoolean(
    "APNTAggregationValidityModelV0.aggregatorSequencesUsersAsTrustBase",
    model.aggregatorSequencesUsersAsTrustBase,
  );
  const aggregatorNamespaceAuthority = assertBoolean(
    "APNTAggregationValidityModelV0.aggregatorNamespaceAuthority",
    model.aggregatorNamespaceAuthority,
  );
  if (model.privateMaterialPublished !== false) {
    throw new Error("APNTAggregationValidityModelV0.privateMaterialPublished must be false");
  }
  if (aggregationValidityAccepted) {
    if (model.aggregationValidityFailureReason !== undefined) {
      throw new Error(
        "APNTAggregationValidityModelV0.aggregationValidityFailureReason must be absent when accepted",
      );
    }
  } else {
    assertNonEmptyString(
      "APNTAggregationValidityModelV0.aggregationValidityFailureReason",
      model.aggregationValidityFailureReason ?? "",
    );
  }
  const aggregationValidityFailureReason =
    model.aggregationValidityFailureReason === undefined
      ? undefined
      : assertNonEmptyString(
          "APNTAggregationValidityModelV0.aggregationValidityFailureReason",
          model.aggregationValidityFailureReason,
        );

  return Object.freeze({
    version: APNT_AGGREGATION_VALIDITY_MODEL_V0_VERSION,
    domain: APNT_AGGREGATION_VALIDITY_MODEL_V0_DOMAIN,
    relationId,
    acceptanceScope,
    transitionCount,
    transitions,
    batchNullifierCount,
    batchOutputCommitmentCount,
    aggregateInputValueSumSats,
    aggregateOutputValueSumSats,
    aggregateFeeSats,
    publicOutputCommitmentRoot32,
    derivedOutputCommitmentRoot32,
    publicBatchBind32,
    derivedBatchBind32,
    transitionValidityAccepted,
    batchNullifierUniquenessAccepted,
    aggregateValueConservationAccepted,
    outputRootAccepted,
    publicBatchBindAccepted,
    aggregationValidityAccepted,
    aggregatorAssemblesTransactions,
    aggregatorCustody,
    aggregatorHoldsSecrets,
    aggregatorValidatesByAuthority,
    aggregatorSequencesUsersAsTrustBase,
    aggregatorNamespaceAuthority,
    privateMaterialPublished: false,
    ...(aggregationValidityFailureReason === undefined
      ? {}
      : { aggregationValidityFailureReason }),
  });
}

export async function buildAPNTAggregationValidityModelV0(
  args: BuildAPNTAggregationValidityModelV0Args,
): Promise<APNTAggregationValidityModelV0> {
  const relationId = assertNonEmptyString(
    "BuildAPNTAggregationValidityModelV0Args.relationId",
    args.relationId,
  );
  if (!Array.isArray(args.transitions)) {
    throw new Error("BuildAPNTAggregationValidityModelV0Args.transitions must be an array");
  }
  const transitions = Object.freeze(
    args.transitions.map((transition) => normalizeTransitionV0(transition)),
  );
  const nullifiers32 = flattenNullifiersV0(transitions);
  const outputCommitments32 = flattenOutputCommitmentsV0(transitions);
  const aggregateSums = deriveAggregateSumsV0(transitions);
  const publicOutputCommitmentRoot32 = assertBytes32(
    "BuildAPNTAggregationValidityModelV0Args.publicOutputCommitmentRoot32",
    args.publicOutputCommitmentRoot32,
  );
  const derivedOutputCommitmentRoot32 =
    await deriveAPNTAggregationOutputCommitmentRootV0(outputCommitments32);
  const publicBatchBind32 = assertBytes32(
    "BuildAPNTAggregationValidityModelV0Args.publicBatchBind32",
    args.publicBatchBind32,
  );
  const derivedBatchBind32 = await deriveAPNTAggregationBatchBindV0({
    transitionIds: transitions.map((transition) => transition.transitionId),
    nullifiers32,
    outputCommitmentRoot32: derivedOutputCommitmentRoot32,
    ...aggregateSums,
  });
  const transitionValidityAccepted = transitions.every(
    (transition) => transition.transitionValidityAccepted,
  );
  const batchNullifierUniquenessAccepted = !hasDuplicateNullifiersV0(nullifiers32);
  const aggregateValueConservationAccepted = aggregateBalanceSatisfiedV0(aggregateSums);
  const outputRootAccepted = bytesEqual(
    publicOutputCommitmentRoot32,
    derivedOutputCommitmentRoot32,
  );
  const publicBatchBindAccepted = bytesEqual(publicBatchBind32, derivedBatchBind32);
  const aggregatorAssemblesTransactions = assertBoolean(
    "BuildAPNTAggregationValidityModelV0Args.aggregatorAssemblesTransactions",
    args.aggregatorAssemblesTransactions,
  );
  const aggregatorCustody = assertBoolean(
    "BuildAPNTAggregationValidityModelV0Args.aggregatorCustody",
    args.aggregatorCustody,
  );
  const aggregatorHoldsSecrets = assertBoolean(
    "BuildAPNTAggregationValidityModelV0Args.aggregatorHoldsSecrets",
    args.aggregatorHoldsSecrets,
  );
  const aggregatorValidatesByAuthority = assertBoolean(
    "BuildAPNTAggregationValidityModelV0Args.aggregatorValidatesByAuthority",
    args.aggregatorValidatesByAuthority,
  );
  const aggregatorSequencesUsersAsTrustBase = assertBoolean(
    "BuildAPNTAggregationValidityModelV0Args.aggregatorSequencesUsersAsTrustBase",
    args.aggregatorSequencesUsersAsTrustBase,
  );
  const aggregatorNamespaceAuthority = assertBoolean(
    "BuildAPNTAggregationValidityModelV0Args.aggregatorNamespaceAuthority",
    args.aggregatorNamespaceAuthority,
  );
  const aggregatorTrustBoundaryAccepted = aggregatorTrustBoundaryAcceptedV0({
    aggregatorAssemblesTransactions,
    aggregatorCustody,
    aggregatorHoldsSecrets,
    aggregatorValidatesByAuthority,
    aggregatorSequencesUsersAsTrustBase,
    aggregatorNamespaceAuthority,
  });
  const aggregationValidityAccepted =
    transitionValidityAccepted &&
    batchNullifierUniquenessAccepted &&
    aggregateValueConservationAccepted &&
    outputRootAccepted &&
    publicBatchBindAccepted &&
    aggregatorTrustBoundaryAccepted;

  return normalizeAPNTAggregationValidityModelV0({
    version: APNT_AGGREGATION_VALIDITY_MODEL_V0_VERSION,
    domain: APNT_AGGREGATION_VALIDITY_MODEL_V0_DOMAIN,
    relationId,
    acceptanceScope: APNT_AGGREGATION_VALIDITY_MODEL_V0_ACCEPTANCE_SCOPE,
    transitionCount: transitions.length,
    transitions,
    batchNullifierCount: nullifiers32.length,
    batchOutputCommitmentCount: outputCommitments32.length,
    ...aggregateSums,
    publicOutputCommitmentRoot32,
    derivedOutputCommitmentRoot32,
    publicBatchBind32,
    derivedBatchBind32,
    transitionValidityAccepted,
    batchNullifierUniquenessAccepted,
    aggregateValueConservationAccepted,
    outputRootAccepted,
    publicBatchBindAccepted,
    aggregationValidityAccepted,
    aggregatorAssemblesTransactions,
    aggregatorCustody,
    aggregatorHoldsSecrets,
    aggregatorValidatesByAuthority,
    aggregatorSequencesUsersAsTrustBase,
    aggregatorNamespaceAuthority,
    privateMaterialPublished: false,
    ...(aggregationValidityAccepted
      ? {}
      : { aggregationValidityFailureReason: AGGREGATION_VALIDITY_FAILURE_REASON }),
  });
}

export async function evaluateAPNTAggregationValidityModelV0(
  model: APNTAggregationValidityModelV0,
): Promise<APNTAggregationValidityModelEvaluationV0> {
  const normalized = normalizeAPNTAggregationValidityModelV0(model);
  const nullifiers32 = flattenNullifiersV0(normalized.transitions);
  const outputCommitments32 = flattenOutputCommitmentsV0(normalized.transitions);
  const aggregateSums = deriveAggregateSumsV0(normalized.transitions);
  const aggregateSumsMatchTransitions =
    normalized.aggregateInputValueSumSats === aggregateSums.aggregateInputValueSumSats &&
    normalized.aggregateOutputValueSumSats === aggregateSums.aggregateOutputValueSumSats &&
    normalized.aggregateFeeSats === aggregateSums.aggregateFeeSats;
  const derivedOutputCommitmentRoot32 =
    await deriveAPNTAggregationOutputCommitmentRootV0(outputCommitments32);
  const derivedOutputCommitmentRootMatchesRecomputed = bytesEqual(
    normalized.derivedOutputCommitmentRoot32,
    derivedOutputCommitmentRoot32,
  );
  const outputRootAccepted =
    derivedOutputCommitmentRootMatchesRecomputed &&
    bytesEqual(normalized.publicOutputCommitmentRoot32, derivedOutputCommitmentRoot32);
  const derivedBatchBind32 = await deriveAPNTAggregationBatchBindV0({
    transitionIds: normalized.transitions.map((transition) => transition.transitionId),
    nullifiers32,
    outputCommitmentRoot32: derivedOutputCommitmentRoot32,
    ...aggregateSums,
  });
  const derivedBatchBindMatchesRecomputed = bytesEqual(
    normalized.derivedBatchBind32,
    derivedBatchBind32,
  );
  const publicBatchBindAccepted =
    derivedBatchBindMatchesRecomputed &&
    bytesEqual(normalized.publicBatchBind32, derivedBatchBind32);
  const transitionValidityAccepted = normalized.transitions.every(
    (transition) => transition.transitionValidityAccepted,
  );
  const batchNullifierUniquenessAccepted = !hasDuplicateNullifiersV0(nullifiers32);
  const aggregateValueConservationAccepted =
    aggregateSumsMatchTransitions && aggregateBalanceSatisfiedV0(aggregateSums);
  const aggregatorTrustBoundaryAccepted = aggregatorTrustBoundaryAcceptedV0(normalized);
  const aggregationValidityAccepted =
    transitionValidityAccepted &&
    batchNullifierUniquenessAccepted &&
    aggregateValueConservationAccepted &&
    outputRootAccepted &&
    publicBatchBindAccepted &&
    aggregatorTrustBoundaryAccepted;

  return Object.freeze({
    transitionCount: normalized.transitions.length,
    batchNullifierCount: nullifiers32.length,
    batchOutputCommitmentCount: outputCommitments32.length,
    ...aggregateSums,
    aggregateSumsMatchTransitions,
    derivedOutputCommitmentRoot32,
    derivedOutputCommitmentRootMatchesRecomputed,
    derivedBatchBind32,
    derivedBatchBindMatchesRecomputed,
    transitionValidityAccepted,
    batchNullifierUniquenessAccepted,
    aggregateValueConservationAccepted,
    outputRootAccepted,
    publicBatchBindAccepted,
    aggregatorTrustBoundaryAccepted,
    aggregationValidityAccepted,
    ...(aggregationValidityAccepted
      ? {}
      : { aggregationValidityFailureReason: AGGREGATION_VALIDITY_FAILURE_REASON }),
  });
}

export async function serializeAPNTAggregationValidityModelV0(
  model: APNTAggregationValidityModelV0,
): Promise<Uint8Array> {
  const normalized = normalizeAPNTAggregationValidityModelV0(model);
  const evaluation = await evaluateAPNTAggregationValidityModelV0(normalized);

  return serializeDeterministicUtf8({
    acceptanceScope: normalized.acceptanceScope,
    aggregateFeeSats: evaluation.aggregateFeeSats,
    aggregateInputValueSumSats: evaluation.aggregateInputValueSumSats,
    aggregateOutputValueSumSats: evaluation.aggregateOutputValueSumSats,
    aggregateSumsMatchTransitions: evaluation.aggregateSumsMatchTransitions,
    aggregateValueConservationAccepted: evaluation.aggregateValueConservationAccepted,
    aggregationValidityAccepted: evaluation.aggregationValidityAccepted,
    aggregatorAssemblesTransactions: normalized.aggregatorAssemblesTransactions,
    aggregatorCustody: normalized.aggregatorCustody,
    aggregatorHoldsSecrets: normalized.aggregatorHoldsSecrets,
    aggregatorNamespaceAuthority: normalized.aggregatorNamespaceAuthority,
    aggregatorSequencesUsersAsTrustBase: normalized.aggregatorSequencesUsersAsTrustBase,
    aggregatorTrustBoundaryAccepted: evaluation.aggregatorTrustBoundaryAccepted,
    aggregatorValidatesByAuthority: normalized.aggregatorValidatesByAuthority,
    batchNullifierCount: evaluation.batchNullifierCount,
    batchNullifierUniquenessAccepted: evaluation.batchNullifierUniquenessAccepted,
    batchOutputCommitmentCount: evaluation.batchOutputCommitmentCount,
    derivedBatchBind32: evaluation.derivedBatchBind32,
    derivedBatchBindMatchesRecomputed: evaluation.derivedBatchBindMatchesRecomputed,
    derivedOutputCommitmentRoot32: evaluation.derivedOutputCommitmentRoot32,
    derivedOutputCommitmentRootMatchesRecomputed:
      evaluation.derivedOutputCommitmentRootMatchesRecomputed,
    domain: normalized.domain,
    outputRootAccepted: evaluation.outputRootAccepted,
    privateMaterialPublished: false,
    publicBatchBind32: normalized.publicBatchBind32,
    publicBatchBindAccepted: evaluation.publicBatchBindAccepted,
    publicOutputCommitmentRoot32: normalized.publicOutputCommitmentRoot32,
    relationId: normalized.relationId,
    transitionCount: evaluation.transitionCount,
    transitions: normalized.transitions.map((transition) => ({
      feeSats: transition.feeSats,
      inputValueSumSats: transition.inputValueSumSats,
      nullifiers32: transition.nullifiers32,
      outputCommitments32: transition.outputCommitments32,
      outputValueSumSats: transition.outputValueSumSats,
      transitionId: transition.transitionId,
      transitionValidityAccepted: transition.transitionValidityAccepted,
    })),
    transitionValidityAccepted: evaluation.transitionValidityAccepted,
    version: normalized.version,
    ...(evaluation.aggregationValidityFailureReason === undefined
      ? {}
      : { aggregationValidityFailureReason: evaluation.aggregationValidityFailureReason }),
  });
}

export async function apntAggregationValidityModelHashV0(
  model: APNTAggregationValidityModelV0,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_AGGREGATION_VALIDITY_MODEL_V0_DOMAIN,
    await serializeAPNTAggregationValidityModelV0(model),
  );
}
