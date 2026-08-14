#!/usr/bin/env bash
#
# canonical-guest-build.sh — the ONE sanctioned way to build a pinnable SP1
# guest ELF for this repository.
#
# WHY THIS EXISTS
# ---------------
# A guest ELF built the ordinary way is a function of the absolute path of the
# checkout it was built in. Two separate mechanisms cause that, and both are
# measured, not assumed (see README.md for the experiment and its controls):
#
#   1. Cargo's `-Cmetadata` (the crate disambiguator). Cargo normally strips the
#      workspace prefix from a path dependency so the hash is relocatable. When
#      the dependency lies OUTSIDE the Cargo workspace root that `strip_prefix`
#      fails and Cargo falls back to hashing the ABSOLUTE path. Both SP1
#      workspaces here are rooted at `tools/…-sp1` while their parity crates are
#      sibling directories at `tools/…-rust-parity` — outside the root. So every
#      disambiguator, and transitively every downstream crate's disambiguator,
#      moves when the checkout moves.
#
#   2. Literal path strings in the ELF. The guest ELFs carry the absolute source
#      paths of the out-of-workspace parity crates (panic-location strings), plus
#      absolute `~/.cargo/registry` and `~/.sp1/toolchains` paths. Those strings
#      change LENGTH with the path, which is why byte length moves too.
#
# `--remap-path-prefix` fixes NEITHER. It cannot rewrite a `-Cmetadata` value
# Cargo already computed (measured: identical metadata with and without it), and
# it never reaches the build anyway because `sp1-build` SETS rather than appends
# `CARGO_ENCODED_RUSTFLAGS`, so ambient `RUSTFLAGS` is discarded.
#
# WHAT THIS DOES INSTEAD
# ----------------------
# It builds inside a digest-pinned container where the checkout is bind-mounted
# at a FIXED path, `/root/program`. Every absolute path that feeds either
# mechanism — the workspace root, the out-of-workspace parity crates, the cargo
# registry, the toolchain — becomes the same string no matter where the host
# checkout lives. The host path stops being an input.
#
# The `--workspace-directory` must be the REPO ROOT, not the SP1 workspace root.
# `sp1-build` mounts exactly that one directory; pointing it at `tools/…-sp1`
# would leave the sibling parity crates outside the mount and the build would
# fail to resolve them.
#
# WHAT WOULD BREAK IT
# -------------------
#   * Changing SP1_CANONICAL_IMAGE_DIGEST. The image carries the rustc that
#     compiles the guest; a different image is a different program.
#   * Passing a different --workspace-directory, or moving either SP1 workspace
#     or either parity crate to a different depth under the repo root. The
#     in-container path is derived from the path relative to the repo root, so
#     the RELATIVE layout is now load-bearing even though the absolute one is
#     not.
#   * Dropping `--locked`, which would let dependency resolution drift.
#   * Activating a Cargo feature. Cargo mixes enabled features into the same
#     `-Cmetadata` hash, so a feature change moves every disambiguator.
#   * Renaming the repo-root directory itself does NOT break it — that is the
#     whole point — but renaming `tools/…` does.
#
# USAGE
#   canonical-guest-build.sh <checkout-root> <guest-key> <output-dir>
#
#   guest-key ∈ transition | transition-v1 | import-v1 | import-v2 | import-v4
#
set -euo pipefail

# ── The canonical environment. Pinned by immutable digest, never by a mutable
# ── tag: `v6.3.1` can be repointed at new bytes, `@sha256:…` cannot.
SP1_CANONICAL_IMAGE_DIGEST="sha256:0942a27dbe8e38f4b14f3732e779df4027b17bde93e9fbc9e8c773c15eb63400"
SP1_CANONICAL_IMAGE="ghcr.io/succinctlabs/sp1@${SP1_CANONICAL_IMAGE_DIGEST}"

usage() {
  echo "usage: $0 <checkout-root> <guest-key> <output-dir>" >&2
  echo "  guest-key ∈ transition | transition-v1 | import-v1 | import-v2 | import-v4" >&2
  exit 2
}

[ "$#" -eq 3 ] || usage
CHECKOUT_ROOT="$1"
GUEST_KEY="$2"
OUT_DIR="$3"

# ── Guest table: workspace, program directory, cargo package. The bin target
# ── name equals the package name for every guest (each is a `src/main.rs` crate).
case "$GUEST_KEY" in
  transition)
    SP1_WS="tools/apnt-private-note-transition-sp1"
    PROGRAM_SUBDIR="program"
    PACKAGE="apnt-private-note-transition-sp1-program"
    ;;
  transition-v1)
    SP1_WS="tools/apnt-private-note-transition-v1-sp1"
    PROGRAM_SUBDIR="program"
    PACKAGE="apnt-private-note-transition-v1-sp1-program"
    ;;
  import-v1)
    SP1_WS="tools/apnt-import-created-note-sp1"
    PROGRAM_SUBDIR="program"
    PACKAGE="apnt-import-created-note-sp1-program"
    ;;
  import-v2)
    SP1_WS="tools/apnt-import-created-note-sp1"
    PROGRAM_SUBDIR="program-v2"
    PACKAGE="apnt-import-created-note-sp1-program-v2"
    ;;
  import-v4)
    SP1_WS="tools/apnt-import-created-note-sp1"
    PROGRAM_SUBDIR="program-v4"
    PACKAGE="apnt-import-created-note-sp1-program-v4"
    ;;
  *) usage ;;
esac

# `sp1-build` canonicalizes both the workspace directory and the program
# directory and then requires one to be a prefix of the other. A checkout
# reached through a symlink (notably anything under macOS `/tmp`, which is a
# symlink to `/private/tmp`) makes that prefix test fail. Canonicalize here so
# the failure is a clear message rather than sp1-build's bare `exit 1`.
CHECKOUT_ROOT="$(cd "$CHECKOUT_ROOT" && pwd -P)"
PROGRAM_DIR="$CHECKOUT_ROOT/$SP1_WS/$PROGRAM_SUBDIR"
[ -d "$PROGRAM_DIR" ] || { echo "no such program directory: $PROGRAM_DIR" >&2; exit 1; }

mkdir -p "$OUT_DIR"
OUT_DIR="$(cd "$OUT_DIR" && pwd -P)"

export PATH="$HOME/.sp1/bin:$PATH"
export SP1_DOCKER_IMAGE="$SP1_CANONICAL_IMAGE"

echo "── canonical guest build ────────────────────────────────────────────"
echo "  guest          : $GUEST_KEY ($PACKAGE)"
echo "  checkout root  : $CHECKOUT_ROOT  (host path length ${#CHECKOUT_ROOT})"
echo "  mounted at     : /root/program   (fixed, in-container)"
echo "  image          : $SP1_CANONICAL_IMAGE"
echo "  output         : $OUT_DIR/$PACKAGE"
echo "─────────────────────────────────────────────────────────────────────"

cd "$PROGRAM_DIR"
cargo prove build \
  --docker \
  --locked \
  --workspace-directory "$CHECKOUT_ROOT" \
  -p "$PACKAGE" \
  --output-directory "$OUT_DIR" \
  --elf-name "$PACKAGE"

echo
echo "built: $OUT_DIR/$PACKAGE"
shasum -a 256 "$OUT_DIR/$PACKAGE"
wc -c < "$OUT_DIR/$PACKAGE" | tr -d ' ' | sed 's/^/bytes: /'
