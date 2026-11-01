---
name: t3-app-link
description: Monitor Codex and Claude work threads inside T3 through a read-only CLI, with formal questions, RESULT detection, settling, stalls and resumable multi-thread watches. Use when managing T3 threads; use native T3 tools to dispatch or answer them.
---

# T3 App Link

Coming from codex-app-link:

| Existing command | In T3 |
| --- | --- |
| `send`, `send --queue`, `send --steer` | `t3_thread_send`, mode `auto`, `queue`, `steer` |
| `new`, `queue`, `interrupt`, `access` | `t3_thread_launch`, `t3_queue`, `t3_thread_interrupt`, `t3_thread_configure` |
| Answer a formal question | `t3_pending_request`, action `respond` |
| `status`, `read`, `list`, `wait`, `questions`, `result`, `track`, `rules`, `version` | Same verbs in `scripts/t3-thread.mjs` |
| `watch`, progress script | `watch`, `watch --progress` |

The CLI only monitors. Its dispatch verbs print a native tool call and exit 2.
No token with write access is needed. T3 is the only thread-data source.

Resolve `TT` from this installed skill's directory each session:

```bash
TT=<skill-base-dir>/scripts/t3-thread.mjs
node "$TT" setup
node "$TT" version
```

Setup reuses the private read-only token, or issues one through T3's bundled CLI.
It reads the current origin from T3's runtime file. Requirements and installation
are in the plugin README; commands and exits are in
[references/operational.md](references/operational.md).

## Dispatch and track

Use `t3_thread_launch` for a new thread, or `t3_thread_send` for an authorized
existing thread. New work for a busy thread uses mode `queue`; mode `steer` supplies
answers or corrections for its current work. Formal questions use
`t3_pending_request respond`, not an inferred shared reply. Approvals need the user
in T3; the monitor cannot approve them.

T3's tools may load late: load one by name before deciding it is missing. In
`modelSelection`, the Claude provider instance is `claudeAgent`, not `claude`.
`orchestrator_capabilities` lists instances and models.

To answer, take the full request ID and answer keys from `questions <thread>`, then
call `t3_pending_request` with `action: "respond"`, `threadId`, `requestId` and
`answers` as `{ "<key>": "<answer>" }`. The key is the question's `id` for Codex
and its question text for Claude; `questions` prints it either way.

To check a worker's files, `status <thread>` prints its `workspace` when it has its own
worktree or scratch folder; a thread on the project root has none. Stop the watcher
before archiving threads it tracks; otherwise each archive prints `MISSING`.

Give the worker its outcome, evidence, authority and any authorized timebox.
Ask it to finish with `RESULT key=value …`. Mention it using the native tool's
returned `link`.

```bash
node "$TT" track add <id> --name worker --role implementation
node "$TT" watch --tracked --expect '^RESULT ' --cursor /private/path/watch.json
```

The registry is `<git-root>/.t3-app-link.json`, or `--registry FILE` /
`T3_APP_LINK_REGISTRY`. All thread arguments accept its names. It is separate
from `.codex-app-link.json`; thread IDs do not cross systems. `environmentId`
can bind the registry or individual entries to the expected T3 environment.
Watch lines use a stable hashed request handle; `questions` prints its full ID.
Question text normally arrives with the next stream item. If absent, it is held
for one watch polling interval (five seconds by default), then emitted with a
pointer to `questions`. Continuous watches emit text as soon as it arrives; the Codex exit hold below
controls when an until-event process prints and exits.

The CLI refuses self-tracking when `T3CODE_THREAD_ID`, `T3_THREAD_ID` or
`T3_APP_LINK_SELF` identifies the lead; set `T3_APP_LINK_SELF` if the host does not
supply its T3 thread ID.

## Wake and re-arm

Claude leads use the Monitor tool, which wakes the lead on each output line. A
background Bash command wakes only on exit. Use this exact tool shape, replacing
the paths with the installed skill and private cursor paths:

```javascript
Monitor({
  command: "node /installed/t3-app-link/scripts/t3-thread.mjs watch --tracked --expect '^RESULT ' --cursor /private/path/watch.json --progress",
  description: "T3 worker events",
  timeout_ms: 1800000
})
```

