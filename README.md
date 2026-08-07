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
| [Timebox](plugins/timebox/README.md) | Skill and plugin | Converge authorized work inside AWT and a closeout-only CGP. |

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
  timebox/
    .codex-plugin/plugin.json
    .claude-plugin/plugin.json
    README.md
    skills/timebox/
      SKILL.md
      references/independent-monitor.md
```

Each future package gets its own `plugins/<name>/` directory and marketplace
entry, so skills and plugins remain individually installable while living in
one repository.

## License

[CC BY 4.0](LICENSE): use, adapt, redistribute, and commercialize these skills
however you want; keep credit to Slopware Engineer / `@aienginerd`.

Free forever ♡
