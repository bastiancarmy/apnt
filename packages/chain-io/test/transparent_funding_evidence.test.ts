import { describe, expect, it } from "vitest";

import {
  CHAIN_IO_TRANSPARENT_FUNDING_EVIDENCE_MAX_AGE_MS_V0,
  ChainIoTransparentFundingEvidenceErrorV0,
  chainIoIndexerTrustBoundaryV0,
  chainIoTransactionIdFromRawTransactionV0,
  isChainIoAuthenticatedTransparentFundingEvidenceV0,
  lookupChainIoAuthenticatedTransparentFundingEvidenceV0,
  type ChainIoProviderV0,
} from "../src/index.js";

const LOCKING_BYTECODE = `76a914${"42".repeat(20)}88ac`;
const VALUE_SATS = "73129";

function u32Le(value: number): string {
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32LE(value);
  return bytes.toString("hex");
}

function u64Le(value: bigint): string {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64LE(value);
  return bytes.toString("hex");
}

function transactionWithOutput(lockingBytecode = LOCKING_BYTECODE, valueSats = VALUE_SATS): string {
  return [
    "02000000",
    "01",
    "19".repeat(32),
    u32Le(3),
    "01",
    "51",
    "feffffff",
    "01",
    u64Le(BigInt(valueSats)),
    Buffer.from([lockingBytecode.length / 2]).toString("hex"),
    lockingBytecode,
    "00000000",
  ].join("");
}

const RAW_TRANSACTION = transactionWithOutput();
const TXID = chainIoTransactionIdFromRawTransactionV0(RAW_TRANSACTION);
const TRUST = chainIoIndexerTrustBoundaryV0();
const CANDIDATE = Object.freeze({
  network: "chipnet" as const,
  txid: TXID,
  vout: 0,
  valueSats: VALUE_SATS,
  lockingBytecode: LOCKING_BYTECODE,
  tokenState: "none" as const,
});

type ProviderOverrides = Partial<{
  transaction: Record<string, unknown>;
  output: Record<string, unknown>;
  spend: Record<string, unknown>;
  utxo: Record<string, unknown> | undefined;
}>;

function provider(overrides: ProviderOverrides = {}): ChainIoProviderV0 {
  const transaction = {
    version: 0,
    network: "chipnet",
    txid: TXID,
    found: true,
    rawTransaction: RAW_TRANSACTION,
    confirmations: 9,
    trustBoundary: TRUST,
    evidencePath: "synthetic/transaction.json",
    ...overrides.transaction,
  };
  const output = {
    version: 0,
    network: "chipnet",
    txid: TXID,
    vout: 0,
    found: true,
    valueSats: VALUE_SATS,
    lockingBytecode: LOCKING_BYTECODE,
    confirmations: 9,
    trustBoundary: TRUST,
    evidencePath: "synthetic/output.json",
    ...overrides.output,
  };
  const spend = {
    status: "unspent",
    network: "chipnet",
    txid: TXID,
    vout: 0,
    trustBoundary: TRUST,
    evidencePath: "synthetic/spend.json",
    ...overrides.spend,
  };
  const utxo = overrides.utxo === undefined && Object.prototype.hasOwnProperty.call(overrides, "utxo")
    ? undefined
    : {
        version: 0,
        network: "chipnet",
        txid: TXID,
        vout: 0,
        valueSats: VALUE_SATS,
        lockingBytecode: LOCKING_BYTECODE,
        status: "confirmed",
        unspent: true,
        trustBoundary: TRUST,
        evidencePath: "synthetic/utxo.json",
        ...overrides.utxo,
      };
  return {
    lookupTransactionEvidence: async () => transaction as never,
    lookupTransactionOutputEvidence: async () => output as never,
    lookupOutpointSpendEvidence: async () => spend as never,
    lookupTransparentUtxoEvidence: async () => utxo as never,
    lookupTransparentUtxosByLockingBytecodeEvidence: async () => [],
    submitRawTransaction: async () => { throw new Error("not exercised"); },
  };
}

async function failureCode(
  selectedProvider: ChainIoProviderV0,
  candidate = CANDIDATE,
  times: Readonly<{ observedAtMs?: number; evaluatedAtMs?: number }> = {},
): Promise<string> {
  try {
    await lookupChainIoAuthenticatedTransparentFundingEvidenceV0({
      provider: selectedProvider,
      candidate,
      ...times,
    });
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(ChainIoTransparentFundingEvidenceErrorV0);
    return (error as ChainIoTransparentFundingEvidenceErrorV0).code;
  }
  throw new Error("expected transparent funding evidence rejection");
}

