# Premise Verification

**Version 1.0 · Apache-2.0 · Copyright 2026 FortunaTerra Technologies Inc.**

Before you greenlight a latency or cost ticket framed as "collapse N calls into 1," "eliminate a
re-fetch," or "batch X," verify four conditions. If any one is unmet, the premise is unproven and
the ticket waits until a measurement exists.

This rule applies to any ticket that proposes removing a call, a round trip, or a fan-out on the
claim that doing so will make the system faster or cheaper.

## The four conditions

1. **A per-stage walltime receipt names the path being optimized.** A real measurement, on the
   target percentile, attributable to the named path. A receipt inherited from narrative ("this
   is obviously the slow part") is not a receipt.
2. **The named cost is serial and on the critical path.** Parallel calls, a cost hidden behind a
   longer concurrent stage, or a path that was already batched all make "fewer calls" a false win.
   The receipt must show the calls are both serial and actually on the wall, not just present in
   a trace.
3. **A predecessor ticket did not already collapse this.** Name the prior lever, and say exactly
   what target it missed and why the cost named in condition 1 survived it. "There's probably
   still a fan-out somewhere" is not an answer.
4. **The win does not feel obvious independent of measurement.** The more undeniable the framing
   sounds, the more measure-first discipline tends to loosen, and the more the receipt is
   required, not less.

A ticket citing "collapse N calls into 1" or an equivalent structural-collapse claim needs a
receipt satisfying all four in its header before it moves to implementation. No citation, no
green light.

## Massive Deviation Protocol (the sibling rule)

Premise Verification is the upstream half of a two-part discipline. This is the downstream half,
for when the implementation ships anyway and the result does not match the plan.

When an implemented change's measured result deviates massively from the hypothesis that
justified it (the direction flips, the result is 30% or more off, or an expected effect is
entirely absent), the response order is fixed:

1. **Stop.** Do not immediately reach for a different theory.
2. **Go deeper at the discovery layer.** Add raw logging, request/response capture, per-stage
   timing, until the deviation itself makes sense. Look before you theorize.
3. **Only then re-plan, revert, or pivot,** armed with what you actually found.

The forbidden pattern is: hypothesis fails, switch hypothesis, that fails too, switch again. Each
unexamined pivot doubles the search space and leaves the original failure unexplained. A small,
expected-noise deviation (a few percent, a known flaky run) is ordinary tuning and does not need
this; a flipped sign or a zeroed-out effect does.

## Why this exists

A routing-optimization ticket shipped twice against the same fictional trip-planning service,
under two different names, six weeks apart. The first version was titled "eliminate the post-plan
re-fetch." The second, after the first made things worse, was titled "collapse the per-leg
fan-out into one batched call." Both shipped pure regression: slower plans, more total network
cost, on the same cold-start benchmark both tickets claimed to fix.

Nobody had measured, before either ticket, whether the calls being removed were serial and on the
critical path. They were not. The real budget for a cold trip plan lived in an earlier
graph-construction stage neither ticket touched, and a prior ticket, three months before the
first of these two, had already batched the obvious fan-out; what was left was a handful of calls
that ran concurrently with a longer stage and cost nothing on the wall. Two cycles were spent
chasing a fix that felt too obvious to need a receipt, on a target that was never the bottleneck,
because the story ("fewer calls must be faster") was more available than the trace.

This is a genericized account for illustration. No production ticket ID, service name, or
incident report is reproduced here; the toy example in [`example/trip-batch-collapse/`](./example/trip-batch-collapse/)
reconstructs the same failure shape from scratch, as runnable code.

## The audit obligation

For a ticket proposing a structural collapse, before it is scheduled:

1. Ask for the walltime receipt naming the path. If none exists, the ticket is not ready; open an
   instrumentation task first, not the collapse itself.
2. Ask whether the named cost is serial and on the critical path in that receipt, specifically,
   not "probably" or "usually." A receipt that only shows the cost exists, without showing it is
   serial and on the wall, has not answered condition 2.
3. Ask which predecessor ticket already worked this area, and what it left behind. If nobody can
   name one, that is fine only if nobody can name one because there genuinely isn't one, not
   because nobody checked.
4. Ask, out loud, whether the fix would still be worth doing if it turned out to save nothing.
   If the answer is an uncomfortable "well, obviously it would help," that discomfort is the
   signal to require the receipt rather than skip it.

## How to adopt it

1. Add a required field to your ticket template for structural-collapse tickets: a link to the
   receipt, not a description of one.
2. In review, treat "this collapses N calls into 1" as a claim, not a fact, until the four
   conditions are each answered with something concrete: a number, a trace excerpt, a ticket ID,
   a written non-obviousness check.
3. Build the four conditions into code where you can, not just into review. The toy example
   below shows a guard function that refuses to let a collapsed code path run at all unless a
   receipt proving all four conditions is passed in.
4. Pair this with the Massive Deviation Protocol above. Premise Verification stops a bad ticket
   from shipping; Massive Deviation stops a shipped, bad result from turning into a second bad
   ticket.

## What this is not

Premise Verification does not forbid batching, caching, or removing real redundant work. Plenty
of collapse tickets are correct, and shipping them quickly once the receipt exists is the point.
It forbids shipping the collapse on the strength of the story alone, before anyone has measured
whether the story is true.

This rule was first written down at FortunaTerra as a perf-ticket gate, alongside the Massive
Deviation Protocol it pairs with. It gets its own repository because "fewer calls is obviously
faster" is a story general enough to recur in almost any system with a network hop in it: see
[`example/trip-batch-collapse/`](./example/trip-batch-collapse/) for a small one, reconstructed
from scratch, that you can run and watch fail.
