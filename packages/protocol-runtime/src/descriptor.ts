import { bytesToHex, hexToBytes, type Bytes32 } from "./bytes.js";
import { sha256DomainSeparated } from "./hash.js";
import { serializeDeterministicUtf8 } from "./serialization.js";

export const BCH_CLOAK_DESCRIPTOR_V0_VERSION = 0;
export const BCH_CLOAK_DESCRIPTOR_V0_PROTOCOL = "bch-cloak-apnt-v0";
export const BCH_CLOAK_DESCRIPTOR_V0_HASH_DOMAIN = "bch-cloak-apnt-v0:descriptor";
export const BCH_CLOAK_DESCRIPTOR_V0_PREFIX = "bchcloak:";

export type BchCloakDescriptorNetworkV0 = "chipnet" | "mainnet" | "regtest";
export type BchCloakDescriptorReceiveModeV0 =
  | "interactive"
  | "published-leaf"
  | "signed-root";

export type BchCloakDescriptorV0 = Readonly<{
  version: typeof BCH_CLOAK_DESCRIPTOR_V0_VERSION;
  network: BchCloakDescriptorNetworkV0;
  protocol: typeof BCH_CLOAK_DESCRIPTOR_V0_PROTOCOL;
  contactAuthPubkey: string;
  receiveMode: BchCloakDescriptorReceiveModeV0;
  receiveRootOrLocator: string;
  packetProfile: string;
  relayHints: readonly string[];
  scanHints: readonly string[];
  expiresAtHeight?: bigint;
}>;

const NETWORKS_V0 = new Set<BchCloakDescriptorNetworkV0>(["chipnet", "mainnet", "regtest"]);
const RECEIVE_MODES_V0 = new Set<BchCloakDescriptorReceiveModeV0>([
  "interactive",
  "published-leaf",
  "signed-root",
]);

const textDecoder = new TextDecoder("utf-8", { fatal: true });

function assertRecord(name: string, value: unknown): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
}

function assertNonEmptyString(name: string, value: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
}

function normalizeStringArray(name: string, values: readonly string[]): readonly string[] {
  if (!Array.isArray(values)) {
    throw new Error(`${name} must be an array`);
  }
  return Object.freeze(
    values.map((value, index) => {
      assertNonEmptyString(`${name}[${String(index)}]`, value);
      return value;
    }),
  );
}

function assertNonNegativeBigInt(name: string, value: bigint): void {
  if (typeof value !== "bigint" || value < 0n) {
    throw new Error(`${name} must be a non-negative bigint`);
  }
}

function descriptorRecordV0(descriptor: BchCloakDescriptorV0): Record<string, string | number | readonly string[]> {
  const record: Record<string, string | number | readonly string[]> = {
    contactAuthPubkey: descriptor.contactAuthPubkey,
    network: descriptor.network,
    packetProfile: descriptor.packetProfile,
    protocol: descriptor.protocol,
    receiveMode: descriptor.receiveMode,
    receiveRootOrLocator: descriptor.receiveRootOrLocator,
    relayHints: descriptor.relayHints,
    scanHints: descriptor.scanHints,
    version: descriptor.version,
  };
  if (descriptor.expiresAtHeight !== undefined) {
    record.expiresAtHeight = descriptor.expiresAtHeight.toString(10);
  }
  return record;
}

