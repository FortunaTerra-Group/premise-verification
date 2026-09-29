# RUN 2: the fix, executed

Command:

```
npx vitest run fixed --reporter=verbose
```

Working directory shown below as `<repo-root>/example/trip-batch-collapse`; that prefix is the
only thing normalized from the raw terminal capture, everything after it is unedited.

```
 RUN  v3.2.7 <repo-root>/example/trip-batch-collapse

 ✓ fixed/test/premise-verification.test.ts > Premise Verification fixed: no receipt > falls back to the safe per-leg path and matches the total for a trip over the batch cap 2ms
 ✓ fixed/test/premise-verification.test.ts > Premise Verification fixed: a fully verified receipt > unlocks the batched path and still matches the total for a trip over the batch cap, chunked correctly 1ms
 ✓ fixed/test/premise-verification.test.ts > Premise Verification fixed: the guard is actually wired into the batched path > computeTotalTripMinutes rejects an unverified receipt before it ever calls the batched endpoint 2ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects a missing measurement 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects an empty path 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects a missing percentile 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a cost that is not serial 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a cost that is not on the critical path 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 3: rejects a missing predecessor lever 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 3: rejects a missing predecessor gap reason 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 4: rejects an empty justification 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 4: rejects a stub justification that just restates obviousness 0ms
 ✓ fixed/test/premise-verification.test.ts > route-matrix-client identifier safety > rejects a leg id shaped like a query-injection attempt 0ms

 Test Files  1 passed (1)
      Tests  13 passed (13)
   Start at  13:32:56
   Duration  245ms (transform 50ms, setup 0ms, collect 44ms, tests 8ms, environment 0ms, prepare 67ms)
```

[`fixed/src/trip-duration.ts`](./fixed/src/trip-duration.ts) is the only file whose *resolving*
logic differs from `violation/src/trip-duration.ts`. The routing client, the batch cap, and the
per-leg simulator are the same code in both, because the cap was never the bug; not checking it
was. With no receipt, `computeTotalTripMinutes` uses the exact per-leg fan-out the original ticket
wanted to remove, and gets the correct total for any trip size. With a receipt that
[`assertPremiseVerified`](./fixed/src/premise-receipt.ts) accepts, it uses the batched endpoint,
now chunked at `MAX_BATCH_WAYPOINTS` instead of truncated, and still gets the correct total for a
30-leg trip.

During review of the first version of this example, one gap surfaced: every "rejects condition
N" test called `assertPremiseVerified` directly, so none of them proved the guard was actually
wired into `computeTotalTripMinutes` itself. A test suite that only checks the guard function in
isolation, never the call site, is exactly the kind of test the guard exists to prevent someone
from getting away with. A new test, `computeTotalTripMinutes rejects an unverified receipt before
it ever calls the batched endpoint`, was added to close that gap before this file was finalized.

## RED: the guard disabled

With the guard call commented out in `fixed/src/trip-duration.ts`:

```ts
  if (receipt) {
    // TEMPORARILY DISABLED for RED proof, see RUN-2-fixed.md
    // assertPremiseVerified(receipt);
    return sumViaBatchedChunks(legs);
  }
```

```
npx vitest run fixed --reporter=verbose
```

```
 RUN  v3.2.7 <repo-root>/example/trip-batch-collapse

 ✓ fixed/test/premise-verification.test.ts > Premise Verification fixed: no receipt > falls back to the safe per-leg path and matches the total for a trip over the batch cap 2ms
 ✓ fixed/test/premise-verification.test.ts > Premise Verification fixed: a fully verified receipt > unlocks the batched path and still matches the total for a trip over the batch cap, chunked correctly 0ms
 × fixed/test/premise-verification.test.ts > Premise Verification fixed: the guard is actually wired into the batched path > computeTotalTripMinutes rejects an unverified receipt before it ever calls the batched endpoint 8ms
   → promise resolved "85" instead of rejecting
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects a missing measurement 1ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects an empty path 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects a missing percentile 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a cost that is not serial 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a cost that is not on the critical path 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 3: rejects a missing predecessor lever 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 3: rejects a missing predecessor gap reason 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 4: rejects an empty justification 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 4: rejects a stub justification that just restates obviousness 0ms
 ✓ fixed/test/premise-verification.test.ts > route-matrix-client identifier safety > rejects a leg id shaped like a query-injection attempt 0ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  fixed/test/premise-verification.test.ts > Premise Verification fixed: the guard is actually wired into the batched path > computeTotalTripMinutes rejects an unverified receipt before it ever calls the batched endpoint
AssertionError: promise resolved "85" instead of rejecting

- Expected:
Error {
  "message": "rejected promise",
}

+ Received:
85

 ❯ fixed/test/premise-verification.test.ts:62:82
     60|     const legs = buildLegs(5);
     61|
     62|     await expect(computeTotalTripMinutes(legs, validReceipt({ isSerial…
       |                                                                                  ^
     63|   });
     64| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 12 passed (13)
   Start at  13:33:05
   Duration  271ms (transform 56ms, setup 0ms, collect 53ms, tests 16ms, environment 0ms, prepare 78ms)
```

