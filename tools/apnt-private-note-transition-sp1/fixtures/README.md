# Private-note-transition SP1 Groth16 fixtures

> **Rebuilt on 2026-08-09 by Batch 11a, and current again.** The APNT verifier
> CashToken category was deployed on Chipnet (genesis
> `67349b46125a4e76e37542f404f83820d229b09608d6211f3bf8145db18a806c`) and
> re-pinned, which moved every created-note seal's 128 locking bytes and
> therefore the transition guest, its vkey, all four proofs, the trusted
> verifier descriptor and the chunked CashVM artifact. All of those have now
> been regenerated; see **The Batch 11a rebuild** below for the measured values,
> `superseded/` for the retained pre-genesis proof fixtures, and
> `openspec/changes/define-apnt-seal-native-import-settlement-v1/transition-proving-pipeline-rebuild-v0.md`
> for the durable record of what was superseded and why.
>
> **The relation did not change.** Its identity, statement codec, evaluation
> order, failure taxonomy and semantic contract commitment
> `ed354cade2fd7fc5…593e6b` are all exactly what they were. This was a
> deployment-constant rebuild.

## The Batch 11a rebuild, as measured

```text
                         rebuilt (deployed skeleton)                                        superseded (pre-genesis)
program VKey             002e374da3dc5e898b30efd70baf166ab5633c95c3b80009e0b563b3c428a65c    00045616…c92d
guest ELF SHA-256        b852785f667f686c902c4f622c113aa05ade8aaceca273de24132c0edd55df9c    5fe506ca…3416
guest ELF bytes          986,496                                                             987,384
semantic contract        ed354cade2fd7fc553210756b552aa042a376ea42f0b7eb87d4716b753593e6b    UNCHANGED
wrapper key SHA-256      4388a21c687fdd5f218d7e3d13190cac4c5355818d3605fd5fb811df468ee696    UNCHANGED
public values codec      APNTPRR0, 210 bytes                                                 UNCHANGED
trusted descriptor       4158a79c0d63b0c914db97f4f979e32ef740f8e3bb5f83d508dd89cc5f417ac6    a4e1e84d…f8de
chunked CashVM artifact  fb6349208ad4fe45c68b9be7a76fa45d1e3ec5858203ff69ea3a8e6d59c98e97    6d1d67ab…7c5e9
chunked stage count      33                                                                  33, UNCHANGED
```

Regenerated fixture digests and the statements they prove:

| case | fixture SHA-256 | statement commitment | `settlementProjection32` |
| --- | --- | --- | --- |
| `private-split` | `bdb18184d6befa0eb02ed5df9f385154c3edc509e52de2acedfbdeea7e45421c` | `100091ec7e772297498610191658d56e94279988d9fdff3fd00af4350fe67f65` | `fe9b606ee1cda9e495ef4fc657e78799774cd142ea6e72513a8aab2f1a60709f` |
| `private-split-flat-aggregator-service-fee` | `ff434cd68c7f075b336c67605c9fad72a9fea08e50a8b440bed620c69ededc94` | `8d3b6f833bed92ef03473ffcb7cbd2398054fe60fd3c7b9d7d45dc7da2194145` | `172362641844c2c8882e463506b03ae3048d1f2213eda7902dbfdb00600b535a` |
| `live-chipnet-9x2000-private-split` | `242edb1bc604597a012e17c35b907c280e6646bedf1c10e4d2e9a65cdf23293a` | `43cfffa094161e647f7784c1b1f10ecb1d3bcecc7a4c512107f3a9753fc0dd14` | `2d50ff005a739e0aaeb1d4ddeedaf6b6a75bda24773b05f16bc04cf9a0ac7a53` |
| `live-chipnet-26x2000-two-source-private-split` | `afab21966f4b76bf02d6a5477d240f0054b98d741aebd9d1067bf9aee78a2e26` | `b8bbaeda603e126fd89a50d98fe312ff2d279b0ba83562a11535c8df91b0fffb` | `9267199713733b613652565b206949d85561e008c20634e426bee82ada399a31` |

