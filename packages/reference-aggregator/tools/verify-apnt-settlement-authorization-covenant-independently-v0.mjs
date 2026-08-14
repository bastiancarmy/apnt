// Independent hand-verification of the landed APNT settlement authorization
// covenant (SAC) and the created-note seal's aggregate branch.
//
// Why this tool exists: the covenant is the single on-chain check that carries
// "this transaction is the transaction the proven statement authorizes" onto
// the chain. If its embedded domain-separation prefix, its transcript layout,
// or its final hash disagrees by even one byte with what
// `sha256DomainSeparated` and `serializeAPNTTransitionSettlementProjectionV0`
// really produce, the result is either an unspendable seal or an unsound one.
// That must be checkable without trusting the code that builds it.
//
// It deliberately does NOT import the code under test. It does not import
// `@bch-cloak/protocol-runtime`, does not import the reference-aggregator
// module, and does not run a virtual machine. Using only `node:crypto` and raw
// byte handling it:
//
//   * re-implements `sha256DomainSeparated` straight from its specification
//     (u16-be personalization length, personalization, u16-be domain length,
//     domain, u32-be payload length, payload -> ONE SHA-256);
//   * re-parses the canonical `APNTPTI0` proving input and the canonical
//     `APNTTSV1` statement inside it byte by byte, from the wire layout, with
//     no protocol-runtime codec;
//   * re-derives `statementCommitment32`, re-builds the `APNTTSP0` transcript
//     (materializing each output's locking bytecode into its declared slot) and
//     re-derives `settlementProjection32`, requiring all four to equal the
//     pinned, already-independently-verified test vectors;
//   * re-reads the LANDED CashAssembly template and the landed builder's
//     compiled bytecode from disk, disassembles the redeem script, and requires
//     it to embed the independently re-derived 110-byte constant prefix and the
//     `APNTTSP0` transcript head, to use exactly one OP_SHA256 and zero
//     OP_HASH256, and to end by comparing against its own input's token
//     commitment;
//   * re-derives `L_verdict` as hash256 over that redeem bytecode and requires
//     it to equal the pinned deployment constant;
//   * reads the pinned category and pinned successor straight out of the
//     aggregate branch bytecode and requires the branch to be the witness-index
//     variant (no OP_1SUB) that fits the 201-byte standard locking limit.
//
// Scope boundary: this tool establishes NOTHING about BN254 pairing execution,
// the chunked verifier graph, VM acceptance, chain validation, wallet
// acceptance, or note spendability. VM acceptance is the test suite's claim;
// this tool checks the byte construction and arithmetic that claim rests on.
//
// Usage (from packages/reference-aggregator):
//   node tools/verify-apnt-settlement-authorization-covenant-independently-v0.mjs \
//     [--golden-vectors <path>] [--bytecode <path>] [--out <path>]

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..", "..", "..");
// The PUBLIC, derived golden-vector corpus — see
// `tools/apnt-private-note-transition-rust-parity/scripts/derive-public-golden-vectors-v0.mjs`.
// This tool never needed the witness; it needs the canonical `APNTTSV1`
// statement, which the derived corpus publishes directly.
const DEFAULT_GOLDEN_VECTORS = join(
  REPO, "tools", "apnt-private-note-transition-rust-parity",
  "fixtures", "typescript-golden-vectors-public-v0.json",
);
// The landed builders' compiled output, frozen as a tracked artifact so this
// tool can run where the workspace is not installed. See
// `derive-apnt-settlement-authorization-covenant-bytecode-v0.mjs` for why a
// swapped fixture cannot fake a pass: L_verdict is re-derived from these very
// bytes and compared against a pinned hash256 constant.
const DEFAULT_BYTECODE = join(
  REPO, "packages", "reference-aggregator", "fixtures",
  "apnt-settlement-authorization-covenant-bytecode-v0.json",
);
const SAC_TEMPLATE_PATH = join(
  REPO, "packages", "protocol-runtime", "src", "cashassembly",
  "apnt_settlement_authorization_covenant_v0.casm",
);
const BRANCH_TEMPLATE_PATH = join(
  REPO, "packages", "protocol-runtime", "src", "cashassembly",
  "apnt_created_note_seal_aggregate_branch_v0.casm",
);

