//! Rust parity for the additive APNT private-note-transition v1 host
//! relation over canonical Profile V2, Statement V2, and APNTPTI1 bytes.
//!
//! The proving input is private test/proving material. Only the fixed 307-byte
//! APNTPRR1 result is public. Errors intentionally use closed, witness-free
//! diagnostics and must not contain input bytes or private field values.

use std::collections::{BTreeMap, BTreeSet};

use k256::schnorr::{Signature as SchnorrSignature, VerifyingKey as SchnorrVerifyingKey};
use serde::{Deserialize, Serialize};

use apnt_import_created_note_rust_parity::{
    build_recovery_plaintext_v1, checked_satoshi_add, checked_satoshi_sum, parse_backing_bundle_v1,
    parse_backing_seal_cell_v1, parse_bundle_backed_note_v1, sha256_domain_separated,
    BackingBundleV1, BackingSealCellOpeningV1, BundleBackedNoteV1, LogicalWitnessV0,
    OneTimeDescriptorV0, RecoveryWitnessV0, MAX_BCH_MONEY_SATS, MLKEM768_PUBLIC_KEY_BYTES,
};
use apnt_recovery_v1_rust_parity::{
    build_recovery_packet_bin_v1, build_recovery_sender_evidence_v1, parse_recovery_packet_bin_v1,
    recovery_packet_hash_v1, RecoveryDescriptorV1, RECOVERY_V1_PACKET_BIN_BYTES,
};

pub const PROVING_INPUT_MAGIC: &[u8; 8] = b"APNTPTI1";
pub const PROVING_INPUT_VERSION: u8 = 1;
pub const RELATION_VERSION: u8 = 1;
pub const RELATION_DOMAIN: &str = "bch-cloak-apnt-v1:private-note-transition-relation-v1";
pub const RELATION_IDENTITY: &str = "apnt-private-note-transition-relation-v1";
pub const RELATION_CONTRACT_COMMITMENT: [u8; 32] = [
    0xd0, 0xd2, 0x63, 0xa3, 0x7c, 0xc2, 0x8a, 0xcf, 0x8c, 0xab, 0x36, 0xfd, 0x03, 0x37, 0x9f, 0x63,
    0x02, 0x41, 0x11, 0xca, 0xb7, 0x7b, 0x0e, 0x50, 0xbd, 0xab, 0xb1, 0x38, 0x4d, 0x75, 0x47, 0x92,
];
pub const RESULT_MAGIC: &[u8; 8] = b"APNTPRR1";
pub const RESULT_VERSION: u8 = 1;
pub const RESULT_BYTES: usize = 307;
/// Fixed offset of the `settlementProjection32` presence byte inside the result.
pub const RESULT_SETTLEMENT_PRESENCE_OFFSET: usize = 177;
/// Fixed offset of `settlementProjection32` inside the result.
pub const RESULT_SETTLEMENT_PROJECTION_OFFSET: usize = 178;
pub const RESULT_IDENTITY_TUPLE_PRESENCE_OFFSET: usize = 210;
pub const RESULT_SEMANTIC_PROFILE_ID_OFFSET: usize = 211;
pub const RESULT_PROOF_RELATION_ID_OFFSET: usize = 243;
pub const RESULT_SP1_PROGRAM_ID_OFFSET: usize = 275;
pub const STATEMENT_COMMITMENT_DOMAIN: &str =
    "bch-cloak-apnt-v0:transition-statement-commitment-v2";
pub const SETTLEMENT_PROJECTION_MAGIC: &[u8; 8] = b"APNTTSP0";
pub const SETTLEMENT_PROJECTION_VERSION: u8 = 0;
pub const SETTLEMENT_PROJECTION_COMMITMENT_DOMAIN: &str =
    "bch-cloak-apnt-v0:transition-settlement-projection-commitment-v0";
pub const OWNER_AUTHORITY_DOMAIN: &str = "bch-cloak-apnt-v0:owner-authority-v0";
pub const BUNDLE_NULLIFIER_DOMAIN: &str = "bch-cloak-apnt-v0:bundle-nullifier-v1";
pub const SPEND_AUTHORIZATION_MESSAGE_DOMAIN: &str =
    "bch-cloak-apnt-v0:spend-authorization-message-v0";
pub const BCH_ASSET_ID_DOMAIN: &str = "bch-cloak-apnt-v0:asset-id-v0";
pub const BATCH_NONCE_DOMAIN: &str = "bch-cloak-apnt-v0:transition-batch-nonce-v2";
pub const CREATION_SCOPE_DOMAIN: &str = "bch-cloak-apnt-v0:creation-scope-v2";
pub const PROFILE_ID_DOMAIN: &str = "bch-cloak-apnt-v1:privacy-profile-id-v2";
pub const SEAL_LOCKING_PROFILE_ID_DOMAIN: &str =
    "bch-cloak-apnt-v1:created-note-seal-locking-profile-id";
pub const MAX_LOGICAL_NOTES_PER_SIDE: u32 = 1_024;
pub const MAX_BACKING_CELLS_PER_SIDE: u32 = 4_096;
pub const MAX_PROJECTION_ITEMS_PER_SIDE: u32 = 8_192;

/// The in-circuit exit-authority commitment domain (design.md §4.3).
///
/// Deliberately NOT the on-chain value: the seal pins plain `sha256(E33)` and
/// the note-side commitment is this domain-separated hash over the same key, so
/// neither is a usable oracle for the other.
pub const ONE_TIME_EXIT_AUTHORITY_COMMITMENT_DOMAIN: &str =
    "bch-cloak-apnt-v0:one-time-exit-authority-v0";

/// `E_i` is a 33-byte COMPRESSED secp256k1 point, not a 32-byte x-only key.
pub const EXIT_AUTHORITY_PUBLIC_KEY_BYTES: usize = 33;

/// The complete created-note seal is 128 bytes.
pub const CREATED_NOTE_SEAL_BYTES: usize = 128;
/// Byte offset of the only per-recipient-variable region, `sha256(E33)`.
pub const CREATED_NOTE_SEAL_EXIT_KEY_HASH_OFFSET: usize = 79;
/// Length of that region.
pub const CREATED_NOTE_SEAL_EXIT_KEY_HASH_BYTES: usize = 32;

/// Category- and verdict-independent Seal V1 template. Profile V2 supplies the
/// two deployment fields; only the exit-key hash remains variable per cell.
const CREATED_NOTE_SEAL_TEMPLATE: [u8; CREATED_NOTE_SEAL_BYTES] = [
    0x63, 0x76, 0xce, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x88, 0xc7, 0x23, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x87, 0x67, 0x76, 0xa8, 0x20, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x88,
    0x7c, 0x82, 0x01, 0x41, 0x9d, 0x76, 0x01, 0x40, 0x7f, 0x77, 0x01, 0x41, 0x88, 0x7c, 0xac, 0x68,
];

/// Plain SHA-256. `exitKeyHash32 = sha256(E33)` is deliberately NOT
/// domain-separated: the on-chain preimage check is two opcodes, and keeping it
/// different from the in-circuit commitment means no value that opens one opens
/// the other.
fn sha256_raw(bytes: &[u8]) -> [u8; 32] {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hasher.finalize().into()
}

/// Matches one projected locking template against the seal skeleton, returning
/// the committed `exitKeyHash32` when every byte outside the 32-byte hole is
/// exactly the skeleton's.
///
/// Fixed length, fixed offsets, no parsing: a 128-byte prefix of a longer script
/// is not a seal.
fn match_created_note_seal(
    locking_bytecode: &[u8],
    skeleton: &[u8; CREATED_NOTE_SEAL_BYTES],
) -> Option<[u8; 32]> {
    if locking_bytecode.len() != CREATED_NOTE_SEAL_BYTES {
        return None;
    }
    let hole_start = CREATED_NOTE_SEAL_EXIT_KEY_HASH_OFFSET;
    let hole_end = hole_start + CREATED_NOTE_SEAL_EXIT_KEY_HASH_BYTES;
    for (index, byte) in locking_bytecode.iter().enumerate() {
        if index >= hole_start && index < hole_end {
            continue;
        }
        if *byte != skeleton[index] {
            return None;
        }
    }
    let mut exit_key_hash = [0u8; 32];
    exit_key_hash.copy_from_slice(&locking_bytecode[hole_start..hole_end]);
    Some(exit_key_hash)
}

pub const FAILURE_STAGES: [&str; 13] = [
    "statement-boundary",
    "witness-shape",
    "witness-identity",
    "private-value-arithmetic",
    "consumed-bundle",
    "created-bundle",
    "private-conservation",
    "consumed-authority",
    "consumed-nullifier",
    "statement-nullifier-correspondence",
    "recovery-consistency",
    "accepted",
    // Appended, never inserted: every pre-existing stage keeps its exact
    // numeric code point in the frozen public result codec.
    "created-exit-authority",
];

pub const FAILURE_CODES: [&str; 97] = [
    "statement-boundary-malformed",
    "statement-normalization-failed",
    "expected-statement-commitment-mismatch",
    "unsupported-statement-mode",
    "unsupported-deferred-mode",
    "unknown-privacy-profile",
    "statement-structure-invalid",
    "relation-witness-malformed",
    "consumed-created-role-confusion",
    "witness-statement-commitment-mismatch",
    "duplicate-logical-note-witness-identity",
    "logical-note-commitment-identity-mismatch",
    "missing-consumed-logical-note-witness",
    "extra-consumed-logical-note-witness",
    "missing-created-logical-note-witness",
    "extra-created-logical-note-witness",
    "consumed-logical-note-opening-commitment-mismatch",
    "created-logical-note-opening-commitment-mismatch",
    "logical-note-bundle-commitment-mismatch",
    "duplicate-consumed-backing-cell-witness-identity",
    "duplicate-created-backing-cell-witness-identity",
    "missing-consumed-backing-cell-witness",
    "extra-consumed-backing-cell-witness",
    "missing-created-backing-cell-witness",
    "extra-created-backing-cell-witness",
    "consumed-backing-cell-source-outpoint-mismatch",
    "consumed-backing-cell-input-index-mismatch",
    "created-backing-cell-output-index-mismatch",
    "backing-cell-seal-commitment-mismatch",
    "backing-cell-opening-commitment-mismatch",
    "backing-cell-logical-note-assignment-mismatch",
    "created-backing-cell-creation-scope-mismatch",
    "private-note-value-out-of-range",
    "private-value-sum-overflow",
    "empty-bundle",
    "bundle-member-duplicate",
    "bundle-cell-missing",
    "bundle-cell-extra",
    "bundle-cell-role-mismatch",
    "bundle-scope-mismatch",
    "bundle-not-disjoint",
    "note-backing-mismatch",
    "verifier-input-used-as-backing",
    "recovery-carrier-used-as-backing",
    "transparent-output-used-as-backing",
    "aggregator-fee-output-used-as-backing",
    "token-bearing-backing-entry",
    "private-conservation-mismatch",
    "authority-material-missing",
    "authority-material-malformed",
    "authority-statement-mismatch",
    "authority-commitment-mismatch",
    "authority-note-mismatch",
    "authority-bundle-mismatch",
    "nullifier-material-missing",
    "nullifier-material-malformed",
    "nullifier-statement-mismatch",
    "nullifier-note-mismatch",
    "nullifier-bundle-mismatch",
    "nullifier-derivation-mismatch",
    "nullifier-duplicate",
    "statement-nullifier-missing",
    "statement-nullifier-extra",
    "statement-nullifier-mismatch",
    "recovery-evidence-missing",
    "recovery-evidence-extra",
    "recovery-evidence-duplicate",
    "recovery-packet-index-mismatch",
    "recovery-packet-digest-mismatch",
    "recovery-packet-note-mismatch",
    "recovery-packet-table-commitment-mismatch",
    "recovery-sender-evidence-mismatch",
    "recovery-manifest-mismatch",
    "recovery-bin-root-mismatch",
    "recovery-statement-reference-mismatch",
    "full-private-semantics-accepted",
    // Appended by the non-custodial spend-authority relation change. New codes
    // are appended so every pre-existing code point keeps its numeric value.
    "authority-public-key-malformed",
    "authority-signature-invalid",
    "recovery-owner-authority-mismatch",
    "consumed-cell-value-mismatch",
    "created-cell-value-mismatch",
    "non-canonical-asset-id",
    "consumed-created-asset-id-mismatch",
    // Appended by the mandatory-exit / created-note-seal relation change.
    "backing-cell-locking-profile-mismatch",
    "exit-authority-material-missing",
    "exit-authority-material-extra",
    "exit-authority-material-malformed",
    "exit-authority-statement-mismatch",
    "exit-authority-public-key-duplicate",
    "exit-authority-commitment-mismatch",
    "created-seal-template-mismatch",
    "created-seal-exit-key-hash-mismatch",
    "profile-bytes-invalid",
    "semantic-profile-id-mismatch",
    "relation-id-mismatch",
    "recovery-carrier-count-mismatch",
    "recovery-carrier-lock-mismatch",
];

type ApntResult<T> = Result<T, String>;

fn err(message: &'static str) -> String {
    message.to_owned()
}

fn stage_code(name: &str) -> u8 {
    FAILURE_STAGES
        .iter()
        .position(|candidate| *candidate == name)
        .expect("closed failure stage") as u8
}

