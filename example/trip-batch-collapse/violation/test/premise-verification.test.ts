import { describe, expect, it } from 'vitest';
import { computeTotalTripMinutes } from '../src/trip-duration';
import { fetchLegMinutesSingle } from '../src/route-matrix-client';
import { Leg } from '../src/types';

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

describe('Premise Verification violation: an unverified "collapse N calls into 1" ticket', () => {
  it('matches the per-leg total for a small trip, inside the batch cap (looks like a clean win)', async () => {
    const legs = buildLegs(10);
    const expected = await expectedTotalMinutes(legs);

    const actual = await computeTotalTripMinutes(legs);

    expect(actual).toBe(expected);
  });

  it('BUG: silently undercounts a trip over the batch cap, because nobody checked it', async () => {
    const legs = buildLegs(30); // MAX_BATCH_WAYPOINTS is 25
    const expected = await expectedTotalMinutes(legs);

    const actual = await computeTotalTripMinutes(legs);

    expect(actual).toBe(expected);
  });
});
