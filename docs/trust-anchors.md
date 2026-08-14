# Trust anchors: the pins, and the caveat they carry

A proof artifact in this repository is only meaningful if it is bound to a
specific program: a specific guest ELF, compiled to specific bytes, with a
specific SP1 program verifying key. Every `**/trusted/*.json` descriptor below
pins exactly that identity for one relation. This document publishes the
pins **and** the honest limits on how they were produced — the limits are
not an appendix, they are load-bearing for how much you should trust them.

## The pins

| relation | program VKey | guest ELF SHA-256 | ELF bytes | source |
| --- | --- | --- | --- | --- |
| private-note-transition v0 | `002e374da3dc5e898b30efd70baf166ab5633c95c3b80009e0b563b3c428a65c` | `b852785f667f686c902c4f622c113aa05ade8aaceca273de24132c0edd55df9c` | 986,496 | [`tools/apnt-private-note-transition-sp1/trusted/private-note-transition-groth16-verifier-v0.json`](../tools/apnt-private-note-transition-sp1/trusted/private-note-transition-groth16-verifier-v0.json) |
| import-created-note v0 | `00a227a5c3dcb8b396c65af5b7a1246117356775a978415ddf5106b8e7e3510f` | `2937a9c5d4fc272672ec92dc7b3787a8eb00fd93baba999b02d71f87230cc3cb` | 718,552 | [`tools/apnt-import-created-note-sp1/trusted/import-created-note-groth16-verifier-v0.json`](../tools/apnt-import-created-note-sp1/trusted/import-created-note-groth16-verifier-v0.json) |
| import-created-note v1 | `00004f2f4d013b69cc540d9bcacb0098da0d3ad91a39cec414751a3804ff3ae1` | `35c70d92cc8df225929084f80ae81e0357ccef86a31a8e0c9d30f9f0b82222fa` | 832,416 | [`tools/apnt-import-created-note-sp1/trusted/import-created-note-groth16-verifier-v1.json`](../tools/apnt-import-created-note-sp1/trusted/import-created-note-groth16-verifier-v1.json) |
| import-created-note v2 | `008ffe9d6dabf30e7c7c1731db0222acdccf1f3d560c025698dec9092dfad998` | `65c8ff081baaaac48d3f3c27f52180f67e0606a270ae15b0ac4c2e9ec6abdf54` | 845,528 | [`tools/apnt-import-created-note-sp1/trusted/import-created-note-groth16-verifier-v2.json`](../tools/apnt-import-created-note-sp1/trusted/import-created-note-groth16-verifier-v2.json) |
| import-created-note v4 | *no trust-anchor descriptor is staged in this export* | *self-reported by the fixture only* | | see below |

