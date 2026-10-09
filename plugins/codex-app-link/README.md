# Codex App Link

> **Claude orchestrates. Codex threads do the work.**

Codex App Link lets Claude Code drive threads in the Codex desktop app. Claude
can create a thread, send it a message, steer a running turn, wait for the
thread to finish, and read the reply. The threads stay ordinary Codex app
threads, so you can open, watch, and continue any of them in the app.

[Read the canonical skill](skills/codex-app-link/SKILL.md) ·
[View all Slopware Skills](../../README.md)

## How it feels to use

Give Claude a thread ID, or ask it to start one:

```text
Send this handoff to Codex thread 01a10323-9edd-... and tell me when it's done.
```

```text
Start a Codex thread in ~/code/my-app to fix the failing auth tests, then
review what it changes.
```

Claude sends the message through the app, runs one background wait, and acts
when the thread finishes. It then reads the reply and judges the work itself.

## Waiting that does not hang

The wait follows the thread, not a single turn. Codex often chains turns:
compaction, auto-continue, and context maintenance by other plugins. A turn can
also end without a normal completion event. Waiting on one turn ID can then
hang forever.

`wait` returns one of three results instead:

| Result | Exit code | Meaning |
| --- | --- | --- |
| `done` | 0 | The thread has been idle for the whole settle window (default 45s). |
| `stalled` | 3 | The thread claims to be active, but its session file has not been written for the stall window (default 45 min). |
| `timeout` | 4 | The overall timeout (default 3h) was reached. The current state is printed. |

A long silence is normal while a high-effort model reasons or a long command
runs. The skill tells Claude to check for that before treating a turn as dead.

## Token-cheap output

Output is compact text by default: one line of `key=value` fields, then the
agent's reply as raw text. `--json` prints every field when a program needs
them.

## Commands

| Command | Purpose |
| --- | --- |
| `list` | Recent threads: id, last update, title |
| `status <id>` | Idle or active, current turn, last reply, whether the app has it loaded |
| `new --cwd DIR --text "..."` | Create a thread with the Codex CLI, run its first turn, then load it in the app |
| `send <id> --text "..."` | Start a turn in an idle thread |
| `send <id> --text "..." --steer` | Add a message to the turn that is running now |
| `wait <id>` | Block until the thread is done, stalled, or timed out |
| `read <id> [--last N]` | Final replies of the last N turns |
| `open <id>` | Make the app load a thread without sending anything |

## Requirements

- macOS, with the Codex desktop app (ChatGPT.app) running.
- Node.js 22.5 or later. The script reads Codex's thread index through
  `node:sqlite`.
- Claude Code. This package is intentionally absent from the Codex
  marketplace, because its job is to let Claude drive Codex.

## How it works

The Codex app listens on a private local socket, `~/.codex/ipc/ipc.sock`. The
script asks the app which client has the thread loaded, then asks that client
to start or steer a turn. Thread state and replies come from Codex's own files:
the thread index in `~/.codex/state_5.sqlite` (read-only) and each thread's
session log.

The socket protocol is private and undocumented. It was learned from the
Jevpact Codex plugin and verified against Codex app CLI 0.160.0. A Codex update
can break it; the skill's troubleshooting table lists the errors that signal
this.

Sending to a thread the app has not loaded opens its `codex://threads/<id>`
link in the background. That can switch the thread shown in the app window.
`--no-open` turns this off.

The package has no hook, daemon, MCP server, npm dependency, or persistent
state. It is one skill and one Node script.

## Install

### Claude Code

```bash
claude plugin marketplace add transcendr/slopware-skills
claude plugin install codex-app-link@slopware-skills
```

### skills.sh

```bash
npx skills add https://github.com/transcendr/slopware-skills/tree/main/plugins/codex-app-link/skills/codex-app-link -g -a claude-code
```

### Generic `~/.claude/skills`

```bash
git clone https://github.com/transcendr/slopware-skills.git
mkdir -p ~/.claude/skills
cp -R slopware-skills/plugins/codex-app-link/skills/codex-app-link ~/.claude/skills/codex-app-link
```

## Works with the Slopware Dev Stack

Codex App Link works alone. When Claude hands work to Codex threads,
[MSW](../msw/README.md) keeps each handoff to the necessary work,
[Timebox](../timebox/README.md) gives a thread an authorized AWT/CGP clock, and
[MSL](../msl/README.md) shapes what Claude reports back.

## License

[CC BY 4.0](../../LICENSE): use, adapt, redistribute, and commercialize this
skill however you want; keep credit to
[Slopware Engineer](https://x.com/aienginerd) / `@aienginerd`.

Free forever ♡
