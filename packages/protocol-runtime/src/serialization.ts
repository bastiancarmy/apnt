import { bytesToHex } from "./bytes.js";

export type DeterministicSerializable =
  | null
  | boolean
  | number
  | string
  | Uint8Array
  | readonly DeterministicSerializable[]
  | { readonly [key: string]: DeterministicSerializable };

const textEncoder = new TextEncoder();

function normalizeForDeterministicJson(
  value: DeterministicSerializable,
  path: string,
): unknown {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`serialization: ${path} must be a non-negative safe integer`);
    }
    return value;
  }

  if (value instanceof Uint8Array) {
    return { $bytes: bytesToHex(value) };
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) =>
      normalizeForDeterministicJson(entry, `${path}[${String(index)}]`),
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    for (const [key, entry] of entries) {
      if (entry === undefined) {
        throw new Error(`serialization: ${path}.${key} must not be undefined`);
      }
    }
    return Object.fromEntries(
      entries
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, normalizeForDeterministicJson(entry, `${path}.${key}`)]),
    );
  }

  throw new Error(`serialization: unsupported value at ${path}`);
}

export function serializeDeterministicUtf8(value: DeterministicSerializable): Uint8Array {
  return textEncoder.encode(JSON.stringify(normalizeForDeterministicJson(value, "$")));
}

export function serializeDeterministicText(value: DeterministicSerializable): string {
  return JSON.stringify(normalizeForDeterministicJson(value, "$"));
}