Each event is one line. Act on the notification. If Monitor ends or times out,
re-arm the same command with the same cursor; never start another watcher while
the first still owns it. When the host provides it, `t3_background_wait` marks
bounded Monitor work as awaited. Pass `timeout_ms` where the host's Monitor tool
requires it; its 30-minute cap means a re-arm on each expiry.

Codex leads choose the exit-hold route for a wake after their turn, or a sentinel
when they must receive events while working.

For the exit-hold route, identify the lead before starting the watcher. T3 may
supply `T3CODE_THREAD_ID`; the live Codex probe had neither self-ID variable.
If it is absent, copy the lead's ID from its T3 link or launch result and set:

```bash
export T3_APP_LINK_SELF='your-lead-thread-id'
node "$TT" watch --tracked --expect '^RESULT ' --cursor /private/path/watch.json --until-event
```

Run this as a background shell command, then end the lead turn when its current
work is complete. An actionable event is kept in the cursor, with no further
output, while the Codex run active at watch startup is still active. The watcher
prints the event and exits after that run ends. This makes its command completion
eligible for T3's new-run notification instead of losing a same-turn completion.
If the watcher was armed in an earlier turn, it exits immediately on the event;
T3 queues its wake until the currently busy turn ends. Both cases were proven.
The exit hold does not wake or end a working lead's current turn.

When the wake arrives, read the event, check current question state, act through
native tools, and re-arm with the same cursor. `--until-event` exits 5 on QUESTION,
0 on RESULT or APPROVAL, 6 on PAUSED, and 3 on STALLED. If neither self-ID variable
is set, stderr warns once and the watcher retains immediate-exit behaviour; a
same-turn completion can then be lost. Continuous Claude Monitor watches have
no exit hold. A selected event can keep an exit-hold process alive past its
search timeout until the launching lead run ends.

### Sentinel for a busy Codex lead

Create an authorised `claude-haiku-5-5` thread with native `t3_thread_launch`,
using its own scratch workspace. Give it the lead's thread ID, installed script
path, worker-only registry, expectation and a private cursor. Do not track the
lead or sentinel. Give it this recipe, substituting those values:

```text
Call Monitor({command:"node /installed/t3-app-link/scripts/t3-thread.mjs watch --tracked --registry /private/workers.json --expect '^RESULT ' --cursor /private/sentinel.json",description:"T3 worker events"}).
Do not use --until-event. On each QUESTION, APPROVAL, RESULT, PAUSED or STALLED
line, call t3_thread_send with threadId=<lead ID>, mode="auto", and message equal
to the original complete stdout line, unchanged. Monitor's XML wrapper may
escape <, > and &; decode that transport layer once to restore the original
line. Forward every actionable line in a burst, one call per line. Decide
nothing, read no files or threads, answer nothing, and send nowhere else.
Ignore other event kinds. End the current turn after arming or forwarding.
Re-arm the identical Monitor only when it ends, retaining the cursor.
```

`auto` steers the active lead run or starts an idle lead. The sentinel carries no
CLI write token: its native T3 tools send the authorised update. A busy lead
acts at its next model/tool boundary, using `questions` to obtain full IDs and
answer keys before `t3_pending_request respond`. One long foreground command
can delay that boundary until it returns; steering does not interrupt it.

The live Codex lead received a question in 5.204 seconds and its worker RESULT
in 5.113 seconds, answered formally, and stayed in one run. Idle receipt took
3.869 seconds. A five-line burst arrived intact within one lead run. These are
observations, not delivery deadlines. Cost: one small sentinel turn per event
notification, plus one per Monitor expiry. Non-actionable STARTED lines can also
wake the sentinel; coalesced bursts can share a turn. Each actionable line still
needs one native send. Archive the authorised sentinel when its assignment ends.

A thread with no saved cursor state starts at its first snapshot, without paging
older history. It reports currently pending questions and approvals, but no old
results or compactions. An idle baseline does not produce DONE or PAUSED; only a
run ending after watching begins can settle into one. `wait` still settles an
already-idle thread. RESULT detection waits for non-streaming message text.

