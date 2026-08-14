// Maturity: frozen — its statementCommitment32/settlementProjection32
// derivation is exactly what
// `npm run verify:transition-settlement-projection-independent` independently
// re-derives and requires to match every real proof fixture's committed
// public values. See AGENTS.md, "The maturity ladder".
import { asBytes32, copyBytes, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import {
  serializeAPNTTransitionOutpointV1,
  type APNTBchTransactionProjectionV1,
  type APNTTransitionProjectionOutputV1,
} from "./apnt_transaction_projection_v1.js";
import type { APNTTransitionStatementV1 } from "./apnt_transition_statement_v1.js";

/**
 * Proof-independent settlement projection for the **transition** settlement
 * transaction: the one seal-consuming, seal-creating BCH transaction that a
 * private-transition proof authorizes.
 *
 * This is the transition-side analogue of
 * `apnt_import_settlement_projection_v0.ts`, and it deliberately reuses the
 * statement's own already-normalized `APNTBchTransactionProjectionV1` rather
 * than restating a second projection type. Every field below is already a
 * committed part of `APNTTransitionStatementV1`; nothing here is new witness
 * material, and nothing here is private.
 *
 * What the transcript covers, and why each field is here:
 *
 * ```text
 * transaction version         OP_TXVERSION
 * locktime                    OP_TXLOCKTIME
 * input count                 OP_TXINPUTCOUNT
 * designated verifier index   OP_INPUTINDEX of the settlement-authorizing input
 * per non-designated input    OP_OUTPOINTTXHASH / OP_OUTPOINTINDEX,
 *                             OP_INPUTSEQUENCENUMBER, OP_UTXOVALUE
 * output count                OP_TXOUTPUTCOUNT
 * per output                  OP_OUTPUTVALUE, OP_OUTPUTBYTECODE
 * network fee                 sum(OP_UTXOVALUE) - sum(OP_OUTPUTVALUE)
 * ```
 *
 * The designated verifier input is the single input this transcript
 * deliberately **excludes by outpoint**. That input is where the settlement
 * authorization covenant (the verdict-token input) sits, and its outpoint is
 * created by the verifier run itself, so it cannot exist at proving time. Its
 * *value* is still bound, indirectly but exactly, by `networkFeeSats`: the fee
 * equals every projected input value minus every projected output value, so
 * fixing the fee and every other input value fixes the excluded input's value
 * too. Its *index* is bound directly by `designatedVerifierInputIndex`.
 *
 * The transcript deliberately excludes: the settlement transaction ID, every
 * unlocking bytecode, every signature, the designated verifier input's
 * outpoint, all proof-specific bytes, token fields (the statement already
 * requires the whole projection to be token-free), the network label, and the
 * aggregator service fee as a standalone term (its value is already covered as
 * an ordinary projected output value). Every remaining field is one an
 * on-chain covenant can reconstruct from transaction introspection alone.
 *
 * Output locking bytecode is **materialized**, not templated: where a projected
 * output declares a `statementCommitmentOffset`, the statement commitment is
 * written into that 32-byte slot, because that is exactly what
 * `OP_OUTPUTBYTECODE` returns on chain.
 */
export const APNT_TRANSITION_SETTLEMENT_PROJECTION_V0_VERSION = 0;
export const APNT_TRANSITION_SETTLEMENT_PROJECTION_V0_MAGIC = "APNTTSP0";
export const APNT_TRANSITION_SETTLEMENT_PROJECTION_V0_COMMITMENT_DOMAIN =
  "bch-cloak-apnt-v0:transition-settlement-projection-commitment-v0";

const MAGIC = new TextEncoder().encode(APNT_TRANSITION_SETTLEMENT_PROJECTION_V0_MAGIC);

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function writeU32LE(value: number): Uint8Array {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new Error("APNTTransitionSettlementProjectionV0 u32 value is out of range");
  }
  return Uint8Array.of(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
}

function writeU64LE(value: bigint): Uint8Array {
  if (typeof value !== "bigint" || value < 0n || value > 0xffff_ffff_ffff_ffffn) {
    throw new Error("APNTTransitionSettlementProjectionV0 u64 value is out of range");
  }
  const output = new Uint8Array(8);
  for (let index = 0; index < 8; index += 1) {
    output[index] = Number((value >> BigInt(index * 8)) & 0xffn);
  }
  return output;
}

/**
 * Materializes one projected output's on-chain locking bytecode by writing the
 * statement commitment into the template's declared 32-byte slot. Outputs with
 * no declared slot are already exact.
 */
export function materializeAPNTTransitionProjectedOutputLockingBytecodeV0(
  output: APNTTransitionProjectionOutputV1,
  statementCommitment32: Bytes32,
): Uint8Array {
  const template = copyBytes(output.lockingBytecodeTemplate);
  if (output.statementCommitmentOffset === null) return template;
  const offset = output.statementCommitmentOffset;
  if (offset > template.length || template.length - offset < 32) {
    throw new Error(
      "APNTTransitionSettlementProjectionV0 output statement-commitment slot is out of range",
    );
  }
  template.set(
    asBytes32("APNTTransitionSettlementProjectionV0.statementCommitment32", statementCommitment32),
    offset,
  );
  return template;
}

function assertProjectionShape(projection: APNTBchTransactionProjectionV1): void {
  if (projection.inputs.length === 0 || projection.outputs.length === 0) {
    throw new Error("APNTTransitionSettlementProjectionV0 requires a non-empty projection");
  }
  for (const input of projection.inputs) {
    if (input.spentToken !== null) {
      throw new Error("APNTTransitionSettlementProjectionV0 requires token-free inputs");
    }
  }
  for (const output of projection.outputs) {
    if (output.token !== null) {
      throw new Error("APNTTransitionSettlementProjectionV0 requires token-free outputs");
    }
  }
}

/**
 * Canonical `APNTTSP0` transcript bytes for one already-normalized transition
 * statement and its own statement commitment. Input and output order is
 * transaction-significant and is never sorted here.
 */
export function serializeAPNTTransitionSettlementProjectionV0(
  statement: APNTTransitionStatementV1,
  statementCommitment32: Bytes32,
): Uint8Array {
  const commitment32 = asBytes32(
    "APNTTransitionSettlementProjectionV0.statementCommitment32",
    statementCommitment32,
  );
  const projection = statement.transactionProjection;
  assertProjectionShape(projection);
  const designatedVerifierInputIndex = statement.designatedVerifierInputIndex;
  if (designatedVerifierInputIndex >= projection.inputs.length) {
    throw new Error(
      "APNTTransitionSettlementProjectionV0.designatedVerifierInputIndex is outside projected inputs",
    );
  }
  const inputs = projection.inputs.flatMap((input, index) =>
    index === designatedVerifierInputIndex
      ? []
      : [concatBytes([
        serializeAPNTTransitionOutpointV1(input.outpoint),
        writeU32LE(input.sequenceNumber),
        writeU64LE(input.spentValueSats),
      ])]
  );
  const outputs = projection.outputs.map((output) => {
    const lockingBytecode = materializeAPNTTransitionProjectedOutputLockingBytecodeV0(
      output,
      commitment32,
    );
    return concatBytes([
      writeU64LE(output.valueSats),
      writeU32LE(lockingBytecode.length),
      lockingBytecode,
    ]);
  });
  return concatBytes([
    MAGIC,
    Uint8Array.of(APNT_TRANSITION_SETTLEMENT_PROJECTION_V0_VERSION),
    writeU32LE(projection.transactionVersion),
    writeU32LE(projection.locktime),
    writeU32LE(projection.inputs.length),
    writeU32LE(designatedVerifierInputIndex),
    ...inputs,
    writeU32LE(projection.outputs.length),
    ...outputs,
    writeU64LE(statement.networkFeeSats),
  ]);
}

/**
 * Domain-separated commitment to the exact canonical `APNTTSP0` transcript.
 *
 * This is the value published as the transition relation result's
 * `settlementProjection32`. It is a strict function of statement fields the
 * relation already commits to, so computing it requires no witness the guest
 * does not already hold.
 */
export async function deriveAPNTTransitionSettlementProjectionCommitmentV0(
  statement: APNTTransitionStatementV1,
  statementCommitment32: Bytes32,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_TRANSITION_SETTLEMENT_PROJECTION_V0_COMMITMENT_DOMAIN,
    serializeAPNTTransitionSettlementProjectionV0(statement, statementCommitment32),
  );
}
