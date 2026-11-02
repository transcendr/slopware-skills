# explicit-language

A Claude Code `Stop` hook. It sends each sentence of the final reply to Jev, with the user's message and the whole reply as context, and asks whether the sentence uses a shortcut in place of an explicit statement. A sentence scoring above 0.5 is returned for a rewrite. There is no word list.

- Needs `JEV_API_KEY` in the environment. The reply text and the user's message are sent to `api.typesafe.ai`.
- A refused reply gets one rewrite, then passes.
- With no key, or when Jev gives no answer, the reply passes and stderr says why.