export function normalizeBchCloakDescriptorV0(
  descriptor: BchCloakDescriptorV0,
): BchCloakDescriptorV0 {
  if (descriptor.version !== BCH_CLOAK_DESCRIPTOR_V0_VERSION) {
    throw new Error("BchCloakDescriptorV0.version must be 0");
  }
  if (!NETWORKS_V0.has(descriptor.network)) {
    throw new Error("BchCloakDescriptorV0.network must be chipnet, mainnet, or regtest");
  }
  if (descriptor.protocol !== BCH_CLOAK_DESCRIPTOR_V0_PROTOCOL) {
    throw new Error("BchCloakDescriptorV0.protocol must be bch-cloak-apnt-v0");
  }
  if (!RECEIVE_MODES_V0.has(descriptor.receiveMode)) {
    throw new Error(
      "BchCloakDescriptorV0.receiveMode must be interactive, published-leaf, or signed-root",
    );
  }
  assertNonEmptyString("BchCloakDescriptorV0.contactAuthPubkey", descriptor.contactAuthPubkey);
  assertNonEmptyString(
    "BchCloakDescriptorV0.receiveRootOrLocator",
    descriptor.receiveRootOrLocator,
  );
  assertNonEmptyString("BchCloakDescriptorV0.packetProfile", descriptor.packetProfile);
  if (descriptor.expiresAtHeight !== undefined) {
    assertNonNegativeBigInt("BchCloakDescriptorV0.expiresAtHeight", descriptor.expiresAtHeight);
  }

  const normalized: BchCloakDescriptorV0 = {
    version: BCH_CLOAK_DESCRIPTOR_V0_VERSION,
    network: descriptor.network,
    protocol: BCH_CLOAK_DESCRIPTOR_V0_PROTOCOL,
    contactAuthPubkey: descriptor.contactAuthPubkey,
    receiveMode: descriptor.receiveMode,
    receiveRootOrLocator: descriptor.receiveRootOrLocator,
    packetProfile: descriptor.packetProfile,
    relayHints: normalizeStringArray("BchCloakDescriptorV0.relayHints", descriptor.relayHints),
    scanHints: normalizeStringArray("BchCloakDescriptorV0.scanHints", descriptor.scanHints),
  };
  if (descriptor.expiresAtHeight !== undefined) {
    return Object.freeze({
      ...normalized,
      expiresAtHeight: descriptor.expiresAtHeight,
    });
  }
  return Object.freeze(normalized);
}

export function serializeBchCloakDescriptorV0(descriptor: BchCloakDescriptorV0): Uint8Array {
  return serializeDeterministicUtf8(descriptorRecordV0(normalizeBchCloakDescriptorV0(descriptor)));
}

export function bchCloakDescriptorHashV0(descriptor: BchCloakDescriptorV0): Promise<Bytes32> {
  return sha256DomainSeparated(
    BCH_CLOAK_DESCRIPTOR_V0_HASH_DOMAIN,
    serializeBchCloakDescriptorV0(descriptor),
  );
}

export function encodeBchCloakDescriptorV0(descriptor: BchCloakDescriptorV0): string {
  return `${BCH_CLOAK_DESCRIPTOR_V0_PREFIX}${bytesToHex(serializeBchCloakDescriptorV0(descriptor))}`;
}

function parseNonNegativeBigIntString(name: string, value: unknown): bigint | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !/^[0-9]+$/.test(value)) {
    throw new Error(`${name} must be a non-negative decimal string`);
  }
  return BigInt(value);
}

function parseStringArray(name: string, value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`);
  }
  return value.map((entry, index) => {
    if (typeof entry !== "string") {
      throw new Error(`${name}[${String(index)}] must be a string`);
    }
    return entry;
  });
}

export function decodeBchCloakDescriptorV0(encoded: string): BchCloakDescriptorV0 {
  if (typeof encoded !== "string" || !encoded.startsWith(BCH_CLOAK_DESCRIPTOR_V0_PREFIX)) {
    throw new Error("BchCloakDescriptorV0 encoded value must start with bchcloak:");
  }
  const payloadHex = encoded.slice(BCH_CLOAK_DESCRIPTOR_V0_PREFIX.length);
  const payloadBytes = hexToBytes("BchCloakDescriptorV0 payload", payloadHex);

  let parsed: unknown;
  try {
    parsed = JSON.parse(textDecoder.decode(payloadBytes));
  } catch (error) {
    throw new Error(
      `BchCloakDescriptorV0 payload must be deterministic JSON (${error instanceof Error ? error.message : String(error)})`,
    );
  }

  assertRecord("BchCloakDescriptorV0 payload", parsed);
  const descriptor = normalizeBchCloakDescriptorV0({
    version: parsed.version,
    network: parsed.network,
    protocol: parsed.protocol,
    contactAuthPubkey: parsed.contactAuthPubkey,
    receiveMode: parsed.receiveMode,
    receiveRootOrLocator: parsed.receiveRootOrLocator,
    packetProfile: parsed.packetProfile,
    relayHints: parseStringArray("BchCloakDescriptorV0.relayHints", parsed.relayHints),
    scanHints: parseStringArray("BchCloakDescriptorV0.scanHints", parsed.scanHints),
    expiresAtHeight: parseNonNegativeBigIntString(
      "BchCloakDescriptorV0.expiresAtHeight",
      parsed.expiresAtHeight,
    ),
  } as BchCloakDescriptorV0);

  const canonicalPayload = bytesToHex(serializeBchCloakDescriptorV0(descriptor));
  if (payloadHex !== canonicalPayload) {
    throw new Error("BchCloakDescriptorV0 payload must use canonical deterministic encoding");
  }
  return descriptor;
}
