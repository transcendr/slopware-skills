# CODER Loop role contracts

Use these contracts as prompt material. Adapt the wording to the task, but do
not omit facts the role needs to perform or prove its work.

## Coordinator

Keep the parent orchestration-only. Own the outcome, decomposition, sequencing,
candidate boundary, cross-family integration, acceptance decision, and final
delivery. Do not implement a task family or review your own implementation.

Before every dispatch, include the current repository state, relevant user
changes, exact authority, and the evidence that will prove the family. Do not
require an acknowledgment. The worker's substantive result is the response.

## Implementation worker

```text
Implement one bounded task family in the CODER Loop.

Overall outcome: [requested result]
Your task family: [coherent owned change]
Candidate boundary: [files, generated outputs, configuration, tests]
Retained behavior: [behavior that must survive]
Acceptance claims: [claims this family must settle]
Dependencies: [completed prerequisites and current evidence]
Exclusions: [adjacent work that remains out of scope]
Authority: [local edits, tests, commit, and external-write boundaries]
Repository state: [branch, head, user changes to preserve]

Implement and verify only this family. Preserve unrelated user changes. Return
the exact changed candidate, diff summary, commands and observations that prove
the acceptance claims, and any claim that remains open. Do not publish or
expand scope.
```

Keep related remediation with this worker when practical so the repair retains
implementation context. Send only admitted gaps and the evidence that made them
blocking.

## Independent reviewer

Start a fresh context that did not implement the candidate. Give it raw
artifacts and acceptance criteria, not the implementer's reasoning,
recommendation, or success claim.

```text
Review this CODER Loop candidate independently and read-only.

Decision: [candidate proposed for acceptance]
Complete candidate boundary: [every relevant source input]
Retained behavior: [approved behavior that must survive]
Acceptance claims: [claims required for acceptance]
Raw artifacts: [diff, files, tests, logs, screenshots, or other evidence]
Project priority policy: [authoritative policy, or none]
Authority: read-only; do not edit, commit, publish, or delegate.

Apply the CODER Loop review kernel. Admit an observation only when deleting it leaves
an acceptance claim unmet or unsupported. For each admitted gap, identify the
claim, belonging evidence, contract impact, and the smallest sufficient repair
direction. Separate acceptance-blocking gaps from non-blocking observations.
State that no blocking gap remains only when every live acceptance claim has
belonging evidence.
```

Do not ask the reviewer to implement a fix. Do not resume the implementer as
the reviewer. Do not contaminate a re-review with the previous reviewer's
conclusion; provide the changed candidate and still-live claims.

## Coordinator acceptance

After every family clears independent review, inspect the integrated candidate
and answer only these questions:

- Do the family candidates compose without conflict?
- Does each acceptance claim have current belonging evidence?
- Did any integration change invalidate earlier evidence?
- Does the final state remain inside scope and authority?

Accept or withhold. Do not create a second ceremonial review after those
questions are settled.
