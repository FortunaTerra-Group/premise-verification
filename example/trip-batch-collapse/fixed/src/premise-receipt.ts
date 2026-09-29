/**
 * Structural gate for Premise Verification: a collapsed, batched code path
 * may not run unless a receipt proving all four conditions is supplied.
 * There is no way to bypass this from the caller other than not passing a
 * receipt at all, which falls back to the always-correct, never-collapsed
 * path (see trip-duration.ts).
 */
export interface PremiseReceipt {
  /** Condition 1: the exact path being optimized. */
  path: string;
  /** Condition 1: a real measured walltime for that path, in milliseconds. */
  measuredMs: number;
  /** Condition 1: the target percentile the measurement was taken at. */
  measuredAtPercentile: string;
  /** Condition 2: the named cost actually runs serially, not concurrently. */
  isSerial: boolean;
  /** Condition 2: the named cost is actually on the critical path. */
  isOnCriticalPath: boolean;
  /** Condition 3: the prior ticket or lever that was checked. */
  predecessorLever: string;
  /** Condition 3: what that predecessor lever missed, and why. */
  predecessorGapReason: string;
  /** Condition 4: real evidence the win isn't just assumed from its framing. */
  nonObviousJustification: string;
}

export class PremiseNotVerifiedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PremiseNotVerifiedError';
  }
}

// Justifications that only restate obviousness, with no measurement behind
// them, are exactly what condition 4 exists to reject.
const STUB_JUSTIFICATIONS = new Set(['obviously faster', 'clearly faster', 'obvious win', 'trust me']);

export function assertPremiseVerified(receipt: PremiseReceipt): void {
  if (!receipt.path.trim()) {
    throw new PremiseNotVerifiedError(
      'condition 1: receipt.path is empty; name the exact path being optimized',
    );
  }
  if (!Number.isFinite(receipt.measuredMs) || receipt.measuredMs <= 0) {
    throw new PremiseNotVerifiedError(
      'condition 1: receipt.measuredMs must be a real, positive measurement, not a guess',
    );
  }
  if (!receipt.measuredAtPercentile.trim()) {
    throw new PremiseNotVerifiedError(
      'condition 1: receipt.measuredAtPercentile is empty; tie the measurement to a target percentile',
    );
  }
  if (!receipt.isSerial || !receipt.isOnCriticalPath) {
    throw new PremiseNotVerifiedError(
      'condition 2: the named cost is not both serial and on the critical path; collapsing a parallel or shadowed cost is a false win',
    );
  }
  if (!receipt.predecessorLever.trim() || !receipt.predecessorGapReason.trim()) {
    throw new PremiseNotVerifiedError(
      'condition 3: name the predecessor lever that was checked and what it missed',
    );
  }
  const justification = receipt.nonObviousJustification.trim();
  if (!justification || STUB_JUSTIFICATIONS.has(justification.toLowerCase())) {
    throw new PremiseNotVerifiedError(
      'condition 4: nonObviousJustification is empty or a stub that restates obviousness instead of evidence',
    );
  }
}
