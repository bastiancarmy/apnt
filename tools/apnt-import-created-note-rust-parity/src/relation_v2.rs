//! Exact Rust parity for the APNT import-created-note relation v2.
//!
//! V2 adds two things to the frozen V1 relation and changes nothing in it:
//!
//! 1. the deployed import-funding covenant body travels as witness material,
//!    and the relation recomputes the 54-byte `APNT1PB` direct-P2S wrapper from
//!    it and requires byte equality with the projected import input's
//!    `spentLockingBytecode`;
//! 2. the bind that authenticated body commits must equal
//!    `createdNotePrecommitment32`, recomputed from the same witnesses that
//!    produced the final note set.
//!
//! The pre-commitment commits every field needed to reconstruct every final
//! note EXCEPT the funding outpoint, so it is computable before the funding
//! transaction exists. That is what breaks
//! `B-V1-ELIGIBILITY-BIND-CREATED-NOTE-COMMITMENT-CYCLE`.
//!
//! This module makes no proof-construction, proof-verification, chain, or
//! wallet claim.

use sha2::{Digest, Sha256};

use super::relation::{network_name, OutpointV0};
use super::relation_v1::{
    evaluate_complete_proving_input_v1, parse_complete_proving_input_v1,
    parse_import_created_note_statement_v1, CompleteProvingInputV1, ImportCreatedNoteStatementV1,
    SettlementProjectionV0, FAILURE_CODES_V1, RELATION_V1_IDENTITY,
};
use super::{
    err, sha256_domain_separated, ApntResult, BackingBundleMemberV1, LogicalWitnessV0,
    PublicObjectCountsV0, Reader, FAILURE_STAGES,
};

pub const RELATION_V2_IDENTITY: &str = "apnt-import-created-note-relation-v2";
pub const RELATION_V2_DOMAIN: &str = "bch-cloak-apnt-v0:import-created-note-relation-v2";
pub const RESULT_V2_MAGIC: &[u8; 8] = b"APNTIRV2";
pub const PROVING_INPUT_V2_MAGIC: &[u8; 8] = b"APNTPIV2";
pub const PRECOMMITMENT_V2_MAGIC: &[u8; 8] = b"APNTINP2";
pub const PRECOMMITMENT_V2_DOMAIN: &str = "bch-cloak-apnt-v0:import-created-note-precommitment-v2";
pub const PRECOMMITMENT_V2_VERSION: u8 = 2;
pub const SP1_PUBLIC_VALUES_LAYOUT_V2: &str = "raw-APNTIRV2-235-bytes";

pub const SEMANTIC_CONTRACT_V2_COMMITMENT: [u8; 32] = [
    0x83, 0x9c, 0x07, 0x37, 0x6d, 0x77, 0xa3, 0x43, 0x03, 0x5c, 0x4f, 0xb5, 0x51, 0xc5, 0xeb, 0x1b,
    0xfb, 0x80, 0x51, 0x22, 0x2f, 0x71, 0x0f, 0xc9, 0x01, 0x76, 0xc7, 0x33, 0x5e, 0x21, 0x4a, 0xe7,
];

const CREATION_SCOPE_V1_MAGIC: &[u8; 8] = b"APNTICV1";
const CREATION_SCOPE_V1_DOMAIN: &str = "bch-cloak-apnt-v0:import-creation-scope-v1";
const CREATION_SCOPE_V1_COMMITMENT_DOMAIN: &str =
    "bch-cloak-apnt-v0:import-creation-scope-commitment-v1";
const SKELETON_SET_V1_MAGIC: &[u8; 8] = b"APNTIBS1";
const SKELETON_SET_V1_COMMITMENT_DOMAIN: &str =
    "bch-cloak-apnt-v0:import-created-backing-skeleton-set-commitment-v1";
const CELL_MAGIC: &[u8; 8] = b"APNTSCV1";
const CELL_COMMITMENT_DOMAIN: &str = "bch-cloak-apnt-v0:backing-seal-cell-commitment-v1";
const BUNDLE_MAGIC: &[u8; 8] = b"APNTBBV1";
const BUNDLE_COMMITMENT_DOMAIN: &str = "bch-cloak-apnt-v0:backing-bundle-commitment-v1";
const NOTE_MAGIC: &[u8; 8] = b"APNTBNV1";
const NOTE_COMMITMENT_DOMAIN: &str = "bch-cloak-apnt-v0:bundle-backed-private-note-commitment-v1";

