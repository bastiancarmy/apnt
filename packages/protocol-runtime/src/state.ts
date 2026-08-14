import { asBytes32, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { serializeDeterministicUtf8 } from "./serialization.js";

export const STATE_CELL_STATE_V0_VERSION = 0;
export const STATE_CELL_STATE_V0_COMMITMENT_DOMAIN = "bch-cloak-apnt-v0:state-cell";

export type StateCellNetworkV0 = "chipnet" | "mainnet" | "regtest";

export type StateCellStateV0 = Readonly<{
  version: typeof STATE_CELL_STATE_V0_VERSION;
  network: StateCellNetworkV0;
  noteRoot: Bytes32;
  nullifierRoot: Bytes32;
  packetRoot: Bytes32;
  batchCounter: bigint;
}>;

const STATE_CELL_NETWORKS_V0 = new Set<StateCellNetworkV0>(["chipnet", "mainnet", "regtest"]);

function assertNonNegativeBigInt(name: string, value: bigint): void {
  if (typeof value !== "bigint" || value < 0n) {
    throw new Error(`${name} must be a non-negative bigint`);
  }
}

export function normalizeStateCellStateV0(state: StateCellStateV0): StateCellStateV0 {
  if (state.version !== STATE_CELL_STATE_V0_VERSION) {
    throw new Error("StateCellStateV0.version must be 0");
  }
  if (!STATE_CELL_NETWORKS_V0.has(state.network)) {
    throw new Error("StateCellStateV0.network must be chipnet, mainnet, or regtest");
  }
  assertNonNegativeBigInt("StateCellStateV0.batchCounter", state.batchCounter);
  return Object.freeze({
    version: STATE_CELL_STATE_V0_VERSION,
    network: state.network,
    noteRoot: asBytes32("StateCellStateV0.noteRoot", state.noteRoot),
    nullifierRoot: asBytes32("StateCellStateV0.nullifierRoot", state.nullifierRoot),
    packetRoot: asBytes32("StateCellStateV0.packetRoot", state.packetRoot),
    batchCounter: state.batchCounter,
  });
}

export function serializeStateCellStateV0(state: StateCellStateV0): Uint8Array {
  const normalized = normalizeStateCellStateV0(state);
  return serializeDeterministicUtf8({
    batchCounter: normalized.batchCounter.toString(10),
    network: normalized.network,
    noteRoot: normalized.noteRoot,
    nullifierRoot: normalized.nullifierRoot,
    packetRoot: normalized.packetRoot,
    version: normalized.version,
  });
}

export function stateCellCommitmentV0(state: StateCellStateV0): Promise<Bytes32> {
  return sha256DomainSeparated(STATE_CELL_STATE_V0_COMMITMENT_DOMAIN, serializeStateCellStateV0(state));
}