fn failure_code(name: &str) -> u8 {
    FAILURE_CODES
        .iter()
        .position(|candidate| *candidate == name)
        .expect("closed failure code") as u8
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PublicResultV1 {
    pub statement_commitment: Option<[u8; 32]>,
    /// Domain-separated commitment to the exact settlement transaction this
    /// statement authorizes. Present exactly when `statement_commitment` is,
    /// because it is a strict function of the same normalized statement.
    pub settlement_projection: Option<[u8; 32]>,
    /// Exact `(semantic profile P, proof relation R, claimed SP1 program K)`
    /// copied from the parsed Statement V2. The generic guest does not
    /// self-authorize K; the authenticated verifier pins it later.
    pub identity_tuple: Option<[[u8; 32]; 3]>,
    pub failure_stage: u8,
    pub failure_code: u8,
    pub counts: [u32; 4],
}

impl PublicResultV1 {
    pub fn accepted(&self) -> bool {
        self.failure_stage == stage_code("accepted")
            && self.failure_code == failure_code("full-private-semantics-accepted")
    }

    fn rejected(
        statement_commitment: Option<[u8; 32]>,
        settlement_projection: Option<[u8; 32]>,
        identity_tuple: Option<[[u8; 32]; 3]>,
        counts: [u32; 4],
        stage: &str,
        code: &str,
    ) -> Self {
        Self {
            statement_commitment,
            settlement_projection,
            identity_tuple,
            failure_stage: stage_code(stage),
            failure_code: failure_code(code),
            counts,
        }
    }
}

/// Where a stage really sits in the evaluation order, which is NOT its code
/// point once a stage has been appended rather than inserted.
///
/// `created-exit-authority` is code point 12 (appended last so every
/// pre-existing stage keeps its numeric value in the frozen result codec) but
/// runs logically right after witness identity and before the bundle checks.
/// Comparing raw code points would report every later property as already
/// accepted, which is exactly backwards.
fn progression_rank(stage: u8) -> u8 {
    if stage == stage_code("created-exit-authority") {
        stage_code("private-value-arithmetic")
    } else {
        stage
    }
}

fn progression_booleans(result: &PublicResultV1) -> [bool; 20] {
    let stage = progression_rank(result.failure_stage);
    let at_or_after = |name: &str| stage >= stage_code(name);
    let accepted = result.accepted();
    [
        accepted,
        at_or_after("private-value-arithmetic"),
        at_or_after("consumed-authority"),
        at_or_after("consumed-authority"),
        at_or_after("consumed-authority"),
        at_or_after("consumed-authority"),
        at_or_after("consumed-authority"),
        at_or_after("consumed-authority"),
        accepted,
        at_or_after("consumed-nullifier"),
        at_or_after("statement-nullifier-correspondence"),
        accepted,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
    ]
}

pub fn serialize_public_result_v1(result: &PublicResultV1) -> Vec<u8> {
    let mut output = Vec::with_capacity(RESULT_BYTES);
    output.extend_from_slice(RESULT_MAGIC);
    output.push(RESULT_VERSION);
    write_u16_le(&mut output, RELATION_DOMAIN.len() as u16);
    output.extend_from_slice(RELATION_DOMAIN.as_bytes());
    write_u16_le(&mut output, RELATION_IDENTITY.len() as u16);
    output.extend_from_slice(RELATION_IDENTITY.as_bytes());
    match result.statement_commitment {
        Some(commitment) => {
            output.push(1);
            output.extend_from_slice(&commitment);
        }
        None => {
            output.push(0);
            output.extend_from_slice(&[0u8; 32]);
        }
    }
    output.push(result.failure_stage);
    output.push(result.failure_code);
    for count in result.counts {
        write_u32_le(&mut output, count);
    }
    for value in progression_booleans(result) {
        output.push(u8::from(value));
    }
    debug_assert_eq!(output.len(), RESULT_SETTLEMENT_PRESENCE_OFFSET);
    match result.settlement_projection {
        Some(projection) => {
            output.push(1);
            output.extend_from_slice(&projection);
        }
        None => {
            output.push(0);
            output.extend_from_slice(&[0u8; 32]);
        }
    }
    debug_assert_eq!(output.len(), RESULT_IDENTITY_TUPLE_PRESENCE_OFFSET);
    match result.identity_tuple {
        Some(tuple) => {
            output.push(1);
            for identity in tuple {
                output.extend_from_slice(&identity);
            }
        }
        None => {
            output.push(0);
            output.extend_from_slice(&[0u8; 96]);
        }
    }
    debug_assert_eq!(output.len(), RESULT_BYTES);
    output
}

pub fn parse_public_result_v1(bytes: &[u8]) -> ApntResult<PublicResultV1> {
    if bytes.len() != RESULT_BYTES {
        return Err(err("public result has the wrong fixed length"));
    }
    let mut reader = Reader::new(bytes);
    reader.expect(RESULT_MAGIC)?;
    if reader.u8()? != RESULT_VERSION {
        return Err(err("public result has an unsupported version"));
    }
    if reader.text_u16()? != RELATION_DOMAIN || reader.text_u16()? != RELATION_IDENTITY {
        return Err(err("public result has an unsupported relation identity"));
    }
    let statement_commitment = match reader.u8()? {
        0 => {
            if reader.bytes32()? != [0u8; 32] {
                return Err(err("public result has a noncanonical absent commitment"));
            }
            None
        }
        1 => {
            let value = reader.bytes32()?;
            if !nonzero(&value) {
                return Err(err("public result has an all-zero present commitment"));
            }
            Some(value)
        }
        _ => return Err(err("public result has an invalid commitment tag")),
    };
    let failure_stage = reader.u8()?;
    let failure_code = reader.u8()?;
    if failure_stage as usize >= FAILURE_STAGES.len()
        || failure_code as usize >= FAILURE_CODES.len()
    {
        return Err(err("public result has an unsupported failure outcome"));
    }
    let counts = [reader.u32()?, reader.u32()?, reader.u32()?, reader.u32()?];
    for _ in 0..20 {
        if reader.u8()? > 1 {
            return Err(err("public result has a non-boolean status"));
        }
    }
    let settlement_projection = match reader.u8()? {
        0 => {
            if reader.bytes32()? != [0u8; 32] {
                return Err(err("public result has a noncanonical absent projection"));
            }
            None
        }
        1 => {
            let value = reader.bytes32()?;
            if !nonzero(&value) {
                return Err(err("public result has an all-zero present projection"));
            }
            Some(value)
        }
        _ => return Err(err("public result has an invalid projection tag")),
    };
    let identity_tuple = match reader.u8()? {
        0 => {
            if reader.take(96)?.iter().any(|byte| *byte != 0) {
                return Err(err(
                    "public result has a noncanonical absent identity tuple",
                ));
            }
            None
        }
        1 => {
            let tuple = [reader.bytes32()?, reader.bytes32()?, reader.bytes32()?];
            if tuple.iter().any(|identity| !nonzero(identity)) {
                return Err(err("public result has an all-zero present identity"));
            }
            Some(tuple)
        }
        _ => return Err(err("public result has an invalid identity tuple tag")),
    };
    reader.finish()?;
    if statement_commitment.is_some() != settlement_projection.is_some()
        || statement_commitment.is_some() != identity_tuple.is_some()
    {
        return Err(err("public result presence fields are inconsistent"));
    }
    let result = PublicResultV1 {
        statement_commitment,
        settlement_projection,
        identity_tuple,
        failure_stage,
        failure_code,
        counts,
    };
    if serialize_public_result_v1(&result) != bytes {
        return Err(err("public result status progression is noncanonical"));
    }
    Ok(result)
}

#[derive(Debug, Clone)]
struct Outpoint {
    txid: [u8; 32],
    vout: u32,
}

#[derive(Debug, Clone)]
struct ProjectionInput {
    outpoint: Outpoint,
    sequence: u32,
    value: u64,
    locking_bytecode: Vec<u8>,
    role: u8,
}

#[derive(Debug, Clone)]
struct ProjectionOutput {
    value: u64,
    role: u8,
    locking_template: Vec<u8>,
    statement_commitment_offset: Option<u32>,
}

#[derive(Debug, Clone)]
struct Projection {
    transaction_version: u32,
    locktime: u32,
    inputs: Vec<ProjectionInput>,
    outputs: Vec<ProjectionOutput>,
}

#[derive(Debug, Clone)]
struct ConsumedLogical {
    note_commitment: [u8; 32],
    nullifier: [u8; 32],
}

#[derive(Debug, Clone)]
struct CreatedLogical {
    note_commitment: [u8; 32],
    packet_index: u32,
    packet_hash: [u8; 32],
}

#[derive(Debug, Clone)]
struct StatementCell {
    index: u32,
    cell_commitment: [u8; 32],
    locking_profile: [u8; 32],
    /// Created cells only: `sha256DomainSeparated(one-time-exit-authority-v0,
    /// E_i33)` over that CELL's own one-time exit key. `None` on the consumed
    /// side, whose tuple has no such field.
    exit_authority_commitment: Option<[u8; 32]>,
}

#[derive(Debug, Clone)]
struct Statement {
    network: u8,
    mode: u8,
    privacy_profile: [u8; 32],
    proof_relation: [u8; 32],
    sp1_program: [u8; 32],
    designated_verifier_input: u32,
    batch_nonce: [u8; 32],
    creation_scope: Option<[u8; 32]>,
    consumed_logical: Vec<ConsumedLogical>,
    consumed_cells: Vec<StatementCell>,
    created_logical: Vec<CreatedLogical>,
    created_cells: Vec<StatementCell>,
    recovery_packet_bin_root: Option<[u8; 32]>,
    network_fee: u64,
    service_fee: u64,
    aggregator_fee_output: Option<u32>,
    total_input: u64,
    total_output: u64,
    projection: Projection,
    commitment: [u8; 32],
    settlement_projection: [u8; 32],
}

#[derive(Debug, Clone)]
struct PrivacyProfileV2 {
    semantic_profile_id: [u8; 32],
    flat_service_fee: bool,
    cell_value_sats: u64,
    minimum_consumed_logical_notes: usize,
    exact_created_logical_notes: usize,
    minimum_cells_per_logical_note: usize,
    minimum_consumed_backing_cells: usize,
    minimum_created_backing_cells: usize,
    maximum_created_backing_cells: usize,
    minimum_surplus_cells_per_group: usize,
    flat_fee_per_consumed_logical_note_sats: u64,
    recovery_packet_count: usize,
    recovery_maximum_created_backing_cells: usize,
    recovery_carrier_count: usize,
    recovery_carrier_payload_bytes: usize,
    recovery_packet_bin_bytes: usize,
    seal_skeleton: [u8; CREATED_NOTE_SEAL_BYTES],
    seal_locking_profile_id: [u8; 32],
    proof_relation_id: [u8; 32],
}

#[derive(Debug, Clone)]
struct LogicalWitness {
    role: u8,
    statement_commitment: [u8; 32],
    logical_commitment: [u8; 32],
    note: BundleBackedNoteV1,
    bundle: BackingBundleV1,
}

#[derive(Debug, Clone)]
struct ConsumedCellWitness {
    role: u8,
    statement_commitment: [u8; 32],
    logical_commitment: [u8; 32],
    source: Outpoint,
    input_index: u32,
    cell_commitment: [u8; 32],
    opening: BackingSealCellOpeningV1,
}

#[derive(Debug, Clone)]
struct CreatedCellWitness {
    role: u8,
    statement_commitment: [u8; 32],
    logical_commitment: [u8; 32],
    output_index: u32,
    cell_commitment: [u8; 32],
    opening: BackingSealCellOpeningV1,
}

/// Per-CELL exit authority for one created backing cell. Public key material
/// only; `e_i` never appears in any witness.
#[derive(Debug, Clone)]
struct ExitAuthorityWitness {
    statement_commitment: [u8; 32],
    output_index: u32,
    exit_public_key: [u8; EXIT_AUTHORITY_PUBLIC_KEY_BYTES],
}

#[derive(Debug, Clone)]
struct AuthorityWitness {
    statement_commitment: [u8; 32],
    logical_commitment: [u8; 32],
    note_commitment: [u8; 32],
    bundle_commitment: [u8; 32],
    /// The note owner's BIP-340 x-only public key `P`. Public material.
    owner_public_key: [u8; 32],
    /// BIP-340 signature by `P` over the statement-bound authorization message.
    authorization_signature: [u8; 64],
}

#[derive(Debug, Clone)]
struct NullifierWitness {
    statement_commitment: [u8; 32],
    logical_commitment: [u8; 32],
    note_commitment: [u8; 32],
    bundle_commitment: [u8; 32],
    owner_public_key: [u8; 32],
    derived_nullifier: [u8; 32],
}

#[derive(Debug, Clone)]
struct RecoveryWitnessV1 {
    statement_commitment: [u8; 32],
    logical_note_commitment: [u8; 32],
    created_note_commitment: [u8; 32],
    creation_scope: [u8; 32],
    packet_index: u32,
    descriptor: OneTimeDescriptorV0,
    encapsulation_seed: [u8; 32],
}

#[derive(Debug, Clone)]
struct RecoveryPacketTableV1 {
    statement_commitment: [u8; 32],
    encoded_packets: Vec<Vec<u8>>,
    packet_hashes: Vec<[u8; 32]>,
    packet_bin: Vec<u8>,
    packet_bin_root: [u8; 32],
}

#[derive(Debug, Clone)]
struct ProvingInput {
    profile: PrivacyProfileV2,
    expected_statement_commitment: [u8; 32],
    statement: Statement,
    consumed_logical: Vec<LogicalWitness>,
    created_logical: Vec<LogicalWitness>,
    consumed_cells: Vec<ConsumedCellWitness>,
    created_cells: Vec<CreatedCellWitness>,
    exit_authorities: Vec<ExitAuthorityWitness>,
    authorities: Vec<AuthorityWitness>,
    nullifiers: Vec<NullifierWitness>,
    recovery: Vec<RecoveryWitnessV1>,
    recovery_table: RecoveryPacketTableV1,
}

struct Reader<'a> {
    bytes: &'a [u8],
    offset: usize,
}

impl<'a> Reader<'a> {
    fn new(bytes: &'a [u8]) -> Self {
        Self { bytes, offset: 0 }
    }

    fn take(&mut self, length: usize) -> ApntResult<&'a [u8]> {
        if self.offset > self.bytes.len() || self.bytes.len() - self.offset < length {
            return Err(err("canonical proving input is truncated"));
        }
        let result = &self.bytes[self.offset..self.offset + length];
        self.offset += length;
        Ok(result)
    }

    fn expect(&mut self, expected: &[u8]) -> ApntResult<()> {
        if self.take(expected.len())? != expected {
            return Err(err("canonical proving input has invalid magic"));
        }
        Ok(())
    }

    fn u8(&mut self) -> ApntResult<u8> {
        Ok(self.take(1)?[0])
    }

    fn u16(&mut self) -> ApntResult<u16> {
        Ok(u16::from_le_bytes(
            self.take(2)?.try_into().expect("2 bytes"),
        ))
    }

    fn u32(&mut self) -> ApntResult<u32> {
        Ok(u32::from_le_bytes(
            self.take(4)?.try_into().expect("4 bytes"),
        ))
    }

    fn u64(&mut self) -> ApntResult<u64> {
        Ok(u64::from_le_bytes(
            self.take(8)?.try_into().expect("8 bytes"),
        ))
    }

    fn bytes32(&mut self) -> ApntResult<[u8; 32]> {
        Ok(self.take(32)?.try_into().expect("32 bytes"))
    }

    fn bytes64(&mut self) -> ApntResult<[u8; 64]> {
        Ok(self.take(64)?.try_into().expect("64 bytes"))
    }

    fn blob(&mut self) -> ApntResult<&'a [u8]> {
        let length: usize = self
            .u32()?
            .try_into()
            .map_err(|_| err("canonical proving input length exceeds usize"))?;
        self.take(length)
    }

    fn text_u16(&mut self) -> ApntResult<&'a str> {
        let length = self.u16()? as usize;
        std::str::from_utf8(self.take(length)?)
            .map_err(|_| err("canonical proving input text is not UTF-8"))
    }

    fn bounded_count(&mut self, maximum: u32) -> ApntResult<u32> {
        let count = self.u32()?;
        if count > maximum {
            return Err(err("canonical proving input collection exceeds its bound"));
        }
        Ok(count)
    }

    fn finish(&self) -> ApntResult<()> {
        if self.offset != self.bytes.len() {
            return Err(err("canonical proving input has trailing bytes"));
        }
        Ok(())
    }
}

