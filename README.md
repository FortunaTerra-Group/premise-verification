# Premise Verification

**Fewer calls is not automatically faster. Measure before you collapse.**

> Free standard, Apache-2.0. The rule, the audit obligation, and the Massive Deviation sibling
> rule are in [`PREMISE-VERIFICATION.md`](./PREMISE-VERIFICATION.md); a real, runnable
> violation-and-fix pair is in [`example/trip-batch-collapse/`](./example/trip-batch-collapse/).
> Drop the rule into whatever file your coding agents read. The rest of this page is why it
> exists.

---

A perf ticket comes in shaped like this: "we're making N separate calls where one batched call
would do; collapse them." The framing is intuitively correct often enough that reviewers wave it
through on the framing alone. Sometimes the N calls really were serial, really were on the
critical path, and really had never been touched before, and the collapse is a clean win. Other
times the N calls were already running concurrently, so removing them saves nothing on the wall;
or the real cost lived somewhere else entirely and the ticket just moves work around; or a prior
ticket already batched the obvious target and what's left is cheap. None of those three cases
look any different from the outside, in the ticket description, before anyone has measured
anything.

The ticket ships anyway, because "fewer calls" sounds obviously true, and obvious things don't
feel like they need a receipt. Then the benchmark comes back worse, and the postmortem calls it a
regression, which is true and also not the interesting part. The interesting part is that the
question the fix depended on, was the removed cost actually serial and on the critical path, was
never asked before the code was written, only after it made things worse.

## The rule

Before a "collapse N calls into 1" ticket is scheduled, verify: a real walltime receipt names the
path, the cost is serial and on the critical path (not parallel, not shadowed, not already
batched), a predecessor optimization did not already collapse it, and the win does not just feel
obvious. Full statement, the audit obligation, and the Massive Deviation Protocol it pairs with:
[`PREMISE-VERIFICATION.md`](./PREMISE-VERIFICATION.md).

## Why this is easy to miss

"We removed calls and it's faster" is a satisfying story to tell in a standup, and satisfying
stories get waved through review faster than dull ones. Asking for a receipt before the collapse
ships produces no visible progress on its own: no line goes down, no metric moves, nothing to
point at except a trace nobody looked at yet. Every incentive in a fast-moving sprint rewards
shipping the obvious-sounding fix and rewards it again if the metric happens to move for an
unrelated reason before anyone checks. The rule exists because "obviously faster" and "measurably
faster" are different claims, and only one of them is actually about the system.

## Examples

[`example/trip-batch-collapse/`](./example/trip-batch-collapse/) is a small, runnable toy: a
trip-planner ticket collapses a per-leg travel-time fan-out into one batched routing call, on the
assumption that the calls it replaces are serial and that the batched endpoint has no limits
worth checking. Neither assumption was measured. `RUN-1-violation.md` shows the collapse working
fine on a small trip and silently under-counting a large one, because the batched endpoint caps
how many stops it accepts per call and nobody checked. `RUN-2-fixed.md` shows the same suite green
once the collapsed path is gated behind a guard that refuses to run unless a receipt proves all
four conditions, and even then respects the cap instead of ignoring it. Both directories stay in
the repository side by side; either can be run on its own, any time.

## Provenance and license

This rule and its Massive Deviation sibling were written at FortunaTerra as a gate for
latency and cost tickets, after the incident genericized in
[`PREMISE-VERIFICATION.md`](./PREMISE-VERIFICATION.md#why-this-exists). Copyright 2026
FortunaTerra Technologies Inc. Written and maintained by Vivek Iyer
([FortunaTerra-Group](https://github.com/FortunaTerra-Group)). Released under
[Apache-2.0](./LICENSE). Issues and pull requests are welcome; the bar for changing the rule is a
concrete case where all four conditions were checked and the rule still let a regression through.