Measured proof generation for the rebuild. **These wall times are not comparable
to the campaign figures further down, and must not be read as a cost of this
change.** This machine was shared with other concurrent work throughout: the
`private-split` run overlapped package builds and a test suite, and the two live
cases were each killed once by memory pressure before being re-run under a
resource guard that bounds `RAYON_NUM_THREADS` to 6 (down from all cores),
`nice`s the process, gates the start on ≥20 GB of available memory, and
terminates the prover if free memory falls below 4 GB. Bounded parallelism
lengthens wall time by construction. The instruction counts below are the
comparable figures, and they are machine-independent.

| Case | Prover-internal end to end | `/usr/bin/time -l` wall | Maximum resident set size | Threads |
| --- | ---: | ---: | ---: | ---: |
| private split, zero service fee | 511,154 ms | 521.53 s | 21,261,959,168 bytes | all |
| private split, flat service fee | 172,602 ms | 184.41 s | 33,785,937,920 bytes | all |
| live chipnet nine-cell private split | 358,865 ms | 374.04 s | 29,744,218,112 bytes | 6 |
| live chipnet twenty-six-cell two-source private split | 355,573 ms | 369.71 s | 36,539,514,880 bytes | 6 |

Executed instruction counts against the rebuilt guest, measured by the runner:
**4,651,207 / 4,685,415 / 4,800,428 / 5,233,393** in table order (normalized gas
5,053,725 / 5,096,547 / 5,307,398 / 5,850,995), against the superseded guest's
4,652,237 / 4,687,117 / 4,803,556 / 5,234,601 — **−0.02%, −0.04%, −0.07%,
−0.02%**. That is the expected shape of a constant re-pin: the guest compares the
same 128 bytes against different bytes, so the work is identical and the sub-0.1%
deltas are compiler layout, not relation change.

Independent verification of the rebuild, all seven tools re-run and all passing:
`verify-apnt-transition-settlement-projection-independently-v0` **123/123**,
`verify-apnt-chunked-verifier-statement-binding-independently-v0` **57/57 checks,
23/23 negatives**,
`verify-apnt-noncustodial-spend-authority-proofs-independently-v0` **81/81
checks, 22/22 negatives** (this one re-checks each BN254 pairing here, with the
full six-point IC MSM, and re-executes all 33 chunked stages per case on the real
BCH 2026 VM), `verify-apnt-aggregate-settlement-chain-independently-v0`
**476/476**, `verify-apnt-settlement-authorization-covenant-independently-v0`
**60/60**, `verify-apnt-created-note-seal-independently-v0` **60/60**,
`verify-apnt-created-note-seal-exit-branch-independently-v0` **36/36**.

Everything below this line describes the **2026-08-06 campaign against the
superseded guest**. It is retained as the historical record of how these
fixtures came to have the shape they do, and its identity literals are the
`superseded` column above, not current values.

---

These are public-safe prototype proof fixtures for the fixed
`apnt-private-note-transition-relation-v0` guest. All four proofs were
generated locally with SP1 crates 6.3.1, the SP1 v6.1.0 circuit artifacts, CPU
proving, `.groth16()`, and a zero proof nonce. Native SP1 verification
succeeded before each fixture was written.

All four were **regenerated again on 2026-08-06** for the mandatory
created-note exit branch (commit `14fb141`), which moved the guest a third
time. That change separated the aggregation transition-boundary output into its
own `TRANSITION_BOUNDARY` projection role, made every created backing cell
project a real 128-byte created-note seal, and added `exitAuthorityCommitment32`
to the transition statement's created backing cell tuple with per-cell exit
authority. The two previous regenerations were for the settlement-projection
statement-binding change
(`openspec/changes/archive/2026-08-06-bind-apnt-transition-settlement-projection-v0`)
and, before that, the non-custodial spend-authority relation change
(`openspec/changes/archive/2026-08-05-define-apnt-noncustodial-spend-authority-v0`,
task 5.1). The guest identity recorded below is the one the workspace builds
today. Every proof was produced through the `ApntProverBackendV0` boundary
(`tools/apnt-prover-backend-v0/`, `add-apnt-pluggable-prover-backend-v0`) on
its `cpu` backend; each fixture records which backend produced it.

Fixed identities:

- program VKey: `00045616cedf156e9edd7881835673f664b272687b5f7ffaccfb728aec4fc92d`
  (was `00bc0b87…`)
