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
 ✓ fixed/test/premise-verification.test.ts > Premise Verification fixed: a fully verified receipt > unlocks the batched path and still matches the total for a trip over the batch cap, chunked correctly 0ms
 ✓ fixed/test/premise-verification.test.ts > Premise Verification fixed: the guard is actually wired into the batched path > computeTotalTripMinutes rejects an unverified receipt before it ever calls the batched endpoint 1ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects a missing measurement 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects an empty path 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects a missing percentile 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a cost that is not serial 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a cost that is not on the critical path 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a bare isSerial/isOnCriticalPath claim with no evidence 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a stub serialEvidence that just restates the claim 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 3: rejects a missing predecessor lever 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 3: rejects a missing predecessor gap reason 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 4: rejects an empty justification 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 4: rejects a stub justification that just restates obviousness 0ms
 ✓ fixed/test/premise-verification.test.ts > route-matrix-client identifier safety > rejects a leg id shaped like a query-injection attempt 0ms

 Test Files  1 passed (1)
      Tests  15 passed (15)
   Start at  13:39:56
   Duration  248ms (transform 47ms, setup 0ms, collect 44ms, tests 8ms, environment 0ms, prepare 66ms)
```

[`fixed/src/trip-duration.ts`](./fixed/src/trip-duration.ts) is the only file whose *resolving*
logic differs from `violation/src/trip-duration.ts`. The routing client, the batch cap, and the
per-leg simulator are the same code in both, because the cap was never the bug; not checking it
was. With no receipt, `computeTotalTripMinutes` uses the exact per-leg fan-out the original ticket
wanted to remove, and gets the correct total for any trip size. With a receipt that
[`assertPremiseVerified`](./fixed/src/premise-receipt.ts) accepts, it uses the batched endpoint,
now chunked at `MAX_BATCH_WAYPOINTS` instead of truncated, and still gets the correct total for a
30-leg trip.

During review of the first version of this example, two gaps surfaced. The first: every "rejects
condition N" test called `assertPremiseVerified` directly, so none of them proved the guard was
actually wired into `computeTotalTripMinutes` itself. A test suite that only checks the guard
function in isolation, never the call site, is exactly the kind of test the guard exists to
prevent someone from getting away with. A new test, `computeTotalTripMinutes rejects an
unverified receipt before it ever calls the batched endpoint`, was added to close that gap before
this file was finalized.

The second, found in the same review: condition 2 was enforced as two bare booleans
(`isSerial`, `isOnCriticalPath`) with no accompanying evidence, while conditions 1, 3, and 4 all
require specific, non-stub free text. A caller could satisfy the exact condition this scenario's
bug hinges on by writing `isSerial: true` with nothing behind it. `PremiseReceipt` gained a
required `serialEvidence` field, validated the same way `predecessorGapReason` and
`nonObviousJustification` are: non-empty, and rejected if it matches a stub set
(`obviously serial`, `seems serial`, `probably serial`, `trust me`). Two new tests were added for
it, shown in the RED/GREEN run below.

## RED: the wiring check disabled

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

 ✓ fixed/test/premise-verification.test.ts > Premise Verification fixed: no receipt > falls back to the safe per-leg path and matches the total for a trip over the batch cap 1ms
 ✓ fixed/test/premise-verification.test.ts > Premise Verification fixed: a fully verified receipt > unlocks the batched path and still matches the total for a trip over the batch cap, chunked correctly 0ms
 × fixed/test/premise-verification.test.ts > Premise Verification fixed: the guard is actually wired into the batched path > computeTotalTripMinutes rejects an unverified receipt before it ever calls the batched endpoint 5ms
   → promise resolved "85" instead of rejecting
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects a missing measurement 1ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects an empty path 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects a missing percentile 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a cost that is not serial 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a cost that is not on the critical path 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a bare isSerial/isOnCriticalPath claim with no evidence 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a stub serialEvidence that just restates the claim 0ms
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

 ❯ fixed/test/premise-verification.test.ts:64:82
     62|     const legs = buildLegs(5);
     63|
     64|     await expect(computeTotalTripMinutes(legs, validReceipt({ isSerial…
       |                                                                                  ^
     65|   });
     66| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 14 passed (15)
   Start at  13:42:15
   Duration  237ms (transform 45ms, setup 0ms, collect 41ms, tests 12ms, environment 0ms, prepare 62ms)
```

Exactly one test goes red: the one that exercises the wiring between `computeTotalTripMinutes`
and the guard. The other fourteen stay green for the right reason, not because they missed the
bug: the two condition-1 and no-receipt tests never pass an invalid receipt through
`computeTotalTripMinutes`, the eleven `assertPremiseVerified` tests call the guard function
directly and it was never touched, and the identifier-safety test exercises a completely
unrelated code path. The one failure confirms the wiring assertion is load-bearing, not a
tautology: it can only pass when `computeTotalTripMinutes` genuinely calls the guard before
using the batched path.