// Re-declared here from the specifications, never imported.
const HASH_PERSONALIZATION = "BCH Cloak APNT v0 domain-separated SHA-256";
const STATEMENT_COMMITMENT_DOMAIN = "bch-cloak-apnt-v0:transition-statement-commitment-v1";
const SETTLEMENT_PROJECTION_DOMAIN =
  "bch-cloak-apnt-v0:transition-settlement-projection-commitment-v0";
const RESULT_SETTLEMENT_PRESENCE_OFFSET = 177;
const RESULT_SETTLEMENT_PROJECTION_OFFSET = 178;
const ABSENT_U32 = 0xffff_ffff;

// The pinned deployment constants this tool re-derives rather than reads.
const EXPECTED_L_VERDICT_HEX =
  "aa20ec180a864325f5a9db82344476675131b3bc873cb38f222e4a5fb69ebbdc2d2d87";
const EXPECTED_REDEEM_BYTES = 4058;
const EXPECTED_AGGREGATE_BRANCH_BYTES = 74;
const EXPECTED_DOMAIN_PREFIX_BYTES = 110;
const EXPECTED_MAX_INPUTS = 64;
const EXPECTED_MAX_OUTPUTS = 32;
const MAX_STANDARD_LOCKING_BYTECODE = 201;
const MAX_STANDARD_UNLOCKING_BYTECODE = 10_000;
const MAX_STACK_ITEM_LENGTH = 10_000;

const EXPECTED_PROJECTIONS = Object.freeze({
  "private-split":
    "fe9b606ee1cda9e495ef4fc657e78799774cd142ea6e72513a8aab2f1a60709f",
  "private-split-flat-aggregator-service-fee":
    "172362641844c2c8882e463506b03ae3048d1f2213eda7902dbfdb00600b535a",
  "live-chipnet-9x2000-private-split":
    "2d50ff005a739e0aaeb1d4ddeedaf6b6a75bda24773b05f16bc04cf9a0ac7a53",
  "live-chipnet-26x2000-two-source-private-split":
    "9267199713733b613652565b206949d85561e008c20634e426bee82ada399a31",
});

// Opcode bytes, re-declared from the BCH specification, not imported.
const OP_SHA256 = 0xa8;
const OP_HASH256 = 0xaa;
const OP_EQUAL = 0x87;
const OP_EQUALVERIFY = 0x88;
const OP_DUP = 0x76;
const OP_1SUB = 0x8c;
const OP_INPUTINDEX = 0xc0;
const OP_UTXOTOKENCOMMITMENT = 0xcf;
const OP_UTXOTOKENCATEGORY = 0xce;
const OP_UTXOBYTECODE = 0xc7;

const hex = (bytes) => Buffer.from(bytes).toString("hex");
const bin = (value) => Uint8Array.from(Buffer.from(value, "hex"));
const ascii = (value) => Uint8Array.from(Buffer.from(value, "ascii"));
const sha256 = (bytes) => Uint8Array.from(createHash("sha256").update(bytes).digest());
const hash256 = (bytes) => sha256(sha256(bytes));

