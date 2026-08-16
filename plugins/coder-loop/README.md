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
Use $coder-loop to implement this change with bounded task-family owners and fresh independent review.
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

## Learn it before running it

Start the teaching-only tutorial with:

```text
Start the CODER Loop tutorial.
```

The tutorial explains task families, fresh evaluation, targeted remediation,
authority, cleanup, postmortem routing, and the complete Slopware Dev Stack
before offering any live demonstration. It uses no project, repository, task,
collaboration, or installation tools unless you separately ask for a live
action.

You can also jump straight to the product family:

```text
Show me the Slopware Dev Stack.
```

[Tutorial contract](skills/coder-loop/references/workflows/tutorial.md)

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
affect, so the CODER Loop avoids both stale review and wasteful full-loop
repetition.

## Why task families

The CODER Loop does not equate more agents with more throughput. A task family
is one coherent candidate with one owner and one proof surface. Independent
families can proceed together. Dependent or overlapping families are
sequenced. If the whole change is one coherent family, the CODER Loop uses one
worker and one fresh reviewer.

This preserves the useful part of multi-agent work while avoiding ownership
collisions, duplicated investigation, and coordination theater.

## Codex behavior

Collaboration subagents are the standard mechanism for workers, repairs,
integration, and review. When the coordinator's execution profile fits, a
worker can inherit its task history with `fork_turns: "all"`. When inherited
working context must be paired with another model or reasoning effort, CODER
uses the tested Subagents V2 convention: `fork_turns: "99"` plus explicit
`model` and `reasoning_effort`.

Independent reviewers start context-clean with `fork_turns: "none"`. If a
reviewer needs another execution profile, CODER selects it directly when
starting that fresh reviewer instead of inheriting coordinator or implementer
reasoning.

With separate user permission, top-level Codex tasks can serve genuine
lifecycle needs such as independent addressability, project or worktree
placement, or exact task history outside the bounded collaboration context.
CODER never treats the need itself as task-creation authority. Any temporary
top-level fallback task is archived after its terminal result and evidence have
been captured. The coordinator, pre-existing user tasks, active repairs, and
tasks awaiting user input remain open.

The CODER Loop chooses from the models and reasoning settings exposed by the
Codex route it is actually using. It does not require an advisor model or fixed
agent count.

## Install

### Codex

This installs from the repository's free-form Git marketplace. It does not
require submission to the official plugin directory.

```bash
codex plugin marketplace add transcendr/slopware-skills
codex plugin add coder-loop@slopware-skills
```

### skills.sh

```bash
npx skills add https://github.com/transcendr/slopware-skills/tree/main/plugins/coder-loop/skills/coder-loop -g -a codex
```

The direct skill path keeps this Codex-only workflow independently installable
without adding it to the Claude Code marketplace.

### Generic `~/.agents/skills` for Codex

```bash
git clone https://github.com/transcendr/slopware-skills.git
mkdir -p ~/.agents/skills
cp -R slopware-skills/plugins/coder-loop/skills/coder-loop ~/.agents/skills/coder-loop
```

## The Slopware Dev Stack

> **Install one layer or compose the stack. Every skill works alone. Together
> they remove waste at every development boundary. Free forever.**

| Component | Stack role | Contribution |
| --- | --- | --- |
| [Codex Voice Optimizer](../codex-voice-optimizer/README.md) | Control plane | Hands-free intent, routing, authority, and material progress |
| **CODER Loop** | Development engine | Bounded implementation, independent evaluation, remediation, acceptance, and evolving model routing |
| [MSW Kernel](../msw/README.md) | Scope kernel | Necessary task families, claims, findings, repairs, and proof |
| [Timebox](../timebox/README.md) | Convergence envelope | One explicitly authorized AWT/CGP clock around the complete loop |
| [MSL Kernel](../msl/README.md) | Communication kernel | The final facts the user must understand or act on |

The product story is simple: CVO controls it. CODER builds it. MSW keeps it
necessary. Timebox makes an authorized run converge. MSL makes the result
clear.

When companions are available, CODER discovers them once and presents what is
active, available, or optional. MSW and direct-report MSL compose
automatically. Timebox remains dormant until you authorize a clock. CVO becomes
active only when a voice coordinator actually controls the owning CODER task.

With explicit permission, CODER can install any exact missing companion or the
full stack, verify installed and enabled state, and give you the invocation for
the required new Codex task. It never installs an unrequested package.

[Companion contract](skills/coder-loop/references/companions.md)

Every package remains optional and independently installable. The CODER Loop is
absent from the Claude Code marketplace because its role and context contracts
depend on Codex collaboration semantics.

## Why there is no hook or ledger

The CODER Loop depends on the current outcome, candidate, acceptance claims,
ownership, and host capabilities. A lifecycle hook cannot know those facts. A
mandatory ledger would record that the loop happened without making the
candidate more correct.

The skill therefore adds no hook, timer, status protocol, fixed model mapping,
or process artifact. Project-required evidence remains real candidate evidence,
not proof that an agent followed a ceremony.

## Postmortem routing calibration

After acceptance or a genuine terminal block, the CODER Loop assesses whether
each task-family classification and model assignment proved sufficient. It
separates model capability from limits caused by scope, evidence, authority,
platform capability, or an authoritative time boundary.

The postmortem can recommend one controlled change for the next comparable
assignment only when repeated comparable records show complete evidence,
stable scope, and no reasoning-required remediation. One successful task never
lowers a default, and independent review remains unchanged. The CODER Loop can
read an existing authorized `CODER_LEDGER.md`, but it does not require or
create one.

## FAQ

### Is the CODER Loop just parallel agents plus code review?

No. Parallelism is optional. The mechanism is bounded ownership plus fresh
review of the exact candidate, followed by repair and targeted re-review until
every acceptance claim has current evidence.

### Do I need the complete Slopware Dev Stack?

No. The CODER Loop runs by itself. Each companion changes one distinct
boundary, so you can install only the scope, convergence, communication, or
voice layer you want. CODER presents the available combination once and then
gets to work.

### Does every task need several workers?

No. The CODER Loop never invents an agent count. One coherent task family gets
one worker. Additional workers exist only when their families can make
independent progress without overlapping ownership.

### What if Codex cannot create a fresh reviewer?

The CODER Loop stops and reports the missing capability. It does not pretend
that an implementer changing roles is independent review or create a top-level
Codex task without separate user authority.

### Does it require Sol, Terra, Luna, or a fixed model lineup?

No. The CODER Loop assigns the minimum capable model from what Codex actually
exposes, subject to user and project policy. The role boundary matters more
than a brand-specific mapping.

### What happens to temporary Codex tasks?

Collaboration subagents handle normal loop roles, so most runs create no extra
top-level tasks. With explicit permission, a lifecycle need can use a temporary
top-level fallback. The CODER Loop archives that task once its role is finished
and the coordinator has captured the result and evidence. It never archives
the coordinator, a pre-existing user task, an active repair, or a task that is
waiting for the user.

## License

[CC BY 4.0](../../LICENSE): use, adapt, redistribute, and commercialize this
skill however you want; keep credit to
[Slopware Engineer](https://x.com/aienginerd) / `@aienginerd`.

Free forever ♡
