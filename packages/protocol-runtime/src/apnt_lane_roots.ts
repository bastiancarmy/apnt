import {
  asBytes32,
  bytesToHex,
  type Bytes32,
} from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { serializeDeterministicText, serializeDeterministicUtf8 } from "./serialization.js";
import { type StateCellNetworkV0 } from "./state.js";

export const APNT_LANE_ROOT_TUPLE_V0_VERSION = 0;
export const APNT_MASTER_ROOT_V0_VERSION = 0;
export const APNT_MVP_LANE_COUNT_V0 = 1;
export const APNT_MVP_LANE_ID_V0 = 0;
export const APNT_LANE_ROOT_V0_HASH_DOMAIN =
  "bch-cloak-apnt-v0:lane-root";
export const APNT_MASTER_ROOT_V0_HASH_DOMAIN =
  "bch-cloak-apnt-v0:master-root";

export type ApntLaneRootTupleV0 = Readonly<{
  version: typeof APNT_LANE_ROOT_TUPLE_V0_VERSION;
  network: StateCellNetworkV0;
  verifierProfile: string;
  laneId: number;
  epoch: bigint;
  noteRoot32: Bytes32;
  nullifierRoot32: Bytes32;
  packetRoot32: Bytes32;
  accountingRoot32: Bytes32;
  previousStateCellHash32: Bytes32;
}>;

export type ApntLaneRootV0 = Readonly<{
  version: typeof APNT_LANE_ROOT_TUPLE_V0_VERSION;
  tuple: ApntLaneRootTupleV0;
  laneRoot32: Bytes32;
}>;

export type ApntMasterRootV0 = Readonly<{
  version: typeof APNT_MASTER_ROOT_V0_VERSION;
  laneCount: typeof APNT_MVP_LANE_COUNT_V0;
  laneRoots: readonly [ApntLaneRootV0];
  masterRoot32: Bytes32;
}>;

export type BuildApntMasterRootV0Args = Readonly<{
  laneCount?: typeof APNT_MVP_LANE_COUNT_V0;
  laneTuple: ApntLaneRootTupleV0;
}>;

export type SerializeApntMasterRootSetV0Args = Readonly<{
  laneRoot: ApntLaneRootV0;
}>;

export type ApntMasterRootSetV0 = Readonly<{
  version: typeof APNT_MASTER_ROOT_V0_VERSION;
  laneCount: typeof APNT_MVP_LANE_COUNT_V0;
  laneRoots: readonly [
    Readonly<{
      laneId: typeof APNT_MVP_LANE_ID_V0;
      laneRoot32: Bytes32;
    }>,
  ];
}>;

export type ApntLaneRootPublicInputSummaryV0 = Readonly<{
  version: typeof APNT_MASTER_ROOT_V0_VERSION;
  network: StateCellNetworkV0;
  verifierProfile: string;
  laneCount: typeof APNT_MVP_LANE_COUNT_V0;
  laneId: typeof APNT_MVP_LANE_ID_V0;
  epoch: string;
  noteRoot32: string;
  nullifierRoot32: string;
  packetRoot32: string;
  accountingRoot32: string;
  previousStateCellHash32: string;
  laneRoot32: string;
  masterRoot32: string;
}>;

const APNT_LANE_ROOT_NETWORKS_V0 = new Set<StateCellNetworkV0>([
  "chipnet",
  "mainnet",
  "regtest",
]);

function assertNetwork(name: string, network: StateCellNetworkV0): StateCellNetworkV0 {
  if (!APNT_LANE_ROOT_NETWORKS_V0.has(network)) {
    throw new Error(`${name} must be chipnet, mainnet, or regtest`);
  }
  return network;
}

function assertNonNegativeBigInt(name: string, value: bigint): bigint {
  if (typeof value !== "bigint" || value < 0n) {
    throw new Error(`${name} must be a non-negative bigint`);
  }
  return value;
}

function assertVerifierProfile(name: string, verifierProfile: string): string {
  if (typeof verifierProfile !== "string" || verifierProfile.length === 0) {
    throw new Error(`${name} must be a non-empty printable ASCII string`);
  }
  if (verifierProfile.length > 128 || !/^[\x20-\x7e]+$/.test(verifierProfile)) {
    throw new Error(`${name} must be a non-empty printable ASCII string`);
  }
  return verifierProfile;
}

function assertLaneId(name: string, laneId: number, allowUnsupportedLaneId: boolean): number {
  if (!Number.isSafeInteger(laneId) || laneId < 0) {
    throw new Error(`${name} must be a non-negative safe integer`);
  }
  if (!allowUnsupportedLaneId && laneId !== APNT_MVP_LANE_ID_V0) {
    throw new Error(`${name} must be 0 for APNT MVP`);
  }
  return laneId;
}

