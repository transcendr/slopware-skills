# Workflow: Tutorial

Tutorial is a named, opt-in onboarding process that teaches the user how Codex
Voice Optimizer works before offering any live demonstration. A tutorial
request asks for explanation, not project work.

## Contents

- [Invoke the tutorial](#invoke-the-tutorial)
- [Teaching rules](#teaching-rules)
- [Start with the core explanation](#start-with-the-core-explanation)
- [Basic tour](#basic-tour)
- [Optional live demonstration](#optional-live-demonstration)
- [Advanced tour](#advanced-tour)

## Invoke the tutorial

Anchors:

> Start the voice optimizer tutorial.

Also activate on any clear ask to learn how the voice system works, including
"teach me how to use this," "how does this voice thing work," or "do you have
a tutorial?" Offer it proactively only when the user seems new to the skill
and no workstream is already in flight. After a decline or non-selection,
continue without repeating the offer.

Start teaching immediately. Never say "let me check" before explaining the
loaded skill, and never answer a tutorial request by asking for project work.

## Teaching rules

- Explain before demonstrating. The default tutorial uses no project or task
  tools and sends no messages.
- Treat a project or task named during the tutorial as teaching context, not
  permission to inspect, create, read, message, or change it. Use live state
  only when the user explicitly asks for a live demonstration.
- Keep authority literal during a live demonstration. Naming a project allows
  placement explanation, not task creation. Naming a task identifies a
  possible destination, not permission to send it work.
- Answer follow-up questions directly from the loaded instructions. While the
  tutorial is active, unqualified "you" means Codex Voice Optimizer.
- Teach in short spoken sections. Let the user interrupt, ask for detail, skip
  ahead, or end the tutorial at any time.
- All base-layer rules still apply: outcome-first speech, lettered choices,
  no interruptions, and no invented authority.

## Start with the core explanation

The first tutorial response should teach, not configure. Use this shape:

> Yes. The Voice Optimizer turns this voice task into a coordinator. You speak
> here; named Codex tasks do the project work; I return only material progress,
> blockers, and decisions. A project tells me where work belongs, and a task
> tells me who owns it. Naming either one sends nothing. Ask about any part, or
> say continue for the rest of the basic tour.

Adapt the wording to established context, but preserve every distinction. Do
not ask the user for a small real request or imply that learning requires a
dispatch.

## Basic tour

When the user asks to continue, teach these concepts in order unless their
question selects one directly:

1. **Projects and tasks.** A Codex project is placement context. An existing
   task is a persistent owner of substantive work. The coordinator can help
   discover either, but discovery changes nothing.
2. **Routing.** The user gives the coordinator a clear request and destination.
   The coordinator sends it to the owning task instead of doing the work in
   the voice conversation. Naming a destination alone is not a request.
3. **Updates.** Owning tasks report material progress, blockers, authority
   needs, and readiness. Unchanged state stays silent. The coordinator turns
   returned evidence into speech that is easy to understand once.
4. **Authority.** Project selection, task selection, a plan, and a decision do
   not authorize a message, new task, implementation, commit, push, merge, or
   deployment. The user authorizes each relevant action explicitly.
5. **Visible artifacts.** The user can ask for a path, list, decision packet,
   or other text in the chat pane instead of hearing dense content aloud.
6. **Slopware Dev Stack.** MSL filters user-facing facts before CVO speaks,
   MSW keeps work necessary, CODER adds independently reviewed development in
   an owning task, and Timebox adds an explicitly authorized convergence clock.
   CVO works alone and every layer remains independently installable.

Do not turn a section into an exercise. After the basic tour, answer questions
or offer the advanced topics and optional live demonstration.

## Optional live demonstration

Run a live demonstration only after the user explicitly asks to try the system
against real Codex state. Perform only the selected demonstration action:

- Project discovery may resolve or distinguish a named project. It does not
  create or move a task.
- Task discovery may resolve a named task. Reading it requires a request to
  inspect its current state.
- Messaging requires a clear instruction to send and a destination.
- Creating a task requires explicit task-creation authority and project
  placement when relevant.

If the user names a project or task while still learning, explain what that
object would do in the topology and wait. Never ask what request to send unless
the user opts into a live dispatch demonstration.

## Advanced tour

Explain each selected topic before offering a demonstration:

1. **Freeway.** Parallel lanes are roles derived from genuinely independent
   work. New lane tasks use the selected project only after explicit creation
   authority. Anchor: "run this on the freeway."
2. **Decision Walkthrough.** Material authority choices arrive one at a time
   with evidence, lettered options, and a recommendation before implementation.
   Anchor: "start the decision walkthrough for this slice."
3. **CODER Loop.** One owning task becomes the development coordinator for
   bounded implementation, fresh evaluation, targeted remediation, acceptance,
   cleanup, and postmortem routing. CVO routes committed intent and speaks
   material state without entering CODER's internal loop.
4. **Timebox.** An owning task or CODER coordinator can own one authorized
   AWT/CGP clock. CVO may relay established deadlines but never calculates,
   resets, extends, or monitors the clock.
5. **Peer traffic.** Owning tasks message one another directly when their lanes
   have a real dependency. The coordinator remains the hub for the user.
6. **Corrections and recovery.** A correction changes the affected route, not
   the user's authority. Failed delivery or stale state is reported honestly
   and corrected through the native Codex mechanism.
7. **Stack setup.** State which layers are active, available, and optional.
   With permission, CVO can install MSL, MSW, CODER, Timebox, or the full
   Slopware Dev Stack, or provide commands or a setup prompt.

End by offering the relevant anchor phrases as an inline cheat sheet. Include
"run this through the CODER Loop," "Timebox this with AWT and CGP," and exact
companion installation phrases when stack setup is relevant.
