# Example: batching a fan-out with no receipt (Premise Verification)

A small, runnable trip-planning scenario showing what Premise Verification catches, rather than
just describing it in prose.

> The code, the bug, and both test runs below are real and were actually executed.
> Model: Claude Sonnet 5. Date: 2026-09-29.

## The scenario

A trip planner computes the total travel time for a multi-stop road trip by calling a routing API
once per leg. A ticket comes in: "eliminate the per-leg fan-out, collapse N calls into 1 batched
matrix call." [`violation/src/trip-duration.ts`](./violation/src/trip-duration.ts) is that ticket,
shipped. It calls [`fetchBatchedMatrix`](./violation/src/route-matrix-client.ts) unconditionally,
on the unchecked assumption that the N calls it replaces are serial and that the batched endpoint
has no limits worth checking.

Neither assumption was measured. The previous per-leg calls were already issued with
`Promise.all`, i.e. already concurrent, so collapsing them saves nothing real on the wall. Worse,
the batched endpoint this toy models caps how many stops it accepts per request
(`MAX_BATCH_WAYPOINTS`, real endpoints of this shape commonly do this) and returns a silently
truncated result instead of an error. For a trip with fewer stops than the cap, the collapse looks
like a clean win in every demo. For a trip with more, the total quietly comes back short, because
the legs past the cap were dropped, not summed as zero, not errored, just missing.

[`fixed/src/trip-duration.ts`](./fixed/src/trip-duration.ts) keeps the safe per-leg path as the
default: call it with no receipt and you get the exact behavior the original, uncollapsed code
had, for any trip size. The batched path only runs if you pass a
[`PremiseReceipt`](./fixed/src/premise-receipt.ts) that
[`assertPremiseVerified`](./fixed/src/premise-receipt.ts) accepts, meaning all four conditions
from [`../../PREMISE-VERIFICATION.md`](../../PREMISE-VERIFICATION.md) are answered with real
values, not placeholders. And because verifying condition 1 means actually measuring the path,
the fixed version also chunks the batched calls at `MAX_BATCH_WAYPOINTS` instead of ignoring the
cap, so a large trip gets a correct total either way.

This is an original toy scenario built to demonstrate the failure class Premise Verification
names: an unmeasured "fewer calls is faster" assumption shipped as a structural collapse. It is
not a transcription of any one company's incident; see
[`../../PREMISE-VERIFICATION.md#why-this-exists`](../../PREMISE-VERIFICATION.md#why-this-exists)
for the genericized account this toy was built to illustrate.

## Which artifact this demonstrates

[Premise Verification](../../PREMISE-VERIFICATION.md): before a "collapse N calls into 1" ticket
ships, a receipt must prove the named cost is measured, serial, on the critical path, not already
collapsed by a predecessor, and not just assumed to be obviously right. `computeTotalTripMinutes`
in `violation/` answers none of those questions before calling the batched endpoint. The fixed
version cannot reach the batched endpoint at all without a receipt that answers all four.

## Running it

```sh
cd example/trip-batch-collapse
npm install
npm run test:violation   # RUN 1: the bug, reproduced
npm run test:fixed       # RUN 2: the fix, verified
npm test                 # both suites together
```

## What each run shows

- [`RUN-1-violation.md`](./RUN-1-violation.md): the collapse matches the correct total for a small
  trip, then silently returns a lower total than the correct one for a trip larger than the
  batch cap, in the same test file. Source:
  [`violation/src/trip-duration.ts`](./violation/src/trip-duration.ts),
  [`violation/src/route-matrix-client.ts`](./violation/src/route-matrix-client.ts), test at
  [`violation/test/premise-verification.test.ts`](./violation/test/premise-verification.test.ts).
- [`RUN-2-fixed.md`](./RUN-2-fixed.md): the same large trip now totals correctly with no receipt
  (safe fallback) and with a fully verified receipt (batched, chunked correctly). Nine more tests
  confirm each of the four conditions is independently enforced by `assertPremiseVerified`, and
  that a leg id shaped like a query-injection attempt is rejected before it reaches the routing
  client. Source: [`fixed/src/trip-duration.ts`](./fixed/src/trip-duration.ts),
  [`fixed/src/premise-receipt.ts`](./fixed/src/premise-receipt.ts), test at
  [`fixed/test/premise-verification.test.ts`](./fixed/test/premise-verification.test.ts).

Both `violation/` and `fixed/` stay in the repository side by side, on purpose: either one can be
run on its own at any time, so the violation is not just a claim about code that used to exist, it
is code you can still run and watch fail the same way today.