function normalizeApntLaneRootTupleV0Internal(
  tuple: ApntLaneRootTupleV0,
  options: Readonly<{ allowUnsupportedLaneId: boolean }>,
): ApntLaneRootTupleV0 {
  if (tuple.version !== APNT_LANE_ROOT_TUPLE_V0_VERSION) {
    throw new Error("ApntLaneRootTupleV0.version must be 0");
  }
  return Object.freeze({
    version: APNT_LANE_ROOT_TUPLE_V0_VERSION,
    network: assertNetwork("ApntLaneRootTupleV0.network", tuple.network),
    verifierProfile: assertVerifierProfile(
      "ApntLaneRootTupleV0.verifierProfile",
      tuple.verifierProfile,
    ),
    laneId: assertLaneId(
      "ApntLaneRootTupleV0.laneId",
      tuple.laneId,
      options.allowUnsupportedLaneId,
    ),
    epoch: assertNonNegativeBigInt("ApntLaneRootTupleV0.epoch", tuple.epoch),
    noteRoot32: asBytes32("ApntLaneRootTupleV0.noteRoot32", tuple.noteRoot32),
    nullifierRoot32: asBytes32(
      "ApntLaneRootTupleV0.nullifierRoot32",
      tuple.nullifierRoot32,
    ),
    packetRoot32: asBytes32("ApntLaneRootTupleV0.packetRoot32", tuple.packetRoot32),
    accountingRoot32: asBytes32(
      "ApntLaneRootTupleV0.accountingRoot32",
      tuple.accountingRoot32,
    ),
    previousStateCellHash32: asBytes32(
      "ApntLaneRootTupleV0.previousStateCellHash32",
      tuple.previousStateCellHash32,
    ),
  });
}

function apntLaneRootTupleRecordV0(
  tuple: ApntLaneRootTupleV0,
  options: Readonly<{ allowUnsupportedLaneId: boolean }>,
) {
  const normalized = normalizeApntLaneRootTupleV0Internal(tuple, options);
  return {
    accountingRoot32: normalized.accountingRoot32,
    epoch: normalized.epoch.toString(10),
    laneId: normalized.laneId,
    network: normalized.network,
    noteRoot32: normalized.noteRoot32,
    nullifierRoot32: normalized.nullifierRoot32,
    packetRoot32: normalized.packetRoot32,
    previousStateCellHash32: normalized.previousStateCellHash32,
    verifierProfile: normalized.verifierProfile,
    version: normalized.version,
  };
}

function serializeApntLaneRootTupleV0Internal(
  tuple: ApntLaneRootTupleV0,
  options: Readonly<{ allowUnsupportedLaneId: boolean }>,
): Uint8Array {
  return serializeDeterministicUtf8(apntLaneRootTupleRecordV0(tuple, options));
}

async function apntLaneRootHashV0Internal(
  tuple: ApntLaneRootTupleV0,
  options: Readonly<{ allowUnsupportedLaneId: boolean }>,
): Promise<Bytes32> {
  return sha256DomainSeparated(
    APNT_LANE_ROOT_V0_HASH_DOMAIN,
    serializeApntLaneRootTupleV0Internal(tuple, options),
  );
}

function serializeApntMasterRootSetV0Internal(
  laneRoot: ApntLaneRootV0,
): Uint8Array {
  normalizeApntLaneRootTupleV0(laneRoot.tuple);
  return serializeDeterministicUtf8({
    laneCount: APNT_MVP_LANE_COUNT_V0,
    laneRoots: [
      {
        laneId: APNT_MVP_LANE_ID_V0,
        laneRoot32: asBytes32(
          "ApntMasterRootSetV0.laneRoots[0].laneRoot32",
          laneRoot.laneRoot32,
        ),
      },
    ],
    version: APNT_MASTER_ROOT_V0_VERSION,
  });
}

export function normalizeApntLaneRootTupleV0(
  tuple: ApntLaneRootTupleV0,
): ApntLaneRootTupleV0 {
  return normalizeApntLaneRootTupleV0Internal(tuple, { allowUnsupportedLaneId: false });
}

export function serializeApntLaneRootTupleV0(tuple: ApntLaneRootTupleV0): Uint8Array {
  return serializeApntLaneRootTupleV0Internal(tuple, { allowUnsupportedLaneId: false });
}

export function apntLaneRootHashV0(tuple: ApntLaneRootTupleV0): Promise<Bytes32> {
  return apntLaneRootHashV0Internal(tuple, { allowUnsupportedLaneId: false });
}

