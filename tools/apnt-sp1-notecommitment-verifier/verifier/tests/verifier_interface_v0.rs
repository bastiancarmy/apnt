use apnt_sp1_notecommitment_verifier::{
    parse_and_verify, serialize_result, verify_request, FailureStatusV0, VerifyRequestV0,
    PROOF_FORMAT, PROOF_SYSTEM, RELATION_ID,
};
use std::{
    io::Write,
    process::{Command, Output, Stdio},
    sync::Mutex,
};

const VALID_REQUEST_JSON: &str = include_str!("../../fixtures/valid-request.json");
const MALFORMED_PROOF_REQUEST_JSON: &str =
    include_str!("../../fixtures/malformed-proof-request.json");

static REAL_VERIFIER_LOCK: Mutex<()> = Mutex::new(());

fn valid_request() -> VerifyRequestV0 {
    serde_json::from_str(VALID_REQUEST_JSON).expect("valid fixture request")
}

fn run_real(request: &VerifyRequestV0) -> apnt_sp1_notecommitment_verifier::CommandOutcomeV0 {
    let _guard = REAL_VERIFIER_LOCK.lock().expect("real verifier test lock");
    verify_request(request)
}

fn run_binary(input: &str) -> Output {
    let _guard = REAL_VERIFIER_LOCK
        .lock()
        .expect("binary verifier test lock");
    let mut child = Command::new(env!("CARGO_BIN_EXE_apnt-sp1-notecommitment-verify"))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("spawn verifier binary");
    child
        .stdin
        .take()
        .expect("binary stdin")
        .write_all(input.as_bytes())
        .expect("write verifier request");
    child.wait_with_output().expect("wait for verifier binary")
}

#[test]
fn valid_known_apnt_sp1_core_proof_verifies() {
    let outcome = run_real(&valid_request());
    assert_eq!(outcome.exit_code, 0);
    assert!(outcome.result.verified);
    assert_eq!(outcome.result.failure_status, None);
}

#[test]
fn verified_public_values_decode_to_exact_note_commitment32() {
    let request = valid_request();
    let outcome = run_real(&request);
    assert_eq!(
        outcome.result.verified_note_commitment32.as_deref(),
        Some(request.expected_note_commitment32.as_str())
    );
}

#[test]
fn altered_proof_fails_closed() {
    let mut request = valid_request();
    let mut proof = hex::decode(&request.proof_bytes).expect("fixture proof hex");
    let last = proof.last_mut().expect("non-empty proof");
    *last ^= 1;
    request.proof_bytes = hex::encode(proof);
    let outcome = run_real(&request);
    assert!(!outcome.result.verified);
    assert_eq!(
        outcome.result.failure_status,
        Some(FailureStatusV0::ProofRejected)
    );
}

#[test]
fn truncated_proof_is_malformed() {
    let mut request = valid_request();
    request.proof_bytes.truncate(request.proof_bytes.len() - 2);
    let outcome = verify_request(&request);
    assert_eq!(
        outcome.result.failure_status,
        Some(FailureStatusV0::ProofMalformed)
    );
}

#[test]
fn malformed_proof_encoding_is_rejected() {
    let outcome = parse_and_verify(MALFORMED_PROOF_REQUEST_JSON);
    assert_eq!(
        outcome.result.failure_status,
        Some(FailureStatusV0::ProofMalformed)
    );

    let mut request = valid_request();
    request.proof_bytes = "not-lowercase-hex".to_owned();
    let outcome = verify_request(&request);
    assert_eq!(
        outcome.result.failure_status,
        Some(FailureStatusV0::ProofMalformed)
    );
}

#[test]
fn missing_proof_or_public_values_and_malformed_public_values_fail_closed() {
    for missing in ["proofBytes", "publicValuesBytes"] {
        let mut value: serde_json::Value =
            serde_json::from_str(VALID_REQUEST_JSON).expect("fixture JSON");
        value
            .as_object_mut()
            .expect("request object")
            .remove(missing);
        let outcome = parse_and_verify(&serde_json::to_string(&value).expect("mutated JSON"));
        assert_eq!(
            outcome.result.failure_status,
            Some(FailureStatusV0::RequestInvalid)
        );
        assert_eq!(outcome.exit_code, 2);
    }

    let mut request = valid_request();
    request.public_values_bytes = "not-hex".to_owned();
    assert_eq!(
        verify_request(&request).result.failure_status,
        Some(FailureStatusV0::PublicValuesInvalid)
    );
}

#[test]
fn altered_public_values_are_cryptographically_rejected() {
    let mut request = valid_request();
    let mut public_values = hex::decode(&request.public_values_bytes).expect("public values hex");
    public_values[0] ^= 1;
    request.public_values_bytes = hex::encode(public_values);
    let outcome = run_real(&request);
    assert_eq!(
        outcome.result.failure_status,
        Some(FailureStatusV0::ProofRejected)
    );
}

#[test]
fn wrong_or_extra_public_values_length_is_invalid() {
    let mut short = valid_request();
    short.public_values_bytes.truncate(62);
    assert_eq!(
        verify_request(&short).result.failure_status,
        Some(FailureStatusV0::PublicValuesInvalid)
    );

    let mut extra = valid_request();
    extra.public_values_bytes.push_str("00");
    assert_eq!(
        verify_request(&extra).result.failure_status,
        Some(FailureStatusV0::PublicValuesInvalid)
    );
}

