---
name: codex-app-link
description: Create Codex threads and send messages into Codex desktop-app (GUI) threads, then wait for and read their replies, so Claude can orchestrate Codex agents. Use when the user asks to message, direct, steer, start, check on, or hand work to a Codex thread or agent (often given as a thread ID like 01a10323-9edd-...), or to run Codex as a sub-agent.
---

# Codex App Link

`scripts/codex-thread.mjs` drives Codex threads from the terminal. It sends messages through the Codex desktop app, works whether or not the thread is in the foreground, and reads replies from Codex's own session files. By default, output is compact text, to save tokens in an agent's context:
- one line of `key=value` scalars;
- then the agent's reply (`lastAgentMessage`) as raw, unescaped text.

Add `--json` only when you need every field. Do not pipe JSON through `jq` into your context. Errors are one-line JSON on stderr, with exit code 1.

Set `CT` to the script inside this skill's base directory:

```bash
CT=<skill-base-dir>/scripts/codex-thread.mjs
```

Requirements: macOS, the Codex desktop app (ChatGPT.app) running, and Node.js 22.5 or later (the script reads Codex's thread index through `node:sqlite`).

| Command | Purpose |
|---|---|
| `node $CT list [--limit N] [--cwd DIR]` | Recent threads (id, title, cwd, updated) |
| `node $CT status <id>` | `status` (idle/active), current `turnId`, `lastAgentMessage`, `loadedInApp` |
| `node $CT new --cwd DIR --text "..." [--timeout SEC] [-- <codex exec args>]` | Create a thread with the CLI, run its first turn, then load it in the app. Returns `threadId` and `finalMessage` |
| `node $CT send <id> --text "..." [--wait] [--timeout SEC]` | Start a turn in an idle thread through the app. `--wait` blocks until it finishes and returns `lastAgentMessage` |
| `node $CT send <id> --text "..." --steer` | Add a message to the turn that is running now |
| `node $CT wait <id> [--timeout SEC] [--settle SEC] [--stall SEC]` | Block until the **thread** is done (see "Waiting for results"). Prints `result`: `done`, `stalled` or `timeout` (exit 0, 3 or 4), plus `lastAgentMessage` |
| `node $CT read <id> [--last N]` | Final replies of the last N turns |
| `node $CT open <id>` | Make the app load a thread without sending anything |

Long messages: `--file path` or `--stdin` instead of `--text`.

## Waiting for results: the only supported method

Run exactly this as a background command, and act when it exits:

```bash
node $CT wait <id> --timeout 10800        # run_in_background; one command, no loops
```

- **It waits for the thread, not a turn.** It returns when the thread has been continuously idle for `--settle` seconds (default 45). Codex often chains turns: compaction, auto-continue, or context maintenance by other plugins. A turn can also end without a normal completion event. The settle window absorbs chained turns, and nothing is pinned to a turn ID.
- **It cannot hang silently:**
  - `result: "stalled"` (exit 3): the thread claims to be active, but its session file has not been written for `--stall` seconds (default 2700, 45 min). **Verify before acting:** a silence of 15+ minutes is normal while a high-effort model reasons, or while a long command runs, because neither writes to the session file until it finishes. Check the last session-file write and running processes. If it is still writing or a process is running, restart `wait`. Treat the turn as dead only if it stays silent past the threshold with nothing running.
  - `result: "timeout"` (exit 4): the overall `--timeout` (default 3h) was reached. The current state is printed.
- **On exit, read `result` and `lastAgentMessage` from its output, then judge the work yourself.** Do not require a particular reply format.

Never do any of these (each has caused missed completions):

- wait on a specific turn ID (`wait --turn X`, or `send --wait` followed by its turn);
- loop on a regex for an expected report string (e.g. `RESULT slice=`);
- write hand-rolled shell loops around `wait` or `status`.

`--turn` is still accepted, but it only lets an earlier finish count; it never blocks on that turn.

## Managing a project through Codex threads

When the user onboards you as the manager of work that Codex threads carry out, read these once before acting:

- [references/strategic.md](references/strategic.md): roles, likely thread configurations (including the recommended coordinator-plus-work-threads setup), onboarding questions, and how to read the state of a project from its threads.
- [references/operational.md](references/operational.md): the dispatch, review, wait, verify and merge loop, authority rules, and lessons from real orchestration.
- [references/companions.md](references/companions.md): how to use MSW, MSL and Timebox when the project has them, and how to offer them when it does not.

For a single message to a thread, the commands above are enough.

## Orchestration pattern

1. `new` to create a worker thread, or take an existing thread ID from the user.
2. `send`, then start `node $CT wait <id>` as **one background command** and do other work until it exits (see "Waiting for results"). Use `send --wait` only for short foreground turns; it uses the same thread-level wait.
3. Give Codex file paths to read, not pasted content. Ask it to end its turn with a clear result line you can parse.
4. Report the thread ID to the user so they can open it in the app.

## Rules

- Do not message a thread you did not create unless the user named it and asked you to. The user may be working in it.
- `send` refuses (`thread-busy`) while a turn is running. Use `wait` first. Use `--steer` only when the new instruction must change the running turn.
- Never run a CLI process on a thread (`codex resume`, `codex exec resume`) while the app owns it. Only one Codex process may hold a thread.
- New threads inherit `~/.codex/config.toml` defaults (model, sandbox, approvals). Pass `codex exec` flags after `--` to change them, for example `-- --skip-git-repo-check` outside a git repo, or `-- -s workspace-write`.
- Clean up test threads by archiving them in the app. `codex archive <id>` returned "failed to archive session", with no further detail, for threads the app had loaded (2026-10-06; cause unconfirmed).

## How it works

- **Sending:** the app listens on a private socket, `~/.codex/ipc/ipc.sock`. Each message is JSON with a 4-byte little-endian length in front. The script sends `initialize`, then `thread-owner-discovery` to find the app client that has the thread loaded, then `thread-follower-start-turn` (idle) or `thread-follower-steer-turn` (busy) to that client. This was learned from the Jevpact Codex plugin (`plugins/jevpact/src/codex.js`).
- **Loading:** the app only answers for threads it has loaded. When a thread isn't loaded, `send` and `new` open `codex://threads/<id>` with `open -g`. That loads it in the background, but **can switch the thread shown in the app window**. `--no-open` disables this.
- **State:** the thread index is `~/.codex/state_5.sqlite` (table `threads`, read-only). Turn state and replies come from the thread's rollout JSONL: `task_started` means busy; `task_complete` (which carries `last_agent_message`) or `turn_aborted` means idle.
- **Creating:** `new` runs `codex exec --json` using the CLI bundled with the app (`/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex`, override with `CODEX_BIN`). The older `codex` on PATH (nvm) may reject the configured model.
- **Queued messages:** `codex queue --thread <id> --message ...` stores a message that runs only when a client loads the thread. Opening the thread delivers it at once, so check `status` after `open` before sending.

The socket protocol is private and undocumented. It was verified on 2026-10-06 against app CLI 0.160.0. If a Codex update breaks it, `request-version-mismatch` or `no-handler-for-request` errors appear. Re-check the method versions in the app bundle with `strings app.asar | grep thread-follower-`.

## Troubleshooting

| Error | Meaning / fix |
|---|---|
| `app-not-running` | Start the Codex desktop app (ChatGPT.app) |
| `not-loaded-in-app` | Deep link did not load the thread within 30s. Open the thread in the app manually and retry |
| `thread-not-indexed` | Wrong ID, or the thread was created on another machine |
| `thread-busy` | A turn is running. `wait`, or `send --steer` |
| `request-version-mismatch` / `no-handler-for-request` | The app's private protocol changed. See "How it works" |
| `new` returns `exitCode: 1` and no `finalMessage` | The first turn failed. Read the rollout's `task_complete` event; often an unsupported model or a CLI version mismatch |
