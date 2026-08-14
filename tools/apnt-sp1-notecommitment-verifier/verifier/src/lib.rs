use bincode::Options;
use serde::{Deserialize, Serialize};
use sp1_sdk::{
    blocking::{Prover, ProverClient},
    HashableKey, SP1Proof, SP1ProofWithPublicValues, SP1PublicValues, SP1VerifyingKey,
    SP1_CIRCUIT_VERSION,
};
use std::{
    panic::{catch_unwind, AssertUnwindSafe},
    sync::OnceLock,
};

pub const INTERFACE_VERSION: u32 = 0;
pub const PROOF_SYSTEM: &str = "sp1";
pub const PROOF_FORMAT: &str = "sp1-core-bincode-v1";
pub const RELATION_ID: &str = "apnt-note-commitment-preimage-v0";
pub const PUBLIC_VALUES_LENGTH: usize = 32;

const MAX_PROOF_BYTES: u64 = 256 * 1024 * 1024;
const TRUSTED_PROGRAM_CONFIG_JSON: &str =
    include_str!("../../trusted/apnt-note-commitment-preimage-v0.json");
const TRUSTED_PROGRAM_VKEY_BYTES: &[u8] =
    include_bytes!("../../trusted/apnt-note-commitment-preimage-v0.sp1-vkey.bin");

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct VerifyRequestV0 {
    pub version: u32,
    pub proof_system: String,
    pub proof_format: String,
    pub relation_id: String,
    pub program_vkey_hash: String,
    pub expected_note_commitment32: String,
    pub proof_bytes: String,
    pub public_values_bytes: String,
}

#[derive(Clone, Copy, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum FailureStatusV0 {
    RequestInvalid,
    UnsupportedVersion,
    UnsupportedRelation,
    UnsupportedProofFormat,
    ProgramIdentityMismatch,
    ProofMalformed,
    ProofRejected,
    PublicValuesInvalid,
    NoteCommitmentMismatch,
    VerifierExecutionFailed,
}

#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct VerifyResultV0 {
    pub version: u32,
    pub verified: bool,
    pub relation_id: &'static str,
    pub proof_system: &'static str,
    pub proof_format: &'static str,
    pub program_vkey_hash: String,
    pub verified_note_commitment32: Option<String>,
    pub failure_status: Option<FailureStatusV0>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CommandOutcomeV0 {
    pub result: VerifyResultV0,
    pub diagnostic: Option<String>,
    pub exit_code: i32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TrustedProgramConfigV0 {
    version: u32,
    relation_id: String,
    proof_system: String,
    proof_format: String,
    sp1_version: String,
    program_vkey_hash: String,
    public_values_layout: String,
}

struct TrustedProgramV0 {
    config: TrustedProgramConfigV0,
    vkey: SP1VerifyingKey,
}

static TRUSTED_PROGRAM: OnceLock<Result<TrustedProgramV0, String>> = OnceLock::new();
static VERIFIER: OnceLock<sp1_sdk::blocking::LightProver> = OnceLock::new();

fn proof_options() -> impl Options {
    bincode::DefaultOptions::new()
        .with_fixint_encoding()
        .with_limit(MAX_PROOF_BYTES)
        .reject_trailing_bytes()
}

fn trusted_program() -> Result<&'static TrustedProgramV0, String> {
    TRUSTED_PROGRAM
        .get_or_init(|| {
            let config: TrustedProgramConfigV0 = serde_json::from_str(TRUSTED_PROGRAM_CONFIG_JSON)
                .map_err(|error| format!("tracked trusted-program config is invalid: {error}"))?;
            if config.version != INTERFACE_VERSION
                || config.relation_id != RELATION_ID
                || config.proof_system != PROOF_SYSTEM
                || config.proof_format != PROOF_FORMAT
                || config.sp1_version != SP1_CIRCUIT_VERSION
                || config.public_values_layout != "raw-noteCommitment32-be-32"
                || !is_lower_hex_exact(&config.program_vkey_hash, 32)
            {
                return Err("tracked trusted-program config does not match verifier v0".to_owned());
            }

            let vkey: SP1VerifyingKey = bincode::DefaultOptions::new()
                .with_fixint_encoding()
                .with_limit(16 * 1024 * 1024)
                .reject_trailing_bytes()
                .deserialize(TRUSTED_PROGRAM_VKEY_BYTES)
                .map_err(|error| format!("tracked SP1 verifying key is malformed: {error}"))?;
            let derived_hash = strip_hex_prefix(&vkey.bytes32())?.to_owned();
            if derived_hash != config.program_vkey_hash {
                return Err("tracked SP1 verifying key hash does not match config".to_owned());
            }
            Ok(TrustedProgramV0 { config, vkey })
        })
        .as_ref()
        .map_err(Clone::clone)
}

