#![no_main]

sp1_zkvm::entrypoint!(main);

use apnt_private_note_transition_rust_parity::evaluate_proving_input_bytes_v0;

pub fn main() {
    let proving_input = sp1_zkvm::io::read_vec();
    let public_result = evaluate_proving_input_bytes_v0(&proving_input)
        .expect("canonical APNT private-note-transition proving input must evaluate");
    sp1_zkvm::io::commit_slice(&public_result);
}
