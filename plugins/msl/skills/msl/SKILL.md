---
name: msl
description: Apply the Minimum Sufficient Language (MSL) principle through the MSL Kernel to write anything a reader must act on. Bind the reader and what they already know, partition facts from the machinery that produced them, emit each admitted fact as an action, a verification, a judgment, or a state, and stop when every claim is checkable and the reader can act. Use for status updates, work-in-progress reports to your own user, closeout and convergence comments, tickets, pull request and review write-ups, incident and postmortem notes, emails, memos, and any draft for readers outside the work. Also use when the user says MSL, Minimum Sufficient Language, write this for stakeholders, drop the jargon, make this readable, or asks for a paste-ready draft.
---

# MSL: the Kernel

Minimum Sufficient Language is the principle. The MSL Kernel is the instruction
set and program that applies it. It governs an ongoing update to your own user
and an artifact drafted for readers outside the work alike; only the reader
changes.

## Program: report

```text
reader ← the audience + everything already on their record

partition every fact:
    theirs     ← changes reader's model of
                 world-state ∨ risk-bound ∨ open decision
    instrument ← everything else

close instrument ; draft from theirs alone

for each f in theirs:
    emit f as one move ∈ {action, verification, judgment, state}

place handoff where the named reader's obligation begins
halt when every claim is checkable ∧ the ledger reconciles
```

## Definitions: no behavior lives here, only meaning

**reader**: the audience and the boundary of what they already hold. Whatever is
recorded where this lands — the ticket, the thread, the last update — is theirs
already. Writing starts at that boundary. Retelling what the record holds spends
their attention to tell them nothing.

**partition**: performed before drafting, over every fact you hold. *Theirs*
changes what the reader believes about the state of the world, how tightly a risk
was bound, or what decision remains; a human's approval or authorization is
always theirs, because it is how they know who bound the risk. *Instrument* is
how the work was carried out: tools and their names, stages, modes, flags, runs,
the order things ran in, designs superseded, attempts abandoned, cases tested,
branches, files, digests.

Close the instrument column and do not consult it while drafting. It will feel
load-bearing — a superseded design seems to prove the shipped one is safe, an
abandoned attempt seems to prove diligence, the stages seem to prove care — and
none of it reaches the reader as any of those things. What an attempt *taught*
may still be a finding; the attempt itself is instrument. *Interesting*,
*effortful*, and *true* are not aliases for *theirs*. The work you are proudest
of lands in the instrument column most often.

**bound**: how an instrument fact reaches the reader, if it reaches them at all —
the reach of the result in their nouns: what it could touch, what it could not,
what was confirmed after. A bound is a property of the outcome, never a sequence
and never a comparison. "It changed only the timestamp, only on the approved
rows, and stopped if any row had changed" is a bound.

**ledger**: the quantities running through the admitted facts, whether rows,
costs, or open hypotheses. Introduce each once, reuse its exact words, and let
the arithmetic close in view: found, acted on, remaining, and the confirmation
that nothing else remains. A given quantity may be converted into the unit the
reader decides in, with its inputs in view. Never invent an input.

**move**: every admitted fact leaves as exactly one of four, and the names never
appear in the text.
*Action* — an act with its actor, in the past. "We" is the default actor: it is
honest about joint work and each reader resolves it for themselves. "I" only when
the text speaks as the user personally, and only when asked.
*Verification* — what was observed that settles a prior action, never diligence
performed. "We confirmed each service served the new revision" is verification;
"we double-checked the deploy" is not.
*Judgment* — finding, then reason, then consequence, each its own sentence. A
judgment without its reason reads as preference; a reason without its consequence
leaves the reader holding an insight and no outcome.
*State* — what is true now, in the present.

**residual**: what remains, why it remains, and what decision would be needed to
act on it. All three, or it is not a residual. Silence about one claims none
exists.

**handoff**: a mention obligates the reader it names, so it belongs exactly where
that reader's required knowledge begins — everything above it available,
everything from it forward necessary. Never at the top, which obligates the whole
document. Never on a sentence that only points at other sentences. A mention is
added to a sentence, never substituted into one: no actor, quantity, or name is
displaced to make room for it. Mention someone when asked to, or when the reason
is unambiguous; a mention with nothing behind it spends a person's attention.

**theirs, not yours**: the reader's own vocabulary is required and yours is not
admissible. Probe each term: has this reader met this word where this lands? If
they have, it stays in their words, and softening it costs them the referent. If
they have not, it leaves, replaced by what it does for them. The same word passes
for one reader and fails for another.

**checkable**: a claim a skeptical reader could test. Scope carries it — *only*,
*exact*, *every*, *each*, *all*, *once*. An unscoped claim asks for trust; a
scoped one offers a way to be wrong.

**halt**: every admitted fact emitted, every claim checkable, the ledger
reconciled, and the reader holding the decision. Not word count; not completeness
of the record.

## Fuses: outside the program, for when its evaluator fails

```text
a fact recovered from the instrument column → rejected
a fact already on the reader's record        → rejected
a fact emitted twice                         → rejected ; the second is filler
a sentence about the document                → rejected
a second name for one thing                  → rejected ; the first name is the name
a comma-chained sentence                     → two facts ; emit as two
```

## Shape follows the reader's question

Sections answer what the reader is asking, in their words, and their question
follows the state of the work. Finished work: what happened, then what is now
true. Work in flight: what is known, what is ruled out, what is blocked. A
request for a decision: the recommendation first, then what decided it, then what
you need.

Close on the standing state, the residual, and the decision asked for. Each
belongs there and nowhere else, and a reader who reads only that close must still
be able to act. Never restate above what the close will carry.

## Emit plainly

One idea per sentence, actor before verb, one term per concept throughout. Causal
connectives stay — *because*, *so*, *therefore* — they carry the reasoning the
reader came for. Emit deliberate non-actions as plainly as actions, and adverse
facts as plainly as favourable ones. Settled facts take no hedge; genuine
unknowns stay unknowns, never omitted and never softened into confidence. Every
actor, quantity, and name is reported as given.

Deliver the artifact ready to use: no fences around it, no framing before it, no
commentary after it.

## Never impose a count

Length falls out of the partition. A word, sentence, paragraph, section, or
document limit is admissible only when the requester sets it, a platform enforces
it, or authoritative policy defines it. State the authority whenever applying
one. Absent authority, omit the limit and let the partition decide. Brevity is a
consequence here, never a target.

## Apply the Kernel

1. Bind the reader and their record before writing a sentence.
2. Partition every fact; close the instrument column.
3. Draft from *theirs* alone, each fact as one move.
4. Scope every claim so it can be checked.
5. Place the handoff where the obligation begins, displacing nothing.
6. Halt and ask for the decision.

This skill works alone. If the MSW skill is also installed, use MSW to decide
what work is necessary and this skill to report it.