describe("authenticated transparent funding evidence", () => {
  it("cross-checks exact transaction, output, spend, and list-unspent evidence", async () => {
    const evidence = await lookupChainIoAuthenticatedTransparentFundingEvidenceV0({
      provider: provider(),
      candidate: CANDIDATE,
      observedAtMs: 400_000,
      evaluatedAtMs: 400_019,
    });

    expect(evidence).toMatchObject({
      network: "chipnet",
      txid: TXID,
      vout: 0,
      valueSats: VALUE_SATS,
      lockingBytecode: LOCKING_BYTECODE,
      tokenState: "none",
      transactionFound: true,
      outputFound: true,
      metadataMatched: true,
      unspent: true,
      locationStatus: "confirmed",
      confirmations: 9,
      evidenceSource: "fulcrum",
      evidenceAgeMs: 19,
    });
    expect(isChainIoAuthenticatedTransparentFundingEvidenceV0(evidence)).toBe(true);
    expect(isChainIoAuthenticatedTransparentFundingEvidenceV0({ ...evidence })).toBe(false);
  });

  it("rejects missing transactions and output indices in deterministic order", async () => {
    expect(await failureCode(provider({ transaction: { found: false, rawTransaction: undefined } })))
      .toBe("F-APNT-TRANSPARENT-UTXO-TRANSACTION-MISSING");
    expect(await failureCode(provider(), { ...CANDIDATE, vout: 7 }))
      .toBe("F-APNT-TRANSPARENT-UTXO-OUTPUT-MISSING");
  });

  it("rejects locking-program, value, token, and network mismatches", async () => {
    expect(await failureCode(provider(), { ...CANDIDATE, lockingBytecode: "51" }))
      .toBe("F-APNT-TRANSPARENT-UTXO-LOCKING-PROGRAM-MISMATCH");
    expect(await failureCode(provider(), { ...CANDIDATE, valueSats: "73130" }))
      .toBe("F-APNT-TRANSPARENT-UTXO-VALUE-MISMATCH");
    expect(await failureCode(provider(), { ...CANDIDATE, tokenState: "present" }))
      .toBe("F-APNT-TRANSPARENT-UTXO-TOKEN-NOT-PERMITTED");
    expect(await failureCode(provider({ output: { network: "mainnet" } })))
      .toBe("F-APNT-TRANSPARENT-UTXO-NETWORK-MISMATCH");
  });

  it("rejects spent, ambiguous, stale, and unauthenticated provider evidence", async () => {
    expect(await failureCode(provider({ spend: { status: "spent-outpoint" } })))
      .toBe("F-APNT-TRANSPARENT-UTXO-SPENT");
    expect(await failureCode(provider({ spend: { status: "ambiguous" } })))
      .toBe("F-APNT-TRANSPARENT-UTXO-PROVIDER-AMBIGUOUS");
    expect(await failureCode(provider({ output: { confirmations: 8 } })))
      .toBe("F-APNT-TRANSPARENT-UTXO-PROVIDER-AMBIGUOUS");
    expect(await failureCode(provider(), CANDIDATE, {
      observedAtMs: 1_000,
      evaluatedAtMs: 1_000 + CHAIN_IO_TRANSPARENT_FUNDING_EVIDENCE_MAX_AGE_MS_V0 + 1,
    })).toBe("F-APNT-TRANSPARENT-UTXO-EVIDENCE-STALE");
    expect(await failureCode(provider({ output: { trustBoundary: { ...TRUST, consensusAuthority: true } } })))
      .toBe("F-APNT-TRANSPARENT-UTXO-PROVIDER-UNAUTHENTICATED");
  });

  it("rejects inconsistent list-unspent evidence and malformed outpoints", async () => {
    expect(await failureCode(provider({ utxo: undefined })))
      .toBe("F-APNT-TRANSPARENT-UTXO-PROVIDER-AMBIGUOUS");
    expect(await failureCode(provider(), { ...CANDIDATE, txid: "malformed" }))
      .toBe("F-APNT-TRANSPARENT-UTXO-MALFORMED-EVIDENCE");
  });
});
