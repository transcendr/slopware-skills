# MSL Kernel: Minimum Sufficient Language

> **Everything the reader must act on. Nothing they must wade through.**

Minimum Sufficient Language is the principle. The MSL Kernel is the compact
instruction set and program that applies the principle to anything an AI agent
writes for a reader.

It is the sibling of the [MSW Kernel](../msw/README.md). MSW decides what work
is necessary; MSL decides what language is necessary to report it. The kernel
gives the agent one admission test, four ways to say a thing, and a concrete
stopping condition, without imposing a house style or a template.

[Read the canonical skill](skills/msl/SKILL.md) ·
[View all Slopware Skills](../../README.md)

## The kernel

```text
reader ← the audience + everything already on their record

partition every fact:
    theirs     ← changes reader's model of
                 world-state ∨ risk-bound ∨ open decision
    instrument ← everything else

close instrument ; draft from theirs alone

for each f in theirs:
    emit f as one move ∈ {action, verification, judgment, state}

if ∃ named reader obligation:
    place handoff where that obligation begins

halt when every claim is checkable ∧ the ledger reconciles
```

Every fact is partitioned before a sentence is written. A fact reaches the
reader only by changing what they believe about the state of the world, how
tightly a risk was bound, or what decision remains. Everything describing how
the work was carried out, including tools, stages, superseded designs,
abandoned attempts, and cases tested, goes in the instrument column. That
column is closed while drafting.

That partition is the whole trick, and it is a gate rather than a rule. Telling
an agent not to narrate the tooling does not work, because contrast and
step-by-step feel like proof that the work was careful. Removing those facts
from view before drafting does work.

## Use MSL

Invoke the skill when the output is for a reader:

```text
Use $msl to write this update:
<facts>
```

It applies in both directions. Reporting to your own user while work is in
flight is the same program as drafting a ticket comment, a pull request
write-up, an incident note, or an email to someone outside the company. Only
the reader changes, and the reader is bound first.

When a draft drifts back toward machinery, one line restores it:

> Re-partition: what here is the instrument, not the reader's?

## In the Slopware Dev Stack

MSL is the communication kernel. A direct [CODER
Loop](../coder-loop/README.md) applies it after raw implementation and review
evidence settles acceptance. When [Codex Voice
Optimizer](../codex-voice-optimizer/README.md) controls CODER, CVO owns the
single final MSL boundary before speech.

With [Timebox](../timebox/README.md), MSL reports only clock facts that change
the reader's state or decision; the working task still owns the clock. Pair it
with [MSW](../msw/README.md) when work admission should be as disciplined as
the resulting language.

Every layer works alone and remains independently installable. Compose only
the layers you want. Free forever.

## What it does to a draft

A safeguard stops arriving as a walkthrough and starts arriving as a bound:
what it could touch, what it could not, what was confirmed after. Verification
stops being diligence claimed and starts being an observation stated. Numbers
are introduced once and reconcile in view. What remains carries why it remains
and the decision needed to act on it. A mention lands where the named reader's
obligation begins, so everything above it is available and everything from it
forward is necessary.

## Install

### Codex

This uses the free-form Git marketplace in the repository. It does not require
submission to an official marketplace.

```bash
codex plugin marketplace add transcendr/slopware-skills
codex plugin add msl@slopware-skills
```

### Claude Code

```bash
claude plugin marketplace add transcendr/slopware-skills
claude plugin install msl@slopware-skills
```

### skills.sh

```bash
npx skills add transcendr/slopware-skills --skill msl -g
```

### Generic `~/.agents/skills`

```bash
git clone https://github.com/transcendr/slopware-skills.git
mkdir -p ~/.agents/skills
cp -R slopware-skills/plugins/msl/skills/msl ~/.agents/skills/msl
```

## Why there is no hook

MSL is hook-free by design. It applies when there is a reader, which is a
judgment about the current output rather than a session boundary. A hook firing
on start, resume, or compaction would reinforce it at moments when nothing is
being written, and stay silent at the moment it matters. Invoke it when you
want it, or put it in your `AGENTS.md` if you want it standing.

## FAQ

### Is this a style guide?

No. A style guide tells you how sentences should look. The kernel tells you
which facts are admissible and what shape each one takes when it leaves. Length,
tone, and structure fall out of the partition, which is why the same program
produces both a brief progress note and a full closeout without switching modes.

### Why not just say "write clearly, avoid jargon"?

Because that instruction loses to the writer's instincts, reliably. An agent
that must show a change was safe will reach for the superseded design and the
step-by-step, since both feel like evidence. A prohibition asks it to resist a
fact it is looking at. A partition removes the fact before drafting starts.

### Does it force everything to be short?

No, and it never imposes a count. Brevity is a consequence of the admission
test, never a target. A fact that changes what the reader believes stays, however
long that makes the result; a fact that only proves effort goes, however short.

### Should this go in my AGENTS.md?

Yes, if you want every report and draft to arrive this way. Like MSW, it stays
principally opt-in and benefits from a short reinforcement when a draft drifts.

## License

[CC BY 4.0](../../LICENSE): use, adapt, redistribute, and commercialize this
skill however you want; keep credit to
[Slopware Engineer](https://x.com/aienginerd) / `@aienginerd`.

Free forever ♡
