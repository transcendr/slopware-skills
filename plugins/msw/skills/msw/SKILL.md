---
name: msw
description: Apply the Minimum Sufficient Work (MSW) principle through the MSW Kernel to scope, execute, verify, and stop agent work. State the requested outcome and smallest proof, admit a claim only when deleting it would leave the contract unmet or unproven, do and prove each necessary claim, and halt at the fixed point. Use for implementation, debugging, review, research, planning, documentation, or any task where scope control, proportional evidence, or avoiding overwork matters. Also use when the user says MSW, Minimum Sufficient Work, do only what is necessary, avoid over-engineering, or stop when the result is proven.
---

# MSW: the Kernel

Minimum Sufficient Work is the principle. The MSW Kernel is the instruction set
and program that applies it.

## Program: complete

```text
contract ← the requested outcome + the smallest criteria that prove it

while ∃ claim c : deleting c leaves contract unmet ∨ unproven
      do c ; prove c

halt ; report
```

## Definitions: no behavior lives here, only meaning

**contract**: the requested outcome and the smallest set of acceptance criteria
that would prove it, stated before any work. The sole source of necessity; a
ceiling as much as a floor. If the request is ambiguous: attended → ask;
unattended → bind the smallest reading consistent with stated intent and record
the assumption.

**claim**: anything petitioning to become work: a plan step, a change, a test, a
reviewer's P1, a discovered edge case, your own instinct that one more pass
would help. Everything enters as this type. Nothing enters as a verdict.

**deleting c leaves contract unmet ∨ unproven**: the only test. A claim passes
solely by breaking the contract, reproducibly, within the task's actual inputs
and environment. Severity is derived from the contract, never inherited from
whoever raised the claim. *Useful*, *thorough*, and *possible* are not aliases
for *necessary*. A claim that fails receives one line in the report, never a
fix, an investigation, or a deferred follow-up.

**do ; prove**: the smallest reliable act that closes the gap, and evidence
sized to the claim it settles. An unproven act keeps its claim alive; a proven
one closes it, and re-proving a closed claim is itself an inadmissible claim.

**halt**: the fixed point: contract proven, no remaining claim passes. Not
reviewer silence; not exhausted imagination. Halting before the fixed point and
looping past it are the same bug, mirrored.

**report**: the outcome against the contract; the proof; rejected claims worth
the user's attention, one line each. Nothing else.

## Fuses: outside the program, for when its evaluator fails

```text
rounds = 3            → halt anyway ; report open items, do not chase them
claim born in round n+1, visible in round n   → rejected
```

## No unauthoritative limits

Never invent a limit. A cap, threshold, quota, budget, timeout, retry or round
count, file or line count, acceptance-criterion count, agent count, or similar
constraint is admissible only when its exact value is:

- explicitly required by the requester;
- imposed by an applicable technical or platform contract;
- defined by authoritative project policy; or
- derived from measured evidence necessary to meet or prove the task contract.

State the authority or derivation whenever proposing or applying a limit. If no
authority exists, omit the limit and use the MSW necessity test. Metrics may be
reported as evidence, but they must not become gates, defaults, targets, or
recommendations through agent intuition. Examples and representative
proportions never become defaults. If a necessary limit is an unresolved owner
choice, ask; do not manufacture a value.

## Contract integrity

Distinguish the deliverable's requirements from the state of the instance
used to build or prove it. Necessity at one scope does not establish
necessity at the other.

Justify delivered responsibilities by the established intended use or
supported lifecycle, independently of the current run's incidental history.
Development evidence can reveal required failure, recovery, or upgrade
behavior. Those obligations need justification beyond rescuing this run.

Keep necessary, authorized setup or intervention at its own scope.
Preserving a particular development instance is required only when the
task requires it.

Temporary implementation or proof limitations must neither expand
delivered responsibilities nor weaken required behavior, acceptance
criteria, or intended user instructions. Describe current capability
truthfully and report implementation and proof gaps explicitly.

