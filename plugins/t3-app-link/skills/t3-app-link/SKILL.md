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
pointer to `questions`. Text arriving sooner is emitted immediately.

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
  description: "T3 worker events"
})
```

Each event is one line. Act on the notification. If Monitor ends or times out,
re-arm the same command with the same cursor; never start another watcher while
the first still owns it. When the host provides it, `t3_background_wait` marks
bounded Monitor work as awaited. Monitor's `timeout_ms` is optional; use an
explicit duration only when the task or tool contract supplies it.

Codex leads run this as a background shell command:

```bash
node "$TT" watch --tracked --expect '^RESULT ' --cursor /private/path/watch.json --until-event
```

Codex background command exits can wake an idle lead. `--until-event` prints the first QUESTION, APPROVAL,
RESULT, PAUSED or STALLED and exits. A busy Codex lead may receive the exit
notification late or fail to receive it at subsequent tool boundaries; this route
does not guarantee mid-turn delivery. Read it, act, then run the same command
again. For an authorised update to a busy lead, an active coordinator can use
native `t3_thread_send mode:steer`. The bundled `t3 thread send` only queues a new
turn, so the monitor does not offer an automatic CLI notification flag.
A thread with no saved cursor state starts at its first snapshot, without paging
older history. It reports currently pending questions and approvals, but no old
results or compactions. An idle baseline does not produce DONE or PAUSED; only a
run ending after watching begins can settle into one. `wait` still settles an
already-idle thread. RESULT detection waits for non-streaming message text.

Keep one watcher per cursor. The cursor retains unprinted events and reported
identities, so a re-arm continues without repeating reported events. Do not delete
or replace it during an assignment. Keep it private and out of Git.

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
| STARTED / COMPACTED / MAINTENANCE / DONE | Context about a run, compaction, structured maintenance or settled idle thread. |

`wait <name>` returns only after the thread stays idle for 45 seconds by default;
chained turns reset the settle window. `--until-question` also returns on a formal
question. With `--expect`, a final reply that does not match is `paused`, exit 6.
`watch --progress` also emits TURN_END and SILENT. `--silent SEC` defaults to
240 seconds, matching codex-progress.py; it warns once per quiet interval.
RESULT lines are excluded from NOTE. Compact details are limited to the same
2,000 characters as codex-app-link; `--json` retains all event fields.

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
`questions --all` before responding. `MAINTENANCE` uses the structured message field and requires
a patched T3 server. Never infer maintenance from configurable prose patterns.

For project-level management, read the adapted references as needed:

- [references/strategic.md](references/strategic.md): ownership, discovery and source authority.
- [references/operational.md](references/operational.md): commands, dispatch, waiting and verification.
- [references/companions.md](references/companions.md): optional MSW, MSL and Timebox use.
