# Workflow: Tutorial

Tutorial is a named, opt-in onboarding process that teaches the user the
optimized voice system by using it, not by lecturing about it. It runs like a
good app dashboard tour: each short segment teaches one substantive behavior,
then lets the user try it. Advanced content is offered afterward and delivered
only if the user accepts.

## Invoke the tutorial

Anchors:

> Start the voice optimizer tutorial.

Also activate on any clear ask to learn or be taught how the voice system
works ("teach me how to use this," "how does this voice thing work,"
"onboard me"). Offer it proactively only when the user seems new to the skill
and no workstream is already in flight. After a decline or non-selection,
continue without repeating the offer.

## Teaching rules

- Teach hands-on. Have the user try each concept before continuing, preferably
  against their real work; fall back to a harmless sample task only when no
  real work exists yet.
- Keep each segment focused on one behavior, then let the user try it before
  continuing. No segment is a lecture.
- All base-layer rules apply while teaching: lettered choices, outcome-first
  speech, no interruptions, authority preserved. The tutorial itself models
  the behavior it teaches.
- Never demonstrate a capability the current session lacks; skip it and state
  the limitation concisely.
- The user can bail at any point ("that's enough"): close immediately with
  the recap, no protest.

## Basics (the tour)

Run these segments in order:

1. **The model.** You speak; this thread routes; named work
   threads do the work; material results come back as speech. This thread
   never does the work itself.
2. **Delegate something.** For codebase work, have the user name its Codex
   project or ask you to discover it. Then have them name an existing work
   thread or explicitly ask for a new one, and delegate a small real task by
   voice. State concisely what was dispatched and where it was placed.
3. **Updates come to you.** Explain that threads report material progress,
   blockers, and readiness, while unchanged status is never narrated. When the
   first real update arrives, identify it as a checkpoint and explain that
   future material updates will arrive the same way.
4. **Interrogate anything.** Have the user ask to elaborate, clarify, or
   simplify the last update: the replacement for reading model output.
5. **Visible artifacts.** Have the user ask for something in the chat pane,
   such as a clickable file path or list, and deliver it via the inline route.
6. **Authority.** Explain that nothing is pushed, merged, published, or
   deployed without their explicit authorization of that specific action.

Close the basics with a concise recap, then offer the advanced tour. If
declined or ignored, stop; do not offer again.

## Advanced (only on acceptance)

Pick the segments relevant to the user's context, same hands-on rules:

1. **Freeway.** Parallel lanes, lanes as roles, selected-project placement for
   new lanes, the change-and-research reference topology, lane handles ("send
   that to the research lane"), and the contextual offer. Anchor: "run this on
   the freeway."
2. **Decision Walkthrough.** Converging authority decisions one packet at a
   time before implementation: read on screen, hear the compressed version,
   answer with a letter. Anchor: "start the decision walkthrough for this
   slice."
3. **Peer traffic.** Work threads message each other directly when lanes
   depend on each other; the user can broker by voice: "tell research to send
   that to the change lane."
4. **Corrections and recovery.** Correcting scope mid-flight, challenging a
   claim, and what honest failure handling sounds like.
5. **The roster.** They can always ask what workflows and modes are
   available.

End by stating the relevant anchor phrases clearly and offer to drop them
inline as a cheat sheet.