fn write_u16_le(output: &mut Vec<u8>, value: u16) {
    output.extend_from_slice(&value.to_le_bytes());
}

fn write_u32_le(output: &mut Vec<u8>, value: u32) {
    output.extend_from_slice(&value.to_le_bytes());
}

fn write_u64_le(output: &mut Vec<u8>, value: u64) {
    output.extend_from_slice(&value.to_le_bytes());
}

fn nonzero(value: &[u8; 32]) -> bool {
    value.iter().any(|byte| *byte != 0)
}

const SETTLEMENT_AUTHORIZATION_P2SH32_LOCK: [u8; 35] = [
    0xaa, 0x20, 0xec, 0x18, 0x0a, 0x86, 0x43, 0x25, 0xf5, 0xa9, 0xdb, 0x82, 0x34, 0x44, 0x76, 0x67,
    0x51, 0x31, 0xb3, 0xbc, 0x87, 0x3c, 0xb3, 0x8f, 0x22, 0x2e, 0x4a, 0x5f, 0xb6, 0x9e, 0xbb, 0xdc,
    0x2d, 0x2d, 0x87,
];

fn parse_privacy_profile_v2(bytes: &[u8]) -> ApntResult<PrivacyProfileV2> {
    if bytes.len() != 200 || &bytes[..8] != b"APNTPPV2" || bytes[8] != 2 {
        return Err(err("Profile V2 has invalid length, magic, or version"));
    }
    if bytes[9..15].iter().any(|byte| *byte != 0) || bytes[15] > 1 {
        return Err(err("Profile V2 has unsupported semantic rules"));
    }
    let flat_service_fee = bytes[15] == 1;
    let mut offset = 16;
    let read_u64 = |at: usize| u64::from_le_bytes(bytes[at..at + 8].try_into().expect("8 bytes"));
    let read_u32 = |at: usize| u32::from_le_bytes(bytes[at..at + 4].try_into().expect("4 bytes"));
    let cell_value_sats = read_u64(offset);
    offset += 8;
    let mut counts = [0u32; 8];
    for value in &mut counts {
        *value = read_u32(offset);
        offset += 4;
    }
    let flat_fee_per_consumed_logical_note_sats = read_u64(offset);
    offset += 8;
    let mut recovery = [0u32; 7];
    for value in &mut recovery {
        *value = read_u32(offset);
        offset += 4;
    }
    debug_assert_eq!(offset, 92);
    let seal_descriptor: [u8; 76] = bytes[offset..offset + 76].try_into().expect("76 bytes");
    offset += 76;
    if &seal_descriptor[..8] != b"APNTSSK1" || seal_descriptor[8] != 1 {
        return Err(err("Profile V2 Seal V1 descriptor is invalid"));
    }
    let verdict_lock: [u8; 35] = seal_descriptor[41..76].try_into().expect("35 bytes");
    if verdict_lock != SETTLEMENT_AUTHORIZATION_P2SH32_LOCK {
        return Err(err(
            "Profile V2 seal does not use the settlement authorization lock",
        ));
    }
    let proof_relation_id: [u8; 32] = bytes[offset..offset + 32].try_into().expect("32 bytes");
    if !nonzero(&proof_relation_id) {
        return Err(err("Profile V2 proof relation ID is all zero"));
    }
    if cell_value_sats == 0
        || cell_value_sats > MAX_BCH_MONEY_SATS
        || flat_fee_per_consumed_logical_note_sats > MAX_BCH_MONEY_SATS
    {
        return Err(err("Profile V2 money field is out of range"));
    }

    let minimum_consumed_logical_notes = counts[0] as usize;
    let exact_created_logical_notes = counts[1] as usize;
    let minimum_cells_per_logical_note = counts[2] as usize;
    let minimum_consumed_backing_cells = counts[3] as usize;
    let minimum_created_backing_cells = counts[4] as usize;
    let maximum_created_backing_cells = counts[5] as usize;
    let minimum_surplus_cells_per_group = counts[6] as usize;
    let minimum_note_value_candidates = counts[7] as usize;
    let consumed_floor = (counts[0] as u64)
        .checked_mul(counts[2] as u64)
        .and_then(|value| value.checked_add(counts[6] as u64))
        .ok_or_else(|| err("Profile V2 consumed ambiguity floor overflows"))?;
    let created_floor = (counts[1] as u64)
        .checked_mul(counts[2] as u64)
        .and_then(|value| value.checked_add(counts[6] as u64))
        .ok_or_else(|| err("Profile V2 created ambiguity floor overflows"))?;
    if minimum_consumed_logical_notes < 2
        || exact_created_logical_notes != 2
        || minimum_cells_per_logical_note < 2
        || minimum_surplus_cells_per_group < 1
        || minimum_note_value_candidates < 2
        || (minimum_consumed_backing_cells as u64) < consumed_floor
        || (minimum_created_backing_cells as u64) < created_floor
        || maximum_created_backing_cells != 8
        || minimum_created_backing_cells > maximum_created_backing_cells
    {
        return Err(err(
            "Profile V2 weakens or changes the closed privacy floors",
        ));
    }
    if recovery != [1, 1, 2, 8, 15, 197, 2_955] {
        return Err(err(
            "Profile V2 recovery and carriage rules are unsupported",
        ));
    }
    if (!flat_service_fee && flat_fee_per_consumed_logical_note_sats != 0)
        || (flat_service_fee
            && (flat_fee_per_consumed_logical_note_sats == 0
                || flat_fee_per_consumed_logical_note_sats % cell_value_sats != 0))
    {
        return Err(err("Profile V2 service-fee rule is inconsistent"));
    }

    let mut seal_skeleton = CREATED_NOTE_SEAL_TEMPLATE;
    seal_skeleton[4..36].copy_from_slice(&seal_descriptor[9..41]);
    seal_skeleton[39..74].copy_from_slice(&seal_descriptor[41..76]);
    let seal_locking_profile_id =
        sha256_domain_separated(SEAL_LOCKING_PROFILE_ID_DOMAIN, &seal_descriptor)
            .map_err(|_| err("Profile V2 seal locking-profile derivation failed"))?;
    let semantic_profile_id = sha256_domain_separated(PROFILE_ID_DOMAIN, bytes)
        .map_err(|_| err("Profile V2 identity derivation failed"))?;

    Ok(PrivacyProfileV2 {
        semantic_profile_id,
        flat_service_fee,
        cell_value_sats,
        minimum_consumed_logical_notes,
        exact_created_logical_notes,
        minimum_cells_per_logical_note,
        minimum_consumed_backing_cells,
        minimum_created_backing_cells,
        maximum_created_backing_cells,
        minimum_surplus_cells_per_group,
        flat_fee_per_consumed_logical_note_sats,
        recovery_packet_count: recovery[2] as usize,
        recovery_maximum_created_backing_cells: recovery[3] as usize,
        recovery_carrier_count: recovery[4] as usize,
        recovery_carrier_payload_bytes: recovery[5] as usize,
        recovery_packet_bin_bytes: recovery[6] as usize,
        seal_skeleton,
        seal_locking_profile_id,
        proof_relation_id,
    })
}

fn parse_projection(bytes: &[u8]) -> ApntResult<Projection> {
    let mut reader = Reader::new(bytes);
    if reader.u8()? != 1 {
        return Err(err("statement projection has an unsupported version"));
    }
    let transaction_version = reader.u32()?;
    let locktime = reader.u32()?;
    let input_count = reader.bounded_count(MAX_PROJECTION_ITEMS_PER_SIDE)?;
    if input_count == 0 {
        return Err(err("statement projection has no inputs"));
    }
    let mut inputs = Vec::with_capacity(input_count as usize);
    let mut outpoints = BTreeSet::new();
    for _ in 0..input_count {
        let mut wire_txid = reader.bytes32()?;
        wire_txid.reverse();
        let outpoint = Outpoint {
            txid: wire_txid,
            vout: reader.u32()?,
        };
        let mut identity = outpoint.txid.to_vec();
        identity.extend_from_slice(&outpoint.vout.to_le_bytes());
        if !outpoints.insert(identity) {
            return Err(err("statement projection has duplicate outpoints"));
        }
        let sequence = reader.u32()?;
        let value = reader.u64()?;
        let locking_bytecode = reader.blob()?.to_vec();
        if reader.u8()? != 0 {
            return Err(err(
                "statement projection contains token-bearing input data",
            ));
        }
        let role = reader.u8()?;
        if role > 1 || value > MAX_BCH_MONEY_SATS {
            return Err(err("statement projection input is invalid"));
        }
        inputs.push(ProjectionInput {
            outpoint,
            sequence,
            value,
            locking_bytecode,
            role,
        });
    }
    let output_count = reader.bounded_count(MAX_PROJECTION_ITEMS_PER_SIDE)?;
    if output_count == 0 {
        return Err(err("statement projection has no outputs"));
    }
    let mut outputs = Vec::with_capacity(output_count as usize);
    for _ in 0..output_count {
        let value = reader.u64()?;
        let locking_template = reader.blob()?.to_vec();
        let encoded_offset = reader.u32()?;
        let statement_commitment_offset = if encoded_offset == u32::MAX {
            None
        } else {
            let offset = encoded_offset as usize;
            if offset > locking_template.len()
                || locking_template.len() - offset < 32
                || locking_template[offset..offset + 32]
                    .iter()
                    .any(|byte| *byte != 0)
            {
                return Err(err(
                    "statement projection output has an invalid commitment slot",
                ));
            }
            Some(encoded_offset)
        };
        if reader.u8()? != 0 {
            return Err(err(
                "statement projection contains token-bearing output data",
            ));
        }
        let role = reader.u8()?;
        // Role 4 is the Plane-A transition-boundary output. It used to be
        // encoded as "created backing cell 0" (role 0), which made requiring
        // created backing outputs to be conforming created-note seals circular.
        if role > 4 || value > MAX_BCH_MONEY_SATS {
            return Err(err("statement projection output is invalid"));
        }
        outputs.push(ProjectionOutput {
            value,
            role,
            locking_template,
            statement_commitment_offset,
        });
    }
    reader.finish()?;
    Ok(Projection {
        transaction_version,
        locktime,
        inputs,
        outputs,
    })
}

fn read_presence(reader: &mut Reader<'_>) -> ApntResult<Option<[u8; 32]>> {
    match reader.u8()? {
        0 => Ok(None),
        1 => {
            let value = reader.bytes32()?;
            if !nonzero(&value) {
                return Err(err("statement contains an all-zero present bytes32"));
            }
            Ok(Some(value))
        }
        _ => Err(err("statement contains an invalid presence tag")),
    }
}

fn strictly_ascending<T, F>(items: &[T], key: F) -> bool
where
    F: Fn(&T) -> Vec<u8>,
{
    items.windows(2).all(|pair| key(&pair[0]) < key(&pair[1]))
}

/// APNTPTI1 uses the same total ordering as the TypeScript codec: each
/// collection has a semantic primary key, then the complete canonical wire
/// record is the tie-breaker. Exact duplicate records remain codec-valid and
/// are rejected later if the relation requires set semantics.
fn canonical_wire_order<K: Ord>(records: &[(K, &[u8])]) -> bool {
    records
        .windows(2)
        .all(|pair| pair[0].0 < pair[1].0 || (pair[0].0 == pair[1].0 && pair[0].1 <= pair[1].1))
}

