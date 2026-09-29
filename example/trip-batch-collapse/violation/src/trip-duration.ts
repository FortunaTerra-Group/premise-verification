import { Leg } from './types';
import { fetchBatchedMatrix } from './route-matrix-client';

/**
 * VIOLATION (Premise Verification): the ticket for this function read
 * "eliminate the per-leg fan-out, collapse N calls into 1 batched matrix
 * call." It shipped unconditionally. Nobody measured whether the N per-leg
 * calls it replaced were serial (the previous implementation issued them
 * with Promise.all, i.e. already concurrent) or on the critical path, and
 * nobody checked fetchBatchedMatrix's waypoint cap against real trip sizes.
 * For any trip under the cap this looks like a clean win in every demo. For
 * a trip over the cap, it silently drops the remaining legs from the total.
 */
export async function computeTotalTripMinutes(legs: Leg[]): Promise<number> {
  const minutes = await fetchBatchedMatrix(legs);
  return minutes.reduce((sum, m) => sum + m, 0);
}