const WRAPPER_ID: &[u8; 7] = b"APNT1PB";
const WRAPPER_LOCKING_BYTES: usize = 54;
const COVENANT_BIND_PREFIX_BYTES: usize = 34;
const OP_PUSH32: u8 = 0x20;
const OP_DROP: u8 = 0x75;
const OP_DUP: u8 = 0x76;
const OP_HASH256: u8 = 0xaa;
const OP_EQUALVERIFY: u8 = 0x88;
const OP_DEFINE: u8 = 0x89;
const OP_INVOKE: u8 = 0x8a;

const MAX_BUNDLES: usize = 1_024;
const MAX_BACKING_CELLS: usize = 4_096;
const MAX_BCH_MONEY_SATS: u64 = 2_100_000_000_000_000;
pub const RESULT_V2_BYTES: usize = 235;

/// The V0 stage order with the V2 stage inserted immediately before `accepted`.
pub const FAILURE_STAGES_V2: [&str; 14] = [
    "statement-boundary",
    "witness-shape",
    "import-seal-identity",
    "created-note-identity",
    "created-backing-cell-identity",
    "created-backing",
    "created-completeness",
    "created-disjointness",
    "import-conservation",
    "recovery-consistency",
    "authority-readiness",
    "nullifier-readiness",
    "import-funding-precommitment",
    "accepted",
];

/// The V1 code points keep their indexes; the V2 codes are appended.
///
/// **Latent V1 divergence this works around, deliberately without touching the
/// frozen V1 array.** TypeScript's `APNT_IMPORT_CREATED_NOTE_FAILURE_CODE_ORDER_V1`
/// has 77 entries; this crate's `FAILURE_CODES_V1` has 76 and is missing
/// `recovery-owner-authority-mismatch` at index 76. No V1 evaluation path emits
/// that code, so no V1 public result has ever differed and the V1 parity vector
/// does not reach it — but computing the V2 append offset from
/// `FAILURE_CODES_V1.len()` would have shifted every V2 code point by one and
/// broken parity for real. The V2 order is therefore stated in full here, and
/// `FAILURE_CODES_V1` is left byte-for-byte frozen.
pub const FAILURE_CODES_V2_TAIL: [&str; 6] = [
    // Index 76: present in the TypeScript V1 order, absent from FAILURE_CODES_V1.
    "recovery-owner-authority-mismatch",
    // Indexes 77..81: the V2 relation's own codes.
    "import-funding-covenant-body-malformed",
    "import-funding-covenant-lock-mismatch",
    "created-note-precommitment-witness-mismatch",
    "created-note-precommitment-skeleton-mismatch",
    "created-note-precommitment-mismatch",
];

/// 76 inherited + 6 tail entries.
pub const FAILURE_CODES_V2_LEN: usize = 82;

pub fn failure_code_v2_name(index: u8) -> Option<&'static str> {
    let index = index as usize;
    if index < FAILURE_CODES_V1.len() {
        return Some(FAILURE_CODES_V1[index]);
    }
    FAILURE_CODES_V2_TAIL
        .get(index - FAILURE_CODES_V1.len())
        .copied()
}

fn failure_code_v2_codepoint(code: &str) -> Option<u8> {
    if let Some(index) = FAILURE_CODES_V1.iter().position(|item| *item == code) {
        return Some(index as u8);
    }
    FAILURE_CODES_V2_TAIL
        .iter()
        .position(|item| *item == code)
        .map(|index| (index + FAILURE_CODES_V1.len()) as u8)
}

fn failure_stage_v2_codepoint(stage: &str) -> Option<u8> {
    FAILURE_STAGES_V2
        .iter()
        .position(|item| *item == stage)
        .map(|index| index as u8)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PublicResultV2 {
    pub statement_commitment: Option<[u8; 32]>,
    pub settlement_projection_commitment: [u8; 32],
    pub failure_stage: u8,
    pub failure_code: u8,
    pub object_counts: PublicObjectCountsV0,
    pub booleans: [bool; 22],
}

impl PublicResultV2 {
    pub fn accepted(&self) -> bool {
        self.booleans[0]
    }
    pub fn failure_stage_name(&self) -> &'static str {
        FAILURE_STAGES_V2[self.failure_stage as usize]
    }
    pub fn failure_code_name(&self) -> &'static str {
        failure_code_v2_name(self.failure_code).expect("frozen v2 code exists")
    }
}