fn parse_statement(bytes: &[u8], profile: &PrivacyProfileV2) -> ApntResult<Statement> {
    let mut reader = Reader::new(bytes);
    reader.expect(b"APNTTSV2")?;
    if reader.u8()? != 2 || reader.text_u16()? != "bch-cloak-apnt-v0" {
        return Err(err("statement identity is invalid"));
    }
    let network = reader.u8()?;
    let mode = reader.u8()?;
    if network > 2 || mode > 1 {
        return Err(err("statement network or mode is unsupported"));
    }
    let privacy_profile = reader.bytes32()?;
    let proof_relation = reader.bytes32()?;
    let sp1_program = reader.bytes32()?;
    if [&privacy_profile, &proof_relation, &sp1_program]
        .iter()
        .any(|value| !nonzero(value))
    {
        return Err(err("statement identity contains an all-zero field"));
    }
    let designated_verifier_input = reader.u32()?;
    let batch_nonce = reader.bytes32()?;
    let creation_scope = read_presence(&mut reader)?;
    let consumed_count = reader.bounded_count(MAX_LOGICAL_NOTES_PER_SIDE)?;
    let mut consumed_logical = Vec::with_capacity(consumed_count as usize);
    for _ in 0..consumed_count {
        let note_commitment = reader.bytes32()?;
        let nullifier = reader.bytes32()?;
        if !nonzero(&note_commitment) || !nonzero(&nullifier) {
            return Err(err("statement consumed logical tuple contains zero"));
        }
        consumed_logical.push(ConsumedLogical {
            note_commitment,
            nullifier,
        });
    }
    if !strictly_ascending(&consumed_logical, |item| item.note_commitment.to_vec())
        || !strictly_ascending(
            &{
                let mut by_nullifier = consumed_logical.clone();
                by_nullifier.sort_by_key(|item| item.nullifier);
                by_nullifier
            },
            |item| item.nullifier.to_vec(),
        )
    {
        return Err(err("statement consumed logical tuples are noncanonical"));
    }
    let consumed_cell_count = reader.bounded_count(MAX_BACKING_CELLS_PER_SIDE)?;
    let mut consumed_cells = Vec::with_capacity(consumed_cell_count as usize);
    for _ in 0..consumed_cell_count {
        let item = StatementCell {
            index: reader.u32()?,
            cell_commitment: reader.bytes32()?,
            locking_profile: reader.bytes32()?,
            exit_authority_commitment: None,
        };
        if !nonzero(&item.cell_commitment) || !nonzero(&item.locking_profile) {
            return Err(err("statement consumed cell tuple contains zero"));
        }
        consumed_cells.push(item);
    }
    if !strictly_ascending(&consumed_cells, |item| item.index.to_le_bytes().to_vec()) {
        return Err(err("statement consumed cell tuples are noncanonical"));
    }
    let created_count = reader.bounded_count(MAX_LOGICAL_NOTES_PER_SIDE)?;
    let mut created_logical = Vec::with_capacity(created_count as usize);
    for _ in 0..created_count {
        let item = CreatedLogical {
            note_commitment: reader.bytes32()?,
            packet_index: reader.u32()?,
            packet_hash: reader.bytes32()?,
        };
        if !nonzero(&item.note_commitment) || !nonzero(&item.packet_hash) {
            return Err(err("statement created logical tuple contains zero"));
        }
        created_logical.push(item);
    }
    if !strictly_ascending(&created_logical, |item| item.note_commitment.to_vec())
        || created_logical
            .iter()
            .enumerate()
            .any(|(index, item)| item.packet_index != index as u32)
    {
        return Err(err("statement created logical tuples are noncanonical"));
    }
    let created_cell_count = reader.bounded_count(MAX_BACKING_CELLS_PER_SIDE)?;
    let mut created_cells = Vec::with_capacity(created_cell_count as usize);
    for _ in 0..created_cell_count {
        let item = StatementCell {
            index: reader.u32()?,
            cell_commitment: reader.bytes32()?,
            locking_profile: reader.bytes32()?,
            exit_authority_commitment: Some(reader.bytes32()?),
        };
        if !nonzero(&item.cell_commitment)
            || !nonzero(&item.locking_profile)
            || !item.exit_authority_commitment.as_ref().is_some_and(nonzero)
        {
            return Err(err("statement created cell tuple contains zero"));
        }
        created_cells.push(item);
    }
    if !strictly_ascending(&created_cells, |item| item.index.to_le_bytes().to_vec()) {
        return Err(err("statement created cell tuples are noncanonical"));
    }
    // Codec-level duplicate rejection for reused per-cell exit keys: two created
    // cells sharing one `E_i` give their outputs byte-identical seal bytecode,
    // which is exactly the note-to-cell partition leak per-cell keys remove.
    {
        let mut seen = BTreeSet::new();
        for cell in &created_cells {
            let commitment = cell
                .exit_authority_commitment
                .ok_or_else(|| err("statement created cell tuple is missing exit authority"))?;
            if !seen.insert(commitment) {
                return Err(err(
                    "statement created cell tuples repeat an exit-authority commitment",
                ));
            }
        }
    }
    let recovery_packet_bin_root = read_presence(&mut reader)?;
    let network_fee = reader.u64()?;
    let service_fee = reader.u64()?;
    let fee_index = reader.u32()?;
    let aggregator_fee_output = (fee_index != u32::MAX).then_some(fee_index);
    let total_input = reader.u64()?;
    let total_output = reader.u64()?;
    let projection = parse_projection(reader.take(reader.bytes.len() - reader.offset)?)?;
    reader.finish()?;
    let commitment = sha256_domain_separated(STATEMENT_COMMITMENT_DOMAIN, bytes)
        .map_err(|_| err("statement commitment derivation failed"))?;
    let settlement_projection = derive_settlement_projection(
        designated_verifier_input,
        network_fee,
        &projection,
        &commitment,
    )?;
    let statement = Statement {
        network,
        mode,
        privacy_profile,
        proof_relation,
        sp1_program,
        designated_verifier_input,
        batch_nonce,
        creation_scope,
        consumed_logical,
        consumed_cells,
        created_logical,
        created_cells,
        recovery_packet_bin_root,
        network_fee,
        service_fee,
        aggregator_fee_output,
        total_input,
        total_output,
        projection,
        commitment,
        settlement_projection,
    };
    validate_statement(&statement, profile)?;
    Ok(statement)
}

/// Materializes one projected output's on-chain locking bytecode by writing the
/// statement commitment into the template's declared 32-byte slot.
fn materialize_output_locking_bytecode(
    output: &ProjectionOutput,
    statement_commitment: &[u8; 32],
) -> ApntResult<Vec<u8>> {
    let mut bytes = output.locking_template.clone();
    let Some(offset) = output.statement_commitment_offset else {
        return Ok(bytes);
    };
    let offset = offset as usize;
    if offset > bytes.len() || bytes.len() - offset < 32 {
        return Err(err("settlement projection output slot is out of range"));
    }
    bytes[offset..offset + 32].copy_from_slice(statement_commitment);
    Ok(bytes)
}

/// Canonical `APNTTSP0` settlement-projection transcript. Byte-for-byte parity
/// with `apnt_transition_settlement_projection_v0.ts`.
fn serialize_settlement_projection(
    designated_verifier_input: u32,
    network_fee: u64,
    projection: &Projection,
    statement_commitment: &[u8; 32],
) -> ApntResult<Vec<u8>> {
    if designated_verifier_input as usize >= projection.inputs.len() {
        return Err(err(
            "settlement projection designated verifier input is out of range",
        ));
    }
    let mut output = Vec::new();
    output.extend_from_slice(SETTLEMENT_PROJECTION_MAGIC);
    output.push(SETTLEMENT_PROJECTION_VERSION);
    write_u32_le(&mut output, projection.transaction_version);
    write_u32_le(&mut output, projection.locktime);
    write_u32_le(&mut output, projection.inputs.len() as u32);
    write_u32_le(&mut output, designated_verifier_input);
    for (index, input) in projection.inputs.iter().enumerate() {
        if index == designated_verifier_input as usize {
            continue;
        }
        encode_wire_outpoint(&input.outpoint, &mut output);
        write_u32_le(&mut output, input.sequence);
        write_u64_le(&mut output, input.value);
    }
    write_u32_le(&mut output, projection.outputs.len() as u32);
    for projected in &projection.outputs {
        let locking = materialize_output_locking_bytecode(projected, statement_commitment)?;
        write_u64_le(&mut output, projected.value);
        write_u32_le(&mut output, locking.len() as u32);
        output.extend_from_slice(&locking);
    }
    write_u64_le(&mut output, network_fee);
    Ok(output)
}

fn derive_settlement_projection(
    designated_verifier_input: u32,
    network_fee: u64,
    projection: &Projection,
    statement_commitment: &[u8; 32],
) -> ApntResult<[u8; 32]> {
    let transcript = serialize_settlement_projection(
        designated_verifier_input,
        network_fee,
        projection,
        statement_commitment,
    )?;
    sha256_domain_separated(SETTLEMENT_PROJECTION_COMMITMENT_DOMAIN, &transcript)
        .map_err(|_| err("settlement projection commitment derivation failed"))
}

fn encode_wire_outpoint(outpoint: &Outpoint, output: &mut Vec<u8>) {
    let mut wire_txid = outpoint.txid;
    wire_txid.reverse();
    output.extend_from_slice(&wire_txid);
    write_u32_le(output, outpoint.vout);
}

fn derive_batch_nonce(statement: &Statement) -> ApntResult<[u8; 32]> {
    let mut outpoints = statement
        .projection
        .inputs
        .iter()
        .map(|input| {
            let mut encoded = Vec::with_capacity(36);
            encode_wire_outpoint(&input.outpoint, &mut encoded);
            encoded
        })
        .collect::<Vec<_>>();
    outpoints.sort();
    if outpoints.windows(2).any(|pair| pair[0] == pair[1]) {
        return Err(err("statement batch nonce has duplicate outpoints"));
    }
    let mut payload = Vec::new();
    payload.extend_from_slice(b"APNTBTV2");
    payload.extend_from_slice(&[2, statement.network, 2, statement.mode]);
    payload.extend_from_slice(&statement.privacy_profile);
    payload.extend_from_slice(&statement.proof_relation);
    payload.extend_from_slice(&statement.sp1_program);
    write_u32_le(&mut payload, outpoints.len() as u32);
    for outpoint in outpoints {
        payload.extend_from_slice(&outpoint);
    }
    sha256_domain_separated(BATCH_NONCE_DOMAIN, &payload)
        .map_err(|_| err("statement batch nonce derivation failed"))
}

fn derive_creation_scope(statement: &Statement) -> ApntResult<[u8; 32]> {
    let mut payload = Vec::new();
    payload.extend_from_slice(b"APNTCSV2");
    payload.extend_from_slice(&[2, statement.network, 2, statement.mode]);
    payload.extend_from_slice(&statement.privacy_profile);
    payload.extend_from_slice(&statement.batch_nonce);
    payload.extend_from_slice(&statement.proof_relation);
    payload.extend_from_slice(&statement.sp1_program);
    write_u32_le(&mut payload, statement.designated_verifier_input);
    write_u32_le(&mut payload, statement.projection.transaction_version);
    write_u32_le(&mut payload, statement.projection.locktime);
    write_u32_le(&mut payload, statement.projection.inputs.len() as u32);
    for input in &statement.projection.inputs {
        encode_wire_outpoint(&input.outpoint, &mut payload);
        write_u32_le(&mut payload, input.sequence);
        write_u64_le(&mut payload, input.value);
        write_u32_le(&mut payload, input.locking_bytecode.len() as u32);
        payload.extend_from_slice(&input.locking_bytecode);
        payload.extend_from_slice(&[0, input.role]);
    }
    write_u32_le(&mut payload, statement.created_cells.len() as u32);
    for cell in &statement.created_cells {
        let output = statement
            .projection
            .outputs
            .get(cell.index as usize)
            .ok_or_else(|| err("statement creation scope references a missing output"))?;
        write_u32_le(&mut payload, cell.index);
        write_u64_le(&mut payload, output.value);
        payload.extend_from_slice(&cell.locking_profile);
    }
    sha256_domain_separated(CREATION_SCOPE_DOMAIN, &payload)
        .map_err(|_| err("statement creation scope derivation failed"))
}

fn validate_statement(statement: &Statement, profile: &PrivacyProfileV2) -> ApntResult<()> {
    if statement.mode != 0
        || statement.creation_scope.is_none()
        || statement.recovery_packet_bin_root.is_none()
        || statement.consumed_logical.is_empty()
        || statement.created_logical.is_empty()
        || statement.consumed_cells.is_empty()
        || statement.created_cells.is_empty()
    {
        return Err(err("statement private-transition shape is invalid"));
    }
    if statement.designated_verifier_input as usize >= statement.projection.inputs.len()
        || statement
            .projection
            .outputs
            .iter()
            .any(|output| output.role == 2)
        || !statement
            .projection
            .outputs
            .iter()
            .any(|output| output.role == 1)
    {
        return Err(err("statement projection mode shape is invalid"));
    }
    if statement.privacy_profile != profile.semantic_profile_id
        || statement.proof_relation != profile.proof_relation_id
        || statement.proof_relation != RELATION_CONTRACT_COMMITMENT
    {
        return Err(err("statement artifact identity is invalid"));
    }
    let flat_profile = profile.flat_service_fee;
    if statement.batch_nonce != derive_batch_nonce(statement)?
        || statement.creation_scope != Some(derive_creation_scope(statement)?)
    {
        return Err(err("statement deterministic nonce or scope is invalid"));
    }
    let backing_inputs = statement
        .projection
        .inputs
        .iter()
        .enumerate()
        .filter_map(|(index, input)| (input.role == 0).then_some(index as u32))
        .collect::<Vec<_>>();
    let backing_outputs = statement
        .projection
        .outputs
        .iter()
        .enumerate()
        .filter_map(|(index, output)| (output.role == 0).then_some(index as u32))
        .collect::<Vec<_>>();
    if backing_inputs
        != statement
            .consumed_cells
            .iter()
            .map(|cell| cell.index)
            .collect::<Vec<_>>()
        || backing_outputs
            != statement
                .created_cells
                .iter()
                .map(|cell| cell.index)
                .collect::<Vec<_>>()
        || statement
            .consumed_cells
            .iter()
            .chain(&statement.created_cells)
            .any(|cell| cell.locking_profile != profile.seal_locking_profile_id)
    {
        return Err(err("statement backing tuple coverage is invalid"));
    }
    let minimum_consumed_cells = statement.consumed_logical.len()
        * profile.minimum_cells_per_logical_note
        + profile.minimum_surplus_cells_per_group;
    let minimum_created_cells = statement.created_logical.len()
        * profile.minimum_cells_per_logical_note
        + profile.minimum_surplus_cells_per_group;
    if statement.consumed_logical.len() < profile.minimum_consumed_logical_notes
        || statement.created_logical.len() != profile.exact_created_logical_notes
        || statement.consumed_cells.len() < profile.minimum_consumed_backing_cells
        || statement.created_cells.len() < profile.minimum_created_backing_cells
        || statement.created_cells.len() > profile.maximum_created_backing_cells
        || statement.consumed_cells.len() < minimum_consumed_cells
        || statement.created_cells.len() < minimum_created_cells
        || statement.consumed_cells.iter().any(|cell| {
            statement.projection.inputs[cell.index as usize].value != profile.cell_value_sats
        })
        || statement.created_cells.iter().any(|cell| {
            statement.projection.outputs[cell.index as usize].value != profile.cell_value_sats
        })
    {
        return Err(err("statement privacy minima or denomination is invalid"));
    }
    let input_total = checked_satoshi_sum(
        &statement
            .projection
            .inputs
            .iter()
            .map(|input| input.value)
            .collect::<Vec<_>>(),
    )
    .map_err(|_| err("statement public input total overflows"))?;
    let output_total = checked_satoshi_sum(
        &statement
            .projection
            .outputs
            .iter()
            .map(|output| output.value)
            .collect::<Vec<_>>(),
    )
    .map_err(|_| err("statement public output total overflows"))?;
    if input_total != statement.total_input
        || output_total != statement.total_output
        || statement.network_fee == 0
        || statement.network_fee > input_total
        || input_total - statement.network_fee != output_total
    {
        return Err(err("statement public fee equation is invalid"));
    }
    let gap = statement
        .consumed_cells
        .len()
        .checked_sub(statement.created_cells.len())
        .ok_or_else(|| err("statement private backing gap is invalid"))? as u64;
    let fee_total = checked_satoshi_add(statement.network_fee, statement.service_fee)
        .map_err(|_| err("statement authorized fee overflows"))?;
    if gap.checked_mul(profile.cell_value_sats) != Some(fee_total) {
        return Err(err("statement split fee equation is invalid"));
    }
    let fee_outputs = statement
        .projection
        .outputs
        .iter()
        .enumerate()
        .filter_map(|(index, output)| (output.role == 3).then_some((index as u32, output.value)))
        .collect::<Vec<_>>();
    if (!flat_profile
        && (statement.service_fee != 0
            || statement.aggregator_fee_output.is_some()
            || !fee_outputs.is_empty()))
        || (flat_profile
            && (statement.service_fee == 0
                || statement.service_fee
                    != profile
                        .flat_fee_per_consumed_logical_note_sats
                        .checked_mul(statement.consumed_logical.len() as u64)
                        .ok_or_else(|| err("statement aggregator service fee overflows"))?
                || fee_outputs.len() != 1
                || Some(fee_outputs[0].0) != statement.aggregator_fee_output
                || fee_outputs[0].1 != statement.service_fee))
    {
        return Err(err("statement aggregator service fee is invalid"));
    }
    let verifier_only_total = checked_satoshi_sum(
        &statement
            .projection
            .inputs
            .iter()
            .filter(|input| input.role == 1)
            .map(|input| input.value)
            .collect::<Vec<_>>(),
    )
    .map_err(|_| err("statement verifier collateral overflows"))?;
    let carrier_total = checked_satoshi_sum(
        &statement
            .projection
            .outputs
            .iter()
            .filter(|output| output.role == 1)
            .map(|output| output.value)
            .collect::<Vec<_>>(),
    )
    .map_err(|_| err("statement recovery collateral overflows"))?;
    // Collateral pass-through, corrected for the separated Plane-A role. It was
    // `verifier-only == recovery-carriers`, which only held while the Plane-A
    // output was implicitly a created backing cell and therefore paid for out of
    // the note-backing side. With its own role its value is pass-through exactly
    // like a carrier's.
    let boundary_outputs = statement
        .projection
        .outputs
        .iter()
        .filter(|output| output.role == 4)
        .collect::<Vec<_>>();
    if boundary_outputs.len() > 1 {
        return Err(err("statement transition-boundary cardinality is invalid"));
    }
    let boundary_total = checked_satoshi_sum(
        &boundary_outputs
            .iter()
            .map(|output| output.value)
            .collect::<Vec<_>>(),
    )
    .map_err(|_| err("statement transition-boundary collateral overflows"))?;
    let pass_through_total = checked_satoshi_add(carrier_total, boundary_total)
        .map_err(|_| err("statement recovery collateral overflows"))?;
    if verifier_only_total != pass_through_total {
        return Err(err("statement recovery collateral pass-through is invalid"));
    }
    // design.md §3.2's in-circuit enforcement level, public half: every created
    // private-backing output must BE the created-note seal. Only the 32-byte
    // exit-key-hash region is free here; tying that region to the recipient's
    // real key needs `E_i` and happens in `validate_created_exit_authority`.
    if statement.projection.outputs.iter().any(|output| {
        output.role == 0
            && match_created_note_seal(&output.locking_template, &profile.seal_skeleton).is_none()
    }) {
        return Err(err("statement created seal template is invalid"));
    }
    if statement.projection.inputs.iter().any(|input| {
        input.role == 0
            && match_created_note_seal(&input.locking_bytecode, &profile.seal_skeleton).is_none()
    }) {
        return Err(err("statement consumed seal template is invalid"));
    }
    let carrier_count = statement
        .projection
        .outputs
        .iter()
        .filter(|output| output.role == 1)
        .count();
    if statement.created_logical.len() != profile.recovery_packet_count
        || statement.created_cells.len() > profile.recovery_maximum_created_backing_cells
        || carrier_count != profile.recovery_carrier_count
        || profile.recovery_packet_bin_bytes != RECOVERY_V1_PACKET_BIN_BYTES
    {
        return Err(err("statement recovery carriage shape is invalid"));
    }
    Ok(())
}

