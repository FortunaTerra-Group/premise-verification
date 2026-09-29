import { Leg } from './types';
import { fetchBatchedMatrix, fetchLegMinutesSingle, MAX_BATCH_WAYPOINTS } from './route-matrix-client';
import { PremiseReceipt, assertPremiseVerified } from './premise-receipt';

/**
 * FIXED (Premise Verification): the per-leg fan-out the original ticket
 * wanted to collapse is the safe default below, and stays reachable with no
 * receipt at all. The batched path is only reachable by passing a receipt
 * that proves all four conditions, and once it is genuinely checked, the
 * waypoint cap that condition 1's measurement would have surfaced is
 * respected by chunking, instead of being silently ignored.
 */
export async function computeTotalTripMinutes(legs: Leg[], receipt?: PremiseReceipt): Promise<number> {
  if (receipt) {
    assertPremiseVerified(receipt);
    return sumViaBatchedChunks(legs);
  }
  return sumViaParallelSingleCalls(legs);
}

async function sumViaParallelSingleCalls(legs: Leg[]): Promise<number> {
  const minutes = await Promise.all(legs.map(fetchLegMinutesSingle));
  return minutes.reduce((sum, m) => sum + m, 0);
}

async function sumViaBatchedChunks(legs: Leg[]): Promise<number> {
  let total = 0;
  for (let i = 0; i < legs.length; i += MAX_BATCH_WAYPOINTS) {
    const chunk = legs.slice(i, i + MAX_BATCH_WAYPOINTS);
    const minutes = await fetchBatchedMatrix(chunk);
    total += minutes.reduce((sum, m) => sum + m, 0);
  }
  return total;
}
