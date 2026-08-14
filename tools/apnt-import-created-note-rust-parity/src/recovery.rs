use serde::{Deserialize, Serialize};

use super::{
    aes256_gcm_encrypt_v0, checked_satoshi_sum, derive_recovery_aes256_gcm_schedule_v0, err,
    is_printable_ascii, mlkem768_encapsulate_v0, require_nonzero, sha256_domain_separated,
    ApntResult, Reader, MLKEM768_CIPHERTEXT_BYTES, MLKEM768_PUBLIC_KEY_BYTES,
};

pub const PRIVATE_WITNESS_MAGIC: &[u8; 8] = b"APNTIWV0";
pub const PRIVATE_WITNESS_V1_MAGIC: &[u8; 8] = b"APNTIWV1";
pub const RECOVERY_WITNESS_MAGIC: &[u8; 8] = b"APNTRWV0";
pub const RECOVERY_PACKET_TABLE_MAGIC: &[u8; 8] = b"APNTRTV0";
pub const AUTHORITY_WITNESS_MAGIC: &[u8; 8] = b"APNTARV0";
pub const NULLIFIER_WITNESS_MAGIC: &[u8; 8] = b"APNTNRV0";
pub const NOTE_MAGIC: &[u8; 8] = b"APNTBNV1";
pub const BUNDLE_MAGIC: &[u8; 8] = b"APNTBBV1";
pub const CELL_MAGIC: &[u8; 8] = b"APNTSCV1";
/// v2 removes `spend_secret` from the recovery plaintext entirely: the
/// recipient generates and retains its own per-note authority scalar, so the
/// sender has nothing to ship and therefore nothing to keep.
pub const RECOVERY_PLAINTEXT_MAGIC: &[u8; 8] = b"APNTBRP2";
pub const RECOVERY_PACKET_MAGIC: &[u8; 4] = b"ARP0";
pub const RECOVERY_PACKET_BIN_MAGIC: &[u8; 5] = b"ARPB\0";

pub const NOTE_COMMITMENT_DOMAIN: &str =
    "bch-cloak-apnt-v0:bundle-backed-private-note-commitment-v1";
pub const BUNDLE_COMMITMENT_DOMAIN: &str = "bch-cloak-apnt-v0:backing-bundle-commitment-v1";
pub const CELL_COMMITMENT_DOMAIN: &str = "bch-cloak-apnt-v0:backing-seal-cell-commitment-v1";
pub const RECOVERY_PACKET_HASH_DOMAIN: &str = "bch-cloak-apnt-v0:recovery-packet-hash";
pub const RECOVERY_PACKET_BIN_DOMAIN: &str = "bch-cloak-apnt-v0:recovery-packet-bin";
pub const RECOVERY_PACKET_BIN_ROOT_DOMAIN: &str = "bch-cloak-apnt-v0:recovery-packet-bin-root";
pub const RECOVERY_BATCH_MANIFEST_ROOT_DOMAIN: &str =
    "bch-cloak-apnt-v0:recovery-batch-manifest-root";
pub const RECOVERY_PACKET_RECORD_ENCODING: &str = "length-prefixed-binary-v0";
pub const RECOVERY_PACKET_MATERIAL_STATUS: &str = "encrypted-recovery-packet-bin-v0";