fn parse_logical_witness(reader: &mut Reader<'_>, expected_role: u8) -> ApntResult<LogicalWitness> {
    let role = reader.u8()?;
    if role != expected_role {
        return Err(err("logical witness has the wrong collection role"));
    }
    Ok(LogicalWitness {
        role,
        statement_commitment: reader.bytes32()?,
        logical_commitment: reader.bytes32()?,
        note: parse_bundle_backed_note_v1(reader.blob()?)
            .map_err(|_| err("logical note opening is malformed"))?,
        bundle: parse_backing_bundle_v1(reader.blob()?)
            .map_err(|_| err("logical bundle opening is malformed"))?,
    })
}

fn parse_consumed_cell_witness(reader: &mut Reader<'_>) -> ApntResult<ConsumedCellWitness> {
    let role = reader.u8()?;
    if role != 0 {
        return Err(err("consumed cell witness has the wrong collection role"));
    }
    Ok(ConsumedCellWitness {
        role,
        statement_commitment: reader.bytes32()?,
        logical_commitment: reader.bytes32()?,
        source: Outpoint {
            txid: reader.bytes32()?,
            vout: reader.u32()?,
        },
        input_index: reader.u32()?,
        cell_commitment: reader.bytes32()?,
        opening: parse_backing_seal_cell_v1(reader.blob()?)
            .map_err(|_| err("consumed backing-cell opening is malformed"))?,
    })
}

fn parse_created_cell_witness(reader: &mut Reader<'_>) -> ApntResult<CreatedCellWitness> {
    let role = reader.u8()?;
    if role != 1 {
        return Err(err("created cell witness has the wrong collection role"));
    }
    Ok(CreatedCellWitness {
        role,
        statement_commitment: reader.bytes32()?,
        logical_commitment: reader.bytes32()?,
        output_index: reader.u32()?,
        cell_commitment: reader.bytes32()?,
        opening: parse_backing_seal_cell_v1(reader.blob()?)
            .map_err(|_| err("created backing-cell opening is malformed"))?,
    })
}

fn parse_exit_authority_witness(reader: &mut Reader<'_>) -> ApntResult<ExitAuthorityWitness> {
    let statement_commitment = reader.bytes32()?;
    let output_index = reader.u32()?;
    let mut exit_public_key = [0u8; EXIT_AUTHORITY_PUBLIC_KEY_BYTES];
    exit_public_key.copy_from_slice(reader.take(EXIT_AUTHORITY_PUBLIC_KEY_BYTES)?);
    Ok(ExitAuthorityWitness {
        statement_commitment,
        output_index,
        exit_public_key,
    })
}

fn parse_authority(reader: &mut Reader<'_>) -> ApntResult<AuthorityWitness> {
    Ok(AuthorityWitness {
        statement_commitment: reader.bytes32()?,
        logical_commitment: reader.bytes32()?,
        note_commitment: reader.bytes32()?,
        bundle_commitment: reader.bytes32()?,
        owner_public_key: reader.bytes32()?,
        authorization_signature: reader.bytes64()?,
    })
}

