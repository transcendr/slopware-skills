---
name: coder-loop
description: >-
  Run the Codex Optimized Development, Evaluation, and Remediation (CODER)
  Loop with an orchestration-only coordinator, non-overlapping task-family
  owners, fresh independent reviewers, evidence-scoped remediation, and final
  coordinator acceptance. Use in Codex when the user invokes the CODER Loop,
  asks to divide a complex change into bounded implementation families with
  independent reviewers, requests multi-agent implementation without
  overlapping ownership, or requires review and repair to repeat until every
  acceptance-blocking gap is independently rechecked. Do not trigger for an
  ordinary single-agent change, a review-only request, or a non-Codex host.
---

# CODER Loop

CODER stands for Codex Optimized Development, Evaluation, and Remediation. The
loop uses bounded task-family review to give complex implementation clear
ownership, independent evaluation, and evidence-scoped repair.

Turn a complex implementation into a small set of coherent ownership lanes,
then make every candidate earn acceptance in a fresh context. Keep the parent
as coordinator and final decision owner. Let workers implement, reviewers
review, and only admitted acceptance gaps create repair work.

Require Codex collaboration capabilities that can provide at least one
implementation subagent and one fresh review subagent. If either capability is
unavailable, state what is missing and stop without claiming that the CODER
Loop completed.

## Bind the decision

Before delegating, establish:

- the requested outcome;
- the complete candidate boundary, including source, tests, generated files,
  configuration, and relevant untracked files;
- the retained behavior that must survive;
- the smallest acceptance claims that prove the outcome;
- the current repository state and user changes that must be preserved;
- explicit scope, external-write, commit, and publication authority.

Ask only when a missing owner decision can materially change those facts. Do
not turn setup into a form, ledger, acknowledgment, or approval ritual.

## Decompose into task families

Define a task family as one coherent body of implementation with one owner,
one candidate boundary, and one proof surface. Group closely related work when
splitting it would create coordination without independent progress. Separate
work when ownership, dependencies, files, or proof can remain distinct.

- Give each family exactly one implementation owner.
- Prevent overlapping file or behavior ownership. Sequence families whose
  candidates can invalidate each other.
- Run families concurrently only when they are genuinely independent.
- Preserve related repairs with the original worker when practical.
- Use one family when the task does not justify more. The CODER Loop never invents agent
  count or parallelism.

## Use Codex collaboration

Read [references/codex.md](references/codex.md) before spawning. Keep the
current Codex task as the coordinator and use collaboration subagents for
ordinary implementation and independent review. At any point in the loop, when
a role must inherit completed task history through a fork and also use a
different model or reasoning effort, use the explicit two-step top-level task
route defined there. This rule applies to initial implementation, repair,
integration, or any other role for which both requirements are present.

Choose the minimum capable model and reasoning effort from the settings exposed
by the Codex route actually being used. For a collaboration subagent, use only
settings that its spawn capability accepts. For a top-level fork, use settings
that its first continuation accepts. Use a project or user model policy when
one exists. Otherwise prefer the inherited model and change it only when task
evidence shows that another capability or cost profile is needed. Never
hard-code a vendor lineup into the loop.

Classify a task only when the host exposes a meaningful model choice:

- **Mechanical:** an exact reproducer, bounded required change, no unresolved
  contract, design, ownership, or proof choice, and deterministic evidence.
- **Reasoning-required:** uncertainty remains in cause, semantics,
  architecture, implementation direction, ownership, or proof design.

Assign the minimum capable worker. A small diff alone does not make a task
mechanical. After review, classify a repair from the admitted gap rather than
reusing the original task label by habit.

## Run the implementation and review loop

For each task family:

1. Send the bounded contract from
   [references/role-contracts.md](references/role-contracts.md) to its worker.
2. Let the worker implement and verify the family. Collect the exact candidate,
   diff, and belonging evidence, not merely a success summary.
3. Freeze that candidate long enough to review it. Start a fresh reviewer that
   did not implement it and has not received the implementer's reasoning or
   conclusions.
