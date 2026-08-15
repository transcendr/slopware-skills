# CODER Loop review kernel

Use this kernel after a bounded worker produces a candidate and before the
coordinator accepts that task family.

```text
decision ← candidate accepted now + retained behavior now

gap ← an acceptance claim not settled by belonging evidence

while gap exists:
    cause ← smallest cause whose deletion leaves gap unexplained ∨ unresolved
    change ← smallest change whose deletion leaves decision unmet ∨ unproven
    reconsider only claims affected by cause or change

halt ; accept or withhold
```

## Meanings

**Decision**: The exact candidate proposed for acceptance plus the behavior its
approved contract retains.

**Candidate**: Every source input that can affect the accepted result,
including new or untracked files when they belong to the change.

**Retained behavior**: An outcome still required by the approved contract. A
specified user-visible form remains a visual claim; functional or structural
evidence alone does not settle it.

**Acceptance claim**: A statement necessary to accept the decision.

**Belonging evidence**: A current observation about this candidate and retained
behavior that can settle an acceptance claim.

**Gap**: A live acceptance claim without belonging evidence.

**Cause**: An explanation admitted only when deleting it would leave the gap
unexplained or unresolved.

**Change**: A correction admitted only when deleting it would leave the
decision unmet or unproven.

**Smallest**: Sufficient for the live claim, not the most exhaustive
explanation or broadest change.

**Withhold**: Refuse acceptance because a live claim remains unsettled. Do not
treat withholding as permission to broaden investigation or remediation.

## Admit findings

Classify observations through the contract:

```text
observation → deletion test → contract impact → project priority

if deleting the observation leaves the contract met and supported:
    not a finding

if deleting the observation leaves the contract unmet or unsupported:
    finding
    priority ← severity of the remaining contract gap
```

Treat a finding as acceptance-blocking when its gap prevents the decision from
being accepted. Map it to P0, P1, or another severity only when the project has
an authoritative priority scheme. Never inherit severity from the reviewer.

## Recheck after repair

Give the changed candidate to a fresh reviewer. Recheck every claim the repair
could affect and preserve evidence for unrelated claims when it still belongs.
Do not rerun the entire review merely to display rigor.

Halt when every live claim has belonging evidence. Withhold when one does not.