- guest ELF SHA-256:
  `5fe506ca320ef4ca28fbc38802952764dad50a386667c53232ca2cdaaed63416`
  (was `c6d109f2…`), 987,384 bytes (was 920,320). Two independent rebuilds on
  2026-08-06 produced byte-identical ELFs.
- relation semantic contract commitment:
  `ed354cade2fd7fc553210756b552aa042a376ea42f0b7eb87d4716b753593e6b`
  (was `27400b73…`). Unlike the two figures above this one is **derived, not
  measured**: it is
  `deriveAPNTPrivateNoteTransitionRelationV0ContractCommitment()` over the
  frozen contract descriptor in
  `packages/protocol-runtime/src/apnt_private_note_transition_relation_v0.ts`,
  which commit `14fb141` extended with a `createdNoteSealContract` clause and a
  reworded `canonicalPrivateWitnessContract`. That commit already moved the
  value in `packages/protocol-runtime/test-vectors/apnt-private-note-transition-v0-sp1-handoff.json`;
  this campaign propagated it to the SP1 prover, the verifier crate, the trusted
  artifact and the four fixtures, which had all been carrying the stale one.
- wrapper verification-key SHA-256:
  `4388a21c687fdd5f218d7e3d13190cac4c5355818d3605fd5fb811df468ee696`
  (**unchanged** — the SP1 version did not move)
- wrapper verification-key bytes: 492
- committed public-values codec and length: `APNTPRR0`, **210 bytes**
  (**unchanged**). The relation change is entirely inside the statement
  preimage and the private witness; it adds no public result field, so every
  offset in the committed public values — including the settlement-projection
  presence byte at 177 and `settlementProjection32` at 178 — is exactly where it
  was. What moved is what those bytes *contain*, because the statement they
  commit to moved.

The `APNTTSV1` statement wire encoding moved in exactly one place: a created
backing cell tuple grew from `4 + 32 + 32` to `4 + 32 + 32 + 32` bytes, the new
field being `exitAuthorityCommitment32`. Consumed backing cells are unchanged.
That single 32-byte-per-created-cell growth is the whole wire delta, and it is
what every hand-written independent statement parser in this repository had to
be taught (see the verification section below).

Deterministic fixture file hashes after recording measurements:

- `tools/apnt-private-note-transition-sp1/fixtures/canonical-groth16-private-split-v0.json`:
  `534d937c3ffbf4d65d43ec19fdb0b3335e4779a4ea663d6fe25470dd3bf80721`
- `tools/apnt-private-note-transition-sp1/fixtures/canonical-groth16-private-split-flat-aggregator-service-fee-v0.json`:
  `057eb0d05836c30453fe2c8ad99fc1bccb68138892fbb4a6224e14d7fd104486`
- `tools/apnt-private-note-transition-sp1/fixtures/canonical-groth16-live-chipnet-9x2000-v0.json`:
  `93f6f130a0b798813f1b5d4e1c325c07d7293d012e6e3db11182528e8e39f52b`
- `tools/apnt-private-note-transition-sp1/fixtures/canonical-groth16-live-chipnet-26x2000-two-source-v0.json`:
  `f97d7bcb559179403973af0a7381cbd2b52a37b079fdce6fbcd238d4829b87bf`

Measured proof generation, all four on the same 48 GiB Apple-silicon machine.
Unlike the previous campaign, all four ran **sequentially on an otherwise idle
machine**: no workspace test suite and no other proof ran concurrently with any
of them.

| Case | Prover-internal end to end | `/usr/bin/time -l` wall | Maximum resident set size |
| --- | ---: | ---: | ---: |
| private split, zero service fee | 236,188 ms | 245.54 s | 18,189,877,248 bytes |
| private split, flat service fee | 243,034 ms | 252.13 s | 23,204,528,128 bytes |
| live chipnet nine-cell private split | 241,643 ms | 249.73 s | 28,571,353,088 bytes |
| live chipnet twenty-six-cell two-source private split | 177,194 ms | 184.19 s | 30,750,982,144 bytes |