fn parse_nullifier(reader: &mut Reader<'_>) -> ApntResult<NullifierWitness> {
    Ok(NullifierWitness {
        statement_commitment: reader.bytes32()?,
        logical_commitment: reader.bytes32()?,
        note_commitment: reader.bytes32()?,
        bundle_commitment: reader.bytes32()?,
        owner_public_key: reader.bytes32()?,
        derived_nullifier: reader.bytes32()?,
    })
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct DescriptorBytesJson {
    #[serde(rename = "$bytes")]
    value: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct DescriptorKemJson {
    algorithm: String,
    #[serde(rename = "publicKey")]
    public_key: DescriptorBytesJson,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct DescriptorAuthorityJson {
    algorithm: String,
    #[serde(rename = "ownerPublicKeyX32")]
    owner_public_key: DescriptorBytesJson,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct DescriptorReceiveJson {
    diversifier: DescriptorBytesJson,
    #[serde(rename = "noteSalt")]
    note_salt: DescriptorBytesJson,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct DescriptorPolicyJson {
    #[serde(rename = "expiresAtUnix", skip_serializing_if = "Option::is_none")]
    expires_at_unix: Option<u64>,
    kind: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct DescriptorJson {
    #[serde(rename = "descriptorId")]
    descriptor_id: String,
    domain: String,
    kem: DescriptorKemJson,
    network: String,
    #[serde(rename = "noteAuthority")]
    note_authority: DescriptorAuthorityJson,
    #[serde(rename = "noteReceive")]
    note_receive: DescriptorReceiveJson,
    #[serde(rename = "receivePolicy")]
    receive_policy: DescriptorPolicyJson,
    version: u8,
}

fn decode_lower_hex(value: &str, expected_bytes: Option<usize>) -> ApntResult<Vec<u8>> {
    if !value.len().is_multiple_of(2)
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    {
        return Err(err("descriptor contains noncanonical hexadecimal"));
    }
    let decoded = (0..value.len())
        .step_by(2)
        .map(|index| u8::from_str_radix(&value[index..index + 2], 16))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| err("descriptor hexadecimal decode failed"))?;
    if expected_bytes.is_some_and(|expected| decoded.len() != expected) {
        return Err(err("descriptor hexadecimal field has the wrong length"));
    }
    Ok(decoded)
}

fn parse_descriptor(bytes: &[u8]) -> ApntResult<OneTimeDescriptorV0> {
    let descriptor: DescriptorJson = serde_json::from_slice(bytes)
        .map_err(|_| err("one-time receive descriptor is malformed deterministic JSON"))?;
    if serde_json::to_vec(&descriptor)
        .map_err(|_| err("one-time receive descriptor serialization failed"))?
        != bytes
    {
        return Err(err("one-time receive descriptor is not canonical"));
    }
    if descriptor.version != 0
        || descriptor.domain != "bch-cloak-apnt-v0:one-time-receive-descriptor"
        || descriptor.kem.algorithm != "ML-KEM-768"
        || descriptor.note_authority.algorithm != "BIP340-secp256k1"
        || descriptor.receive_policy.kind != "single-use"
        || !matches!(
            descriptor.network.as_str(),
            "chipnet" | "mainnet" | "regtest"
        )
        || descriptor.descriptor_id.is_empty()
        || descriptor
            .receive_policy
            .expires_at_unix
            .is_some_and(|value| value > 9_007_199_254_740_991)
    {
        return Err(err("one-time receive descriptor has unsupported fields"));
    }
    let public_key: [u8; MLKEM768_PUBLIC_KEY_BYTES] = decode_lower_hex(
        &descriptor.kem.public_key.value,
        Some(MLKEM768_PUBLIC_KEY_BYTES),
    )?
    .try_into()
    .expect("checked public key length");
    let owner_public_key: [u8; 32] =
        decode_lower_hex(&descriptor.note_authority.owner_public_key.value, Some(32))?
            .try_into()
            .expect("checked owner key length");
    decode_lower_hex(&descriptor.note_receive.diversifier.value, None)?;
    decode_lower_hex(&descriptor.note_receive.note_salt.value, None)?;
    Ok(OneTimeDescriptorV0 {
        encoded: bytes.to_vec(),
        network: descriptor.network,
        descriptor_id: descriptor.descriptor_id,
        public_key,
        owner_public_key,
    })
}

fn parse_recovery_witness_v1(bytes: &[u8]) -> ApntResult<RecoveryWitnessV1> {
    let mut reader = Reader::new(bytes);
    reader.expect(b"APNTRWV1")?;
    if reader.u8()? != 1 {
        return Err(err("APNTRWV1 has unsupported version"));
    }
    let result = RecoveryWitnessV1 {
        statement_commitment: reader.bytes32()?,
        logical_note_commitment: reader.bytes32()?,
        created_note_commitment: reader.bytes32()?,
        creation_scope: reader.bytes32()?,
        packet_index: reader.u32()?,
        descriptor: parse_descriptor(reader.blob()?)?,
        encapsulation_seed: reader.bytes32()?,
    };
    reader.finish()?;
    Ok(result)
}

fn parse_recovery_packet_table_v1(bytes: &[u8]) -> ApntResult<RecoveryPacketTableV1> {
    let mut reader = Reader::new(bytes);
    reader.expect(b"APNTRTV1")?;
    if reader.u8()? != 1 {
        return Err(err("APNTRTV1 has unsupported version"));
    }
    let statement_commitment = reader.bytes32()?;
    let packet_count = reader.bounded_count(MAX_LOGICAL_NOTES_PER_SIDE)?;
    let mut encoded_packets = Vec::with_capacity(packet_count as usize);
    for _ in 0..packet_count {
        encoded_packets.push(reader.blob()?.to_vec());
    }
    let hash_count = reader.bounded_count(MAX_LOGICAL_NOTES_PER_SIDE)?;
    let mut packet_hashes = Vec::with_capacity(hash_count as usize);
    for _ in 0..hash_count {
        packet_hashes.push(reader.bytes32()?);
    }
    let packet_bin = reader.take(RECOVERY_V1_PACKET_BIN_BYTES)?.to_vec();
    let packet_bin_root = reader.bytes32()?;
    reader.finish()?;
    Ok(RecoveryPacketTableV1 {
        statement_commitment,
        encoded_packets,
        packet_hashes,
        packet_bin,
        packet_bin_root,
    })
}

fn parse_proving_input(bytes: &[u8]) -> ApntResult<ProvingInput> {
    let mut reader = Reader::new(bytes);
    reader.expect(PROVING_INPUT_MAGIC)?;
    if reader.u8()? != PROVING_INPUT_VERSION
        || reader.u8()? != RELATION_VERSION
        || reader.text_u16()? != RELATION_DOMAIN
    {
        return Err(err("canonical proving input has an unsupported identity"));
    }
    let profile_bytes = reader.blob()?;
    let profile = parse_privacy_profile_v2(profile_bytes)
        .map_err(|_| err("canonical Profile V2 is invalid"))?;
    let expected_statement_commitment = reader.bytes32()?;
    let statement = parse_statement(reader.blob()?, &profile)
        .map_err(|_| err("canonical statement is invalid"))?;

    let consumed_logical_count = reader.bounded_count(MAX_LOGICAL_NOTES_PER_SIDE)?;
    let mut consumed_logical = Vec::with_capacity(consumed_logical_count as usize);
    let mut consumed_logical_order = Vec::with_capacity(consumed_logical_count as usize);
    for _ in 0..consumed_logical_count {
        let start = reader.offset;
        let witness = parse_logical_witness(&mut reader, 0)?;
        let end = reader.offset;
        consumed_logical_order.push((witness.logical_commitment, &bytes[start..end]));
        consumed_logical.push(witness);
    }
    if !canonical_wire_order(&consumed_logical_order) {
        return Err(err(
            "canonical proving input has noncanonical consumed logical witness ordering",
        ));
    }
    let created_logical_count = reader.bounded_count(MAX_LOGICAL_NOTES_PER_SIDE)?;
    let mut created_logical = Vec::with_capacity(created_logical_count as usize);
    let mut created_logical_order = Vec::with_capacity(created_logical_count as usize);
    for _ in 0..created_logical_count {
        let start = reader.offset;
        let witness = parse_logical_witness(&mut reader, 1)?;
        let end = reader.offset;
        created_logical_order.push((witness.logical_commitment, &bytes[start..end]));
        created_logical.push(witness);
    }
    if !canonical_wire_order(&created_logical_order) {
        return Err(err(
            "canonical proving input has noncanonical created logical witness ordering",
        ));
    }
    let consumed_cell_count = reader.bounded_count(MAX_BACKING_CELLS_PER_SIDE)?;
    let mut consumed_cells = Vec::with_capacity(consumed_cell_count as usize);
    let mut consumed_cell_order = Vec::with_capacity(consumed_cell_count as usize);
    for _ in 0..consumed_cell_count {
        let start = reader.offset;
        let witness = parse_consumed_cell_witness(&mut reader)?;
        let end = reader.offset;
        consumed_cell_order.push((
            (witness.input_index, witness.source.txid),
            &bytes[start..end],
        ));
        consumed_cells.push(witness);
    }
    if !canonical_wire_order(&consumed_cell_order) {
        return Err(err(
            "canonical proving input has noncanonical consumed cell witness ordering",
        ));
    }
    let created_cell_count = reader.bounded_count(MAX_BACKING_CELLS_PER_SIDE)?;
    let mut created_cells = Vec::with_capacity(created_cell_count as usize);
    let mut created_cell_order = Vec::with_capacity(created_cell_count as usize);
    for _ in 0..created_cell_count {
        let start = reader.offset;
        let witness = parse_created_cell_witness(&mut reader)?;
        let end = reader.offset;
        created_cell_order.push((witness.output_index, &bytes[start..end]));
        created_cells.push(witness);
    }
    if !canonical_wire_order(&created_cell_order) {
        return Err(err(
            "canonical proving input has noncanonical created cell witness ordering",
        ));
    }
    // One PUBLIC per-cell exit key per created backing cell. The scalar `e_i`
    // is never present, which is what makes this witness safe to hand a
    // delegated prover.
    let exit_authority_count = reader.bounded_count(MAX_BACKING_CELLS_PER_SIDE)?;
    let mut exit_authorities = Vec::with_capacity(exit_authority_count as usize);
    let mut exit_authority_order = Vec::with_capacity(exit_authority_count as usize);
    for _ in 0..exit_authority_count {
        let start = reader.offset;
        let witness = parse_exit_authority_witness(&mut reader)?;
        let end = reader.offset;
        exit_authority_order.push((witness.output_index, &bytes[start..end]));
        exit_authorities.push(witness);
    }
    if !canonical_wire_order(&exit_authority_order) {
        return Err(err(
            "canonical proving input has noncanonical exit-authority witness ordering",
        ));
    }
    let authority_count = reader.bounded_count(MAX_LOGICAL_NOTES_PER_SIDE)?;
    let mut authorities = Vec::with_capacity(authority_count as usize);
    let mut authority_order = Vec::with_capacity(authority_count as usize);
    for _ in 0..authority_count {
        let start = reader.offset;
        let witness = parse_authority(&mut reader)?;
        let end = reader.offset;
        authority_order.push((witness.logical_commitment, &bytes[start..end]));
        authorities.push(witness);
    }
    if !canonical_wire_order(&authority_order) {
        return Err(err(
            "canonical proving input has noncanonical authority witness ordering",
        ));
    }
    let nullifier_count = reader.bounded_count(MAX_LOGICAL_NOTES_PER_SIDE)?;
    let mut nullifiers = Vec::with_capacity(nullifier_count as usize);
    let mut nullifier_order = Vec::with_capacity(nullifier_count as usize);
    for _ in 0..nullifier_count {
        let start = reader.offset;
        let witness = parse_nullifier(&mut reader)?;
        let end = reader.offset;
        nullifier_order.push((witness.logical_commitment, &bytes[start..end]));
        nullifiers.push(witness);
    }
    if !canonical_wire_order(&nullifier_order) {
        return Err(err(
            "canonical proving input has noncanonical nullifier witness ordering",
        ));
    }
    let recovery_count = reader.bounded_count(MAX_LOGICAL_NOTES_PER_SIDE)?;
    let mut recovery = Vec::with_capacity(recovery_count as usize);
    let mut recovery_order = Vec::with_capacity(recovery_count as usize);
    for _ in 0..recovery_count {
        let start = reader.offset;
        let witness = parse_recovery_witness_v1(reader.blob()?)
            .map_err(|_| err("recovery witness is malformed"))?;
        let end = reader.offset;
        recovery_order.push((
            (witness.packet_index, witness.logical_note_commitment),
            &bytes[start..end],
        ));
        recovery.push(witness);
    }
    if !canonical_wire_order(&recovery_order) {
        return Err(err(
            "canonical proving input has noncanonical recovery witness ordering",
        ));
    }
    let recovery_table = parse_recovery_packet_table_v1(reader.blob()?)
        .map_err(|_| err("recovery packet table is malformed"))?;
    reader.finish()?;
    Ok(ProvingInput {
        profile,
        expected_statement_commitment,
        statement,
        consumed_logical,
        created_logical,
        consumed_cells,
        created_cells,
        exit_authorities,
        authorities,
        nullifiers,
        recovery,
        recovery_table,
    })
}

fn statement_counts(statement: &Statement) -> [u32; 4] {
    [
        statement.consumed_logical.len() as u32,
        statement.created_logical.len() as u32,
        statement.consumed_cells.len() as u32,
        statement.created_cells.len() as u32,
    ]
}

fn statement_identity_tuple(statement: &Statement) -> [[u8; 32]; 3] {
    [
        statement.privacy_profile,
        statement.proof_relation,
        statement.sp1_program,
    ]
}

fn reject(input: &ProvingInput, stage: &str, code: &str) -> PublicResultV1 {
    PublicResultV1::rejected(
        Some(input.statement.commitment),
        Some(input.statement.settlement_projection),
        Some(statement_identity_tuple(&input.statement)),
        statement_counts(&input.statement),
        stage,
        code,
    )
}

fn duplicate_logical(items: &[LogicalWitness]) -> bool {
    let identities = items
        .iter()
        .map(|item| item.logical_commitment)
        .collect::<BTreeSet<_>>();
    identities.len() != items.len()
}

fn validate_logical_witnesses(input: &ProvingInput) -> Option<PublicResultV1> {
    if input.consumed_logical.iter().any(|item| item.role != 0)
        || input.created_logical.iter().any(|item| item.role != 1)
        || input.consumed_cells.iter().any(|item| item.role != 0)
        || input.created_cells.iter().any(|item| item.role != 1)
    {
        return Some(reject(
            input,
            "witness-identity",
            "consumed-created-role-confusion",
        ));
    }
    if input
        .consumed_logical
        .iter()
        .chain(&input.created_logical)
        .any(|item| item.statement_commitment != input.statement.commitment)
        || input
            .consumed_cells
            .iter()
            .any(|item| item.statement_commitment != input.statement.commitment)
        || input
            .created_cells
            .iter()
            .any(|item| item.statement_commitment != input.statement.commitment)
    {
        return Some(reject(
            input,
            "witness-identity",
            "witness-statement-commitment-mismatch",
        ));
    }
    if duplicate_logical(&input.consumed_logical) || duplicate_logical(&input.created_logical) {
        return Some(reject(
            input,
            "witness-identity",
            "duplicate-logical-note-witness-identity",
        ));
    }
    for (actual, expected, missing, extra) in [
        (
            input.consumed_logical.len(),
            input.statement.consumed_logical.len(),
            "missing-consumed-logical-note-witness",
            "extra-consumed-logical-note-witness",
        ),
        (
            input.created_logical.len(),
            input.statement.created_logical.len(),
            "missing-created-logical-note-witness",
            "extra-created-logical-note-witness",
        ),
    ] {
        if actual < expected {
            return Some(reject(input, "witness-identity", missing));
        }
        if actual > expected {
            return Some(reject(input, "witness-identity", extra));
        }
    }
    let expected_consumed = input
        .statement
        .consumed_logical
        .iter()
        .map(|item| item.note_commitment)
        .collect::<BTreeSet<_>>();
    let expected_created = input
        .statement
        .created_logical
        .iter()
        .map(|item| item.note_commitment)
        .collect::<BTreeSet<_>>();
    if input
        .consumed_logical
        .iter()
        .any(|item| !expected_consumed.contains(&item.logical_commitment))
        || input
            .created_logical
            .iter()
            .any(|item| !expected_created.contains(&item.logical_commitment))
    {
        return Some(reject(
            input,
            "witness-identity",
            "logical-note-commitment-identity-mismatch",
        ));
    }
    for (items, consumed) in [
        (&input.consumed_logical, true),
        (&input.created_logical, false),
    ] {
        for item in items {
            if item.bundle.commitment != item.note.backing_bundle_commitment {
                return Some(reject(
                    input,
                    "witness-identity",
                    "logical-note-bundle-commitment-mismatch",
                ));
            }
            if item.note.commitment != item.logical_commitment {
                return Some(reject(
                    input,
                    "witness-identity",
                    if consumed {
                        "consumed-logical-note-opening-commitment-mismatch"
                    } else {
                        "created-logical-note-opening-commitment-mismatch"
                    },
                ));
            }
        }
    }
    // Canonical asset-ID enforcement, promoted from host-only policy into the
    // relation. Conservation used to sum `value_sats` across notes without ever
    // checking they denominated the same asset.
    let canonical_asset_id = sha256_domain_separated(BCH_ASSET_ID_DOMAIN, b"BCH")
        .expect("fixed domain and fixed-size payload");
    for item in input.consumed_logical.iter().chain(&input.created_logical) {
        if item.note.asset_id != canonical_asset_id {
            return Some(reject(input, "witness-identity", "non-canonical-asset-id"));
        }
    }
    // Redundant given the loop above, and evaluated anyway so a future
    // multi-asset revision inherits a meaningful cross-side check.
    let consumed_assets = input
        .consumed_logical
        .iter()
        .map(|item| item.note.asset_id)
        .collect::<BTreeSet<_>>();
    let created_assets = input
        .created_logical
        .iter()
        .map(|item| item.note.asset_id)
        .collect::<BTreeSet<_>>();
    if consumed_assets.len() > 1
        || created_assets.len() > 1
        || created_assets
            .iter()
            .any(|identity| !consumed_assets.contains(identity))
    {
        return Some(reject(
            input,
            "witness-identity",
            "consumed-created-asset-id-mismatch",
        ));
    }
    None
}

fn outpoints_equal(left: &Outpoint, right: &Outpoint) -> bool {
    left.txid == right.txid && left.vout == right.vout
}

fn validate_cell_correspondence(input: &ProvingInput) -> Option<PublicResultV1> {
    let consumed_ids = input
        .consumed_cells
        .iter()
        .map(|item| (item.input_index, item.cell_commitment))
        .collect::<BTreeSet<_>>();
    if consumed_ids.len() != input.consumed_cells.len() {
        return Some(reject(
            input,
            "witness-identity",
            "duplicate-consumed-backing-cell-witness-identity",
        ));
    }
    let created_ids = input
        .created_cells
        .iter()
        .map(|item| (item.output_index, item.cell_commitment))
        .collect::<BTreeSet<_>>();
    if created_ids.len() != input.created_cells.len() {
        return Some(reject(
            input,
            "witness-identity",
            "duplicate-created-backing-cell-witness-identity",
        ));
    }
    for item in &input.consumed_cells {
        let Some(projection) = input
            .statement
            .projection
            .inputs
            .get(item.input_index as usize)
        else {
            return Some(reject(
                input,
                "witness-identity",
                "consumed-backing-cell-input-index-mismatch",
            ));
        };
        if !outpoints_equal(&projection.outpoint, &item.source) {
            return Some(reject(
                input,
                "witness-identity",
                "consumed-backing-cell-source-outpoint-mismatch",
            ));
        }
        if projection.role == 1 {
            return Some(reject(
                input,
                "consumed-bundle",
                "verifier-input-used-as-backing",
            ));
        }
        let Some(expected) = input
            .statement
            .consumed_cells
            .iter()
            .find(|cell| cell.index == item.input_index)
        else {
            return Some(reject(input, "consumed-bundle", "bundle-cell-extra"));
        };
        if item.cell_commitment != expected.cell_commitment {
            return Some(reject(
                input,
                "witness-identity",
                "backing-cell-seal-commitment-mismatch",
            ));
        }
        // Opening-to-public-tuple equality on the locking-profile identity,
        // which neither implementation compared before.
        if item.opening.locking_profile_id != expected.locking_profile {
            return Some(reject(
                input,
                "witness-identity",
                "backing-cell-locking-profile-mismatch",
            ));
        }
        if item.opening.commitment != item.cell_commitment {
            return Some(reject(
                input,
                "witness-identity",
                "backing-cell-opening-commitment-mismatch",
            ));
        }
        // Cell-value binding: the private opening must be an opening OF the
        // public cell it names, at that cell's exact value.
        if item.opening.value_sats != projection.value {
            return Some(reject(
                input,
                "witness-identity",
                "consumed-cell-value-mismatch",
            ));
        }
    }
    for item in &input.created_cells {
        let Some(projection) = input
            .statement
            .projection
            .outputs
            .get(item.output_index as usize)
        else {
            return Some(reject(
                input,
                "witness-identity",
                "created-backing-cell-output-index-mismatch",
            ));
        };
        if projection.role == 1 {
            return Some(reject(
                input,
                "created-bundle",
                "recovery-carrier-used-as-backing",
            ));
        }
        if projection.role == 2 {
            return Some(reject(
                input,
                "created-bundle",
                "transparent-output-used-as-backing",
            ));
        }
        if projection.role == 3 {
            return Some(reject(
                input,
                "created-bundle",
                "aggregator-fee-output-used-as-backing",
            ));
        }
        // Catches the Plane-A transition-boundary role (4) and anything else
        // that is not private-backing, mirroring the TypeScript relation's
        // trailing role guard.
        if projection.role != 0 {
            return Some(reject(input, "created-bundle", "bundle-cell-role-mismatch"));
        }
        let Some(expected) = input
            .statement
            .created_cells
            .iter()
            .find(|cell| cell.index == item.output_index)
        else {
            return Some(reject(input, "created-bundle", "bundle-cell-extra"));
        };
        if item.opening.output_index != item.output_index {
            return Some(reject(
                input,
                "witness-identity",
                "created-backing-cell-output-index-mismatch",
            ));
        }
        if Some(item.opening.creation_scope) != input.statement.creation_scope {
            return Some(reject(
                input,
                "witness-identity",
                "created-backing-cell-creation-scope-mismatch",
            ));
        }
        if item.cell_commitment != expected.cell_commitment {
            return Some(reject(
                input,
                "witness-identity",
                "backing-cell-seal-commitment-mismatch",
            ));
        }
        // Same opening-to-public-tuple gap as the consumed side; see there.
        if item.opening.locking_profile_id != expected.locking_profile {
            return Some(reject(
                input,
                "witness-identity",
                "backing-cell-locking-profile-mismatch",
            ));
        }
        if item.opening.commitment != item.cell_commitment {
            return Some(reject(
                input,
                "witness-identity",
                "backing-cell-opening-commitment-mismatch",
            ));
        }
        if item.opening.value_sats != projection.value {
            return Some(reject(
                input,
                "witness-identity",
                "created-cell-value-mismatch",
            ));
        }
    }
    None
}

/// design.md §3.2's in-circuit enforcement level and §4.3's two-commitments
/// binding, for every created backing cell:
///
/// ```text
/// 1  the projected locking template IS the pinned 128-byte seal skeleton
///    outside its 32-byte hole
/// 2  that hole equals sha256(E_i33)
/// 3  H_domain(E_i33) equals the cell's public exitAuthorityCommitment32
/// 4  every E_i is distinct across created cells
/// ```
///
/// (1) alone only proves a conforming seal committing to SOME key — a payer
/// could commit its own. (3) is what ties the key to the recipient, and because
/// (2) and (3) are over the same witness key the two commitments cannot name
/// different keys. (4) closes the privacy hole per-note keys would open: outside
/// the hole the seal is a deployment constant, so a repeated key gives two cells
/// identical bytecode and publishes the note-to-cell partition.
fn validate_created_exit_authority(input: &ProvingInput) -> Option<PublicResultV1> {
    let mut by_output_index = BTreeMap::new();
    for item in &input.exit_authorities {
        if item.statement_commitment != input.statement.commitment {
            return Some(reject(
                input,
                "created-exit-authority",
                "exit-authority-statement-mismatch",
            ));
        }
        if by_output_index.insert(item.output_index, item).is_some() {
            return Some(reject(
                input,
                "created-exit-authority",
                "exit-authority-material-extra",
            ));
        }
    }
    if input.exit_authorities.len() > input.statement.created_cells.len() {
        return Some(reject(
            input,
            "created-exit-authority",
            "exit-authority-material-extra",
        ));
    }

    let mut seen_public_keys = BTreeSet::new();
    for cell in &input.statement.created_cells {
        let Some(item) = by_output_index.get(&cell.index) else {
            return Some(reject(
                input,
                "created-exit-authority",
                "exit-authority-material-missing",
            ));
        };
        // The library's own decoder, never re-derived curve arithmetic. It
        // rejects uncompressed, x-only, and off-curve encodings.
        if (item.exit_public_key[0] != 0x02 && item.exit_public_key[0] != 0x03)
            || k256::PublicKey::from_sec1_bytes(&item.exit_public_key).is_err()
        {
            return Some(reject(
                input,
                "created-exit-authority",
                "exit-authority-material-malformed",
            ));
        }
        if !seen_public_keys.insert(item.exit_public_key) {
            return Some(reject(
                input,
                "created-exit-authority",
                "exit-authority-public-key-duplicate",
            ));
        }
        let Ok(derived_commitment) = sha256_domain_separated(
            ONE_TIME_EXIT_AUTHORITY_COMMITMENT_DOMAIN,
            &item.exit_public_key,
        ) else {
            return Some(reject(
                input,
                "created-exit-authority",
                "exit-authority-material-malformed",
            ));
        };
        if Some(derived_commitment) != cell.exit_authority_commitment {
            return Some(reject(
                input,
                "created-exit-authority",
                "exit-authority-commitment-mismatch",
            ));
        }
        let Some(projection) = input.statement.projection.outputs.get(cell.index as usize) else {
            return Some(reject(
                input,
                "witness-identity",
                "created-backing-cell-output-index-mismatch",
            ));
        };
        let Some(committed_exit_key_hash) =
            match_created_note_seal(&projection.locking_template, &input.profile.seal_skeleton)
        else {
            return Some(reject(
                input,
                "created-exit-authority",
                "created-seal-template-mismatch",
            ));
        };
        // Plain SHA-256 over `E_i33`, deliberately not the domain-separated
        // commitment: the on-chain value must not be an oracle for the
        // in-circuit one.
        if committed_exit_key_hash != sha256_raw(&item.exit_public_key) {
            return Some(reject(
                input,
                "created-exit-authority",
                "created-seal-exit-key-hash-mismatch",
            ));
        }
    }
    None
}

fn member_matches_opening(bundle: &BackingBundleV1, opening: &BackingSealCellOpeningV1) -> bool {
    bundle.members.iter().any(|member| {
        opening.creation_scope == bundle.creation_scope
            && opening.output_index == member.output_index
            && opening.value_sats == member.value_sats
            && opening.locking_profile_id == member.locking_profile_id
            && opening.assignment_blinder == member.assignment_blinder
    })
}

fn validate_bundle_side(
    input: &ProvingInput,
    logical: &[LogicalWitness],
    cells: &[(u32, [u8; 32], [u8; 32], &BackingSealCellOpeningV1)],
    expected_indexes: &[u32],
    stage: &str,
) -> Option<PublicResultV1> {
    let logical_ids = logical
        .iter()
        .map(|item| item.logical_commitment)
        .collect::<BTreeSet<_>>();
    if cells
        .iter()
        .any(|(_, logical_id, _, _)| !logical_ids.contains(logical_id))
    {
        return Some(reject(
            input,
            stage,
            "backing-cell-logical-note-assignment-mismatch",
        ));
    }
    let mut assigned_public = BTreeMap::<u32, usize>::new();
    for note in logical {
        if note.bundle.members.is_empty() {
            return Some(reject(input, stage, "empty-bundle"));
        }
        let assigned = cells
            .iter()
            .filter(|(_, logical_id, _, _)| *logical_id == note.logical_commitment)
            .collect::<Vec<_>>();
        if assigned.len() < note.bundle.members.len() {
            return Some(reject(input, stage, "bundle-cell-missing"));
        }
        if assigned.len() > note.bundle.members.len() {
            return Some(reject(input, stage, "bundle-cell-extra"));
        }
        let mut member_ids = BTreeSet::new();
        for (public_index, _, _, opening) in assigned {
            if !member_matches_opening(&note.bundle, opening) {
                return Some(reject(input, stage, "bundle-cell-extra"));
            }
            if !member_ids.insert((opening.creation_scope, opening.output_index)) {
                return Some(reject(input, stage, "bundle-not-disjoint"));
            }
            *assigned_public.entry(*public_index).or_default() += 1;
        }
        let Ok(bundle_total) = checked_satoshi_sum(
            &note
                .bundle
                .members
                .iter()
                .map(|member| member.value_sats)
                .collect::<Vec<_>>(),
        ) else {
            return Some(reject(
                input,
                "private-value-arithmetic",
                "private-value-sum-overflow",
            ));
        };
        if bundle_total != note.note.value_sats {
            return Some(reject(input, stage, "note-backing-mismatch"));
        }
    }
    if assigned_public.values().any(|count| *count != 1) {
        return Some(reject(input, stage, "bundle-not-disjoint"));
    }
    if expected_indexes
        .iter()
        .any(|index| !assigned_public.contains_key(index))
    {
        return Some(reject(input, stage, "bundle-cell-missing"));
    }
    if assigned_public
        .keys()
        .any(|index| !expected_indexes.contains(index))
    {
        return Some(reject(input, stage, "bundle-cell-extra"));
    }
    None
}

fn logical_map(items: &[LogicalWitness]) -> BTreeMap<[u8; 32], &LogicalWitness> {
    items
        .iter()
        .map(|item| (item.logical_commitment, item))
        .collect()
}

fn validate_authority(input: &ProvingInput) -> Option<PublicResultV1> {
    if input.authorities.len() < input.consumed_logical.len() {
        return Some(reject(
            input,
            "consumed-authority",
            "authority-material-missing",
        ));
    }
    if input.authorities.len() > input.consumed_logical.len() {
        return Some(reject(
            input,
            "consumed-authority",
            "authority-material-malformed",
        ));
    }
    let logical = logical_map(&input.consumed_logical);
    let mut seen = BTreeSet::new();
    for authority in &input.authorities {
        if authority.statement_commitment != input.statement.commitment {
            return Some(reject(
                input,
                "consumed-authority",
                "authority-statement-mismatch",
            ));
        }
        if !seen.insert(authority.logical_commitment) {
            return Some(reject(
                input,
                "consumed-authority",
                "authority-note-mismatch",
            ));
        }
        let Some(note) = logical.get(&authority.logical_commitment) else {
            return Some(reject(
                input,
                "consumed-authority",
                "authority-note-mismatch",
            ));
        };
        if authority.note_commitment != note.logical_commitment {
            return Some(reject(
                input,
                "consumed-authority",
                "authority-note-mismatch",
            ));
        }
        if authority.bundle_commitment != note.note.backing_bundle_commitment {
            return Some(reject(
                input,
                "consumed-authority",
                "authority-bundle-mismatch",
            ));
        }
        let owner = sha256_domain_separated(OWNER_AUTHORITY_DOMAIN, &authority.owner_public_key)
            .expect("fixed domain and fixed-size payload");
        if owner != note.note.owner_commitment {
            return Some(reject(
                input,
                "consumed-authority",
                "authority-commitment-mismatch",
            ));
        }
        // `P` binds identity; only the signature binds AUTHORITY. A malformed
        // key is rejected before verification so it can never be mistaken for
        // a merely-wrong signature.
        let Ok(verifying_key) = SchnorrVerifyingKey::from_bytes(&authority.owner_public_key) else {
            return Some(reject(
                input,
                "consumed-authority",
                "authority-public-key-malformed",
            ));
        };
        let message = spend_authorization_message(
            &input.statement.commitment,
            &authority.note_commitment,
            &authority.bundle_commitment,
        );
        let Ok(signature) = SchnorrSignature::try_from(&authority.authorization_signature[..])
        else {
            return Some(reject(
                input,
                "consumed-authority",
                "authority-signature-invalid",
            ));
        };
        if verifying_key.verify_raw(&message, &signature).is_err() {
            return Some(reject(
                input,
                "consumed-authority",
                "authority-signature-invalid",
            ));
        }
    }
    None
}

/// The exact 32 bytes a consumed note's owner signs. Mirrors
/// `deriveApntSpendAuthorizationMessageV0` byte for byte: the batch's whole
/// statement commitment plus, redundantly, the exact note.
fn spend_authorization_message(
    statement_commitment: &[u8; 32],
    note_commitment: &[u8; 32],
    bundle_commitment: &[u8; 32],
) -> [u8; 32] {
    let mut payload = [0u8; 96];
    payload[..32].copy_from_slice(statement_commitment);
    payload[32..64].copy_from_slice(note_commitment);
    payload[64..].copy_from_slice(bundle_commitment);
    sha256_domain_separated(SPEND_AUTHORIZATION_MESSAGE_DOMAIN, &payload)
        .expect("fixed domain and fixed-size payload")
}

fn derive_nullifier(
    owner_public_key: &[u8; 32],
    note_commitment: &[u8; 32],
    bundle_commitment: &[u8; 32],
) -> [u8; 32] {
    let mut payload = [0u8; 96];
    payload[..32].copy_from_slice(owner_public_key);
    payload[32..64].copy_from_slice(note_commitment);
    payload[64..].copy_from_slice(bundle_commitment);
    sha256_domain_separated(BUNDLE_NULLIFIER_DOMAIN, &payload)
        .expect("fixed domain and fixed-size payload")
}

fn validate_nullifiers(input: &ProvingInput) -> Option<PublicResultV1> {
    if input.nullifiers.len() < input.consumed_logical.len() {
        return Some(reject(
            input,
            "statement-nullifier-correspondence",
            "statement-nullifier-missing",
        ));
    }
    if input.nullifiers.len() > input.consumed_logical.len() {
        return Some(reject(
            input,
            "statement-nullifier-correspondence",
            "statement-nullifier-extra",
        ));
    }
    let logical = logical_map(&input.consumed_logical);
    let authority_keys = input
        .authorities
        .iter()
        .map(|item| (item.logical_commitment, item.owner_public_key))
        .collect::<BTreeMap<_, _>>();
    let mut seen_notes = BTreeSet::new();
    let mut seen_nullifiers = BTreeSet::new();
    let mut derived_by_note = BTreeMap::new();
    for nullifier in &input.nullifiers {
        if nullifier.statement_commitment != input.statement.commitment {
            return Some(reject(
                input,
                "consumed-nullifier",
                "nullifier-statement-mismatch",
            ));
        }
        let Some(note) = logical.get(&nullifier.logical_commitment) else {
            return Some(reject(
                input,
                "consumed-nullifier",
                "nullifier-note-mismatch",
            ));
        };
        if nullifier.note_commitment != note.logical_commitment {
            return Some(reject(
                input,
                "consumed-nullifier",
                "nullifier-note-mismatch",
            ));
        }
        if nullifier.bundle_commitment != note.note.backing_bundle_commitment {
            return Some(reject(
                input,
                "consumed-nullifier",
                "nullifier-bundle-mismatch",
            ));
        }
        if authority_keys.get(&nullifier.logical_commitment) != Some(&nullifier.owner_public_key) {
            return Some(reject(
                input,
                "consumed-nullifier",
                "nullifier-derivation-mismatch",
            ));
        }
        let derived = derive_nullifier(
            &nullifier.owner_public_key,
            &note.logical_commitment,
            &note.note.backing_bundle_commitment,
        );
        if derived != nullifier.derived_nullifier {
            return Some(reject(
                input,
                "consumed-nullifier",
                "nullifier-derivation-mismatch",
            ));
        }
        if !seen_notes.insert(nullifier.logical_commitment) || !seen_nullifiers.insert(derived) {
            return Some(reject(input, "consumed-nullifier", "nullifier-duplicate"));
        }
        derived_by_note.insert(nullifier.logical_commitment, derived);
    }
    let public_by_note = input
        .statement
        .consumed_logical
        .iter()
        .map(|item| (item.note_commitment, item.nullifier))
        .collect::<BTreeMap<_, _>>();
    let public_values = public_by_note.values().copied().collect::<BTreeSet<_>>();
    let derived_values = derived_by_note.values().copied().collect::<BTreeSet<_>>();
    if derived_values
        .iter()
        .any(|value| !public_values.contains(value))
    {
        return Some(reject(
            input,
            "statement-nullifier-correspondence",
            "statement-nullifier-missing",
        ));
    }
    if public_values
        .iter()
        .any(|value| !derived_values.contains(value))
    {
        return Some(reject(
            input,
            "statement-nullifier-correspondence",
            "statement-nullifier-extra",
        ));
    }
    if derived_by_note
        .iter()
        .any(|(note, value)| public_by_note.get(note) != Some(value))
    {
        return Some(reject(
            input,
            "statement-nullifier-correspondence",
            "statement-nullifier-mismatch",
        ));
    }
    None
}

fn recovery_network_name(network: u8) -> &'static str {
    match network {
        0 => "chipnet",
        1 => "mainnet",
        2 => "regtest",
        _ => unreachable!("statement parser validates network"),
    }
}

fn build_carrier_lock(payload: &[u8]) -> ApntResult<Vec<u8>> {
    if payload.is_empty() || payload.len() > u8::MAX as usize {
        return Err(err("recovery carrier payload length is invalid"));
    }
    let mut lock = Vec::with_capacity(payload.len() + 4);
    if payload.len() <= 75 {
        lock.push(payload.len() as u8);
    } else {
        lock.extend_from_slice(&[0x4c, payload.len() as u8]);
    }
    lock.extend_from_slice(payload);
    lock.extend_from_slice(&[0x75, 0x51]);
    Ok(lock)
}

fn validate_recovery(input: &ProvingInput) -> Option<PublicResultV1> {
    if input.recovery.len() < input.created_logical.len() {
        return Some(reject(
            input,
            "recovery-consistency",
            "recovery-evidence-missing",
        ));
    }
    if input.recovery.len() > input.created_logical.len() {
        return Some(reject(
            input,
            "recovery-consistency",
            "recovery-evidence-extra",
        ));
    }
    if input.recovery_table.statement_commitment != input.statement.commitment {
        return Some(reject(
            input,
            "recovery-consistency",
            "recovery-statement-reference-mismatch",
        ));
    }
    let logical = logical_map(&input.created_logical);
    let public = input
        .statement
        .created_logical
        .iter()
        .map(|item| (item.note_commitment, item))
        .collect::<BTreeMap<_, _>>();
    if input.statement.created_logical.len() != input.profile.recovery_packet_count
        || input.statement.created_cells.len()
            > input.profile.recovery_maximum_created_backing_cells
    {
        return Some(reject(
            input,
            "recovery-consistency",
            "recovery-packet-table-commitment-mismatch",
        ));
    }
    let mut seen_notes = BTreeSet::new();
    let mut descriptor_keys = BTreeSet::new();
    let mut indexed_senders = Vec::new();
    for recovery in &input.recovery {
        if recovery.statement_commitment != input.statement.commitment {
            return Some(reject(
                input,
                "recovery-consistency",
                "recovery-statement-reference-mismatch",
            ));
        }
        if !seen_notes.insert(recovery.logical_note_commitment) {
            return Some(reject(
                input,
                "recovery-consistency",
                "recovery-evidence-duplicate",
            ));
        }
        let Some(logical_note) = logical.get(&recovery.logical_note_commitment) else {
            return Some(reject(
                input,
                "recovery-consistency",
                "recovery-packet-note-mismatch",
            ));
        };
        let Some(public_note) = public.get(&recovery.logical_note_commitment) else {
            return Some(reject(
                input,
                "recovery-consistency",
                "recovery-packet-note-mismatch",
            ));
        };
        if recovery.created_note_commitment != public_note.note_commitment
            || recovery.created_note_commitment != logical_note.note.commitment
        {
            return Some(reject(
                input,
                "recovery-consistency",
                "recovery-packet-note-mismatch",
            ));
        }
        if recovery.packet_index != public_note.packet_index {
            return Some(reject(
                input,
                "recovery-consistency",
                "recovery-packet-index-mismatch",
            ));
        }
        if Some(recovery.creation_scope) != input.statement.creation_scope
            || recovery.creation_scope != logical_note.bundle.creation_scope
            || recovery.descriptor.network != recovery_network_name(input.statement.network)
            || !descriptor_keys.insert(recovery.descriptor.public_key)
        {
            return Some(reject(
                input,
                "recovery-consistency",
                "recovery-sender-evidence-mismatch",
            ));
        }
        // The created note must be spendable by the DESCRIPTOR HOLDER and by
        // nobody else. The sender copies the recipient's published owner
        // commitment verbatim; an accepted proof is therefore itself evidence
        // that the recipient can spend what was created for them.
        let descriptor_owner_commitment = sha256_domain_separated(
            OWNER_AUTHORITY_DOMAIN,
            &recovery.descriptor.owner_public_key,
        )
        .expect("fixed domain and fixed-size payload");
        if descriptor_owner_commitment != logical_note.note.owner_commitment {
            return Some(reject(
                input,
                "recovery-consistency",
                "recovery-owner-authority-mismatch",
            ));
        }
        let compatibility_logical = LogicalWitnessV0 {
            statement_commitment: logical_note.statement_commitment,
            created_note_commitment: logical_note.logical_commitment,
            creation_scope: logical_note.bundle.creation_scope,
            creation_transaction_id: [0u8; 32],
            note: logical_note.note.clone(),
            bundle: logical_note.bundle.clone(),
        };
        let compatibility_recovery = RecoveryWitnessV0 {
            encoded: Vec::new(),
            statement_commitment: recovery.statement_commitment,
            created_note_commitment: recovery.created_note_commitment,
            created_bundle_commitment: logical_note.bundle.commitment,
            creation_scope: recovery.creation_scope,
            packet_index: recovery.packet_index,
            packet_hash: [0u8; 32],
            descriptor: recovery.descriptor.clone(),
            encapsulation_seed: recovery.encapsulation_seed,
        };
        let plaintext =
            match build_recovery_plaintext_v1(&compatibility_logical, &compatibility_recovery) {
                Ok(plaintext) => plaintext,
                Err(_) => {
                    return Some(reject(
                        input,
                        "recovery-consistency",
                        "recovery-sender-evidence-mismatch",
                    ));
                }
            };
        let descriptor = RecoveryDescriptorV1 {
            descriptor_id: recovery.descriptor.descriptor_id.clone(),
            public_key: recovery.descriptor.public_key,
        };
        let sender = match build_recovery_sender_evidence_v1(
            &plaintext,
            &descriptor,
            &recovery.encapsulation_seed,
            input.profile.recovery_packet_count as u32,
            input.statement.created_cells.len() as u32,
        ) {
            Ok(sender) => sender,
            Err(_) => {
                return Some(reject(
                    input,
                    "recovery-consistency",
                    "recovery-sender-evidence-mismatch",
                ));
            }
        };
        if sender.packet_hash != public_note.packet_hash {
            return Some(reject(
                input,
                "recovery-consistency",
                "recovery-packet-digest-mismatch",
            ));
        }
        indexed_senders.push((recovery.packet_index, sender));
    }
    indexed_senders.sort_by_key(|(index, _)| *index);
    if indexed_senders
        .iter()
        .enumerate()
        .any(|(position, (index, _))| position as u32 != *index)
    {
        return Some(reject(
            input,
            "recovery-consistency",
            "recovery-packet-index-mismatch",
        ));
    }
    let senders = indexed_senders
        .into_iter()
        .map(|(_, sender)| sender)
        .collect::<Vec<_>>();
    if input.recovery_table.encoded_packets.len() < senders.len()
        || input.recovery_table.packet_hashes.len() < senders.len()
    {
        return Some(reject(
            input,
            "recovery-consistency",
            "recovery-evidence-missing",
        ));
    }
    if input.recovery_table.encoded_packets.len() > senders.len()
        || input.recovery_table.packet_hashes.len() > senders.len()
    {
        return Some(reject(
            input,
            "recovery-consistency",
            "recovery-evidence-extra",
        ));
    }
    let supplied_hashes = match input
        .recovery_table
        .encoded_packets
        .iter()
        .enumerate()
        .map(|(index, packet)| {
            recovery_packet_hash_v1(
                packet,
                input.profile.recovery_packet_count as u32,
                input.statement.created_cells.len() as u32,
                index as u32,
            )
        })
        .collect::<ApntResult<Vec<_>>>()
    {
        Ok(hashes) => hashes,
        Err(_) => {
            return Some(reject(
                input,
                "recovery-consistency",
                "recovery-packet-digest-mismatch",
            ));
        }
    };
    if supplied_hashes
        .iter()
        .copied()
        .collect::<BTreeSet<_>>()
        .len()
        != supplied_hashes.len()
        || input
            .recovery_table
            .packet_hashes
            .iter()
            .copied()
            .collect::<BTreeSet<_>>()
            .len()
            != input.recovery_table.packet_hashes.len()
    {
        return Some(reject(
            input,
            "recovery-consistency",
            "recovery-evidence-duplicate",
        ));
    }
    if input
        .recovery_table
        .encoded_packets
        .iter()
        .zip(&senders)
        .any(|(supplied, expected)| supplied != &expected.encoded_packet)
        || supplied_hashes
            .iter()
            .zip(&senders)
            .any(|(supplied, expected)| supplied != &expected.packet_hash)
        || input
            .recovery_table
            .packet_hashes
            .iter()
            .zip(&senders)
            .any(|(supplied, expected)| supplied != &expected.packet_hash)
    {
        return Some(reject(
            input,
            "recovery-consistency",
            "recovery-packet-digest-mismatch",
        ));
    }
    let recomputed = match build_recovery_packet_bin_v1(
        &senders
            .iter()
            .map(|sender| sender.encoded_packet.clone())
            .collect::<Vec<_>>(),
        input.profile.recovery_packet_count as u32,
        input.statement.created_cells.len() as u32,
    ) {
        Ok(value) => value,
        Err(_) => {
            return Some(reject(
                input,
                "recovery-consistency",
                "recovery-packet-table-commitment-mismatch",
            ));
        }
    };
    if input.recovery_table.packet_bin != recomputed.packet_bin
        || input.recovery_table.packet_bin_root != recomputed.packet_bin_root
        || parse_recovery_packet_bin_v1(
            &input.recovery_table.packet_bin,
            input.profile.recovery_packet_count as u32,
            input.statement.created_cells.len() as u32,
        )
        .is_err()
    {
        return Some(reject(
            input,
            "recovery-consistency",
            "recovery-bin-root-mismatch",
        ));
    }
    if input.statement.recovery_packet_bin_root != Some(recomputed.packet_bin_root) {
        return Some(reject(
            input,
            "recovery-consistency",
            "recovery-packet-table-commitment-mismatch",
        ));
    }
    let carriers = input
        .statement
        .projection
        .outputs
        .iter()
        .filter(|output| output.role == 1)
        .collect::<Vec<_>>();
    if carriers.len() != input.profile.recovery_carrier_count {
        return Some(reject(
            input,
            "recovery-consistency",
            "recovery-carrier-count-mismatch",
        ));
    }
    for (index, carrier) in carriers.iter().enumerate() {
        let start = index * input.profile.recovery_carrier_payload_bytes;
        let end = start + input.profile.recovery_carrier_payload_bytes;
        let expected_lock = match recomputed
            .packet_bin
            .get(start..end)
            .ok_or_else(|| err("recovery carrier slice exceeds packet bin"))
            .and_then(build_carrier_lock)
        {
            Ok(lock) => lock,
            Err(_) => {
                return Some(reject(
                    input,
                    "recovery-consistency",
                    "recovery-carrier-lock-mismatch",
                ));
            }
        };
        if carrier.statement_commitment_offset.is_some()
            || carrier.locking_template != expected_lock
        {
            return Some(reject(
                input,
                "recovery-consistency",
                "recovery-carrier-lock-mismatch",
            ));
        }
    }
    None
}

fn evaluate(input: &ProvingInput) -> PublicResultV1 {
    let counts = statement_counts(&input.statement);
    if input.expected_statement_commitment != input.statement.commitment {
        return PublicResultV1::rejected(
            Some(input.statement.commitment),
            Some(input.statement.settlement_projection),
            Some(statement_identity_tuple(&input.statement)),
            counts,
            "statement-boundary",
            "expected-statement-commitment-mismatch",
        );
    }
    if let Some(rejected) = validate_logical_witnesses(input) {
        return rejected;
    }
    if let Some(rejected) = validate_cell_correspondence(input) {
        return rejected;
    }
    if let Some(rejected) = validate_created_exit_authority(input) {
        return rejected;
    }
    let consumed_cells = input
        .consumed_cells
        .iter()
        .map(|item| {
            (
                item.input_index,
                item.logical_commitment,
                item.cell_commitment,
                &item.opening,
            )
        })
        .collect::<Vec<_>>();
    if let Some(rejected) = validate_bundle_side(
        input,
        &input.consumed_logical,
        &consumed_cells,
        &input
            .statement
            .consumed_cells
            .iter()
            .map(|item| item.index)
            .collect::<Vec<_>>(),
        "consumed-bundle",
    ) {
        return rejected;
    }
    let created_cells = input
        .created_cells
        .iter()
        .map(|item| {
            (
                item.output_index,
                item.logical_commitment,
                item.cell_commitment,
                &item.opening,
            )
        })
        .collect::<Vec<_>>();
    if let Some(rejected) = validate_bundle_side(
        input,
        &input.created_logical,
        &created_cells,
        &input
            .statement
            .created_cells
            .iter()
            .map(|item| item.index)
            .collect::<Vec<_>>(),
        "created-bundle",
    ) {
        return rejected;
    }
    let consumed_total = match checked_satoshi_sum(
        &input
            .consumed_logical
            .iter()
            .map(|item| item.note.value_sats)
            .collect::<Vec<_>>(),
    ) {
        Ok(value) => value,
        Err(_) => {
            return reject(
                input,
                "private-value-arithmetic",
                "private-value-sum-overflow",
            )
        }
    };
    let created_total = match checked_satoshi_sum(
        &input
            .created_logical
            .iter()
            .map(|item| item.note.value_sats)
            .collect::<Vec<_>>(),
    ) {
        Ok(value) => value,
        Err(_) => {
            return reject(
                input,
                "private-value-arithmetic",
                "private-value-sum-overflow",
            )
        }
    };
    let authorized_fee =
        match checked_satoshi_add(input.statement.network_fee, input.statement.service_fee) {
            Ok(value) => value,
            Err(_) => {
                return reject(
                    input,
                    "private-value-arithmetic",
                    "private-value-sum-overflow",
                )
            }
        };
    let created_plus_fee = match checked_satoshi_add(created_total, authorized_fee) {
        Ok(value) => value,
        Err(_) => {
            return reject(
                input,
                "private-value-arithmetic",
                "private-value-sum-overflow",
            )
        }
    };
    if consumed_total != created_plus_fee {
        return reject(
            input,
            "private-conservation",
            "private-conservation-mismatch",
        );
    }
    if let Some(rejected) = validate_authority(input) {
        return rejected;
    }
    if let Some(rejected) = validate_nullifiers(input) {
        return rejected;
    }
    if let Some(rejected) = validate_recovery(input) {
        return rejected;
    }
    PublicResultV1 {
        statement_commitment: Some(input.statement.commitment),
        settlement_projection: Some(input.statement.settlement_projection),
        identity_tuple: Some(statement_identity_tuple(&input.statement)),
        failure_stage: stage_code("accepted"),
        failure_code: failure_code("full-private-semantics-accepted"),
        counts,
    }
}

pub fn evaluate_proving_input_v1(bytes: &[u8]) -> ApntResult<PublicResultV1> {
    let input = parse_proving_input(bytes)?;
    Ok(evaluate(&input))
}

pub fn evaluate_proving_input_bytes_v1(bytes: &[u8]) -> ApntResult<Vec<u8>> {
    evaluate_proving_input_v1(bytes).map(|result| serialize_public_result_v1(&result))
}

#[cfg(test)]
mod tests;
