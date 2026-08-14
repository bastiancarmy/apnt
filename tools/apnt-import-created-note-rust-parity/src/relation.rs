use super::{
    build_recovery_sender_evidence_v0, build_recovery_table_from_senders_v0, checked_bch_value,
    checked_satoshi_add, checked_satoshi_sub, checked_satoshi_sum, err, failure_code_codepoint,
    failure_stage_codepoint, parse_complete_private_witness_v0, serialize_public_result_v0,
    sha256_domain_separated, ApntResult, BackingBundleMemberV1, CompletePrivateWitnessV0,
    PublicObjectCountsV0, PublicResultV0, Reader, RecoverySenderEvidenceV0,
    CREATION_SCOPE_COMMITMENT_DOMAIN, CREATION_SCOPE_DOMAIN, CREATION_SCOPE_MAGIC,
    PROJECTION_MAGIC, RELATION_IDENTITY, STATEMENT_COMMITMENT_DOMAIN, STATEMENT_DOMAIN,
    STATEMENT_MAGIC,
};

pub const PROVING_INPUT_MAGIC: &[u8; 8] = b"APNTPIV0";
pub const SEAL_OPEN_MAGIC: &[u8; 8] = b"APNTSOV0";
pub const SEAL_CLOSE_MAGIC: &[u8; 8] = b"APNTSCV0";
pub const SKELETON_SET_MAGIC: &[u8; 8] = b"APNTIBS0";
pub const SKELETON_SET_COMMITMENT_DOMAIN: &str =
    "bch-cloak-apnt-v0:import-created-backing-skeleton-set-commitment-v0";
pub const SEAL_PREIMAGE_DOMAIN: &str = "bch-cloak-apnt-v0:utxo-seal-commitment-preimage";
pub const SEAL_COMMITMENT_DOMAIN: &str = "bch-cloak-apnt-v0:utxo-seal-commitment";
pub const SEAL_OPEN_DOMAIN: &str = "bch-cloak-apnt-v0:utxo-seal-identity-evidence";
pub const SEAL_OPEN_KIND: &str = "apnt-utxo-seal-identity-evidence-v0";
pub const SEAL_CLOSE_DOMAIN: &str = "bch-cloak-apnt-v0:utxo-seal-closure-evidence";
pub const SEAL_CLOSE_KIND: &str = "apnt-utxo-seal-closure-evidence-v0";
pub const OWNER_AUTHORITY_DOMAIN: &str = "bch-cloak-apnt-v0:owner-authority-v0";
pub const BUNDLE_NULLIFIER_DOMAIN: &str = "bch-cloak-apnt-v0:bundle-nullifier-v1";

