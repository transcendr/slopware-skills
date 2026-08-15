# Run the CODER Loop in Codex

Use Codex collaboration subagents when they are available. Keep the current
task as coordinator and final acceptance owner.

## Spawn implementation workers

- Use `fork_turns: "all"` when the active coordinator model is appropriate and
  the worker needs the complete conversation. Append the bounded worker
  contract even though history is inherited.
- Give each worker one coherent task family. Because Codex subagents share the
  workspace, run overlapping or dependent edits sequentially. Parallelize only
  candidates that cannot overwrite or invalidate each other.
- Keep the coordinator out of implementation. It may inspect and integrate the
  resulting candidate after workers finish.

Do not apply a model override by habit. Prefer the inherited model unless the
user, project policy, or measured task requirements establish another choice.

## Fork with a model or reasoning change

This rule is loop-wide. Whenever a CODER Loop role must both inherit the completed
history of an existing Codex task through a fork and run with a different
model or reasoning effort, perform two explicit Codex operations:

1. Fork the source task with the Codex task-fork capability. Use the same
   directory when the new role should share the checkout, or a worktree when
   its bounded task requires isolation.
2. Send the first continuation to the forked task with the explicit model and
   reasoning effort plus the complete bounded role contract. The fork copies
   history; the continuation applies the new execution settings.
3. Wait for the top-level task result and continue the normal review,
   remediation, integration, or acceptance step that requested it.

Apply this route to initial implementation, a newly forked repair or
integration role, and any other loop step where inherited history and changed
execution settings coincide. Do not attempt to combine `fork_turns: "all"`
with a model or reasoning override in one collaboration-subagent call. Do not
claim that the fork operation itself selected the new settings.

The fork contains completed history only. If the coordinator is currently
handling a user turn, include every still-active instruction from that turn in
the first worker continuation because unfinished source-task content is not
copied.

Do not create a new projectless task or manually replay the full conversation
when this fork-and-continue route is available. Do not use this route merely to
choose a different model when inherited execution already meets the task.

## Spawn independent reviewers

- Use `fork_turns: "none"` so the reviewer receives no implementer or
  coordinator conclusions.
- When a fresh reviewer needs a different model or reasoning effort, select it
  directly while starting the context-clean reviewer. Do not fork an existing
  coordinator or worker task because independent review must not inherit that
  task's reasoning.
- Supply the exact candidate, retained behavior, acceptance claims, raw diff,
  and verification evidence in the review prompt.
- Keep the reviewer read-only. Do not let it repair its own findings.
- Start another fresh reviewer after a repair. Never use a full-history fork
  for independent review.

Wait for the assigned workers and reviewers, then make the acceptance decision
in the coordinator. A subagent result is evidence, not acceptance.

If no fresh collaboration slot is available, state that the CODER Loop cannot run in the
current task and stop without claiming completion. Do not create a top-level
reviewer task or substitute self-review unless the user explicitly asks for
that separate fallback.

## Archive temporary top-level tasks

When the CODER Loop creates or forks a top-level Codex task for any loop role, archive it
after all of these conditions hold:

- the role has reached a terminal result;
- the coordinator has captured the result, candidate, and relevant evidence;
- no repair continuation or user answer is still expected in that task.

This applies to temporary implementation, repair, integration, and separately
authorized top-level review tasks. It does not apply to the coordinator or to a
pre-existing user task that the CODER Loop merely routed work into. Do not archive a task
that is active, waiting for user input, or still owns an unresolved repair.

Use the Codex task-archive capability for cleanup. If it is unavailable, report
the unarchived temporary task as a cleanup residual. Missing cleanup does not
turn valid candidate evidence into a failed implementation result.
