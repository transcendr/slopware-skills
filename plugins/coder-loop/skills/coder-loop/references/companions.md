# Slopware Dev Stack companions

The CODER Loop works alone. Optional Slopware companions improve distinct
boundaries without becoming hard dependencies:

- **MSW** is the scope kernel. It admits necessary task families, claims,
  findings, repairs, and proof.
- **Timebox** is the convergence envelope. It governs an explicitly authorized
  AWT/CGP clock around the loop.
- **MSL** is the communication kernel. It admits facts at the final
  user-facing boundary.
- **Codex Voice Optimizer**, or CVO, is the control plane. It routes committed
  voice intent to the owning CODER task and returns material state to the user.

No companion changes CODER ownership, independent review, evidence belonging,
or authority. There is no bundled copy, hook, background installer, or reduced
base behavior when a companion is unavailable.

## Discover the stack once

At activation, inspect the active skill catalog for the canonical skill names
`msw`, `timebox`, `msl`, and `codex-voice-optimizer`. Accept either a bare
standalone identity or its plugin-qualified identity:

- `msw` or `msw:msw`;
- `timebox` or `timebox:timebox`;
- `msl` or `msl:msl`;
- `codex-voice-optimizer` or
  `codex-voice-optimizer:codex-voice-optimizer`.

Treat the namespace as distribution metadata, not as a different companion.
Read each available companion's `SKILL.md` once before applying it. Catalog
omission of both accepted identities means unavailable to this task; it does
not prove that the plugin is absent from the machine.

Classify each companion by behavior rather than installation alone:

- **Active:** it governs the current loop now.
- **Available:** it is in the active catalog but still requires authority or
  the matching topology.
- **Optional:** it is unavailable to this task and can be installed with
  explicit permission.

MSW becomes active when available. MSL becomes active when CODER reports
directly to the user. Timebox is only available until the requester supplies
an AWT/CGP pair or an applicable project policy requires it. CVO is only active
when this task has actually been bound as an owning work task under a voice
coordinator.

Present the stack once during activation or initial loop setup, whichever
comes first. Lead with active behavior, then available behavior, then missing
companions. Preserve this functional order: MSW, Timebox, MSL, CVO.

When all companions are available but Timebox and CVO are not active, use:

> Stack ready: MSW controls work admission, MSL shapes the direct report,
> Timebox is available when you authorize a clock, and CVO can control the
> loop by voice.

When no companion is available, use:

> The CODER Loop works alone. Optional stack layers add MSW scope control,
> Timebox convergence, MSL reporting, and CVO voice control. I can install any
> of them with permission. All are free forever.

For partial combinations, state the same facts in one active or available
sentence and one optional sentence. Do not enumerate installation internals,
ask a setup question, or delay the loop. Do not repeat the stack message after
the user ignores, declines, or acknowledges it. Present it again only when the
user asks, starts the tutorial's stack section, or reaches the specific
contextual offer below.

## Apply MSW at work admission

Use MSW before admitting a task family, acceptance claim, reviewer finding,
repair, additional proof, or follow-up. Admit the claim only when deleting it
would leave the CODER contract unmet or unproven.

MSW's three-round fuse applies only when the MSW evaluator fails. It is not a
default limit on normal CODER review and remediation, which continues to its
acceptance fixed point, an explicit stop, or a genuine blocker.

Brief workers to apply `$msw` to their bounded family when it is available in
their task. Missing MSW never expands the family or stops the CODER Loop.

## Apply an authorized Timebox outside the loop

Never activate Timebox from task size, urgency, an estimate, or catalog
presence. When the requester supplies AWT/CGP or project policy requires it,
read the Timebox skill and place one fixed clock around the complete CODER
Loop.

The CODER coordinator owns the original clock. Workers and reviewers receive
relevant fixed boundaries but do not start replacement clocks. A separate
authorized monitor observes the CODER coordinator, never a voice coordinator,
worker, or reviewer. CGP remains closeout-only.

At the hard stop, stop loop work and withhold acceptance for every unsettled
claim. Report the strongest proven candidate and exact open claims. Time
pressure never converts incomplete or unproven work into acceptance.

When the user names a real work window but has not invoked Timebox, offer once:

> You named a fixed work window. Timebox can wrap this loop in an AWT/CGP
> clock if you want.

Do not offer Timebox merely because the task appears large or difficult.

## Apply MSL at the last user boundary

Preserve raw candidate, review, remediation, and belonging evidence throughout
the loop. Apply MSL only after the coordinator has made the acceptance decision
and before the result reaches the user.

For a direct CODER task:

```text
raw evidence -> CODER acceptance -> MSL fact admission -> user
```

Under CVO, send evidence-complete material state to the voice coordinator and
let CVO apply MSL at its coordinator-to-user boundary:

```text
raw evidence -> CODER acceptance -> CVO -> MSL fact admission -> user
```

Never apply MSL to evidence before review or compress it twice.

## Use CVO as the control plane

When CVO is active, the voice coordinator routes only committed user intent to
this owning CODER task. This task remains the CODER coordinator and owns
decomposition, workers, review, remediation, acceptance, cleanup, and
postmortem routing.

Return material progress, blockers, authority needs, and terminal results to
the voice coordinator. CVO may relay an authorized Timebox state but never
calculates, resets, or independently monitors the clock. CVO never addresses
CODER workers or reviewers directly and never archives this owning task.

If the user asks for hands-free control outside a CVO topology, offer CVO once.
Do not treat catalog presence as voice activation.

## Install after explicit permission

The CODER coordinator may configure its own optional stack after clear user
permission. Clear requests include "install MSW," "set up Timebox," "add MSL,"
"install CVO," or "install the full Slopware Dev Stack."

1. Inspect current state with `codex plugin marketplace list --json` and
   `codex plugin list --available --json`.
2. Remove every requested plugin already installed and enabled from pending
   work. Make no configuration change when nothing remains.
3. If `slopware-skills` is missing, add it with `codex plugin marketplace add
   transcendr/slopware-skills --json`. If it exists but a requested plugin is
   absent from the available list, run `codex plugin marketplace upgrade
   slopware-skills --json` and inspect again.
4. Install only the requested pending plugins with `codex plugin add
   <plugin>@slopware-skills --json`, where `<plugin>` is `msw`, `timebox`,
   `msl`, or `codex-voice-optimizer`.
5. Inspect state again and verify every requested plugin is installed and
   enabled. Report incomplete state honestly.
6. Tell the user that a new Codex task is required before newly installed
   skills become available, then provide the exact invocation for that task.

Never install an unrequested plugin. If direct installation is unavailable,
offer one lettered choice: A, put the exact commands in chat; B, generate a
ready-to-send prompt for another Codex task. Both paths name only the requested
plugins, verify installed and enabled state, and end with the new-task
invocation.

## Present the stack accurately

When the user asks what CODER supports, separate the CODER development engine
from its optional stack layers. Never describe MSW, Timebox, MSL, or CVO as a
prerequisite. Never call all four kernels or workflows: they are a scope
kernel, convergence envelope, communication kernel, and control plane.
