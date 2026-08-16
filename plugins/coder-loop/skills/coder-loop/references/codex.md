# Run the CODER Loop in Codex

Use Codex collaboration subagents as the standard internal role mechanism.
Keep the current task as coordinator and final acceptance owner.

## Select the collaboration context

Choose the route from the role's context and independence requirements:

- Use `fork_turns: "all"` when a worker, repair owner, or integration role
  needs the coordinator history and should inherit the coordinator's model and
  reasoning effort.
- Use `fork_turns: "99"` with explicit `model` and `reasoning_effort` when a
  worker, repair owner, or integration role needs inherited working context
  and a different execution profile.
- Use `fork_turns: "none"` for an independent reviewer. Select the reviewer's
  model and reasoning effort explicitly when the review requires a different
  profile.

The inherited-context override convention is:

```yaml
fork_turns: "99"
model: <selected model>
reasoning_effort: <selected effort>
```

Set both execution fields when changing the profile. Always include the
complete bounded role contract in the spawn message. History supplies context;
the role contract supplies ownership, candidate boundary, proof, and authority.

## Spawn implementation workers

- Give each worker one coherent task family. Because Codex subagents share the
  workspace, run overlapping or dependent edits sequentially. Parallelize only
  candidates that cannot overwrite or invalidate each other.
- Keep the coordinator out of implementation. It may inspect candidate
  composition, route any required integration change to a bounded owner, and
  make the final integration decision after review.

Do not apply a model override by habit. Prefer the inherited model unless the
user, project policy, or measured task requirements establish another choice.

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

If no fresh collaboration slot is available, state that the CODER Loop cannot
run in the current task and stop without claiming completion. Do not create a
top-level reviewer task or substitute self-review unless the user explicitly
asks for that separate fallback.

## Use a top-level task only for lifecycle needs

Never create or fork a top-level Codex task unless the user explicitly
authorizes that task action. A lifecycle need identifies a possible fallback;
it does not authorize one.

With that authority, use a top-level task only when the role needs a capability
the collaboration route does not provide, such as:

- independent user-visible addressability or a lifecycle that must outlive the
  coordinator;
- placement in a specific project or isolated worktree;
- exact source-task history beyond the selected bounded collaboration context.

When a top-level fork is necessary and the role also needs a different model or
reasoning effort:

1. Fork the source task into the required project, directory, or worktree.
2. Send the first continuation with the explicit model, reasoning effort, and
   complete bounded role contract.
3. Wait for the result, capture its candidate and evidence, and resume the
   normal CODER step.

If the source task is currently handling an unfinished user turn, include every
still-active instruction from that turn in the continuation. Do not use a
top-level task merely to change a worker's model or reasoning effort.

Without explicit create or fork authority, continue through collaboration
subagents when they can still meet the contract. Otherwise report the exact
lifecycle capability that remains unavailable and request the required
authority.

## Archive temporary top-level fallback tasks

When the CODER Loop was explicitly authorized to create or fork a top-level
Codex task for a fallback role, archive it after all of these conditions hold:

- the role has reached a terminal result;
- the coordinator has captured the result, candidate, and relevant evidence;
- no repair continuation or user answer is still expected in that task.

This applies to temporary implementation, repair, integration, and separately
authorized top-level review tasks. It does not apply to the coordinator or to a
pre-existing user task that the CODER Loop merely routed work into. Do not
archive a task that is active, waiting for user input, or still owns an
unresolved repair.

Use the Codex task-archive capability for cleanup. If it is unavailable, report
the unarchived temporary task as a cleanup residual. Missing cleanup does not
turn valid candidate evidence into a failed implementation result.
