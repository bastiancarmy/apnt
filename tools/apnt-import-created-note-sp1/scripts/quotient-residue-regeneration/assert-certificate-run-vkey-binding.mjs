// Assert that a quotient/residue certificate run is really keyed to the SP1
// program VKey and the instance proof it claims — and that a run keyed to a
// different program is REJECTED rather than merely labelled differently.
//
// WHY THIS EXISTS
//   Task 9.2 asks for a certificate run "keyed to the 8.2 vkey" whose "own
//   identity block records the new vkey". A recorded identity block is a string
//   in a JSON file; on its own it proves nothing, because a wrapper could write
//   any string. This script reads the keying out of the emitted transcript's own
//   bytes and makes retention of the superseded V1-keyed run a LIVE assertion:
//   the superseded run must FAIL every binding under the V4 instance, and the
//   new run must FAIL every binding under the V1 instance. If the two runs were
//   ever swapped, or if the new run were secretly the old ladder relabelled,
//   this exits non-zero.
//
// WHAT IS CHECKED, FROM THE TRANSCRIPT BYTES
//   1  twelve inputs, twelve stage records, every one VM-accepted
//   2  EVERY input's locking is P2SH32 of the redeem script carried in its own
//      unlocking, and each body's length equals the reported `redeemBytes`
//   3  the gate redeem script bakes exactly five 32-byte constants, and numbers
//      two, three and four are the instance's wrapper-key digest, public-values
//      digest and PROGRAM VKEY — read out of the script, not out of the label
//   4  the fifth baked constant is the little-endian masked SHA-256 of the
//      instance's public values (the gate's `statementDigest`)
//   5  input 1's unlocking carries that same scalar at offset 2, which is the
//      binding the gate actually enforces at spend time
//   6  `provenance.instance.programVkeyHash` equals the program VKey found in
//      the script, and equals `--expect-vkey` when one is given
//   7  `provenance.lockingGraphHash` recomputes from the emitted lockings
//
// WHAT THIS IS NOT — READ THIS BEFORE QUOTING IT AS EVIDENCE
//   The per-pair checks above are a MIXUP DETECTOR, not a forgery detector.
//   They do not re-execute the CashVM transcript: `stageSummary[].accepted` is a
//   REPORTED field that is read, never re-run. A determined party can therefore
//   take the V1-keyed run, substitute the four keying constants in the gate,
//   re-derive input 0's P2SH32 locking, patch input 1's limb, recompute
//   `lockingGraphHash` and rewrite the identity block, and the per-pair checks
//   will pass — because the eleven ARITHMETIC bodies are never looked at. That
//   forgery was constructed and demonstrated during review of task 9.2.
//
//   The two cross-run checks below are what close that class, and they are the
//   reason a run cannot be a relabelled copy of another:
//     --distinct-bodies              all twelve stage bodies must differ between
//                                    the two runs. A relabelled copy shares them.
//     --distinct-profile-identity    the runtime-generic topology deriver, run on
//                                    both runs under ONE fixed public-values
//                                    template, must yield different profile
//                                    identities. That deriver reviews and
//                                    re-emits every arithmetic body, so its
//                                    output moves only if the ladder really did.
//   Both fail closed: if the deriver module cannot be loaded, that is a FAILURE
//   and not a skip.
//
//   TASK 9.3 UPDATE — the consumption-time gap this file could not close is now
//   closed inside the derivers themselves.
//   `assertAPNTQuotientResidueCertificateRunIsKeyedToProgramVkeyV1` reads the
//   baked program key out of a run's own gate redeem script and REFUSES to emit
//   a topology for a different deployment. Everything below is unchanged; the
//   `--distinct-profile-identity` fingerprint now opts out of that one check
//   explicitly, because comparing two differently-keyed runs under one deriver
//   is its entire purpose.
//
//   NOTE on `--distinct-profile-identity`: the deriver is the V1 runtime-generic
//   one, and it is used here ONLY as a body-sensitive fingerprint under a fixed
//   template. The value it returns for a V4-keyed run is NOT that run's V4
//   verifier profile identity — deriving that is task 9.3, and nothing here
//   claims a V4 topology exists.
//
// SCOPE
//   Read-only. Proves nothing, funds nothing, broadcasts nothing, emits no
//   verifier topology for use, and asserts no chain or wallet claim.
//
// USAGE
//   node assert-certificate-run-vkey-binding.mjs \
//     [--expect-vkey <64-hex>] \
//     [--retained <path>=<expected-file-sha256>] \
//     [--profile-template <proof.json>] \
//     [--distinct-bodies <runA.json>=<runB.json>] \
//     [--distinct-profile-identity <runA.json>=<runB.json>] \
//     <run.json>=<proof.json>=accept  [<run.json>=<proof.json>=reject ...]
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const sha256hex = (input) => createHash("sha256").update(input).digest("hex");
// P2SH32 commits to OP_HASH256 of the redeem script, i.e. double SHA-256.
const hash256hex = (input) =>
  createHash("sha256").update(createHash("sha256").update(input).digest()).digest("hex");