const MAX_LOGICAL_NOTES: u32 = 1_024;
const MAX_BACKING_CELLS: u32 = 4_096;
const MAX_SCOPES: u32 = 1_024;
const MAX_PROJECTION_INPUTS: u32 = 8_192;
const MAX_PROJECTION_OUTPUTS: u32 = 8_192;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct OutpointV0 {
    pub txid: [u8; 32],
    pub vout: u32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProjectionInputV0 {
    pub outpoint: OutpointV0,
    pub sequence_number: u32,
    pub spent_value_sats: u64,
    pub spent_locking_bytecode: Vec<u8>,
    pub role: u8,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProjectionOutputV0 {
    pub value_sats: u64,
    pub locking_bytecode_template: Vec<u8>,
    pub statement_commitment_offset: Option<u32>,
    pub role: u8,
    pub locking_profile_id: Option<[u8; 32]>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TransactionProjectionV0 {
    pub transaction_version: u32,
    pub locktime: u32,
    pub inputs: Vec<ProjectionInputV0>,
    pub outputs: Vec<ProjectionOutputV0>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ImportCreationScopeV0 {
    pub encoded: Vec<u8>,
    pub network: u8,
    pub privacy_profile_id: [u8; 32],
    pub import_funding_outpoint: OutpointV0,
    pub creation_transaction_id: [u8; 32],
    pub skeleton_set_commitment: [u8; 32],
    pub scope_nonce: [u8; 32],
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StatementLogicalNoteV0 {
    pub created_note_commitment: [u8; 32],
    pub creation_scope: [u8; 32],
    pub recovery_packet_index: u32,
    pub recovery_packet_hash: [u8; 32],
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StatementBackingCellV0 {
    pub output_index: u32,
    pub seal_cell_commitment: [u8; 32],
    pub locking_profile_id: [u8; 32],
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScopeReferenceV0 {
    pub commitment: [u8; 32],
    pub scope: ImportCreationScopeV0,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PublicAccountingV0 {
    pub import_funding_value_sats: u64,
    pub non_backing_input_value_sats: u64,
    pub created_backing_output_value_sats: u64,
    pub non_backing_output_value_sats: u64,
    pub total_input_value_sats: u64,
    pub total_output_value_sats: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ImportCreatedNoteStatementV0 {
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
    pub creation_transaction_id: [u8; 32],
    pub projection: TransactionProjectionV0,
    pub created_logical_notes: Vec<StatementLogicalNoteV0>,
    pub created_backing_cells: Vec<StatementBackingCellV0>,
    pub import_creation_scopes: Vec<ScopeReferenceV0>,
    pub recovery_packet_table_commitment: [u8; 32],
    pub authorized_import_fee_sats: u64,
    pub public_accounting: PublicAccountingV0,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SealOpenEvidenceV0 {
    pub network: u8,
    pub seal_outpoint: OutpointV0,
    pub value_sats: String,
    pub import_funding_cell_commitment: [u8; 32],
    pub eligibility_statement_bind: [u8; 32],
    pub output_fingerprint: [u8; 32],
    pub locking_bytecode_hash: [u8; 32],
    pub seal_commitment: [u8; 32],
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SealCloseEvidenceV0 {
    pub network: u8,
    pub consumed_seal_outpoint: OutpointV0,
    pub consumption_txid: [u8; 32],
    pub input_index: u32,
    pub previous_seal_commitment: [u8; 32],
    pub previous_output_fingerprint: [u8; 32],
    pub import_funding_cell_commitment: [u8; 32],
    pub eligibility_statement_bind: [u8; 32],
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CompleteProvingInputV0 {
    pub witness: CompletePrivateWitnessV0,
    pub seal_open: SealOpenEvidenceV0,
    pub seal_close: SealCloseEvidenceV0,
}

pub(crate) fn bytes_equal(left: &[u8], right: &[u8]) -> bool {
    left.len() == right.len()
        && left
            .iter()
            .zip(right)
            .fold(0u8, |difference, (left, right)| difference | (left ^ right))
            == 0
}

pub(crate) fn require_nonzero(value: &[u8; 32], name: &str) -> ApntResult<()> {
    if value.iter().all(|byte| *byte == 0) {
        return Err(err(format!("{name} must not be all zero")));
    }
    Ok(())
}

pub(crate) fn bounded_count(
    value: u32,
    maximum: u32,
    nonempty: bool,
    name: &str,
) -> ApntResult<u32> {
    if value > maximum || (nonempty && value == 0) {
        return Err(err(format!("{name} is outside the canonical bound")));
    }
    Ok(value)
}

pub(crate) fn parse_network(value: u8) -> ApntResult<u8> {
    if value > 2 {
        return Err(err("unsupported APNT network"));
    }
    Ok(value)
}

pub(crate) fn network_name(value: u8) -> &'static str {
    match value {
        0 => "chipnet",
        1 => "mainnet",
        2 => "regtest",
        _ => unreachable!("network parser rejects unsupported codepoints"),
    }
}

pub(crate) fn read_outpoint(reader: &mut Reader<'_>, name: &str) -> ApntResult<OutpointV0> {
    let mut txid: [u8; 32] = reader.take(32, name)?.try_into().expect("32 bytes");
    txid.reverse();
    require_nonzero(&txid, name)?;
    Ok(OutpointV0 {
        txid,
        vout: reader.u32(name)?,
    })
}

fn parse_projection_v0(bytes: &[u8]) -> ApntResult<TransactionProjectionV0> {
    let mut reader = Reader::new(bytes, "APNTIPV0");
    reader.expect(PROJECTION_MAGIC, "magic")?;
    if reader.u8("version")? != 0 {
        return Err(err("APNTIPV0 has unsupported version"));
    }
    let transaction_version = reader.u32("transaction version")?;
    let locktime = reader.u32("locktime")?;
    let input_count = bounded_count(
        reader.u32("input count")?,
        MAX_PROJECTION_INPUTS,
        true,
        "projection input count",
    )?;
    let mut inputs = Vec::with_capacity(input_count as usize);
    let mut import_count = 0usize;
    for _ in 0..input_count {
        let outpoint = read_outpoint(&mut reader, "projection input outpoint")?;
        if inputs
            .iter()
            .any(|input: &ProjectionInputV0| input.outpoint == outpoint)
        {
            return Err(err("APNTIPV0 has duplicate input outpoint"));
        }
        let sequence_number = reader.u32("projection input sequence")?;
        let spent_value_sats = checked_bch_value(reader.u64("projection input value")?, false)?;
        let spent_locking_bytecode = reader
            .length_prefixed("projection input locking bytecode")?
            .to_vec();
        if reader.u8("projection input token presence")? != 0 {
            return Err(err("APNTIPV0 contains a token-bearing input"));
        }
        let role = reader.u8("projection input role")?;
        match role {
            0 => import_count += 1,
            1 => {}
            _ => return Err(err("APNTIPV0 has unsupported input role")),
        }
        inputs.push(ProjectionInputV0 {
            outpoint,
            sequence_number,
            spent_value_sats,
            spent_locking_bytecode,
            role,
        });
    }
    if import_count != 1 {
        return Err(err("APNTIPV0 requires exactly one import-funding input"));
    }
    let output_count = bounded_count(
        reader.u32("output count")?,
        MAX_PROJECTION_OUTPUTS,
        true,
        "projection output count",
    )?;
    let mut outputs = Vec::with_capacity(output_count as usize);
    for _ in 0..output_count {
        let value_sats = checked_bch_value(reader.u64("projection output value")?, false)?;
        let locking_bytecode_template = reader
            .length_prefixed("projection output locking bytecode")?
            .to_vec();
        let statement_commitment_offset = match reader.u8("statement offset presence")? {
            0 => None,
            1 => Some(reader.u32("statement offset")?),
            _ => return Err(err("APNTIPV0 has invalid statement-offset presence")),
        };
        if statement_commitment_offset.is_some_and(|offset| {
            let offset = offset as usize;
            offset > locking_bytecode_template.len()
                || locking_bytecode_template.len() - offset < 32
        }) {
            return Err(err("APNTIPV0 statement offset does not identify 32 bytes"));
        }
        if reader.u8("projection output token presence")? != 0 {
            return Err(err("APNTIPV0 contains a token-bearing output"));
        }
        let role = reader.u8("projection output role")?;
        if role > 2 {
            return Err(err("APNTIPV0 has unsupported output role"));
        }
        let locking_profile_id = match reader.u8("locking profile presence")? {
            0 => None,
            1 => Some(reader.bytes32("locking profile")?),
            _ => return Err(err("APNTIPV0 has invalid locking-profile presence")),
        };
        if role == 0 {
            checked_bch_value(value_sats, true)?;
            let profile = locking_profile_id
                .as_ref()
                .ok_or_else(|| err("APNTIPV0 private backing lacks a locking profile"))?;
            require_nonzero(profile, "projection locking profile")?;
        } else if locking_profile_id.is_some() {
            return Err(err("APNTIPV0 non-backing output has a locking profile"));
        }
        outputs.push(ProjectionOutputV0 {
            value_sats,
            locking_bytecode_template,
            statement_commitment_offset,
            role,
            locking_profile_id,
        });
    }
    reader.finish()?;
    if !outputs.iter().any(|output| output.role == 0)
        || !outputs.iter().any(|output| output.role == 1)
    {
        return Err(err("APNTIPV0 lacks a required output role"));
    }
    Ok(TransactionProjectionV0 {
        transaction_version,
        locktime,
        inputs,
        outputs,
    })
}

fn parse_creation_scope_v0(bytes: &[u8]) -> ApntResult<ImportCreationScopeV0> {
    let mut reader = Reader::new(bytes, "APNTICV0");
    reader.expect(CREATION_SCOPE_MAGIC, "magic")?;
    if reader.u8("version")? != 0 || reader.text("domain")? != CREATION_SCOPE_DOMAIN {
        return Err(err("APNTICV0 has unsupported identity"));
    }
    let network = parse_network(reader.u8("network")?)?;
    if reader.text("relation identity")? != RELATION_IDENTITY {
        return Err(err("APNTICV0 has unsupported relation identity"));
    }
    let privacy_profile_id = reader.bytes32("scope privacy profile")?;
    require_nonzero(&privacy_profile_id, "scope privacy profile")?;
    let import_funding_outpoint = read_outpoint(&mut reader, "scope import outpoint")?;
    let creation_transaction_id = reader.bytes32("scope creation transaction")?;
    let skeleton_set_commitment = reader.bytes32("scope skeleton-set commitment")?;
    let scope_nonce = reader.bytes32("scope nonce")?;
    for (name, value) in [
        ("scope creation transaction", &creation_transaction_id),
        ("scope skeleton-set commitment", &skeleton_set_commitment),
        ("scope nonce", &scope_nonce),
    ] {
        require_nonzero(value, name)?;
    }
    reader.finish()?;
    Ok(ImportCreationScopeV0 {
        encoded: bytes.to_vec(),
        network,
        privacy_profile_id,
        import_funding_outpoint,
        creation_transaction_id,
        skeleton_set_commitment,
        scope_nonce,
    })
}

fn skeleton_set_commitment_v0(
    statement_cells: &[StatementBackingCellV0],
    projection: &TransactionProjectionV0,
) -> ApntResult<[u8; 32]> {
    let mut bytes = Vec::with_capacity(13 + statement_cells.len() * 44);
    bytes.extend_from_slice(SKELETON_SET_MAGIC);
    bytes.push(0);
    bytes.extend_from_slice(&(statement_cells.len() as u32).to_le_bytes());
    for cell in statement_cells {
        let output = projection
            .outputs
            .get(cell.output_index as usize)
            .ok_or_else(|| err("statement backing cell references a missing output"))?;
        bytes.extend_from_slice(&cell.output_index.to_le_bytes());
        bytes.extend_from_slice(&output.value_sats.to_le_bytes());
        bytes.extend_from_slice(&cell.locking_profile_id);
    }
    sha256_domain_separated(SKELETON_SET_COMMITMENT_DOMAIN, &bytes)
}

fn accounting_from_projection(
    projection: &TransactionProjectionV0,
) -> ApntResult<PublicAccountingV0> {
    let import_values = projection
        .inputs
        .iter()
        .filter(|input| input.role == 0)
        .map(|input| input.spent_value_sats)
        .collect::<Vec<_>>();
    let collateral_inputs = projection
        .inputs
        .iter()
        .filter(|input| input.role == 1)
        .map(|input| input.spent_value_sats)
        .collect::<Vec<_>>();
    let backing_outputs = projection
        .outputs
        .iter()
        .filter(|output| output.role == 0)
        .map(|output| output.value_sats)
        .collect::<Vec<_>>();
    let other_outputs = projection
        .outputs
        .iter()
        .filter(|output| output.role != 0)
        .map(|output| output.value_sats)
        .collect::<Vec<_>>();
    Ok(PublicAccountingV0 {
        import_funding_value_sats: checked_satoshi_sum(&import_values)?,
        non_backing_input_value_sats: checked_satoshi_sum(&collateral_inputs)?,
        created_backing_output_value_sats: checked_satoshi_sum(&backing_outputs)?,
        non_backing_output_value_sats: checked_satoshi_sum(&other_outputs)?,
        total_input_value_sats: checked_satoshi_sum(
            &projection
                .inputs
                .iter()
                .map(|input| input.spent_value_sats)
                .collect::<Vec<_>>(),
        )?,
        total_output_value_sats: checked_satoshi_sum(
            &projection
                .outputs
                .iter()
                .map(|output| output.value_sats)
                .collect::<Vec<_>>(),
        )?,
    })
}

pub fn parse_import_created_note_statement_v0(
    bytes: &[u8],
) -> ApntResult<ImportCreatedNoteStatementV0> {
    let mut reader = Reader::new(bytes, "APNTISV0");
    reader.expect(STATEMENT_MAGIC, "magic")?;
    if reader.u8("version")? != 0 || reader.text("domain")? != STATEMENT_DOMAIN {
        return Err(err("APNTISV0 has unsupported identity"));
    }
    let network = parse_network(reader.u8("network")?)?;
    if reader.text("relation identity")? != RELATION_IDENTITY {
        return Err(err("APNTISV0 has unsupported relation identity"));
    }
    let privacy_profile_id = reader.bytes32("privacy profile")?;
    require_nonzero(&privacy_profile_id, "privacy profile")?;
    let import_funding_outpoint = read_outpoint(&mut reader, "import funding outpoint")?;
    let import_funding_value_sats = checked_bch_value(reader.u64("import funding value")?, true)?;
    let import_funding_cell_commitment = reader.bytes32("import cell commitment")?;
    let eligibility_statement_bind = reader.bytes32("eligibility bind")?;
    let output_fingerprint = reader.bytes32("output fingerprint")?;
    let seal_open_commitment = reader.bytes32("seal-open commitment")?;
    for (name, value) in [
        ("import cell commitment", &import_funding_cell_commitment),
        ("eligibility bind", &eligibility_statement_bind),
        ("output fingerprint", &output_fingerprint),
        ("seal-open commitment", &seal_open_commitment),
    ] {
        require_nonzero(value, name)?;
    }
    let seal_close_outpoint = read_outpoint(&mut reader, "seal-close outpoint")?;
    let seal_close_input_index = reader.u32("seal-close input index")?;
    let seal_close_previous_commitment = reader.bytes32("previous seal commitment")?;
    require_nonzero(&seal_close_previous_commitment, "previous seal commitment")?;
    let creation_transaction_id = reader.bytes32("creation transaction id")?;
    require_nonzero(&creation_transaction_id, "creation transaction id")?;
    let projection = parse_projection_v0(reader.length_prefixed("transaction projection")?)?;

    let logical_count = bounded_count(
        reader.u32("created logical-note count")?,
        MAX_LOGICAL_NOTES,
        true,
        "created logical-note count",
    )?;
    let mut created_logical_notes = Vec::with_capacity(logical_count as usize);
    for _ in 0..logical_count {
        let created_note_commitment = reader.bytes32("created note commitment")?;
        let creation_scope = reader.bytes32("created note creation scope")?;
        let recovery_packet_index = reader.u32("recovery packet index")?;
        let recovery_packet_hash = reader.bytes32("recovery packet hash")?;
        for (name, value) in [
            ("created note commitment", &created_note_commitment),
            ("created note creation scope", &creation_scope),
            ("recovery packet hash", &recovery_packet_hash),
        ] {
            require_nonzero(value, name)?;
        }
        created_logical_notes.push(StatementLogicalNoteV0 {
            created_note_commitment,
            creation_scope,
            recovery_packet_index,
            recovery_packet_hash,
        });
    }
    if created_logical_notes
        .windows(2)
        .any(|pair| pair[0].created_note_commitment >= pair[1].created_note_commitment)
    {
        return Err(err("APNTISV0 logical notes are not in canonical order"));
    }
    if created_logical_notes
        .iter()
        .enumerate()
        .any(|(index, note)| note.recovery_packet_index != index as u32)
    {
        return Err(err("APNTISV0 recovery packet indexes are not contiguous"));
    }
    if created_logical_notes
        .iter()
        .enumerate()
        .any(|(index, note)| {
            created_logical_notes[..index]
                .iter()
                .any(|other| bytes_equal(&note.recovery_packet_hash, &other.recovery_packet_hash))
        })
    {
        return Err(err("APNTISV0 has duplicate recovery packet hash"));
    }

    let backing_count = bounded_count(
        reader.u32("created backing-cell count")?,
        MAX_BACKING_CELLS,
        true,
        "created backing-cell count",
    )?;
    let mut created_backing_cells = Vec::with_capacity(backing_count as usize);
    for _ in 0..backing_count {
        let output_index = reader.u32("created backing output index")?;
        let seal_cell_commitment = reader.bytes32("created backing cell commitment")?;
        let locking_profile_id = reader.bytes32("created backing locking profile")?;
        require_nonzero(&seal_cell_commitment, "created backing cell commitment")?;
        require_nonzero(&locking_profile_id, "created backing locking profile")?;
        created_backing_cells.push(StatementBackingCellV0 {
            output_index,
            seal_cell_commitment,
            locking_profile_id,
        });
    }
    if created_backing_cells
        .windows(2)
        .any(|pair| pair[0].output_index >= pair[1].output_index)
    {
        return Err(err("APNTISV0 backing cells are not in canonical order"));
    }
    if created_backing_cells
        .iter()
        .enumerate()
        .any(|(index, cell)| {
            created_backing_cells[..index]
                .iter()
                .any(|other| bytes_equal(&cell.seal_cell_commitment, &other.seal_cell_commitment))
        })
    {
        return Err(err("APNTISV0 has duplicate backing-cell commitment"));
    }

    let scope_count = bounded_count(
        reader.u32("creation-scope count")?,
        MAX_SCOPES,
        true,
        "creation-scope count",
    )?;
    let mut import_creation_scopes = Vec::with_capacity(scope_count as usize);
    for _ in 0..scope_count {
        let commitment = reader.bytes32("creation-scope commitment")?;
        require_nonzero(&commitment, "creation-scope commitment")?;
        let scope_bytes = reader.length_prefixed("creation scope")?;
        if sha256_domain_separated(CREATION_SCOPE_COMMITMENT_DOMAIN, scope_bytes)? != commitment {
            return Err(err("APNTISV0 creation-scope commitment mismatch"));
        }
        import_creation_scopes.push(ScopeReferenceV0 {
            commitment,
            scope: parse_creation_scope_v0(scope_bytes)?,
        });
    }
    if import_creation_scopes
        .windows(2)
        .any(|pair| pair[0].commitment >= pair[1].commitment)
    {
        return Err(err("APNTISV0 creation scopes are not in canonical order"));
    }
    let recovery_packet_table_commitment = reader.bytes32("recovery packet-table commitment")?;
    require_nonzero(
        &recovery_packet_table_commitment,
        "recovery packet-table commitment",
    )?;
    let authorized_import_fee_sats =
        checked_bch_value(reader.u64("authorized import fee")?, false)?;
    let public_accounting = PublicAccountingV0 {
        import_funding_value_sats: checked_bch_value(
            reader.u64("accounting import funding")?,
            true,
        )?,
        non_backing_input_value_sats: checked_bch_value(
            reader.u64("accounting non-backing input")?,
            false,
        )?,
        created_backing_output_value_sats: checked_bch_value(
            reader.u64("accounting created backing")?,
            true,
        )?,
        non_backing_output_value_sats: checked_bch_value(
            reader.u64("accounting non-backing output")?,
            false,
        )?,
        total_input_value_sats: checked_bch_value(reader.u64("accounting total input")?, true)?,
        total_output_value_sats: checked_bch_value(reader.u64("accounting total output")?, true)?,
    };
    reader.finish()?;

    if import_funding_outpoint != seal_close_outpoint {
        return Err(err(
            "APNTISV0 seal-close outpoint does not match import funding",
        ));
    }
    if !bytes_equal(&seal_open_commitment, &seal_close_previous_commitment) {
        return Err(err("APNTISV0 seal-open and seal-close commitments differ"));
    }
    let projected_import_input = projection
        .inputs
        .get(seal_close_input_index as usize)
        .ok_or_else(|| err("APNTISV0 consumed import input is missing"))?;
    if projected_import_input.role != 0
        || projected_import_input.outpoint != import_funding_outpoint
        || projected_import_input.spent_value_sats != import_funding_value_sats
    {
        return Err(err(
            "APNTISV0 consumed import input does not match projection",
        ));
    }
    let backing_outputs = projection
        .outputs
        .iter()
        .enumerate()
        .filter(|(_, output)| output.role == 0)
        .collect::<Vec<_>>();
    if backing_outputs.len() != created_backing_cells.len() {
        return Err(err("APNTISV0 backing tuples do not cover backing outputs"));
    }
    for (cell, (output_index, output)) in created_backing_cells.iter().zip(&backing_outputs) {
        if cell.output_index as usize != *output_index
            || output.locking_profile_id.as_ref() != Some(&cell.locking_profile_id)
        {
            return Err(err("APNTISV0 backing tuple does not match projection"));
        }
    }
    let skeleton_set_commitment = skeleton_set_commitment_v0(&created_backing_cells, &projection)?;
    for reference in &import_creation_scopes {
        let scope = &reference.scope;
        if scope.network != network
            || scope.privacy_profile_id != privacy_profile_id
            || scope.import_funding_outpoint != import_funding_outpoint
            || scope.creation_transaction_id != creation_transaction_id
            || scope.skeleton_set_commitment != skeleton_set_commitment
        {
            return Err(err("APNTISV0 import creation-scope identity mismatch"));
        }
    }
    if created_logical_notes.iter().any(|note| {
        !import_creation_scopes
            .iter()
            .any(|scope| scope.commitment == note.creation_scope)
    }) {
        return Err(err("APNTISV0 note references an unknown creation scope"));
    }
    if import_creation_scopes.iter().any(|scope| {
        !created_logical_notes
            .iter()
            .any(|note| note.creation_scope == scope.commitment)
    }) {
        return Err(err("APNTISV0 contains an unreferenced creation scope"));
    }
    let derived_accounting = accounting_from_projection(&projection)?;
    if public_accounting != derived_accounting
        || public_accounting.import_funding_value_sats != import_funding_value_sats
    {
        return Err(err("APNTISV0 public accounting does not match projection"));
    }

    Ok(ImportCreatedNoteStatementV0 {
        encoded: bytes.to_vec(),
        commitment: sha256_domain_separated(STATEMENT_COMMITMENT_DOMAIN, bytes)?,
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
        creation_transaction_id,
        projection,
        created_logical_notes,
        created_backing_cells,
        import_creation_scopes,
        recovery_packet_table_commitment,
        authorized_import_fee_sats,
        public_accounting,
    })
}

fn read_boolean(reader: &mut Reader<'_>, name: &str) -> ApntResult<bool> {
    match reader.u8(name)? {
        0 => Ok(false),
        1 => Ok(true),
        _ => Err(err(format!("non-canonical boolean at {name}"))),
    }
}

fn canonical_decimal(value: &str) -> bool {
    value == "0"
        || (!value.is_empty()
            && value.as_bytes()[0].is_ascii_digit()
            && value.as_bytes()[0] != b'0'
            && value.bytes().all(|byte| byte.is_ascii_digit()))
}

pub fn parse_seal_open_evidence_v0(bytes: &[u8]) -> ApntResult<SealOpenEvidenceV0> {
    let mut reader = Reader::new(bytes, "APNTSOV0");
    reader.expect(SEAL_OPEN_MAGIC, "magic")?;
    if reader.u8("version")? != 0
        || reader.text("domain")? != SEAL_OPEN_DOMAIN
        || reader.text("kind")? != SEAL_OPEN_KIND
    {
        return Err(err("APNTSOV0 has unsupported identity"));
    }
    let network = parse_network(reader.u8("network")?)?;
    let seal_outpoint = OutpointV0 {
        txid: reader.bytes32("seal-open txid")?,
        vout: reader.u32("seal-open vout")?,
    };
    let value_sats = reader.text("seal-open value")?;
    if !canonical_decimal(&value_sats) {
        return Err(err("APNTSOV0 has non-canonical decimal value"));
    }
    let evidence = SealOpenEvidenceV0 {
        network,
        seal_outpoint,
        value_sats,
        import_funding_cell_commitment: reader.bytes32("import cell commitment")?,
        eligibility_statement_bind: reader.bytes32("eligibility bind")?,
        output_fingerprint: reader.bytes32("output fingerprint")?,
        locking_bytecode_hash: reader.bytes32("locking bytecode hash")?,
        seal_commitment: reader.bytes32("seal commitment")?,
    };
    let expected = [false, false, false, false, false, false, false, true];
    for expected in expected {
        if read_boolean(&mut reader, "seal-open truth flag")? != expected {
            return Err(err("APNTSOV0 has unsupported current-truth flag"));
        }
    }
    reader.finish()?;
    Ok(evidence)
}

pub fn parse_seal_close_evidence_v0(bytes: &[u8]) -> ApntResult<SealCloseEvidenceV0> {
    let mut reader = Reader::new(bytes, "APNTSCV0");
    reader.expect(SEAL_CLOSE_MAGIC, "magic")?;
    if reader.u8("version")? != 0
        || reader.text("domain")? != SEAL_CLOSE_DOMAIN
        || reader.text("kind")? != SEAL_CLOSE_KIND
    {
        return Err(err("APNTSCV0 has unsupported identity"));
    }
    let evidence = SealCloseEvidenceV0 {
        network: parse_network(reader.u8("network")?)?,
        consumed_seal_outpoint: OutpointV0 {
            txid: reader.bytes32("consumed seal txid")?,
            vout: reader.u32("consumed seal vout")?,
        },
        consumption_txid: reader.bytes32("consumption txid")?,
        input_index: reader.u32("input index")?,
        previous_seal_commitment: reader.bytes32("previous seal commitment")?,
        previous_output_fingerprint: reader.bytes32("previous output fingerprint")?,
        import_funding_cell_commitment: reader.bytes32("import cell commitment")?,
        eligibility_statement_bind: reader.bytes32("eligibility bind")?,
    };
    let expected = [
        true, true, false, false, false, false, false, false, false, false, false,
    ];
    for expected in expected {
        if read_boolean(&mut reader, "seal-close truth flag")? != expected {
            return Err(err("APNTSCV0 has unsupported current-truth flag"));
        }
    }
    reader.finish()?;
    Ok(evidence)
}

pub fn parse_complete_proving_input_v0(bytes: &[u8]) -> ApntResult<CompleteProvingInputV0> {
    let mut reader = Reader::new(bytes, "APNTPIV0");
    reader.expect(PROVING_INPUT_MAGIC, "magic")?;
    if reader.u8("version")? != 0 {
        return Err(err("APNTPIV0 has unsupported version"));
    }
    let witness = parse_complete_private_witness_v0(reader.length_prefixed("private witness")?)?;
    let seal_open = parse_seal_open_evidence_v0(reader.length_prefixed("seal-open evidence")?)?;
    let seal_close = parse_seal_close_evidence_v0(reader.length_prefixed("seal-close evidence")?)?;
    reader.finish()?;
    Ok(CompleteProvingInputV0 {
        witness,
        seal_open,
        seal_close,
    })
}

fn make_result(
    statement: Option<&ImportCreatedNoteStatementV0>,
    stage: &'static str,
    code: &'static str,
) -> ApntResult<PublicResultV0> {
    let failure_stage = failure_stage_codepoint(stage)
        .ok_or_else(|| err(format!("unknown frozen failure stage {stage}")))?;
    let failure_code = failure_code_codepoint(code)
        .ok_or_else(|| err(format!("unknown frozen failure code {code}")))?;
    let accepted = stage == "accepted" && code == "full-import-created-note-semantics-accepted";
    let passed = |candidate: &'static str| -> bool {
        failure_stage > failure_stage_codepoint(candidate).expect("frozen failure stage exists")
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
    Ok(PublicResultV0 {
        statement_commitment: statement.map(|statement| statement.commitment),
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

pub(crate) fn seal_commitment_v0(evidence: &SealOpenEvidenceV0) -> ApntResult<[u8; 32]> {
    let preimage = format!(
        "{{\"domain\":\"{SEAL_PREIMAGE_DOMAIN}\",\"eligibilityStatementBind32\":{{\"$bytes\":\"{}\"}},\"importFundingCellCommitment32\":{{\"$bytes\":\"{}\"}},\"lockingBytecodeHash32\":{{\"$bytes\":\"{}\"}},\"network\":\"{}\",\"outputFingerprint32\":{{\"$bytes\":\"{}\"}},\"sealOutpoint\":{{\"txid\":\"{}\",\"vout\":{}}},\"valueSats\":\"{}\",\"version\":0}}",
        super::hex_encode(&evidence.eligibility_statement_bind),
        super::hex_encode(&evidence.import_funding_cell_commitment),
        super::hex_encode(&evidence.locking_bytecode_hash),
        network_name(evidence.network),
        super::hex_encode(&evidence.output_fingerprint),
        super::hex_encode(&evidence.seal_outpoint.txid),
        evidence.seal_outpoint.vout,
        evidence.value_sats,
    );
    sha256_domain_separated(SEAL_COMMITMENT_DOMAIN, preimage.as_bytes())
}

fn validate_import_seal_identity(
    statement: &ImportCreatedNoteStatementV0,
    seal_open: &SealOpenEvidenceV0,
    seal_close: &SealCloseEvidenceV0,
) -> ApntResult<Option<&'static str>> {
    if statement.network != seal_open.network || statement.network != seal_close.network {
        return Ok(Some("network-mismatch"));
    }
    if statement.import_funding_value_sats.to_string() != seal_open.value_sats {
        return Ok(Some("import-funding-value-mismatch"));
    }
    if !bytes_equal(
        &statement.import_funding_cell_commitment,
        &seal_open.import_funding_cell_commitment,
    ) || !bytes_equal(
        &statement.import_funding_cell_commitment,
        &seal_close.import_funding_cell_commitment,
    ) {
        return Ok(Some("import-cell-commitment-mismatch"));
    }
    if !bytes_equal(
        &statement.eligibility_statement_bind,
        &seal_open.eligibility_statement_bind,
    ) || !bytes_equal(
        &statement.eligibility_statement_bind,
        &seal_close.eligibility_statement_bind,
    ) {
        return Ok(Some("eligibility-bind-mismatch"));
    }
    if !bytes_equal(&statement.output_fingerprint, &seal_open.output_fingerprint)
        || !bytes_equal(
            &statement.output_fingerprint,
            &seal_close.previous_output_fingerprint,
        )
    {
        return Ok(Some("output-fingerprint-mismatch"));
    }
    if statement.import_funding_outpoint != seal_open.seal_outpoint
        || statement.seal_close_outpoint != seal_close.consumed_seal_outpoint
    {
        return Ok(Some("seal-outpoint-mismatch"));
    }
    let recomputed = seal_commitment_v0(seal_open)?;
    if !bytes_equal(&recomputed, &seal_open.seal_commitment)
        || !bytes_equal(&statement.seal_open_commitment, &seal_open.seal_commitment)
        || !bytes_equal(
            &statement.seal_close_previous_commitment,
            &seal_close.previous_seal_commitment,
        )
        || !bytes_equal(
            &seal_open.seal_commitment,
            &seal_close.previous_seal_commitment,
        )
    {
        return Ok(Some("seal-commitment-mismatch"));
    }
    if statement.seal_close_input_index != seal_close.input_index {
        return Ok(Some("consumed-input-mismatch"));
    }
    if !bytes_equal(
        &statement.creation_transaction_id,
        &seal_close.consumption_txid,
    ) {
        return Ok(Some("creation-transaction-mismatch"));
    }
    Ok(None)
}

pub(crate) fn validate_created_notes(
    statement: &ImportCreatedNoteStatementV0,
    witness: &CompletePrivateWitnessV0,
) -> ApntResult<Option<&'static str>> {
    if witness
        .logical_witnesses
        .iter()
        .enumerate()
        .any(|(index, item)| {
            witness.logical_witnesses[..index]
                .iter()
                .any(|other| other.created_note_commitment == item.created_note_commitment)
        })
    {
        return Ok(Some("created-note-duplicate"));
    }
    if witness.logical_witnesses.len() < statement.created_logical_notes.len() {
        return Ok(Some("created-note-missing"));
    }
    if witness.logical_witnesses.len() > statement.created_logical_notes.len() {
        return Ok(Some("created-note-extra"));
    }
    for logical in &witness.logical_witnesses {
        if logical.statement_commitment != statement.commitment {
            return Ok(Some("statement-commitment-mismatch"));
        }
        if logical.creation_transaction_id != statement.creation_transaction_id {
            return Ok(Some("creation-transaction-mismatch"));
        }
        let expected = statement
            .created_logical_notes
            .iter()
            .find(|note| note.created_note_commitment == logical.created_note_commitment);
        if expected.is_none() || logical.note.commitment != logical.created_note_commitment {
            return Ok(Some("created-note-commitment-mismatch"));
        }
        let expected = expected.expect("checked above");
        if logical.creation_scope != expected.creation_scope
            || !statement
                .import_creation_scopes
                .iter()
                .any(|scope| scope.commitment == logical.creation_scope)
        {
            return Ok(Some("creation-scope-mismatch"));
        }
    }
    Ok(None)
}

pub(crate) fn validate_created_backing_cells(
    statement: &ImportCreatedNoteStatementV0,
    witness: &CompletePrivateWitnessV0,
) -> ApntResult<Option<&'static str>> {
    if witness
        .backing_cell_witnesses
        .iter()
        .enumerate()
        .any(|(index, cell)| {
            witness.backing_cell_witnesses[..index].iter().any(|other| {
                other.output_index == cell.output_index
                    || other.seal_cell_commitment == cell.seal_cell_commitment
            })
        })
    {
        return Ok(Some("created-backing-cell-duplicate"));
    }
    if witness.backing_cell_witnesses.len() < statement.created_backing_cells.len() {
        return Ok(Some("created-backing-cell-missing"));
    }
    if witness.backing_cell_witnesses.len() > statement.created_backing_cells.len() {
        return Ok(Some("created-backing-cell-extra"));
    }
    for cell in &witness.backing_cell_witnesses {
        if cell.statement_commitment != statement.commitment {
            return Ok(Some("statement-commitment-mismatch"));
        }
        if cell.creation_transaction_id != statement.creation_transaction_id {
            return Ok(Some("creation-transaction-mismatch"));
        }
        if !statement
            .created_logical_notes
            .iter()
            .any(|note| note.created_note_commitment == cell.assigned_created_note_commitment)
        {
            return Ok(Some("created-backing-cell-unexpected"));
        }
        let projected = statement.projection.outputs.get(cell.output_index as usize);
        if projected.is_some_and(|output| output.role != 0) {
            return Ok(Some("created-backing-cell-role-mismatch"));
        }
        let expected = statement
            .created_backing_cells
            .iter()
            .find(|expected| expected.output_index == cell.output_index);
        if expected.is_none() || cell.opening.output_index != cell.output_index {
            return Ok(Some("created-output-index-mismatch"));
        }
        if projected.is_none_or(|output| output.role != 0) {
            return Ok(Some("created-backing-cell-role-mismatch"));
        }
        if !statement
            .import_creation_scopes
            .iter()
            .any(|scope| scope.commitment == cell.opening.creation_scope)
        {
            return Ok(Some("creation-scope-mismatch"));
        }
        let expected = expected.expect("checked above");
        if cell.seal_cell_commitment != expected.seal_cell_commitment
            || cell.opening.commitment != cell.seal_cell_commitment
            || cell.opening.locking_profile_id != expected.locking_profile_id
        {
            return Ok(Some("created-backing-cell-commitment-mismatch"));
        }
    }
    Ok(None)
}

fn member_cell_commitment(
    creation_scope: &[u8; 32],
    member: &BackingBundleMemberV1,
) -> ApntResult<[u8; 32]> {
    let mut encoded = Vec::with_capacity(117);
    encoded.extend_from_slice(b"APNTSCV1");
    encoded.push(1);
    encoded.extend_from_slice(creation_scope);
    encoded.extend_from_slice(&member.output_index.to_le_bytes());
    encoded.extend_from_slice(&member.value_sats.to_le_bytes());
    encoded.extend_from_slice(&member.locking_profile_id);
    encoded.extend_from_slice(&member.assignment_blinder);
    sha256_domain_separated(super::CELL_COMMITMENT_DOMAIN, &encoded)
}

pub(crate) fn validate_created_backing(
    statement: &ImportCreatedNoteStatementV0,
    witness: &CompletePrivateWitnessV0,
) -> ApntResult<Option<&'static str>> {
    for logical in &witness.logical_witnesses {
        if logical.bundle.members.is_empty() {
            return Ok(Some("created-bundle-empty"));
        }
        if logical.bundle.creation_scope != logical.creation_scope {
            return Ok(Some("created-bundle-scope-mismatch"));
        }
        if logical.bundle.commitment != logical.note.backing_bundle_commitment {
            return Ok(Some("created-bundle-commitment-mismatch"));
        }
        for member in &logical.bundle.members {
            let cell = witness
                .backing_cell_witnesses
                .iter()
                .find(|cell| cell.output_index == member.output_index);
            let projected = statement
                .projection
                .outputs
                .get(member.output_index as usize);
            if cell.is_none() || projected.is_none() {
                return Ok(Some("created-backing-cell-unexpected"));
            }
            let cell = cell.expect("checked above");
            let projected = projected.expect("checked above");
            if projected.role != 0 {
                return Ok(Some("created-backing-cell-role-mismatch"));
            }
            if projected.value_sats != member.value_sats
                || projected.locking_profile_id.as_ref() != Some(&member.locking_profile_id)
                || cell.opening.creation_scope != logical.bundle.creation_scope
                || cell.opening.output_index != member.output_index
                || cell.opening.value_sats != member.value_sats
                || cell.opening.locking_profile_id != member.locking_profile_id
                || cell.opening.assignment_blinder != member.assignment_blinder
                || member_cell_commitment(&logical.bundle.creation_scope, member)?
                    != cell.seal_cell_commitment
            {
                return Ok(Some("created-backing-cell-opening-mismatch"));
            }
        }
        let bundle_value = match checked_satoshi_sum(
            &logical
                .bundle
                .members
                .iter()
                .map(|member| member.value_sats)
                .collect::<Vec<_>>(),
        ) {
            Ok(value) => value,
            Err(_) => return Ok(Some("arithmetic-overflow")),
        };
        if logical.note.value_sats > bundle_value {
            return Ok(Some("created-note-underbacked"));
        }
        if logical.note.value_sats < bundle_value {
            return Ok(Some("created-note-overbacked"));
        }
    }
    Ok(None)
}

pub(crate) fn validate_created_completeness(
    statement: &ImportCreatedNoteStatementV0,
    witness: &CompletePrivateWitnessV0,
) -> Option<&'static str> {
    let public_indexes = statement
        .created_backing_cells
        .iter()
        .map(|cell| cell.output_index)
        .collect::<Vec<_>>();
    let witness_indexes = witness
        .backing_cell_witnesses
        .iter()
        .map(|cell| cell.output_index)
        .collect::<Vec<_>>();
    let bundle_indexes = witness
        .logical_witnesses
        .iter()
        .flat_map(|logical| {
            logical
                .bundle
                .members
                .iter()
                .map(|member| member.output_index)
        })
        .collect::<Vec<_>>();
    if witness_indexes
        .iter()
        .chain(&bundle_indexes)
        .any(|index| !public_indexes.contains(index))
    {
        return Some("created-backing-cell-unexpected");
    }
    if public_indexes
        .iter()
        .any(|index| !witness_indexes.contains(index) || !bundle_indexes.contains(index))
    {
        return Some("created-backing-cell-omitted");
    }
    None
}

pub(crate) fn validate_created_disjointness(
    witness: &CompletePrivateWitnessV0,
) -> Option<&'static str> {
    let mut assignments: Vec<(u32, [u8; 32])> = Vec::new();
    for logical in &witness.logical_witnesses {
        for member in &logical.bundle.members {
            if assignments
                .iter()
                .any(|(index, _)| *index == member.output_index)
            {
                return Some("created-backing-cell-assigned-twice");
            }
            assignments.push((member.output_index, logical.created_note_commitment));
        }
    }
    for cell in &witness.backing_cell_witnesses {
        if !assignments.iter().any(|(index, note)| {
            *index == cell.output_index && *note == cell.assigned_created_note_commitment
        }) {
            return Some("created-backing-cell-unexpected");
        }
    }
    None
}

fn validate_import_conservation(
    statement: &ImportCreatedNoteStatementV0,
    seal_open: &SealOpenEvidenceV0,
    witness: &CompletePrivateWitnessV0,
) -> Option<&'static str> {
    if statement
        .projection
        .outputs
        .iter()
        .filter(|output| output.role == 1)
        .any(|output| output.value_sats != 0)
    {
        return Some("unsupported-pass-through");
    }
    let collateral_inputs = checked_satoshi_sum(
        &statement
            .projection
            .inputs
            .iter()
            .filter(|input| input.role == 1)
            .map(|input| input.spent_value_sats)
            .collect::<Vec<_>>(),
    );
    let collateral_outputs = checked_satoshi_sum(
        &statement
            .projection
            .outputs
            .iter()
            .filter(|output| output.role == 2)
            .map(|output| output.value_sats)
            .collect::<Vec<_>>(),
    );
    let created_backing = checked_satoshi_sum(
        &witness
            .backing_cell_witnesses
            .iter()
            .map(|cell| cell.opening.value_sats)
            .collect::<Vec<_>>(),
    );
    let (Ok(collateral_inputs), Ok(collateral_outputs), Ok(created_backing)) =
        (collateral_inputs, collateral_outputs, created_backing)
    else {
        return Some("arithmetic-overflow");
    };
    if created_backing
        != statement
            .public_accounting
            .created_backing_output_value_sats
    {
        return Some("import-conservation-mismatch");
    }
    if statement.public_accounting.total_output_value_sats
        > statement.public_accounting.total_input_value_sats
    {
        return Some("arithmetic-underflow");
    }
    if collateral_inputs != collateral_outputs {
        return Some("unsupported-pass-through");
    }
    if seal_open.value_sats != statement.import_funding_value_sats.to_string() {
        return Some("import-value-invalid");
    }
    let Ok(left) = checked_satoshi_add(statement.import_funding_value_sats, collateral_inputs)
    else {
        return Some("arithmetic-overflow");
    };
    let Ok(backing_plus_fee) =
        checked_satoshi_add(created_backing, statement.authorized_import_fee_sats)
    else {
        return Some("arithmetic-overflow");
    };
    let Ok(right) = checked_satoshi_add(backing_plus_fee, collateral_outputs) else {
        return Some("arithmetic-overflow");
    };
    let transaction_fee = match checked_satoshi_sub(
        statement.public_accounting.total_input_value_sats,
        statement.public_accounting.total_output_value_sats,
    ) {
        Ok(value) => value,
        Err(_) => return Some("arithmetic-underflow"),
    };
    if transaction_fee != statement.authorized_import_fee_sats {
        return Some("authorized-import-fee-mismatch");
    }
    if left == right && statement.import_funding_value_sats == backing_plus_fee {
        None
    } else {
        Some("import-conservation-mismatch")
    }
}

fn valid_recovery_packet_v0(bytes: &[u8]) -> bool {
    const HEADER: usize = 4 + 1_088 + 16 + 4;
    if bytes.len() < HEADER || &bytes[..4] != b"ARP0" {
        return false;
    }
    let payload_length = u32::from_be_bytes(
        bytes[HEADER - 4..HEADER]
            .try_into()
            .expect("four-byte packet length"),
    ) as usize;
    bytes.len() == HEADER + payload_length
}

pub(crate) fn validate_recovery_consistency(
    statement: &ImportCreatedNoteStatementV0,
    witness: &CompletePrivateWitnessV0,
) -> ApntResult<Option<&'static str>> {
    let recoveries = &witness.recovery_witnesses;
    if recoveries.iter().enumerate().any(|(index, recovery)| {
        recoveries[..index].iter().any(|other| {
            other.created_note_commitment == recovery.created_note_commitment
                || other.packet_index == recovery.packet_index
                || other.descriptor.public_key == recovery.descriptor.public_key
        })
    }) {
        return Ok(Some("recovery-witness-duplicate"));
    }
    if recoveries.len() < statement.created_logical_notes.len() {
        return Ok(Some("recovery-witness-missing"));
    }
    if recoveries.len() > statement.created_logical_notes.len() {
        return Ok(Some("recovery-witness-extra"));
    }
    if witness.packet_table.statement_commitment != statement.commitment {
        return Ok(Some("recovery-packet-table-mismatch"));
    }

    let mut senders: Vec<RecoverySenderEvidenceV0> = Vec::with_capacity(recoveries.len());
    for recovery in recoveries {
        if recovery.statement_commitment != statement.commitment {
            return Ok(Some("recovery-sender-construction-mismatch"));
        }
        let statement_note = statement
            .created_logical_notes
            .iter()
            .find(|note| note.created_note_commitment == recovery.created_note_commitment);
        let logical = witness
            .logical_witnesses
            .iter()
            .find(|logical| logical.created_note_commitment == recovery.created_note_commitment);
        if statement_note.is_none() || logical.is_none() {
            return Ok(Some("recovery-note-commitment-mismatch"));
        }
        let statement_note = statement_note.expect("checked above");
        let logical = logical.expect("checked above");
        if recovery.created_bundle_commitment != logical.note.backing_bundle_commitment {
            return Ok(Some("recovery-bundle-commitment-mismatch"));
        }
        if recovery.creation_scope != statement_note.creation_scope
            || recovery.creation_scope != logical.creation_scope
            || recovery.creation_scope != logical.bundle.creation_scope
        {
            return Ok(Some("recovery-scope-mismatch"));
        }
        if recovery.packet_index != statement_note.recovery_packet_index {
            return Ok(Some("recovery-packet-index-mismatch"));
        }
        if recovery.packet_hash != statement_note.recovery_packet_hash {
            return Ok(Some("recovery-packet-hash-mismatch"));
        }
        if recovery.descriptor.network != network_name(statement.network) {
            return Ok(Some("recovery-sender-construction-mismatch"));
        }
        // The created note must be spendable by this descriptor's holder and by
        // nobody else. An importer copies the recipient's published owner
        // commitment; it never chooses one.
        let descriptor_owner_commitment = sha256_domain_separated(
            OWNER_AUTHORITY_DOMAIN,
            &recovery.descriptor.owner_public_key,
        )?;
        if descriptor_owner_commitment != logical.note.owner_commitment {
            return Ok(Some("recovery-owner-authority-mismatch"));
        }
        let sender = match build_recovery_sender_evidence_v0(logical, recovery) {
            Ok(sender) => sender,
            Err(_) => return Ok(Some("recovery-sender-construction-mismatch")),
        };
        if sender.packet_hash != statement_note.recovery_packet_hash
            || sender.packet_hash != recovery.packet_hash
        {
            return Ok(Some("recovery-packet-hash-mismatch"));
        }
        senders.push(sender);
    }
    if recoveries
        .iter()
        .enumerate()
        .any(|(index, recovery)| recovery.packet_index != index as u32)
    {
        return Ok(Some("recovery-packet-index-mismatch"));
    }
    if witness.packet_table.encoded_packets.len() < senders.len()
        || witness.packet_table.packet_hashes.len() < senders.len()
    {
        return Ok(Some("recovery-witness-missing"));
    }
    if witness.packet_table.encoded_packets.len() > senders.len()
        || witness.packet_table.packet_hashes.len() > senders.len()
    {
        return Ok(Some("recovery-witness-extra"));
    }
    if witness
        .packet_table
        .packet_hashes
        .iter()
        .enumerate()
        .any(|(index, hash)| witness.packet_table.packet_hashes[..index].contains(hash))
    {
        return Ok(Some("recovery-witness-duplicate"));
    }
    for (index, sender) in senders.iter().enumerate() {
        let supplied_packet = &witness.packet_table.encoded_packets[index];
        let supplied_hash = &witness.packet_table.packet_hashes[index];
        if !valid_recovery_packet_v0(supplied_packet)
            || supplied_packet != &sender.encoded_packet
            || sha256_domain_separated(super::RECOVERY_PACKET_HASH_DOMAIN, supplied_packet)?
                != sender.packet_hash
            || supplied_hash != &sender.packet_hash
        {
            return Ok(Some("recovery-packet-hash-mismatch"));
        }
    }
    let recomputed =
        match build_recovery_table_from_senders_v0(&witness.packet_table.profile, senders) {
            Ok(recomputed) => recomputed,
            Err(_) => return Ok(Some("recovery-packet-table-mismatch")),
        };
    if witness.packet_table.packet_bin != recomputed.packet_bin
        || witness.packet_table.packet_bin_root != recomputed.packet_bin_root
    {
        return Ok(Some("recovery-bin-root-mismatch"));
    }
    if witness.packet_table.manifest_root != recomputed.manifest_root {
        return Ok(Some("recovery-manifest-mismatch"));
    }
    if witness.packet_table.table_commitment != recomputed.manifest_root
        || statement.recovery_packet_table_commitment != recomputed.manifest_root
    {
        return Ok(Some("recovery-packet-table-mismatch"));
    }
    Ok(None)
}

pub(crate) fn validate_authority_readiness(
    statement: &ImportCreatedNoteStatementV0,
    witness: &CompletePrivateWitnessV0,
) -> ApntResult<Option<&'static str>> {
    if witness.authority_witnesses.len() < witness.logical_witnesses.len() {
        return Ok(Some("authority-material-missing"));
    }
    if witness.authority_witnesses.len() > witness.logical_witnesses.len() {
        return Ok(Some("authority-material-malformed"));
    }
    if witness
        .authority_witnesses
        .iter()
        .enumerate()
        .any(|(index, authority)| {
            witness.authority_witnesses[..index].iter().any(|other| {
                other.created_note_commitment == authority.created_note_commitment
                    || other.owner_public_key == authority.owner_public_key
            })
        })
    {
        return Ok(Some("authority-material-malformed"));
    }
    for authority in &witness.authority_witnesses {
        if authority.statement_commitment != statement.commitment {
            return Ok(Some("authority-note-mismatch"));
        }
        let logical = witness
            .logical_witnesses
            .iter()
            .find(|logical| logical.created_note_commitment == authority.created_note_commitment);
        let Some(logical) = logical else {
            return Ok(Some("authority-note-mismatch"));
        };
        if authority.created_bundle_commitment != logical.note.backing_bundle_commitment {
            return Ok(Some("authority-bundle-mismatch"));
        }
        if authority.creation_scope != logical.creation_scope {
            return Ok(Some("authority-scope-mismatch"));
        }
        let canonical_owner =
            sha256_domain_separated(OWNER_AUTHORITY_DOMAIN, &authority.owner_public_key)?;
        if authority.owner_commitment != logical.note.owner_commitment
            || canonical_owner != logical.note.owner_commitment
        {
            return Ok(Some("authority-commitment-mismatch"));
        }
    }
    Ok(None)
}

pub(crate) fn validate_nullifier_readiness(
    statement: &ImportCreatedNoteStatementV0,
    witness: &CompletePrivateWitnessV0,
) -> ApntResult<Option<&'static str>> {
    if witness.nullifier_witnesses.len() < witness.logical_witnesses.len() {
        return Ok(Some("nullifier-material-missing"));
    }
    if witness.nullifier_witnesses.len() > witness.logical_witnesses.len() {
        return Ok(Some("nullifier-material-malformed"));
    }
    if witness
        .nullifier_witnesses
        .iter()
        .any(|nullifier| nullifier.version != 1 || nullifier.domain != BUNDLE_NULLIFIER_DOMAIN)
    {
        return Ok(Some("nullifier-readiness-domain-mismatch"));
    }
    if witness
        .nullifier_witnesses
        .iter()
        .enumerate()
        .any(|(index, nullifier)| {
            witness.nullifier_witnesses[..index]
                .iter()
                .any(|other| other.created_note_commitment == nullifier.created_note_commitment)
        })
    {
        return Ok(Some("nullifier-material-malformed"));
    }
    let mut canonical_nullifiers: Vec<[u8; 32]> = Vec::new();
    for nullifier in &witness.nullifier_witnesses {
        if nullifier.statement_commitment != statement.commitment {
            return Ok(Some("nullifier-readiness-note-mismatch"));
        }
        let logical = witness
            .logical_witnesses
            .iter()
            .find(|logical| logical.created_note_commitment == nullifier.created_note_commitment);
        let Some(logical) = logical else {
            return Ok(Some("nullifier-readiness-note-mismatch"));
        };
        if nullifier.created_bundle_commitment != logical.note.backing_bundle_commitment {
            return Ok(Some("nullifier-readiness-bundle-mismatch"));
        }
        let authority = witness.authority_witnesses.iter().find(|authority| {
            authority.created_note_commitment == nullifier.created_note_commitment
        });
        if authority.is_none_or(|authority| authority.owner_public_key != nullifier.owner_public_key) {
            return Ok(Some("nullifier-readiness-derivation-mismatch"));
        }
        let mut payload = Vec::with_capacity(96);
        payload.extend_from_slice(&nullifier.owner_public_key);
        payload.extend_from_slice(&logical.created_note_commitment);
        payload.extend_from_slice(&logical.note.backing_bundle_commitment);
        let canonical = sha256_domain_separated(BUNDLE_NULLIFIER_DOMAIN, &payload)?;
        if canonical != nullifier.derived_nullifier || canonical_nullifiers.contains(&canonical) {
            return Ok(Some("nullifier-readiness-derivation-mismatch"));
        }
        canonical_nullifiers.push(canonical);
    }
    Ok(None)
}

pub fn evaluate_complete_proving_input_v0(bytes: &[u8]) -> ApntResult<PublicResultV0> {
    let input = parse_complete_proving_input_v0(bytes)?;
    if input
        .witness
        .rejection_only_metadata
        .caller_authored_accepted
        .is_some()
    {
        return make_result(None, "witness-shape", "unsupported-caller-status");
    }
    if input
        .witness
        .rejection_only_metadata
        .statement_relation_identity_override
        .is_some()
    {
        return make_result(None, "statement-boundary", "relation-identity-mismatch");
    }
    let statement = match parse_import_created_note_statement_v0(&input.witness.statement_bytes) {
        Ok(statement) => statement,
        Err(_) => return make_result(None, "statement-boundary", "statement-malformed"),
    };
    if input.witness.expected_statement_commitment != statement.commitment {
        return make_result(
            Some(&statement),
            "statement-boundary",
            "statement-commitment-mismatch",
        );
    }
    if let Some(code) =
        validate_import_seal_identity(&statement, &input.seal_open, &input.seal_close)?
    {
        return make_result(Some(&statement), "import-seal-identity", code);
    }
    if let Some(code) = validate_created_notes(&statement, &input.witness)? {
        return make_result(Some(&statement), "created-note-identity", code);
    }
    if let Some(code) = validate_created_backing_cells(&statement, &input.witness)? {
        return make_result(Some(&statement), "created-backing-cell-identity", code);
    }
    if let Some(code) = validate_created_backing(&statement, &input.witness)? {
        return make_result(Some(&statement), "created-backing", code);
    }
    if let Some(code) = validate_created_completeness(&statement, &input.witness) {
        return make_result(Some(&statement), "created-completeness", code);
    }
    if let Some(code) = validate_created_disjointness(&input.witness) {
        return make_result(Some(&statement), "created-disjointness", code);
    }
    if let Some(code) = validate_import_conservation(&statement, &input.seal_open, &input.witness) {
        return make_result(Some(&statement), "import-conservation", code);
    }
    if let Some(code) = validate_recovery_consistency(&statement, &input.witness)? {
        return make_result(Some(&statement), "recovery-consistency", code);
    }
    if let Some(code) = validate_authority_readiness(&statement, &input.witness)? {
        return make_result(Some(&statement), "authority-readiness", code);
    }
    if let Some(code) = validate_nullifier_readiness(&statement, &input.witness)? {
        return make_result(Some(&statement), "nullifier-readiness", code);
    }
    make_result(
        Some(&statement),
        "accepted",
        "full-import-created-note-semantics-accepted",
    )
}

pub fn evaluate_complete_proving_input_bytes_v0(bytes: &[u8]) -> ApntResult<Vec<u8>> {
    serialize_public_result_v0(&evaluate_complete_proving_input_v0(bytes)?)
}