const DESCRIPTOR_DOMAIN: &str = "bch-cloak-apnt-v0:one-time-receive-descriptor";
const RECOVERY_MAX_NOTES: u32 = 1_024;
const BACKING_MAX_CELLS: u32 = 4_096;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BundleBackedNoteV1 {
    pub encoded: Vec<u8>,
    pub asset_id: [u8; 32],
    pub value_sats: u64,
    pub owner_commitment: [u8; 32],
    pub backing_bundle_commitment: [u8; 32],
    pub note_nonce: [u8; 32],
    pub commitment: [u8; 32],
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BackingBundleMemberV1 {
    pub output_index: u32,
    pub value_sats: u64,
    pub locking_profile_id: [u8; 32],
    pub assignment_blinder: [u8; 32],
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BackingSealCellOpeningV1 {
    pub encoded: Vec<u8>,
    pub creation_scope: [u8; 32],
    pub output_index: u32,
    pub value_sats: u64,
    pub locking_profile_id: [u8; 32],
    pub assignment_blinder: [u8; 32],
    pub commitment: [u8; 32],
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BackingBundleV1 {
    pub encoded: Vec<u8>,
    pub creation_scope: [u8; 32],
    pub members: Vec<BackingBundleMemberV1>,
    pub commitment: [u8; 32],
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LogicalWitnessV0 {
    pub statement_commitment: [u8; 32],
    pub created_note_commitment: [u8; 32],
    pub creation_scope: [u8; 32],
    pub creation_transaction_id: [u8; 32],
    pub note: BundleBackedNoteV1,
    pub bundle: BackingBundleV1,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BackingCellWitnessV0 {
    pub statement_commitment: [u8; 32],
    pub assigned_created_note_commitment: [u8; 32],
    pub creation_transaction_id: [u8; 32],
    pub output_index: u32,
    pub seal_cell_commitment: [u8; 32],
    pub opening: BackingSealCellOpeningV1,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OneTimeDescriptorV0 {
    pub encoded: Vec<u8>,
    pub network: String,
    pub descriptor_id: String,
    pub public_key: [u8; MLKEM768_PUBLIC_KEY_BYTES],
    /// The recipient's BIP-340 x-only spend-authority public key `P`.
    pub owner_public_key: [u8; 32],
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RecoveryWitnessV0 {
    pub encoded: Vec<u8>,
    pub statement_commitment: [u8; 32],
    pub created_note_commitment: [u8; 32],
    pub created_bundle_commitment: [u8; 32],
    pub creation_scope: [u8; 32],
    pub packet_index: u32,
    pub packet_hash: [u8; 32],
    pub descriptor: OneTimeDescriptorV0,
    pub encapsulation_seed: [u8; 32],
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RecoveryProfileV0 {
    pub id: String,
    pub carrier_payload_bytes: u64,
    pub carrier_count: u64,
    pub packet_bin_byte_length: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RecoveryPacketTableV0 {
    pub encoded: Vec<u8>,
    pub statement_commitment: [u8; 32],
    pub profile: RecoveryProfileV0,
    pub encoded_packets: Vec<Vec<u8>>,
    pub packet_hashes: Vec<[u8; 32]>,
    pub packet_bin: Vec<u8>,
    pub packet_bin_root: [u8; 32],
    pub manifest_root: [u8; 32],
    pub table_commitment: [u8; 32],
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PrivateRecoveryViewV0 {
    pub expected_statement_commitment: [u8; 32],
    pub statement_bytes: Vec<u8>,
    pub logical_witnesses: Vec<LogicalWitnessV0>,
    pub recovery_witnesses: Vec<RecoveryWitnessV0>,
    pub packet_table: RecoveryPacketTableV0,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuthorityMaterialWitnessV0 {
    pub encoded: Vec<u8>,
    pub statement_commitment: [u8; 32],
    pub created_note_commitment: [u8; 32],
    pub created_bundle_commitment: [u8; 32],
    pub creation_scope: [u8; 32],
    pub owner_commitment: [u8; 32],
    /// The recipient's BIP-340 x-only public key `P`. Import creates a note; it
    /// never spends one, so no signature is required here.
    pub owner_public_key: [u8; 32],
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NullifierMaterialWitnessV0 {
    pub encoded: Vec<u8>,
    pub version: u8,
    pub domain: String,
    pub statement_commitment: [u8; 32],
    pub created_note_commitment: [u8; 32],
    pub created_bundle_commitment: [u8; 32],
    pub owner_public_key: [u8; 32],
    pub derived_nullifier: [u8; 32],
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RejectionOnlyWitnessMetadataV0 {
    pub statement_relation_identity_override: Option<String>,
    pub caller_authored_accepted: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CompletePrivateWitnessV0 {
    pub encoded: Vec<u8>,
    pub rejection_only_metadata: RejectionOnlyWitnessMetadataV0,
    pub expected_statement_commitment: [u8; 32],
    pub statement_bytes: Vec<u8>,
    pub logical_witnesses: Vec<LogicalWitnessV0>,
    pub backing_cell_witnesses: Vec<BackingCellWitnessV0>,
    pub recovery_witnesses: Vec<RecoveryWitnessV0>,
    pub packet_table: RecoveryPacketTableV0,
    pub authority_witnesses: Vec<AuthorityMaterialWitnessV0>,
    pub nullifier_witnesses: Vec<NullifierMaterialWitnessV0>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RecoverySenderEvidenceV0 {
    pub plaintext: Vec<u8>,
    pub kem_ciphertext: [u8; MLKEM768_CIPHERTEXT_BYTES],
    pub shared_secret: [u8; 32],
    pub aes_key_derivation_input: Vec<u8>,
    pub aes_key_material: [u8; 32],
    pub aes_key: [u8; 32],
    pub nonce: [u8; 12],
    pub aad: Vec<u8>,
    pub payload_ciphertext: Vec<u8>,
    pub payload_tag: [u8; 16],
    pub encoded_packet: Vec<u8>,
    pub packet_hash: [u8; 32],
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RecoveryTableRecomputationV0 {
    pub senders: Vec<RecoverySenderEvidenceV0>,
    pub packet_bin: Vec<u8>,
    pub packet_hashes: Vec<[u8; 32]>,
    pub packet_bin_root: [u8; 32],
    pub manifest_bytes: Vec<u8>,
    pub manifest_root: [u8; 32],
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct JsonBytes {
    #[serde(rename = "$bytes")]
    value: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct DescriptorKemJson {
    algorithm: String,
    #[serde(rename = "publicKey")]
    public_key: JsonBytes,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct NoteAuthorityJson {
    algorithm: String,
    #[serde(rename = "ownerPublicKeyX32")]
    owner_public_key_x32: JsonBytes,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct NoteReceiveJson {
    diversifier: JsonBytes,
    #[serde(rename = "noteSalt")]
    note_salt: JsonBytes,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct ReceivePolicyJson {
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
    note_authority: NoteAuthorityJson,
    #[serde(rename = "noteReceive")]
    note_receive: NoteReceiveJson,
    #[serde(rename = "receivePolicy")]
    receive_policy: ReceivePolicyJson,
    version: u8,
}

fn decode_hex(value: &str, name: &str) -> ApntResult<Vec<u8>> {
    if !value.len().is_multiple_of(2)
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    {
        return Err(err(format!(
            "{name} must be even-length lowercase hexadecimal"
        )));
    }
    (0..value.len())
        .step_by(2)
        .map(|index| {
            u8::from_str_radix(&value[index..index + 2], 16)
                .map_err(|_| err(format!("{name} contains invalid hexadecimal")))
        })
        .collect()
}

fn decode_hex_array<const N: usize>(value: &str, name: &str) -> ApntResult<[u8; N]> {
    decode_hex(value, name)?
        .try_into()
        .map_err(|_| err(format!("{name} must be exactly {N} bytes")))
}

fn write_u32_be(output: &mut Vec<u8>, value: u32) {
    output.extend_from_slice(&value.to_be_bytes());
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
        || descriptor.domain != DESCRIPTOR_DOMAIN
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
    let public_key = decode_hex_array(
        &descriptor.kem.public_key.value,
        "one-time receive descriptor public key",
    )?;
    let _ = decode_hex(
        &descriptor.note_receive.diversifier.value,
        "one-time receive descriptor diversifier",
    )?;
    let _ = decode_hex(
        &descriptor.note_receive.note_salt.value,
        "one-time receive descriptor note salt",
    )?;
    let owner_public_key = decode_hex_array(
        &descriptor.note_authority.owner_public_key_x32.value,
        "one-time receive descriptor owner public key",
    )?;
    Ok(OneTimeDescriptorV0 {
        encoded: bytes.to_vec(),
        network: descriptor.network,
        descriptor_id: descriptor.descriptor_id,
        public_key,
        owner_public_key,
    })
}

pub fn parse_bundle_backed_note_v1(bytes: &[u8]) -> ApntResult<BundleBackedNoteV1> {
    if bytes.len() != 145 || &bytes[..8] != NOTE_MAGIC || bytes[8] != 1 {
        return Err(err("APNTBNV1 has invalid length, magic, or version"));
    }
    let asset_id = bytes[9..41].try_into().expect("32 bytes");
    let value_sats = u64::from_le_bytes(bytes[41..49].try_into().expect("8 bytes"));
    let owner_commitment = bytes[49..81].try_into().expect("32 bytes");
    let backing_bundle_commitment = bytes[81..113].try_into().expect("32 bytes");
    let note_nonce = bytes[113..145].try_into().expect("32 bytes");
    super::checked_bch_value(value_sats, true)?;
    for (name, value) in [
        ("note asset id", &asset_id),
        ("note owner commitment", &owner_commitment),
        ("note backing bundle commitment", &backing_bundle_commitment),
        ("note nonce", &note_nonce),
    ] {
        require_nonzero(value, name)?;
    }
    Ok(BundleBackedNoteV1 {
        encoded: bytes.to_vec(),
        asset_id,
        value_sats,
        owner_commitment,
        backing_bundle_commitment,
        note_nonce,
        commitment: sha256_domain_separated(NOTE_COMMITMENT_DOMAIN, bytes)?,
    })
}

pub fn parse_backing_bundle_v1(bytes: &[u8]) -> ApntResult<BackingBundleV1> {
    if bytes.len() < 45 || &bytes[..8] != BUNDLE_MAGIC || bytes[8] != 1 {
        return Err(err("APNTBBV1 has invalid length, magic, or version"));
    }
    let creation_scope: [u8; 32] = bytes[9..41].try_into().expect("32 bytes");
    require_nonzero(&creation_scope, "bundle creation scope")?;
    let count = u32::from_le_bytes(bytes[41..45].try_into().expect("4 bytes"));
    if count == 0 || count > 2_048 || bytes.len() != 45 + count as usize * 76 {
        return Err(err("APNTBBV1 has invalid member count or length"));
    }
    let mut members = Vec::with_capacity(count as usize);
    let mut offset = 45;
    for _ in 0..count {
        let output_index = u32::from_le_bytes(bytes[offset..offset + 4].try_into().unwrap());
        let value_sats = u64::from_le_bytes(bytes[offset + 4..offset + 12].try_into().unwrap());
        let locking_profile_id = bytes[offset + 12..offset + 44].try_into().unwrap();
        let assignment_blinder = bytes[offset + 44..offset + 76].try_into().unwrap();
        super::checked_bch_value(value_sats, true)?;
        require_nonzero(&locking_profile_id, "bundle locking profile")?;
        require_nonzero(&assignment_blinder, "bundle assignment blinder")?;
        members.push(BackingBundleMemberV1 {
            output_index,
            value_sats,
            locking_profile_id,
            assignment_blinder,
        });
        offset += 76;
    }
    if members
        .windows(2)
        .any(|pair| pair[0].output_index >= pair[1].output_index)
    {
        return Err(err("APNTBBV1 members are not in canonical order"));
    }
    checked_satoshi_sum(
        &members
            .iter()
            .map(|member| member.value_sats)
            .collect::<Vec<_>>(),
    )?;
    Ok(BackingBundleV1 {
        encoded: bytes.to_vec(),
        creation_scope,
        members,
        commitment: sha256_domain_separated(BUNDLE_COMMITMENT_DOMAIN, bytes)?,
    })
}

pub fn parse_backing_seal_cell_v1(bytes: &[u8]) -> ApntResult<BackingSealCellOpeningV1> {
    if bytes.len() != 117 || &bytes[..8] != CELL_MAGIC || bytes[8] != 1 {
        return Err(err("APNTSCV1 has invalid length, magic, or version"));
    }
    let creation_scope = bytes[9..41].try_into().expect("32 bytes");
    let output_index = u32::from_le_bytes(bytes[41..45].try_into().expect("4 bytes"));
    let value_sats = u64::from_le_bytes(bytes[45..53].try_into().expect("8 bytes"));
    let locking_profile_id = bytes[53..85].try_into().expect("32 bytes");
    let assignment_blinder = bytes[85..117].try_into().expect("32 bytes");
    require_nonzero(&creation_scope, "backing-cell creation scope")?;
    super::checked_bch_value(value_sats, true)?;
    require_nonzero(&locking_profile_id, "backing-cell locking profile")?;
    require_nonzero(&assignment_blinder, "backing-cell assignment blinder")?;
    Ok(BackingSealCellOpeningV1 {
        encoded: bytes.to_vec(),
        creation_scope,
        output_index,
        value_sats,
        locking_profile_id,
        assignment_blinder,
        commitment: sha256_domain_separated(CELL_COMMITMENT_DOMAIN, bytes)?,
    })
}

pub fn parse_recovery_witness_v0(bytes: &[u8]) -> ApntResult<RecoveryWitnessV0> {
    let mut reader = Reader::new(bytes, "APNTRWV0");
    reader.expect(RECOVERY_WITNESS_MAGIC, "magic")?;
    if reader.u8("version")? != 0 {
        return Err(err("APNTRWV0 has unsupported version"));
    }
    let statement_commitment = reader.bytes32("statement commitment")?;
    let created_note_commitment = reader.bytes32("created note commitment")?;
    let created_bundle_commitment = reader.bytes32("created bundle commitment")?;
    let creation_scope = reader.bytes32("creation scope")?;
    let packet_index = reader.u32("packet index")?;
    let packet_hash = reader.bytes32("packet hash")?;
    let descriptor = parse_descriptor(reader.length_prefixed("descriptor")?)?;
    let encapsulation_seed = reader.bytes32("encapsulation seed")?;
    reader.finish()?;
    Ok(RecoveryWitnessV0 {
        encoded: bytes.to_vec(),
        statement_commitment,
        created_note_commitment,
        created_bundle_commitment,
        creation_scope,
        packet_index,
        packet_hash,
        descriptor,
        encapsulation_seed,
    })
}

fn profile_parameters(id: &str) -> ApntResult<RecoveryProfileV0> {
    let (carrier_count, packet_bin_byte_length) = match id {
        "apnt-plane-b-same-tx-batch-7x197-v0" => (7, 1_344),
        "apnt-plane-b-same-tx-recovery-10x197-v0" => (10, 1_970),
        "apnt-plane-b-same-tx-recovery-15x197-v0" => (15, 2_955),
        _ => return Err(err("APNTRTV0 has unsupported recovery profile")),
    };
    Ok(RecoveryProfileV0 {
        id: id.to_owned(),
        carrier_payload_bytes: 197,
        carrier_count,
        packet_bin_byte_length,
    })
}

pub fn parse_recovery_packet_table_v0(bytes: &[u8]) -> ApntResult<RecoveryPacketTableV0> {
    let mut reader = Reader::new(bytes, "APNTRTV0");
    reader.expect(RECOVERY_PACKET_TABLE_MAGIC, "magic")?;
    if reader.u8("version")? != 0 {
        return Err(err("APNTRTV0 has unsupported version"));
    }
    let statement_commitment = reader.bytes32("statement commitment")?;
    let profile = profile_parameters(&reader.text("profile id")?)?;
    if reader.u64("carrier payload bytes")? != profile.carrier_payload_bytes
        || reader.u64("carrier count")? != profile.carrier_count
        || reader.u64("packet-bin byte length")? != profile.packet_bin_byte_length
        || reader.u8("padding policy")? != 0
    {
        return Err(err("APNTRTV0 profile parameters mismatch"));
    }
    let packet_count = reader.u32("packet count")?;
    if packet_count > RECOVERY_MAX_NOTES {
        return Err(err("APNTRTV0 packet count exceeds its bound"));
    }
    let mut encoded_packets = Vec::with_capacity(packet_count as usize);
    for _ in 0..packet_count {
        encoded_packets.push(reader.length_prefixed("encoded packet")?.to_vec());
    }
    let hash_count = reader.u32("packet hash count")?;
    if hash_count > RECOVERY_MAX_NOTES {
        return Err(err("APNTRTV0 packet hash count exceeds its bound"));
    }
    let mut packet_hashes = Vec::with_capacity(hash_count as usize);
    for _ in 0..hash_count {
        packet_hashes.push(reader.bytes32("packet hash")?);
    }
    let packet_bin = reader.length_prefixed("packet bin")?.to_vec();
    let packet_bin_root = reader.bytes32("packet-bin root")?;
    let manifest_root = reader.bytes32("manifest root")?;
    let table_commitment = reader.bytes32("table commitment")?;
    reader.finish()?;
    Ok(RecoveryPacketTableV0 {
        encoded: bytes.to_vec(),
        statement_commitment,
        profile,
        encoded_packets,
        packet_hashes,
        packet_bin,
        packet_bin_root,
        manifest_root,
        table_commitment,
    })
}

fn read_canonical_boolean(reader: &mut Reader<'_>, name: &str) -> ApntResult<bool> {
    match reader.u8(name)? {
        0 => Ok(false),
        1 => Ok(true),
        _ => Err(err(format!("{} has non-canonical {name}", reader.contract))),
    }
}

fn parse_complete_private_witness_versioned(
    bytes: &[u8],
    contract: &'static str,
    magic: &[u8; 8],
    version: u8,
    relation_domain: &str,
) -> ApntResult<CompletePrivateWitnessV0> {
    let mut reader = Reader::new(bytes, contract);
    reader.expect(magic, "magic")?;
    if reader.u8("version")? != version || reader.text("domain")? != relation_domain {
        return Err(err(format!("{contract} has unsupported identity")));
    }
    let statement_relation_identity_override =
        if read_canonical_boolean(&mut reader, "statement identity override presence")? {
            Some(reader.text("statement identity override")?)
        } else {
            None
        };
    let caller_authored_accepted =
        if read_canonical_boolean(&mut reader, "caller-authored accepted presence")? {
            Some(read_canonical_boolean(
                &mut reader,
                "caller-authored accepted value",
            )?)
        } else {
            None
        };
    let expected_statement_commitment = reader.bytes32("expected statement commitment")?;
    let statement_bytes = reader.length_prefixed("statement")?.to_vec();
    let logical_count = reader.u32("logical witness count")?;
    if logical_count > RECOVERY_MAX_NOTES {
        return Err(err("APNTIWV0 logical witness count exceeds its bound"));
    }
    let mut logical_witnesses = Vec::with_capacity(logical_count as usize);
    for _ in 0..logical_count {
        let statement_commitment = reader.bytes32("logical statement commitment")?;
        let created_note_commitment = reader.bytes32("logical note commitment")?;
        let creation_scope = reader.bytes32("logical creation scope")?;
        let creation_transaction_id = reader.bytes32("logical creation transaction id")?;
        let note = parse_bundle_backed_note_v1(reader.length_prefixed("created note")?)?;
        let bundle = parse_backing_bundle_v1(reader.length_prefixed("created bundle")?)?;
        logical_witnesses.push(LogicalWitnessV0 {
            statement_commitment,
            created_note_commitment,
            creation_scope,
            creation_transaction_id,
            note,
            bundle,
        });
    }
    if logical_witnesses
        .windows(2)
        .any(|pair| pair[0].created_note_commitment > pair[1].created_note_commitment)
    {
        return Err(err("APNTIWV0 logical witnesses are not canonical"));
    }
    let backing_count = reader.u32("backing witness count")?;
    if backing_count > BACKING_MAX_CELLS {
        return Err(err("APNTIWV0 backing witness count exceeds its bound"));
    }
    let mut backing_cell_witnesses = Vec::with_capacity(backing_count as usize);
    for _ in 0..backing_count {
        if reader.u8("backing role")? != 0 {
            return Err(err("APNTIWV0 has unsupported backing role"));
        }
        backing_cell_witnesses.push(BackingCellWitnessV0 {
            statement_commitment: reader.bytes32("backing statement commitment")?,
            assigned_created_note_commitment: reader.bytes32("assigned note commitment")?,
            creation_transaction_id: reader.bytes32("backing creation transaction id")?,
            output_index: reader.u32("backing output index")?,
            seal_cell_commitment: reader.bytes32("backing cell commitment")?,
            opening: parse_backing_seal_cell_v1(reader.length_prefixed("backing cell opening")?)?,
        });
    }
    if backing_cell_witnesses.windows(2).any(|pair| {
        (pair[0].output_index, pair[0].seal_cell_commitment)
            > (pair[1].output_index, pair[1].seal_cell_commitment)
    }) {
        return Err(err("APNTIWV0 backing-cell witnesses are not canonical"));
    }
    let recovery_count = reader.u32("recovery witness count")?;
    if recovery_count > RECOVERY_MAX_NOTES {
        return Err(err("APNTIWV0 recovery witness count exceeds its bound"));
    }
    let mut recovery_witnesses = Vec::with_capacity(recovery_count as usize);
    for _ in 0..recovery_count {
        recovery_witnesses.push(parse_recovery_witness_v0(
            reader.length_prefixed("recovery witness")?,
        )?);
    }
    if recovery_witnesses.windows(2).any(|pair| {
        (pair[0].packet_index, pair[0].created_note_commitment)
            > (pair[1].packet_index, pair[1].created_note_commitment)
    }) {
        return Err(err("APNTIWV0 recovery witnesses are not canonical"));
    }
    let packet_table =
        parse_recovery_packet_table_v0(reader.length_prefixed("recovery packet table")?)?;
    let authority_count = reader.u32("authority witness count")?;
    if authority_count > RECOVERY_MAX_NOTES {
        return Err(err("APNTIWV0 authority witness count exceeds its bound"));
    }
    let mut authority_witnesses = Vec::with_capacity(authority_count as usize);
    for _ in 0..authority_count {
        authority_witnesses.push(parse_authority_frame(
            reader.length_prefixed("authority witness")?,
        )?);
    }
    if authority_witnesses
        .windows(2)
        .any(|pair| pair[0].created_note_commitment > pair[1].created_note_commitment)
    {
        return Err(err("APNTIWV0 authority witnesses are not canonical"));
    }
    let nullifier_count = reader.u32("nullifier witness count")?;
    if nullifier_count > RECOVERY_MAX_NOTES {
        return Err(err("APNTIWV0 nullifier witness count exceeds its bound"));
    }
    let mut nullifier_witnesses = Vec::with_capacity(nullifier_count as usize);
    for _ in 0..nullifier_count {
        nullifier_witnesses.push(parse_nullifier_frame(
            reader.length_prefixed("nullifier witness")?,
        )?);
    }
    if nullifier_witnesses
        .windows(2)
        .any(|pair| pair[0].created_note_commitment > pair[1].created_note_commitment)
    {
        return Err(err("APNTIWV0 nullifier witnesses are not canonical"));
    }
    reader.finish()?;
    Ok(CompletePrivateWitnessV0 {
        encoded: bytes.to_vec(),
        rejection_only_metadata: RejectionOnlyWitnessMetadataV0 {
            statement_relation_identity_override,
            caller_authored_accepted,
        },
        expected_statement_commitment,
        statement_bytes,
        logical_witnesses,
        backing_cell_witnesses,
        recovery_witnesses,
        packet_table,
        authority_witnesses,
        nullifier_witnesses,
    })
}

pub fn parse_complete_private_witness_v0(bytes: &[u8]) -> ApntResult<CompletePrivateWitnessV0> {
    parse_complete_private_witness_versioned(
        bytes,
        "APNTIWV0",
        PRIVATE_WITNESS_MAGIC,
        0,
        super::RELATION_DOMAIN,
    )
}

pub fn parse_complete_private_witness_v1(bytes: &[u8]) -> ApntResult<CompletePrivateWitnessV0> {
    parse_complete_private_witness_versioned(
        bytes,
        "APNTIWV1",
        PRIVATE_WITNESS_V1_MAGIC,
        1,
        super::relation_v1::RELATION_V1_DOMAIN,
    )
}

pub fn parse_private_recovery_view_v0(bytes: &[u8]) -> ApntResult<PrivateRecoveryViewV0> {
    let witness = parse_complete_private_witness_v0(bytes)?;
    if witness
        .rejection_only_metadata
        .statement_relation_identity_override
        .is_some()
        || witness
            .rejection_only_metadata
            .caller_authored_accepted
            .is_some()
    {
        return Err(err("APNTIWV0 contains rejection-only mutation metadata"));
    }
    Ok(PrivateRecoveryViewV0 {
        expected_statement_commitment: witness.expected_statement_commitment,
        statement_bytes: witness.statement_bytes,
        logical_witnesses: witness.logical_witnesses,
        recovery_witnesses: witness.recovery_witnesses,
        packet_table: witness.packet_table,
    })
}

pub fn parse_authority_frame(bytes: &[u8]) -> ApntResult<AuthorityMaterialWitnessV0> {
    let mut reader = Reader::new(bytes, "APNTARV0");
    reader.expect(AUTHORITY_WITNESS_MAGIC, "magic")?;
    if reader.u8("version")? != 0 {
        return Err(err("APNTARV0 has unsupported version"));
    }
    let authority = AuthorityMaterialWitnessV0 {
        encoded: bytes.to_vec(),
        statement_commitment: reader.bytes32("authority statement commitment")?,
        created_note_commitment: reader.bytes32("authority note commitment")?,
        created_bundle_commitment: reader.bytes32("authority bundle commitment")?,
        creation_scope: reader.bytes32("authority creation scope")?,
        owner_commitment: reader.bytes32("authority owner commitment")?,
        owner_public_key: reader.bytes32("authority owner public key")?,
    };
    reader.finish()?;
    Ok(authority)
}

pub fn parse_nullifier_frame(bytes: &[u8]) -> ApntResult<NullifierMaterialWitnessV0> {
    let mut reader = Reader::new(bytes, "APNTNRV0");
    reader.expect(NULLIFIER_WITNESS_MAGIC, "magic")?;
    if reader.u8("frame version")? != 0 {
        return Err(err("APNTNRV0 has unsupported frame version"));
    }
    let version = reader.u8("nullifier version")?;
    let domain = reader.text("nullifier domain")?;
    let nullifier = NullifierMaterialWitnessV0 {
        encoded: bytes.to_vec(),
        version,
        domain,
        statement_commitment: reader.bytes32("nullifier statement commitment")?,
        created_note_commitment: reader.bytes32("nullifier note commitment")?,
        created_bundle_commitment: reader.bytes32("nullifier bundle commitment")?,
        owner_public_key: reader.bytes32("nullifier owner public key")?,
        derived_nullifier: reader.bytes32("derived nullifier")?,
    };
    reader.finish()?;
    Ok(nullifier)
}

pub fn build_recovery_plaintext_v1(
    logical: &LogicalWitnessV0,
    recovery: &RecoveryWitnessV0,
) -> ApntResult<Vec<u8>> {
    if logical.note.commitment != logical.created_note_commitment
        || logical.note.backing_bundle_commitment != logical.bundle.commitment
        || recovery.created_note_commitment != logical.created_note_commitment
        || recovery.created_bundle_commitment != logical.bundle.commitment
        || recovery.creation_scope != logical.creation_scope
        || logical.bundle.creation_scope != logical.creation_scope
    {
        return Err(err(
            "recovery sender note, bundle, or scope binding mismatch",
        ));
    }
    let mut output = Vec::with_capacity(141 + logical.bundle.members.len() * 36);
    output.extend_from_slice(RECOVERY_PLAINTEXT_MAGIC);
    output.push(2);
    write_u32_be(&mut output, recovery.packet_index);
    output.extend_from_slice(&recovery.created_note_commitment);
    output.extend_from_slice(&recovery.creation_scope);
    output.extend_from_slice(&logical.note.note_nonce);
    write_u32_be(
        &mut output,
        logical
            .bundle
            .members
            .len()
            .try_into()
            .map_err(|_| err("recovery plaintext member count exceeds u32"))?,
    );
    for member in &logical.bundle.members {
        write_u32_be(&mut output, member.output_index);
        output.extend_from_slice(&member.assignment_blinder);
    }
    Ok(output)
}

pub fn build_recovery_sender_evidence_v0(
    logical: &LogicalWitnessV0,
    recovery: &RecoveryWitnessV0,
) -> ApntResult<RecoverySenderEvidenceV0> {
    let plaintext = build_recovery_plaintext_v1(logical, recovery)?;
    let encapsulation = mlkem768_encapsulate_v0(
        &recovery.descriptor.public_key,
        &recovery.encapsulation_seed,
    )?;
    let schedule = derive_recovery_aes256_gcm_schedule_v0(
        &encapsulation.shared_secret,
        &encapsulation.ciphertext,
    )?;
    let (payload_ciphertext, payload_tag) =
        aes256_gcm_encrypt_v0(&schedule.key, &schedule.nonce, &schedule.aad, &plaintext)?;
    let mut encoded_packet = Vec::with_capacity(
        RECOVERY_PACKET_MAGIC.len() + MLKEM768_CIPHERTEXT_BYTES + 16 + 4 + payload_ciphertext.len(),
    );
    encoded_packet.extend_from_slice(RECOVERY_PACKET_MAGIC);
    encoded_packet.extend_from_slice(&encapsulation.ciphertext);
    encoded_packet.extend_from_slice(&payload_tag);
    write_u32_be(
        &mut encoded_packet,
        payload_ciphertext
            .len()
            .try_into()
            .map_err(|_| err("recovery payload ciphertext exceeds u32"))?,
    );
    encoded_packet.extend_from_slice(&payload_ciphertext);
    let packet_hash = sha256_domain_separated(RECOVERY_PACKET_HASH_DOMAIN, &encoded_packet)?;
    Ok(RecoverySenderEvidenceV0 {
        plaintext,
        kem_ciphertext: encapsulation.ciphertext,
        shared_secret: encapsulation.shared_secret,
        aes_key_derivation_input: schedule.key_derivation_input,
        aes_key_material: schedule.key_material,
        aes_key: schedule.key,
        nonce: schedule.nonce,
        aad: schedule.aad,
        payload_ciphertext,
        payload_tag,
        encoded_packet,
        packet_hash,
    })
}

fn packet_bin_padding(prefix: &[u8], padding_length: usize) -> ApntResult<Vec<u8>> {
    let mut padding = vec![0u8; padding_length];
    let mut offset = 0usize;
    let mut counter = 0u64;
    while offset < padding_length {
        let payload = format!(
            "{{\"counter\":{counter},\"paddingLength\":{padding_length},\"prefixBytes\":{{\"$bytes\":\"{}\"}}}}",
            super::hex_encode(prefix),
        );
        let block = sha256_domain_separated(
            &format!("{RECOVERY_PACKET_BIN_DOMAIN}:profile-selected-padding"),
            payload.as_bytes(),
        )?;
        let take = block.len().min(padding_length - offset);
        padding[offset..offset + take].copy_from_slice(&block[..take]);
        offset += take;
        counter = counter
            .checked_add(1)
            .ok_or_else(|| err("packet-bin padding counter overflow"))?;
    }
    Ok(padding)
}

fn manifest_bytes(
    profile: &RecoveryProfileV0,
    packet_hashes: &[[u8; 32]],
    packet_bin_root: &[u8; 32],
) -> ApntResult<Vec<u8>> {
    if !is_printable_ascii(&profile.id) {
        return Err(err("recovery profile id is invalid ASCII"));
    }
    let hashes = packet_hashes
        .iter()
        .map(|hash| format!("{{\"$bytes\":\"{}\"}}", super::hex_encode(hash)))
        .collect::<Vec<_>>()
        .join(",");
    Ok(format!(
        "{{\"capacityPosture\":\"explicit-fail-closed-or-multi-bin\",\"carriageProfileId\":\"{}\",\"carrierCount\":{},\"carrierPayloadBytes\":{},\"domain\":\"{RECOVERY_PACKET_BIN_DOMAIN}\",\"packetBinByteLength\":{},\"packetBinCount\":1,\"packetBinRoot32\":{{\"$bytes\":\"{}\"}},\"packetCount\":{},\"packetHashes32\":[{}],\"packetMaterialStatus\":\"{RECOVERY_PACKET_MATERIAL_STATUS}\",\"packetRecordEncoding\":\"{RECOVERY_PACKET_RECORD_ENCODING}\",\"paddingPolicy\":\"profile-selected\",\"version\":0}}",
        profile.id,
        profile.carrier_count,
        profile.carrier_payload_bytes,
        profile.packet_bin_byte_length,
        super::hex_encode(packet_bin_root),
        packet_hashes.len(),
        hashes,
    )
    .into_bytes())
}

pub fn recompute_recovery_table_v0(
    view: &PrivateRecoveryViewV0,
) -> ApntResult<RecoveryTableRecomputationV0> {
    let mut senders = Vec::with_capacity(view.recovery_witnesses.len());
    for recovery in &view.recovery_witnesses {
        let logical = view
            .logical_witnesses
            .iter()
            .find(|logical| logical.created_note_commitment == recovery.created_note_commitment)
            .ok_or_else(|| err("recovery witness has no matching logical witness"))?;
        senders.push((
            recovery.packet_index,
            build_recovery_sender_evidence_v0(logical, recovery)?,
        ));
    }
    senders.sort_by_key(|(index, _)| *index);
    if senders
        .iter()
        .enumerate()
        .any(|(position, (index, _))| *index != position as u32)
    {
        return Err(err("recovery packet indexes are not contiguous"));
    }
    let senders = senders
        .into_iter()
        .map(|(_, sender)| sender)
        .collect::<Vec<_>>();
    build_recovery_table_from_senders_v0(&view.packet_table.profile, senders)
}

pub fn build_recovery_table_from_senders_v0(
    profile: &RecoveryProfileV0,
    senders: Vec<RecoverySenderEvidenceV0>,
) -> ApntResult<RecoveryTableRecomputationV0> {
    let mut prefix = Vec::new();
    prefix.extend_from_slice(RECOVERY_PACKET_BIN_MAGIC);
    let packet_count: u16 = senders
        .len()
        .try_into()
        .map_err(|_| err("recovery packet count exceeds u16"))?;
    prefix.extend_from_slice(&packet_count.to_be_bytes());
    for sender in &senders {
        write_u32_be(
            &mut prefix,
            sender
                .encoded_packet
                .len()
                .try_into()
                .map_err(|_| err("encoded recovery packet exceeds u32"))?,
        );
        prefix.extend_from_slice(&sender.encoded_packet);
    }
    let target_length: usize = profile
        .packet_bin_byte_length
        .try_into()
        .map_err(|_| err("packet-bin profile length exceeds usize"))?;
    if prefix.len() > target_length {
        return Err(err("recovery packet-bin capacity exceeded"));
    }
    let mut packet_bin = prefix.clone();
    packet_bin.extend_from_slice(&packet_bin_padding(&prefix, target_length - prefix.len())?);
    let packet_hashes = senders
        .iter()
        .map(|sender| sender.packet_hash)
        .collect::<Vec<_>>();
    let packet_bin_root = sha256_domain_separated(RECOVERY_PACKET_BIN_ROOT_DOMAIN, &packet_bin)?;
    let manifest_bytes = manifest_bytes(profile, &packet_hashes, &packet_bin_root)?;
    let manifest_root =
        sha256_domain_separated(RECOVERY_BATCH_MANIFEST_ROOT_DOMAIN, &manifest_bytes)?;
    Ok(RecoveryTableRecomputationV0 {
        senders,
        packet_bin,
        packet_hashes,
        packet_bin_root,
        manifest_bytes,
        manifest_root,
    })
}

pub fn validate_complete_recovery_transcript_v0(
    view: &PrivateRecoveryViewV0,
) -> ApntResult<RecoveryTableRecomputationV0> {
    let recomputed = recompute_recovery_table_v0(view)?;
    if view.packet_table.statement_commitment != view.expected_statement_commitment
        || view.packet_table.encoded_packets
            != recomputed
                .senders
                .iter()
                .map(|sender| sender.encoded_packet.clone())
                .collect::<Vec<_>>()
        || view.packet_table.packet_hashes != recomputed.packet_hashes
        || view.packet_table.packet_bin != recomputed.packet_bin
        || view.packet_table.packet_bin_root != recomputed.packet_bin_root
        || view.packet_table.manifest_root != recomputed.manifest_root
        || view.packet_table.table_commitment != recomputed.manifest_root
    {
        return Err(err("complete recovery packet-table transcript mismatch"));
    }
    for (recovery, sender) in view.recovery_witnesses.iter().zip(&recomputed.senders) {
        if recovery.packet_hash != sender.packet_hash {
            return Err(err("recovery witness packet hash mismatch"));
        }
    }
    Ok(recomputed)
}
