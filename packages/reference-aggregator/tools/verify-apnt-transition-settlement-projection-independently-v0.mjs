// Independent hand-verification of the transition relation's new
// `settlementProjection32` public field — the statement binding that a future
// settlement-authorization covenant reads out of the on-chain verdict.
//
// Why this tool exists, stated exactly: the deployed chunked BN254 verifier
// graph emits a statement-agnostic (all-zero) verdict commitment, so an
// honestly produced verdict proves "some proof for some statement verified"
// and binds no transaction. Fixing that needs a run binding threaded through
// the graph, and that binding has to come from somewhere the proof already
// commits to. `settlementProjection32` is that value. This tool checks that it
// really is what it claims to be, without trusting any of the code that
// produces it.
//
// It deliberately does NOT import the code under test. It:
//
//   * re-implements `sha256DomainSeparated` straight from its specification
//     (u16-be personalization length, personalization, u16-be domain length,
//     domain, u32-be payload length, payload -> one SHA-256);
//   * re-parses the canonical `APNTPTI0` proving input and the canonical
//     `APNTTSV1` statement inside it byte by byte, from the wire layout, with
//     no protocol-runtime codec;
//   * re-derives `statementCommitment32` from those statement bytes;
//   * re-builds the `APNTTSP0` settlement-projection transcript from the
//     re-parsed projection — including materializing each output's on-chain
//     locking bytecode by writing the statement commitment into its declared
//     slot — and re-derives `settlementProjection32` from it;
//   * requires that value to equal what the frozen golden vectors publish at
//     APNTPRR0 offset 178, and what every real proof fixture's committed
//     public values carry at the same offset;
//   * re-derives SP1's masked committed-public-values scalar over the FULL
//     210-byte public values and requires it to equal the scalar the Groth16
//     proof was actually verified against, so the projection is bound to the
//     proof itself and not merely recorded beside it;
//   * grades a mutation matrix: every covered transaction field must move the
//     commitment, and the deliberately excluded designated-verifier outpoint
//     must not.
//
// Scope boundary: this tool establishes NOTHING about BN254 pairing execution,
// the chunked CashVM verifier graph, chain validation, wallet acceptance or
// note spendability. The chunked verifier graph is still bound to the previous
// guest identity and is out of scope for this phase by design.
//
// Usage (from packages/reference-aggregator):
//   node tools/verify-apnt-transition-settlement-projection-independently-v0.mjs \
//     [--fixture-dir <dir>] [--golden-vectors <path>] [--out <path>]
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_FIXTURE_DIR = join(
  here, "..", "..", "..", "tools", "apnt-private-note-transition-sp1", "fixtures",
);
// The PUBLIC, derived golden-vector corpus. This tool reads only that file, and
// it is a deliberate change: the private parity corpus carries a full canonical
// proving input per vector — the witness — and this tool never needed it. What
// it needs is the canonical `APNTTSV1` statement, which the derived corpus
// publishes directly under `statementBytesHex`.
//
// The derived corpus is produced by
// `tools/apnt-private-note-transition-rust-parity/scripts/derive-public-golden-vectors-v0.mjs`,
// which records the private source path, its SHA-256 and the commit, and which
// refuses to emit unless six redaction proofs pass. `--check` on that generator
// re-derives and requires byte equality, so the corpus this tool reads is
// provably a derivation and not a hand-written file.
//
// WHAT THIS COSTS, stated rather than hidden: the private corpus carries the
// statement commitment TWICE — once in the `APNTPTI0` header and once in
// `statementCommitment32Hex` — and this tool used to check the value it
// re-derives against both. Reading the derived corpus, only the second copy is
// present here. The header copy is checked by the generator (proof P3) at
// derivation time, and its agreement is recorded in the derived file. That one
// cross-check moved; it did not disappear. It is reported below under
// `checksDelegatedToTheDerivation` so a reader is not left to discover it.
const DEFAULT_GOLDEN_VECTORS_PATH = join(
  here, "..", "..", "..", "tools", "apnt-private-note-transition-rust-parity",
  "fixtures", "typescript-golden-vectors-public-v0.json",
);
const PUBLIC_CORPUS_FORMAT = "apnt-private-note-transition-rust-parity-public-v0";

