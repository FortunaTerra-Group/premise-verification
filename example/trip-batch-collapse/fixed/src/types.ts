const SAFE_STOP_ID = /^[A-Za-z0-9_-]+$/;

/**
 * fromStopId/toStopId end up embedded in a query string to a routing API in
 * a real system. This toy always builds them from a hardcoded fixture
 * (`buildLegs` in the tests), so nothing here is exploitable as written. But
 * a real caller that let either originate from anything less trusted (a
 * user-entered stop name, an imported itinerary) would have a query-injection
 * bug if it copied this function without the check, so the check travels
 * with the pattern, not just the lesson.
 */
export function assertSafeStopId(value: string, what: string): void {
  if (!SAFE_STOP_ID.test(value)) {
    throw new Error(`${what} must match ${SAFE_STOP_ID}, got: ${JSON.stringify(value)}`);
  }
}

export interface Leg {
  id: string;
  fromStopId: string;
  toStopId: string;
}
