# Codex App Voice and Task Routing

Use this reference only inside the Codex desktop app.

## Contents

- [Required surface](#required-surface)
- [Resolve project placement](#resolve-project-placement)
- [Track and brief tasks](#track-and-brief-tasks)
- [Render requested content in the voice chat](#render-requested-content-in-the-voice-chat)
- [Do not emulate missing capabilities](#do-not-emulate-missing-capabilities)

## Required surface

ChatGPT Voice must run in a Codex task that began as a voice task or is resuming
an earlier voice task. The full orchestration pattern also requires access to
project discovery plus persistent Codex task discovery, authorized creation,
reading, messaging, and interruptible waiting.

Use the current Codex project and task tools instead of guessing their state:

- `codex_app__list_projects` to resolve project names, IDs, and Git status;
- `codex_app__list_threads` to resolve task names and IDs;
- `codex_app__create_thread` to create a task only after the user explicitly
  asks;
- `codex_app__read_thread` for current evidence and status;
- `codex_app__send_message_to_thread` for instructions or corrections to a
  named work task; and
- `codex_app__wait_threads` for active work tasks to complete or need attention
  while allowing new user input to end the wait immediately.

These are native Codex app capabilities. Never substitute a similarly named
project or task tool from another product.

## Resolve project placement

A Codex project is placement context, not permission to create work. When the
user names a project, call `codex_app__list_projects` and resolve its exact
project ID. When codebase work may need new owning tasks and no project is
established, proactively ask whether it belongs to a Codex project. Do not make
project selection a prerequisite for routing to existing tasks.

Use project discovery for resolution, not as a spoken catalog dump. Ask for an
identifying word when the user does not remember the name. When multiple
matches remain, present the matching projects as lettered choices. Put the full
project list in the chat only when the user asks to see it.

Preserve the exact project-name-to-ID mapping in session context. Selecting a
project, accepting Freeway, or naming lane roles never authorizes task creation.

When task creation is explicitly authorized:

- pass the selected project ID to task creation;
- check the project's `isGitRepository` value, defaulting to a worktree for a
  Git project and the saved local project otherwise;
- follow an explicit request to work directly in the saved Git project; and
- use projectless placement only when the user chooses work without a project.

Existing tasks remain where they are. Do not recreate or move one merely to
make its placement match the selected project.

## Track and brief tasks

Prefer the task-wait capability over repeated task reads while work is in
flight. Carry each task's returned cursor into later waits so completed output
is not relayed twice. A timeout with no material change produces no spoken
update. Do not replace task waiting with a recurring automation, sleep loop,
or polling protocol.

Treat task, thread, chat, and conversation as synonyms when the user is clearly
referring to Codex work. Preserve project-name-to-ID and task-name-to-ID
mappings exactly for the voice session. Keep the mappings in session context;
do not create a state file or tracking ledger.

When creating a task is explicitly authorized, supply the workstream outcome,
project context, lane ownership, scope, authority, coordinator task ID, relevant
peer task IDs, and direct-update expectations in its initial prompt. Continue
the voice conversation immediately. Do not wait for acknowledgment before
routing other independent work.

## Render requested content in the voice chat

When the user asks for text, Markdown, code, a list, a link, a diagram, or
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
or completion updates when the voice surface expects those markers. They are
not a reliable visible-artifact route.

Never send a task message to force content into the current voice chat. That
creates a task message, not a native inline assistant artifact, and can route
local links to an external editor.

If requested content does not appear:

1. do not claim success;
2. verify that the response began at byte zero with the directive;
3. change to the correct inline mechanism; and
4. retry after correcting the response framing. If rendering still fails,
   report the failure rather than looping.

Reading a task can prove that an agent message persisted. It cannot prove that
the realtime interface rendered it. State that distinction exactly.

## Do not emulate missing capabilities

Do not use browser control, Computer Use, shell polling, sleeps, daemons, or a
lifecycle hook to simulate missing Codex task or realtime-inline capabilities.
Report the unavailable capability and keep existing task state unchanged.