// --- argument parsing -------------------------------------------------------
const pairs = [];
const retained = [];
const distinctBodies = [];
const distinctProfiles = [];
let expectVkey;
let profileTemplatePath;
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg === "--expect-vkey") {
    expectVkey = process.argv[i + 1];
    i += 1;
  } else if (arg === "--profile-template") {
    profileTemplatePath = process.argv[i + 1];
    i += 1;
  } else if (arg === "--distinct-bodies" || arg === "--distinct-profile-identity") {
    const [a, b] = process.argv[i + 1].split("=");
    if (!a || !b) throw new Error(`bad ${arg} argument (want <runA>=<runB>)`);
    (arg === "--distinct-bodies" ? distinctBodies : distinctProfiles).push({ a, b });
    i += 1;
  } else if (arg === "--retained") {
    const [path, digest] = process.argv[i + 1].split("=");
    retained.push({ path, digest });
    i += 1;
  } else {
    const [runPath, proofPath, expectation] = arg.split("=");
    if (!runPath || !proofPath || !["accept", "reject"].includes(expectation)) {
      throw new Error(`bad pair argument: ${arg} (want <run>=<proof>=accept|reject)`);
    }
    pairs.push({ runPath, proofPath, expectation });
  }
}
if (pairs.length === 0) throw new Error("no <run>=<proof>=accept|reject pairs given");
if (expectVkey !== undefined && !/^[0-9a-f]{64}$/.test(expectVkey)) {
  throw new Error("--expect-vkey is not a 32-byte lowercase digest");
}

// --- minimal push decoder ---------------------------------------------------
function decodePushes(script) {
  const pushes = [];
  let i = 0;
  while (i < script.length) {
    const op = script[i];
    if (op >= 0x01 && op <= 0x4b) {
      pushes.push(script.subarray(i + 1, i + 1 + op));
      i += 1 + op;
    } else if (op === 0x4c) {
      const n = script[i + 1];
      pushes.push(script.subarray(i + 2, i + 2 + n));
      i += 2 + n;
    } else if (op === 0x4d) {
      const n = script.readUInt16LE(i + 1);
      pushes.push(script.subarray(i + 3, i + 3 + n));
      i += 3 + n;
    } else {
      i += 1;
    }
  }
  return pushes;
}

