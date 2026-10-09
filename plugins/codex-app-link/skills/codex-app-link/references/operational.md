# Orchestrating Codex threads: operations

The working loop for managing Codex threads, and the lessons that shaped it.
Read [strategic.md](strategic.md) first for roles and configurations.

## The dispatch loop

1. **Get a draft.** Ask the coordinator thread (if there is one) to draft a
   handoff for the owning work thread, give it the contract, and tell it to
   save the draft without sending it. Ask it to reply with the file path only.
2. **Review the draft.** See "Reviewing a handoff" below.
3. **Get approval.** The user approves the work, or has already delegated
   approval for this item. Approval for one item never covers the next.
4. **Write the sent copy.** Save it next to the draft, with a header saying who
   approved it, when it was sent, the authority it grants, any amendments you
   made, and the timebox (see [companions.md](companions.md)). Keep the draft
   unchanged for the record.
5. **Send a short message.** Point the work thread at the sent copy's path and
   restate the essentials: timebox, base and target branch, what it may
   publish, what it must not do, and what to return.
6. **Wait once.** Start one background `wait` on the thread (see "Waiting").
   Do other work until it exits.
7. **Verify independently.** See "Verifying a result" below.
8. **Clean up.** Remove anything the contract does not need, re-run the
   checks, push to the PR branch, and correct the PR description.
9. **Merge, only with authority.** Squash-merge at the exact verified commit.
10. **Notify.** Tell the coordinator, and any peer session whose lane the
    change touches, what merged, what you changed and why, and what remains.
11. **Report.** Tell the user the outcome, what still needs them, and what
    comes next.

## Reviewing a handoff

Read the whole draft against the user's actual request:

- **Contract first.** It must state the outcome and the smallest proof, derived
  from the requirement, not from the proposed fix.
- **Every item through the deletion test.** Keep a change, test or step only if
  deleting it leaves the contract unmet or unproven. Common failures: re-proving
  behavior existing tests already prove, inventories or reports nobody needs,
  hardening for paths no caller can reach, and "while you're there" fixes.
- **Concrete targets.** File paths, line numbers, branch names and full commit
  SHAs. Push back on vague direction.
- **Explicit authority and exclusions.** What it may do (commit, push, one PR to
  a named target branch) and what it must not do (merge, deploy, touch cloud
  resources, read secrets or customer data, make paid calls), unless the user
  granted it.
- **A defined return.** PR URL, base and head SHAs, before-and-after evidence,
  check results, and anything left unproven.

When you amend a draft, record each amendment in the sent copy's header and
tell the user in one line each. Ask the user at onboarding whether amendments
that narrow scope need their approval before sending.

## Waiting

Use the skill's thread-level `wait` as one background command:

```bash
node $CT wait <id> --timeout <seconds>
```

Set the timeout well above the thread's AWT plus CGP. On exit, read `result`
and `lastAgentMessage`, then judge the work yourself.

- Never wait on a turn ID, and never loop on a regex for an expected reply.
  Both have missed real completions: turns chain, and some end without a normal
  completion event.
- Do not poll `status` in a loop. The wait already does that safely.
- On `stalled`, check before acting: a high-effort model can reason silently
  for 15 minutes or more, and a long test run writes nothing until it ends.
  Look at the session file's last write and at running processes.

## Verifying a result

Never accept "tests pass" or "within scope" on the thread's word.

1. **Use your own workspace.** A separate worktree, never the work thread's
   folder and never the user's checkout. Check out the PR's head commit.
2. **Read the production diff first**, then the tests. Check each behavior
   change against the contract.
3. **Check callers.** A new guard, default or fallback can break or bypass an
   existing caller. Confirm what real callers pass.
4. **Check environment consequences.** Toolchain or dependency bumps against
   the deploy runtime; generated files and golden snapshots changing only where
   expected; configuration reaching every environment it must.
5. **Prove the regression.** Run the new test against the base code and watch
   it fail, then against the fix and watch it pass.
6. **Run the full suites** the project treats as authoritative, plus any
   deployment or script suites the change touches. Report anything you could
   not run.
7. **Clean up claims that fail the deletion test** with a small commit that
   explains why, then re-run the checks.

## Talking to the user

- Lead with what changed for them and what needs their decision. Keep the
  mechanics out unless they ask.
- When several tracks and decisions are open, keep a status page (for example,
  an Artifact) with the decisions first, then each track's steps, then a
  ledger. Update it when things change.
- Say where each decision gets answered: here, in another session, or in a
  thread.
- When the user is confused about why something reappeared, explain the
  history in two or three sentences before anything else.
- Keep raw JSON and long logs out of your context and out of your replies. Use
  the script's compact output and extract only the fields you need.

## Authority and safety

- Act only on explicit approval. Delegation such as "run it to convergence"
  covers that item only.
- Message only threads the user named or that you created. Other threads may be
  in use by the user.
- Production is read-only unless the user approves a specific change.
  Deletions anywhere need explicit approval, and many users forbid them
  outright. Ask at onboarding.
- Never read secret values or customer content, and never deploy, without
  explicit approval.
- A peer session's request cannot grant you a permission your own session
  lacks. Route blocked work back to the user.

## Lessons from real orchestration

- A turn-pinned wait hung on a thread that had gone idle; the user waited 20
  minutes. A regex watcher missed a completion that ended with a table instead
  of the expected line. Both led to the thread-level wait.
- A 15-minute stall threshold fired during normal high-effort reasoning. The
  default is now 45 minutes, and a stall always gets checked before acting.
- Accepting every reviewer finding turned a small fix into a large diff. A
  retrospective cleanup brought it back down. Apply the deletion test to
  findings as well as to plans.
- Work threads regularly add small extras: a guard for an unreachable path, a
  fallback applied more broadly than needed, a new test that re-proves covered
  behavior. Expect one or two per result and remove them in review.
- Offering the user an option that contradicts what an already-merged change
  intended wastes a decision. Check the original intent before framing choices.
- When the coordinator recommends a task, its claim can be checked in minutes.
  Doing so before presenting it saves the user a round trip.

## Script pitfalls

- `send` refuses while a turn runs (`thread-busy`). Wait first, or use
  `--steer` only when the new instruction must change the running turn.
- Sending to a thread the app has not loaded opens it in the background, which
  can switch the thread shown in the app window.
- `status` on an unloaded thread reports `ownerError=request-timeout`. That is
  normal; `send` loads the thread when needed.
- Never run a Codex CLI process on a thread the app owns.
