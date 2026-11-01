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
| `questions <thread> --all --since ISO` | Formal questions, pending by default. Includes known answers/status and options. Exit 5 if any shown-period questions remain pending. |
| `result <thread> --marker RESULT --turns N` | Parse the latest matching block from recent replies, default 10. Exit 6 when absent. |
| `watch (<thread>… or --tracked)` | One multi-thread stream. Accepts `--expect REGEX`, `--cursor FILE`, `--progress`, `--until-event` and the same timing flags as wait. |
| `track add <id> --name NAME --role ROLE --note TEXT --environment ID` | Store a project roster entry. Role, note and environment are optional. |
| `track rm <name or id>` / `track list` | Remove or list roster entries. |
| `rules` / `version` | Print the inherited rule text, or plugin version and script/registry paths. |
| `send`, `new`, `queue`, `interrupt`, `access` | Exit 2 and print the native T3 tool call. Never dispatch. |

`--registry FILE` overrides the project roster. `T3_APP_LINK_REGISTRY` provides
the same override. The JSON shape preserves codex-app-link's `threads` entries
(`id`, `name`, `role`, `note`, `added`), with optional `environmentId` on the root
or an entry. Names are case-insensitive. Entries from another environment fail
before a detailed subscription starts.

Wait exits: 0 done, 3 stalled, 4 timeout, 5 question, 6 paused. Watch with
`--until-event` uses 5 for QUESTION, 3 for STALLED, 6 for PAUSED, and 0 for RESULT
or APPROVAL. Ordinary watch continues until stopped or its timeout (exit 4).
`--progress` adds NOTE events from assistant messages. The polling flag controls
timer checks, not network polling; data comes through one WebSocket.

## Dispatch, wait and verify

Send an authorized handoff using `t3_thread_send`. Use mode `queue` for new work
on a busy thread and `steer` for a correction to its current task. Start one
background watch over the roster. Codex managers use `--until-event` and re-arm
with the same cursor after acting. Claude managers consume background output.

For a single bounded wait:

```bash
node "$TT" wait worker --expect '^RESULT ' --until-question
```

The wait follows the whole thread. Do not wait on one run ID or wrap status in a
shell loop. Queued and chained runs keep it active; the settle clock starts again
after the final run ends. On timeout, inspect the current state before retrying.
On a stall, inspect native T3 activity: silence alone does not prove failure.

On QUESTION, use `questions worker`, then native `t3_pending_request read` and
`respond` with the request ID and its question IDs. These formal answers do not
approve permission requests. An APPROVAL event requires Bryan in T3.

Read the complete final reply and RESULT. Verify each claim necessary to the
assignment in the repository or running system. Publication and merge still
require the user's authority. When using disposable test threads, archive only
those created for the test through `t3_thread_organize`, action `archive`.

## Cursor recovery

One live process owns a cursor lock. A second process using it fails with
`cursor-in-use`; a dead owner's lock can be reclaimed. Interrupting the watcher
saves state and releases the lock. A hard kill resumes from the last saved state.

The cursor contains reported identities and queued events as well as sequences.
An until-event exit retains later events for the next invocation. Resume with
the same roster, options and expectation. Small gaps use sequence replay; a
snapshot fallback pages the history endpoint until the saved timeline position
or a held item is reached. History failures leave the stream sequence unadvanced
and fail the command rather than silently skipping history.

Unknown stream events print UNPARSED. Protocol, authorization and history errors
fail visibly. MISSING and FOUND report thread disappearance or connection loss
and return. They do not authorize restarting a worker.