<a id="two-step-analysis"></a>
## Two-step analysis

When asked to apply MSW's two-step analysis to a proposal, perform these
steps in order. A proposal may be a plan, design, implementation approach,
repair, or review recommendation.

### Step 1: Establish and validate the outcome contract

Derive the contract from the request and authoritative requirements,
independently of the proposed solution.

State the requested outcome, applicable constraints and existing guarantees
that must be preserved, and the smallest acceptance criteria and evidence
that would prove success.

Check that the contract includes every required outcome and excludes
obligations introduced solely by the proposed mechanism. A mechanism belongs
in the contract only when an authoritative requirement makes that mechanism
itself mandatory. Apply Contract integrity to distinguish delivered behavior
from incidental implementation or proof conditions.

Resolve material ambiguity under the kernel's attended/unattended rule.
Do not narrow the contract to fit the proposal or expand it to justify
additional work.

<a id="outcome-first"></a>
### Step 2: Start from the feature

Decide what the requested feature must accomplish, then design the
implementation to make that happen.

Judge the work against that bound contract. A guard, check, blocker, or
subsystem is an implementation detail. Neither it nor an adjacent concern
supplies a contract of its own. Its purpose must not replace the feature's
requested outcome.

Existing does not mean necessary. A presumed purpose is a hypothesis, not
a justification. An existing guarantee constrains the solution when an
authoritative requirement establishes it; that does not require preserving
the particular mechanism currently providing it.

Do not invent problems to justify adding or preserving implementation
details. A blocker that prevents the requested outcome without serving an
established requirement of the feature does not belong in the solution.
Do not add it; correct or remove it if already present.

Treat every proposed or existing condition, mechanism, change, investigation,
test, review, and operational step as a claim.

Apply the deletion test to each claim: identify the concrete contract
requirement that would remain unmet or unproven without it, using the task's
actual inputs and environment. Retain necessary claims; reject the rest.
Where a smaller reliable act closes the same gap, use it.

Then check sufficiency: would the retained proposal achieve every part of
the contract, with the required proof? Identify missing work, missing proof,
and unsupported assumptions. Minimality alone does not establish completeness.

Report the contract, the assessment, and the smallest complete proposal.
Give rejected claims worth the user's attention one line each. Distinguish
evidence already established from verification still required; analysis of
a proposal does not prove its implementation.

Use the existing response or plan; no separate artifact or approval gate
is required. Reuse a valid established contract and settled proof. Revisit
them only when new authoritative requirements or relevant evidence justify
it. An analysis request does not itself authorize execution.

## Apply the Kernel

1. Bind and validate the contract before proposing or doing work, then admit
   candidate actions through the deletion test. For explicit proposal
   assessment, use the [two-step analysis](#two-step-analysis).
2. Execute and prove only admitted claims.
3. Re-evaluate claims and proof when evidence changes. Revise the contract only
   under authoritative direction or to correct its interpretation against
   established requirements. Current execution state alone does not authorize
   a revision.
4. Halt and report as soon as the fixed point is reached.

Reject a failed claim with one report line. Do not turn it into an investigation,
fix, or deferred follow-up.

This skill works alone. If MSL is also installed, use this skill to decide what
work is necessary and MSL to report it. If Codex Voice Optimizer is active,
apply this kernel to its coordination claims and owning work threads while CVO
owns routing, project placement, roles, authority, and speech.

If the CODER Loop is active, apply this kernel to task-family,
acceptance-claim, finding, repair, and proof admission while CODER owns
decomposition, independent review, remediation, and acceptance. The
three-round fuse applies only when this kernel's evaluator fails; it is not a
default CODER review-round limit.

If Timebox is active, use this kernel to decide what work remains necessary and
Timebox to govern how that work converges inside the authorized clock. A hard
stop reports open claims honestly; it never changes the necessity or proof
test.
