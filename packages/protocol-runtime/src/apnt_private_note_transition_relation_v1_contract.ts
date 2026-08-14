// Maturity: preview — measured zero published importers and no published
// artifact references it. Read it, don't build on it. See AGENTS.md, "The
// maturity ladder".
import { type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { serializeDeterministicUtf8 } from "./serialization.js";

/** Additive vNext private host-relation boundary. It does not alter Relation V0. */
export const APNT_PRIVATE_NOTE_TRANSITION_RELATION_V1_VERSION = 1;
export const APNT_PRIVATE_NOTE_TRANSITION_RELATION_V1_DOMAIN =
  "bch-cloak-apnt-v1:private-note-transition-relation-v1";
export const APNT_PRIVATE_NOTE_TRANSITION_RELATION_V1_IDENTITY =
  "apnt-private-note-transition-relation-v1";

/** Closed first-failure sequence for the additive relation. */
export const APNT_PRIVATE_NOTE_TRANSITION_EVALUATION_ORDER_V1 = Object.freeze([
  "raw-statement-nullifier-duplicate",
  "raw-token-policy",
  "raw-private-transition-transparent-output",
  "statement-normalization-and-commitment",
  "expected-statement-commitment",
  "canonical-profile-bytes-and-identities",
  "mode",
  "raw-backing-role",
  "statement-structure",
  "witness-shape",
  "witness-expected-statement-commitment",
  "logical-witness-identity",
  "consumed-backing-cell-correspondence",
  "created-backing-cell-correspondence",
  "created-exit-authority-and-seal-template",
  "consumed-bundle-completeness-and-disjointness",
  "created-bundle-completeness-and-disjointness",
  "private-value-arithmetic",
  "private-conservation",
  "consumed-authority",
  "consumed-nullifier",
  "statement-nullifier-correspondence",
  "fixed-slot-recovery-and-ordered-carriers",
  "accepted",
] as const);

export const APNT_PRIVATE_NOTE_TRANSITION_RELATION_V1_CONTRACT_COMMITMENT_DOMAIN =
  "bch-cloak-apnt-v1:private-note-transition-relation-contract-v1";

/**
 * Cycle-free semantic description. It names its version/domain/identity, but
 * deliberately contains neither its own derived commitment nor any profile,
 * program, deployment, or run-corpus identity.
 */
export const APNT_PRIVATE_NOTE_TRANSITION_RELATION_V1_CONTRACT = Object.freeze({
  relationDomain: APNT_PRIVATE_NOTE_TRANSITION_RELATION_V1_DOMAIN,
  relationIdentity: APNT_PRIVATE_NOTE_TRANSITION_RELATION_V1_IDENTITY,
  relationVersion: APNT_PRIVATE_NOTE_TRANSITION_RELATION_V1_VERSION,
  canonicalPublicStatementContract:
    "APNTTransitionStatementV2 normalized, serialized, and committed by package-owned V2 helpers",
  canonicalSemanticProfileContract:
    "exact canonical APNTPrivacyProfileV2 bytes are parsed fail-closed, hashed to statement.semanticProfileId32, and must name this relation contract",
  canonicalPrivateWitnessContract:
    "APNTPrivateNoteTransitionRelationWitnessV1 with logical openings, backing cells, per-cell created exit authority, consumed authority and nullifier evidence, and fixed-slot recovery evidence",
  createdNoteSealContract:
    "every consumed and created private-backing cell uses the Profile V2 fresh-category Seal V1 locking profile; every created seal hole binds the corresponding distinct recipient exit public key",
  recoveryContract:
    "derive two ordered Recovery V1 fixed-slot packets from created note and bundle openings, rebuild the exact 2955-byte bin and root, split it into fifteen ordered 197-byte slices, construct each spendable Plane-B carrier lock, and compare every public carrier lock byte-for-byte",
  serviceFeeContract:
    "aggregatorServiceFeeSats equals the Profile V2 flat fee multiplied by the public consumed-logical-note count under checked BCH arithmetic, with exactly one designated output for a positive value and none for zero",
  evaluationOrder: APNT_PRIVATE_NOTE_TRANSITION_EVALUATION_ORDER_V1,
  privateConservationEquationContract:
    "sum consumed private note values = sum created private note values + statement.networkFeeSats + statement.aggregatorServiceFeeSats, evaluated with exact checked non-modular arithmetic",
  acceptedResultContract:
    "APNTPrivateNoteTransitionRelationResultV1 is evaluator-derived and public-safe, with statement and settlement commitments plus the exact parsed statement P/R/K identity tuple",
  settlementProjectionContract:
    "the unchanged proof-independent APNTTSP0 byte contract over the V2 statement's common transaction projection, designated verifier input, network fee, and materialized output locks",
} as const);

export type APNTPrivateNoteTransitionRelationContractV1 =
  typeof APNT_PRIVATE_NOTE_TRANSITION_RELATION_V1_CONTRACT;

export async function deriveAPNTPrivateNoteTransitionRelationV1ContractCommitment(): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_PRIVATE_NOTE_TRANSITION_RELATION_V1_CONTRACT_COMMITMENT_DOMAIN,
    serializeDeterministicUtf8(APNT_PRIVATE_NOTE_TRANSITION_RELATION_V1_CONTRACT),
  );
}
