---
name: verify-apnt
description: Independently verify APNT artifacts published in this repository — a Groth16 proof artifact's binding, a settlement transaction against chain by a path that does not go through this repository's own client, a private-note commitment re-derived from its wire fields, and a pinned trust anchor against its published descriptor. Use when a contributor or their agent wants to check a claim in this repository rather than take it on faith. Chipnet only.
---

# Verifying APNT artifacts independently

This skill exists so a contributor's agent can check what this repository
claims without being taught the codebase first, and without trusting the code
that produced the artifact being checked. Every command below names a real
file in this exported tree and was actually run against it before this skill
was written — the output shown is real output, not illustrative. If a command
below stops matching what's in the tree, that mismatch is itself a bug worth
reporting (see [`CONTRIBUTING.md`](../../../CONTRIBUTING.md)).

**Chipnet only.** Every chain-touching check in this skill talks to Bitcoin
Cash's Chipnet test network. Nothing here touches mainnet, and nothing here
establishes anything about mainnet.

**Requires Node.js ≥ 20.6.0** (this skill was verified against v20.19.4) and,
for the chain-facing check only, outbound network access. The other three
checks need nothing but `node` and files already in this tree.

Run every command from the repository root unless stated otherwise.

**Before anything below: *capabilities.json*, at the repository root, is the
canonical index this skill is a convenience wrapper over** (proposed for the
`repo-metadata` category; check `export-manifest.json` for whether this
checkout carries it yet). It is generated (never hand-written) by actually
running every command in this tree and harvesting each one's own
`establishes` / `doesNotEstablish` from its own output, so it cannot drift
the way a hand-maintained doc can. `npm run capabilities` prints it
human-readably; *capabilities.mjs* with `--json` prints the raw file for a
script. This skill exists because `.claude/` is one vendor's convenience
mechanism for surfacing that same information as a guided walkthrough — the
dependency runs one way: *capabilities.json* and the plain `npm run`
commands are a complete interface with or without this skill, but this skill
is not useful without them. **Whatever you learn from running a command in
this skill, report its `doesNotEstablish` alongside its result** — see
`AGENTS.md`, "What you can run — start with *capabilities.json*", for why
that is not optional.

---

## 1. Verifying a Groth16 proof artifact's binding

Two independent tools live at [`packages/reference-aggregator/tools/`](../../../packages/reference-aggregator/tools). Neither
imports the code under test — both re-implement the hashing and wire parsing
straight from written specification, in their own file, and say so in their
own header comments.

### 1a. [`packages/reference-aggregator/tools/verify-apnt-transition-settlement-projection-independently-v0.mjs`](../../../packages/reference-aggregator/tools/verify-apnt-transition-settlement-projection-independently-v0.mjs)

Re-derives the private-note-transition relation's `settlementProjection32`
public field from the canonical statement bytes, and requires it to equal what
each committed Groth16 proof fixture actually carries — including re-deriving
the masked public-values scalar SP1's Groth16 wrapper verifies against, so the
projection is checked as bound to the proof itself, not just recorded beside
it.

```sh
cd packages/reference-aggregator
node tools/verify-apnt-transition-settlement-projection-independently-v0.mjs
```

Real run, this tree, this export:

```json
{
  "tool": "verify-apnt-transition-settlement-projection-independently-v0",
  "version": 0,
  "goldenVectorsFormat": "apnt-private-note-transition-rust-parity-public-v0",
  "classification": "independent hand-verification of relation public-field derivation",
  "scope": "settlementProjection32 derivation, publication and proof binding",
  "executedBn254Pairings": false,
  "executedChunkedCashVmGraph": false,
  "chainValidated": false,
  ...
}
```
The full output's top-level keys are `cases`, `checkCount`, `checksPassed`,
and `checks` (an array — not `results`, and there is no `results` key). This
run: `checkCount: 126`, `checksPassed: 126`, all 126 entries in `checks[]`
`"passed": true`.

