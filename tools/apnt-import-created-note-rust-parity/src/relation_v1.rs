//! Exact Rust parity for the additive, non-circular APNT import-created-note
//! relation v1. The public statement binds the proof-independent settlement
//! projection commitment; a final settlement transaction id is deliberately
//! absent from the statement, creation scope, seal-close witness, and result.

use sha2::{Digest, Sha256};

use super::relation::{
    network_name, parse_network, parse_seal_open_evidence_v0, read_outpoint, seal_commitment_v0,
    validate_authority_readiness, validate_created_backing, validate_created_backing_cells,
    validate_created_completeness, validate_created_disjointness, validate_created_notes,
    validate_nullifier_readiness, validate_recovery_consistency, ImportCreatedNoteStatementV0,
    ImportCreationScopeV0, OutpointV0, ProjectionInputV0, ProjectionOutputV0, PublicAccountingV0,
    ScopeReferenceV0, SealOpenEvidenceV0, StatementBackingCellV0, StatementLogicalNoteV0,
    TransactionProjectionV0,
};
use super::{
    checked_bch_value, checked_satoshi_add, checked_satoshi_sub, checked_satoshi_sum, err,
    failure_stage_codepoint, parse_complete_private_witness_v1, serialize_public_result_v0,
    sha256_domain_separated, ApntResult, CompletePrivateWitnessV0, PublicObjectCountsV0,
    PublicResultV0, Reader,
};

pub const RELATION_V1_IDENTITY: &str = "apnt-import-created-note-relation-v1";
pub const RELATION_V1_DOMAIN: &str = "bch-cloak-apnt-v0:import-created-note-relation-v1";
pub const RESULT_V1_MAGIC: &[u8; 8] = b"APNTIRV1";
pub const STATEMENT_V1_MAGIC: &[u8; 8] = b"APNTISV1";
pub const STATEMENT_V1_DOMAIN: &str = "bch-cloak-apnt-v0:import-created-note-statement-v1";
pub const STATEMENT_V1_COMMITMENT_DOMAIN: &str =
    "bch-cloak-apnt-v0:import-created-note-statement-commitment-v1";
pub const CREATION_SCOPE_V1_MAGIC: &[u8; 8] = b"APNTICV1";
pub const CREATION_SCOPE_V1_DOMAIN: &str = "bch-cloak-apnt-v0:import-creation-scope-v1";
pub const CREATION_SCOPE_V1_COMMITMENT_DOMAIN: &str =
    "bch-cloak-apnt-v0:import-creation-scope-commitment-v1";
pub const SKELETON_SET_V1_MAGIC: &[u8; 8] = b"APNTIBS1";
pub const SKELETON_SET_V1_COMMITMENT_DOMAIN: &str =
    "bch-cloak-apnt-v0:import-created-backing-skeleton-set-commitment-v1";
pub const SEAL_CLOSE_V1_MAGIC: &[u8; 8] = b"APNTSCV1";
pub const SEAL_CLOSE_V1_DOMAIN: &str = "bch-cloak-apnt-v0:import-created-note-seal-close-v1";
pub const SETTLEMENT_PROJECTION_MAGIC: &[u8; 8] = b"APNTSPV0";
pub const SETTLEMENT_PROJECTION_COMMITMENT_DOMAIN: &str =
    "bch-cloak-apnt-v0:import-settlement-projection-commitment-v0";
pub const SETTLEMENT_BACKING_LOCKING_PROFILE_DOMAIN: &str =
    "bch-cloak-apnt-v0:import-settlement-backing-locking-profile-v1";
pub const SEMANTIC_CONTRACT_V1_COMMITMENT: [u8; 32] = [
    0x47, 0x80, 0xa7, 0x31, 0xfd, 0x12, 0xc0, 0xbe, 0x93, 0xc4, 0xa0, 0x28, 0x15, 0x63, 0x84, 0x20,
    0x52, 0x40, 0x78, 0x6e, 0x7a, 0xeb, 0x18, 0x0e, 0x1b, 0x73, 0x30, 0xd5, 0x4c, 0x2f, 0x41, 0x30,
];
pub const SP1_PUBLIC_VALUES_LAYOUT_V1: &str = "raw-APNTIRV1-234-bytes";

const MAX_LOGICAL_NOTES: u32 = 1_024;
const MAX_BACKING_CELLS: u32 = 4_096;
const MAX_SCOPES: u32 = 1_024;
const SETTLEMENT_INPUT_COUNT: usize = 12;
const SETTLEMENT_OUTPUT_COUNT: usize = 20;
const RECOVERY_FIRST_OUTPUT_INDEX: usize = 4;
const RECOVERY_OUTPUT_COUNT: usize = 15;
const COLLATERAL_OUTPUT_INDEX: usize = 19;
const STAGE_LOCKING_BYTES: usize = 54;
const RECOVERY_LOCKING_BYTES: usize = 201;
const RECOVERY_PACKET_BIN_BYTES: usize = 2_955;
const RESULT_V1_BYTES: usize = 234;

