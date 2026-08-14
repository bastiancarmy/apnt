# Canonical guest identities — CANDIDATES, NOT PINS

> **Nothing in this file is a pin.** No pin was changed by the work that
> produced it, and adopting any of these values is a separate, coordinated
> migration. These are the figures the canonical environment produces today, at
> commit `cbb8d38`, recorded so that migration has measured numbers to start
> from instead of a rebuild.

Produced by `tools/sp1-canonical-guest-build/canonical-guest-build.sh` against image
`ghcr.io/succinctlabs/sp1@sha256:0942a27dbe8e38f4b14f3732e779df4027b17bde93e9fbc9e8c773c15eb63400`
(rustc reports `1.94.0-dev` inside the container). VKeys measured with
`vkey-probe`, i.e. SP1 `setup()`; **no proof was constructed**.

## Candidate canonical identities

Byte-identical from all four host checkout paths (lengths 14, 41, 67, 83).

| guest | package | ELF SHA-256 | bytes | program VKey |
|---|---|---|---:|---|
| transition | `apnt-private-note-transition-sp1-program` | `95813b85b477ce4d255f1873054ef78f569e0f2ba4fe6b49624488940c10ad85` | 988,864 | `00b0606b1c72b14000077df6dca04aca2bff621b278f3a1cf3f1fc9db9092703` |
| import v1 | `apnt-import-created-note-sp1-program` | `5b69827ee4b98750a08a82f1f8df3e68f5affe7779a18c63a6d332c135c32e60` | 839,464 | `00c29abe2beca52d704f14c4970ec0954dc990f67da7ab02c57f8d72e247c7b6` |
| import v2 | `apnt-import-created-note-sp1-program-v2` | `639eba68de7949f9f9fdfb062e744b7b45ad76c826da000ce725975b6af1ed14` | 854,800 | `00c2ce4d99e669118c948fcc5bfac9460320947c8445bdfe8503815417bd7433` |
| import v4 | `apnt-import-created-note-sp1-program-v4` | `03c806fa0792d35bb5128c63ffb38cf1f1ad0de3290ad3e52a949547d6150578` | 1,099,096 | `00aed772526653a6b7be42fc7462f916095f7f1f074111e7b1a18491d14d596c` |

## Current pins, for contrast (unchanged, and left unchanged)

| guest | pinned ELF SHA-256 | pinned bytes | pinned program VKey |
|---|---|---:|---|
| transition | `b852785f667f686c902c4f622c113aa05ade8aaceca273de24132c0edd55df9c` | 986,496 | `002e374da3dc5e898b30efd70baf166ab5633c95c3b80009e0b563b3c428a65c` |
| import v1 | `35c70d92cc8df225929084f80ae81e0357ccef86a31a8e0c9d30f9f0b82222fa` | 832,416 | `00004f2f4d013b69cc540d9bcacb0098da0d3ad91a39cec414751a3804ff3ae1` |
| import v2 | `65c8ff081baaaac48d3f3c27f52180f67e0606a270ae15b0ac4c2e9ec6abdf54` | 845,528 | `008ffe9d6dabf30e7c7c1731db0222acdccf1f3d560c025698dec9092dfad998` |
| import v4 | `97d6ada8066ba09ef2ef8a50653ac38340a143da0c70cb508c04a7362b2fa355` | 1,099,664 | `007de2035d65f1dd58a3cf0c930fde5c7c7c99443b26fc30c2cd7f26014a74b1` |

Every candidate differs from its pin. That is expected and is **not** evidence a
pin is wrong: the container's `rustc`, its `CARGO_HOME` layout and its
in-container paths are all different from any local build, so the canonical
environment necessarily produces a different program.

## What a re-pin would have to reckon with — read before adopting anything

1. **The verifier-side pins are bound to already-produced Groth16 artifacts.**
   `apnt-private-note-transition-sp1/verifier/src/lib.rs`,
   `apnt-import-created-note-sp1/verifier/src/{lib,v1,v2}.rs` each pin an ELF
   digest and VKey *alongside* a `TRUSTED_ARTIFACT_JSON` committed proof.
   Re-pointing those constants at a new guest without regenerating the artifact
   would leave a verifier asserting a program identity its committed artifact
   was never proven against. Prover-side and verifier-side pins are not
   interchangeable edits.

2. **The import verifier's v0 anchor is not covered here.**
   `apnt-import-created-note-sp1/verifier/src/lib.rs` pins ELF
   `2937a9c5d4fc272672ec92dc7b3787a8eb00fd93baba999b02d71f87230cc3cb` /
   VKey `00a227a5c3dcb8b396c65af5b7a1246117356775a978415ddf5106b8e7e3510f`,
   which does not correspond to any of the four program directories built here.
   No candidate is offered for it.

3. **Adopting these makes the container a hard dependency of the pins.** A pin
   derived in the canonical environment is only reachable *in* the canonical
   environment. Any machine without Docker, or with a different image digest,
   can no longer reproduce a pinned guest at all. That is a real trade: today a
   pin is reproducible anywhere at exactly one path; afterwards it is
   reproducible at any path on any machine that can run one specific image.

## Separately observed, outside the scope of this work — not acted on

While checking whether guest ELFs embed path strings, the **pre-existing local
(non-canonical) build artifacts in the main checkout** were read. They were
built at 18:27–18:28 on 2026-08-10, ~30 minutes before this work started, by
some other process; they were not produced or modified here.

| guest | local artifact in main checkout | bytes | matches its pin? |
|---|---|---:|---|
| import v1 | `25c28967ae0951db3b72b556650092ae59011f35f867f711074fa139a1c10699` | 839,984 | **no** (pin 832,416) |
| import v2 | `f8939e7b90c57b64f22cf492eda755aac52e294d669271d17460a595ceb59ab3` | 855,280 | **no** (pin 845,528) |
| import v4 | `97d6ada8066ba09ef2ef8a50653ac38340a143da0c70cb508c04a7362b2fa355` | 1,099,664 | **yes, exactly** |
| transition | `d24ea050f4bf468c904b13a92361e8451030d93ada4db3a4561b0308d6974210` | 989,448 | **no** (pin 986,496) |

Two things make this hard to dismiss as the known path effect:

* **It is not source drift.** The canonical build run *from the main checkout's
  working tree* produced ELFs byte-identical to those from a pristine `cbb8d38`
  export, so the guest and parity sources in that working tree match `cbb8d38`.
* **It is not the path.** Path-length effects on this guest measure in the
  hundreds of bytes (272 bytes across a 69-character path spread). The import-v1
  gap is 7,568 bytes, and all three gaps are in the same direction (the current
  build is *larger* than its pin) — the signature of a dependency or toolchain
  change since those pins were taken, not of relocation. The v4 pin, taken most
  recently, still matches exactly at the same path with the same toolchain.

This is reported, not diagnosed and not fixed. Confirming it needs the main
checkout's git state, which was deliberately not touched.