// --- one (run, proof) evaluation -------------------------------------------
function evaluate(runPath, proofPath) {
  const failures = [];
  const check = (ok, label) => {
    if (!ok) failures.push(label);
    return ok;
  };

  const run = JSON.parse(readFileSync(runPath, "utf8"));
  const artifact = JSON.parse(readFileSync(proofPath, "utf8"));
  const record = artifact.proof ?? artifact;

  check(Array.isArray(run.inputs) && run.inputs.length === 12, "twelve inputs");
  check(Array.isArray(run.stageSummary) && run.stageSummary.length === 12, "twelve stage records");
  check(
    Array.isArray(run.stageSummary) && run.stageSummary.every((s) => s.accepted === true),
    "every stage VM-accepted",
  );

  // Every stage, not just the gate: each locking must be P2SH32 of the body its
  // own unlocking carries, and that body's length must equal what the run
  // reports. This binds `stageSummary` to the bytes rather than trusting it.
  const bodies = run.inputs.map((input) => decodePushes(Buffer.from(input.unlocking, "hex")).at(-1));
  bodies.forEach((body, index) => {
    check(
      run.inputs[index].locking === `aa20${hash256hex(body)}87`,
      `input ${index} locking is P2SH32 of its own redeem script`,
    );
    check(
      body.length === run.stageSummary?.[index]?.redeemBytes,
      `input ${index} body length matches the reported redeemBytes`,
    );
  });
  const redeem = bodies[0];

  const constants = decodePushes(redeem).filter((p) => p.length === 32).map((p) => p.toString("hex"));
  check(constants.length === 5, `gate bakes exactly five 32-byte constants (saw ${constants.length})`);

  check(constants[1] === record.groth16VerificationKeySha256, "baked wrapper-key digest is the instance's");
  check(constants[2] === record.publicValuesSha256, "baked public-values digest is the instance's");
  check(constants[3] === record.programVkeyHash, "BAKED PROGRAM VKEY is the instance's");

  const masked = Buffer.from(createHash("sha256").update(Buffer.from(record.publicValuesBytes, "hex")).digest());
  masked[0] &= 0x1f;
  const statementScalar = Buffer.from(masked).reverse().toString("hex");
  check(constants[4] === statementScalar, "baked statement digest is the instance's masked public-values scalar");

  const unlocking1 = Buffer.from(run.inputs[1].unlocking, "hex");
  check(
    unlocking1.subarray(2, 34).toString("hex") === statementScalar,
    "GLV genesis runtime limb is the instance's masked public-values scalar",
  );

  check(
    run.provenance?.instance?.programVkeyHash === record.programVkeyHash,
    "identity block records the instance's program VKey",
  );
  if (expectVkey !== undefined) {
    check(record.programVkeyHash === expectVkey, `instance program VKey is ${expectVkey}`);
    check(constants[3] === expectVkey, `BAKED PROGRAM VKEY is ${expectVkey}`);
  }

  const recomputed = sha256hex(run.inputs.map((input) => input.locking).join(""));
  check(run.provenance?.lockingGraphHash === recomputed, "recorded lockingGraphHash recomputes");

  return failures;
}

// --- run the matrix ---------------------------------------------------------
let bad = 0;
console.log("certificate-run keying matrix\n");
for (const { runPath, proofPath, expectation } of pairs) {
  let failures;
  try {
    failures = evaluate(runPath, proofPath);
  } catch (error) {
    failures = [`threw: ${error.message}`];
  }
  const accepted = failures.length === 0;
  const asExpected = accepted === (expectation === "accept");
  if (!asExpected) bad += 1;
  console.log(`${asExpected ? "ok  " : "FAIL"} expected ${expectation.padEnd(6)} got ${accepted ? "accept" : "reject"}`);
  console.log(`       run   ${runPath}`);
  console.log(`       proof ${proofPath}`);
  for (const failure of failures) console.log(`       - ${failure}`);
  console.log();
}

// --- cross-run: the ladders themselves must differ ---------------------------
// This is the check that a relabelled copy cannot pass. A forgery that rewrites
// the gate constants, re-derives the gate's P2SH32 locking and patches the
// identity block still carries the ORIGINAL eleven arithmetic bodies.
const stageBodies = (runPath) =>
  JSON.parse(readFileSync(runPath, "utf8")).inputs.map((input) =>
    sha256hex(decodePushes(Buffer.from(input.unlocking, "hex")).at(-1)));