The first four are read directly from their trusted/*.json descriptors and
independently re-checked against each other above (the v1 and v2 rows were
re-read from their descriptor files while writing this document, not copied
from a summary table elsewhere).

**v4 has no trust anchor in this export.** A v4 proof fixture ships
([`tools/apnt-import-created-note-sp1/fixtures/canonical-groth16-proof-v4.json`](../tools/apnt-import-created-note-sp1/fixtures/canonical-groth16-proof-v4.json))
and it carries a self-reported identity —
`programVkeyHash: 007de2035d65f1dd58a3cf0c930fde5c7c7c99443b26fc30c2cd7f26014a74b1`,
`guestElfSha256: 97d6ada8066ba09ef2ef8a50653ac38340a143da0c70cb508c04a7362b2fa355`,
1,099,664 bytes — but no
`tools/apnt-import-created-note-sp1/trusted/import-created-note-groth16-verifier-v4.json`
descriptor exists to check it against. **That is not independent
confirmation of anything; it is the artifact asserting its own identity.**
Treat v4 as unconfirmable against a separate anchor until one is staged.
This is the relation behind the live import in
[`docs/live-settlement-evidence.md`](./live-settlement-evidence.md), which is
exactly why the gap is worth naming rather than glossing over.

## The caveat: what a pin actually is here, and where the transition pin came from

`tools/sp1-canonical-guest-build/CANDIDATES.md` titles itself, deliberately,
**"CANDIDATES, NOT PINS."** Its opening line: *"Nothing in this file is a
pin. No pin was changed by the work that produced it, and adopting any of
these values is a separate, coordinated migration."*

And a plainer fact, worth stating without softening: **no pin currently in
force was container-derived.** Every ELF digest and VKey in the table above
was built the ordinary way — `cargo prove build` against whatever checkout
path happened to be in use at the time. That matters because a guest ELF
built the ordinary way is a function of the absolute path of the checkout it
was built in: its SHA-256, its byte length and its derived program VKey all
move when the checkout moves, through two independent, separately measured
mechanisms (Cargo's `-Cmetadata` crate disambiguator hashing an absolute
path when a dependency lies outside the Cargo workspace root, and literal
absolute path strings — panic locations, home-Cargo-directory paths (e.g.
under a user's `.cargo` folder) — embedded in the compiled ELF).

Concretely: **the transition pin above, `b852785f…` / 986,496 bytes, was
built inside a git worktree** — the exact failure mode this repository's own
operating rules forbid for anything meant to be pinned, compared, or
trusted, because that value is unreachable from the main checkout. It was
not caught before it was pinned. It is not being re-pinned here either —
replacing a pin is a coordinated migration with its own consequences (see
below), not a documentation fix.

## What now exists to fix this, dated

As of **2026-08-10**, `tools/sp1-canonical-guest-build/` builds each guest
inside a container pinned by immutable image digest — the OCI reference
*ghcr.io/succinctlabs/sp1@sha256:0942a27d…* (not a repository path) — with
the repository root
mounted at a fixed in-container path, removing the host checkout path from
every input that feeds either leak mechanism. This was verified, not just
built: the same commit (`cbb8d38`), built through the container from four
host checkout paths of four different lengths (14 to 83 characters),
produced **byte-identical ELFs and identical VKeys** for all four guests —
with same-path and cross-path wipe-and-rebuild controls (145+ crates
recompiled each time, not artifact reuse), a negative control showing the
same two paths *without* the container disagree in digest, length and VKey,
and a control confirming a nonexistent image digest makes the build fail
rather than silently falling back to a mutable tag.

**This is the mechanism that now exists, not a claim that today's pins were
produced by it.** `tools/sp1-canonical-guest-build/CANDIDATES.md` records what the canonical environment
produces today for contrast against each current pin — every candidate
differs from its pin, which the document itself notes is expected (the
container's `rustc`, `CARGO_HOME` layout and in-container paths all differ
from any local build) and is not by itself evidence any pin is wrong.

## What adopting a canonical pin would actually require

Re-pointing a pin at a canonical-build identity is not a find-and-replace,
for two measured reasons `tools/sp1-canonical-guest-build/CANDIDATES.md` records:

1. **Verifier-side pins are bound to already-produced Groth16 artifacts.**
   Each verifier crate pins an ELF digest and VKey *alongside* a committed
   `TRUSTED_ARTIFACT_JSON` proof. Re-pointing the constant without
   regenerating the artifact would leave a verifier asserting a program
   identity its committed proof was never proven against.
2. **Adopting a canonical pin makes the container a hard dependency of that
   pin.** A pin derived in the canonical environment is only reproducible
   *inside* that environment — any machine without Docker, or with a
   different image digest, can no longer reproduce it at all. Today's pins
   are reproducible anywhere, at exactly one path; canonical pins would be
   reproducible anywhere, on any machine that can run one specific image.
   That is a real trade, not a strict improvement.

Separately observed while doing this work, and reported rather than
diagnosed: local (non-canonical) guest builds in the main checkout, built by
some other process shortly before this work started, mismatched their own
pins by more than a path-length effect could explain (thousands of bytes,
all in the same direction) for three of the four guests. The fourth (import
v4) matched its pin exactly. This is recorded as an open finding, not
resolved here.

## Credits

The CashVM Groth16 verification lane this repository's trust anchors
ultimately feed into builds on work by **`mr-zwets`**: `groth16_cashscript`,
the `cashscript` compiler-optimizations fork, and `zk-verifier-bench`. Pinned
commits and licences are in [`THIRD-PARTY-NOTICES.md`](../THIRD-PARTY-NOTICES.md). The CashScript compiler
itself is MIT, © 2019 Rosco Kalis. No upstream bytes are redistributed in
this repository; it publishes pins and a reproduction path instead.

Separately, **verifier.cash**'s BN254-on-CashVM benchmark and leaderboard
work directly informed this repository's own verifier evaluation, and is
credited here by name for that contribution.

## Standing non-claims

- A pin confirms a fixture was generated against the identity it claims —
  it does not confirm that identity is a *correct* implementation of the
  relation the spec describes. Auditing that is a source-reading exercise,
  not something a digest comparison can establish.
- Chipnet only; no production privacy is claimed.
- The anonymity set behind any live artifact these pins secure is
  degenerate — one operator, a handful of notes.
- Private note-to-note transfer does not work and is not claimed. Notes
  created today are not spendable via the private aggregate path; only the
  direct-exit branch is a live, working spend path.
