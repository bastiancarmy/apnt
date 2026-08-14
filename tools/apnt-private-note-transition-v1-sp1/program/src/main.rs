#![no_main]

sp1_zkvm::entrypoint!(main);

use apnt_private_note_transition_v1_rust_parity::evaluate_proving_input_bytes_v1;

pub fn main() {
    let proving_input = sp1_zkvm::io::read_vec();
    let public_result = evaluate_proving_input_bytes_v1(&proving_input)
        .expect("canonical APNTPTI1 private-note-transition proving input must evaluate");
    sp1_zkvm::io::commit_slice(&public_result);
}