fn make_result_v2(
    statement_commitment: Option<[u8; 32]>,
    object_counts: PublicObjectCountsV0,
    projection_commitment: [u8; 32],
    stage: &str,
    code: &str,
) -> ApntResult<PublicResultV2> {
    let failure_stage = failure_stage_v2_codepoint(stage)
        .ok_or_else(|| err(format!("unknown v2 failure stage {stage}")))?;
    let failure_code = failure_code_v2_codepoint(code)
        .ok_or_else(|| err(format!("unknown v2 failure code {code}")))?;
    let accepted = stage == "accepted" && code == "full-import-created-note-semantics-accepted";
    let passed = |candidate: &str| -> bool {
        failure_stage > failure_stage_v2_codepoint(candidate).expect("frozen v2 stage exists")
    };
    Ok(PublicResultV2 {
        statement_commitment,
        settlement_projection_commitment: projection_commitment,
        failure_stage,
        failure_code,
        object_counts,
        booleans: [
            accepted,
            passed("created-backing-cell-identity"),
            passed("import-seal-identity"),
            passed("created-note-identity"),
            passed("created-backing-cell-identity"),
            accepted,
            passed("created-backing"),
            passed("created-completeness"),
            passed("created-disjointness"),
            passed("import-conservation"),
            passed("recovery-consistency"),
            passed("authority-readiness"),
            passed("nullifier-readiness"),
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            passed("import-funding-precommitment"),
        ],
    })
}

fn zero_object_counts() -> PublicObjectCountsV0 {
    PublicObjectCountsV0 {
        created_logical_notes: 0,
        created_backing_cells: 0,
        import_creation_scopes: 0,
        recovery_packet_references: 0,
    }
}

fn object_counts_of(statement: &ImportCreatedNoteStatementV1) -> PublicObjectCountsV0 {
    PublicObjectCountsV0 {
        created_logical_notes: statement.created_logical_notes.len() as u32,
        created_backing_cells: statement.created_backing_cells.len() as u32,
        import_creation_scopes: statement.import_creation_scopes.len() as u32,
        recovery_packet_references: statement.created_logical_notes.len() as u32,
    }
}

pub fn serialize_public_result_v2(result: &PublicResultV2) -> ApntResult<Vec<u8>> {
    if result.failure_stage as usize >= FAILURE_STAGES_V2.len()
        || failure_code_v2_name(result.failure_code).is_none()
    {
        return Err(err("APNTIRV2 has unsupported failure identity"));
    }
    let canonical = make_result_v2(
        None,
        zero_object_counts(),
        result.settlement_projection_commitment,
        result.failure_stage_name(),
        result.failure_code_name(),
    )?;
    if result.booleans != canonical.booleans {
        return Err(err(
            "APNTIRV2 progression booleans are not derived from failure stage",
        ));
    }
    let mut out = Vec::with_capacity(RESULT_V2_BYTES);
    out.extend_from_slice(RESULT_V2_MAGIC);
    out.push(2);
    out.extend_from_slice(&(RELATION_V2_DOMAIN.len() as u16).to_le_bytes());
    out.extend_from_slice(RELATION_V2_DOMAIN.as_bytes());
    out.extend_from_slice(&(RELATION_V2_IDENTITY.len() as u16).to_le_bytes());
    out.extend_from_slice(RELATION_V2_IDENTITY.as_bytes());
    out.extend_from_slice(&SEMANTIC_CONTRACT_V2_COMMITMENT);
    match result.statement_commitment {
        Some(commitment) => {
            out.push(1);
            out.extend_from_slice(&commitment);
        }
        None => {
            out.push(0);
            out.extend_from_slice(&[0u8; 32]);
        }
    }
    out.extend_from_slice(&result.settlement_projection_commitment);
    out.push(result.failure_stage);
    out.push(result.failure_code);
    out.extend_from_slice(&result.object_counts.created_logical_notes.to_le_bytes());
    out.extend_from_slice(&result.object_counts.created_backing_cells.to_le_bytes());
    out.extend_from_slice(&result.object_counts.import_creation_scopes.to_le_bytes());
    out.extend_from_slice(&result.object_counts.recovery_packet_references.to_le_bytes());
    out.extend(result.booleans.iter().map(|value| u8::from(*value)));
    if out.len() != RESULT_V2_BYTES {
        return Err(err("APNTIRV2 length drift"));
    }
    Ok(out)
}

pub fn encode_sp1_public_values_v2(result: &PublicResultV2) -> ApntResult<Vec<u8>> {
    serialize_public_result_v2(result)
}

// ---------------------------------------------------------------------------
// The V2 proving-input envelope
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CompleteProvingInputV2 {
    /// The frozen `APNTPIV1` bytes, carried verbatim.
    pub inner_v1_bytes: Vec<u8>,
    pub import_funding_covenant_body: Vec<u8>,
}

