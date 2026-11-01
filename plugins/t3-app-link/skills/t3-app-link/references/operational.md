# T3 thread operations

Adapted from codex-app-link's operational reference at `3372f52`.

## Command reference

Run `node "$TT" <command>`. Thread arguments accept IDs or registry names.
Output is compact text; `--json` preserves structured fields. Errors are JSON on
stderr with exit 1. Dispatch redirects and usage errors exit 2.

| Command | Behavior |
| --- | --- |
| `setup` | Reuse the private token or issue `orchestration:read` through the bundled T3 CLI. Store it 0600; renew when its recorded expiry has passed. |
| `status <thread>` | Active/idle state, latest run, pending requests and last assistant message. |
| `read <thread> --last N` | Replies from the last N turns, default 1. |
| `list --limit N --cwd DIR` | Recent threads, default 10; optional workspace filter. |
| `wait <thread>` | Wait for continuous thread idleness. `--settle 45`, `--stall 2700`, `--timeout 10800`, in seconds. `--until-question` returns on a question; `--expect REGEX` distinguishes a pause. |
| `questions <thread> --all --since ISO` | Formal questions, pending by default. Includes real answers/times, full request IDs, options and exact answer keys. Exit 5 if any shown-period questions remain pending. |
| `result <thread> --marker RESULT --turns N` | Parse the latest matching block from recent replies, default 10. Exit 6 when absent. |
| `watch (<thread>… or --tracked)` | One multi-thread stream. Accepts `--expect REGEX`, `--cursor FILE`, `--progress`, `--until-event` and the same timing flags as wait. |
| `track add <id> --name NAME --role ROLE --note TEXT --environment ID` | Store a project roster entry. Role, note and environment are optional. |
| `track rm <name or id>` / `track prune` / `track list` | Remove an entry, remove entries whose threads are archived or gone, or list entries. |
| `rules` / `version` | Print the T3 rule text, or plugin version and script/registry paths. |
| `send`, `new`, `queue`, `interrupt`, `access` | Exit 2 and print the native T3 tool call. Never dispatch. |

`--registry FILE` overrides the project roster. `T3_APP_LINK_REGISTRY` provides
the same override. The JSON shape preserves codex-app-link's `threads` entries
(`id`, `name`, `role`, `note`, `added`), with optional `environmentId` on the root
or an entry. Names are case-insensitive. Entries from another environment fail
before a detailed subscription starts.

Wait exits: 0 done, 3 stalled, 4 timeout, 5 question, 6 paused. Watch with
`--until-event` uses 5 for QUESTION, 3 for STALLED, 6 for PAUSED, and 0 for RESULT
or APPROVAL. Ordinary watch continues until stopped or its timeout (exit 4).
`--progress` adds NOTE, TURN_END and SILENT. `--silent SEC` defaults to 240;
RESULT lines are excluded from NOTE. Details are limited to 2,000 characters;
JSON retains full fields. Questions use a stable handle on watch lines and full
IDs plus `answers` shapes in `questions`. The polling flag controls
timer checks, not network polling; data comes through one WebSocket.
`--token-file FILE` selects a separate private read token; use a separate
`T3CODE_HOME` at setup and the matching `--origin URL` for an isolated server.

## Dispatch, wait and verify

Send an authorized handoff using `t3_thread_send`. Use mode `queue` for new work
on a busy thread and `steer` for a correction to its current task. Start one
background watch over the roster. Codex managers use `--until-event` and re-arm
with the same cursor after acting. Claude managers use Monitor for per-line notifications, with the exact call in
SKILL.md. Background Bash wakes only on exit. Re-arm Monitor after it ends, using
the same cursor. For Codex, set the lead's own `T3_APP_LINK_SELF` if `T3CODE_THREAD_ID` is absent.
`watch --until-event` retains its actionable event until the launching Codex run
ends, then prints and exits. If armed in a previous turn, its exit wake queues
behind a later busy turn. No self ID means one stderr warning and immediate exit;
a completion during its launching turn can be lost. This is a wake-after-turn
route, not an interruption. A selected event waits beyond the search timeout if
necessary. See SKILL.md for the Haiku sentinel recipe: continuous Monitor,
worker-only roster, exact lines through native `t3_thread_send mode:auto`, no
CLI write token. Busy leads receive those updates at their next tool boundary.


For a single bounded wait:

```bash
node "$TT" wait worker --expect '^RESULT ' --until-question
```

The wait uses the current bounded snapshot without paging history.
The wait follows the whole thread. Do not wait on one run ID or wrap status in a
shell loop. Queued and chained runs keep it active; the settle clock starts again
after the final run ends. On timeout, inspect the current state before retrying.
On a stall, inspect native T3 activity: silence alone does not prove failure.
The event identifies commands/tools reported running, pending requests and
background work when T3 exposes them. JSON also includes provider states; a
running command may itself be hung.

On QUESTION, use `questions worker`, then native `t3_pending_request read` and
`respond` only if still pending, copying the request ID and printed answer keys
(Claude question text, Codex question IDs). These formal answers do not
approve permission requests. An APPROVAL event requires the user in T3.

Read the complete final reply and RESULT. Verify each claim necessary to the
assignment in the repository or running system. Publication and merge still
require the user's authority. When using disposable test threads, archive only
those created for the test through `t3_thread_organize`, action `archive`.

## Cursor recovery

One live process owns a cursor lock. A second process using it fails with
`cursor-in-use`; a dead owner's lock can be reclaimed. Interrupting the watcher
saves state and releases the lock. A hard kill resumes from the last saved state.

A first watch takes the current snapshot as its baseline and does not page
history or report old events. Pending questions and approvals are the exception.
Baseline idleness does not produce DONE or PAUSED; a subsequent run must end
first. `wait` retains its already-idle settle behavior. Matching RESULT text must
be non-streaming. Viewing a thread does not reset its stall clock.

The cursor contains reported identities and queued events as well as sequences.
An until-event exit retains later events for the next invocation. Resume with
the same roster, options and expectation. Small gaps use sequence replay; a
snapshot fallback walks rows from newest to oldest, paging until it reaches the
first item held in the cursor's recovery anchors, the 64 most recent item IDs. Only newer rows are reported; older
rows on the boundary page remain silent. Page positions are local to each page
and are never used as offsets. If no held item is found, recovery continues to
the start of available history and prints HISTORY_START. Keep the cursor intact
so its anchors remain available across re-arms.

Questions answered during the gap are recovered from completed input items too.
Their recovered compact line includes resolved status; replay can also preserve
a historical pending event. Use `questions --all` to check current state.

History failures leave the stream sequence unadvanced
and fail the command rather than silently skipping history.

Unknown stream events print UNPARSED. Protocol, authorization and history errors
fail visibly. MISSING and FOUND report thread disappearance or connection loss
and return. They do not authorize restarting a worker.

Still-pending requests tied to terminal runs are stale, including command approvals left raw
pending after interruption. They never count as pending or trigger a question
exit. `questions --all` labels them STALE. Explicit inspection and wait read
retained archived detail; an archived terminal run can settle normally.