Read these numbers with care, and in particular **do not read them as a
regression**. The clean-machine `private-split` figure is 236,188 ms against
the previous campaign's 176,999 ms for the same case, which looks like a large
increase — but the fourth case, which has the *highest* instruction count of
the four, is the *fastest* of the four at 177,194 ms. Proving time here is
therefore not monotonic in the relation's work, and the honest reading is that
these wall times are dominated by SP1 shard packing and machine state rather
than by the relation change. No controlled A/B against the previous guest was
run, so no proving-cost claim is made in either direction. The comparable
figure is the instruction count, below, which moved by under 2%. Peak resident
set size ranged 18.2-30.8 GB.

Executed instruction counts, measured by the runner against the new guest:
4,652,237 / 4,687,117 / 4,803,556 / 5,234,601 for the four cases in table
order, against the previous guest's 4,569,876 / 4,608,593 / 4,718,182 /
5,142,022 — **+1.8%, +1.7%, +1.8%, +1.8%**. That is what a per-created-cell
128-byte seal skeleton comparison and one extra domain-separated SHA-256 per
created cell should cost, and it is uniform across cases with very different
cell counts because the added work is proportional to the created cells, which
all four cases have five of.

The third case proves a real, live, chain-confirmed Chipnet transaction
projection: nine real 2,000-sat APNT import-funding backing cells consumed, one
real 34,000-sat verifier-only collateral input, five created backing cells,
fifteen recovery-packet carriers, and — new with this change — a separate
`TRANSITION_BOUNDARY` output, which is why its projected output count moved from
20 to 21. Its statement commitment is now
`b40f9195998c1245cfb5437d2e10202e6aedc436f9af1eda9e7d2262836738f1`.

The fourth case proves a real, live, chain-confirmed Chipnet transaction
projection whose consumed backing cells come from **two different** real
import-funding transactions: all nine 2,000-sat cells of `4ff81b87…`, all
seventeen 2,000-sat cells of `00d24799…`, the same real 34,000-sat
verifier-only collateral input, five created backing cells, fifteen
recovery-packet carriers and the same new `TRANSITION_BOUNDARY` output. Its
statement commitment is now
`584aba6b5b9c2417300cc2a75a4c9f6ffcd3a4d40cfe3ac50f81f4652633d9d5`.

> **The two live cases' statement commitments moved again**, because the
> relation moved again. The real Chipnet transactions broadcast under earlier
> guests still carry their earlier statement commitments, so the archived
> live-transition evidence and its independent verifiers
> (`verify-apnt-live-nine-cell-transition-independently-v0.mjs`,
> `verify-apnt-live-twenty-six-cell-transition-independently-v0.mjs`) describe
> those earlier proofs and are historical records, not statements about the
> proofs in this directory. The same is true of the two spike directories under
> `tools/apnt-private-note-transition-sp1/scripts/statement-binding-spike/` and
> `tools/apnt-private-spend-covenant-v0/scripts/settlement-authorization-covenant-spike/`,
> whose frozen `measurements-v0.json` files record 2026-08-05 measurements
> against the previous guest and were deliberately left alone rather than
> rewritten. Nothing here has been broadcast.

**The chunked CashVM pairing verifier has been regenerated for this guest and
remains statement-bound.** **All four** of the proofs in this directory execute
terminally through the committed artifact
(`packages/reference-aggregator/fixtures/apnt-private-note-transition-groth16-bn254-chunked-cashvm-v0.json`,
SHA-256 `fe3cdc3d2a0513629c1b607a4c93ec7e00e210a38d9f5d32937ef07e61e000a6`),
across **thirty-three** transactions on the real BCH 2026 consensus *and*
standard VMs, beginning on `bind settlementProjection32` and ending on
`finalexp ops[280,294) verdict==1`.

The artifact was regenerated from the external `mr-zwets/groth16_cashscript`
graph at `0cff585` with the `compiler-optimizations-2` `cashc` fork (commit
`9fb14833713449403104c8a77cb10973130993e1`), both cloned fresh at those pinned
revisions into an isolated scratch directory; the working sibling checkouts were
never written to. Upstream's four stage generators ran unmodified. Upstream's
`build_vectors.mjs` did **not** run; the statement-bound graph was built by
`packages/reference-aggregator/tools/`
`generate-apnt-private-note-transition-groth16-bn254-statement-bound-vectors-v0.mjs`
in one pass covering all four proofs, exactly as in the previous campaign.