pub const FAILURE_CODES_V1: [&str; 76] = [
    "statement-malformed",
    "statement-commitment-mismatch",
    "relation-identity-mismatch",
    "relation-witness-malformed",
    "unsupported-caller-status",
    "import-seal-evidence-malformed",
    "network-mismatch",
    "import-funding-value-mismatch",
    "import-cell-commitment-mismatch",
    "eligibility-bind-mismatch",
    "output-fingerprint-mismatch",
    "seal-outpoint-mismatch",
    "seal-commitment-mismatch",
    "consumed-input-mismatch",
    "settlement-projection-commitment-mismatch",
    "created-note-missing",
    "created-note-extra",
    "created-note-duplicate",
    "created-note-commitment-mismatch",
    "creation-scope-mismatch",
    "created-backing-cell-missing",
    "created-backing-cell-extra",
    "created-backing-cell-duplicate",
    "created-backing-cell-commitment-mismatch",
    "created-output-index-mismatch",
    "created-backing-cell-role-mismatch",
    "created-bundle-missing",
    "created-bundle-empty",
    "created-bundle-duplicate",
    "created-bundle-commitment-mismatch",
    "created-bundle-scope-mismatch",
    "created-note-underbacked",
    "created-note-overbacked",
    "created-backing-cell-omitted",
    "created-backing-cell-assigned-twice",
    "created-backing-cell-unexpected",
    "created-backing-cell-opening-mismatch",
    "created-backing-cell-token-invalid",
    "import-value-invalid",
    "authorized-import-fee-mismatch",
    "import-conservation-mismatch",
    "transparent-change-forbidden",
    "unsupported-pass-through",
    "unsupported-output-role",
    "arithmetic-overflow",
    "arithmetic-underflow",
    "money-range-invalid",
    "recovery-witness-missing",
    "recovery-witness-extra",
    "recovery-witness-duplicate",
    "recovery-note-commitment-mismatch",
    "recovery-bundle-commitment-mismatch",
    "recovery-scope-mismatch",
    "recovery-packet-index-mismatch",
    "recovery-packet-hash-mismatch",
    "recovery-packet-table-mismatch",
    "recovery-manifest-mismatch",
    "recovery-bin-root-mismatch",
    "recovery-sender-construction-mismatch",
    "authority-material-missing",
    "authority-material-malformed",
    "authority-commitment-mismatch",
    "authority-note-mismatch",
    "authority-bundle-mismatch",
    "authority-scope-mismatch",
    "nullifier-material-missing",
    "nullifier-material-malformed",
    "nullifier-readiness-note-mismatch",
    "nullifier-readiness-bundle-mismatch",
    "nullifier-readiness-domain-mismatch",
    "nullifier-readiness-derivation-mismatch",
    "full-import-created-note-semantics-accepted",
    "settlement-projection-malformed",
    "settlement-projection-profile-mismatch",
    "settlement-backing-lock-mismatch",
    "settlement-recovery-envelope-mismatch",
];

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SettlementProjectionInputV0 {
    pub outpoint: OutpointV0,
    pub sequence_number: u32,
    pub spent_value_sats: u64,
    pub spent_locking_bytecode: Vec<u8>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SettlementProjectionOutputV0 {
    pub value_sats: u64,
    pub locking_bytecode: Vec<u8>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SettlementProjectionV0 {
    pub encoded: Vec<u8>,
    pub commitment: [u8; 32],
    pub network: u8,
    pub verifier_profile_identity: [u8; 32],
    pub transaction_version: u32,
    pub locktime: u32,
    pub inputs: Vec<SettlementProjectionInputV0>,
    pub outputs: Vec<SettlementProjectionOutputV0>,
    pub fee_sats: u64,
    pub postage_sats: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ImportCreationScopeV1 {
    pub encoded: Vec<u8>,
    pub network: u8,
    pub privacy_profile_id: [u8; 32],
    pub import_funding_outpoint: OutpointV0,
    pub skeleton_set_commitment: [u8; 32],
    pub scope_nonce: [u8; 32],
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScopeReferenceV1 {
    pub commitment: [u8; 32],
    pub scope: ImportCreationScopeV1,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ImportCreatedNoteStatementV1 {
    pub encoded: Vec<u8>,
    pub commitment: [u8; 32],
    pub network: u8,
    pub privacy_profile_id: [u8; 32],
    pub import_funding_outpoint: OutpointV0,
    pub import_funding_value_sats: u64,
    pub import_funding_cell_commitment: [u8; 32],
    pub eligibility_statement_bind: [u8; 32],
    pub output_fingerprint: [u8; 32],
    pub seal_open_commitment: [u8; 32],
    pub seal_close_outpoint: OutpointV0,
    pub seal_close_input_index: u32,
    pub seal_close_previous_commitment: [u8; 32],
    pub settlement_projection_commitment: [u8; 32],
    pub created_logical_notes: Vec<StatementLogicalNoteV0>,
    pub created_backing_cells: Vec<StatementBackingCellV0>,
    pub import_creation_scopes: Vec<ScopeReferenceV1>,
    pub recovery_packet_table_commitment: [u8; 32],
    pub authorized_import_fee_sats: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SealCloseEvidenceV1 {
    pub network: u8,
    pub consumed_seal_outpoint: OutpointV0,
    pub input_index: u32,
    pub previous_seal_commitment: [u8; 32],
    pub previous_output_fingerprint: [u8; 32],
    pub import_funding_cell_commitment: [u8; 32],
    pub eligibility_statement_bind: [u8; 32],
    pub settlement_projection_commitment: [u8; 32],
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CompleteProvingInputV1 {
    pub witness: CompletePrivateWitnessV0,
    pub seal_open: SealOpenEvidenceV0,
    pub seal_close: SealCloseEvidenceV1,
    pub settlement_projection: SettlementProjectionV0,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PublicResultV1 {
    pub statement_commitment: Option<[u8; 32]>,
    pub settlement_projection_commitment: [u8; 32],
    pub failure_stage: u8,
    pub failure_code: u8,
    pub object_counts: PublicObjectCountsV0,
    pub booleans: [bool; 21],
}

impl PublicResultV1 {
    pub fn accepted(&self) -> bool {
        self.booleans[0]
    }
    pub fn failure_stage_name(&self) -> &'static str {
        super::FAILURE_STAGES[self.failure_stage as usize]
    }
    pub fn failure_code_name(&self) -> &'static str {
        FAILURE_CODES_V1[self.failure_code as usize]
    }
}

fn require_nonzero(value: &[u8; 32], name: &str) -> ApntResult<()> {
    if value.iter().all(|byte| *byte == 0) {
        return Err(err(format!("{name} must not be all zero")));
    }
    Ok(())
}

fn bounded_count(value: u32, maximum: u32, name: &str) -> ApntResult<u32> {
    if value == 0 || value > maximum {
        return Err(err(format!("{name} is outside the canonical bound")));
    }
    Ok(value)
}

fn parse_creation_scope_v1(bytes: &[u8]) -> ApntResult<ImportCreationScopeV1> {
    let mut reader = Reader::new(bytes, "APNTICV1");
    reader.expect(CREATION_SCOPE_V1_MAGIC, "magic")?;
    if reader.u8("version")? != 1 || reader.text("domain")? != CREATION_SCOPE_V1_DOMAIN {
        return Err(err("APNTICV1 has unsupported identity"));
    }
    let network = parse_network(reader.u8("network")?)?;
    if reader.text("relation identity")? != RELATION_V1_IDENTITY {
        return Err(err("APNTICV1 has unsupported relation identity"));
    }
    let privacy_profile_id = reader.bytes32("privacy profile")?;
    let import_funding_outpoint = read_outpoint(&mut reader, "import funding outpoint")?;
    let skeleton_set_commitment = reader.bytes32("skeleton-set commitment")?;
    let scope_nonce = reader.bytes32("scope nonce")?;
    require_nonzero(&privacy_profile_id, "scope privacy profile")?;
    require_nonzero(&skeleton_set_commitment, "scope skeleton-set commitment")?;
    require_nonzero(&scope_nonce, "scope nonce")?;
    reader.finish()?;
    Ok(ImportCreationScopeV1 {
        encoded: bytes.to_vec(),
        network,
        privacy_profile_id,
        import_funding_outpoint,
        skeleton_set_commitment,
        scope_nonce,
    })
}

pub fn parse_import_created_note_statement_v1(
    bytes: &[u8],
) -> ApntResult<ImportCreatedNoteStatementV1> {
    let mut reader = Reader::new(bytes, "APNTISV1");
    reader.expect(STATEMENT_V1_MAGIC, "magic")?;
    if reader.u8("version")? != 1 || reader.text("domain")? != STATEMENT_V1_DOMAIN {
        return Err(err("APNTISV1 has unsupported identity"));
    }
    let network = parse_network(reader.u8("network")?)?;
    if reader.text("relation identity")? != RELATION_V1_IDENTITY {
        return Err(err("APNTISV1 has unsupported relation identity"));
    }
    let privacy_profile_id = reader.bytes32("privacy profile")?;
    let import_funding_outpoint = read_outpoint(&mut reader, "import funding outpoint")?;
    let import_funding_value_sats = checked_bch_value(reader.u64("import funding value")?, true)?;
    let import_funding_cell_commitment = reader.bytes32("import cell commitment")?;
    let eligibility_statement_bind = reader.bytes32("eligibility bind")?;
    let output_fingerprint = reader.bytes32("output fingerprint")?;
    let seal_open_commitment = reader.bytes32("seal-open commitment")?;
    let seal_close_outpoint = read_outpoint(&mut reader, "seal-close outpoint")?;
    let seal_close_input_index = reader.u32("seal-close input index")?;
    let seal_close_previous_commitment = reader.bytes32("previous seal commitment")?;
    let settlement_projection_commitment = reader.bytes32("settlement projection commitment")?;
    for (name, value) in [
        ("privacy profile", &privacy_profile_id),
        ("import cell commitment", &import_funding_cell_commitment),
        ("eligibility bind", &eligibility_statement_bind),
        ("output fingerprint", &output_fingerprint),
        ("seal-open commitment", &seal_open_commitment),
        ("previous seal commitment", &seal_close_previous_commitment),
        (
            "settlement projection commitment",
            &settlement_projection_commitment,
        ),
    ] {
        require_nonzero(value, name)?;
    }

    let logical_count = bounded_count(
        reader.u32("logical-note count")?,
        MAX_LOGICAL_NOTES,
        "logical-note count",
    )?;
    let mut created_logical_notes = Vec::with_capacity(logical_count as usize);
    for _ in 0..logical_count {
        let note = StatementLogicalNoteV0 {
            created_note_commitment: reader.bytes32("created note commitment")?,
            creation_scope: reader.bytes32("created note creation scope")?,
            recovery_packet_index: reader.u32("recovery packet index")?,
            recovery_packet_hash: reader.bytes32("recovery packet hash")?,
        };
        for (name, value) in [
            ("created note commitment", &note.created_note_commitment),
            ("created note creation scope", &note.creation_scope),
            ("recovery packet hash", &note.recovery_packet_hash),
        ] {
            require_nonzero(value, name)?;
        }
        created_logical_notes.push(note);
    }
    if created_logical_notes
        .windows(2)
        .any(|pair| pair[0].created_note_commitment >= pair[1].created_note_commitment)
        || created_logical_notes
            .iter()
            .enumerate()
            .any(|(index, note)| note.recovery_packet_index != index as u32)
        || created_logical_notes
            .iter()
            .enumerate()
            .any(|(index, note)| {
                created_logical_notes[..index]
                    .iter()
                    .any(|other| other.recovery_packet_hash == note.recovery_packet_hash)
            })
    {
        return Err(err("APNTISV1 logical-note identities are not canonical"));
    }

    let backing_count = bounded_count(
        reader.u32("backing-cell count")?,
        MAX_BACKING_CELLS,
        "backing-cell count",
    )?;
    let mut created_backing_cells = Vec::with_capacity(backing_count as usize);
    for _ in 0..backing_count {
        let cell = StatementBackingCellV0 {
            output_index: reader.u32("backing output index")?,
            seal_cell_commitment: reader.bytes32("backing cell commitment")?,
            locking_profile_id: reader.bytes32("backing locking profile")?,
        };
        require_nonzero(&cell.seal_cell_commitment, "backing cell commitment")?;
        require_nonzero(&cell.locking_profile_id, "backing locking profile")?;
        created_backing_cells.push(cell);
    }
    if created_backing_cells
        .windows(2)
        .any(|pair| pair[0].output_index >= pair[1].output_index)
        || created_backing_cells
            .iter()
            .enumerate()
            .any(|(index, cell)| {
                created_backing_cells[..index]
                    .iter()
                    .any(|other| other.seal_cell_commitment == cell.seal_cell_commitment)
            })
    {
        return Err(err("APNTISV1 backing-cell identities are not canonical"));
    }

    let scope_count = bounded_count(
        reader.u32("creation-scope count")?,
        MAX_SCOPES,
        "creation-scope count",
    )?;
    let mut import_creation_scopes = Vec::with_capacity(scope_count as usize);
    for _ in 0..scope_count {
        let commitment = reader.bytes32("creation-scope commitment")?;
        require_nonzero(&commitment, "creation-scope commitment")?;
        let scope_bytes = reader.length_prefixed("creation scope")?;
        if sha256_domain_separated(CREATION_SCOPE_V1_COMMITMENT_DOMAIN, scope_bytes)? != commitment
        {
            return Err(err("APNTISV1 creation-scope commitment mismatch"));
        }
        import_creation_scopes.push(ScopeReferenceV1 {
            commitment,
            scope: parse_creation_scope_v1(scope_bytes)?,
        });
    }
    if import_creation_scopes
        .windows(2)
        .any(|pair| pair[0].commitment >= pair[1].commitment)
    {
        return Err(err("APNTISV1 creation scopes are not in canonical order"));
    }
    let recovery_packet_table_commitment = reader.bytes32("recovery packet-table commitment")?;
    let authorized_import_fee_sats =
        checked_bch_value(reader.u64("authorized import fee")?, false)?;
    require_nonzero(
        &recovery_packet_table_commitment,
        "recovery packet-table commitment",
    )?;
    reader.finish()?;

    if import_funding_outpoint != seal_close_outpoint
        || seal_open_commitment != seal_close_previous_commitment
    {
        return Err(err(
            "APNTISV1 import funding and seal-close identity mismatch",
        ));
    }
    for reference in &import_creation_scopes {
        if reference.scope.network != network
            || reference.scope.privacy_profile_id != privacy_profile_id
            || reference.scope.import_funding_outpoint != import_funding_outpoint
        {
            return Err(err("APNTISV1 import creation-scope identity mismatch"));
        }
    }
    if created_logical_notes.iter().any(|note| {
        !import_creation_scopes
            .iter()
            .any(|scope| scope.commitment == note.creation_scope)
    }) || import_creation_scopes.iter().any(|scope| {
        !created_logical_notes
            .iter()
            .any(|note| note.creation_scope == scope.commitment)
    }) {
        return Err(err("APNTISV1 creation scope references are incomplete"));
    }

    Ok(ImportCreatedNoteStatementV1 {
        encoded: bytes.to_vec(),
        commitment: sha256_domain_separated(STATEMENT_V1_COMMITMENT_DOMAIN, bytes)?,
        network,
        privacy_profile_id,
        import_funding_outpoint,
        import_funding_value_sats,
        import_funding_cell_commitment,
        eligibility_statement_bind,
        output_fingerprint,
        seal_open_commitment,
        seal_close_outpoint,
        seal_close_input_index,
        seal_close_previous_commitment,
        settlement_projection_commitment,
        created_logical_notes,
        created_backing_cells,
        import_creation_scopes,
        recovery_packet_table_commitment,
        authorized_import_fee_sats,
    })
}

/// Reads an `APNTSPV0` settlement-input outpoint, whose txid is carried in
/// this codebase's natural/display order rather than BCH wire order.
///
/// Deliberately separate from the shared [`read_outpoint`], which reverses
/// because every one of its own call sites reads a genuinely wire-ordered
/// txid. `APNTSPV0` is the one exception: the deployed authentication gate
/// reconstructs this transcript on-chain with
/// `OP_<i> OP_OUTPOINTTXHASH OP_REVERSEBYTES OP_CAT`, and the
/// `OP_REVERSEBYTES` converts the VM's wire-order introspection value back to
/// display order — so a correctly wire-encoded transaction contributes its
/// display-order `txid` here. This mirrors `encodeNormalized`/`readOutpoint`
/// in `packages/protocol-runtime/src/apnt_import_settlement_projection_v0.ts`,
/// which write and read the same field with no reversal for the same reason.
///
/// Getting this wrong is invisible to local CashVM verification, which never
/// resolves an outpoint against a real UTXO set; it surfaces only as a
/// `"Missing inputs"` rejection from a real node.
fn read_settlement_input_outpoint(reader: &mut Reader<'_>, name: &str) -> ApntResult<OutpointV0> {
    let txid: [u8; 32] = reader.take(32, name)?.try_into().expect("32 bytes");
    require_nonzero(&txid, name)?;
    Ok(OutpointV0 {
        txid,
        vout: reader.u32(name)?,
    })
}

pub fn parse_settlement_projection_v0(bytes: &[u8]) -> ApntResult<SettlementProjectionV0> {
    let mut reader = Reader::new(bytes, "APNTSPV0");
    reader.expect(SETTLEMENT_PROJECTION_MAGIC, "magic")?;
    if reader.u8("version")? != 0 {
        return Err(err("APNTSPV0 has unsupported version"));
    }
    let network = parse_network(reader.u8("network")?)?;
    let verifier_profile_identity = reader.bytes32("verifier profile identity")?;
    require_nonzero(&verifier_profile_identity, "verifier profile identity")?;
    let transaction_version = reader.u32("transaction version")?;
    let locktime = reader.u32("locktime")?;
    let mut inputs = Vec::with_capacity(SETTLEMENT_INPUT_COUNT);
    for _ in 0..SETTLEMENT_INPUT_COUNT {
        let outpoint = read_settlement_input_outpoint(&mut reader, "settlement input outpoint")?;
        if inputs
            .iter()
            .any(|input: &SettlementProjectionInputV0| input.outpoint == outpoint)
        {
            return Err(err("APNTSPV0 has a duplicate input outpoint"));
        }
        inputs.push(SettlementProjectionInputV0 {
            outpoint,
            sequence_number: reader.u32("settlement input sequence")?,
            spent_value_sats: checked_bch_value(reader.u64("settlement input value")?, true)?,
            spent_locking_bytecode: reader
                .take(STAGE_LOCKING_BYTES, "settlement input locking bytecode")?
                .to_vec(),
        });
    }
    let mut outputs = Vec::with_capacity(SETTLEMENT_OUTPUT_COUNT);
    for index in 0..SETTLEMENT_OUTPUT_COUNT {
        let locking_length =
            if (RECOVERY_FIRST_OUTPUT_INDEX..COLLATERAL_OUTPUT_INDEX).contains(&index) {
                RECOVERY_LOCKING_BYTES
            } else {
                STAGE_LOCKING_BYTES
            };
        outputs.push(SettlementProjectionOutputV0 {
            value_sats: checked_bch_value(reader.u64("settlement output value")?, true)?,
            locking_bytecode: reader
                .take(locking_length, "settlement output locking bytecode")?
                .to_vec(),
        });
    }
    reader.finish()?;
    let total_input = checked_satoshi_sum(
        &inputs
            .iter()
            .map(|input| input.spent_value_sats)
            .collect::<Vec<_>>(),
    )?;
    let total_output = checked_satoshi_sum(
        &outputs
            .iter()
            .map(|output| output.value_sats)
            .collect::<Vec<_>>(),
    )?;
    let fee_sats = checked_satoshi_sub(total_input, total_output)?;
    checked_bch_value(fee_sats, true)?;
    let postage_sats = checked_satoshi_sum(
        &outputs[RECOVERY_FIRST_OUTPUT_INDEX..RECOVERY_FIRST_OUTPUT_INDEX + RECOVERY_OUTPUT_COUNT]
            .iter()
            .map(|output| output.value_sats)
            .collect::<Vec<_>>(),
    )?;
    checked_bch_value(postage_sats, true)?;
    Ok(SettlementProjectionV0 {
        encoded: bytes.to_vec(),
        commitment: sha256_domain_separated(SETTLEMENT_PROJECTION_COMMITMENT_DOMAIN, bytes)?,
        network,
        verifier_profile_identity,
        transaction_version,
        locktime,
        inputs,
        outputs,
        fee_sats,
        postage_sats,
    })
}

pub fn parse_seal_close_evidence_v1(bytes: &[u8]) -> ApntResult<SealCloseEvidenceV1> {
    let mut reader = Reader::new(bytes, "APNTSCV1");
    reader.expect(SEAL_CLOSE_V1_MAGIC, "magic")?;
    if reader.u8("version")? != 1 || reader.text("domain")? != SEAL_CLOSE_V1_DOMAIN {
        return Err(err("APNTSCV1 has unsupported identity"));
    }
    let evidence = SealCloseEvidenceV1 {
        network: parse_network(reader.u8("network")?)?,
        consumed_seal_outpoint: read_outpoint(&mut reader, "consumed seal outpoint")?,
        input_index: reader.u32("input index")?,
        previous_seal_commitment: reader.bytes32("previous seal commitment")?,
        previous_output_fingerprint: reader.bytes32("previous output fingerprint")?,
        import_funding_cell_commitment: reader.bytes32("import cell commitment")?,
        eligibility_statement_bind: reader.bytes32("eligibility bind")?,
        settlement_projection_commitment: reader.bytes32("settlement projection commitment")?,
    };
    for (name, value) in [
        (
            "previous seal commitment",
            &evidence.previous_seal_commitment,
        ),
        (
            "previous output fingerprint",
            &evidence.previous_output_fingerprint,
        ),
        (
            "import cell commitment",
            &evidence.import_funding_cell_commitment,
        ),
        ("eligibility bind", &evidence.eligibility_statement_bind),
        (
            "settlement projection commitment",
            &evidence.settlement_projection_commitment,
        ),
    ] {
        require_nonzero(value, name)?;
    }
    reader.finish()?;
    Ok(evidence)
}

pub fn parse_complete_proving_input_v1(bytes: &[u8]) -> ApntResult<CompleteProvingInputV1> {
    let mut reader = Reader::new(bytes, "APNTPIV1");
    reader.expect(b"APNTPIV1", "magic")?;
    if reader.u8("version")? != 1 {
        return Err(err("APNTPIV1 has unsupported version"));
    }
    let witness = parse_complete_private_witness_v1(reader.length_prefixed("private witness")?)?;
    let seal_open = parse_seal_open_evidence_v0(reader.length_prefixed("seal-open evidence")?)?;
    let seal_close = parse_seal_close_evidence_v1(reader.length_prefixed("seal-close evidence")?)?;
    let settlement_projection =
        parse_settlement_projection_v0(reader.length_prefixed("settlement projection")?)?;
    reader.finish()?;
    Ok(CompleteProvingInputV1 {
        witness,
        seal_open,
        seal_close,
        settlement_projection,
    })
}

fn failure_code_v1_codepoint(code: &str) -> Option<u8> {
    FAILURE_CODES_V1
        .iter()
        .position(|item| *item == code)
        .map(|index| index as u8)
}

fn map_shared_code(code: &'static str) -> &'static str {
    if code == "creation-transaction-mismatch" {
        "settlement-projection-commitment-mismatch"
    } else {
        code
    }
}

fn make_result_v1(
    statement: Option<&ImportCreatedNoteStatementV1>,
    projection_commitment: [u8; 32],
    stage: &'static str,
    code: &'static str,
) -> ApntResult<PublicResultV1> {
    let failure_stage = failure_stage_codepoint(stage)
        .ok_or_else(|| err(format!("unknown failure stage {stage}")))?;
    let failure_code = failure_code_v1_codepoint(code)
        .ok_or_else(|| err(format!("unknown v1 failure code {code}")))?;
    let accepted = stage == "accepted" && code == "full-import-created-note-semantics-accepted";
    let passed = |candidate: &'static str| -> bool {
        failure_stage > failure_stage_codepoint(candidate).expect("frozen stage exists")
    };
    let object_counts = statement.map_or(
        PublicObjectCountsV0 {
            created_logical_notes: 0,
            created_backing_cells: 0,
            import_creation_scopes: 0,
            recovery_packet_references: 0,
        },
        |statement| PublicObjectCountsV0 {
            created_logical_notes: statement.created_logical_notes.len() as u32,
            created_backing_cells: statement.created_backing_cells.len() as u32,
            import_creation_scopes: statement.import_creation_scopes.len() as u32,
            recovery_packet_references: statement.created_logical_notes.len() as u32,
        },
    );
    Ok(PublicResultV1 {
        statement_commitment: statement.map(|statement| statement.commitment),
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
        ],
    })
}

pub fn serialize_public_result_v1(result: &PublicResultV1) -> ApntResult<Vec<u8>> {
    if result.failure_stage as usize >= super::FAILURE_STAGES.len()
        || result.failure_code as usize >= FAILURE_CODES_V1.len()
    {
        return Err(err("APNTIRV1 has unsupported failure identity"));
    }
    let canonical = make_result_v1(
        None,
        result.settlement_projection_commitment,
        result.failure_stage_name(),
        result.failure_code_name(),
    )?;
    let expected_booleans = canonical.booleans;
    if result.booleans != expected_booleans {
        return Err(err(
            "APNTIRV1 progression booleans are not derived from failure stage",
        ));
    }
    let mut out = Vec::with_capacity(RESULT_V1_BYTES);
    out.extend_from_slice(RESULT_V1_MAGIC);
    out.push(1);
    out.extend_from_slice(&(RELATION_V1_DOMAIN.len() as u16).to_le_bytes());
    out.extend_from_slice(RELATION_V1_DOMAIN.as_bytes());
    out.extend_from_slice(&(RELATION_V1_IDENTITY.len() as u16).to_le_bytes());
    out.extend_from_slice(RELATION_V1_IDENTITY.as_bytes());
    out.extend_from_slice(&SEMANTIC_CONTRACT_V1_COMMITMENT);
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
    out.extend_from_slice(
        &result
            .object_counts
            .recovery_packet_references
            .to_le_bytes(),
    );
    out.extend(result.booleans.iter().map(|value| u8::from(*value)));
    if out.len() != RESULT_V1_BYTES {
        return Err(err("APNTIRV1 length drift"));
    }
    Ok(out)
}

pub fn parse_public_result_v1(bytes: &[u8]) -> ApntResult<PublicResultV1> {
    let mut reader = Reader::new(bytes, "APNTIRV1");
    reader.expect(RESULT_V1_MAGIC, "magic")?;
    if reader.u8("version")? != 1 {
        return Err(err("APNTIRV1 has unsupported version"));
    }
    if reader.text("domain")? != RELATION_V1_DOMAIN {
        return Err(err("APNTIRV1 has unsupported domain"));
    }
    if reader.text("relation identity")? != RELATION_V1_IDENTITY {
        return Err(err("APNTIRV1 has unsupported relation identity"));
    }
    if reader.bytes32("semantic contract commitment")? != SEMANTIC_CONTRACT_V1_COMMITMENT {
        return Err(err("APNTIRV1 has unsupported semantic contract commitment"));
    }
    let statement_present = reader.u8("statement commitment presence")?;
    if statement_present > 1 {
        return Err(err("APNTIRV1 has invalid statement commitment presence"));
    }
    let statement_bytes = reader.bytes32("statement commitment")?;
    let statement_commitment = if statement_present == 0 {
        if statement_bytes != [0u8; 32] {
            return Err(err(
                "APNTIRV1 absent statement commitment must be zero-filled",
            ));
        }
        None
    } else {
        Some(statement_bytes)
    };
    let settlement_projection_commitment = reader.bytes32("settlement projection commitment")?;
    let failure_stage = reader.u8("failure stage")?;
    let failure_code = reader.u8("failure code")?;
    let object_counts = PublicObjectCountsV0 {
        created_logical_notes: reader.u32("created logical note count")?,
        created_backing_cells: reader.u32("created backing cell count")?,
        import_creation_scopes: reader.u32("creation scope count")?,
        recovery_packet_references: reader.u32("recovery packet reference count")?,
    };
    let mut booleans = [false; 21];
    for value in &mut booleans {
        *value = match reader.u8("result boolean")? {
            0 => false,
            1 => true,
            _ => return Err(err("APNTIRV1 has non-canonical boolean")),
        };
    }
    reader.finish()?;
    let result = PublicResultV1 {
        statement_commitment,
        settlement_projection_commitment,
        failure_stage,
        failure_code,
        object_counts,
        booleans,
    };
    if serialize_public_result_v1(&result)? != bytes {
        return Err(err("APNTIRV1 is not canonical"));
    }
    Ok(result)
}

pub fn encode_sp1_public_values_v1(result: &PublicResultV1) -> ApntResult<Vec<u8>> {
    serialize_public_result_v1(result)
}

fn skeleton_set_commitment_v1(
    cells: &[StatementBackingCellV0],
    projection: &SettlementProjectionV0,
) -> ApntResult<[u8; 32]> {
    let mut encoded = Vec::with_capacity(13 + cells.len() * 44);
    encoded.extend_from_slice(SKELETON_SET_V1_MAGIC);
    encoded.push(1);
    encoded.extend_from_slice(&(cells.len() as u32).to_le_bytes());
    for cell in cells {
        let output = projection
            .outputs
            .get(cell.output_index as usize)
            .ok_or_else(|| err("backing cell references missing settlement output"))?;
        encoded.extend_from_slice(&cell.output_index.to_le_bytes());
        encoded.extend_from_slice(&output.value_sats.to_le_bytes());
        encoded.extend_from_slice(&cell.locking_profile_id);
    }
    sha256_domain_separated(SKELETON_SET_V1_COMMITMENT_DOMAIN, &encoded)
}

fn core_statement_v1(
    statement: &ImportCreatedNoteStatementV1,
    projection: &SettlementProjectionV0,
) -> ApntResult<ImportCreatedNoteStatementV0> {
    let inputs = projection
        .inputs
        .iter()
        .enumerate()
        .map(|(index, input)| ProjectionInputV0 {
            outpoint: input.outpoint,
            sequence_number: input.sequence_number,
            spent_value_sats: input.spent_value_sats,
            spent_locking_bytecode: input.spent_locking_bytecode.clone(),
            role: if index == statement.seal_close_input_index as usize {
                0
            } else {
                1
            },
        })
        .collect::<Vec<_>>();
    let outputs = projection
        .outputs
        .iter()
        .enumerate()
        .map(|(index, output)| ProjectionOutputV0 {
            value_sats: output.value_sats,
            locking_bytecode_template: output.locking_bytecode.clone(),
            statement_commitment_offset: None,
            role: if index < RECOVERY_FIRST_OUTPUT_INDEX {
                0
            } else if index < COLLATERAL_OUTPUT_INDEX {
                1
            } else {
                2
            },
            locking_profile_id: if index < RECOVERY_FIRST_OUTPUT_INDEX {
                statement
                    .created_backing_cells
                    .iter()
                    .find(|cell| cell.output_index as usize == index)
                    .map(|cell| cell.locking_profile_id)
            } else {
                None
            },
        })
        .collect::<Vec<_>>();
    let public_accounting = PublicAccountingV0 {
        import_funding_value_sats: inputs
            .get(statement.seal_close_input_index as usize)
            .map_or(0, |input| input.spent_value_sats),
        non_backing_input_value_sats: checked_satoshi_sum(
            &inputs
                .iter()
                .filter(|input| input.role == 1)
                .map(|input| input.spent_value_sats)
                .collect::<Vec<_>>(),
        )?,
        created_backing_output_value_sats: checked_satoshi_sum(
            &outputs
                .iter()
                .filter(|output| output.role == 0)
                .map(|output| output.value_sats)
                .collect::<Vec<_>>(),
        )?,
        non_backing_output_value_sats: checked_satoshi_sum(
            &outputs
                .iter()
                .filter(|output| output.role != 0)
                .map(|output| output.value_sats)
                .collect::<Vec<_>>(),
        )?,
        total_input_value_sats: checked_satoshi_sum(
            &inputs
                .iter()
                .map(|input| input.spent_value_sats)
                .collect::<Vec<_>>(),
        )?,
        total_output_value_sats: checked_satoshi_sum(
            &outputs
                .iter()
                .map(|output| output.value_sats)
                .collect::<Vec<_>>(),
        )?,
    };
    let projection_v0 = TransactionProjectionV0 {
        transaction_version: projection.transaction_version,
        locktime: projection.locktime,
        inputs,
        outputs,
    };
    let import_creation_scopes = statement
        .import_creation_scopes
        .iter()
        .map(|reference| ScopeReferenceV0 {
            commitment: reference.commitment,
            scope: ImportCreationScopeV0 {
                encoded: reference.scope.encoded.clone(),
                network: reference.scope.network,
                privacy_profile_id: reference.scope.privacy_profile_id,
                import_funding_outpoint: reference.scope.import_funding_outpoint,
                creation_transaction_id: projection.commitment,
                skeleton_set_commitment: reference.scope.skeleton_set_commitment,
                scope_nonce: reference.scope.scope_nonce,
            },
        })
        .collect();
    Ok(ImportCreatedNoteStatementV0 {
        encoded: statement.encoded.clone(),
        commitment: statement.commitment,
        network: statement.network,
        privacy_profile_id: statement.privacy_profile_id,
        import_funding_outpoint: statement.import_funding_outpoint,
        import_funding_value_sats: statement.import_funding_value_sats,
        import_funding_cell_commitment: statement.import_funding_cell_commitment,
        eligibility_statement_bind: statement.eligibility_statement_bind,
        output_fingerprint: statement.output_fingerprint,
        seal_open_commitment: statement.seal_open_commitment,
        seal_close_outpoint: statement.seal_close_outpoint,
        seal_close_input_index: statement.seal_close_input_index,
        seal_close_previous_commitment: statement.seal_close_previous_commitment,
        creation_transaction_id: projection.commitment,
        projection: projection_v0,
        created_logical_notes: statement.created_logical_notes.clone(),
        created_backing_cells: statement.created_backing_cells.clone(),
        import_creation_scopes,
        recovery_packet_table_commitment: statement.recovery_packet_table_commitment,
        authorized_import_fee_sats: statement.authorized_import_fee_sats,
        public_accounting,
    })
}

fn validate_import_conservation_v1(
    statement: &ImportCreatedNoteStatementV1,
    witness: &CompletePrivateWitnessV0,
) -> Option<&'static str> {
    let created_backing = match checked_satoshi_sum(
        &witness
            .backing_cell_witnesses
            .iter()
            .map(|cell| cell.opening.value_sats)
            .collect::<Vec<_>>(),
    ) {
        Ok(value) => value,
        Err(_) => return Some("arithmetic-overflow"),
    };
    let backing_plus_fee =
        match checked_satoshi_add(created_backing, statement.authorized_import_fee_sats) {
            Ok(value) => value,
            Err(_) => return Some("arithmetic-overflow"),
        };
    if statement.import_funding_value_sats != backing_plus_fee {
        Some("import-conservation-mismatch")
    } else {
        None
    }
}

fn raw_sha256(bytes: &[u8]) -> [u8; 32] {
    Sha256::digest(bytes).into()
}

fn recovery_carrier_lock(payload: &[u8]) -> Vec<u8> {
    let mut result = Vec::with_capacity(201);
    result.push(0x4c);
    result.push(197);
    result.extend_from_slice(payload);
    result.push(0x75);
    result.push(0x51);
    result
}

pub fn evaluate_complete_proving_input_v1(bytes: &[u8]) -> ApntResult<PublicResultV1> {
    let input = parse_complete_proving_input_v1(bytes)?;
    let zero = [0u8; 32];
    if input
        .witness
        .rejection_only_metadata
        .caller_authored_accepted
        .is_some()
    {
        return make_result_v1(None, zero, "witness-shape", "unsupported-caller-status");
    }
    if input
        .witness
        .rejection_only_metadata
        .statement_relation_identity_override
        .is_some()
    {
        return make_result_v1(
            None,
            zero,
            "statement-boundary",
            "relation-identity-mismatch",
        );
    }
    let statement = match parse_import_created_note_statement_v1(&input.witness.statement_bytes) {
        Ok(statement) => statement,
        Err(_) => return make_result_v1(None, zero, "statement-boundary", "statement-malformed"),
    };
    let projection = &input.settlement_projection;
    if projection.commitment != statement.settlement_projection_commitment {
        return make_result_v1(
            Some(&statement),
            projection.commitment,
            "statement-boundary",
            "settlement-projection-commitment-mismatch",
        );
    }
    if input.witness.expected_statement_commitment != statement.commitment {
        return make_result_v1(
            Some(&statement),
            projection.commitment,
            "statement-boundary",
            "statement-commitment-mismatch",
        );
    }
    let seal_open = &input.seal_open;
    let seal_close = &input.seal_close;
    if statement.network != projection.network
        || statement.network != seal_open.network
        || statement.network != seal_close.network
    {
        return make_result_v1(
            Some(&statement),
            projection.commitment,
            "import-seal-identity",
            "network-mismatch",
        );
    }
    if projection.verifier_profile_identity != statement.privacy_profile_id {
        return make_result_v1(
            Some(&statement),
            projection.commitment,
            "import-seal-identity",
            "settlement-projection-profile-mismatch",
        );
    }
    let projected_import = projection
        .inputs
        .get(statement.seal_close_input_index as usize);
    let seal_code = if statement.settlement_projection_commitment
        != seal_close.settlement_projection_commitment
    {
        Some("settlement-projection-commitment-mismatch")
    } else if statement.import_funding_value_sats.to_string() != seal_open.value_sats
        || projected_import.is_none_or(|projected| {
            projected.spent_value_sats != statement.import_funding_value_sats
        })
    {
        Some("import-funding-value-mismatch")
    } else if statement.import_funding_cell_commitment != seal_open.import_funding_cell_commitment
        || statement.import_funding_cell_commitment != seal_close.import_funding_cell_commitment
    {
        Some("import-cell-commitment-mismatch")
    } else if statement.eligibility_statement_bind != seal_open.eligibility_statement_bind
        || statement.eligibility_statement_bind != seal_close.eligibility_statement_bind
    {
        Some("eligibility-bind-mismatch")
    } else if projected_import.is_none_or(|projected| {
        raw_sha256(&projected.spent_locking_bytecode) != seal_open.locking_bytecode_hash
    }) || statement.output_fingerprint != seal_open.output_fingerprint
        || statement.output_fingerprint != seal_close.previous_output_fingerprint
    {
        Some("output-fingerprint-mismatch")
    } else if statement.import_funding_outpoint != seal_open.seal_outpoint
        || statement.seal_close_outpoint != seal_close.consumed_seal_outpoint
    {
        Some("seal-outpoint-mismatch")
    } else if seal_commitment_v0(seal_open)? != seal_open.seal_commitment
        || statement.seal_open_commitment != seal_open.seal_commitment
        || statement.seal_close_previous_commitment != seal_close.previous_seal_commitment
    {
        Some("seal-commitment-mismatch")
    } else if statement.seal_close_input_index != seal_close.input_index
        || projected_import
            .is_none_or(|projected| projected.outpoint != statement.import_funding_outpoint)
    {
        Some("consumed-input-mismatch")
    } else {
        None
    };
    if let Some(code) = seal_code {
        return make_result_v1(
            Some(&statement),
            projection.commitment,
            "import-seal-identity",
            code,
        );
    }

    if statement.created_backing_cells.len() != RECOVERY_FIRST_OUTPUT_INDEX
        || statement
            .created_backing_cells
            .iter()
            .enumerate()
            .any(|(index, cell)| cell.output_index as usize != index)
    {
        return make_result_v1(
            Some(&statement),
            projection.commitment,
            "created-backing-cell-identity",
            "created-output-index-mismatch",
        );
    }
    for cell in &statement.created_backing_cells {
        let output = &projection.outputs[cell.output_index as usize];
        if sha256_domain_separated(
            SETTLEMENT_BACKING_LOCKING_PROFILE_DOMAIN,
            &output.locking_bytecode,
        )? != cell.locking_profile_id
        {
            return make_result_v1(
                Some(&statement),
                projection.commitment,
                "created-backing-cell-identity",
                "settlement-backing-lock-mismatch",
            );
        }
    }
    let skeleton_commitment =
        skeleton_set_commitment_v1(&statement.created_backing_cells, projection)?;
    if statement
        .import_creation_scopes
        .iter()
        .any(|reference| reference.scope.skeleton_set_commitment != skeleton_commitment)
    {
        return make_result_v1(
            Some(&statement),
            projection.commitment,
            "created-backing-cell-identity",
            "creation-scope-mismatch",
        );
    }
    let packet_bin = &input.witness.packet_table.packet_bin;
    if packet_bin.len() != RECOVERY_PACKET_BIN_BYTES
        || projection.outputs[RECOVERY_FIRST_OUTPUT_INDEX..COLLATERAL_OUTPUT_INDEX]
            .iter()
            .enumerate()
            .any(|(index, output)| {
                output.locking_bytecode
                    != recovery_carrier_lock(&packet_bin[index * 197..(index + 1) * 197])
            })
    {
        return make_result_v1(
            Some(&statement),
            projection.commitment,
            "recovery-consistency",
            "settlement-recovery-envelope-mismatch",
        );
    }

    let core = core_statement_v1(&statement, projection)?;
    if let Some(code) = validate_created_notes(&core, &input.witness)? {
        return make_result_v1(
            Some(&statement),
            projection.commitment,
            "created-note-identity",
            map_shared_code(code),
        );
    }
    if let Some(code) = validate_created_backing_cells(&core, &input.witness)? {
        return make_result_v1(
            Some(&statement),
            projection.commitment,
            "created-backing-cell-identity",
            map_shared_code(code),
        );
    }
    if let Some(code) = validate_created_backing(&core, &input.witness)? {
        return make_result_v1(
            Some(&statement),
            projection.commitment,
            "created-backing",
            map_shared_code(code),
        );
    }
    if let Some(code) = validate_created_completeness(&core, &input.witness) {
        return make_result_v1(
            Some(&statement),
            projection.commitment,
            "created-completeness",
            map_shared_code(code),
        );
    }
    if let Some(code) = validate_created_disjointness(&input.witness) {
        return make_result_v1(
            Some(&statement),
            projection.commitment,
            "created-disjointness",
            map_shared_code(code),
        );
    }
    if let Some(code) = validate_import_conservation_v1(&statement, &input.witness) {
        return make_result_v1(
            Some(&statement),
            projection.commitment,
            "import-conservation",
            code,
        );
    }
    if let Some(code) = validate_recovery_consistency(&core, &input.witness)? {
        return make_result_v1(
            Some(&statement),
            projection.commitment,
            "recovery-consistency",
            map_shared_code(code),
        );
    }
    if let Some(code) = validate_authority_readiness(&core, &input.witness)? {
        return make_result_v1(
            Some(&statement),
            projection.commitment,
            "authority-readiness",
            map_shared_code(code),
        );
    }
    if let Some(code) = validate_nullifier_readiness(&core, &input.witness)? {
        return make_result_v1(
            Some(&statement),
            projection.commitment,
            "nullifier-readiness",
            map_shared_code(code),
        );
    }
    make_result_v1(
        Some(&statement),
        projection.commitment,
        "accepted",
        "full-import-created-note-semantics-accepted",
    )
}

pub fn evaluate_complete_proving_input_bytes_v1(bytes: &[u8]) -> ApntResult<Vec<u8>> {
    serialize_public_result_v1(&evaluate_complete_proving_input_v1(bytes)?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::MAX_BCH_MONEY_SATS;

    fn projection_bytes(
        inputs: [u64; SETTLEMENT_INPUT_COUNT],
        outputs: [u64; SETTLEMENT_OUTPUT_COUNT],
    ) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(4_719);
        bytes.extend_from_slice(SETTLEMENT_PROJECTION_MAGIC);
        bytes.extend_from_slice(&[0, 0]);
        bytes.extend_from_slice(&[1; 32]);
        bytes.extend_from_slice(&2u32.to_le_bytes());
        bytes.extend_from_slice(&0u32.to_le_bytes());
        for (index, value) in inputs.iter().enumerate() {
            bytes.extend_from_slice(&[(index + 1) as u8; 32]);
            bytes.extend_from_slice(&(index as u32).to_le_bytes());
            bytes.extend_from_slice(&0u32.to_le_bytes());
            bytes.extend_from_slice(&value.to_le_bytes());
            bytes.extend_from_slice(&[index as u8; STAGE_LOCKING_BYTES]);
        }
        for (index, value) in outputs.iter().enumerate() {
            bytes.extend_from_slice(&value.to_le_bytes());
            let locking_length =
                if (RECOVERY_FIRST_OUTPUT_INDEX..COLLATERAL_OUTPUT_INDEX).contains(&index) {
                    RECOVERY_LOCKING_BYTES
                } else {
                    STAGE_LOCKING_BYTES
                };
            bytes.extend(vec![index as u8; locking_length]);
        }
        bytes
    }

    #[test]
    fn settlement_projection_money_range_matches_the_checked_aggregate_boundary() {
        let mut inputs_at_maximum = [1u64; SETTLEMENT_INPUT_COUNT];
        inputs_at_maximum[0] = MAX_BCH_MONEY_SATS - 11;
        let unit_outputs = [1u64; SETTLEMENT_OUTPUT_COUNT];
        let parsed =
            parse_settlement_projection_v0(&projection_bytes(inputs_at_maximum, unit_outputs))
                .unwrap();
        assert_eq!(parsed.fee_sats, MAX_BCH_MONEY_SATS - 20);
        assert_eq!(parsed.postage_sats, 15);

        let mut inputs_above_maximum = inputs_at_maximum;
        inputs_above_maximum[0] += 1;
        assert!(parse_settlement_projection_v0(&projection_bytes(
            inputs_above_maximum,
            unit_outputs
        ))
        .is_err());

        let mut outputs_above_maximum = unit_outputs;
        outputs_above_maximum[0] = MAX_BCH_MONEY_SATS - 18;
        assert!(parse_settlement_projection_v0(&projection_bytes(
            inputs_at_maximum,
            outputs_above_maximum
        ))
        .is_err());

        let mut postage_above_maximum = unit_outputs;
        postage_above_maximum[RECOVERY_FIRST_OUTPUT_INDEX] = MAX_BCH_MONEY_SATS - 13;
        assert!(parse_settlement_projection_v0(&projection_bytes(
            inputs_at_maximum,
            postage_above_maximum
        ))
        .is_err());

        let mut individual_input_above_maximum = inputs_at_maximum;
        individual_input_above_maximum[0] = MAX_BCH_MONEY_SATS + 1;
        assert!(parse_settlement_projection_v0(&projection_bytes(
            individual_input_above_maximum,
            unit_outputs
        ))
        .is_err());

        let mut individual_output_above_maximum = unit_outputs;
        individual_output_above_maximum[0] = MAX_BCH_MONEY_SATS + 1;
        assert!(parse_settlement_projection_v0(&projection_bytes(
            inputs_at_maximum,
            individual_output_above_maximum
        ))
        .is_err());
    }
}

// Keep this import exercised so the v0 serializer remains linked into the
// additive crate and compatibility tests detect accidental module drift.
#[allow(dead_code)]
fn _v0_compatibility_link(result: &PublicResultV0) -> ApntResult<Vec<u8>> {
    serialize_public_result_v0(result)
}

#[allow(dead_code)]
fn _network_name_link(network: u8) -> &'static str {
    network_name(network)
}