Exactly one test goes red: the one that exercises the wiring between `computeTotalTripMinutes`
and the guard. The other twelve stay green for the right reason, not because they missed the
bug: the two condition-1 and no-receipt tests never pass an invalid receipt through
`computeTotalTripMinutes`, the nine `assertPremiseVerified` tests call the guard function
directly and it was never touched, and the identifier-safety test exercises a completely
unrelated code path. The one failure confirms the wiring assertion is load-bearing, not a
tautology: it can only pass when `computeTotalTripMinutes` genuinely calls the guard before
using the batched path.

## GREEN: the guard restored

The guard call was restored and the full suite, both `violation/` and `fixed/`, rerun together:

```
npx vitest run --reporter=verbose
```

```
 RUN  v3.2.7 <repo-root>/example/trip-batch-collapse

 ✓ violation/test/premise-verification.test.ts > Premise Verification violation: an unverified "collapse N calls into 1" ticket > matches the per-leg total for a small trip, inside the batch cap (looks like a clean win) 1ms
 × violation/test/premise-verification.test.ts > Premise Verification violation: an unverified "collapse N calls into 1" ticket > BUG: silently undercounts a trip over the batch cap, because nobody checked it 5ms
   → expected 535 to be 595 // Object.is equality
 ✓ fixed/test/premise-verification.test.ts > Premise Verification fixed: no receipt > falls back to the safe per-leg path and matches the total for a trip over the batch cap 2ms
 ✓ fixed/test/premise-verification.test.ts > Premise Verification fixed: a fully verified receipt > unlocks the batched path and still matches the total for a trip over the batch cap, chunked correctly 0ms
 ✓ fixed/test/premise-verification.test.ts > Premise Verification fixed: the guard is actually wired into the batched path > computeTotalTripMinutes rejects an unverified receipt before it ever calls the batched endpoint 2ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects a missing measurement 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects an empty path 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects a missing percentile 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a cost that is not serial 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a cost that is not on the critical path 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 3: rejects a missing predecessor lever 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 3: rejects a missing predecessor gap reason 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 4: rejects an empty justification 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 4: rejects a stub justification that just restates obviousness 0ms
 ✓ fixed/test/premise-verification.test.ts > route-matrix-client identifier safety > rejects a leg id shaped like a query-injection attempt 0ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  violation/test/premise-verification.test.ts > Premise Verification violation: an unverified "collapse N calls into 1" ticket > BUG: silently undercounts a trip over the batch cap, because nobody checked it
AssertionError: expected 535 to be 595 // Object.is equality

- Expected
+ Received

- 595
+ 535

 ❯ violation/test/premise-verification.test.ts:35:20
     33|     const actual = await computeTotalTripMinutes(legs);
     34|
     35|     expect(actual).toBe(expected);
       |                    ^
     36|   });
     37| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 14 passed (15)
   Start at  13:33:14
   Duration  258ms (transform 66ms, setup 0ms, collect 77ms, tests 16ms, environment 0ms, prepare 131ms)
```

`violation/` still fails the same way it always did (the truncation bug was never touched) and
`fixed/` is fully green, 13 of 13, run side by side in one invocation. The two states coexist in
the repository on purpose, the same way they do in `chop`'s own `example/multiple-masters/` and
`reader-rule`'s `example/fragment-fanout/`.
