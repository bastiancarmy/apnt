//! SP1 guest for the V2 import-created-note relation.
//!
//! Deliberately a separate program from `../program`, not a third arm added to
//! that guest's dispatch. The V0/V1 guest's ELF digest and program VKey are
//! pinned trust anchors in `verifier/src/lib.rs` and `verifier/src/v1.rs`;
//! adding a branch there would move both and invalidate every V0/V1 proof
//! artifact. V2 is additive, so it gets its own program identity.
//!
//! The guest accepts only `APNTPIV2`. It does not fall back to `APNTPIV0` or
//! `APNTPIV1`: a V1 envelope carries no import-funding covenant body, so the
//! V2 pre-commitment stage could never run on one, and silently accepting it
//! would let a caller obtain a V2-identity proof over V1-only semantics. The
//! frozen V1 semantics still run in full — inside
//! `evaluate_complete_proving_input_bytes_v2`, over the `APNTPIV1` bytes the
//! V2 envelope carries verbatim — and any V1 verdict is forwarded as an
//! `APNTIRV2` rejection rather than a panic.

#![no_main]

sp1_zkvm::entrypoint!(main);

use apnt_import_created_note_rust_parity::evaluate_complete_proving_input_bytes_v2;

pub fn main() {
    let proving_input = sp1_zkvm::io::read_vec();
    let public_result = match proving_input.get(..8) {
        Some(b"APNTPIV2") => evaluate_complete_proving_input_bytes_v2(&proving_input),
        _ => panic!("unsupported APNT import-created-note V2 proving-input identity"),
    }
    .expect("canonical APNT import-created-note V2 proving input must evaluate");
    sp1_zkvm::io::commit_slice(&public_result);
}
