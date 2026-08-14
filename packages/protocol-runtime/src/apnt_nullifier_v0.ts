// Maturity: preview — measured zero published importers; imports the
// preview apnt_spend_authority_v0.ts and the superseded
// apnt_transition_statement_v0.ts. No published artifact references it. See
// AGENTS.md, "The maturity ladder".
import { asBytes32, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { normalizeAPNTSpendSecretV0 } from "./apnt_spend_authority_v0.js";
import {
  APNT_TRANSITION_OUTPOINT_V0_BYTE_LENGTH,
  serializeAPNTTransitionOutpointV0,
  type APNTTransitionOutpointV0,
} from "./apnt_transition_statement_v0.js";

export const APNT_NULLIFIER_V0_DOMAIN = "bch-cloak-apnt-v0:nullifier-v0";

export type DeriveAPNTNullifierV0Args = Readonly<{
  spendSecret32: Bytes32;
  consumedNoteCommitment32: Bytes32;
  sealOutpoint: APNTTransitionOutpointV0;
}>;

function assertRecord(name: string, value: unknown): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
}

function assertKnownKeys(name: string, value: Record<string, unknown>): void {
  const allowed = new Set(["spendSecret32", "consumedNoteCommitment32", "sealOutpoint"]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new Error(`${name} contains unknown field ${key}`);
    }
  }
}

export function deriveAPNTNullifierV0(args: DeriveAPNTNullifierV0Args): Promise<Bytes32> {
  assertRecord("DeriveAPNTNullifierV0Args", args);
  assertKnownKeys("DeriveAPNTNullifierV0Args", args);

  const spendSecret32 = normalizeAPNTSpendSecretV0(args.spendSecret32);
  if (!(args.consumedNoteCommitment32 instanceof Uint8Array)) {
    throw new Error("DeriveAPNTNullifierV0Args.consumedNoteCommitment32 must be a Uint8Array");
  }
  const consumedNoteCommitment32 = asBytes32(
    "DeriveAPNTNullifierV0Args.consumedNoteCommitment32",
    args.consumedNoteCommitment32,
  );
  const canonicalBchWireOutpoint36 = serializeAPNTTransitionOutpointV0(args.sealOutpoint);

  const payload = new Uint8Array(
    spendSecret32.length +
      consumedNoteCommitment32.length +
      APNT_TRANSITION_OUTPOINT_V0_BYTE_LENGTH,
  );
  payload.set(spendSecret32, 0);
  payload.set(consumedNoteCommitment32, spendSecret32.length);
  payload.set(
    canonicalBchWireOutpoint36,
    spendSecret32.length + consumedNoteCommitment32.length,
  );

  return sha256DomainSeparated(APNT_NULLIFIER_V0_DOMAIN, payload);
}
