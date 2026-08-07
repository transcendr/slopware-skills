# Slopware Skills

[![skills.sh installs](https://skills.sh/b/transcendr/slopware-skills)](https://skills.sh/transcendr/slopware-skills)

> Free forever ♡

Portable, individually installable skills and plugins for AI coding agents by
[Slopware Engineer](https://x.com/aienginerd).

## MSW Kernel: Minimum Sufficient Work

**All necessary work. Nothing beyond it.**

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

## Repository layout

```text
.agents/plugins/marketplace.json    Codex marketplace
.claude-plugin/marketplace.json     Claude Code marketplace
plugins/
  msw/
    .codex-plugin/plugin.json
    .claude-plugin/plugin.json
    skills/msw/SKILL.md
  msw-hook/
    .codex-plugin/plugin.json
    .claude-plugin/plugin.json
    hooks/hooks.json
```

Each future package gets its own `plugins/<name>/` directory and marketplace
entry, so skills and plugins remain individually installable while living in
one repository.

## License

[CC BY 4.0](LICENSE): use, adapt, redistribute, and commercialize these skills
however you want; keep credit to Slopware Engineer / `@aienginerd`.

Free forever ♡
