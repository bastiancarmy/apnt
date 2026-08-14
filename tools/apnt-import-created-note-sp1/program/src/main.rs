#![no_main]

sp1_zkvm::entrypoint!(main);

use apnt_import_created_note_rust_parity::{
    evaluate_complete_proving_input_bytes_v0, evaluate_complete_proving_input_bytes_v1,
};

pub fn main() {
    let proving_input = sp1_zkvm::io::read_vec();
    let public_result = match proving_input.get(..8) {
        Some(b"APNTPIV0") => evaluate_complete_proving_input_bytes_v0(&proving_input),
        Some(b"APNTPIV1") => evaluate_complete_proving_input_bytes_v1(&proving_input),
        _ => panic!("unsupported APNT import-created-note proving-input identity"),
    }
    .expect("canonical APNT import-created-note proving input must evaluate");
    sp1_zkvm::io::commit_slice(&public_result);
}
