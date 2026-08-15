# Slopware Skills

[![skills.sh installs](https://skills.sh/b/transcendr/slopware-skills)](https://skills.sh/transcendr/slopware-skills)

> Free forever ♡

Portable, individually installable skills and plugins for AI coding agents by
[Slopware Engineer](https://x.com/aienginerd).

## Packages

| Package | Type | Purpose |
| --- | --- | --- |
| [MSW Kernel](plugins/msw/README.md) | Skill and plugin | Admit only necessary work, require proof, and stop at the fixed point. |
| [MSW Hook](plugins/msw-hook/README.md) | Optional plugin | Reinforce the MSW Kernel once at session context boundaries. |
| [MSL Kernel](plugins/msl/README.md) | Skill and plugin | Report only what the reader must act on, in a form they can check. |
| [Timebox](plugins/timebox/README.md) | Skill and plugin | Converge authorized work inside AWT and a closeout-only CGP. |
| [CODER Loop](plugins/coder-loop/README.md) | Codex skill and plugin | Optimize Codex development through bounded work, fresh evaluation, and evidence-scoped remediation. |
| [Codex Voice Optimizer](plugins/codex-voice-optimizer/README.md) | Codex skill and plugin | Optimize Codex Voice for hands-free orchestration across owning work threads. |

Each package has its own documentation and remains independently installable.

---

## MSW Kernel: Minimum Sufficient Work

> **All necessary work. Nothing beyond it.**

[Package documentation](plugins/msw/README.md) ·
[Skill source](plugins/msw/skills/msw/SKILL.md)

Minimum Sufficient Work is the principle. The MSW Kernel is the compact
instruction set and program that applies the principle to agent work.

The MSW Kernel is a lightweight alternative to heavier, more invasive
agent-control systems. Its small instruction surface can be just as effective,
and arguably more effective, because it gives the agent one necessity test, a
proof obligation, and a clear stopping condition without layering on another
workflow.

It applies to implementation, debugging, review, research, planning, and
documentation, not just code size. The original
[MSW Kernel post](https://x.com/aienginerd/status/2085342869850603672)
introduced the idea.

## Install the MSW Kernel

### Codex

This uses a free-form Git marketplace directly from this repository. It does
not require submission to or verification for an official marketplace.

```bash
codex plugin marketplace add transcendr/slopware-skills
codex plugin add msw@slopware-skills
```

Add automatic reinforcement only if you want it:

```bash
codex plugin add msw-hook@slopware-skills
```

Start Codex, open `/hooks`, and trust the single `SessionStart` hook. The
`msw` plugin remains hook-free.

### Claude Code

```bash
claude plugin marketplace add transcendr/slopware-skills
claude plugin install msw@slopware-skills
```

Add automatic reinforcement only if you want it:

```bash
claude plugin install msw-hook@slopware-skills
```

The `msw` plugin remains hook-free.

### skills.sh

This installs the portable, hook-free Agent Skills version:

```bash
npx skills add transcendr/slopware-skills --skill msw -g
```

The installer supports Codex, Claude Code, and other Agent Skills-compatible
clients.

### Generic `~/.agents/skills`

```bash
git clone https://github.com/transcendr/slopware-skills.git
mkdir -p ~/.agents/skills
cp -R slopware-skills/plugins/msw/skills/msw ~/.agents/skills/msw
```

## Optional hook

The separate `msw-hook` plugin injects one compact MSW reminder when a session
context starts, resumes, clears, or compacts. It does not run before tools,
after edits, or on every user prompt. There are no modes, daemons, dependencies,
status lines, or state files.

Install only `msw` when you want explicit invocation with no hook.

## FAQ

### How is this different from heavier solutions like Ponytail?

Ponytail and similar systems can introduce modes, decision ladders, persistent
reinforcement, invasive hooks, and highly opinionated conventions. The MSW
Kernel stays at a lower level: define the contract, test necessity, prove the
required work, and halt. This avoids overthinking, process doom spirals, and
conventions that can clash with your own while remaining applicable beyond
coding tasks.

### What makes this work?

The contract converts an open-ended request into the smallest provable outcome.
The deletion test forces every proposed action to justify itself against that
outcome instead of habit, reviewer authority, or imagined future needs. The
proof obligation prevents minimalism from becoming corner-cutting. The fixed
point gives the agent a concrete stopping condition, so it neither stops early
nor keeps expanding the task.

### Should this go in my AGENTS.md?

Absolutely, if you want MSW as a standing project or global instruction. It
will not permanently change model behavior; MSW remains principally opt-in and
usually benefits from reinforcement during normal work and discussion with the
agent. The optional lightweight `msw-hook` can reduce how often you need to
reinforce it, but evaluate the hook carefully in your own environment before
enabling it.

### If I do not use the hook, what is the best way to use MSW?

Apply the MSW skill at the start of the task. Whenever the agent is planning,
implementing, working through a test and remediation loop, or considering new
code, artifacts, or process, reinforce it with one line:

> Remember to follow the MSW deletion rule for all claims: no exceptions.

Repeat that line when needed during normal work and discussion. It restates the
kernel's necessity test without adding persistent machinery.

---

## MSL Kernel: Minimum Sufficient Language

> **Everything the reader must act on. Nothing they must wade through.**

[Package documentation](plugins/msl/README.md) ·
[Skill source](plugins/msl/skills/msl/SKILL.md)

Minimum Sufficient Language is the principle. The MSL Kernel is the compact
instruction set and program that applies the principle to anything an agent
writes for a reader.

MSL is the sibling of MSW. MSW decides what work is necessary; MSL decides what
language is necessary to report it. Both are kernels rather than workflows, and
neither imposes a template.

```text
Use $msl to write this update:
<facts>
```

The kernel binds the reader first, including everything already on their record,
then partitions every fact before a sentence is written. A fact reaches the
reader only by changing what they believe about the state of the world, how
tightly a risk was bound, or what decision remains. Everything describing how
the work was carried out, including tools, stages, superseded designs,
abandoned attempts, and cases tested, is instrument. The instrument column is
closed while drafting.

That partition is the whole trick, and it is a gate rather than a rule. Telling
an agent to avoid narrating its tooling does not hold, because contrast and
step-by-step feel like proof that the work was careful. Removing those facts
from view before drafting does hold.

The same program serves a progress note to your own user and a closeout comment,
a pull request write-up, an incident note, or an email to someone outside the
company. Only the reader changes. Length is never imposed; it falls out of the
partition.

## Install the MSL Kernel

### Codex

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

---

## Timebox: AWT/CGP Execution

> **Required work inside an authorized clock.**

[Package documentation](plugins/timebox/README.md) ·
[Skill source](plugins/timebox/skills/timebox/SKILL.md)

Timebox is a hook-free execution protocol for work that must converge inside a
requester-supplied clock. Available Work Time (AWT) contains the substantive
work and its proof. Closeout Grace Period (CGP) is a shorter buffer reserved for
an already-converged deliverable, a delayed final check, narrow organization,
or communicating the result.

For most users, the experience is simple:

```text
Use $timebox with AWT 45 minutes and CGP 5 minutes.
<task>
```

When the AWT/CGP context is already clear, shorthand works too:

```text
Timebox this 45/5: <task>
```

The agent validates the pair, records fixed deadlines, states the outcome and
smallest proof, then works normally. It quietly checks whether the required
result will finish inside AWT, cuts optional depth when necessary, reserves CGP
for closeout, and stops with an honest status at the hard stop. If the task is
complete and proven early, it stops early.

The optional independent-monitor design was created with the Codex app in mind.
Codex can use a separate monitor task, task reading and messaging, and a
same-task heartbeat to watch the fixed clock without interrupting the working
task. The same approach can work in any agent harness with equivalent
observation, wake, and messaging capabilities. Everyone else gets the
lightweight self-monitoring workflow with no background process.

The package has no hook. A valid timebox depends on the requester-supplied
durations, actual start, task contract, and live progress. Session and tool
hooks do not have that complete context, so an always-on hook would be more
invasive and less reliable than the skill itself.

## Install Timebox

### Codex

```bash
codex plugin marketplace add transcendr/slopware-skills
codex plugin add timebox@slopware-skills
```

### Claude Code

```bash
claude plugin marketplace add transcendr/slopware-skills
claude plugin install timebox@slopware-skills
```

### skills.sh

```bash
npx skills add transcendr/slopware-skills --skill timebox -g
```

### Generic `~/.agents/skills`

```bash
git clone https://github.com/transcendr/slopware-skills.git
mkdir -p ~/.agents/skills
cp -R slopware-skills/plugins/timebox/skills/timebox ~/.agents/skills/timebox
```

---

## CODER Loop

> **Codex Optimized Development, Evaluation, and Remediation.**

[Package documentation](plugins/coder-loop/README.md) ·
[Skill source](plugins/coder-loop/skills/coder-loop/SKILL.md)

The CODER Loop turns complex implementation into coherent task families with one owner
each, then sends every completed candidate through a fresh independent review.
Only observations that leave an acceptance claim unmet or unsupported become
repair work. After a repair, the CODER Loop rechecks the claims that could have changed
instead of discarding unrelated evidence or repeating the entire review for
show.

The parent remains orchestration-only and owns final acceptance. Workers own
implementation, reviewers stay read-only, and delegation never expands commit,
publication, deployment, or other external-write authority.

Temporary top-level Codex tasks created or forked for CODER Loop roles are archived
after their terminal result and evidence have been captured. A postmortem then
uses the completed loop evidence to calibrate future model routing without
weakening independent review or changing a default from one success.

The CODER Loop uses Codex collaboration without a fixed agent count or hard-coded model
roster. If the task is one coherent family, it uses one worker and one fresh
reviewer. If Codex cannot supply a fresh review context, the skill stops and
does not pretend that self-review is independent.

## Install the CODER Loop

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

---

## Codex Voice Optimizer

> **You speak. The coordinator routes. The work threads own the work.**

[Package documentation](plugins/codex-voice-optimizer/README.md) ·
[Skill source](plugins/codex-voice-optimizer/skills/codex-voice-optimizer/SKILL.md) ·
[Original X post](https://x.com/aienginerd/status/2086442654779191575)

Codex Voice Optimizer upgrades one ChatGPT Voice task into an ear-first control
surface for engineering work. Its always-active base layer keeps spoken updates
concise, routes substantive work to owning threads, verifies current task state,
preserves explicit authority, and lets you interrupt task waiting simply by
speaking.

Free-form orchestration is the default. Named workflows install additional
structure only when invoked: Freeway derives parallel work lanes from genuinely
independent work, Decision Walkthrough closes material authority choices before
implementation, and Tutorial explains the system before any optional live
demonstration. Every workflow inherits the optimized base behavior and role
contracts.

For codebase work, the coordinator can discover the relevant Codex project and
place every newly authorized owning thread there. Project selection establishes
placement; it never authorizes task creation.

The change-and-research topology from the original workflow remains a reference
example, not a default or limit. Work threads can communicate directly when
their lanes have a real dependency, while material progress returns through the
voice coordinator.

### Companion kernels

Codex Voice Optimizer works alone, then connects whichever optional kernels are
available. MSL improves what you hear. MSW improves how the work threads work.

```text
You -> CVO routing -> MSW work admission -> work-thread evidence
    -> MSL fact admission -> CVO speech
```

On activation or first workstream setup, CVO announces the active combination
once and continues. If a companion is missing, you can say "install MSL,"
"install MSW," or "install both companions." With permission, the coordinator
can install the exact requested plugin, verify it, and tell you to start a new
Codex task. There is no hard dependency, hook, background installer, or
repeated prompt.

[Companion contract](plugins/codex-voice-optimizer/skills/codex-voice-optimizer/references/companions.md) ·
[MSL Kernel](plugins/msl/README.md) ·
[MSW Kernel](plugins/msw/README.md)

```text
Use $codex-voice-optimizer to coordinate this workstream through my existing
Codex tasks.
This work belongs to my <project> Codex project. Keep any new work tasks there.
```

The full experience requires ChatGPT Voice in the Codex desktop app and access
to project discovery, project-scoped task creation, and persistent task listing,
reading, messaging, and interruptible waiting. The package is intentionally
absent from the Claude Code marketplace because its contract is Codex-specific.

## Install Codex Voice Optimizer

### Codex

```bash
codex plugin marketplace add transcendr/slopware-skills
codex plugin add codex-voice-optimizer@slopware-skills
```

### skills.sh

```bash
npx skills add https://github.com/transcendr/slopware-skills/tree/main/plugins/codex-voice-optimizer/skills/codex-voice-optimizer -g -a codex
```

The direct GitHub path keeps this Codex-only skill independently installable
without adding it to the Claude Code marketplace.

### Generic `~/.agents/skills` for Codex

```bash
git clone https://github.com/transcendr/slopware-skills.git
mkdir -p ~/.agents/skills
cp -R slopware-skills/plugins/codex-voice-optimizer/skills/codex-voice-optimizer ~/.agents/skills/codex-voice-optimizer
```

The plugin is hook-free. The coordinator role must be bound explicitly to one
voice task, a current workstream, named owners, and exact authority; a global
lifecycle hook cannot determine those safely.

---

## Repository layout

```text
.agents/plugins/marketplace.json    Codex marketplace
.claude-plugin/marketplace.json     Claude Code marketplace
plugins/
  msw/
    .codex-plugin/plugin.json
    .claude-plugin/plugin.json
    README.md
    skills/msw/SKILL.md
  msw-hook/
    .codex-plugin/plugin.json
    .claude-plugin/plugin.json
    README.md
    hooks/hooks.json
  msl/
    .codex-plugin/plugin.json
    .claude-plugin/plugin.json
    README.md
    skills/msl/SKILL.md
  timebox/
    .codex-plugin/plugin.json
    .claude-plugin/plugin.json
    README.md
    skills/timebox/
      SKILL.md
      references/independent-monitor.md
  coder-loop/
    .codex-plugin/plugin.json
    README.md
    skills/coder-loop/
      SKILL.md
      references/
        codex.md
        postmortem.md
        review-kernel.md
        role-contracts.md
  codex-voice-optimizer/
    .codex-plugin/plugin.json
    README.md
    skills/codex-voice-optimizer/
      SKILL.md
      references/
        codex-app.md
        companions.md
        voice-coordinator.md
        work-thread.md
        workflows/
          decision-walkthrough.md
          freeway.md
          tutorial.md
```

Each future package gets its own `plugins/<name>/` directory and marketplace
entry, so skills and plugins remain individually installable while living in
one repository.

## License

[CC BY 4.0](LICENSE): use, adapt, redistribute, and commercialize these skills
however you want; keep credit to Slopware Engineer / `@aienginerd`.

Free forever ♡
