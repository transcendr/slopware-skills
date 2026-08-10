# Codex Voice Optimizer

> **You speak. The coordinator routes. The work threads work. You never read
> model output again.**

Codex Voice Optimizer upgrades ChatGPT Voice in the Codex desktop app from "a
chat you talk to" into a hands-free command center for parallel engineering
work. One voice thread becomes a pure coordinator: it delegates your
intentions to named work threads, follows their progress, and speaks material
results back in language tuned for the ear.

Everything in the skill is built around four payoffs:

- **Less listening effort** — updates lead with outcome and impact, in a
  Simplified-Technical-English register: one idea per sentence, plain words,
  one term per concept, caveats paired with what they actually mean for you.
- **Less waiting** — the coordinator answers from its own context only when
  the answer is already established and unambiguous; otherwise it gets the
  evidence-backed answer from the owning thread and relays it.
- **More parallel throughput** — work threads run simultaneously in separate
  lanes and message each other directly when their lanes depend on each other.
- **More control** — no remote write (push, MR, comment, merge, deploy)
  happens without your explicit authorization of that specific action, and
  the coordinator goes idle between your requests instead of freelancing.

[Canonical skill](skills/codex-voice-optimizer/SKILL.md) ·
[Original X post](https://x.com/aienginerd/status/2086442654779191575)

## How it's organized

The skill is layered so each participant gets exactly its own contract:

| Module | Role |
| --- | --- |
| [SKILL.md](skills/codex-voice-optimizer/SKILL.md) | The optimizer core: the always-on base behavior layer (ear-first speech, routing-only discipline, authority, safe speech handling, honest recovery) and the module router. |
| [voice-coordinator.md](skills/codex-voice-optimizer/references/voice-coordinator.md) | How the coordinator operates: workstream setup, routing every utterance, keeping progress flowing back, going idle. |
| [work-thread.md](skills/codex-voice-optimizer/references/work-thread.md) | The contract briefed into every work thread: own your lane, report at material boundaries, talk to peers directly, respect authority. |
| [codex-app.md](skills/codex-voice-optimizer/references/codex-app.md) | Codex app mechanics: task tools, name-to-ID mappings, and the realtime inline route for visible chat artifacts. |
| [workflows/freeway.md](skills/codex-voice-optimizer/references/workflows/freeway.md) | Freeway: the named, opt-in high-throughput topology (below). |
| [workflows/decision-walkthrough.md](skills/codex-voice-optimizer/references/workflows/decision-walkthrough.md) | Decision Walkthrough: opt-in, read-only pre-implementation convergence — close material authority decisions one at a time, by voice (below). |

The `references/workflows/` folder is the skill's growth surface: named,
opt-in workflows — topologies and processes — that install on top of
free-form orchestration. Every workflow inherits the base layer, activates
only by its anchor phrase or an explicitly permitted offer, and composes with
the others. New sub-processes land there as they're battle-tested.

## Freeway

The signature mode, opt-in on top of free-form orchestration: one voice
coordinator, N parallel work lanes, every lane moving at once. Lanes are
roles derived from the workstream's genuinely independent work — change,
research, review, testing, whatever the outcomes demand — and the lane set
scales live as the work reveals itself. One coordinator comfortably drives
five or more lanes. The coordinator offers it once at session start for
substantial goals; you can also just ask for it by name.

The proven two-lane starter (a starting configuration, not the canonical
form):

```text
You
└── Voice coordinator — relays intentions, delegates, voices updates
    ├── Change lane   — plans + orchestrates anything producing a change
    └── Research lane — parallel research + planning overflow
        (scale lanes as independent work appears)
```

The rhythm: describe the workstream outcome and confirm shared understanding;
lanes run in parallel (at minimum 1.5–2x time efficiency over serial work,
compounding with lane count); threads exchange context directly through
`send_message_to_thread`; every material checkpoint flows back through the
coordinator and gets spoken to you.
You focus on something else entirely, stay passively current, and steer by
voice — "authorize that," "merge this," "tell the change thread to request the
research" — without ever looking back at the transcript.

## Decision Walkthrough

A process workflow for the moment before implementation, when a plan still has
real forks in it — design, product, API, architecture choices where different
legitimate picks would change the contract. Say *"start the decision
walkthrough for this slice"* and the workstream converges them one at a time:

- the owning thread researches everything discoverable itself — you are never
  asked to choose a fact;
- each genuine decision arrives as one spoken packet: the question, the
  evidence, mutually exclusive options with consequences, and an
  evidence-backed recommendation;
- everything stays read-only — a decision authorizes a contract, never its
  implementation;
- challenge a premise and it reinspects the source, corrects itself
  explicitly, and stays on the same decision;
- it stops at implementation readiness with a closure handoff instead of
  inventing more decisions.

Runs free-form or inside Freeway, where it binds to the lane that owns the
slice.

## What using it feels like

1. Start a new empty Codex task in ChatGPT Voice.
2. Invoke the skill and describe your goal.
3. Accept the Freeway offer, name existing threads, or just start delegating
   free-form.
4. Speak requests, questions, corrections, and authorizations naturally.
5. Do something else while material progress, blockers, and readiness arrive
   as concise spoken updates. Ask it to elaborate, clarify, simplify, or drop
   a clickable artifact in the chat whenever you want.

```text
Use $codex-voice-optimizer to coordinate this workstream through my existing
Codex tasks.
```

## Codex requirements

This skill is specifically for Codex. The full experience requires:

- ChatGPT Voice in the Codex desktop app;
- persistent Codex work tasks with listing, reading, messaging, and waiting;
- the Codex realtime inline route for visible chat artifacts.

OpenAI documents that ChatGPT Voice can coordinate tasks in Chat, Work, and
Codex, including starting separate tasks, checking existing tasks, and sending
follow-up instructions. See the
[official ChatGPT Voice documentation](https://learn.chatgpt.com/docs/features/voice).

The package is intentionally not listed in the Claude Code marketplace because
its contract depends on Codex-specific voice and task surfaces.

## Install

### Codex plugin

```bash
codex plugin marketplace add transcendr/slopware-skills
codex plugin add codex-voice-optimizer@slopware-skills
```

### skills.sh

```bash
npx skills add https://github.com/transcendr/slopware-skills/tree/main/plugins/codex-voice-optimizer/skills/codex-voice-optimizer -g -a codex
```

### Generic Agent Skills path for Codex

```bash
git clone https://github.com/transcendr/slopware-skills.git
mkdir -p ~/.agents/skills
cp -R slopware-skills/plugins/codex-voice-optimizer/skills/codex-voice-optimizer ~/.agents/skills/codex-voice-optimizer
```

## Why there is no hook

The coordinator role must be explicitly bound to one voice task, a current
workstream, named owning threads, and exact authority. A lifecycle hook cannot
know that topology and would risk imposing coordinator behavior on ordinary
work tasks. The plugin therefore has no hook, daemon, timer, state file, MCP
server, or runtime dependency.

## License

[CC BY 4.0](../../LICENSE): use, adapt, redistribute, and commercialize this
skill however you want; keep credit to
[Slopware Engineer](https://x.com/aienginerd) / `@aienginerd`.

Free forever ♡
