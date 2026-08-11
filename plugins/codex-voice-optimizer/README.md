# Codex Voice Optimizer

> **You speak. The coordinator routes. The work threads own the work. You stay off the
> task transcripts until you want detail.**

Codex Voice Optimizer upgrades ChatGPT Voice in the Codex desktop app from "a
chat you talk to" into a hands-free command center for parallel engineering
work. One voice thread becomes a pure coordinator: it delegates your
intentions to named work threads, follows their progress, and speaks material
results back in language tuned for the ear.

Every rule in the skill exists to buy you one of four things:

- **Less listening effort**: updates lead with outcome and impact, using an
  ear-first register inspired by Simplified Technical English. It keeps one
  idea per sentence, uses plain words, keeps one term per concept, and pairs
  caveats with what they actually mean for you.
- **Less screen watching**: material progress, blockers, and decisions come
  back through one spoken surface, while task waiting remains interruptible
  whenever you speak.
- **More parallel throughput**: work threads run simultaneously in separate
  lanes and message each other directly when their lanes depend on each other.
- **More control**: no remote write (push, MR, comment, merge, deploy)
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
| [codex-app.md](skills/codex-voice-optimizer/references/codex-app.md) | Codex app mechanics: project discovery and placement, task tools, name-to-ID mappings, and the realtime inline route for visible chat artifacts. |
| [workflows/freeway.md](skills/codex-voice-optimizer/references/workflows/freeway.md) | Freeway: the named, opt-in high-throughput topology (below). |
| [workflows/decision-walkthrough.md](skills/codex-voice-optimizer/references/workflows/decision-walkthrough.md) | Decision Walkthrough: opt-in, read-only pre-implementation convergence that closes material authority decisions one at a time by voice. |
| [workflows/tutorial.md](skills/codex-voice-optimizer/references/workflows/tutorial.md) | Tutorial: hands-on onboarding that teaches the system through use, with advanced material only when accepted. |

The `references/workflows/` folder is the skill's growth surface. It contains
named, opt-in topologies and processes that install on top of free-form
orchestration. Every workflow inherits the base layer, activates only by its
anchor phrase or an explicitly permitted offer, and composes with the others.
New processes land there as they are battle-tested.

## Freeway

The signature mode is an opt-in layer on top of free-form orchestration. It
uses one voice coordinator and the work lanes supported by the workstream's
genuinely independent work. Lanes are roles derived from the outcome: change,
research, review, testing, or whatever else the necessary work demands. The
lane set changes only as real ownership changes. You can ask for Freeway by
name, or accept the coordinator's brief offer when useful parallelism is
present.

For codebase work, the coordinator can resolve the Codex project first and
place every newly authorized lane there. Selecting a project or accepting
Freeway never authorizes task creation, and existing threads remain where they
already run.

The change-and-research topology from the original workflow is a reference
shape, not a default or limit:

```text
You
└── Voice coordinator: relays intentions, delegates, voices updates
    ├── Change lane: plans + orchestrates anything producing a change
    └── Research lane: parallel research + planning overflow
        (scale lanes as independent work appears)
```

The rhythm: describe the workstream outcome and confirm shared understanding;
run necessary independent work in parallel; let threads exchange relevant
context directly; route each material checkpoint back through the coordinator
for spoken synthesis. No lane receives invented work merely to stay busy.
You focus on something else entirely, stay passively current, and steer by
voice with requests such as "authorize that," "merge this," or "tell the
change thread to request the research," without looking back at the transcript.

## Decision Walkthrough

A process workflow for the moment before implementation, when a plan still has
real forks in it: design, product, API, architecture choices where different
legitimate picks would change the contract. Say *"start the decision
walkthrough for this slice"* and the workstream converges them one at a time:

- the owning thread researches everything discoverable itself: you are never
  asked to choose a fact;
- each genuine decision arrives as one spoken packet: the question, the
  evidence, mutually exclusive options with consequences, and an
  evidence-backed recommendation;
- everything stays read-only: a decision authorizes a contract, never its
  implementation;
- challenge a premise and it reinspects the source, corrects itself
  explicitly, and stays on the same decision;
- it stops at implementation readiness with a closure handoff instead of
  inventing more decisions.

Runs free-form or inside Freeway, where it binds to the lane that owns the
slice.

## What using it feels like

1. Start a new empty Codex task in ChatGPT Voice.
2. Invoke the skill and describe your goal, or say "start the voice optimizer
   tutorial" for a hands-on tour first.
3. If the work belongs to a codebase, name its Codex project or ask the
   coordinator to help discover it.
4. Accept the Freeway offer, name existing threads, or explicitly ask for new
   ones. Newly created work threads stay in the selected project.
5. Speak requests, questions, corrections, and authorizations naturally.
6. Do something else while material progress, blockers, and readiness arrive
   as concise spoken updates. Ask it to elaborate, clarify, simplify, or drop
   a clickable artifact in the chat whenever you want.

```text
Use $codex-voice-optimizer to coordinate this workstream through my existing
Codex tasks.
This work belongs to my <project> Codex project. Keep any new work tasks there.
```

## Codex requirements

This skill is specifically for Codex. The full experience requires:

- ChatGPT Voice in the Codex desktop app;
- Codex project listing and project-scoped task creation;
- persistent Codex work tasks with listing, reading, messaging, and waiting;
- the Codex realtime inline route for visible chat artifacts.

OpenAI documents that ChatGPT Voice can coordinate tasks in Chat, Work, and
Codex, including starting separate tasks, checking existing tasks, and sending
follow-up instructions. See the
[official ChatGPT Voice documentation](https://learn.chatgpt.com/docs/features/voice).
OpenAI also documents that a local project's primary folder is the starting
context for new chats and Codex Git operations. See
[Projects and chats](https://learn.chatgpt.com/docs/projects#use-local-projects-for-folders-and-codebases).

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