function concat(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}
const u16be = (v) => Uint8Array.of((v >>> 8) & 0xff, v & 0xff);
const u32be = (v) => Uint8Array.of((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
const u32le = (v) => Uint8Array.of(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
function u64le(value) {
  const out = new Uint8Array(8);
  let rest = BigInt(value);
  for (let i = 0; i < 8; i += 1) { out[i] = Number(rest & 0xffn); rest >>= 8n; }
  return out;
}

/** `sha256DomainSeparated`, re-implemented from its specification. */
function domainSeparatedSha256(domain, payload) {
  const p = ascii(HASH_PERSONALIZATION);
  const d = ascii(domain);
  return sha256(concat([u16be(p.length), p, u16be(d.length), d, u32be(payload.length), payload]));
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === undefined || !key.startsWith("--")) throw new Error(`unexpected argument ${key}`);
    const value = argv[i + 1];
    if (value === undefined) throw new Error(`${key} requires a value`);
    args[key.slice(2)] = value;
    i += 1;
  }
  return args;
}

class Reader {
  #b; #o = 0;
  constructor(b) { this.#b = b; }
  get remaining() { return this.#b.length - this.#o; }
  take(n) {
    if (this.#o + n > this.#b.length) throw new Error("truncated");
    const out = this.#b.subarray(this.#o, this.#o + n); this.#o += n; return out;
  }
  u8() { return this.take(1)[0]; }
  u16() { const v = this.take(2); return v[0] | (v[1] << 8); }
  u32() { const v = this.take(4); return (v[0] | (v[1] << 8) | (v[2] << 16) | (v[3] << 24)) >>> 0; }
  u64() { const v = this.take(8); let o = 0n; for (let i = 7; i >= 0; i -= 1) o = (o << 8n) | BigInt(v[i]); return o; }
  blob() { return this.take(this.u32()); }
  rest() { return this.take(this.remaining); }
}

function parseStatement(statementBytes) {
  const r = new Reader(statementBytes);
  if (Buffer.from(r.take(8)).toString("ascii") !== "APNTTSV1") throw new Error("statement magic");
  if (r.u8() !== 1) throw new Error("statement version");
  r.take(r.u16()); r.u8(); r.u8(); r.take(32 * 4);
  const designatedVerifierInputIndex = r.u32();
  r.take(32);
  if (r.u8() === 1) r.take(32);
  const a = r.u32(); r.take(a * 64);
  const b = r.u32(); r.take(b * (4 + 32 + 32));
  const c = r.u32(); r.take(c * (32 + 4 + 32));
  // Created backing cells: outputIndex, sealCellCommitment32, lockingProfileId32
  // and exitAuthorityCommitment32, the last added by the mandatory created-note
  // exit branch. Consumed cells (`b` above) are unchanged at 4 + 32 + 32.
  const d = r.u32(); r.take(d * (4 + 32 + 32 + 32));
  if (r.u8() === 1) r.take(32);
  const networkFeeSats = r.u64();
  r.u64(); r.u32(); r.u64(); r.u64();

  const p = new Reader(Uint8Array.from(r.rest()));
  if (p.u8() !== 1) throw new Error("projection version");
  const transactionVersion = p.u32();
  const locktime = p.u32();
  const inputCount = p.u32();
  const inputs = [];
  for (let i = 0; i < inputCount; i += 1) {
    const wireTxid32 = Uint8Array.from(p.take(32));
    const vout = p.u32();
    const sequenceNumber = p.u32();
    const spentValueSats = p.u64();
    p.blob();
    if (p.u8() !== 0) throw new Error("token-bearing input");
    p.u8();
    inputs.push({ wireTxid32, vout, sequenceNumber, spentValueSats });
  }
  const outputCount = p.u32();
  const outputs = [];
  for (let j = 0; j < outputCount; j += 1) {
    const valueSats = p.u64();
    const lockingBytecodeTemplate = Uint8Array.from(p.blob());
    const encodedOffset = p.u32();
    if (p.u8() !== 0) throw new Error("token-bearing output");
    p.u8();
    outputs.push({
      valueSats, lockingBytecodeTemplate,
      statementCommitmentOffset: encodedOffset === ABSENT_U32 ? null : encodedOffset,
    });
  }
  return { designatedVerifierInputIndex, networkFeeSats, transactionVersion, locktime, inputs, outputs };
}

/** The `APNTTSP0` transcript, rebuilt from the re-parsed statement. */
function settlementTranscript(statement, statementCommitment32) {
  const parts = [
    ascii("APNTTSP0"), Uint8Array.of(0),
    u32le(statement.transactionVersion), u32le(statement.locktime),
    u32le(statement.inputs.length), u32le(statement.designatedVerifierInputIndex),
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

/** Splits bytecode into opcodes and pushes so pushed data is never read as opcodes. */
function disassemble(bytecode) {
  const items = [];
  let i = 0;
  while (i < bytecode.length) {
    const op = bytecode[i];
    if (op >= 0x01 && op <= 0x4b) {
      items.push({ push: bytecode.subarray(i + 1, i + 1 + op) }); i += 1 + op;
    } else if (op === 0x4c) {
      const n = bytecode[i + 1];
      items.push({ push: bytecode.subarray(i + 2, i + 2 + n) }); i += 2 + n;
    } else if (op === 0x4d) {
      const n = bytecode[i + 1] | (bytecode[i + 2] << 8);
      items.push({ push: bytecode.subarray(i + 3, i + 3 + n) }); i += 3 + n;
    } else {
      items.push({ op }); i += 1;
    }
  }
  return items;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const goldenPath = args["golden-vectors"] ?? DEFAULT_GOLDEN_VECTORS;

  const checks = [];
  const record = (id, passed, detail) => {
    checks.push({ id, passed, ...(detail === undefined ? {} : { detail }) });
    if (!passed) throw new Error(`independent check failed: ${id}${detail ? ` (${detail})` : ""}`);
  };

  // --- 1. the domain-separation constant, re-derived from the strings --------
  const p = ascii(HASH_PERSONALIZATION);
  const d = ascii(SETTLEMENT_PROJECTION_DOMAIN);
  record("personalization-is-42-bytes-not-41", p.length === 42, String(p.length));
  record("domain-is-64-bytes", d.length === 64, String(d.length));
  const prefix = concat([u16be(p.length), p, u16be(d.length), d]);
  record("constant-prefix-is-110-bytes-not-109",
    prefix.length === EXPECTED_DOMAIN_PREFIX_BYTES, String(prefix.length));

  // --- 2. the LANDED bytecode, obtained without importing the builder -------
  // The builder is invoked in a separate process so its module graph never
  // enters this one; only bytes cross the boundary.
  // Default: the tracked artifact, which is what lets this tool run from a tree
  // with no installed workspace. `--from-builder 1` runs the landed builders in
  // a separate process instead, which is the stronger private-side check and is
  // what the artifact's own `--check` mode uses to prove it is not stale.
  const bytecodeSource = args["from-builder"] !== undefined
    ? "landed-builders-in-a-separate-process"
    : `artifact:${args.bytecode ?? DEFAULT_BYTECODE}`;
  const { execFileSync } = await import("node:child_process");
  const emitted = args["from-builder"] === undefined
    ? JSON.parse(readFileSync(args.bytecode ?? DEFAULT_BYTECODE, "utf8"))
    : JSON.parse(execFileSync(process.execPath, [
      "--input-type=module", "-e",
      `import {
         buildApntSettlementAuthorizationCovenantRedeemBytecodeV0,
         buildApntCreatedNoteSealAggregateBranchBytecodeV0,
         getApntSettlementAuthorizationCovenantP2sh32LockingBytecodeV0,
         bytesToHex, hexToBytes32,
       } from "@bch-cloak/protocol-runtime";
       const verdict = getApntSettlementAuthorizationCovenantP2sh32LockingBytecodeV0();
       const category = hexToBytes32("c", "${"11".repeat(32)}");
       process.stdout.write(JSON.stringify({
         redeemHex: bytesToHex(buildApntSettlementAuthorizationCovenantRedeemBytecodeV0()),
         verdictHex: bytesToHex(verdict),
         branchHex: bytesToHex(buildApntCreatedNoteSealAggregateBranchBytecodeV0({
           verifierTokenCategoryVmOrder32: category,
           verdictLockingBytecode35: verdict,
         })),
         categoryHex: bytesToHex(category),
       }));`,
    ], { cwd: join(REPO, "packages", "reference-aggregator"), encoding: "utf8" }));

  const redeem = bin(emitted.redeemHex);
  record("redeem-script-is-the-pinned-byte-length",
    redeem.length === EXPECTED_REDEEM_BYTES, String(redeem.length));
  record("redeem-script-fits-the-standard-unlocking-limit",
    redeem.length < MAX_STANDARD_UNLOCKING_BYTECODE);

  const items = disassemble(redeem);
  const opcodes = items.filter((it) => it.op !== undefined).map((it) => it.op);
  const pushes = items.filter((it) => it.push !== undefined).map((it) => it.push);
  record("redeem-uses-exactly-one-OP_SHA256",
    opcodes.filter((op) => op === OP_SHA256).length === 1);
  record("redeem-uses-no-OP_HASH256-the-1.1.5-correction",
    opcodes.filter((op) => op === OP_HASH256).length === 0);
  record("redeem-tail-compares-against-its-own-verdict-commitment",
    hex(Uint8Array.from(opcodes.slice(-4))) ===
    hex(Uint8Array.of(OP_SHA256, OP_INPUTINDEX, OP_UTXOTOKENCOMMITMENT, OP_EQUAL)));
  record("redeem-embeds-the-independently-rederived-110-byte-prefix",
    pushes.some((push) => hex(push) === hex(prefix)));
  record("redeem-embeds-the-APNTTSP0-transcript-head",
    pushes.some((push) => hex(push) === hex(concat([ascii("APNTTSP0"), Uint8Array.of(0)]))));
  record("redeem-does-not-derive-its-index-with-OP_1SUB",
    !opcodes.includes(OP_1SUB));

  // the unroll bound, counted from the compiled bytecode itself
  const inputSlots = opcodes.filter((op) => op === 0xc8).length; // OP_OUTPOINTTXHASH
  const outputSlots = opcodes.filter((op) => op === 0xcd).length; // OP_OUTPUTBYTECODE
  record("redeem-unrolls-MAX_INPUTS-input-slots",
    inputSlots === EXPECTED_MAX_INPUTS, String(inputSlots));
  record("redeem-unrolls-MAX_OUTPUTS-output-slots",
    outputSlots === EXPECTED_MAX_OUTPUTS, String(outputSlots));

  // --- 3. L_verdict, re-derived ---------------------------------------------
  const lVerdict = concat([
    Uint8Array.of(OP_HASH256), Uint8Array.of(32), hash256(redeem), Uint8Array.of(OP_EQUAL),
  ]);
  record("L_verdict-is-35-bytes", lVerdict.length === 35);
  record("L_verdict-rederived-equals-the-pinned-deployment-constant",
    hex(lVerdict) === EXPECTED_L_VERDICT_HEX, hex(lVerdict));
  record("L_verdict-matches-what-the-builder-emitted",
    emitted.verdictHex === hex(lVerdict));

  // --- 4. the aggregate branch ----------------------------------------------
  const branch = bin(emitted.branchHex);
  record("aggregate-branch-is-74-bytes-the-witness-index-variant",
    branch.length === EXPECTED_AGGREGATE_BRANCH_BYTES, String(branch.length));
  record("aggregate-branch-fits-the-201-byte-standard-locking-limit",
    branch.length <= MAX_STANDARD_LOCKING_BYTECODE);
  const branchItems = disassemble(branch);
  const branchOps = branchItems.filter((it) => it.op !== undefined).map((it) => it.op);
  const branchPushes = branchItems.filter((it) => it.push !== undefined).map((it) => it.push);
  record("aggregate-branch-opcode-sequence-is-the-witness-index-form",
    hex(Uint8Array.from(branchOps)) === hex(Uint8Array.of(
      OP_DUP, OP_UTXOTOKENCATEGORY, OP_EQUALVERIFY, OP_UTXOBYTECODE, OP_EQUAL)),
    hex(Uint8Array.from(branchOps)));
  record("aggregate-branch-pins-exactly-two-constants", branchPushes.length === 2);
  record("aggregate-branch-pins-a-bare-32-byte-category-requiring-an-immutable-nft",
    branchPushes[0].length === 32);
  record("aggregate-branch-pins-the-category-it-was-given",
    hex(branchPushes[0]) === emitted.categoryHex);
  record("aggregate-branch-pins-L_verdict",
    hex(branchPushes[1]) === EXPECTED_L_VERDICT_HEX);

  // --- 5. the four canonical statements, re-derived from published bytes -----
  const golden = JSON.parse(readFileSync(goldenPath, "utf8"));
  record("golden-vector-document-identity",
    golden.format === "apnt-private-note-transition-rust-parity-public-v0" &&
    golden.vectors.length === 4, String(golden.format));
  record("golden-vector-corpus-declares-its-derivation",
    typeof golden.derivation?.sourcePath === "string" &&
    /^[0-9a-f]{64}$/u.test(golden.derivation?.sourceSha256 ?? ""));
  record("golden-vector-corpus-carries-no-witness-field",
    !/"proving[A-Za-z]*"\s*:/u.test(readFileSync(goldenPath, "utf8")));
  const perCase = [];
  for (const [caseId, expectedProjectionHex] of Object.entries(EXPECTED_PROJECTIONS)) {
    const vector = golden.vectors.find((v) => v.id === caseId);
    record(`${caseId}:golden-vector-present`, vector !== undefined);
    const statementBytes = bin(vector.statementBytesHex);
    record(`${caseId}:statement-bytes-length-is-self-consistent`,
      statementBytes.length === vector.statementBytesLength, String(statementBytes.length));
    const statement = parseStatement(statementBytes);
    const statementCommitment32 =
      domainSeparatedSha256(STATEMENT_COMMITMENT_DOMAIN, statementBytes);
    record(`${caseId}:statement-commitment-rederived-from-the-published-statement-bytes`,
      hex(statementCommitment32) === vector.statementCommitment32Hex,
      hex(statementCommitment32));

    const transcript = settlementTranscript(statement, statementCommitment32);
    const projection32 = domainSeparatedSha256(SETTLEMENT_PROJECTION_DOMAIN, transcript);
    record(`${caseId}:settlement-projection-matches-the-pinned-test-vector`,
      hex(projection32) === expectedProjectionHex, hex(projection32));

    const goldenResult = bin(vector.expectedPublicResultHex);
    record(`${caseId}:golden-result-presence-byte-is-1`,
      goldenResult[RESULT_SETTLEMENT_PRESENCE_OFFSET] === 1);
    record(`${caseId}:settlement-projection-matches-golden-vector-offset-178`,
      hex(goldenResult.subarray(RESULT_SETTLEMENT_PROJECTION_OFFSET,
        RESULT_SETTLEMENT_PROJECTION_OFFSET + 32)) === expectedProjectionHex);

    // the covenant's own construction, applied by hand to this transcript
    const byHand = sha256(concat([prefix, u32be(transcript.length), transcript]));
    record(`${caseId}:covenant-style-hash-equals-the-real-projection`,
      hex(byHand) === expectedProjectionHex);

    record(`${caseId}:within-the-covenant-unroll-bound`,
      statement.inputs.length <= EXPECTED_MAX_INPUTS &&
      statement.outputs.length <= EXPECTED_MAX_OUTPUTS,
      `${statement.inputs.length}x${statement.outputs.length}`);
    record(`${caseId}:transcript-within-the-stack-item-ceiling`,
      transcript.length <= MAX_STACK_ITEM_LENGTH, `${transcript.length}B`);

    perCase.push({
      id: caseId,
      inputCount: statement.inputs.length,
      outputCount: statement.outputs.length,
      designatedVerifierInputIndex: statement.designatedVerifierInputIndex,
      designatedVerifierInputIsLast:
        statement.designatedVerifierInputIndex === statement.inputs.length - 1,
      transcriptBytes: transcript.length,
      settlementProjection32: hex(projection32),
    });
  }

  record("canonical-cases-cover-a-non-last-designated-verifier-index",
    perCase.some((c) => !c.designatedVerifierInputIsLast));
  record("canonical-cases-cover-a-last-designated-verifier-index",
    perCase.some((c) => c.designatedVerifierInputIsLast));

  // --- 6. the landed templates are the ones that were verified --------------
  const sacTemplate = readFileSync(SAC_TEMPLATE_PATH, "utf8");
  const branchTemplate = readFileSync(BRANCH_TEMPLATE_PATH, "utf8");
  record("sac-template-uses-OP_SHA256-not-OP_HASH256",
    sacTemplate.includes("OP_SHA256") && !/^\s*OP_HASH256\s*$/mu.test(sacTemplate));
  record("sac-template-reads-OP_INPUTINDEX",
    sacTemplate.includes("OP_INPUTINDEX OP_UTXOTOKENCOMMITMENT OP_EQUAL"));
  record("branch-template-has-no-OP_1SUB-instruction",
    !/^\s*OP_1SUB\s*$/mu.test(branchTemplate));

  const report = {
    format: "apnt-settlement-authorization-covenant-independent-verification-v0",
    status: "independently-verified",
    importsCodeUnderTest: false,
    importsProtocolRuntime: false,
    usesVirtualMachine: false,
    goldenVectorsPath: goldenPath,
    goldenVectorsFormat: golden.format,
    goldenVectorsDerivedFrom: golden.derivation?.sourcePath ?? null,
    bytecodeSource,
    // Loudly enumerated, never silent.
    checksDelegatedToTheDerivation: [
      "the re-derived statement commitment was ALSO compared against the copy carried in the private proving input's own APNTPTI0 header. That comparison is now made once, at derivation time, as proof P3 of derive-public-golden-vectors-v0.mjs, which refuses to emit if it fails. The header is part of the witness and is not published.",
      ...(args["from-builder"] === undefined
        ? ["the compiled bytecode was read from a tracked artifact rather than produced by running the landed builders in this process tree. Run with --from-builder 1 in an installed checkout to drive the builders; the artifact's own --check mode does exactly that. Note that L_verdict is still re-derived from the artifact's own redeem bytes and compared against the pinned deployment constant, so the artifact cannot be swapped for one that passes."]
        : []),
    ],
    constantPrefixBytes: prefix.length,
    redeemBytes: redeem.length,
    lVerdictHex: hex(lVerdict),
    aggregateBranchBytes: branch.length,
    maxInputs: EXPECTED_MAX_INPUTS,
    maxOutputs: EXPECTED_MAX_OUTPUTS,
    cases: perCase,
    checks,
    nonClaims: [
      "no BN254 pairing execution is established here",
      "no chunked verifier graph property is established here",
      "no VM acceptance, chain validation, wallet acceptance or note spendability is established here",
      "the terminal verdict token carrying settlementProjection32 is assumed, not produced, by this tool",
    ],
  };
  if (args.out !== undefined) writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`);

  console.log("independent verification of the landed SAC + aggregate branch");
  console.log(`  constant prefix      ${prefix.length} bytes (design.md's 109 is wrong by one)`);
  console.log(`  redeem script        ${redeem.length} bytes, ${EXPECTED_MAX_INPUTS} input / ${EXPECTED_MAX_OUTPUTS} output slots`);
  console.log(`  L_verdict            ${hex(lVerdict)}`);
  console.log(`  aggregate branch     ${branch.length} bytes (witness-index variant)`);
  console.log("");
  for (const c of perCase) {
    console.log(
      `  ${c.id.padEnd(46)} ${String(c.inputCount).padStart(3)}x${String(c.outputCount).padEnd(3)} ` +
      `dvi=${String(c.designatedVerifierInputIndex).padStart(2)}${c.designatedVerifierInputIsLast ? " (last)    " : " (NOT last)"} ` +
      `transcript ${String(c.transcriptBytes).padStart(5)}B`,
    );
    console.log(`     settlementProjection32 = ${c.settlementProjection32}`);
  }
  console.log("");
  console.log(`checks: ${checks.length}, all passed`);
  console.log("INDEPENDENTLY VERIFIED");
}

await main();
