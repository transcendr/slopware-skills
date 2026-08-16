# Timebox: AWT/CGP Execution

> **Required work inside an authorized clock.**

Timebox is a hook-free execution protocol for work that must converge inside a
requester-supplied clock. It uses Available Work Time (AWT) for substantive
work and a shorter Closeout Grace Period (CGP) for closeout only.

[Read the canonical skill](skills/timebox/SKILL.md) ·
[Read the independent-monitor design](skills/timebox/references/independent-monitor.md) ·
[View all Slopware Skills](../../README.md)

## How it feels to use

For most users, invoking Timebox is the entire setup:

```text
Use $timebox with AWT 45 minutes and CGP 5 minutes.
<task>
```

When the AWT/CGP context is already clear, shorthand works too:

```text
Timebox this 45/5: <task>
```

The agent then:

1. validates the supplied durations;
2. fixes the original start, normal deadline, and hard stop;
3. states the requested outcome and smallest proof;
4. works normally while quietly checking its completion forecast;
5. cuts optional depth if the normal deadline is at risk;
6. reserves CGP for closeout; and
7. stops with an honest completion status at the hard stop.

If the task is complete and proven early, the agent stops early. Timebox does
not create work merely to fill the available window.

## AWT and CGP

**Available Work Time** is the primary window. Substantive work, verification,
organization, and delivery belong inside AWT.

**Closeout Grace Period** is a shorter buffer after AWT. It is only for an
already-converged deliverable, an unexpectedly delayed final check, narrow
closeout organization, or communicating the result. It is never a second work
window.

The agent never invents durations or silently repairs an invalid pair. The
original clock does not reset after a resume, compaction, tool delay, or monitor
wake.

## Optional independent monitor

The normal experience is self-monitoring inside the working agent. No
background process is required.

The independent-monitor design was created with the Codex app in mind. Codex
can provide a separate monitor task, task reading and messaging, and a
same-task heartbeat. The monitor watches the fixed clock and sends a correction
only when the trajectory, scope, evidence, or deadline requires one.

The same design can work in any agent harness that provides an isolated
observer, access to the working task's progress, a reliable same-context wake,
and a way to message the working task. When those capabilities are unavailable,
the skill uses its lightweight self-monitoring workflow.

## Why there is no hook

A valid timebox depends on requester-supplied durations, the actual task start,
the task contract, and live progress. Session and tool hooks do not have that
complete context. An always-on hook would therefore be more invasive and less
reliable than explicit skill invocation.

The package has no hook, daemon, timer process, MCP server, runtime dependency,
or persistent state.

## In the Slopware Dev Stack

Timebox is the convergence envelope. Around the [CODER
Loop](../coder-loop/README.md), one authorized AWT/CGP clock belongs to the
CODER coordinator and wraps implementation, evaluation, and remediation.
Workers and reviewers never reset it. At the hard stop, open acceptance claims
remain open.

Under [Codex Voice Optimizer](../codex-voice-optimizer/README.md), the owning
task calculates the clock while CVO only relays established material state.
[MSW](../msw/README.md) decides what work is necessary inside the clock, and
[MSL](../msl/README.md) can shape user-facing clock updates.

Every layer works alone and remains independently installable. Free forever.

## Install

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

## Works with MSW

Timebox works independently. When both skills are installed,
[MSW](../msw/README.md) decides what work is necessary, while Timebox governs
how that necessary work converges inside the authorized clock.

## License

[CC BY 4.0](../../LICENSE): use, adapt, redistribute, and commercialize this
skill however you want; keep credit to
[Slopware Engineer](https://x.com/aienginerd) / `@aienginerd`.

Free forever ♡
