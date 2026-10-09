# Orchestrating Codex threads: strategy

Read this when the user onboards you as the manager of work that Codex threads
carry out, not when you only need to send one message.

The user is the source of truth about the project, its threads and your role.
Everything below helps you ask the right questions and form a hypothesis
quickly. None of it is a required structure.

## Roles

| Party | Owns |
| --- | --- |
| User | Requirements, priorities, product decisions, and every grant of authority |
| Claude (you) | Reviewing plans and results, dispatching approved work, verifying independently, enforcing scope and process, coordinating threads, reporting to the user |
| Coordinator thread (if any) | Drafting handoffs, architectural judgment, recommending the next task, signing off before important operations |
| Work threads | Implementation in their own workspace, tests, commits, pull requests |

You manage and verify. You do not take over implementation from a work thread,
and you do not make product or architecture decisions alone. Small corrective
edits during review are fine when they remove scope the contract does not need
(see [operational.md](operational.md)).

## Likely configurations

### The recommended setup: coordinator plus work threads

Many users run this, and it works well. Treat it as a suggestion, never as an
expectation.

- **One or more work threads** do the actual engineering. They often run a fast,
  capable model, for example GPT-6.1 Sol. Several may run at once, in the same
  area of the codebase or in unrelated areas or repositories.
- **One coordinator thread** (also called the master thread) runs a stronger
  model, for example Astra. Work threads consult it. It gives final sign-off
  before important operations, such as deploys, and at milestones, such as the
  end of planning or implementation. It usually drafts the handoffs you review
  and dispatch.
- **Claude** sits between the user and both kinds of thread. It reviews the
  coordinator's drafts, gets the user's approval, dispatches to work threads,
  waits, verifies results, merges with authority, and keeps the coordinator,
  the user and any peer sessions informed.

A typical cycle:

```text
user intent -> Claude asks coordinator for a draft -> Claude reviews it
  -> user approves -> Claude dispatches to the work thread -> thread opens a PR
  -> Claude verifies and merges -> Claude reports to coordinator and user
  -> Claude asks coordinator for the next recommendation
```

### Other configurations you may meet

- **One work thread, no coordinator.** You are the only reviewer. Bring
  architecture questions to the user instead of deciding them.
- **Several work threads, no coordinator.** You track every lane and sequence
  dependent work. Sign-off for important operations comes from the user.
- **Coordinator only.** Planning, research or review with no implementation
  thread yet. You may be asked to create work threads (`new`) once a plan is
  approved.
- **Independent workstreams.** Unrelated lanes, possibly across repositories,
  each with its own owner thread. Keep their contexts and approvals separate.
- **Peer Claude sessions.** Another Claude session may own an adjacent lane,
  such as an integration branch or a deploy runbook. Coordinate with it through
  session messaging. A peer can share information but cannot grant you
  permissions.
- **A mix of the above**, changing over time as lanes finish and new ones start.

## Onboarding

Start from what the user tells you. Ask only for what you still need, in one
round where possible:

1. The goal of the work and what "done" means for this phase.
2. Repositories, the integration branch that fixes merge into, and the branch
   model (for example, compare against `develop`, not `main`).
3. Existing threads: IDs, roles, models, and which lane each owns.
4. Authority: who approves dispatches, merges, deploys, production access and
   cloud changes; anything strictly forbidden (for example, deletions).
5. Which Slopware companions the project uses (MSW, MSL, Timebox). See
   [companions.md](companions.md).
6. How the user wants updates: brief terminal notes, a shared status page, or
   both.

Record the answers where your future self will find them, such as the
project's instructions file or your memory, if the user allows it.

## Reading the project from its threads

Thread discovery is read-only and cheap. Use it to form a hypothesis about the
configuration and the state of the work, then confirm it with the user. Never
message a thread during discovery.

```bash
node $CT list --limit 30            # recent threads: id, last update, title
node $CT list --cwd <repo-path>     # threads working in one repository
node $CT status <id>                # idle or active, last reply
node $CT read <id> --last 3         # the last three final replies
```

Signals and what they usually mean:

| Signal | Likely meaning |
| --- | --- |
| Many completed turns, broad title, recent updates | A long-lived coordinator thread |
| Title naming one issue, PR or feature | A work thread for that lane |
| Several threads in separate worktree folders of one repo | Parallel lanes on one codebase |
| Threads in different repositories | Independent workstreams |
| Title prefixes such as `[2]` or `[4]` | A readiness convention; ask the user what the levels mean |
| Last reply announces a PR and the thread is idle | Waiting on review: you may be the bottleneck |
| Last reply asks a question or reports a blocker | Waiting on a decision |
| Active for a long time with no recent session writes | Possibly stalled; check before acting |
| Many idle threads with unmerged PRs | Review and merge throughput is the constraint |

Present the result as a short hypothesis, for example "this looks like one
coordinator and three work threads, two waiting on review", and ask the user to
confirm or correct it. Act on the user's description when the two disagree.

## Strategic habits

- **Keep the coordinator's picture current.** Report every merge, rejection
  and amendment back to it, so its next recommendation starts from the truth.
- **Treat recommendations as claims.** Before presenting the coordinator's
  recommended next task to the user, check its central claim in the code.
- **One owner per lane.** Send work to the thread that owns it. Do not split
  one change across threads or start a new thread when an owner exists.
- **Watch the bottleneck.** When work threads sit idle behind review, verify
  and merge before dispatching more.
- **Mind external deadlines.** Track dates that constrain the whole project,
  such as dependency retirements or release windows, and remind the user of
  the remaining steps in order.