fn strip_hex_prefix(value: &str) -> Result<&str, String> {
    value
        .strip_prefix("0x")
        .ok_or_else(|| "SP1 vkey hash is missing its 0x prefix".to_owned())
}

fn is_lower_hex_exact(value: &str, byte_length: usize) -> bool {
    value.len() == byte_length * 2
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

fn decode_lower_hex(
    value: &str,
    byte_length: Option<usize>,
    status: FailureStatusV0,
) -> Result<Vec<u8>, FailureStatusV0> {
    if value.is_empty()
        || value.len() % 2 != 0
        || byte_length.is_some_and(|length| value.len() != length * 2)
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    {
        return Err(status);
    }
    hex::decode(value).map_err(|_| status)
}

fn base_result(program_vkey_hash: String) -> VerifyResultV0 {
    VerifyResultV0 {
        version: INTERFACE_VERSION,
        verified: false,
        relation_id: RELATION_ID,
        proof_system: PROOF_SYSTEM,
        proof_format: PROOF_FORMAT,
        program_vkey_hash,
        verified_note_commitment32: None,
        failure_status: None,
    }
}

fn rejected(
    program_vkey_hash: String,
    status: FailureStatusV0,
    verified_note_commitment32: Option<String>,
    diagnostic: impl Into<String>,
    exit_code: i32,
) -> CommandOutcomeV0 {
    let mut result = base_result(program_vkey_hash);
    result.failure_status = Some(status);
    result.verified_note_commitment32 = verified_note_commitment32;
    CommandOutcomeV0 {
        result,
        diagnostic: Some(diagnostic.into()),
        exit_code,
    }
}

fn configured_hash_or_zero() -> String {
    trusted_program()
        .map(|program| program.config.program_vkey_hash.clone())
        .unwrap_or_else(|_| "0".repeat(64))
}

pub fn parse_and_verify(request_json: &str) -> CommandOutcomeV0 {
    let request: VerifyRequestV0 = match serde_json::from_str(request_json) {
        Ok(request) => request,
        Err(error) => {
            return rejected(
                configured_hash_or_zero(),
                FailureStatusV0::RequestInvalid,
                None,
                format!("request JSON is invalid: {error}"),
                2,
            );
        }
    };
    verify_request(&request)
}

pub fn verify_request(request: &VerifyRequestV0) -> CommandOutcomeV0 {
    let trusted = match trusted_program() {
        Ok(trusted) => trusted,
        Err(error) => {
            return rejected(
                "0".repeat(64),
                FailureStatusV0::VerifierExecutionFailed,
                None,
                error,
                3,
            );
        }
    };
    let trusted_hash = trusted.config.program_vkey_hash.clone();

    if request.version != INTERFACE_VERSION {
        return rejected(
            trusted_hash,
            FailureStatusV0::UnsupportedVersion,
            None,
            "unsupported verifier interface version",
            0,
        );
    }
    if request.relation_id != RELATION_ID {
        return rejected(
            trusted_hash,
            FailureStatusV0::UnsupportedRelation,
            None,
            "unsupported APNT relation",
            0,
        );
    }
    if request.proof_system != PROOF_SYSTEM || request.proof_format != PROOF_FORMAT {
        return rejected(
            trusted_hash,
            FailureStatusV0::UnsupportedProofFormat,
            None,
            "unsupported proof system or proof format",
            0,
        );
    }
    if !is_lower_hex_exact(&request.program_vkey_hash, 32) {
        return rejected(
            trusted_hash,
            FailureStatusV0::RequestInvalid,
            None,
            "programVkeyHash must be exactly 32 lowercase hexadecimal bytes",
            2,
        );
    }
    if request.program_vkey_hash != trusted.config.program_vkey_hash {
        return rejected(
            trusted_hash,
            FailureStatusV0::ProgramIdentityMismatch,
            None,
            "caller-reported program identity does not match tracked trusted identity",
            0,
        );
    }
    if !is_lower_hex_exact(&request.expected_note_commitment32, 32) {
        return rejected(
            trusted_hash,
            FailureStatusV0::RequestInvalid,
            None,
            "expectedNoteCommitment32 must be exactly 32 lowercase hexadecimal bytes",
            2,
        );
    }

    let public_values = match decode_lower_hex(
        &request.public_values_bytes,
        Some(PUBLIC_VALUES_LENGTH),
        FailureStatusV0::PublicValuesInvalid,
    ) {
        Ok(bytes) => bytes,
        Err(status) => {
            return rejected(
                trusted_hash,
                status,
                None,
                "publicValuesBytes must encode exactly one raw 32-byte noteCommitment32",
                0,
            );
        }
    };
    let verified_commitment = hex::encode(&public_values);

    let proof_bytes =
        match decode_lower_hex(&request.proof_bytes, None, FailureStatusV0::ProofMalformed) {
            Ok(bytes) => bytes,
            Err(status) => {
                return rejected(
                    trusted_hash,
                    status,
                    Some(verified_commitment),
                    "proofBytes is not canonical lowercase hexadecimal",
                    0,
                );
            }
        };
    let proof: SP1Proof = match proof_options().deserialize(&proof_bytes) {
        Ok(proof) => proof,
        Err(error) => {
            return rejected(
                trusted_hash,
                FailureStatusV0::ProofMalformed,
                Some(verified_commitment),
                format!("SP1 core proof envelope is malformed: {error}"),
                0,
            );
        }
    };
    if !matches!(&proof, SP1Proof::Core(_)) {
        return rejected(
            trusted_hash,
            FailureStatusV0::UnsupportedProofFormat,
            Some(verified_commitment),
            "proof envelope does not contain an SP1 core proof",
            0,
        );
    }

    let bundle = SP1ProofWithPublicValues::new(
        proof,
        SP1PublicValues::from(&public_values),
        SP1_CIRCUIT_VERSION.to_owned(),
    );
    let verification = catch_unwind(AssertUnwindSafe(|| {
        let verifier = VERIFIER.get_or_init(|| ProverClient::builder().light().build());
        verifier.verify(&bundle, &trusted.vkey, None)
    }));
    match verification {
        Err(_) => {
            return rejected(
                trusted_hash,
                FailureStatusV0::VerifierExecutionFailed,
                Some(verified_commitment),
                "SP1 verifier panicked",
                3,
            );
        }
        Ok(Err(error)) => {
            return rejected(
                trusted_hash,
                FailureStatusV0::ProofRejected,
                Some(verified_commitment),
                format!("SP1 verifier rejected the proof: {error}"),
                0,
            );
        }
        Ok(Ok(())) => {}
    }

    if verified_commitment != request.expected_note_commitment32 {
        return rejected(
            trusted_hash,
            FailureStatusV0::NoteCommitmentMismatch,
            Some(verified_commitment),
            "verified public noteCommitment32 does not match expectedNoteCommitment32",
            0,
        );
    }

    let mut result = base_result(trusted_hash);
    result.verified = true;
    result.verified_note_commitment32 = Some(verified_commitment);
    CommandOutcomeV0 {
        result,
        diagnostic: None,
        exit_code: 0,
    }
}

pub fn serialize_result(result: &VerifyResultV0) -> Result<String, serde_json::Error> {
    serde_json::to_string(result)
}

#[cfg(test)]
mod unit_tests {
    use super::*;

    #[test]
    fn result_field_order_is_stable() {
        let result = base_result("00".repeat(32));
        let json = serialize_result(&result).expect("serialize result");
        assert_eq!(
            json,
            concat!(
                "{\"version\":0,\"verified\":false,",
                "\"relationId\":\"apnt-note-commitment-preimage-v0\",",
                "\"proofSystem\":\"sp1\",",
                "\"proofFormat\":\"sp1-core-bincode-v1\",",
                "\"programVkeyHash\":\"0000000000000000000000000000000000000000000000000000000000000000\",",
                "\"verifiedNoteCommitment32\":null,\"failureStatus\":null}"
            )
        );
    }
}
