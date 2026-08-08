---
name: timebox
description: Run an authorized task inside an Available Work Time (AWT) window with a shorter Closeout Grace Period (CGP), fixed deadlines, forecast checks, proportional convergence points, and a hard stop. Use when the user explicitly requests timeboxing, supplies an AWT/CGP pair, says AWT or CGP, or an applicable project policy requires the protocol. Do not invent durations or activate timeboxing merely because a task may take time.
---

# Timebox: AWT/CGP Execution

Timeboxing is an outer time and convergence envelope around authorized work. It
does not add scope or replace the task's acceptance criteria.

AWT is the primary Available Work Time. Plan substantive work, verification,
organization, and delivery inside it. CGP is a shorter Closeout Grace Period
for an already-converged deliverable, an unexpectedly delayed final check,
narrow closeout organization, or communicating the result. CGP is never a
second work window.

## Activate only with authority

Use this protocol only when one of these conditions supplies authority:

- The requester explicitly asks for timeboxing.
- The requester supplies an AWT/CGP pair or names AWT or CGP.
- An applicable project policy requires the protocol.

Never infer a timebox from task size, urgency, or an estimate. Never invent a
duration.

## Establish the fixed clock

Accept any unambiguous duration units. Validate the supplied pair before doing
timeboxed work:

- `AWT > 0`
- `0 <= CGP < AWT`
- CGP is materially shorter than AWT and sized for closeout, not ordinary work.

When the context already establishes AWT/CGP, interpret shorthand such as
`30/10` as AWT 30 minutes and CGP 10 minutes. Do not create a confirmation loop
for clear shorthand. If either duration is missing, ambiguous, or inconsistent
with the two roles, ask the requester. Do not silently repair the pair.

Record a timezone-bearing original start and calculate:

```text
normal_deadline = original_start + AWT
hard_stop       = normal_deadline + CGP
```

The original clock never resets after a resume, compaction, monitor creation,
tool delay, or other interruption. If timeboxing begins after work has started,
use the actual start when it is established. Ask if the start is unresolved and
would materially change the deadlines.

## Pass the hard preflight gate

Every new timezone-bearing `original_start` requires a fresh, visible backward
plan. This applies when starting a new task, continuing under a
requester-authorized new AWT/CGP pair, or reusing an existing monitor. A prior
timebox's plan never carries forward.

After reading applicable instructions and doing only the minimum read-only
orientation needed to identify the task and monitor, emit one concise
commentary update containing all of the following:

1. the timezone-bearing `original_start`, calculated `normal_deadline`, and
   calculated `hard_stop`;
2. the requested outcome and smallest acceptance evidence;
3. the critical path, required work, and explicit exclusions; and
4. a backward schedule from `normal_deadline` through the 11/12, 75%, 50%, and
   25% convergence points, naming the latest acceptable tangible state at each
   point.

Emit this update before sending or rebinding an independent monitor and before
task-specific research, dependency resolution, implementation, builds, tests,
or mutation. Hidden reasoning, a forward task list, or prose that merely names
the next action does not satisfy the gate. If any field is absent, complete the
visible preflight before dispatching the monitor or starting execution.

After the preflight is visible, bind the monitor once for this timebox when one
is authorized, then execute immediately from the critical path and backward
schedule. Do not wait for monitor setup or acknowledgment. Plan substantive
work, verification, organization, and delivery inside AWT, with no ordinary
work in CGP.

This skill works alone. If the MSW skill is also installed or otherwise
required, use MSW to decide what work is necessary and this skill to govern how
that necessary work converges inside the authorized clock.

## Work and converge

Check the completion forecast before every major phase and at least every
`min(15 minutes, AWT / 8)`, adapting the check to very short work windows. A
forecast should answer only what changes execution:

- What required result and proof are complete?
- What required work remains?
- When will the task finish at the current trajectory?
- What is the leading risk to the normal deadline?
- What one adjustment is necessary now?

Use these latest-acceptable convergence points:

- At 25% of AWT, the contract, evidence, critical path, and exclusions are clear,
  and substantive work is underway.
- At 50%, recalculate from tangible progress and correct scope or sequence.
- At 75%, a tangible core deliverable exists, and speculative expansion has
  ended.
- At 11/12 of AWT, required work is converged, and final verification and
  delivery preparation dominate.
- At 100% of AWT, begin no new work.
- At AWT plus CGP, stop and report the strongest available result.

When the forecast misses the normal deadline, protect the contract, end
optional depth, simplify the route, and change the sequence immediately. Time
pressure does not authorize dropping a required acceptance criterion.

Keep forecast checks quiet unless they reveal a material correction, crossed
boundary, completion gap, or hard-stop risk. They exist to change decisions,
not to create status ceremony.

## Close out and stop

Enter CGP only for:

- an already-converged deliverable;
- an unexpectedly delayed final check;
- narrow closeout organization; or
- communicating the result.

During CGP, do not begin investigation, redesign, broad remediation, or other
ordinary work. Finish early when the contract is complete and proven. Do not
pad the task because time remains.

At the hard stop, stop all work and distinguish the result exactly:

- complete and verified;
- complete but unverified;
- incomplete; or
- unproven.

Report the outcome against the contract, the available proof, and any required
work still open. Never imply completion that the evidence does not support.

## Optional independent monitor

The normal experience is self-monitoring inside the working agent. Do not
simulate an external timer with shell sleeps, polling loops, daemons, browser
control, desktop control, repeated prompt injection, or a lifecycle hook.

Independent monitoring was designed first for the Codex app, whose separate
tasks, task reading and messaging, and same-task heartbeat provide the intended
topology. The same design can work in any harness that has an isolated observer,
a way to inspect the working task, a reliable recurring wake mechanism, and a
way to message the working task.

When the host has those capabilities and an independent monitor is authorized,
read [references/independent-monitor.md](references/independent-monitor.md).
Otherwise, use the self-monitoring workflow above and state once that
independent monitoring is unavailable.
