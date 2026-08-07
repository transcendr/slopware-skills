# MSW Hook

> **Optional session-boundary reinforcement for the MSW Kernel.**

MSW Hook injects one compact reminder when a session context starts. It is a
separate package so the core
[MSW Kernel](../msw/README.md) remains completely hook-free.

[Inspect the exact hook](hooks/hooks.json) ·
[View all Slopware Skills](../../README.md)

## What it does

The hook reinforces four things:

- define the requested outcome and smallest proof;
- admit only work required by that contract;
- prove every necessary claim; and
- stop at the fixed point and report honestly.

The `SessionStart` lifecycle event also covers context boundaries such as
resume, clear, and compaction. The hook runs once at that boundary. It does not
run before tools, after edits, or on every prompt.

There are no modes, daemons, dependencies, status lines, state files, or
persistent background processes.

## Install

Install the [MSW Kernel](../msw/README.md) first, then add the hook only if you
want automatic reinforcement.

### Codex

```bash
codex plugin marketplace add transcendr/slopware-skills
codex plugin add msw@slopware-skills
codex plugin add msw-hook@slopware-skills
```

After starting Codex, open `/hooks`, inspect the command, and trust the single
`SessionStart` hook.

### Claude Code

```bash
claude plugin marketplace add transcendr/slopware-skills
claude plugin install msw@slopware-skills
claude plugin install msw-hook@slopware-skills
```

The hook is a lifecycle plugin, so it does not have a skills.sh or generic
Agent Skills installation path.

## Remove the hook

Remove or disable only `msw-hook` to return to explicit MSW invocation. The
separately installed `msw` skill remains available.

## License

[CC BY 4.0](../../LICENSE): use, adapt, redistribute, and commercialize this
plugin however you want; keep credit to
[Slopware Engineer](https://x.com/aienginerd) / `@aienginerd`.

Free forever ♡
