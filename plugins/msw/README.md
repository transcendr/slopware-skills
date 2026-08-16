# MSW Kernel: Minimum Sufficient Work

> **All necessary work. Nothing beyond it.**

Minimum Sufficient Work is the principle. The MSW Kernel is the compact
instruction set and program that applies the principle to AI agent work.

It is a lightweight alternative to heavier, more invasive agent-control
systems. The kernel gives the agent one necessity test, a proof obligation, and
a concrete stopping condition without imposing a larger workflow.

[Read the canonical skill](skills/msw/SKILL.md) ·
[View all Slopware Skills](../../README.md)

## The kernel

```text
contract ← the requested outcome + the smallest criteria that prove it

while ∃ claim c : deleting c leaves contract unmet ∨ unproven
      do c ; prove c

halt ; report
```

Every proposed action enters as a claim. The action is admitted only when
deleting it would leave the requested outcome unmet or unproven. Necessary work
must be completed and proven; unnecessary work is rejected. The agent stops
when the contract is proven and no remaining claim passes.

The kernel applies to implementation, debugging, review, research, planning,
and documentation, not only to code size. The original
[MSW Kernel post](https://x.com/aienginerd/status/2085342869850603672)
introduced the idea.

## Use MSW

Invoke the skill at the start of a task:

```text
Use $msw to complete this task:
<task>
```

When the agent starts expanding the scope or repeating work, reinforce the core
test with one line:

> Remember to follow the MSW deletion rule for all claims: no exceptions.

## In the Slopware Dev Stack

MSW is the scope kernel. Inside the [CODER Loop](../coder-loop/README.md), it
admits necessary task families, acceptance claims, reviewer findings, repairs,
and proof. Under [Timebox](../timebox/README.md), MSW decides what work remains
necessary while the authorized clock governs convergence.

[Codex Voice Optimizer](../codex-voice-optimizer/README.md) applies MSW to
coordination and owning work while retaining voice routing, project placement,
roles, authority, and speech. Add [MSL](../msl/README.md) when the final
evidence should be filtered for the reader or listener.

Every layer works alone and remains independently installable. Compose only
the layers you want. Free forever.

## Install

### Codex

This uses the free-form Git marketplace in the repository. It does not require
submission to an official marketplace.

```bash
codex plugin marketplace add transcendr/slopware-skills
codex plugin add msw@slopware-skills
```

### Claude Code

```bash
claude plugin marketplace add transcendr/slopware-skills
claude plugin install msw@slopware-skills
```

### skills.sh

```bash
npx skills add transcendr/slopware-skills --skill msw -g
```

### Generic `~/.agents/skills`

```bash
git clone https://github.com/transcendr/slopware-skills.git
mkdir -p ~/.agents/skills
cp -R slopware-skills/plugins/msw/skills/msw ~/.agents/skills/msw
```

## Optional reinforcement hook

The MSW skill is hook-free. Install the separate
[MSW Hook](../msw-hook/README.md) only if you want one compact reminder when a
session starts, resumes, clears, or compacts.

The hook does not run before tools, after edits, or on every user prompt. There
are no modes, daemons, dependencies, status lines, or state files.

## FAQ

### How is this different from heavier solutions like Ponytail?

Ponytail and similar systems can introduce modes, decision ladders, persistent
reinforcement, invasive hooks, and highly opinionated conventions. The MSW
Kernel stays at a lower level: define the contract, test necessity, prove the
required work, and halt. This avoids overthinking, process doom spirals, and
conventions that can clash with your own.

### What makes this work?

The contract converts an open-ended request into the smallest provable outcome.
The deletion test forces every proposed action to justify itself against that
outcome instead of habit, reviewer authority, or imagined future needs. The
proof obligation prevents minimalism from becoming corner-cutting. The fixed
point gives the agent a concrete stopping condition.

### Should this go in my AGENTS.md?

Absolutely, if you want MSW as a standing project or global instruction. It
will not permanently change model behavior; MSW remains principally opt-in and
usually benefits from reinforcement during normal work and discussion. The
optional hook can reduce how often you need to reinforce it, but evaluate the
hook carefully before enabling it.

## License

[CC BY 4.0](../../LICENSE): use, adapt, redistribute, and commercialize this
skill however you want; keep credit to
[Slopware Engineer](https://x.com/aienginerd) / `@aienginerd`.

Free forever ♡
