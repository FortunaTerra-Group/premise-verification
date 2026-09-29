import { describe, expect, it } from 'vitest';
import { computeTotalTripMinutes } from '../src/trip-duration';
import { fetchLegMinutesSingle } from '../src/route-matrix-client';
import { Leg } from '../src/types';
import { assertPremiseVerified, PremiseReceipt } from '../src/premise-receipt';

function buildLegs(count: number): Leg[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `leg-${i}`,
    fromStopId: `stop-${i}`,
    toStopId: `stop-${i + 1}`,
  }));
}

async function expectedTotalMinutes(legs: Leg[]): Promise<number> {
  const minutes = await Promise.all(legs.map(fetchLegMinutesSingle));
  return minutes.reduce((sum, m) => sum + m, 0);
}

function validReceipt(overrides: Partial<PremiseReceipt> = {}): PremiseReceipt {
  return {
    path: 'trip-duration.computeTotalTripMinutes per-leg fan-out',
    measuredMs: 420,
    measuredAtPercentile: 'p95',
    isSerial: true,
    isOnCriticalPath: true,
    serialEvidence:
      'cold-start trace shows each single-leg call awaited before the next fires, zero overlap in the span timeline',
    predecessorLever: 'stop-cache prefetch ticket',
    predecessorGapReason:
      'that ticket cached stop metadata, not per-leg travel time; this fan-out was untouched by it',
    nonObviousJustification:
      'cold-start trace shows 30 sequential single-leg calls at roughly 140ms each on the critical path with no concurrency, measured on a real trace, not assumed from the call count',
    ...overrides,
  };
}

describe('Premise Verification fixed: no receipt', () => {
  it('falls back to the safe per-leg path and matches the total for a trip over the batch cap', async () => {
    const legs = buildLegs(30);
    const expected = await expectedTotalMinutes(legs);

    const actual = await computeTotalTripMinutes(legs);

    expect(actual).toBe(expected);
  });
});

describe('Premise Verification fixed: a fully verified receipt', () => {
  it('unlocks the batched path and still matches the total for a trip over the batch cap, chunked correctly', async () => {
    const legs = buildLegs(30);
    const expected = await expectedTotalMinutes(legs);

    const actual = await computeTotalTripMinutes(legs, validReceipt());

    expect(actual).toBe(expected);
  });
});

describe('Premise Verification fixed: the guard is actually wired into the batched path', () => {
  it('computeTotalTripMinutes rejects an unverified receipt before it ever calls the batched endpoint', async () => {
    const legs = buildLegs(5);

    await expect(computeTotalTripMinutes(legs, validReceipt({ isSerial: false }))).rejects.toThrow(/condition 2/);
  });
});

describe('assertPremiseVerified: each condition is independently enforced', () => {
  it('condition 1: rejects a missing measurement', () => {
    expect(() => assertPremiseVerified(validReceipt({ measuredMs: 0 }))).toThrow(/condition 1/);
  });

  it('condition 1: rejects an empty path', () => {
    expect(() => assertPremiseVerified(validReceipt({ path: '   ' }))).toThrow(/condition 1/);
  });

  it('condition 1: rejects a missing percentile', () => {
    expect(() => assertPremiseVerified(validReceipt({ measuredAtPercentile: '' }))).toThrow(/condition 1/);
  });

  it('condition 2: rejects a cost that is not serial', () => {
    expect(() => assertPremiseVerified(validReceipt({ isSerial: false }))).toThrow(/condition 2/);
  });

  it('condition 2: rejects a cost that is not on the critical path', () => {
    expect(() => assertPremiseVerified(validReceipt({ isOnCriticalPath: false }))).toThrow(/condition 2/);
  });

  it('condition 2: rejects a bare isSerial/isOnCriticalPath claim with no evidence', () => {
    expect(() => assertPremiseVerified(validReceipt({ serialEvidence: '' }))).toThrow(/condition 2/);
  });

  it('condition 2: rejects a stub serialEvidence that just restates the claim', () => {
    expect(() => assertPremiseVerified(validReceipt({ serialEvidence: 'obviously serial' })))
      .toThrow(/condition 2/);
  });

  it('condition 3: rejects a missing predecessor lever', () => {
    expect(() => assertPremiseVerified(validReceipt({ predecessorLever: '' }))).toThrow(/condition 3/);
  });

  it('condition 3: rejects a missing predecessor gap reason', () => {
    expect(() => assertPremiseVerified(validReceipt({ predecessorGapReason: '  ' }))).toThrow(/condition 3/);
  });

  it('condition 4: rejects an empty justification', () => {
    expect(() => assertPremiseVerified(validReceipt({ nonObviousJustification: '' }))).toThrow(/condition 4/);
  });

  it('condition 4: rejects a stub justification that just restates obviousness', () => {
    expect(() => assertPremiseVerified(validReceipt({ nonObviousJustification: 'obviously faster' })))
      .toThrow(/condition 4/);
  });
});

describe('route-matrix-client identifier safety', () => {
  it('rejects a leg id shaped like a query-injection attempt', async () => {
    const badLeg: Leg = { id: 'leg-1&admin=true', fromStopId: 'a', toStopId: 'b' };

    await expect(fetchLegMinutesSingle(badLeg)).rejects.toThrow(/leg.id must match/);
  });
});