pub fn parse_complete_proving_input_v2(bytes: &[u8]) -> ApntResult<CompleteProvingInputV2> {
    let mut reader = Reader::new(bytes, "APNTPIV2");
    reader.expect(PROVING_INPUT_V2_MAGIC, "magic")?;
    if reader.u8("version")? != 2 {
        return Err(err("APNTPIV2 has unsupported version"));
    }
    let inner_v1_bytes = reader.length_prefixed("inner v1 proving input")?.to_vec();
    let import_funding_covenant_body = reader
        .length_prefixed("import funding covenant body")?
        .to_vec();
    reader.finish()?;
    Ok(CompleteProvingInputV2 {
        inner_v1_bytes,
        import_funding_covenant_body,
    })
}

// ---------------------------------------------------------------------------
// The canonical pre-commitment
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PrecommitmentMemberV2 {
    pub output_index: u32,
    pub value_sats: u64,
    pub locking_profile_id: [u8; 32],
    pub assignment_blinder: [u8; 32],
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PrecommitmentBundleV2 {
    pub asset_id: [u8; 32],
    pub owner_commitment: [u8; 32],
    pub note_nonce: [u8; 32],
    pub scope_nonce: [u8; 32],
    pub note_value_sats: u64,
    pub members: Vec<PrecommitmentMemberV2>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PrecommitmentV2 {
    pub network: u8,
    pub privacy_profile_id: [u8; 32],
    pub bundles: Vec<PrecommitmentBundleV2>,
}

fn nonzero(value: &[u8; 32]) -> bool {
    value.iter().any(|byte| *byte != 0)
}

/// Normalizes the round. Bundles sort by their smallest member output index,
/// which is a total order precisely because every output index appears exactly
/// once across the whole vector. Sorting by created-note commitment would
/// reintroduce the funding-outpoint dependency this construction removes.
pub fn normalize_precommitment_v2(mut value: PrecommitmentV2) -> ApntResult<PrecommitmentV2> {
    if value.bundles.is_empty() || value.bundles.len() > MAX_BUNDLES {
        return Err(err("APNTINP2 bundles must be a non-empty bounded vector"));
    }
    if !nonzero(&value.privacy_profile_id) {
        return Err(err("APNTINP2 privacy profile must not be all zero"));
    }
    let mut total_members = 0usize;
    for bundle in value.bundles.iter_mut() {
        if bundle.members.is_empty() || bundle.members.len() > MAX_BACKING_CELLS {
            return Err(err("APNTINP2 bundle members must be a non-empty bounded vector"));
        }
        for field in [
            &bundle.asset_id,
            &bundle.owner_commitment,
            &bundle.note_nonce,
            &bundle.scope_nonce,
        ] {
            if !nonzero(field) {
                return Err(err("APNTINP2 bundle field must not be all zero"));
            }
        }
        bundle.members.sort_by_key(|member| member.output_index);
        for window in bundle.members.windows(2) {
            if window[0].output_index == window[1].output_index {
                return Err(err("APNTINP2 bundle repeats an output index"));
            }
        }
        let mut member_total: u64 = 0;
        for member in &bundle.members {
            if member.value_sats == 0
                || member.value_sats > MAX_BCH_MONEY_SATS
                || !nonzero(&member.locking_profile_id)
                || !nonzero(&member.assignment_blinder)
            {
                return Err(err("APNTINP2 member is outside the checked value range"));
            }
            member_total = member_total
                .checked_add(member.value_sats)
                .filter(|total| *total <= MAX_BCH_MONEY_SATS)
                .ok_or_else(|| err("APNTINP2 members exceed the checked aggregate boundary"))?;
        }
        if bundle.note_value_sats == 0
            || bundle.note_value_sats > MAX_BCH_MONEY_SATS
            || bundle.note_value_sats != member_total
        {
            return Err(err("APNTINP2 note value must equal the sum of its members"));
        }
        total_members += bundle.members.len();
    }
    if total_members > MAX_BACKING_CELLS {
        return Err(err("APNTINP2 exceeds the v1 backing-cell collection cap"));
    }
    value
        .bundles
        .sort_by_key(|bundle| bundle.members[0].output_index);
    let mut seen: Vec<u32> = value
        .bundles
        .iter()
        .flat_map(|bundle| bundle.members.iter().map(|member| member.output_index))
        .collect();
    let unique = {
        let mut sorted = seen.clone();
        sorted.sort_unstable();
        sorted.dedup();
        sorted.len()
    };
    if unique != seen.len() {
        return Err(err("APNTINP2 assigns one output index to more than one bundle"));
    }
    seen.clear();
    Ok(value)
}

pub fn serialize_precommitment_v2(value: &PrecommitmentV2) -> Vec<u8> {
    let mut out = Vec::new();
    out.extend_from_slice(PRECOMMITMENT_V2_MAGIC);
    out.push(PRECOMMITMENT_V2_VERSION);
    // scope, backing seal cell opening, backing bundle opening, note versions
    out.extend_from_slice(&[1u8, 1u8, 1u8, 1u8]);
    out.push(value.network);
    out.extend_from_slice(&(RELATION_V2_IDENTITY.len() as u16).to_le_bytes());
    out.extend_from_slice(RELATION_V2_IDENTITY.as_bytes());
    out.extend_from_slice(&value.privacy_profile_id);
    out.extend_from_slice(&(value.bundles.len() as u32).to_le_bytes());
    for bundle in &value.bundles {
        out.extend_from_slice(&bundle.asset_id);
        out.extend_from_slice(&bundle.owner_commitment);
        out.extend_from_slice(&bundle.note_nonce);
        out.extend_from_slice(&bundle.scope_nonce);
        out.extend_from_slice(&bundle.note_value_sats.to_le_bytes());
        out.extend_from_slice(&(bundle.members.len() as u32).to_le_bytes());
        for member in &bundle.members {
            out.extend_from_slice(&member.output_index.to_le_bytes());
            out.extend_from_slice(&member.value_sats.to_le_bytes());
            out.extend_from_slice(&member.locking_profile_id);
            out.extend_from_slice(&member.assignment_blinder);
        }
    }
    out
}

pub fn derive_precommitment_v2(value: &PrecommitmentV2) -> ApntResult<[u8; 32]> {
    sha256_domain_separated(PRECOMMITMENT_V2_DOMAIN, &serialize_precommitment_v2(value))
}

/// The V1 skeleton-set commitment recomputed from the pre-commitment's complete
/// member set, across every bundle in the round.
pub fn derive_precommitment_skeleton_set_commitment_v2(
    value: &PrecommitmentV2,
) -> ApntResult<[u8; 32]> {
    let mut skeletons: Vec<(u32, u64, [u8; 32])> = value
        .bundles
        .iter()
        .flat_map(|bundle| {
            bundle
                .members
                .iter()
                .map(|member| (member.output_index, member.value_sats, member.locking_profile_id))
        })
        .collect();
    skeletons.sort_by_key(|entry| entry.0);
    let mut encoded = Vec::with_capacity(13 + skeletons.len() * 44);
    encoded.extend_from_slice(SKELETON_SET_V1_MAGIC);
    encoded.push(1);
    encoded.extend_from_slice(&(skeletons.len() as u32).to_le_bytes());
    for (output_index, value_sats, locking_profile_id) in &skeletons {
        encoded.extend_from_slice(&output_index.to_le_bytes());
        encoded.extend_from_slice(&value_sats.to_le_bytes());
        encoded.extend_from_slice(locking_profile_id);
    }
    sha256_domain_separated(SKELETON_SET_V1_COMMITMENT_DOMAIN, &encoded)
}

// ---------------------------------------------------------------------------
// Covenant-body authentication
// ---------------------------------------------------------------------------

fn sha256_raw(bytes: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hasher.finalize().into()
}

fn hash256(bytes: &[u8]) -> [u8; 32] {
    sha256_raw(&sha256_raw(bytes))
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CovenantBodyOpeningV2 {
    pub eligibility_statement_bind: [u8; 32],
    pub settlement_gate_body: Vec<u8>,
}

/// Opens `push32(bind) OP_DROP <gate body>`. A structural parse of the exact
/// prefix the covenant builder emits, deliberately not a general script decoder.
pub fn open_import_funding_covenant_body_v2(body: &[u8]) -> Option<CovenantBodyOpeningV2> {
    if body.len() <= COVENANT_BIND_PREFIX_BYTES || body[0] != OP_PUSH32 || body[33] != OP_DROP {
        return None;
    }
    let mut bind = [0u8; 32];
    bind.copy_from_slice(&body[1..33]);
    if !nonzero(&bind) {
        return None;
    }
    Some(CovenantBodyOpeningV2 {
        eligibility_statement_bind: bind,
        settlement_gate_body: body[COVENANT_BIND_PREFIX_BYTES..].to_vec(),
    })
}

/// `OP_DUP OP_HASH256 <hash256(body)> OP_EQUALVERIFY <"APNT1PB"> OP_DEFINE
/// <"APNT1PB"> OP_INVOKE`, exactly 54 bytes.
pub fn build_import_funding_direct_p2s_locking_v2(body: &[u8]) -> ApntResult<Vec<u8>> {
    if body.is_empty() {
        return Err(err("APNT1PB covenant body must be non-empty"));
    }
    let mut out = Vec::with_capacity(WRAPPER_LOCKING_BYTES);
    out.push(OP_DUP);
    out.push(OP_HASH256);
    out.push(32);
    out.extend_from_slice(&hash256(body));
    out.push(OP_EQUALVERIFY);
    out.push(WRAPPER_ID.len() as u8);
    out.extend_from_slice(WRAPPER_ID);
    out.push(OP_DEFINE);
    out.push(WRAPPER_ID.len() as u8);
    out.extend_from_slice(WRAPPER_ID);
    out.push(OP_INVOKE);
    if out.len() != WRAPPER_LOCKING_BYTES {
        return Err(err("APNT1PB wrapper length drift"));
    }
    Ok(out)
}

// ---------------------------------------------------------------------------
// Reconstruction under the actual projected funding outpoint
// ---------------------------------------------------------------------------

fn encode_creation_scope_v1(
    network: u8,
    privacy_profile_id: &[u8; 32],
    outpoint: &OutpointV0,
    skeleton_set_commitment: &[u8; 32],
    scope_nonce: &[u8; 32],
) -> Vec<u8> {
    let mut out = Vec::new();
    out.extend_from_slice(CREATION_SCOPE_V1_MAGIC);
    out.push(1);
    out.extend_from_slice(&(CREATION_SCOPE_V1_DOMAIN.len() as u16).to_le_bytes());
    out.extend_from_slice(CREATION_SCOPE_V1_DOMAIN.as_bytes());
    out.push(network);
    out.extend_from_slice(&(RELATION_V1_IDENTITY.len() as u16).to_le_bytes());
    out.extend_from_slice(RELATION_V1_IDENTITY.as_bytes());
    out.extend_from_slice(privacy_profile_id);
    let mut wire_txid = outpoint.txid;
    wire_txid.reverse();
    out.extend_from_slice(&wire_txid);
    out.extend_from_slice(&outpoint.vout.to_le_bytes());
    out.extend_from_slice(skeleton_set_commitment);
    out.extend_from_slice(scope_nonce);
    out
}

fn encode_cell_opening_v1(creation_scope: &[u8; 32], member: &PrecommitmentMemberV2) -> Vec<u8> {
    let mut out = Vec::with_capacity(117);
    out.extend_from_slice(CELL_MAGIC);
    out.push(1);
    out.extend_from_slice(creation_scope);
    out.extend_from_slice(&member.output_index.to_le_bytes());
    out.extend_from_slice(&member.value_sats.to_le_bytes());
    out.extend_from_slice(&member.locking_profile_id);
    out.extend_from_slice(&member.assignment_blinder);
    out
}

fn encode_bundle_v1(creation_scope: &[u8; 32], members: &[PrecommitmentMemberV2]) -> Vec<u8> {
    let mut out = Vec::with_capacity(45 + members.len() * 76);
    out.extend_from_slice(BUNDLE_MAGIC);
    out.push(1);
    out.extend_from_slice(creation_scope);
    out.extend_from_slice(&(members.len() as u32).to_le_bytes());
    for member in members {
        out.extend_from_slice(&member.output_index.to_le_bytes());
        out.extend_from_slice(&member.value_sats.to_le_bytes());
        out.extend_from_slice(&member.locking_profile_id);
        out.extend_from_slice(&member.assignment_blinder);
    }
    out
}

fn encode_note_v1(
    asset_id: &[u8; 32],
    value_sats: u64,
    owner_commitment: &[u8; 32],
    backing_bundle_commitment: &[u8; 32],
    note_nonce: &[u8; 32],
) -> Vec<u8> {
    let mut out = Vec::with_capacity(145);
    out.extend_from_slice(NOTE_MAGIC);
    out.push(1);
    out.extend_from_slice(asset_id);
    out.extend_from_slice(&value_sats.to_le_bytes());
    out.extend_from_slice(owner_commitment);
    out.extend_from_slice(backing_bundle_commitment);
    out.extend_from_slice(note_nonce);
    out
}

struct BundleDraftV2<'a> {
    logical: &'a LogicalWitnessV0,
    bundle: PrecommitmentBundleV2,
}

fn member_from_witness(member: &BackingBundleMemberV1) -> PrecommitmentMemberV2 {
    PrecommitmentMemberV2 {
        output_index: member.output_index,
        value_sats: member.value_sats,
        locking_profile_id: member.locking_profile_id,
        assignment_blinder: member.assignment_blinder,
    }
}

/// The complete V2-specific stage. Runs only after the frozen V1 semantics
/// accepted, so every V1 invariant it relies on already holds.
fn evaluate_precommitment_stage_v2(
    input: &CompleteProvingInputV1,
    statement: &ImportCreatedNoteStatementV1,
    projection: &SettlementProjectionV0,
    covenant_body: &[u8],
) -> ApntResult<Result<[u8; 32], &'static str>> {
    // 1. Authenticate the deployed covenant body against the projected import
    //    input's locking bytecode, by recomputing the wrapper.
    let opening = match open_import_funding_covenant_body_v2(covenant_body) {
        Some(opening) => opening,
        None => return Ok(Err("import-funding-covenant-body-malformed")),
    };
    if opening.settlement_gate_body.is_empty() {
        return Ok(Err("import-funding-covenant-body-malformed"));
    }
    let projected_import = match projection
        .inputs
        .get(statement.seal_close_input_index as usize)
    {
        Some(projected) if projected.spent_locking_bytecode.len() == WRAPPER_LOCKING_BYTES => {
            projected
        }
        _ => return Ok(Err("import-funding-covenant-lock-mismatch")),
    };
    let recomputed = match build_import_funding_direct_p2s_locking_v2(covenant_body) {
        Ok(locking) => locking,
        Err(_) => return Ok(Err("import-funding-covenant-body-malformed")),
    };
    if recomputed != projected_import.spent_locking_bytecode {
        return Ok(Err("import-funding-covenant-lock-mismatch"));
    }
    if statement.eligibility_statement_bind != opening.eligibility_statement_bind {
        return Ok(Err("created-note-precommitment-mismatch"));
    }

    // 2. Rebuild the canonical pre-commitment from the same witnesses that
    //    produced the final note set. Nothing read here depends on the outpoint.
    let mut drafts: Vec<BundleDraftV2<'_>> = Vec::with_capacity(input.witness.logical_witnesses.len());
    for logical in &input.witness.logical_witnesses {
        let scope = statement
            .import_creation_scopes
            .iter()
            .find(|reference| reference.commitment == logical.creation_scope);
        let scope = match scope {
            Some(reference) => &reference.scope,
            None => return Ok(Err("created-note-precommitment-witness-mismatch")),
        };
        if logical.bundle.members.is_empty() || logical.bundle.creation_scope != logical.creation_scope
        {
            return Ok(Err("created-note-precommitment-witness-mismatch"));
        }
        drafts.push(BundleDraftV2 {
            logical,
            bundle: PrecommitmentBundleV2 {
                asset_id: logical.note.asset_id,
                owner_commitment: logical.note.owner_commitment,
                note_nonce: logical.note.note_nonce,
                scope_nonce: scope.scope_nonce,
                note_value_sats: logical.note.value_sats,
                members: logical.bundle.members.iter().map(member_from_witness).collect(),
            },
        });
    }
    let precommitment = match normalize_precommitment_v2(PrecommitmentV2 {
        network: statement.network,
        privacy_profile_id: statement.privacy_profile_id,
        bundles: drafts.iter().map(|draft| draft.bundle.clone()).collect(),
    }) {
        Ok(value) => value,
        Err(_) => return Ok(Err("created-note-precommitment-witness-mismatch")),
    };

    // 3. The complete member set must be exactly the frozen V1 created-backing
    //    skeleton set every referenced scope commits.
    let skeleton_set_commitment = derive_precommitment_skeleton_set_commitment_v2(&precommitment)?;
    if statement
        .import_creation_scopes
        .iter()
        .any(|reference| reference.scope.skeleton_set_commitment != skeleton_set_commitment)
    {
        return Ok(Err("created-note-precommitment-skeleton-mismatch"));
    }

    // 4. Reconstruct every scope, cell opening, bundle, and note from the
    //    pre-commitment plus the ACTUAL projected funding outpoint.
    let mut reconstructed_note_commitments: Vec<[u8; 32]> = Vec::with_capacity(drafts.len());
    for draft in &drafts {
        let mut members = draft.bundle.members.clone();
        members.sort_by_key(|member| member.output_index);
        let scope_bytes = encode_creation_scope_v1(
            statement.network,
            &statement.privacy_profile_id,
            &projected_import.outpoint,
            &skeleton_set_commitment,
            &draft.bundle.scope_nonce,
        );
        let reconstructed_scope =
            sha256_domain_separated(CREATION_SCOPE_V1_COMMITMENT_DOMAIN, &scope_bytes)?;
        if reconstructed_scope != draft.logical.creation_scope {
            return Ok(Err("created-note-precommitment-mismatch"));
        }
        for member in &members {
            let opening_bytes = encode_cell_opening_v1(&reconstructed_scope, member);
            let witness_member = draft
                .logical
                .bundle
                .members
                .iter()
                .find(|candidate| candidate.output_index == member.output_index);
            let witness_member = match witness_member {
                Some(candidate) => candidate,
                None => return Ok(Err("created-note-precommitment-mismatch")),
            };
            if opening_bytes
                != encode_cell_opening_v1(&reconstructed_scope, &member_from_witness(witness_member))
            {
                return Ok(Err("created-note-precommitment-mismatch"));
            }
            let cell_commitment = sha256_domain_separated(CELL_COMMITMENT_DOMAIN, &opening_bytes)?;
            let statement_cell = statement
                .created_backing_cells
                .iter()
                .find(|cell| cell.output_index == member.output_index);
            match statement_cell {
                Some(cell)
                    if cell.seal_cell_commitment == cell_commitment
                        && cell.locking_profile_id == member.locking_profile_id => {}
                _ => return Ok(Err("created-note-precommitment-mismatch")),
            }
        }
        let bundle_bytes = encode_bundle_v1(&reconstructed_scope, &members);
        if bundle_bytes != draft.logical.bundle.encoded {
            return Ok(Err("created-note-precommitment-mismatch"));
        }
        let bundle_commitment = sha256_domain_separated(BUNDLE_COMMITMENT_DOMAIN, &bundle_bytes)?;
        let note_bytes = encode_note_v1(
            &draft.bundle.asset_id,
            draft.bundle.note_value_sats,
            &draft.bundle.owner_commitment,
            &bundle_commitment,
            &draft.bundle.note_nonce,
        );
        if note_bytes != draft.logical.note.encoded {
            return Ok(Err("created-note-precommitment-mismatch"));
        }
        let note_commitment = sha256_domain_separated(NOTE_COMMITMENT_DOMAIN, &note_bytes)?;
        if note_commitment != draft.logical.created_note_commitment {
            return Ok(Err("created-note-precommitment-mismatch"));
        }
        reconstructed_note_commitments.push(note_commitment);
    }

    // 5. Completeness: the reconstructed set IS the statement's note set.
    let mut reconstructed = reconstructed_note_commitments.clone();
    reconstructed.sort_unstable();
    let mut claimed: Vec<[u8; 32]> = statement
        .created_logical_notes
        .iter()
        .map(|note| note.created_note_commitment)
        .collect();
    claimed.sort_unstable();
    if reconstructed != claimed {
        return Ok(Err("created-note-precommitment-mismatch"));
    }

    // 6. The bind the deployed output committed IS this round's root.
    let created_note_precommitment = derive_precommitment_v2(&precommitment)?;
    if created_note_precommitment != opening.eligibility_statement_bind {
        return Ok(Err("created-note-precommitment-mismatch"));
    }
    Ok(Ok(created_note_precommitment))
}

pub fn evaluate_complete_proving_input_v2(bytes: &[u8]) -> ApntResult<PublicResultV2> {
    let envelope = parse_complete_proving_input_v2(bytes)?;
    // The complete frozen V1 semantics run first, unchanged.
    let v1 = evaluate_complete_proving_input_v1(&envelope.inner_v1_bytes)?;
    if !v1.accepted() {
        // A V1 rejection is forwarded verbatim — statement commitment,
        // projection commitment, object counts, stage, and code all come from
        // the V1 result rather than being re-derived. Re-deriving them would
        // let V2 report a statement V1 itself declined to report.
        return make_result_v2(
            v1.statement_commitment,
            v1.object_counts.clone(),
            v1.settlement_projection_commitment,
            FAILURE_STAGES[v1.failure_stage as usize],
            FAILURE_CODES_V1[v1.failure_code as usize],
        );
    }
    let input = parse_complete_proving_input_v1(&envelope.inner_v1_bytes)?;
    let statement = parse_import_created_note_statement_v1(&input.witness.statement_bytes)?;
    let projection = input.settlement_projection.clone();
    match evaluate_precommitment_stage_v2(
        &input,
        &statement,
        &projection,
        &envelope.import_funding_covenant_body,
    )? {
        Err(code) => make_result_v2(
            Some(statement.commitment),
            object_counts_of(&statement),
            projection.commitment,
            "import-funding-precommitment",
            code,
        ),
        Ok(_precommitment) => make_result_v2(
            Some(statement.commitment),
            object_counts_of(&statement),
            projection.commitment,
            "accepted",
            "full-import-created-note-semantics-accepted",
        ),
    }
}

pub fn evaluate_complete_proving_input_bytes_v2(bytes: &[u8]) -> ApntResult<Vec<u8>> {
    serialize_public_result_v2(&evaluate_complete_proving_input_v2(bytes)?)
}

/// Keeps the shared network-name table linked from this module, mirroring the
/// V1 module's own compatibility link.
fn _network_name_link_v2(network: u8) -> &'static str {
    network_name(network)
}
