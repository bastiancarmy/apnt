use apnt_sp1_notecommitment_verifier::{parse_and_verify, serialize_result};
use std::io::{self, Read};

const MAX_REQUEST_BYTES: u64 = 520 * 1024 * 1024;

fn main() {
    let mut request = String::new();
    let read_result = io::stdin()
        .lock()
        .take(MAX_REQUEST_BYTES + 1)
        .read_to_string(&mut request);
    if let Err(error) = read_result {
        eprintln!("request-invalid: failed to read UTF-8 request: {error}");
        std::process::exit(2);
    }
    if request.len() as u64 > MAX_REQUEST_BYTES {
        eprintln!("request-invalid: request exceeds verifier input limit");
        std::process::exit(2);
    }

    let outcome = parse_and_verify(&request);
    match serialize_result(&outcome.result) {
        Ok(json) => println!("{json}"),
        Err(error) => {
            eprintln!("verifier-execution-failed: failed to serialize result: {error}");
            std::process::exit(3);
        }
    }
    if let Some(diagnostic) = outcome.diagnostic {
        eprintln!("{diagnostic}");
    }
    if outcome.exit_code != 0 {
        std::process::exit(outcome.exit_code);
    }
}
