# T3 App Link

Monitor Codex and Claude threads from a T3 manager with the familiar
codex-app-link commands. Dispatch and answer questions through native T3 tools.
The CLI has no thread-writing commands and uses its own read-only token.

[Skill](skills/t3-app-link/SKILL.md) · [Commands](skills/t3-app-link/references/operational.md)

Install with the repository marketplace:

```bash
codex plugin marketplace add transcendr/slopware-skills
codex plugin add t3-app-link@slopware-skills
```

For Claude Code:

```bash
claude plugin marketplace add transcendr/slopware-skills
claude plugin install t3-app-link@slopware-skills
```

For skills.sh:

```bash
npx skills add transcendr/slopware-skills --skill t3-app-link -g
```

Use Node.js 22 or later with native WebSocket enabled, and a running T3 server
supporting orchestration protocol 2. On macOS, `setup` resolves the bundled server
CLI in `/Applications/T3 Code (Beta).app`; set `T3_APP_LINK_APP` for another bundle.
`T3CODE_HOME` selects the T3 home, defaulting to `~/.t3`.

```bash
TT=<installed-skill-directory>/scripts/t3-thread.mjs
node "$TT" setup
node "$TT" version
node "$TT" track add <thread-id> --name worker
node "$TT" watch --tracked --expect '^RESULT ' --cursor /private/path/watch.json --until-event
```

Setup reuses `~/Library/Application Support/T3-App-Link/token`. When issuing a
session, it requests only `orchestration:read`, stores the token with mode 0600,
and records expiry beside it. Run setup again to renew an expired session.
The token never appears in command arguments or command output. The monitor reads
its origin from `~/.t3/userdata/server-runtime.json` and checks the registry and
cursor environment identities before subscribing.

Output is compact text unless `--json` is given. Exit codes are 0 for success,
1 for errors, 2 for usage/native-tool redirects, 3 for stalls, 4 for timeouts,
5 for pending questions, and 6 for a missing result or a pause without the expected
result. `watch --until-event` exits on QUESTION, APPROVAL, RESULT, PAUSED or STALLED;
APPROVAL and RESULT exit 0.

A cursor stores thread state, sequence numbers, reported identities and queued
events. It contains thread content: keep it private and out of Git. One watcher
may hold a cursor at a time. Re-arm with the same cursor, roster and expectation.
A fresh watch baselines the current snapshot without reading older history or
reporting old events, except for currently pending questions and approvals.
Baseline idleness does not produce DONE or PAUSED. On re-arm, small gaps replay
from T3; snapshot fallback walks history back to the first held item identity,
reporting only newer rows. If no held item is found, it reaches the start and
prints HISTORY_START. RESULT matching
waits for non-streaming message text.
This recovers observable state, not transient updates that T3 has already coalesced.
`MAINTENANCE` requires T3's structured maintenance field. An isolated unpatched
0.1.5 server passed the Claude question/answer/RESULT check; its Codex provider
could not open a session, so full stock compatibility remains unproven.

Run the tests without installing dependencies:

```bash
node --test plugins/t3-app-link/tests/*.test.mjs
```

The result parser, rule text, output formatter and registry conventions were
forked from codex-app-link at `3372f52`. The protocol-2 transport was adapted from
Jevpact's `t3-rpc.js`; it is vendored so this skill installs independently.

## Output differences from codex-app-link

Watch lines use `HH:MM:SS KIND name detail | rule: ...`. JSON retains the full
message, run and request IDs; compact lines omit long IDs. A request handle is a
full SHA-256 digest in base64url form, prefixed `q:`. Run `questions <thread>` to
get its full requestId and exact answer keys. Claude keys are question text;
Codex keys are question IDs. The printed `answers` object has the shape accepted
by `t3_pending_request respond`. Answers and times come from T3's retained
request/item data, with an async-answer-message fallback and an explicit
unavailable reason if none is retained.

Intentional native T3 differences:

- STARTED and TURN_END show native run status rather than Codex rollout turn IDs
  or `task_complete`/`turn_aborted` names.
- APPROVAL is also the progress approval-wait signal; no duplicate APPROVAL_WAIT
  alias is emitted. The user reviews it in T3.
- MISSING and FOUND describe connection or thread availability, rather than
  rollout-file existence. HISTORY_START reports recovery without a held anchor.
- MAINTENANCE uses structured T3 data. COMPACTED carries no compact detail;
  JSON retains its item ID.
- `--progress` emits NOTE, TURN_END and SILENT. `--silent SEC` defaults to the
  progress script's 240 seconds. RESULT lines are not repeated as NOTE.

Compact details use the same 2,000-character MESSAGE_LIMIT. QUESTION puts every
question and its options first, followed by the request handle and rule. If a
request arrives before its text, emission waits for the item, with a fallback
after one watch polling interval (five seconds by default). JSON is not truncated.

A Claude lead uses Monitor for per-line wakes. A Codex lead uses the verified
exit hold for a wake after its turn, or a Haiku sentinel for updates while busy;
the skill supplies both recipes. Set `T3_APP_LINK_SELF` from the lead's T3 ID if
`T3CODE_THREAD_ID` is absent. With neither set, `--until-event` warns once and
exits immediately; T3 can discard that completion if its launching turn is
still active. With a self ID, the watcher retains its actionable event until
that Codex run ends, then exits to trigger a new-run wake. Events after an earlier
arming turn still queue their wake behind a later busy turn.

The sentinel uses native `t3_thread_send mode:auto`, never a CLI write token.
Observed delivery to a busy Codex lead was 5.204 seconds for a question and 5.113
seconds for the RESULT, within one run; idle delivery was 3.869 seconds. A long
foreground step delays model receipt until a tool boundary. The bundled
`t3 thread send` only queues and cannot implement this steering recipe.

## Provider verification

| Behaviour | Codex | Claude |
| --- | --- | --- |
| Formal question, answer and RESULT | Live proven | Live proven |
| Command approval | Live event proven; stale request filtered after interrupted run | No approval produced in the three authorised attempts |
| COMPACTED | Live proven | Live proven, including two in the lead's real Jevpact replay |
| MAINTENANCE | Live proven | Lead verified `action:resume` in its real Jevpact replay |
| Stock unpatched 0.1.5 | Provider session failed to open | Question/answer/RESULT proven |

Use `--token-file FILE` with `setup` and read commands when monitoring a separate
T3 instance. Select that instance's `T3CODE_HOME` for setup and its `--origin URL`
for monitoring; keep a separate token and cursor per environment. The default
token is never replaced when an alternate token file is supplied.

STALLED and SILENT explain T3's observable liveness: a running command or tool,
pending input, or background work. STALLED still means the configured interval
without detailed events, not a proven dead process. JSON includes native
command/tool IDs and provider states. A command reported as running may itself
be hung; T3 does not provide an OS process heartbeat through this stream. Idle
SILENT lines say the thread is idle.

Gap recovery also reports formal questions answered while disconnected. Their
compact lines include `status=resolved` when recovered from completed items.
Always inspect current `questions --all` state before trying to respond. Native
sequence replay can preserve a historical pending QUESTION even when the request
is now resolved.

Pending requests whose owning run has ended are stale even if T3 retains their
raw pending status. They are excluded from watch events and pending counts, do
not block wait, and appear as STALE in `questions --all`. Explicit reads and
waits can inspect retained detail on an archived thread.
