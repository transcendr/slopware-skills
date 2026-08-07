# Slopware Skills

[![skills.sh installs](https://skills.sh/b/transcendr/slopware-skills)](https://skills.sh/transcendr/slopware-skills)

> Free forever ♡

Portable, individually installable skills and plugins for AI coding agents by
[Slopware Engineer](https://x.com/aienginerd).

## MSW: Minimum Sufficient Work

**All necessary work. Nothing beyond it.**

MSW is a lightweight execution kernel for AI agents. It binds a task to the
smallest complete contract, admits only work needed to meet or prove that
contract, and stops at the fixed point.

It applies to implementation, debugging, review, research, planning, and
documentation, not just code size. The original
[MSW Kernel post](https://x.com/aienginerd/status/2085342869850603672)
introduced the idea.

## Install MSW

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