**One reproducibility gap was found and closed.** Commit `4d2b9f0` replaced the
artifact's synthetic byte-palindromic `covenantCategoryHex` (`cdcd…cd`) with the
real derived CashToken category
`66f007342d4e8993b9688a8c8ab3cc09ce3454ce7391556f9b813bc3e0068759` by editing
the committed fixture directly, and did not teach the converter to emit it. The
documented recipe therefore no longer reproduced the committed bytes: rerunning
it regenerated the placeholder. The converter
(`generate-apnt-private-note-transition-groth16-bn254-chunked-cashvm-v0.mjs`)
now reads the category from `apnt_verifier_token_genesis_v0.ts` and emits it,
and the substitution's precondition is **asserted rather than assumed** — the
converter fails closed unless the category appears in none of the 33 locking
programs and in no run's unlocking bytecode, carried state or successor locking.
Measured on the regenerated graph: 0 of 33 locking programs and 0 of 132 run
steps contain a token category, which is the expected consequence of the
terminal stage constraining its output category against its own *input*
category rather than a folded-in constant.

**What the binding does** is unchanged from the previous campaign.
`runBind32 = settlementProjection32` is derived on-chain by a leading stage from
the relation's own 210-byte `APNTPRR0` public values — requiring the presence
byte at offset 177 to be `0x01` and taking the commitment at offset 178 — and
checked against the graph's own runtime scalar. Every stage's carried state is
`hash256(runBind32 ‖ limbs)`, and the terminal stage emits `runBind32` as the
verdict NFT commitment, pins the output token category, and pins its successor
locking to the real settlement authorization covenant `L_verdict` =
`aa20ec18…2d2d87`
(`packages/protocol-runtime/src/apnt_settlement_authorization_covenant_v0.ts`,
read from that landed source rather than restated as a literal). The verdict
token remains an immutable NFT, for the reason measured in the previous
campaign: `OP_UTXOTOKENCATEGORY` pushes a bare 32 bytes only for `capability:
none`, and the landed seal aggregate branch compares against a bare 32-byte
pinned category. The four verdicts are distinct and each equals its own
statement's `settlementProjection32`:

| case | terminal verdict commitment |
|---|---|
| `private-split` | `7b33affc87b7b478d9f007a0c5c2d7148b9511d93caa8b9fdbf4dc8cb78994e6` |
| `private-split-flat-aggregator-service-fee` | `e55f63437122d349546fdaf74b2e7c04787874df5dd93b2bb65aa21f9a56d5cd` |
| `live-chipnet-9x2000-private-split` | `366d1eed5161d5bb40273b9ac5729c7d4f1fbb32539ef8119a1958f4492ccf4e` |
| `live-chipnet-26x2000-two-source-private-split` | `2e84e13c8da8a0541dbcaf2fefffb5c447a7d8d10a91b3cca66e4b947a3c4eb9` |

All four moved, because all four statements moved.

**Every one of the 33 locking programs changed**, as expected and as checked
rather than assumed: the chunked graph folds the fixed base `IC0 + s0·IC1` into
its bytecode and `s0` *is* the program VKey scalar, so the seven `vk_x` chunks
had to move; and each change cascades into its predecessor's pinned successor
P2SH32, which carries the move through the whole chain. `stepCount`,
`stepLabels`, `budgetPerInput`, `msmFold` and `proofBinding` are unchanged, as
is `groth16VerificationKeySha256`; `programVkeyHash` and `guestElfSha256` moved
to this guest (`00045616…c92d`, `5fe506ca…3416`) and `covenantCategoryHex` is
now the real derived category described above. The four `runs` are a deliberate
replacement, not an append. The five adversarial G1/G2 input-validation runs
were rebuilt against the bound graph and still fail to complete.

Measured cost of the regenerated graph, on the real VM: 33 transactions,
218,695,138 total operation cost for `private-split`, maximum step operation
cost 7,894,795 against the 8,032,800 budget, minimum headroom 77,201, maximum
unlocking bytecode 9,924 of 10,000, largest serialized transaction 10,088 bytes
of 100,000. The bind stage remains cheap: 407 unlocking bytes and 9,045
operation cost against a 358,400 budget.

