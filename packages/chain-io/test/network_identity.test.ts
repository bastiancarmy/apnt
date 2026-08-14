import { describe, expect, it } from "vitest";

import {
  normalizeChainIoNetworkIdentityV0,
  parseChainIoNetworkObservationV0,
} from "../src/index.js";

describe("strict chain network identity normalization", () => {
  it("keeps exact supported labels without aliases", () => {
    expect(normalizeChainIoNetworkIdentityV0({ status: "observed", value: "chipnet" })).toEqual({
      network: "chipnet",
      availability: "available",
    });
    expect(normalizeChainIoNetworkIdentityV0({ status: "observed", value: "testnet" })).toEqual({
      network: "testnet",
      availability: "available",
    });
    expect(normalizeChainIoNetworkIdentityV0({ status: "observed", value: "Chipnet" })).toEqual({
      network: "unknown",
      availability: "unavailable",
      failureReason: "Network source did not report an exact supported network identity.",
    });
  });

  it("retains unavailable identity categories and rejects unknown fields", () => {
    expect(normalizeChainIoNetworkIdentityV0({ status: "unavailable", reason: "aliased" })).toEqual({
      network: "aliased",
      availability: "unavailable",
      failureReason: "Network source is aliased.",
    });
    expect(() => parseChainIoNetworkObservationV0({ status: "observed", value: "chipnet", replacement: "mainnet" }))
      .toThrow("unknown or missing fields");
  });
});
