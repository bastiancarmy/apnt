/**
 * Maturity: preview — measured zero published importers and no published
 * artifact references it. Read it, don't build on it. See AGENTS.md, "The
 * maturity ladder".
 *
 * BCH 2026 consensus and standard-policy relay/mining limits this project's
 * byte-budget arithmetic depends on.
 *
 * These are protocol-defined ceilings, not APNT-defined ones — this module
 * exists purely to give the two call sites that used to restate them a single
 * shared, cited source of truth
 * (`openspec/changes/define-apnt-seal-native-import-settlement-v1/tasks.md`
 * task 1.4; `design.md` §2.2). Nothing in this file changes behaviour: every
 * value here is the same value the two former private copies carried.
 */

/**
 * Maximum standard (relay/mine) transaction size, in bytes. Unchanged by the
 * 2026-05 "Layla" upgrade. BCHN `src/policy/policy.h` `MAX_STANDARD_TX_SIZE`;
 * CHIP-2021-05 Targeted Virtual Machine Limits lists it explicitly unchanged.
 */
export const APNT_BCH_STANDARD_POLICY_LIMITS_V0_MAX_STANDARD_TX_SIZE = 100_000;

/**
 * Maximum consensus transaction size, in bytes. BCHN `src/consensus/consensus.h`
 * `MAX_TX_SIZE = ONE_MEGABYTE`.
 */
export const APNT_BCH_STANDARD_POLICY_LIMITS_V0_MAX_TX_SIZE = 1_000_000;

/**
 * Maximum locking bytecode length, in bytes, for a standard (relay/mine)
 * output. New in the 2026-05 "Layla" upgrade. CHIP-2024-12 Pay-to-Script
 * (P2S): "the locking bytecode of standard outputs must have a length less
 * than or equal to `201`".
 */
export const APNT_BCH_STANDARD_POLICY_LIMITS_V0_MAX_STANDARD_OUTPUT_LOCKING_BYTECODE_BYTES = 201;

/**
 * Maximum unlocking bytecode length, in bytes, for a standard (relay/mine)
 * input. Raised from 1,650 to 10,000 in the 2026-05 "Layla" upgrade.
 * CHIP-2024-12 Pay-to-Script (P2S) unifies the standard limit with the
 * consensus `MAX_SCRIPT_SIZE`.
 */
export const APNT_BCH_STANDARD_POLICY_LIMITS_V0_MAX_STANDARD_UNLOCKING_BYTECODE_BYTES = 10_000;

/**
 * Density-control base byte count added to an input's unlocking bytecode
 * length before pricing its operation-cost budget. Introduced in the 2025-05
 * upgrade. CHIP-2021-05 Targeted Virtual Machine Limits: density-control
 * length = `41 + unlocking_bytecode_length`.
 */
export const APNT_BCH_STANDARD_POLICY_LIMITS_V0_OPERATION_COST_DENSITY_CONTROL_BASE_BYTES = 41;

/**
 * Operation-cost budget units granted per density-control byte. Introduced in
 * the 2025-05 upgrade, replacing the prior 201-operation limit. CHIP-2021-05
 * Targeted Virtual Machine Limits.
 */
export const APNT_BCH_STANDARD_POLICY_LIMITS_V0_OPERATION_COST_BUDGET_PER_BYTE = 800;

/**
 * Per-input operation-cost budget: `(41 + unlockingBytecodeBytes) x 800`
 * (CHIP-2021-05 Targeted Virtual Machine Limits). Callers pass the input's
 * actual unlocking bytecode length; the density-control base and per-byte
 * budget are the two constants above, not restated inline.
 */
export function apntBchStandardPolicyOperationCostBudgetV0(unlockingBytecodeBytes: number): number {
  if (
    !Number.isSafeInteger(unlockingBytecodeBytes) ||
    unlockingBytecodeBytes < 0
  ) {
    throw new Error("unlockingBytecodeBytes must be a non-negative safe integer");
  }
  return (
    (unlockingBytecodeBytes +
      APNT_BCH_STANDARD_POLICY_LIMITS_V0_OPERATION_COST_DENSITY_CONTROL_BASE_BYTES) *
    APNT_BCH_STANDARD_POLICY_LIMITS_V0_OPERATION_COST_BUDGET_PER_BYTE
  );
}

/**
 * Absolute per-input operation-cost ceiling, at the maximum standard
 * unlocking bytecode length: `(41 + 10,000) x 800 = 8,032,800`.
 */
export const APNT_BCH_STANDARD_POLICY_LIMITS_V0_MAX_OPERATION_COST_PER_INPUT =
  apntBchStandardPolicyOperationCostBudgetV0(
    APNT_BCH_STANDARD_POLICY_LIMITS_V0_MAX_STANDARD_UNLOCKING_BYTECODE_BYTES,
  );