4. Give the reviewer the decision, complete candidate boundary, retained
   behavior, acceptance claims, raw artifacts, and verification evidence.
5. Apply [references/review-kernel.md](references/review-kernel.md). Admit only
   observations whose deletion would leave an acceptance claim unmet or
   unsupported.
6. Return each admitted blocking gap to the family owner for the smallest
   sufficient repair. Do not turn optional improvements into repair work. If
   the repair requires a new inherited-history fork with different model or
   reasoning settings, apply the same two-step top-level task route.
7. Start another fresh review of the changed candidate. Reconsider only the
   acceptance claims the repair could affect.
8. Repeat while an acceptance-blocking gap remains. Stop and withhold
   acceptance when a live gap cannot be closed inside the user's scope or
   authority.

Do not assign the reviewer to repair its own findings. A reviewer can explain
evidence and contract impact, but the worker owns changes and the coordinator
owns acceptance.

## Preserve evidence across repairs

Treat review evidence as belonging to the candidate it observed. When the
candidate changes, invalidate only evidence for claims the change could affect.
Do not rerun unrelated review, discard still-belonging proof, or assume that a
changed test suite proves retained product behavior.

Use the contract to decide what remains live:

- A newly added file makes any earlier review that omitted it incomplete.
- A narrow source repair does not erase unrelated proof.
- A changed test can settle only the behavior it actually observes.
- A removed behavior does not remain an acceptance claim unless the approved
  contract retains it.

## Integrate and accept

Keep worker and reviewer reports as evidence, never as acceptance. Have the
coordinator inspect the integrated candidate, resolve cross-family conflicts,
confirm the required proof, and decide:

- **accept** when every live acceptance claim has belonging evidence; or
- **withhold** when at least one live claim remains unsettled.

Do not add an arbitrary review-round limit. Stop at the acceptance fixed point,
an explicit user stop, or a genuine blocker. Report the accepted result and
proof, or the exact open claim and authority needed to continue.

## Review the completed loop

After acceptance or a genuine terminal block, read
[references/postmortem.md](references/postmortem.md). Treat the postmortem as
routing calibration, not another candidate review or acceptance gate.

Assess whether each task family's classification and model assignment proved
sufficient, whether review or remediation changed that judgment, and whether
scope, evidence, authority, or an authoritative time constraint explains the
result better than model capability. Use the completed loop evidence and any
comparable records already authorized by the project.

Recommend at most one controlled mapping change, and only when repeated
comparable records show complete evidence, stable scope, and no
reasoning-required remediation. One successful assignment never lowers a
future default. Any recommendation applies only to the next comparable task
and preserves the same independent-review standard.

Do not create a mandatory `CODER_LEDGER.md` or other record merely to prove the
loop ran. If no comparable history exists, treat the completed loop as one
observation and make no mapping change.

## Preserve authority

Delegation never expands authority. Keep pushes, branch publication, pull or
merge requests, comments, approvals, merges, deployments, destructive actions,
and other external writes prohibited unless the user explicitly authorizes the
specific action. Preserve implementation, staging, commit, and publication as
separate boundaries.

Archive every temporary top-level Codex task that the CODER Loop created or
forked after its role is terminal and the coordinator has captured its result and evidence.
Never archive the coordinator, a pre-existing user task, a task still handling
repair, or a task waiting for user input.

Do not create a mandatory ledger, timer, hook, advisor pass, model roster, or
status ceremony. Apply another skill or project policy alongside the CODER Loop only when
the user or an authoritative project rule invokes it. A required advisor can
challenge the coordinator's judgment, but never replaces independent review or
the coordinator's final acceptance decision.

## Compose with Slopware skills

- Apply MSW, when available, to task-family admission, finding admission, and
  repair scope.
- Apply MSL, when available, to the final coordinator report after the complete
  evidence is known.
- Under Codex Voice Optimizer, run the CODER Loop inside an owning work task. Keep the
  voice coordinator limited to routing and user-facing synthesis.
