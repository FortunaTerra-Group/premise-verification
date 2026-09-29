import { Leg, assertSafeStopId } from './types';

/**
 * The real routing-matrix endpoint this stands in for caps the number of
 * stops it will accept in a single request. Real endpoints of this shape
 * commonly do this and return a partial, silently truncated result rather
 * than an error, which is the whole point of this toy: the ticket that
 * reaches for the batched endpoint never checked this cap against real trip
 * sizes.
 */
export const MAX_BATCH_WAYPOINTS = 25;

function simulatedLegMinutes(leg: Leg): number {
  assertSafeStopId(leg.id, 'leg.id');
  assertSafeStopId(leg.fromStopId, 'leg.fromStopId');
  assertSafeStopId(leg.toStopId, 'leg.toStopId');
  // Stand-in for a real routing call: a deterministic function of the leg id
  // so tests can compute an expected total without depending on this module.
  let charSum = 0;
  for (let i = 0; i < leg.id.length; i++) {
    charSum += leg.id.charCodeAt(i);
  }
  return 10 + (charSum % 20); // 10-29 minutes, deterministic per leg id
}

export async function fetchLegMinutesSingle(leg: Leg): Promise<number> {
  return simulatedLegMinutes(leg);
}

export async function fetchBatchedMatrix(legs: Leg[]): Promise<number[]> {
  const capped = legs.slice(0, MAX_BATCH_WAYPOINTS);
  return capped.map(simulatedLegMinutes);
}
