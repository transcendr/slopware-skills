# CODER Loop

> **Codex Optimized Development, Evaluation, and Remediation.**

The CODER Loop is a Codex-only multi-agent implementation loop for complex
changes that deserve clear ownership and genuinely independent review. Its
technical method is bounded task-family review. One coordinator owns the
decision, each worker owns one coherent task family, and a fresh reviewer
examines the actual candidate. Only contract-breaking gaps become repair work.

[Read the canonical skill](skills/coder-loop/SKILL.md) ·
[View all Slopware Skills](../../README.md)

## What using it feels like

Invoke the CODER Loop on a real implementation outcome:

```text
Use $coder-loop to implement this change with bounded task-family owners and fresh
independent review.
```

The coordinator first binds the candidate and acceptance claims. It splits the
work only where coherent ownership exists, sends each family to one worker,
and sequences anything that can conflict. Every completed candidate goes to a
fresh reviewer that has not seen the implementer's reasoning. Blocking gaps go
back to the owner for the smallest sufficient repair, then the changed claims
receive fresh review. The coordinator accepts only after the integrated result
has current evidence.

You do not manage an agent roster or interpret competing success claims. You
receive one accepted result with proof, or the exact claim that remains open.

## The review kernel

```text
decision ← candidate accepted now + retained behavior now

gap ← an acceptance claim not settled by belonging evidence

while gap exists:
    cause ← smallest cause whose deletion leaves gap unexplained ∨ unresolved
    change ← smallest change whose deletion leaves decision unmet ∨ unproven
    reconsider only claims affected by cause or change

halt ; accept or withhold
```

The important idea is belonging evidence. Review proof belongs to the candidate
it actually observed. A repair invalidates evidence only for claims it could
affect, so the CODER Loop avoids both stale review and wasteful full-loop repetition.

## Why task families

The CODER Loop does not equate more agents with more throughput. A task family is one
coherent candidate with one owner and one proof surface. Independent families
can proceed together. Dependent or overlapping families are sequenced. If the
whole change is one coherent family, the CODER Loop uses one worker and one fresh
reviewer.

This preserves the useful part of multi-agent work while avoiding ownership
collisions, duplicated investigation, and coordination theater.

## Codex behavior

Implementation workers can inherit full conversation context; reviewers start
context-clean. Codex subagents share the workspace, so overlapping candidates
are sequenced while independent task families can proceed together.

Whenever a CODER Loop role needs inherited history through a fork but a different
model or reasoning effort, the CODER Loop forks a top-level Codex task and applies the
new settings on its first continuation. This is a loop-wide rule for initial
implementation, newly forked repair or integration work, and any other role
where both requirements coincide. The history and model selection both survive
because they occur as two explicit Codex operations.

Independent reviewers remain context-clean. If a reviewer needs another model,
The CODER Loop selects it directly when starting the fresh reviewer rather than forking
the coordinator or implementer history.

Temporary top-level Codex tasks created or forked for loop roles are archived
after their terminal result and evidence have been captured. The coordinator,
pre-existing user tasks, active repairs, and tasks awaiting user input remain
open.

The CODER Loop chooses from the models and reasoning settings exposed by the Codex route
it is actually using. It does not assume that every model in the wider platform
catalog is callable by either a collaboration subagent or a top-level task
continuation, and it does not require an advisor model or fixed agent count.

## Install

### Codex

```bash
codex plugin marketplace add transcendr/slopware-skills
codex plugin add coder-loop@slopware-skills
```

### skills.sh

```bash
npx skills add https://github.com/transcendr/slopware-skills/tree/main/plugins/coder-loop/skills/coder-loop -g -a codex
```

### Generic `~/.agents/skills` for Codex

```bash
git clone https://github.com/transcendr/slopware-skills.git
mkdir -p ~/.agents/skills
cp -R slopware-skills/plugins/coder-loop/skills/coder-loop ~/.agents/skills/coder-loop
```

## Works with other Slopware skills

- [MSW](../msw/README.md) admits task families, findings, and repairs only when
  deleting them would leave the contract unmet or unproven.
- [MSL](../msl/README.md) turns the coordinator's complete evidence into the
  final report the user must act on.
- [Codex Voice Optimizer](../codex-voice-optimizer/README.md) can route a change
  to an owning work task that runs the CODER Loop. The voice coordinator remains a voice
  coordinator and never becomes the CODER Loop implementation parent.

Every package remains optional and independently installable. The CODER Loop is absent
from the Claude Code marketplace because its role and context contracts depend
on Codex collaboration semantics.

## Why there is no hook or ledger

The CODER Loop depends on the current outcome, candidate, acceptance claims, ownership,
and host capabilities. A lifecycle hook cannot know those facts. A mandatory
ledger would record that the loop happened without making the candidate more
correct.

The skill therefore adds no hook, timer, status protocol, fixed model mapping,
or process artifact. Project-required evidence remains real candidate evidence,
not proof that an agent followed a ceremony.

## Postmortem routing calibration

After acceptance or a genuine terminal block, the CODER Loop assesses whether each
task-family classification and model assignment proved sufficient. It separates
model capability from limits caused by scope, evidence, authority, platform
capability, or an authoritative time boundary.

The postmortem can recommend one controlled change for the next comparable
assignment only when repeated comparable records show complete evidence,
stable scope, and no reasoning-required remediation. One successful task never
lowers a default, and independent review remains unchanged. The CODER Loop can read an
existing authorized `CODER_LEDGER.md`, but it does not require or create one.

## FAQ

### Is the CODER Loop just parallel agents plus code review?

No. Parallelism is optional. The mechanism is bounded ownership plus fresh
review of the exact candidate, followed by repair and targeted re-review until
every acceptance claim has current evidence.

### Does every task need several workers?

No. The CODER Loop never invents an agent count. One coherent task family gets one
worker. Additional workers exist only when their families can make independent
progress without overlapping ownership.

### What if Codex cannot create a fresh reviewer?

The CODER Loop stops and reports the missing capability. It does not pretend that an
implementer changing roles is independent review or create a top-level Codex
task without separate user authority.

### Does it require Opus, Sol, Terra, Luna, or another model lineup?

No. The CODER Loop assigns the minimum capable model from what Codex actually exposes,
subject to user and project policy. The role boundary matters more than a
brand-specific mapping.

### What happens to temporary Codex tasks?

The CODER Loop archives temporary top-level tasks it created or forked once their role is
finished and the coordinator has captured the result and evidence. It never
archives the coordinator, a pre-existing user task, an active repair, or a task
that is waiting for the user.

## License

[CC BY 4.0](../../LICENSE): use, adapt, redistribute, and commercialize this
skill however you want; keep credit to
[Slopware Engineer](https://x.com/aienginerd) / `@aienginerd`.

Free forever ♡