**This disagrees with an already-shipped number, and that disagreement is
reconciled here rather than left for you to trip over.**
[`tools/apnt-private-note-transition-sp1/fixtures/README.md`](../../../tools/apnt-private-note-transition-sp1/fixtures/README.md) (last updated
2026-08-09) records **123/123** for this same tool. The gap is real and has a
specific cause: the tool was changed on 2026-08-13, after that README was last
synced, to run standalone against the *derived public* golden-vector corpus
instead of the private one ([`tools/apnt-private-note-transition-rust-parity/fixtures/typescript-golden-vectors-public-v0.json`](../../../tools/apnt-private-note-transition-rust-parity/fixtures/typescript-golden-vectors-public-v0.json) versus
the private `typescript-golden-vectors-v0.json`, which carries a `"Never
publish"` warning and could not ship). That change added checks about the
public-corpus derivation itself — for example
`public-corpus-mode-declares-what-it-delegated`, visible in `checks[]` — which
is why the count grew from 123 to 126. **126 is current; 123 is what the
fixtures README says and is stale.** If you see a different number again,
trust what you measure over what any document — including this one — claims.

### 1b. [`packages/reference-aggregator/tools/verify-apnt-settlement-authorization-covenant-independently-v0.mjs`](../../../packages/reference-aggregator/tools/verify-apnt-settlement-authorization-covenant-independently-v0.mjs)

Re-derives the settlement authorization covenant's exact locking bytecode from
the landed CashAssembly template plus the same re-derived statement bytes, and
requires the pinned `L_verdict` constant to equal `hash256` of those bytes —
i.e. that the landed covenant really is a mechanical function of the statement
it claims to authorize, checked byte by byte. (The source's own comments say
"landed," not "deployed," throughout — this restates that distinction
deliberately rather than loosely; "landed" means committed to source and
compiled, not that any transaction has spent under it.)

```sh
cd packages/reference-aggregator
node tools/verify-apnt-settlement-authorization-covenant-independently-v0.mjs
```

Real run, tail of the output:

```text
checks: 67, all passed
INDEPENDENTLY VERIFIED
```

Same reconciliation as 1a applies here: [`tools/apnt-private-note-transition-sp1/fixtures/README.md`](../../../tools/apnt-private-note-transition-sp1/fixtures/README.md)
records **60/60** for this tool, from the same 2026-08-09 measurement, for the
same reason — the 2026-08-13 standalone-verifier change added checks. **67 is
current.**

### 1c. Certificate-run keying and retention (documented at the repo root too)

```sh
npm run verify:certificate-run-keying
npm run verify:certificate-run-retention
```

These confirm a certificate run's baked program VKey, statement digest, and
public-values digest really belong to the proof instance it's paired with
(rejecting a relabelled copy), and that every published fixture is
byte-identical to its pinned digest. Full description in the top-level
[`README.md`](../../../README.md), "Verify it yourself" — it is not repeated here to avoid the two
copies drifting.

### What checks 1a–1c establish, and what they do not

They establish that a proof's committed public values are correctly derived
from, and bound to, the statement and covenant that are supposed to depend on
them, and that the published fixture bytes haven't been swapped. **None of
them execute a BN254 pairing** — both scripts say so in their own header
("this tool establishes NOTHING about BN254 pairing execution"). The actual
pairing check runs inside the chunked CashVM verifier graph, across 33
transactions **executed locally against the real BCH 2026 consensus and
standard VMs** — not on-chain, and not broadcast. State this precisely:
[`tools/apnt-private-note-transition-sp1/fixtures/README.md`](../../../tools/apnt-private-note-transition-sp1/fixtures/README.md) is explicit that
this ran on "the real BCH 2026 consensus *and* standard VMs" (its own words)
and, separately and repeatedly, that **"Nothing here has been broadcast."**
That graph's generated bytecode is not part of this export (see [`README.md`](../../../README.md),
"What builds and what does not"), so re-executing the pairing arithmetic
yourself from this tree alone is out of scope for this check. What you can do
here is confirm the *statement* the pairing was checked against is the real
one, byte for byte — which is what a swapped-statement or wrong-covenant
attack would need to fake.

**Verifying a proof's binding is not auditing the relation's semantics.**
These tools check that an artifact is correctly *constructed* — that it says
what it claims to say. They say nothing about whether the relation itself
(the logic in `tools/*-sp1/program*/src/main.rs`) is the right thing to prove.
Auditing that is a source-reading exercise against the relevant `spec/*.md`
capability spec, not something a script can establish for you.

---

## 2. Checking a settlement transaction against chain — direct Electrum RPC

The point of this check is independence: it must not go through this
repository's own [`packages/chain-io/`](../../../packages/chain-io) client, because the whole value of an
independent check is a second path that doesn't share the first path's bugs.
This talks to Fulcrum directly over its Electrum protocol, in the clear, with
nothing but Node's built-in `tls` module.

