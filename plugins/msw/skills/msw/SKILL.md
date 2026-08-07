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

## Apply the Kernel

1. Bind the contract before using tools or proposing work.
2. Put each candidate action through the deletion test.
3. Execute and prove only admitted claims.
4. Re-evaluate after new evidence changes the contract or its proof.
5. Halt and report as soon as the fixed point is reached.

Reject a failed claim with one report line. Do not turn it into an investigation,
fix, or deferred follow-up.