## Independent verification

Seven independent verifiers were re-run, none of which import the code under
test. All seven pass:

| tool | result |
|---|---|
| `packages/reference-aggregator/tools/verify-apnt-transition-settlement-projection-independently-v0.mjs` | **123/123 checks** |
| `verify-apnt-chunked-verifier-statement-binding-independently-v0.mjs` | **57/57 checks, 23/23 negatives** |
| `verify-apnt-noncustodial-spend-authority-proofs-independently-v0.mjs` | **81/81 checks, 22/22 negatives** |
| `verify-apnt-aggregate-settlement-chain-independently-v0.mjs` | **445/445 checks** |
| `packages/reference-aggregator/tools/verify-apnt-settlement-authorization-covenant-independently-v0.mjs` | **60/60 checks** |
| `verify-apnt-created-note-seal-independently-v0.mjs` | **60/60 checks** |
| `verify-apnt-created-note-seal-exit-branch-independently-v0.mjs` | **36/36 checks** |

Four of these were **failing before this campaign began**, at unmodified
`14fb141`, and that was measured rather than assumed: three of them
(`verify-apnt-settlement-authorization-covenant`,
`verify-apnt-aggregate-settlement-chain`, `verify-apnt-created-note-seal`) plus
`verify-apnt-transition-settlement-projection` were re-run against a stashed,
byte-clean `14fb141` tree and three of the four exited non-zero there. Two
distinct pre-existing causes, both now fixed:

1. **Stale hand-written statement parsers.** These tools re-parse `APNTTSV1`
   from the wire layout with no protocol-runtime codec — which is the point of
   them — so the 32-byte created-cell growth broke them, and it had to be
   taught to each one by hand rather than inherited.
2. **Stale pinned settlement projections.** All four canonical
   `settlementProjection32` values moved with the statement, and the tools pin
   them. They are re-pinned to the values this campaign's proofs actually
   commit, which are the same values the regenerated graph binds as its
   verdicts — the two derivations agree, which is the check that matters.

One check changed shape rather than value, and deliberately.
`packages/reference-aggregator/tools/verify-apnt-transition-settlement-projection-independently-v0.mjs`'s
`mutation:statement-commitment` check previously asserted that flipping the
statement commitment always moves the settlement projection. That is only true
when some output materializes the commitment into its locking bytecode, and
since the mandatory exit branch landed the two synthetic `private-split*` cases
have no such output: every created backing cell now projects a real 128-byte
seal, which is fully determined by `C_verifier`, `L_verdict` and
`sha256(E_i33)` and has no statement-commitment hole, and neither synthetic case
carries an aggregation boundary output. The check now **measures** how many
outputs materialize the commitment and asserts the implication in whichever
direction that count implies — moved if any, unchanged if none — so it still
fails closed in both directions instead of being weakened to a skip. Measured:
0 materializing outputs for both synthetic cases, 1 each for both live cases,
on their `TRANSITION_BOUNDARY` output at offset 162.

The canonical SP1 envelope is 356 bytes: a 4-byte wrapper-key prefix, three
32-byte public envelope fields, and 256 bytes of affine BN254 proof
coordinates. The five Groth16 public scalars and their labels are recorded in
each fixture.

Private proving inputs remain only in the sibling Rust-parity test fixture.
They are not embedded here, committed as public values, placed on chain, or
provided to an aggregator. That fixture regenerates byte-identically from the
TypeScript builders (`tools/apnt-private-note-transition-rust-parity/scripts/`
`generate-vectors.test.ts`), which was re-run and confirmed for this campaign.

What these fixtures now do establish, and only this: four real SP1 Groth16
proofs of the current transition relation exist, each natively verified before
its fixture was written, each committing a 210-byte `APNTPRR0` result whose
`settlementProjection32` is independently re-derivable from the statement it
claims to authorize, and each executing terminally through the committed,
statement-bound chunked CashVM verifier graph on the real BCH 2026 VM, producing
a verdict token that commits that statement's own `settlementProjection32` and
nothing else.

They still do not establish chain validation, APNT protocol acceptance, wallet
acceptance, note spendability, recursive aggregation, production privacy, or
live Chipnet execution. Nothing here has been broadcast.
