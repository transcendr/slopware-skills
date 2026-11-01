# Managing a project through T3 threads

Adapted from codex-app-link's strategic reference at `3372f52`.

Bind the roles from the user's description: the manager routes authorized work,
a coordinator may own design and sequencing, and work threads implement and prove
their assigned outcomes. A peer thread can supply evidence but cannot expand the
manager's authority. Do not create an additional coordinator merely to fit this
configuration.

Confirm the outcome, source repository and branch, ownership, publication
authority, exclusions and required evidence from the current assignment. Ask only
for missing decisions that affect the work. Existing authorization remains valid.

Read T3 threads to form a current picture. Discovery is read-only and does not
permit messaging threads. Use `list`, `status`, `read`, `questions` and native
`t3_thread_read`; never inspect Codex or Claude transcript directories. A thread
being idle does not prove its assignment is complete.

Keep each lane with its owner. Before routing a coordinator's recommendation,
check the central claim in the current code or authoritative project source.
Report a material change to the coordinator when authorized to communicate with
it. Keep observations, tested results, commits, pushes, merges and deployment
separate.

A thread's `RESULT` is a claim to verify. Compare its evidence with the user's
acceptance criteria. A PAUSED event means a thread stopped without the expected
final reply; it does not transfer ownership or authorize replacement work.