```js
// direct-electrum-check.mjs — no chain-io import, deliberately
import tls from "node:tls";

const HOST = "chipnet.imaginary.cash"; // the same default Chipnet endpoint
const PORT = 50002;                    // packages/chain-io/src/index.ts uses
// Fallback if the above is unreachable: chipnet.bch.ninja, same port. Both
// were checked against the same txid below and returned identical fields.
const TXID = "<64-hex-char txid to check>";

function rpc(method, params) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: HOST, port: PORT, timeout: 10000 }, () => {
      socket.write(JSON.stringify({ id: 1, method, params }) + "\n");
    });
    let buf = "";
    socket.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      if (buf.includes("\n")) {
        socket.end();
        resolve(JSON.parse(buf.trim().split("\n")[0]));
      }
    });
    socket.on("error", reject);
    socket.on("timeout", () => { socket.destroy(); reject(new Error("timeout")); });
  });
}

const result = await rpc("blockchain.transaction.get", [TXID, true]);
console.log(result.error ? result.error : {
  txid: result.result.txid,
  confirmations: result.result.confirmations,
  blockhash: result.result.blockhash,
  voutCount: result.result.vout.length,
});
```

Real run against the real APNT verifier CashToken genesis transaction on
Chipnet — a public, chain-confirmed txid named in
[`tools/apnt-private-note-transition-sp1/fixtures/README.md`](../../../tools/apnt-private-note-transition-sp1/fixtures/README.md)
(`67349b46125a4e76e37542f404f83820d229b09608d6211f3bf8145db18a806c`):

```text
txid: 67349b46125a4e76e37542f404f83820d229b09608d6211f3bf8145db18a806c
confirmations: 604
blockhash: 00000000558b3c72a7fe59bccc2047ca9cd63116b72a1797f29407d9e06fb583
vout count: 1
```

(`confirmations` was 604 when this was run and only grows; don't treat that
exact number as durable.) The same check against the fallback endpoint,
`chipnet.bch.ninja:50002`, run minutes later, returned the identical `txid`
and `blockhash` with `confirmations: 608` — consistent, as expected for two
Fulcrum instances indexing the same chain.

To check a specific output rather than the whole transaction, use
`blockchain.transaction.get` as above and inspect `result.vout[n]` for
`value` and `scriptPubKey.hex` — **but read the warning below first if the
output carries a CashToken.** Or use `blockchain.scripthash.listunspent`
against the scripthash of a locking bytecode you're checking, computed as
`sha256(lockingBytecode)` reversed (see
[`packages/chain-io/src/index.ts`](../../../packages/chain-io/src/index.ts)'s `electrumScripthashForLockingBytecodeV0` for
the exact derivation — read for reference, don't import).


### A trap that fails silently: verbose output strips the CashToken prefix

`blockchain.transaction.get(txid, true)` does **not** give you the full
serialized output script for a token-bearing output. It reports
`scriptPubKey.hex` as the locking bytecode *without* the token prefix, and
carries the token data separately in a `token_data` field.

Measured on this project's own verifier-token genesis,
`67349b46125a4e76e37542f404f83820d229b09608d6211f3bf8145db18a806c` vout 0:
verbose reports a **35-byte** `scriptPubKey.hex` while the whole raw
transaction is 129 bytes.

**Why this matters more than a normal parsing quirk:** it does not error, it
does not warn, and it does not truncate visibly. You get a well-formed,
plausible answer that is simply not the output script. A length assertion
against it will *pass* while checking a fiction, and a script comparison will
silently disagree with what the chain actually contains.

**So: for any token-bearing output, verify against the raw transaction.**
Request `blockchain.transaction.get(txid, false)`, parse the wire format
yourself, and take the output script from there. Reconstructing it from
`scriptPubKey.hex` plus `token_data` is possible but you must do the
reconstruction deliberately and prove it round-trips; the default reading is
wrong.

This applies to APNT's verifier-stage outputs, which carry the pinned verifier
token category by design.


### What this establishes, and what it does not

It establishes that a specific transaction (or output) really is on Chipnet,
independently of whether this repository's own chain-reading code is correct,
using nothing but the raw Electrum wire protocol. It does **not** establish
APNT protocol acceptance or note spendability. [`packages/chain-io/src/index.ts`](../../../packages/chain-io/src/index.ts)
encodes exactly this distinction in its own evidence types: read
`ChainIoConfiguredNetworkOutputEvidenceV0` (lines 116-135), whose fields
include `chainInclusion`, `apntAcceptance`, and `privateNoteSpendability` — all
hard-pinned `false` on that type, because reading chain-io's own output can
never by itself justify `true` for any of them. (`walletNoteSpendable` is a
related but different piece of vocabulary: it appears as a
`fixedDownstreamNonClaims` entry in the relations' `tools/*-sp1/trusted/*.json`
descriptors, not in `chain-io`. Don't conflate the two names — they come from
different layers of this repository and are checked differently.) "This is on
chain" and "the wallet accepted this as a valid private note" are different
claims; this check only ever establishes the first.

---

## 3. Re-deriving a note commitment

A private note's commitment is `sha256DomainSeparated(domain, serialized
note)`, defined in [`packages/protocol-runtime/src/hash.ts`](../../../packages/protocol-runtime/src/hash.ts) and
[`packages/protocol-runtime/src/notes.ts`](../../../packages/protocol-runtime/src/notes.ts). Both are plain TypeScript with no
external dependencies, published in full — but the package isn't shipped as an
installable, compiled unit in this tree (see [`README.md`](../../../README.md), "What builds and
what does not"), so the fastest zero-setup check is a direct, small
re-implementation in bare Node, checked against the real source below.

```js
// note-commitment-check.mjs
import { createHash } from "node:crypto";