#[test]
fn wrong_expected_note_commitment_fails_after_valid_proof_verification() {
    let mut request = valid_request();
    request.expected_note_commitment32 = "00".repeat(32);
    let outcome = run_real(&request);
    assert_eq!(
        outcome.result.failure_status,
        Some(FailureStatusV0::NoteCommitmentMismatch)
    );
    assert_eq!(
        outcome.result.verified_note_commitment32.as_deref(),
        Some("f837b822d1eec361973cf2202a3e7c09308a7466bdf620c7891ba471a9237f70")
    );
}

#[test]
fn wrong_caller_reported_program_identity_fails_before_proof_verification() {
    let mut request = valid_request();
    request.program_vkey_hash = "00".repeat(32);
    let outcome = verify_request(&request);
    assert_eq!(
        outcome.result.failure_status,
        Some(FailureStatusV0::ProgramIdentityMismatch)
    );
    assert_ne!(outcome.result.program_vkey_hash, request.program_vkey_hash);
}

#[test]
fn proof_evidence_cannot_introduce_another_trusted_program() {
    let mut value: serde_json::Value =
        serde_json::from_str(VALID_REQUEST_JSON).expect("fixture JSON");
    value["trustedProgramVkeyHash"] = serde_json::Value::String("00".repeat(32));
    let outcome = parse_and_verify(&serde_json::to_string(&value).expect("mutated JSON"));
    assert_eq!(
        outcome.result.failure_status,
        Some(FailureStatusV0::RequestInvalid)
    );
    assert_eq!(outcome.exit_code, 2);
}

#[test]
fn unsupported_interface_version_relation_and_format_fail_closed() {
    let mut version = valid_request();
    version.version = 1;
    assert_eq!(
        verify_request(&version).result.failure_status,
        Some(FailureStatusV0::UnsupportedVersion)
    );

    let mut relation = valid_request();
    relation.relation_id = "another-relation".to_owned();
    assert_eq!(
        verify_request(&relation).result.failure_status,
        Some(FailureStatusV0::UnsupportedRelation)
    );

    let mut format = valid_request();
    format.proof_format = "sp1-compressed".to_owned();
    assert_eq!(
        verify_request(&format).result.failure_status,
        Some(FailureStatusV0::UnsupportedProofFormat)
    );

    let mut system = valid_request();
    system.proof_system = "mock".to_owned();
    assert_eq!(
        verify_request(&system).result.failure_status,
        Some(FailureStatusV0::UnsupportedProofFormat)
    );
}

#[test]
fn verifier_only_execution_requires_no_private_witness() {
    let value: serde_json::Value = serde_json::from_str(VALID_REQUEST_JSON).expect("fixture JSON");
    let keys = value
        .as_object()
        .expect("request object")
        .keys()
        .cloned()
        .collect::<Vec<_>>();
    assert_eq!(
        keys,
        [
            "expectedNoteCommitment32",
            "programVkeyHash",
            "proofBytes",
            "proofFormat",
            "proofSystem",
            "publicValuesBytes",
            "relationId",
            "version",
        ]
    );
    assert!(run_real(&valid_request()).result.verified);
}

#[test]
fn stdout_is_deterministic_machine_readable_json() {
    let output = run_binary(VALID_REQUEST_JSON);
    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).expect("UTF-8 stdout");
    let parsed: serde_json::Value = serde_json::from_str(stdout.trim()).expect("JSON stdout");
    assert_eq!(parsed["verified"], true);
    assert_eq!(parsed["relationId"], RELATION_ID);
    assert_eq!(parsed["proofSystem"], PROOF_SYSTEM);
    assert_eq!(parsed["proofFormat"], PROOF_FORMAT);
    assert_eq!(stdout.lines().count(), 1);
}

#[test]
fn diagnostics_do_not_corrupt_stdout() {
    let output = run_binary(MALFORMED_PROOF_REQUEST_JSON);
    assert!(output.status.success());
    let stdout = String::from_utf8(output.stdout).expect("UTF-8 stdout");
    let stderr = String::from_utf8(output.stderr).expect("UTF-8 stderr");
    let parsed: serde_json::Value = serde_json::from_str(stdout.trim()).expect("JSON stdout");
    assert_eq!(parsed["verified"], false);
    assert_eq!(parsed["failureStatus"], "proof-malformed");
    assert!(!stderr.trim().is_empty());
    assert!(!stdout.contains("malformed:"));
}

#[test]
fn malformed_json_exits_nonzero_with_machine_result() {
    let output = run_binary("{not-json}");
    assert_eq!(output.status.code(), Some(2));
    let parsed: serde_json::Value =
        serde_json::from_slice(&output.stdout).expect("machine-readable failure stdout");
    assert_eq!(parsed["failureStatus"], "request-invalid");
}

#[test]
fn repeated_verification_returns_identical_normalized_result() {
    let request = valid_request();
    let _guard = REAL_VERIFIER_LOCK.lock().expect("real verifier test lock");
    let first = verify_request(&request);
    let second = verify_request(&request);
    assert_eq!(first.result, second.result);
    assert_eq!(
        serialize_result(&first.result).expect("first JSON"),
        serialize_result(&second.result).expect("second JSON")
    );
}
