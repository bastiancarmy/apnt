# Live settlement evidence: `8510edd3…`

This is one real Chipnet transaction, checked here by direct Electrum RPC —
not through this repository's own client — so you don't have to trust our
code to trust these numbers. Every figure below was re-derived independently
while writing this document; the recipe at the bottom lets you do the same.

```text
txid   8510edd3b26e85aaf401d32873cdd035cd3f0cfe0a233f682597145a1bfea6f4
block  000000001e1746af34b05607a347b1d10ff3480824764c359da3f9a4aedda9ab
```

## What this transaction is

It is a live APNT **import** on Chipnet: transparent BCH funding inputs go
in, four covenant-locked private-note seals and their recovery material come
out. This is the Milestone 1 deliverable — "Beaconless Import Funding and
ML-KEM Recovery" — not the separate 26-cell transition settlement
(`26101dc1…`), which is a different transaction with its own record and its
own `apntProtocolAcceptance: false` caveat.

## Measured, by direct RPC

| fact | value | how it was obtained |
| --- | --- | --- |
| transaction size | 99,835 bytes | `blockchain.transaction.get(txid, false)` — raw hex length ÷ 2 |
| inputs / outputs | 12 / 20 | manual wire-format parse of the raw hex |
| fee | 99,835 sats | sum of parsed input values (`124,945` sats, resolved via each prevout) minus sum of parsed output values (`25,110` sats) |
| fee ÷ size | exactly 1.0000 sat/byte | `99,835 / 99,835` |
| outputs 0–3 | 128 bytes each, 2,000 sats each | parsed locking-bytecode length and value per output |
| outputs 0–3, pairwise distinct | 4 of 4 distinct | full locking-bytecode bytes compared pairwise |
| outputs 0–3, unspent | all four, at verification time (2026-08-13) | `blockchain.utxo.get_info(txid, n)` returned a value and `confirmed_height` for `n = 0..3`; a spent output returns nothing to key off |
| OP_RETURN outputs | 0 | none of the 20 output scripts start with `0x6a` |
| recovery-carrier magic | `41525042` (`ARPB`) — one occurrence, in output 4 only | full-transaction byte scan for `41525042`: exactly 1 hit, at raw offset 96,629, inside `vout[4]`'s pushed data (script-relative byte 2 of 201); outputs 5–18 contain no occurrence anywhere |

Outputs 0–3's locking scripts share 96 of their 128 bytes and differ only in
a 32-byte hole — the structure described in
[`docs/the-seal.md`](./the-seal.md). That shared-skeleton-plus-hole shape is what
"pairwise distinct" is checking: four different holes, one shared template.

## Two things stated precisely, not loosely

**The fee rate is an observation about this transaction, not a claim about
protocol enforcement.** `99,835` sats of fee against `99,835` bytes of
transaction is exactly 1.0000 sat/byte — but that is what this specific,
already-built transaction happened to pay, measured after the fact by RPC.
It is not evidence that any covenant here enforces a 1 sat/byte rate as a
rule other transactions must also follow.

**"Beaconless" needs its qualifier — corrected, having first stated it
wrongly.** An earlier draft of this document claimed all 15 recovery-carrier
outputs begin with the 4-byte magic `41525042` (`ARPB`), generalising from
one output to fifteen. **A full-transaction byte scan shows that is false:**
`41525042` occurs exactly **once** in the entire 99,835-byte transaction, at
raw offset 96,629 — inside `vout[4]`'s pushed data only, two bytes past that
output's `OP_PUSHDATA1 197` prefix, not at the start of its script either.
Outputs 5–18 do not contain that byte sequence anywhere; every one of the 15
carriers' scripts begins identically with the same `OP_PUSHDATA1 197`
opcode pair (`4cc5`), but what follows differs output to output, and only
output 4's payload happens to start with `ARPB`.

So the real, narrower claim is: **one output in this transaction (`vout[4]`)
carries a fixed 4-byte magic near the start of its pushed payload; the other
14 recovery carriers carry no fixed prefix at all** — nothing in outputs
5–18 distinguishes them from arbitrary bytes under a scan for a known
prefix. That is still a public protocol fingerprint, and still worth
stating as a qualifier on "beaconless": zero `OP_RETURN` outputs is true and
checked above, but a scan for `41525042` on Chipnet would still surface this
transaction via `vout[4]` alone. It does not violate the campaign's letter —
no *beacon* (no reusable per-recipient marker) is placed on-chain — but a
single carrier is not invisible, and the other fourteen should not have been
described as sharing its fingerprint.