// Pinned, not discovered: a dropped or silently substituted case still fails closed.
const CASES = Object.freeze([
  ["private-split", "canonical-groth16-private-split-v0.json"],
  [
    "private-split-flat-aggregator-service-fee",
    "canonical-groth16-private-split-flat-aggregator-service-fee-v0.json",
  ],
  ["live-chipnet-9x2000-private-split", "canonical-groth16-live-chipnet-9x2000-v0.json"],
  [
    "live-chipnet-26x2000-two-source-private-split",
    "canonical-groth16-live-chipnet-26x2000-two-source-v0.json",
  ],
]);

// Re-declared here from the specifications, never imported.
const HASH_PERSONALIZATION = "BCH Cloak APNT v0 domain-separated SHA-256";
const STATEMENT_COMMITMENT_DOMAIN =
  "bch-cloak-apnt-v0:transition-statement-commitment-v1";
const SETTLEMENT_PROJECTION_DOMAIN =
  "bch-cloak-apnt-v0:transition-settlement-projection-commitment-v0";
const RESULT_BYTES = 210;
const RESULT_SETTLEMENT_PRESENCE_OFFSET = 177;
const RESULT_SETTLEMENT_PROJECTION_OFFSET = 178;
const RESULT_STATEMENT_PRESENCE_OFFSET = 106;
const RESULT_STATEMENT_COMMITMENT_OFFSET = 107;
const ABSENT_U32 = 0xffff_ffff;

const hex = (bytes) => Buffer.from(bytes).toString("hex");
const bin = (value) => Uint8Array.from(Buffer.from(value, "hex"));
const sha256 = (bytes) => Uint8Array.from(createHash("sha256").update(bytes).digest());

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === undefined || !key.startsWith("--")) {
      throw new Error(`unexpected argument ${String(key)}`);
    }
    const value = argv[index + 1];
    if (value === undefined) throw new Error(`${key} requires a value`);
    args[key.slice(2)] = value;
    index += 1;
  }
  return args;
}

