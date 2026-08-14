//! SP1 guest for the V4 import-created-note relation — the seal-native,
//! exit-bound, descriptor-authenticated one.
//!
//! Deliberately a separate program from `../program` and `../program-v2`, not a
//! fourth arm added to either guest's dispatch. The V0/V1 guest's ELF digest and
//! program VKey are pinned trust anchors in `verifier/src/lib.rs` and
//! `verifier/src/v1.rs`, and the V2 guest carries its own pinned identity for
//! the same reason; adding a branch to either would move that program's ELF
//! digest and VKey and invalidate every proof artifact already issued under it.
//! A relation version is a new statement, so it gets a new program identity.
//!
//! The guest accepts only `APNTPIV4`. It does not fall back to `APNTPIV0`,
//! `APNTPIV1` or `APNTPIV2`, for the same reason the V2 guest refuses to fall
//! back to V1: an earlier envelope carries no descriptor-authentication material
//! and no exit-authority block, so V4's changed rules C and B could never run on
//! one, and silently accepting it would let a caller obtain a V4-identity proof
//! over strictly weaker semantics. The refusal is symmetric with the host
//! relation, whose `evaluate_complete_proving_input_bytes_v4` rejects a V2
//! envelope outright.
//!
//! Everything V4 inherits still runs in full — the frozen V0 semantic core,
//! V2's covenant-authentication and pre-commitment stage, and the recovery
//! cryptography — inside `evaluate_complete_proving_input_bytes_v4`, over the
//! bytes the `APNTPIV4` envelope carries. Any inherited verdict is forwarded as
//! an `APNTIRV4` rejection with its own stage and code rather than a panic: a
//! rejection is a statement the relation proves, not an error.

#![no_main]

sp1_zkvm::entrypoint!(main);

use apnt_import_created_note_rust_parity::evaluate_complete_proving_input_bytes_v4;

pub fn main() {
    let proving_input = sp1_zkvm::io::read_vec();
    let public_result = match proving_input.get(..8) {
        Some(b"APNTPIV4") => evaluate_complete_proving_input_bytes_v4(&proving_input),
        _ => panic!("unsupported APNT import-created-note V4 proving-input identity"),
    }
    .expect("canonical APNT import-created-note V4 proving input must evaluate");
    sp1_zkvm::io::commit_slice(&public_result);
}
