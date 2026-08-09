# Codex App Voice and Task Routing

Use this reference only inside the Codex desktop app.

## Required surface

ChatGPT Voice must run in a Codex task that began as a voice task or is resuming
an earlier voice task. The full orchestration pattern also requires access to
persistent Codex task discovery, reading, messaging, and waiting.

Use the current Codex task tools instead of guessing their state:

- list tasks to resolve names and IDs;
- create a task only after the requester explicitly asks;
- read a task for current evidence and status;
- send instructions or corrections to a named work task; and
- wait on active work tasks for material progress without repeatedly rereading
  unchanged state.

Treat task, thread, chat, and conversation as synonyms when the requester is
clearly referring to Codex work. Preserve task-name-to-ID mappings exactly for
the voice session. Keep the mapping in session context; do not create a state
file or tracking ledger.

When creating a task is explicitly authorized, supply the workstream outcome,
lane ownership, scope, authority, coordinator task ID, relevant peer task IDs,
and direct-update expectations in its initial prompt. Continue the voice
conversation immediately. Do not wait for acknowledgment before routing other
independent work.

## Render requested content in the voice chat

When the requester asks for text, Markdown, code, a list, a link, a diagram, or
an artifact to appear directly in the chat pane, use the native realtime inline
route.

Begin the response at byte zero with this exact standalone line:

```text
::codex-realtime-inline{}
```

Put the requested Markdown immediately after it. Do not place whitespace,
commentary, acknowledgment, `[STATUS]`, `[COMPLETE]`, or any other text before
the directive.

Example:

````text
::codex-realtime-inline{}
```text
- [PLAN.md](/absolute/path/PLAN.md)
- [GOAL.md](/absolute/path/GOAL.md)
- [EVIDENCE.md](/absolute/path/EVIDENCE.md)
```
````

Keep the requested inline payload text-only. Do not narrate the payload in the
same response. Use standard Markdown links with absolute local paths so Codex
can open them inline.

Use ordinary `[STATUS]` or `[COMPLETE]` responses only for short spoken progress
or completion updates. They are not a reliable visible-artifact route.

Never send a task message to force content into the current voice chat. That
creates a task message, not a native inline assistant artifact, and can route
local links to an external editor.

If requested content does not appear:

1. do not claim success;
2. verify that the response began at byte zero with the directive;
3. change to the correct inline mechanism; and
4. retry once.

Reading a task can prove that an agent message persisted. It cannot prove that
the realtime interface rendered it. State that distinction exactly.

## Do not emulate missing capabilities

Do not use browser control, Computer Use, shell polling, sleeps, daemons, or a
lifecycle hook to simulate missing Codex task or realtime-inline capabilities.
Report the unavailable capability and keep existing task state unchanged.