Keep one watcher per cursor. The cursor retains unprinted events and recent
reported identities, so a re-arm continues without repeating reported events. Do
not delete or replace it during an assignment. Keep it private and out of Git.

A cursor has a fixed limit for each thread, whatever the thread's age: 16 runs,
8 assistant messages, 16 requests, 32 items, 32 nodes, 8 provider threads, 8
provider sessions, 64 held events, 64 recovery anchors and 256 reported keys, with
4 KiB of text per record. Expect about 30 KB per thread. It also keeps 16 threads
the current watch does not follow. A reported key that ages out raises a time
floor, so older records stay silent. A version 1 cursor migrates on load. Held
events beyond 64 are dropped oldest-first, non-actionable first, and OVERFLOW
reports the count. Event text and `wait` replies stop at 4 KiB; use `read` for a
full reply.

| Event | Required response |
| --- | --- |
| QUESTION | Run `questions <name>` for the full requestId and exact answer keys, check that it is pending, then use `t3_pending_request respond`. Claude keys are question text; Codex keys are question IDs. Copy the printed `answers` shape. |
| APPROVAL | Ask the user to review the permission request in T3. |
| RESULT | Read the full reply and parsed `result`, then verify the claims. A RESULT may arrive mid-turn. |
| PAUSED | The settle window ended without the expected final reply. Read it and resume unfinished work with `t3_thread_send`. |
| STALLED | Inspect T3 activity before acting. Long reasoning or commands may be silent. |
| MISSING / FOUND | The thread disappeared, disconnected or returned. Confirm current T3 state before dispatching. |
| HISTORY_START | No held item was found while recovering a gap; recovery reached the start of available history. |
| UNPARSED | The stream contains an unknown event. Read the thread; monitoring may be incomplete. |
| OVERFLOW | Held events were dropped to keep the cursor bounded. Read the thread for what they covered. |
| STARTED / COMPACTED / MAINTENANCE / DONE | Context about a run, compaction, structured maintenance or settled idle thread. |

`wait <name>` returns only after the thread stays idle for 45 seconds by default;
chained turns reset the settle window. `--until-question` also returns on a formal
question. With `--expect`, a final reply that does not match is `paused`, exit 6.
`watch --progress` also emits TURN_END and SILENT. `--silent SEC` defaults to
240 seconds, matching codex-progress.py; it warns once per quiet interval.
RESULT lines are excluded from NOTE. Compact details are limited to the same
2,000 characters as codex-app-link; `--json` retains all event fields, with text
limited to 4 KiB per event.

Defaults match codex-app-link: settle 45 seconds, stall 2700 seconds, timeout
10800 seconds. A stall means no detailed thread event, not proof of a dead worker. The line
identifies a command/tool T3 reports as running, pending input or background work
when present. A running command may itself be hung. Inspect native activity.

## Authority and evidence

Message only threads you created or the user explicitly authorized. Monitoring
never grants permission to dispatch, merge, publish or deploy. Do not run another
provider CLI against a T3-owned thread. Use T3 links and tools.

On re-arm, small stream gaps replay by sequence. Large gaps receive a bounded snapshot;
the monitor walks older history back to the first item held in its cursor,
reporting only newer rows. If no held item is found, it recovers to the start and
prints HISTORY_START. T3 coalesces updates, so
monitoring reports changes in recoverable state rather than promising every
transient transition. Questions answered during the gap can be recovered as
`status=resolved`; replay can also report their earlier pending state. Check
`questions --all` before responding. Still-pending requests tied to terminal runs are stale:
they do not count as pending or wake the lead, and appear as STALE only in
`questions --all`, including old approvals. `MAINTENANCE` uses the structured message field and requires
a patched T3 server. Never infer maintenance from configurable prose patterns.

For project-level management, read the adapted references as needed:

- [references/strategic.md](references/strategic.md): ownership, discovery and source authority.
- [references/operational.md](references/operational.md): commands, dispatch, waiting and verification.
- [references/companions.md](references/companions.md): optional MSW, MSL and Timebox use.
