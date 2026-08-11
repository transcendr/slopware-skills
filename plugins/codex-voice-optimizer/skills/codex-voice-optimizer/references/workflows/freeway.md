# Workflow: Freeway

One coordinator, N lanes, every lane moving — and the coordinator never
drives.

Freeway is a named, opt-in mode for pushing a large block of work through one
voice session at maximum throughput: one voice coordinator, N parallel work
lanes, every lane moving at once. It installs on top of the base layer and the
coordinator role — everything in those still applies; this module fixes the
topology model and the operating rhythm.

## When it applies

Strictly opt-in. Activate it only when the user asks for Freeway by name, or
accepts the coordinator's one-sentence offer at session start. The offer is
made once, only for a substantial goal, and never repeated after a decline.
Free-form orchestration remains the default; never create threads or impose
this topology to imitate the pattern.

## The pattern

One workstream — one or more desired, tangible technical outcomes — is served
by the voice coordinator plus N work lanes, where each lane is a named,
persistent work thread owning one kind of work.

- **Lanes are roles, not a fixed set.** A lane owns whatever independent slice
  the workstream contains: change-producing work, research, review, testing,
  ops, documentation — whatever the outcomes demand. Derive the lane set from
  the work; never from a template.
- **N is derived, not chosen.** Open as many lanes as there is genuinely
  independent work to run in parallel — no more. One coordinator comfortably
  drives five or more lanes.
- **The coordinator never drives.** It relays the user's intentions, delegates
  everything, voices material updates, and produces directly-requested chat
  artifacts (clickable doc paths, diagrams, lists) per
  [codex-app.md](../codex-app.md).

## Scaling the lanes

Treat the lane set as live for the whole workstream:

- Start with the smallest lane set that keeps all current work moving in
  parallel.
- When one lane becomes the bottleneck — serializing work that could run
  independently — propose splitting it. Open the new lane only on the user's
  explicit ask.
- When a lane sits idle with no upcoming work in its slice, fold its scope
  into a neighbor and say so.
- Every lane change re-briefs the affected threads with the
  [work-thread.md](../work-thread.md) contract: outcome, lane, scope, authority
  boundary, coordinator identity, peer identities, update behavior.

## Reference topology: the two-lane starter

The shape most workstreams want on day one — a proven starting configuration,
not the canonical form:

1. **Change lane** — plans and orchestrates changes: anything that requires
   work to be done that can produce a change. Implements, validates, holds the
   change evidence.
2. **Research lane** — parallel research and planning overflow: investigation,
   extraction, analysis, and any planning the change lane sheds to stay
   moving.

Start here when the independent work hasn't fully revealed itself yet, then
scale lanes as it does.

## The operating rhythm

1. **Frame.** The user describes the workstream's principal outcome. Restate
   it and the smallest facts proving shared understanding; get confirmation.
2. **Open the lanes.** Bind existing threads to lanes, or create them on the
   user's explicit ask. Brief each with the
   [work-thread.md](../work-thread.md) contract.
3. **Keep every lane moving.** Delegate so lanes are always working different
   parts of the outcome in parallel — research feeding the change lane's next
   step while the change lane executes the current one. This parallelism is
   the payoff: at minimum 1.5–2x time efficiency over serial work, compounding
   with lane count.
4. **Keep peer traffic direct.** The briefing grants standing permission and
   encouragement for lanes to exchange context and leverage each other's
   expertise thread-to-thread. The coordinator is the hub between the user and
   the workstream, never a chokepoint between the workers.
5. **Voice the stream.** Lanes report at material boundaries; the coordinator
   speaks each material update in the base-layer register. The user works on
   something else, stays passively current, and steers by voice —
   authorizations, course changes, cross-lane requests ("have research send
   that to the change lane") — without reading any model output.
6. **Converge.** As lanes reach final readiness, relay readiness and any
   pending authorizations. Freeway ends when the workstream's outcomes are met
   or the user closes it; release nothing (merge, publish, deploy) without the
   specific authorization.
