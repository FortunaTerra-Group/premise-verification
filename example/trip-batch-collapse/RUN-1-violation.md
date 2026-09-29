# RUN 1: the violation, executed

Command:

```
npx vitest run violation
```

Working directory shown below as `<repo-root>/example/trip-batch-collapse`; that prefix is the
only thing normalized from the raw terminal capture, everything after it is unedited.

```
 RUN  v3.2.7 <repo-root>/example/trip-batch-collapse

 ❯ violation/test/premise-verification.test.ts (2 tests | 1 failed) 7ms
   ✓ Premise Verification violation: an unverified "collapse N calls into 1" ticket > matches the per-leg total for a small trip, inside the batch cap (looks like a clean win) 1ms
   × Premise Verification violation: an unverified "collapse N calls into 1" ticket > BUG: silently undercounts a trip over the batch cap, because nobody checked it 5ms
     → expected 535 to be 595 // Object.is equality

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


 Test Files  1 failed (1)
      Tests  1 failed | 1 passed (2)
   Start at  13:32:16
   Duration  267ms (transform 60ms, setup 0ms, collect 37ms, tests 7ms, environment 0ms, prepare 103ms)
```

Read the two results together, not separately:

- **The first test passes.** For a 10-leg trip, under `MAX_BATCH_WAYPOINTS` (25),
  [`computeTotalTripMinutes`](./violation/src/trip-duration.ts) matches the total you get from
  calling the routing API once per leg. If this were the only case anyone tried before shipping
  the ticket, "collapse N calls into 1" would look like a clean, free win.
- **The second test fails.** For a 30-leg trip, [`fetchBatchedMatrix`](./violation/src/route-matrix-client.ts)
  silently truncates to its first 25 legs, the way a real batched routing endpoint with a
  waypoint cap commonly does. Nothing throws, nothing logs a warning. The function just returns a
  total for 25 legs while claiming to have summed 30, and the 535-versus-595 gap is exactly the 5
  missing legs' travel time.

Nobody had a receipt showing the per-leg calls this ticket replaced were serial (they were issued
with `Promise.all`, i.e. already concurrent) or that the batched endpoint had a cap worth
checking against real trip sizes. Both facts are true at once: the collapse compiles, runs, and
looks correct on every small trip, and it is silently wrong on every large one. That gap between
"ran without error" and "computed the right number" is what Premise Verification is written to
catch before the ticket ships, not after.
