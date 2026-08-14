// Maturity: preview — adapts the frozen v0 projection for the preview
// apnt_transition_statement_v2.ts. Zero published importers; not exercised by
// any published verify:* command. See AGENTS.md, "The maturity ladder".
import type { Bytes32 } from "./bytes.js";
import type { APNTTransitionStatementV1 } from "./apnt_transition_statement_v1.js";
import type { APNTTransitionStatementV2 } from "./apnt_transition_statement_v2.js";
import {
  deriveAPNTTransitionSettlementProjectionCommitmentV0,
  serializeAPNTTransitionSettlementProjectionV0,
} from "./apnt_transition_settlement_projection_v0.js";

/**
 * Typed Statement V2 bridge to the unchanged `APNTTSP0` transcript.
 *
 * `APNTTSP0` covers only the transaction projection, designated verifier input
 * index, network fee, and supplied statement commitment. Statement V2 keeps
 * those fields byte-compatible while versioning the statement fields that the
 * settlement authorization covenant never reads. Keeping this bridge outside
 * the frozen V0 module makes that compatibility explicit without duplicating
 * or modifying its canonical serializer.
 */
function asAPNTTSP0Statement(
  statement: APNTTransitionStatementV2,
): APNTTransitionStatementV1 {
  return statement as unknown as APNTTransitionStatementV1;
}

/** Serialize unchanged `APNTTSP0` bytes from a normalized Statement V2. */
export function serializeAPNTTransitionSettlementProjectionV0FromStatementV2(
  statement: APNTTransitionStatementV2,
  statementCommitment32: Bytes32,
): Uint8Array {
  return serializeAPNTTransitionSettlementProjectionV0(
    asAPNTTSP0Statement(statement),
    statementCommitment32,
  );
}

/** Derive the unchanged `APNTTSP0` commitment from a normalized Statement V2. */
export function deriveAPNTTransitionSettlementProjectionCommitmentV0FromStatementV2(
  statement: APNTTransitionStatementV2,
  statementCommitment32: Bytes32,
): Promise<Bytes32> {
  return deriveAPNTTransitionSettlementProjectionCommitmentV0(
    asAPNTTSP0Statement(statement),
    statementCommitment32,
  );
}
