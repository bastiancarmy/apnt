/**
 * Strict, source-neutral network observations for boundary checks.
 *
 * This does not authenticate a provider or establish chain truth. It keeps a
 * source's exact observation available for a higher-level gate to compare.
 */

export type ChainIoNormalizedNetworkV0 =
  | "chipnet"
  | "mainnet"
  | "testnet"
  | "testnet3"
  | "testnet4"
  | "regtest"
  | "unknown"
  | "missing"
  | "ambiguous"
  | "aliased"
  | "unsupported";

export type ChainIoNetworkObservationV0 =
  | Readonly<{ status: "observed"; value: unknown }>
  | Readonly<{
    status: "unavailable";
    reason: "missing" | "ambiguous" | "aliased" | "unsupported";
  }>;

export type ChainIoNetworkIdentityV0 = Readonly<{
  network: ChainIoNormalizedNetworkV0;
  availability: "available" | "unavailable";
  failureReason?: string;
}>;

type UnknownRecord = Readonly<Record<string, unknown>>;

const OBSERVED_NETWORKS = new Set<Exclude<ChainIoNormalizedNetworkV0, "unknown" | "missing" | "ambiguous" | "aliased" | "unsupported">>([
  "chipnet",
  "mainnet",
  "testnet",
  "testnet3",
  "testnet4",
  "regtest",
]);

function asRecord(name: string, value: unknown): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value as UnknownRecord;
}

function assertExactKeys(name: string, value: UnknownRecord, keys: readonly string[]): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${name} has unknown or missing fields`);
  }
}

/** Parses one observation without case-folding, trimming, or network aliases. */
export function parseChainIoNetworkObservationV0(value: unknown): ChainIoNetworkObservationV0 {
  const record = asRecord("ChainIoNetworkObservationV0", value);
  if (record.status === "observed") {
    assertExactKeys("ChainIoNetworkObservationV0", record, ["status", "value"]);
    return Object.freeze({ status: "observed", value: record.value });
  }
  if (record.status === "unavailable") {
    assertExactKeys("ChainIoNetworkObservationV0", record, ["status", "reason"]);
    if (
      record.reason !== "missing" &&
      record.reason !== "ambiguous" &&
      record.reason !== "aliased" &&
      record.reason !== "unsupported"
    ) {
      throw new Error("ChainIoNetworkObservationV0.reason is unsupported");
    }
    return Object.freeze({ status: "unavailable", reason: record.reason });
  }
  throw new Error("ChainIoNetworkObservationV0.status must be observed or unavailable");
}

/**
 * Converts a closed observation into a comparison-safe identity. Unknown
 * labels remain unknown; this helper never maps a generic test network to
 * Chipnet or supplies a value for an unavailable source.
 */
export function normalizeChainIoNetworkIdentityV0(value: unknown): ChainIoNetworkIdentityV0 {
  const observation = parseChainIoNetworkObservationV0(value);
  if (observation.status === "unavailable") {
    return Object.freeze({
      network: observation.reason,
      availability: "unavailable",
      failureReason: `Network source is ${observation.reason}.`,
    });
  }
  if (typeof observation.value === "string" && OBSERVED_NETWORKS.has(observation.value as Exclude<ChainIoNormalizedNetworkV0, "unknown" | "missing" | "ambiguous" | "aliased" | "unsupported">)) {
    return Object.freeze({
      network: observation.value as Exclude<ChainIoNormalizedNetworkV0, "unknown" | "missing" | "ambiguous" | "aliased" | "unsupported">,
      availability: "available",
    });
  }
  return Object.freeze({
    network: "unknown",
    availability: "unavailable",
    failureReason: "Network source did not report an exact supported network identity.",
  });
}