function concat(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

const u16be = (value) => Uint8Array.of((value >>> 8) & 0xff, value & 0xff);
const u32be = (value) => Uint8Array.of(
  (value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff,
);
const u32le = (value) => Uint8Array.of(
  value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff,
);
function u64le(value) {
  const out = new Uint8Array(8);
  let rest = BigInt(value);
  for (let index = 0; index < 8; index += 1) {
    out[index] = Number(rest & 0xffn);
    rest >>= 8n;
  }
  return out;
}

/** `sha256DomainSeparated`, re-implemented from its specification. */
function domainSeparatedSha256(domain, payload) {
  const personalization = Uint8Array.from(Buffer.from(HASH_PERSONALIZATION, "utf8"));
  const domainBytes = Uint8Array.from(Buffer.from(domain, "utf8"));
  return sha256(concat([
    u16be(personalization.length), personalization,
    u16be(domainBytes.length), domainBytes,
    u32be(payload.length), payload,
  ]));
}

class Reader {
  #bytes;
  #offset = 0;

  constructor(bytes) {
    this.#bytes = bytes;
  }

  get offset() {
    return this.#offset;
  }

  take(length) {
    if (this.#offset + length > this.#bytes.length) throw new Error("truncated");
    const out = this.#bytes.subarray(this.#offset, this.#offset + length);
    this.#offset += length;
    return out;
  }

  u8() {
    return this.take(1)[0];
  }

  u16() {
    const value = this.take(2);
    return value[0] | (value[1] << 8);
  }

  u32() {
    const value = this.take(4);
    return (value[0] | (value[1] << 8) | (value[2] << 16) | (value[3] << 24)) >>> 0;
  }

  u64() {
    const value = this.take(8);
    let out = 0n;
    for (let index = 7; index >= 0; index -= 1) out = (out << 8n) | BigInt(value[index]);
    return out;
  }

  blob() {
    return this.take(this.u32());
  }

  rest() {
    return this.take(this.#bytes.length - this.#offset);
  }
}

/** Re-parses the canonical `APNTTSV1` wire encoding without any project codec. */
function parseStatement(statementBytes) {
  const reader = new Reader(statementBytes);
  if (Buffer.from(reader.take(8)).toString("ascii") !== "APNTTSV1") {
    throw new Error("statement magic mismatch");
  }
  if (reader.u8() !== 1) throw new Error("statement version mismatch");
  const protocolDomain = Buffer.from(reader.take(reader.u16())).toString("utf8");
  reader.u8(); // network
  reader.u8(); // mode
  reader.take(32 * 4); // privacyProfile, proofRelation, sp1Program, verifierArtifact
  const designatedVerifierInputIndex = reader.u32();
  reader.take(32); // batchNonce
  if (reader.u8() === 1) reader.take(32); // createdBackingCreationScope32
  const consumedLogicalCount = reader.u32();
  reader.take(consumedLogicalCount * 64);
  const consumedCellCount = reader.u32();
  reader.take(consumedCellCount * (4 + 32 + 32));
  const createdLogicalCount = reader.u32();
  reader.take(createdLogicalCount * (32 + 4 + 32));
  const createdCellCount = reader.u32();
  // 4-byte outputIndex, sealCellCommitment32, lockingProfileId32 and — added by
  // the mandatory created-note exit branch — exitAuthorityCommitment32. The
  // created-cell tuple is the only part of the `APNTTSV1` wire encoding that
  // moved; consumed cells are still 4 + 32 + 32.
  reader.take(createdCellCount * (4 + 32 + 32 + 32));
  if (reader.u8() === 1) reader.take(32); // recoveryPacketTableCommitment32
  const networkFeeSats = reader.u64();
  reader.u64(); // aggregatorServiceFeeSats
  reader.u32(); // aggregatorFeeOutputIndex
  reader.u64(); // totalInputValueSats
  reader.u64(); // totalOutputValueSats

  const projectionReader = new Reader(Uint8Array.from(reader.rest()));
  if (projectionReader.u8() !== 1) throw new Error("projection version mismatch");
  const transactionVersion = projectionReader.u32();
  const locktime = projectionReader.u32();
  const inputCount = projectionReader.u32();
  const inputs = [];
  for (let index = 0; index < inputCount; index += 1) {
    const wireTxid32 = Uint8Array.from(projectionReader.take(32));
    const vout = projectionReader.u32();
    const sequenceNumber = projectionReader.u32();
    const spentValueSats = projectionReader.u64();
    projectionReader.blob(); // spentLockingBytecode, not covered by the transcript
    if (projectionReader.u8() !== 0) throw new Error("token-bearing input");
    projectionReader.u8(); // backingRole
    inputs.push({ wireTxid32, vout, sequenceNumber, spentValueSats });
  }
  const outputCount = projectionReader.u32();
  const outputs = [];
  for (let index = 0; index < outputCount; index += 1) {
    const valueSats = projectionReader.u64();
    const lockingBytecodeTemplate = Uint8Array.from(projectionReader.blob());
    const encodedOffset = projectionReader.u32();
    if (projectionReader.u8() !== 0) throw new Error("token-bearing output");
    projectionReader.u8(); // role
    outputs.push({
      valueSats,
      lockingBytecodeTemplate,
      statementCommitmentOffset: encodedOffset === ABSENT_U32 ? null : encodedOffset,
    });
  }
  return {
    protocolDomain,
    designatedVerifierInputIndex,
    networkFeeSats,
    transactionVersion,
    locktime,
    inputs,
    outputs,
  };
}

/** Re-builds the `APNTTSP0` transcript from the re-parsed statement. */
function settlementTranscript(statement, statementCommitment32) {
  const parts = [
    Uint8Array.from(Buffer.from("APNTTSP0", "ascii")),
    Uint8Array.of(0),
    u32le(statement.transactionVersion),
    u32le(statement.locktime),
    u32le(statement.inputs.length),
    u32le(statement.designatedVerifierInputIndex),
  ];
  statement.inputs.forEach((input, index) => {
    if (index === statement.designatedVerifierInputIndex) return;
    parts.push(input.wireTxid32, u32le(input.vout), u32le(input.sequenceNumber),
      u64le(input.spentValueSats));
  });
  parts.push(u32le(statement.outputs.length));
  for (const output of statement.outputs) {
    const locking = Uint8Array.from(output.lockingBytecodeTemplate);
    if (output.statementCommitmentOffset !== null) {
      locking.set(statementCommitment32, output.statementCommitmentOffset);
    }
    parts.push(u64le(output.valueSats), u32le(locking.length), locking);
  }
  parts.push(u64le(statement.networkFeeSats));
  return concat(parts);
}

function settlementProjection32(statement, statementCommitment32) {
  return domainSeparatedSha256(
    SETTLEMENT_PROJECTION_DOMAIN,
    settlementTranscript(statement, statementCommitment32),
  );
}

/** SP1's committed-public-values scalar: SHA-256 with the top three bits cleared. */
function maskedPublicValuesScalar(publicValues) {
  const digest = sha256(publicValues);
  const masked = Uint8Array.from(digest);
  masked[0] &= 0x1f;
  let value = 0n;
  for (const byte of masked) value = (value << 8n) | BigInt(byte);
  return value;
}

function clone(statement) {
  return {
    ...statement,
    inputs: statement.inputs.map((input) => ({ ...input, wireTxid32: Uint8Array.from(input.wireTxid32) })),
    outputs: statement.outputs.map((output) => ({
      ...output,
      lockingBytecodeTemplate: Uint8Array.from(output.lockingBytecodeTemplate),
    })),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const fixtureDir = args["fixture-dir"] ?? DEFAULT_FIXTURE_DIR;
  const goldenVectorsPath = args["golden-vectors"] ?? DEFAULT_GOLDEN_VECTORS_PATH;

  const checks = [];
  const record = (id, passed, detail) => {
    checks.push({ id, passed, ...(detail === undefined ? {} : { detail }) });
    if (!passed) throw new Error(`independent check failed: ${id}${detail ? ` (${detail})` : ""}`);
  };

  const golden = JSON.parse(readFileSync(goldenVectorsPath, "utf8"));
  record(
    "golden-vector-document-identity",
    golden.format === PUBLIC_CORPUS_FORMAT && golden.vectors.length === 4,
    String(golden.format),
  );
  // The corpus must SAY it is derived and name what it was derived from. A
  // hand-written stand-in would not carry this block, and the generator's
  // `--check` mode is what proves the block is not merely decorative.
  record("golden-vector-corpus-declares-its-derivation",
    typeof golden.derivation?.sourcePath === "string" &&
    /^[0-9a-f]{64}$/u.test(golden.derivation?.sourceSha256 ?? "") &&
    Array.isArray(golden.derivation?.redactionProofs) &&
    golden.derivation.redactionProofs.length >= 6);
  // The witness must be gone, positively, not merely unread by this tool.
  const corpusText = readFileSync(goldenVectorsPath, "utf8");
  record("golden-vector-corpus-carries-no-witness-field",
    !/"proving[A-Za-z]*"\s*:/u.test(corpusText));

  const cases = [];
  for (const [caseId, fixtureFile] of CASES) {
    const vector = golden.vectors.find((entry) => entry.id === caseId);
    record(`${caseId}:golden-vector-present`, vector !== undefined);

    // --- primary material: the published canonical statement bytes ---
    const statementBytes = bin(vector.statementBytesHex);
    record(
      `${caseId}:statement-bytes-length-is-self-consistent`,
      statementBytes.length === vector.statementBytesLength,
      String(statementBytes.length),
    );
    const statement = parseStatement(statementBytes);
    record(`${caseId}:statement-protocol-domain`, statement.protocolDomain === "bch-cloak-apnt-v0");

    // --- statement commitment, re-derived, not read ---
    //
    // The published bytes are bound to the published commitment here, and the
    // commitment is bound to the PROOF further down (offset 107 of the 210-byte
    // public values, which are the bytes the Groth16 scalar covers). So the
    // statement cannot be swapped for a different one that happens to carry the
    // same recorded commitment: the recorded commitment is not what is trusted.
    const derivedStatementCommitment32 =
      domainSeparatedSha256(STATEMENT_COMMITMENT_DOMAIN, statementBytes);
    record(
      `${caseId}:statement-commitment-rederived-from-the-published-statement-bytes`,
      hex(derivedStatementCommitment32) === vector.statementCommitment32Hex,
      hex(derivedStatementCommitment32),
    );

    // --- settlement projection, re-derived from the re-parsed projection ---
    const derivedProjection32 = settlementProjection32(statement, derivedStatementCommitment32);

    // --- golden vector result bytes ---
    const goldenResult = bin(vector.expectedPublicResultHex);
    record(`${caseId}:golden-result-length-210`, goldenResult.length === RESULT_BYTES);
    record(
      `${caseId}:golden-result-statement-present`,
      goldenResult[RESULT_STATEMENT_PRESENCE_OFFSET] === 1,
    );
    record(
      `${caseId}:golden-result-statement-commitment-at-offset-107`,
      hex(goldenResult.subarray(
        RESULT_STATEMENT_COMMITMENT_OFFSET,
        RESULT_STATEMENT_COMMITMENT_OFFSET + 32,
      )) === hex(derivedStatementCommitment32),
    );
    record(
      `${caseId}:golden-result-settlement-present`,
      goldenResult[RESULT_SETTLEMENT_PRESENCE_OFFSET] === 1,
    );
    const goldenProjection = goldenResult.subarray(
      RESULT_SETTLEMENT_PROJECTION_OFFSET,
      RESULT_SETTLEMENT_PROJECTION_OFFSET + 32,
    );
    record(
      `${caseId}:golden-result-settlement-projection-rederived`,
      hex(goldenProjection) === hex(derivedProjection32),
      hex(derivedProjection32),
    );
    record(
      `${caseId}:settlement-projection-is-not-all-zero`,
      derivedProjection32.some((byte) => byte !== 0),
    );

    // --- the real proof fixture's committed public values ---
    const fixture = JSON.parse(readFileSync(join(fixtureDir, fixtureFile), "utf8"));
    record(`${caseId}:fixture-case-id`, fixture.caseId === caseId);
    const publicValues = bin(fixture.publicValuesBytes);
    record(`${caseId}:fixture-public-values-length-210`,
      publicValues.length === RESULT_BYTES && fixture.publicValuesLength === RESULT_BYTES);
    record(
      `${caseId}:fixture-public-values-equal-golden-result`,
      hex(publicValues) === hex(goldenResult),
    );
    record(
      `${caseId}:fixture-statement-commitment-rederived`,
      fixture.statementCommitment === hex(derivedStatementCommitment32),
    );
    record(
      `${caseId}:fixture-settlement-projection-rederived`,
      hex(publicValues.subarray(
        RESULT_SETTLEMENT_PROJECTION_OFFSET,
        RESULT_SETTLEMENT_PROJECTION_OFFSET + 32,
      )) === hex(derivedProjection32),
    );

    // --- the projection is bound to the PROOF, not merely recorded beside it ---
    const scalar = maskedPublicValuesScalar(publicValues);
    record(
      `${caseId}:proof-public-scalar-covers-settlement-projection`,
      fixture.groth16PublicInputsDecimal[1] === scalar.toString(10),
      scalar.toString(10),
    );
    const truncated = publicValues.subarray(0, RESULT_SETTLEMENT_PRESENCE_OFFSET);
    record(
      `${caseId}:proof-public-scalar-would-differ-without-the-projection`,
      maskedPublicValuesScalar(truncated) !== scalar,
    );

    // --- mutation matrix over every covered transaction field ---
    const base = hex(derivedProjection32);
    const mutate = (label, apply, expectChange = true) => {
      const mutated = clone(statement);
      apply(mutated);
      const changed = hex(settlementProjection32(mutated, derivedStatementCommitment32)) !== base;
      record(
        `${caseId}:mutation:${label}`,
        changed === expectChange,
        expectChange ? "changed" : "unchanged by design",
      );
    };
    mutate("transaction-version", (s) => { s.transactionVersion += 1; });
    mutate("locktime", (s) => { s.locktime += 1; });
    mutate("network-fee", (s) => { s.networkFeeSats += 1n; });
    mutate("designated-verifier-index", (s) => {
      s.designatedVerifierInputIndex =
        (s.designatedVerifierInputIndex + 1) % s.inputs.length;
    });
    mutate("input-outpoint-txid", (s) => {
      const index = s.designatedVerifierInputIndex === 0 ? 1 : 0;
      s.inputs[index].wireTxid32[0] ^= 1;
    });
    mutate("input-outpoint-vout", (s) => {
      const index = s.designatedVerifierInputIndex === 0 ? 1 : 0;
      s.inputs[index].vout += 1;
    });
    mutate("input-sequence", (s) => {
      const index = s.designatedVerifierInputIndex === 0 ? 1 : 0;
      s.inputs[index].sequenceNumber ^= 1;
    });
    mutate("input-value", (s) => {
      const index = s.designatedVerifierInputIndex === 0 ? 1 : 0;
      s.inputs[index].spentValueSats += 1n;
    });
    mutate("output-value", (s) => { s.outputs[0].valueSats += 1n; });
    mutate("output-locking-bytecode", (s) => {
      s.outputs[s.outputs.length - 1].lockingBytecodeTemplate[0] ^= 1;
    });
    mutate("output-dropped", (s) => { s.outputs = s.outputs.slice(0, -1); });
    // Deliberate exclusion: the verdict-token input's outpoint cannot exist at
    // proving time, so the transcript must be blind to it.
    mutate("designated-verifier-outpoint", (s) => {
      s.inputs[s.designatedVerifierInputIndex].wireTxid32[0] ^= 1;
    }, false);
    // The statement commitment reaches the transcript only through outputs that
    // materialize it into their locking bytecode at a declared offset. Whether
    // any output does is a structural property of the case, so it is measured
    // here and then asserted in whichever direction it implies, rather than
    // assumed. The two synthetic private-split cases carry no aggregation
    // boundary output: since the mandatory created-note exit branch landed,
    // every created backing cell projects a real 128-byte seal, which is fully
    // determined by C_verifier, L_verdict and sha256(E_i33) and has no
    // statement-commitment hole. Both live cases still carry one, on their
    // TRANSITION_BOUNDARY (Plane A) output at offset 162.
    const materializingOutputs = statement.outputs.filter(
      (output) => output.statementCommitmentOffset !== null,
    ).length;
    const flipped = Uint8Array.from(derivedStatementCommitment32);
    flipped[0] ^= 1;
    const movedUnderFlip = hex(settlementProjection32(statement, flipped)) !== base;
    record(
      `${caseId}:mutation:statement-commitment`,
      movedUnderFlip === materializingOutputs > 0,
      `${String(materializingOutputs)} materializing output(s), projection ${
        movedUnderFlip ? "moved" : "unchanged"}`,
    );

    cases.push({
      caseId,
      statementCommitment32Hex: hex(derivedStatementCommitment32),
      settlementProjection32Hex: base,
      settlementTranscriptBytes: settlementTranscript(statement, derivedStatementCommitment32).length,
      publicValuesBytes: publicValues.length,
      settlementProjectionOffset: RESULT_SETTLEMENT_PROJECTION_OFFSET,
      programVkeyHash: fixture.programVkeyHash,
      guestElfSha256: fixture.guestElfSha256,
    });
  }

  // Distinctness across cases: a projection that collapsed across statements
  // would reintroduce exactly the fungibility this field exists to remove.
  record(
    "settlement-projections-are-distinct-across-cases",
    new Set(cases.map((entry) => entry.settlementProjection32Hex)).size === cases.length,
  );
  record(
    "all-cases-share-one-guest-identity",
    new Set(cases.map((entry) => `${entry.programVkeyHash}:${entry.guestElfSha256}`)).size === 1,
  );

  // Loudly enumerated, never silent. A verifier that quietly drops a check when
  // its input changes is worse than one that does not run at all.
  const checksDelegatedToTheDerivation = [
    "the re-derived statement commitment was ALSO compared against the copy carried in the private proving input's own APNTPTI0 header. That comparison now happens once, at derivation time, as proof P3 of derive-public-golden-vectors-v0.mjs, which refuses to emit if it fails. It is not performed here, because the header is part of the witness and is not published.",
  ];
  const notEstablishedHere = [
    "nothing about the private witness is established here — no note opening, no owner authority, no signature, no nullifier derivation. Those are the subject of verify-apnt-noncustodial-spend-authority-independently-v0.mjs, which needs the witness and therefore cannot run against published artifacts only.",
  ];
  record("public-corpus-mode-declares-what-it-delegated", checksDelegatedToTheDerivation.length === 1);

  const report = {
    tool: "verify-apnt-transition-settlement-projection-independently-v0",
    version: 0,
    goldenVectorsPath,
    goldenVectorsFormat: golden.format,
    goldenVectorsDerivedFrom: golden.derivation?.sourcePath ?? null,
    goldenVectorsSourceSha256: golden.derivation?.sourceSha256 ?? null,
    checksDelegatedToTheDerivation,
    notEstablishedHere,
    classification: "independent hand-verification of relation public-field derivation",
    scope: "settlementProjection32 derivation, publication and proof binding",
    executedBn254Pairings: false,
    executedChunkedCashVmGraph: false,
    chainValidated: false,
    walletAccepted: false,
    walletNoteSpendable: false,
    cases,
    checkCount: checks.length,
    checksPassed: checks.filter((check) => check.passed).length,
    checks,
  };
  const out = args.out;
  if (out !== undefined) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
}

main();
