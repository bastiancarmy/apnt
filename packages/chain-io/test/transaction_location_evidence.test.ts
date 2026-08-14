/**
 * Batch E, Task 16.6. Transaction location and inclusion may be authenticated
 * only from chain-io evidence, and every absence, disagreement or ambiguity
 * must fail closed rather than round up into an inclusion claim.
 */
import { describe, expect, it } from "vitest";

import {
  CHAIN_IO_TRANSACTION_LOCATION_EVIDENCE_V0_CLASSIFICATION,
  chainIoTransactionIdFromRawTransactionV0,
  lookupChainIoTransactionLocationEvidenceV0,
  type ChainIoProviderV0,
  type ChainIoTransactionEvidenceV0,
  type ChainIoTransactionOutputEvidenceV0,
} from "../src/index.js";

const LOCKING_BYTECODE = `76a914${"42".repeat(20)}88ac`;

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

function rawTransaction(nonce = 3): string {
  return [
    "02000000", "01", "19".repeat(32), u32Le(nonce), "01", "51", "feffffff",
    "01", u64Le(9_000n),
    Buffer.from([LOCKING_BYTECODE.length / 2]).toString("hex"), LOCKING_BYTECODE,
    "00000000",
  ].join("");
}

const RAW = rawTransaction();
const TXID = chainIoTransactionIdFromRawTransactionV0(RAW);
const BLOCKHASH = "00000000c2fcb5eb9b421e290d746ee2d8493eec890f1ed8c8b7bb2287f0e2f5";

function providerWith(
  transaction: Partial<ChainIoTransactionEvidenceV0>,
  output: Partial<ChainIoTransactionOutputEvidenceV0>,
  overrides: Partial<ChainIoProviderV0> = {},
): ChainIoProviderV0 {
  const base = {
    version: 0 as const,
    network: "chipnet" as const,
    trustBoundary: {
      source: "fulcrum" as const, evidenceKind: "indexer" as const,
      consensusAuthority: false as const, apntProtocolTruth: false as const,
    },
    evidencePath: "evidence/chain-io/chipnet/transaction/test.json",
  };
  return {
    lookupTransparentUtxoEvidence: async () => undefined,
    lookupTransparentUtxosByLockingBytecodeEvidence: async () => [],
    lookupTransactionEvidence: async () => Object.freeze({
      ...base, txid: TXID, found: true, rawTransaction: RAW, ...transaction,
    }) as ChainIoTransactionEvidenceV0,
    lookupTransactionOutputEvidence: async () => Object.freeze({
      ...base, txid: TXID, vout: 0, found: true, valueSats: "9000",
      lockingBytecode: LOCKING_BYTECODE, blockhash: BLOCKHASH, confirmations: 15,
      blocktime: 1_786_202_983, ...output,
    }) as ChainIoTransactionOutputEvidenceV0,
    submitRawTransaction: async () => { throw new Error("not used"); },
    ...overrides,
  };
}

async function locate(provider: ChainIoProviderV0) {
  return lookupChainIoTransactionLocationEvidenceV0({
    provider, network: "chipnet", txid: TXID, vout: 0,
  });
}

describe("Task 16.6 chain-io transaction location and inclusion evidence", () => {
  it("reports a confirmed location, with the identifier re-derived from the bytes", async () => {
    const evidence = await locate(providerWith({}, {}));
    expect(evidence.classification).toBe(CHAIN_IO_TRANSACTION_LOCATION_EVIDENCE_V0_CLASSIFICATION);
    expect(evidence.status).toBe("located-confirmed");
    expect(evidence.derivedTxidFromRawTransaction).toBe(TXID);
    expect(evidence.rawTransactionBytes).toBe(RAW.length / 2);
    expect(evidence.confirmations).toBe(15);
    expect(evidence.blockhash).toBe(BLOCKHASH);
    expect(evidence.failureCode).toBeNull();
    // Non-claims travel with the evidence, not with the caller.
    expect(evidence.indexerReportIsConsensusAuthority).toBe(false);
    expect(evidence.chainInclusionIsWalletAcceptance).toBe(false);
    expect(evidence.chainInclusionIsApntProtocolTruth).toBe(false);
    expect(evidence.trustBoundary.consensusAuthority).toBe(false);
  });

  it("distinguishes an unconfirmed location from a confirmed one", async () => {
    const evidence = await locate(providerWith({}, { confirmations: 0, blockhash: undefined }));
    expect(evidence.status).toBe("located-unconfirmed");
    expect(evidence.confirmations).toBe(0);
    expect(evidence.blockhash).toBeNull();
    expect(evidence.failureCode).toBeNull();
  });

  it("fails closed on absence, identity mismatch, and ambiguity", async () => {
    expect(await locate(providerWith({ found: false, rawTransaction: undefined }, {})))
      .toMatchObject({ status: "not-located", failureCode: "chain-io-transaction-not-found" });
    expect(await locate(providerWith({ rawTransaction: undefined }, {})))
      .toMatchObject({ status: "unavailable", failureCode: "chain-io-transaction-raw-bytes-absent" });
    // Different bytes hash to a different identifier: reported, never accepted.
    const foreign = await locate(providerWith({ rawTransaction: rawTransaction(9) }, {}));
    expect(foreign).toMatchObject({
      status: "unavailable", failureCode: "chain-io-transaction-identity-mismatch",
    });
    expect(foreign.derivedTxidFromRawTransaction).not.toBe(TXID);
    expect(await locate(providerWith({}, { found: false })))
      .toMatchObject({ status: "unavailable", failureCode: "chain-io-transaction-output-absent" });
    expect(await locate(providerWith({}, { confirmations: undefined })))
      .toMatchObject({ status: "unavailable", failureCode: "chain-io-transaction-confirmation-ambiguous" });
    // Confirmations without a block is ambiguous, not "confirmed".
    expect(await locate(providerWith({}, { blockhash: undefined })))
      .toMatchObject({ status: "unavailable", failureCode: "chain-io-transaction-confirmation-ambiguous" });
    expect(await locate(providerWith({}, {}, {
      lookupTransactionEvidence: async () => { throw new Error("indexer down"); },
    }))).toMatchObject({
      status: "unavailable", failureCode: "chain-io-transaction-provider-unavailable",
    });
  });

  it("refuses evidence produced for another network", async () => {
    expect(await locate(providerWith({ network: "mainnet" }, {})))
      .toMatchObject({ status: "unavailable", failureCode: "chain-io-transaction-network-mismatch" });
  });
});
