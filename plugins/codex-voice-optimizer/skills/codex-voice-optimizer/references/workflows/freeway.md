# Workflow: Freeway

One coordinator, independent lanes, one spoken control surface.

Freeway is a named, opt-in mode for moving independent parts of a substantial
goal through one voice session in parallel. It uses one voice coordinator and
as many owning work lanes as the necessary work can genuinely support. It
installs on top of the base layer and the coordinator role. Everything in those
still applies; this module fixes the topology model and operating rhythm.

## When it applies

Strictly opt-in. Activate it only when the user asks for Freeway by name or
accepts the coordinator's brief offer after describing genuinely independent
work. After a decline or non-selection, continue free-form without repeating
the offer. Never create threads or impose this topology merely to imitate the
pattern.

## The pattern

A workstream contains one or more desired, tangible technical outcomes. The
voice coordinator serves that workstream with N work lanes, where each lane is
a named, persistent work thread that owns one kind of work.

- **Lanes are roles, not a fixed set.** A lane owns whatever independent slice
  the workstream contains: change-producing work, research, review, testing,
  ops, documentation, or whatever else the outcomes demand. Derive the lane
  set from the work, never from a template.
- **N is derived, not chosen.** Use only lanes backed by genuinely independent,
  necessary work. Never choose a lane count as a productivity target.
- **The coordinator never drives.** It relays the user's intentions, delegates
  everything, voices material updates, and produces directly-requested chat
  artifacts (clickable doc paths, diagrams, lists) per
  [codex-app.md](../codex-app.md).

Project placement comes from the base coordinator context. When a project is
selected, create every newly authorized lane task there. Freeway activation
does not authorize task creation, and existing threads are not recreated or
moved merely to match the selected project.

## Scaling the lanes

Treat the lane set as live for the whole workstream:

- Start with the smallest lane set that exposes the workstream's useful
  independence.
- When one lane serializes work that could run independently, propose splitting
  it. Open the new lane only on the user's explicit ask.
- When a lane's scope closes, stop using it. Reassign only necessary remaining
  ownership and make that change visible to the user.
- Every lane change re-briefs the affected threads with the
  [work-thread.md](../work-thread.md) contract: outcome, lane, scope, authority
  boundary, project context, coordinator identity, peer identities, update
  behavior.

## Reference topology: change and research

The source workflow used these lanes. Treat them as an example, not a default
or limit. Use this shape only when the workstream actually contains both
change-producing work and independent research or planning overflow:

1. **Change lane**: plans and orchestrates work that can produce a change. It
   implements, validates, and holds the change evidence.
2. **Research lane**: owns independent research and planning overflow,
   including investigation, extraction, analysis, and any planning the change
   lane sheds to stay moving.

Derive a different lane set whenever the work requires different owners.

## The operating rhythm

1. **Frame.** The user describes the workstream's principal outcome. Restate
   it and the smallest facts proving shared understanding; get confirmation.
2. **Open the lanes.** Bind existing threads to lanes, or create them in the
   selected project on the user's explicit ask. Resolve projectless placement
   before creation when no project is selected. Brief each with the
   [work-thread.md](../work-thread.md) contract.
3. **Keep necessary independent work moving.** Delegate different parts of the
   outcome in parallel when their dependencies allow it, such as research
   feeding the change lane's next step while the change lane executes the
   current one. Never invent work merely to keep a lane busy.
4. **Keep peer traffic direct.** The briefing grants standing permission and
   encouragement for lanes to exchange context and leverage each other's
   expertise thread-to-thread. The coordinator is the hub between the user and
   the workstream, never a chokepoint between the workers.
5. **Voice the stream.** Lanes report at material boundaries; the coordinator
   speaks each material update in the base-layer register. The user works on
   something else, stays passively current, and steers by voice through
   authorizations, course changes, and cross-lane requests such as "have
   research send that to the change lane," without reading any model output.
6. **Converge.** As lanes reach final readiness, relay readiness and any
   pending authorizations. Freeway ends when the workstream's outcomes are met
   or the user closes it; release nothing (merge, publish, deploy) without the
   specific authorization.
