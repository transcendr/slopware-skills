# Workflow: Decision Walkthrough

Decision Walkthrough is a named, opt-in process for converging a planned slice
of work before implementation, when unresolved authority choices could
materially change its contract, API, scope, dependencies, or acceptance proof.
It closes those choices one at a time, by voice, with every decision framed
from evidence and every choice remaining the user's.

It is a process workflow, not a topology: it runs inside free-form
orchestration or Freeway alike. Under Freeway, it binds to whichever lane owns
the slice being converged.

## Invoke the walkthrough

Treat this as the canonical anchor:

> Start the decision walkthrough for this slice.

Recognize these continuations and natural equivalents:

- "Continue the decision walkthrough."
- "Frame the next genuine decision only."
- "Record that decision and continue."
- "Separate the required research from what I actually need to decide."
- "Resolve the remaining design or product forks before we implement."

Begin from the current planning, audit, or workstream context. Do not restart
completed discovery merely because the workflow was invoked.

Use the walkthrough only when different legitimate choices would materially
alter the next bounded implementation. Do not use it for ordinary
clarification, facts that can be established by research, review remediation,
or unrelated entries from a broader decision ledger.

## Keep the contract read-only

Close the minimum set of authority decisions necessary to make the next
bounded slice implementation-ready.

The walkthrough is read-only by default. Do not edit code or documentation,
change design sources, create branches or commits, publish, or make another
external write unless the user separately authorizes that mutation. A decision
authorizes the selected contract, not its implementation.

Do not activate implementation workers, reviewers, or other named protocols
unless the user independently invokes them or authorizes implementation.

## Preserve the interaction model

The walkthrough uses the optimizer's existing triangle; assign these
responsibilities when the coordinator and an owning work thread already exist:

- **The user — decision authority:** chooses, rejects, qualifies, or
  challenges the presented options. Never decide on their behalf.
- **Voice coordinator — facilitator:** maintains sequence, reads the actual
  owning thread for status, routes substantive research to it, relays
  evidence-backed checkpoints, and speaks one decision at a time in plain
  language per the base-layer register. Answers directly only when the
  established context already makes the answer unambiguous.
- **Owning work thread — evidence owner:** inspects the current repository,
  design sources, specifications, decision records, and other authoritative
  sources; separates research from authority; frames the next decision;
  validates corrections; and stops without making unapproved changes.

Do not create a new thread merely to reproduce this topology. When invoked
directly in an owning thread, perform the evidence and framing work there
while preserving the same separation between evidence, recommendation, and the
user's authority.

If the coordinator cannot read or message the owning thread, report that
limitation rather than inventing its state or substituting a substantive
assessment.

## Separate research from decisions

Build a private candidate ledger from the current plan and accepted decisions.
Admit a candidate only when leaving it unresolved could change the bounded
implementation contract or leave it unprovable.

Classify each candidate:

- **Research:** establish it from available authoritative evidence. Do not ask
  the user to choose a discoverable fact.
- **Authority decision:** present it only after the minimum sufficient
  research makes the actual alternatives and consequences clear.
- **Excluded:** remove it when it is already settled, speculative,
  non-blocking, outside the current slice, or inherited from an unrelated
  global ledger.

Order admitted decisions by dependency. Research the next one only; do not
front-load every later decision or expose the whole ledger unless the user
asks.

Distinguish explicitly:

- established facts from inferences;
- current source from historical snapshots;
- component contracts from instance overrides;
- authored behavior from examples or prototype affordances;
- implementation requirements from product-owned outcomes;
- blockers from qualified but non-blocking claims.

## Run one decision at a time

Have the owning thread return one concise decision packet:

```text
Decision
The single authority question.

Why now
The implementation contract this choice can change.

Research status
What was established, what remains genuinely unknown, and the exact source evidence.

Options
Mutually exclusive choices, each with its smallest implementation, API, testing,
delivery, and claim consequences.

Recommendation
The evidence-backed preference and the condition under which it holds.

Scope boundary
What this decision does not change, plus any separately deferred question.

State
No later decision advanced; no state changed unless separately authorized.
```

The coordinator presents the packet on both channels at once, without adding
a second decision: post the full packet inline in the chat pane (via the
inline route in [codex-app.md](../codex-app.md)) so the user can read it, and
simultaneously voice the compressed version in the base-layer register with
the options lettered — "A … B … C" — so the user can choose by ear with a
single letter. Never make the user ask for the visible packet. Let them
choose, ask for clarification, or challenge its premise.

After a choice, restate the accepted decision precisely. Keep adjacent
deferrals separate; for example, a display-value decision must not silently
decide later row navigation. Route the accepted wording back to the owning
thread for consequence validation before framing the next genuine decision.

## Correct challenged premises

Stay on the current decision when the user challenges its evidence,
terminology, ownership boundary, or inferred consequence.

Reinspect the narrow source that can settle the challenge. Then:

1. State what the source proves and what it does not prove.
2. Correct or retract the earlier claim explicitly.
3. Reframe the same decision if it still exists.
4. Remove or revise downstream candidates that depended on the incorrect
   premise.
5. Advance only after the current decision is stable.

Do not defend an earlier recommendation merely for conversational consistency.
Do not preserve a resolved topic as a future mandate when it entered through
scope leakage.

## Record decisions only when authorized

When the user authorizes documentation, amend the existing canonical
workstream record rather than creating a duplicate. Record:

- the settled or provisional wording;
- decisive evidence and source identifiers;
- immediate implementation consequences;
- explicit non-consequences and deferrals;
- remaining research prerequisites.

Treat provisional decisions as provisional. When later evidence supersedes
one, update the canonical record and every affected downstream statement.

Do not interpret "record that decision" as authorization to implement it,
change design sources, create git state, or publish.

## Stop at implementation readiness

Stop the walkthrough when:

- no unresolved authority choice can materially change the next bounded slice;
- remaining unknowns are named research prerequisites or non-blocking
  follow-ups;
- accepted decisions are recorded when authorized;
- the first minimum-sufficient implementation task, proof, dependencies, and
  exclusions are explicit.

Return a closure handoff containing:

- decisions closed;
- research still required, if any;
- non-blocking items intentionally excluded;
- the first bounded implementation task and acceptance evidence;
- the current authorization boundary.

Do not manufacture another decision because unresolved topics exist elsewhere.
Do not begin implementation without separate authorization.

## Use these routing prompts

Use or adapt these prompts when the coordinator routes walkthrough work to the
owning thread.

**Start**

> Run the decision walkthrough against the current slice context. Reconcile
> the actual work record, separate required research from genuine authority
> decisions, and frame the next genuine decision only with exact evidence,
> mutually exclusive options, consequences, and an evidence-backed
> recommendation. Remain read-only, send natural checkpoints, and do not
> advance a later decision.

**Continue after acceptance**

> The user accepted this decision: `<exact wording>`. Validate its immediate
> consequences and deferrals. Update the canonical record only if that
> documentation change is authorized, then frame the next genuine decision
> only. Do not implement.

**Challenge or correction**

> The user challenges `<specific premise>`. Reinspect the exact authoritative
> source, stay on this decision, distinguish what is proven from inferred, and
> explicitly correct any affected downstream framing. Do not advance or mutate
> state.

**Closure check**

> Determine whether any unresolved authority choice can still materially
> change the next bounded implementation contract. If none can, stop and
> return the implementation-readiness handoff instead of inventing another
> decision.