for (const { a, b } of distinctBodies) {
  let shared;
  try {
    const [left, right] = [stageBodies(a), stageBodies(b)];
    shared = left.map((digest, index) => (digest === right[index] ? index : -1)).filter((i) => i >= 0);
  } catch (error) {
    shared = [`threw: ${error.message}`];
  }
  const ok = Array.isArray(shared) && shared.length === 0;
  if (!ok) bad += 1;
  console.log(`${ok ? "ok  " : "FAIL"} all twelve stage bodies differ between the two runs`);
  console.log(`       ${a}`);
  console.log(`       ${b}`);
  if (!ok) console.log(`       - shared stage bodies at index: ${shared.join(", ")}`);
  console.log();
}

// --- cross-run: the derived topology must differ -----------------------------
// The runtime-generic deriver reviews and re-emits every arithmetic body, so its
// profile identity moves only if the ladder really moved. Used here purely as a
// body-sensitive fingerprint under ONE fixed template; the value returned for a
// V4-keyed run is NOT a V4 verifier profile identity (that is task 9.3).
if (distinctProfiles.length > 0) {
  const derive = await (async () => {
    if (profileTemplatePath === undefined) {
      throw new Error("--distinct-profile-identity requires --profile-template <proof.json>");
    }
    const moduleUrl = new URL(
      "../../../../packages/reference-aggregator/dist/apnt_import_created_note_projection_bound_settlement_v1.js",
      import.meta.url,
    );
    const module = await import(moduleUrl.href);
    const fn = module.deriveAPNTImportCreatedNoteRuntimeGenericVerifierTopologyV1;
    if (typeof fn !== "function") throw new Error("topology deriver not exported by the built module");
    const artifact = JSON.parse(readFileSync(profileTemplatePath, "utf8"));
    const template = Uint8Array.from(Buffer.from((artifact.proof ?? artifact).publicValuesBytes, "hex"));
    // Task 9.3 added a fail-closed program-key match to this deriver: it now
    // REFUSES a run whose gate bakes a program key other than the one the
    // topology is being keyed to. That is exactly the protection this file's
    // header asks for, and it is why this check must opt out explicitly — the
    // whole point here is to run ONE deriver over TWO differently-keyed runs
    // and compare, which is a fingerprint, not a deployment.
    //
    // Do NOT read the identities below as harmless. `569599ec…` — the V4 run
    // under the V1 deriver — is precisely the identity the console's own
    // construction path emitted, with `failureCode: null`, when the V4 file was
    // supplied to it at commit `890fa4d`. It is not "an identity that
    // corresponds to no deployment"; it is the wrong deployment's identity,
    // and a funding round that used it would have stranded its value. Deriving
    // it here is safe only because this script compares the two values and
    // discards them.
    return (runPath) => fn(JSON.parse(readFileSync(runPath, "utf8")), template, {
      allowProgramVkeyMismatchForBodyFingerprintingOnly: true,
    }).profileIdentity;
  })().catch((error) => {
    // Fail closed. An unbuildable deriver is a failure, never a silent skip.
    console.log(`FAIL topology deriver unavailable — this check does NOT skip`);
    console.log(`       - ${error.message}\n`);
    bad += 1;
    return undefined;
  });

  if (derive !== undefined) {
    for (const { a, b } of distinctProfiles) {
      let left; let right; let error;
      try {
        left = derive(a);
        right = derive(b);
      } catch (thrown) {
        error = thrown.message;
      }
      const ok = error === undefined && left !== right;
      if (!ok) bad += 1;
      console.log(`${ok ? "ok  " : "FAIL"} the two runs derive different verifier profile identities`);
      console.log(`       ${a}  ->  ${left ?? "—"}`);
      console.log(`       ${b}  ->  ${right ?? "—"}`);
      if (error !== undefined) console.log(`       - threw: ${error}`);
      console.log();
    }
  }
}

for (const { path, digest } of retained) {
  const actual = sha256hex(readFileSync(path));
  const ok = actual === digest;
  if (!ok) bad += 1;
  console.log(`${ok ? "ok  " : "FAIL"} superseded artifact retained byte-identical`);
  console.log(`       ${path}`);
  console.log(`       expected ${digest}`);
  console.log(`       actual   ${actual}\n`);
}

if (bad > 0) {
  console.error(`${bad} expectation(s) not met`);
  process.exit(1);
}
console.log("all expectations met");
