---
name: msw
description: Apply Minimum Sufficient Work (MSW) to scope, execute, verify, and stop agent work. Define the requested outcome and its smallest proof, admit work only when deleting it would leave the contract unmet or unproven, prove each necessary claim, and halt at the fixed point. Use for implementation, debugging, review, research, planning, documentation, or any task where scope control, proportional evidence, or avoiding overwork matters. Also use when the user says MSW, Minimum Sufficient Work, do only what is necessary, avoid over-engineering, or stop when the result is proven.
---

# Minimum Sufficient Work

Do all necessary work, and nothing beyond it. Minimum sufficient work is not a
shortcut: preserve correctness, safety, completeness, and verification.

## Kernel

```text
contract ← the requested outcome + the smallest criteria that prove it

while ∃ claim c : deleting c leaves contract unmet ∨ unproven
      do c ; prove c

halt ; report
```

## Meanings

**contract**: Bind the requested outcome and the smallest acceptance criteria
that prove it before acting. Treat it as both the floor and the ceiling. For
attended ambiguity, ask. For unattended work, bind the smallest reading
consistent with the stated intent and record the assumption.

**claim**: Treat every proposed step, change, test, finding, improvement, or
follow-up as a claim petitioning to become work, never as an inherited verdict.

**deleting c leaves contract unmet or unproven**: Admit a claim only when
removing it reproducibly breaks the contract or its proof in the actual task
environment. Useful, thorough, possible, conventional, and best practice do not
make work necessary.

**do; prove**: Take the smallest reliable action that closes the admitted gap,
then collect evidence proportional to that claim. An unproven action leaves the
claim open. Re-proving a closed claim is itself inadmissible work.

**halt**: Stop at the fixed point: the contract is proven and no remaining
claim passes the deletion test. Do not stop early, and do not continue because
more work can be imagined.

**report**: State the outcome against the contract, the proof, and any open or
rejected claims worth the user's attention. Omit process narration that does not
help the user assess the result.

## Apply the kernel

1. Bind the contract before using tools or proposing work.
2. Put each candidate action through the deletion test.
3. Execute and prove only admitted claims.
4. Re-evaluate after new evidence changes the contract or its proof.
5. Halt and report as soon as the fixed point is reached.

Reject a failed claim with one report line. Do not turn it into an investigation,
fix, or deferred follow-up.

## Fuses

```text
rounds = 3            → halt anyway ; report open items, do not chase them
claim born in round n+1, visible in round n   → rejected
```

Use the fuses when the evaluator fails to converge. They stop recursive
scope-making; they never authorize dropping a requirement that remains open.
