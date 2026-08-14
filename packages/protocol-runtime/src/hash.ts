import { asBytes32, type Bytes32 } from "./bytes.js";

const textEncoder = new TextEncoder();

/**
 * This repository's single hash personalization string, shared by every
 * domain-separated SHA-256.
 *
 * Exported because on-chain covenants must embed the exact constant prefix
 * `u16be(len(P)) || P || u16be(len(D)) || D` that `sha256DomainSeparated`
 * builds, and deriving it from this constant is the only way that prefix cannot
 * drift from the function below. It is **42 bytes**, not 41.
 */
export const APNT_DOMAIN_SEPARATED_SHA256_PERSONALIZATION =
  "BCH Cloak APNT v0 domain-separated SHA-256";

const HASH_PERSONALIZATION = APNT_DOMAIN_SEPARATED_SHA256_PERSONALIZATION;

function u16be(value: number): Uint8Array {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff) {
    throw new Error("hash: u16 value out of range");
  }
  return Uint8Array.of((value >>> 8) & 0xff, value & 0xff);
}

function u32be(value: number): Uint8Array {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new Error("hash: u32 value out of range");
  }
  return Uint8Array.of(
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  );
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function assertDomain(domain: string): Uint8Array {
  if (typeof domain !== "string" || domain.length === 0) {
    throw new Error("hash: domain must be a non-empty string");
  }
  if (!/^[\x20-\x7e]+$/.test(domain)) {
    throw new Error("hash: domain must be printable ASCII");
  }
  const domainBytes = textEncoder.encode(domain);
  if (domainBytes.length > 0xffff) {
    throw new Error("hash: domain is too long");
  }
  return domainBytes;
}

export async function sha256DomainSeparated(
  domain: string,
  payload: Uint8Array,
): Promise<Bytes32> {
  if (!(payload instanceof Uint8Array)) {
    throw new Error("hash: payload must be a Uint8Array");
  }
  const domainBytes = assertDomain(domain);
  const personalizationBytes = textEncoder.encode(HASH_PERSONALIZATION);
  const preimage = concatBytes([
    u16be(personalizationBytes.length),
    personalizationBytes,
    u16be(domainBytes.length),
    domainBytes,
    u32be(payload.length),
    payload,
  ]);
  const digestInput = new ArrayBuffer(preimage.byteLength);
  new Uint8Array(digestInput).set(preimage);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", digestInput));
  return asBytes32("sha256 digest", digest);
}