## RED: the condition-2 evidence check disabled

With the `serialEvidence` check commented out in `fixed/src/premise-receipt.ts`, leaving the bare
`isSerial`/`isOnCriticalPath` booleans as the only condition-2 check:

```
npx vitest run fixed --reporter=verbose
```

```
 RUN  v3.2.7 <repo-root>/example/trip-batch-collapse

 ✓ fixed/test/premise-verification.test.ts > Premise Verification fixed: no receipt > falls back to the safe per-leg path and matches the total for a trip over the batch cap 1ms
 ✓ fixed/test/premise-verification.test.ts > Premise Verification fixed: a fully verified receipt > unlocks the batched path and still matches the total for a trip over the batch cap, chunked correctly 0ms
 ✓ fixed/test/premise-verification.test.ts > Premise Verification fixed: the guard is actually wired into the batched path > computeTotalTripMinutes rejects an unverified receipt before it ever calls the batched endpoint 1ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects a missing measurement 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects an empty path 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects a missing percentile 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a cost that is not serial 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a cost that is not on the critical path 0ms
 × fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a bare isSerial/isOnCriticalPath claim with no evidence 5ms
   → expected [Function] to throw an error
 × fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a stub serialEvidence that just restates the claim 1ms
   → expected [Function] to throw an error
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 3: rejects a missing predecessor lever 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 3: rejects a missing predecessor gap reason 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 4: rejects an empty justification 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 4: rejects a stub justification that just restates obviousness 0ms
 ✓ fixed/test/premise-verification.test.ts > route-matrix-client identifier safety > rejects a leg id shaped like a query-injection attempt 0ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a bare isSerial/isOnCriticalPath claim with no evidence
AssertionError: expected [Function] to throw an error

- Expected: 
null

+ Received: 
undefined

 ❯ fixed/test/premise-verification.test.ts:90:79
     88| 
     89|   it('condition 2: rejects a bare isSerial/isOnCriticalPath claim with…
     90|     expect(() => assertPremiseVerified(validReceipt({ serialEvidence: …
       |                                                                               ^
     91|   });
     92| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a stub serialEvidence that just restates the claim
AssertionError: expected [Function] to throw an error

- Expected: 
null

+ Received: 
undefined

 ❯ fixed/test/premise-verification.test.ts:95:8
     93|   it('condition 2: rejects a stub serialEvidence that just restates th…
     94|     expect(() => assertPremiseVerified(validReceipt({ serialEvidence: …
     95|       .toThrow(/condition 2/);
       |        ^
     96|   });
     97| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  1 failed (1)
      Tests  2 failed | 13 passed (15)
   Start at  13:40:03
   Duration  258ms (transform 45ms, setup 0ms, collect 45ms, tests 12ms, environment 0ms, prepare 68ms)
```

Exactly the two new tests go red, nothing else moves: the bare-boolean condition-2 tests still
pass because `isSerial`/`isOnCriticalPath` were untouched, and every other condition's tests call
paths this change never touched. This confirms `serialEvidence` is checked because the code
checks it, not because the test happens to pass regardless.

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
 ✓ fixed/test/premise-verification.test.ts > Premise Verification fixed: no receipt > falls back to the safe per-leg path and matches the total for a trip over the batch cap 1ms
 ✓ fixed/test/premise-verification.test.ts > Premise Verification fixed: a fully verified receipt > unlocks the batched path and still matches the total for a trip over the batch cap, chunked correctly 0ms
 ✓ fixed/test/premise-verification.test.ts > Premise Verification fixed: the guard is actually wired into the batched path > computeTotalTripMinutes rejects an unverified receipt before it ever calls the batched endpoint 1ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects a missing measurement 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects an empty path 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 1: rejects a missing percentile 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a cost that is not serial 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a cost that is not on the critical path 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a bare isSerial/isOnCriticalPath claim with no evidence 0ms
 ✓ fixed/test/premise-verification.test.ts > assertPremiseVerified: each condition is independently enforced > condition 2: rejects a stub serialEvidence that just restates the claim 0ms
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
      Tests  1 failed | 16 passed (17)
   Start at  13:40:08
   Duration  220ms (transform 60ms, setup 0ms, collect 76ms, tests 14ms, environment 0ms, prepare 122ms)
```

`violation/` still fails the same way it always did (the truncation bug was never touched) and
`fixed/` is fully green, 15 of 15, run side by side in one invocation. The two states coexist in
the repository on purpose, the same way they do in `chop`'s own `example/multiple-masters/` and
`reader-rule`'s `example/fragment-fanout/`.