// Mirrors packages/protocol-runtime/src/hash.ts exactly.
const HASH_PERSONALIZATION = "BCH Cloak APNT v0 domain-separated SHA-256";
const PRIVATE_NOTE_V0_COMMITMENT_DOMAIN = "bch-cloak-apnt-v0:private-note";

const u16be = (v) => Uint8Array.of((v >>> 8) & 0xff, v & 0xff);
const u32be = (v) => Uint8Array.of((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
const concat = (parts) => {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};
const enc = new TextEncoder();

function sha256DomainSeparated(domain, payload) {
  const p = enc.encode(HASH_PERSONALIZATION), d = enc.encode(domain);
  return createHash("sha256")
    .update(concat([u16be(p.length), p, u16be(d.length), d, u32be(payload.length), payload]))
    .digest();
}

// Mirrors serializeDeterministicUtf8 in packages/protocol-runtime/src/serialization.ts:
// sorted-key JSON, Uint8Array -> { "$bytes": lowercase-hex }.
function normalize(v) {
  if (v === null || typeof v === "boolean" || typeof v === "string" || typeof v === "number") return v;
  if (v instanceof Uint8Array) return { $bytes: Buffer.from(v).toString("hex") };
  if (Array.isArray(v)) return v.map(normalize);
  return Object.fromEntries(Object.entries(v).sort(([a],[b]) => a.localeCompare(b)).map(([k, x]) => [k, normalize(x)]));
}

// Mirrors noteCommitmentV0 in packages/protocol-runtime/src/notes.ts.
function noteCommitmentV0(note) {
  const payload = enc.encode(JSON.stringify(normalize({
    assetId: note.assetId, noteNonce: note.noteNonce,
    ownerCommitment: note.ownerCommitment, valueSats: note.valueSats.toString(10),
    version: note.version,
  })));
  return sha256DomainSeparated(PRIVATE_NOTE_V0_COMMITMENT_DOMAIN, payload);
}

const note = {
  version: 0,
  assetId: new Uint8Array(32).fill(0),                          // native BCH
  valueSats: 2000n,
  ownerCommitment: Buffer.from("11".repeat(32), "hex"),          // your note's fields go here
  noteNonce: Buffer.from("22".repeat(32), "hex"),
};
console.log("noteCommitment32:", Buffer.from(noteCommitmentV0(note)).toString("hex"));
```

Real run:

```text
noteCommitment32: 713cae6b8a606223ed25b9c993ba85df9b959927d8ea5d832f731c0efbfed9fd
```

**This was cross-checked against the actual published source**, not just
written to look plausible: the four real files
([`packages/protocol-runtime/src/hash.ts`](../../../packages/protocol-runtime/src/hash.ts), [`packages/protocol-runtime/src/notes.ts`](../../../packages/protocol-runtime/src/notes.ts),
[`packages/protocol-runtime/src/serialization.ts`](../../../packages/protocol-runtime/src/serialization.ts), [`packages/protocol-runtime/src/bytes.ts`](../../../packages/protocol-runtime/src/bytes.ts))
were compiled with `tsc` and run against the
identical input, and produced the byte-identical result
`713cae6b8a606223ed25b9c993ba85df9b959927d8ea5d832f731c0efbfed9fd`. If you
have `typescript` available, prefer compiling the real files directly over
trusting a re-implementation — that's strictly higher assurance, and the
re-implementation above exists only to need zero setup.

### What this establishes, and what it does not

It establishes that, given a note's plaintext fields, this is the commitment
that would appear as a leaf in the note tree — useful for a wallet or verifier
confirming its own bookkeeping matches the protocol's definition. It
establishes **nothing about a specific published note**, because a note's
plaintext fields (`ownerCommitment`'s preimage, `noteNonce`, `valueSats`) are
private witness material and are never published. There is no committed
fixture in this export that pairs a real note's plaintext with its
commitment — by design, since publishing one would be publishing a private
note.

---

## 4. Confirming a pinned trust anchor against its published descriptor

Every relation's `tools/*-sp1/trusted/*.json` descriptor pins the exact
identity a proof must have to be accepted: program VKey, guest ELF digest,
Groth16 verification-key digest, semantic-contract commitment. The committed
proof fixtures under the sibling `tools/*-sp1/fixtures/` directory carry the
same fields independently, because they were generated against that
identity. If they disagree, one of them is stale or has been tampered with.

```js
// trust-anchor-check.mjs
import { readFileSync } from "node:fs";

const TRUSTED = "tools/apnt-private-note-transition-sp1/trusted/private-note-transition-groth16-verifier-v0.json";
const FIXTURE = "tools/apnt-private-note-transition-sp1/fixtures/canonical-groth16-live-chipnet-9x2000-v0.json";

const trusted = JSON.parse(readFileSync(TRUSTED, "utf8"));
const fixture = JSON.parse(readFileSync(FIXTURE, "utf8"));

const fields = [
  "programVkeyHash", "guestElfSha256", "guestElfBytes",
  "groth16VerificationKeySha256", "groth16VerificationKeyBytes",
  "semanticContractCommitment", "publicValuesCodec",
];

let allMatch = true;
for (const field of fields) {
  const match = trusted[field] === fixture[field];
  if (!match) allMatch = false;
  console.log(`${match ? "ok  " : "MISMATCH"} ${field}`);
}
console.log(allMatch ? "All pinned identity fields match the trust anchor." : "MISMATCH.");
```

Real run, from the repository root:

```sh
node trust-anchor-check.mjs
```
```text
ok   programVkeyHash
ok   guestElfSha256
ok   guestElfBytes
ok   groth16VerificationKeySha256
ok   groth16VerificationKeyBytes
ok   semanticContractCommitment
ok   publicValuesCodec
All pinned identity fields match the trust anchor.
```

The same check runs against the import relations, with a shape difference
worth stating exactly rather than glossing over: the import fixtures under
[`tools/apnt-import-created-note-sp1/fixtures/`](../../../tools/apnt-import-created-note-sp1/fixtures) — [`tools/apnt-import-created-note-sp1/fixtures/canonical-groth16-proof-v0.json`](../../../tools/apnt-import-created-note-sp1/fixtures/canonical-groth16-proof-v0.json),
[`tools/apnt-import-created-note-sp1/fixtures/canonical-groth16-proof-v1.json`](../../../tools/apnt-import-created-note-sp1/fixtures/canonical-groth16-proof-v1.json), [`tools/apnt-import-created-note-sp1/fixtures/canonical-groth16-proof-v2.json`](../../../tools/apnt-import-created-note-sp1/fixtures/canonical-groth16-proof-v2.json) — nest
these fields one level deeper, under a `"proof"` key. The sibling keys
alongside `"proof"` are **not uniform across versions, measured directly**:
v0 and v1 each have `proof` and `measurement` only; v2 additionally has a
`preflight` object (`proof`, `preflight`, `measurement`). Read
`fixture.proof[field]`, not `fixture[field]`, when comparing against the
matching descriptor under [`tools/apnt-import-created-note-sp1/trusted/`](../../../tools/apnt-import-created-note-sp1/trusted) —
[`tools/apnt-import-created-note-sp1/trusted/import-created-note-groth16-verifier-v0.json`](../../../tools/apnt-import-created-note-sp1/trusted/import-created-note-groth16-verifier-v0.json),
[`tools/apnt-import-created-note-sp1/trusted/import-created-note-groth16-verifier-v1.json`](../../../tools/apnt-import-created-note-sp1/trusted/import-created-note-groth16-verifier-v1.json),
[`tools/apnt-import-created-note-sp1/trusted/import-created-note-groth16-verifier-v2.json`](../../../tools/apnt-import-created-note-sp1/trusted/import-created-note-groth16-verifier-v2.json) — regardless of version; that
part is consistent even though the sibling keys aren't. Checked separately
(not shown, same script with that one-line change): all seven fields match
for all three of v0, v1, and v2.

**This check cannot be run at all for the v4 import relation.** A v4 fixture
ships ([`tools/apnt-import-created-note-sp1/fixtures/canonical-groth16-proof-v4.json`](../../../tools/apnt-import-created-note-sp1/fixtures/canonical-groth16-proof-v4.json),
`proof.relationIdentity: "apnt-import-created-note-relation-v4"`), but no
`tools/apnt-import-created-note-sp1/trusted/import-created-note-groth16-verifier-v4.json`
is staged — there is no v4 trust anchor to compare it against in this export.
The only identity you can read for v4 is the fixture's own self-reported
`proof.programVkeyHash`, which is not independent confirmation of anything;
it's the artifact asserting its own identity. Treat v4 as unconfirmable by
this check until a v4 trust anchor ships.

Against [`tools/apnt-sp1-notecommitment-verifier/trusted/apnt-note-commitment-preimage-v0.json`](../../../tools/apnt-sp1-notecommitment-verifier/trusted/apnt-note-commitment-preimage-v0.json)
and [`tools/apnt-sp1-notecommitment-verifier/fixtures/metadata.json`](../../../tools/apnt-sp1-notecommitment-verifier/fixtures/metadata.json), the
comparable fields are named differently again (`programVkeyHash` matches
directly; the descriptor has no `guestElfSha256` or `groth16*` fields at all,
because that relation's fixture is an SP1 *core* proof, not a Groth16 one —
see the note at the end of this skill). Don't assume field names carry across
relations without checking; check each pair before trusting a diff against it.

### What this establishes, and what it does not

It establishes that the fixture you're relying on was generated against the
identity the trust anchor pins — that nobody has quietly regenerated a fixture
under a different guest without also moving the pin (or vice versa). It does
**not** establish that the pinned identity is *correct* — that the guest ELF
really implements the relation the spec describes. The authoritative way to
check that a guest ELF's digest is what a given source really builds to is the
container-pinned build at `tools/sp1-canonical-guest-build/` (read
`tools/sp1-canonical-guest-build/CANDIDATES.md` first — it documents measured,
current candidate identities and is explicit that **none of them are pins**;
reproducing a pin is a separate, coordinated migration, not a quick check).

---

## A known gap in this export, found while writing this skill

[`tools/apnt-sp1-notecommitment-verifier/verifier/src/lib.rs`](../../../tools/apnt-sp1-notecommitment-verifier/verifier/src/lib.rs) performs full,
real SP1 core-proof verification via `sp1-sdk` — a genuine cryptographic
proof-acceptance check, not a mixup detector. It reads a compiled-in trusted
verifying key via a Rust `include_bytes!` of a sibling binary,
`apnt-note-commitment-preimage-v0.sp1-vkey.bin`, two directories up from the
crate under [`tools/apnt-sp1-notecommitment-verifier/trusted/`](../../../tools/apnt-sp1-notecommitment-verifier/trusted). **That binary
file is not part of this export**
— only the sibling [`tools/apnt-sp1-notecommitment-verifier/trusted/apnt-note-commitment-preimage-v0.json`](../../../tools/apnt-sp1-notecommitment-verifier/trusted/apnt-note-commitment-preimage-v0.json) descriptor is
staged. As allowlisted today, `cargo build` for this crate never even reaches
that `include_bytes!`: `tools/apnt-sp1-notecommitment-verifier/Cargo.toml` is
a workspace whose `members` list includes `fixture-generator`, which is
proving-orchestration tooling withheld from every layer for the same reason
as every other fixture generator in this export — so Cargo fails at
workspace-manifest resolution, before compiling anything:

```
error: failed to load manifest for workspace member `.../fixture-generator`
Caused by:
  failed to read `.../fixture-generator/Cargo.toml`
Caused by:
  No such file or directory (os error 2)
```

Reproduced directly against this checkout. This is flagged rather than worked
around; the fix is adding the missing crate (or trimming it from `members`)
in the export, which is outside this skill's scope to change.