export function serializeApntMasterRootSetV0(
  args: SerializeApntMasterRootSetV0Args,
): Uint8Array {
  return serializeApntMasterRootSetV0Internal(args.laneRoot);
}

export async function buildApntLaneRootV0(tuple: ApntLaneRootTupleV0): Promise<ApntLaneRootV0> {
  const normalized = normalizeApntLaneRootTupleV0(tuple);
  return Object.freeze({
    version: APNT_LANE_ROOT_TUPLE_V0_VERSION,
    tuple: normalized,
    laneRoot32: await apntLaneRootHashV0(normalized),
  });
}

export async function apntMasterRootHashV0(
  args: SerializeApntMasterRootSetV0Args,
): Promise<Bytes32> {
  const expectedLaneRoot32 = await apntLaneRootHashV0(args.laneRoot.tuple);
  const suppliedLaneRoot32 = asBytes32(
    "ApntMasterRootSetV0.laneRoot.laneRoot32",
    args.laneRoot.laneRoot32,
  );
  if (bytesToHex(expectedLaneRoot32) !== bytesToHex(suppliedLaneRoot32)) {
    throw new Error("ApntMasterRootSetV0.laneRoot32 mismatch");
  }
  return sha256DomainSeparated(
    APNT_MASTER_ROOT_V0_HASH_DOMAIN,
    serializeApntMasterRootSetV0({ laneRoot: args.laneRoot }),
  );
}

export async function buildApntMasterRootV0(
  args: BuildApntMasterRootV0Args,
): Promise<ApntMasterRootV0> {
  if ((args.laneCount ?? APNT_MVP_LANE_COUNT_V0) !== APNT_MVP_LANE_COUNT_V0) {
    throw new Error("ApntMasterRootV0.laneCount must be 1 for APNT MVP");
  }
  const laneRoot = await buildApntLaneRootV0(args.laneTuple);
  return Object.freeze({
    version: APNT_MASTER_ROOT_V0_VERSION,
    laneCount: APNT_MVP_LANE_COUNT_V0,
    laneRoots: Object.freeze([laneRoot]) as readonly [ApntLaneRootV0],
    masterRoot32: await apntMasterRootHashV0({ laneRoot }),
  });
}

export function apntLaneRootPublicInputSummaryV0(args: {
  laneRoot: ApntLaneRootV0;
  masterRoot: ApntMasterRootV0;
}): ApntLaneRootPublicInputSummaryV0 {
  const laneRoot = args.laneRoot;
  const masterRoot = args.masterRoot;
  const tuple = normalizeApntLaneRootTupleV0(laneRoot.tuple);
  if (masterRoot.laneCount !== APNT_MVP_LANE_COUNT_V0) {
    throw new Error("ApntLaneRootPublicInputSummaryV0.masterRoot.laneCount must be 1");
  }
  if (masterRoot.laneRoots.length !== APNT_MVP_LANE_COUNT_V0) {
    throw new Error("ApntLaneRootPublicInputSummaryV0.masterRoot must contain one lane root");
  }
  if (bytesToHex(masterRoot.laneRoots[0]!.laneRoot32) !== bytesToHex(laneRoot.laneRoot32)) {
    throw new Error("ApntLaneRootPublicInputSummaryV0.laneRoot mismatch");
  }
  return Object.freeze({
    version: APNT_MASTER_ROOT_V0_VERSION,
    network: tuple.network,
    verifierProfile: tuple.verifierProfile,
    laneCount: APNT_MVP_LANE_COUNT_V0,
    laneId: APNT_MVP_LANE_ID_V0,
    epoch: tuple.epoch.toString(10),
    noteRoot32: bytesToHex(tuple.noteRoot32),
    nullifierRoot32: bytesToHex(tuple.nullifierRoot32),
    packetRoot32: bytesToHex(tuple.packetRoot32),
    accountingRoot32: bytesToHex(tuple.accountingRoot32),
    previousStateCellHash32: bytesToHex(tuple.previousStateCellHash32),
    laneRoot32: bytesToHex(laneRoot.laneRoot32),
    masterRoot32: bytesToHex(masterRoot.masterRoot32),
  });
}

export function serializeApntLaneRootPublicInputSummaryV0(args: {
  laneRoot: ApntLaneRootV0;
  masterRoot: ApntMasterRootV0;
}): string {
  return serializeDeterministicText(apntLaneRootPublicInputSummaryV0(args));
}

export async function testOnlyApntLaneRootHashAllowUnsupportedLaneIdV0(
  tuple: ApntLaneRootTupleV0,
): Promise<Bytes32> {
  return apntLaneRootHashV0Internal(tuple, { allowUnsupportedLaneId: true });
}