## Re-deriving this yourself

This talks to Fulcrum directly over the raw Electrum protocol, with nothing
but Node's built-in `tls` module — no `chain-io` import, deliberately, so the
check doesn't share any bug in this repository's own client. Two endpoints
are named so one being down doesn't block you.

```js
// verify-live-settlement.mjs — node >=18, no dependencies
import tls from "node:tls";

const HOSTS = ["chipnet.imaginary.cash", "chipnet.bch.ninja"];
const PORT = 50002;
const TXID = "8510edd3b26e85aaf401d32873cdd035cd3f0cfe0a233f682597145a1bfea6f4";

function rpc(host, port, method, params) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, rejectUnauthorized: false }, () => {
      socket.write(JSON.stringify({ id: 1, method, params }) + "\n");
    });
    let buf = "";
    socket.setTimeout(15000, () => { socket.destroy(); reject(new Error(`timeout ${host}`)); });
    socket.on("data", (d) => {
      buf += d.toString("utf8");
      if (buf.includes("\n")) {
        socket.end();
        try { resolve(JSON.parse(buf.split("\n")[0])); } catch (e) { reject(e); }
      }
    });
    socket.on("error", reject);
  });
}

async function tryHosts(method, params) {
  let lastErr;
  for (const host of HOSTS) {
    try { return await rpc(host, PORT, method, params); }
    catch (e) { lastErr = e; console.error(`[${host}] failed: ${e.message}`); }
  }
  throw lastErr;
}

// 1. Full verbose record: confirmations, blockhash, raw hex.
const tx = (await tryHosts("blockchain.transaction.get", [TXID, true])).result;
console.log("blockhash:", tx.blockhash);
console.log("raw tx bytes:", tx.hex.length / 2);

// 2. Each of outputs 0-3: value, and whether it is still unspent.
for (let i = 0; i <= 3; i++) {
  const info = (await tryHosts("blockchain.utxo.get_info", [TXID, i])).result;
  console.log(`output ${i}:`, info); // present + a value => unspent; absent => spent
}

// 3. Count every raw-byte occurrence of the ARPB magic across the WHOLE
//    transaction, not just "does output N start with it" -- this is the
//    check that catches over-generalising from one output to fifteen.
const raw = Buffer.from(tx.hex, "hex");
const magic = Buffer.from("41525042", "hex");
const offsets = [];
for (let i = raw.indexOf(magic); i !== -1; i = raw.indexOf(magic, i + 1)) offsets.push(i);
console.log("ARPB occurrences in the whole tx:", offsets.length, "at byte offsets", offsets);
```

```sh
node verify-live-settlement.mjs
```

To parse input/output counts, fee, script lengths and the `ARPB` magic
yourself from the raw hex, decode standard Bitcoin transaction wire format
(4-byte version LE, `varint` input/output counts, 32-byte reversed prevout
txid + 4-byte LE index + `varint`-prefixed script + 4-byte LE sequence per
input, 8-byte LE value + `varint`-prefixed script per output, 4-byte LE
locktime) — no library needed, and doing it yourself is the point.

### What this establishes, and what it does not

It establishes that this specific transaction, with this specific byte
structure, is really on Chipnet, confirmed in the named block, independently
of this repository's own code. It does **not** establish APNT protocol
acceptance, wallet acceptance, or note spendability — those are separate
claims this repository never conflates with "the transaction is on chain."

## Standing non-claims

- Chipnet is a test network. No production privacy is claimed.
- The anonymity set behind this transaction is degenerate: one operator, a
  handful of notes. What is demonstrated is a property of the
  *construction*, not achieved anonymity.
- Private note-to-note transfer does not work and is not claimed anywhere in
  this repository.
- Notes created by this transaction are **not spendable** via the private
  aggregate path today; only their direct-exit branch is a live, working
  spend path (see [`docs/the-seal.md`](./the-seal.md)).
