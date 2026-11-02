#!/usr/bin/env python3
"""Stop hook: ask Jev whether each sentence of the final reply says its meaning explicitly.

A sentence fails when Jev judges it more likely than not to be a shortcut. The judgement reads the sentence in the
context of the whole reply, so no word list is involved. A refused reply gets one rewrite: the
next stop passes (stop_hook_active). With no key, or when Jev can't answer, the reply passes and stderr says why."""
import json, os, re, sys, urllib.request

ENDPOINT = "https://api.typesafe.ai/v1/systemone"
QUESTION = (
    "Judge only the sentence in `sentence`, read in the context of `reply`. The writer is an AI "
    "assistant reporting to a developer. Answer yes if the sentence uses a shortcut in place of an explicit "
    "statement: a figure of speech, a coined label, or a catchy compressed phrase, chosen because it sounds good, "
    "so that the reader has to work out what actually happens, who does it, or to what. Examples: 'the remaining "
    "rows move over family by family' hides that workers will rewrite each test; 'the first two changes do double "
    "duty' hides that later tests reuse them. Answer no if a newcomer could take the sentence literally. Established "
    "technical terms, names, numbers, and plain everyday wording are not shortcuts, even when they are informal or "
    "short. A plain, blunt sentence is not a shortcut."
)


def prose(text):
    text = re.sub(r"```.*?```", " ", text, flags=re.S)
    text = re.sub(r"`[^`\n]*`", "CODE", text)
    text = re.sub(r"^\s*>.*$", " ", text, flags=re.M)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    sentences = []
    for line in text.split("\n"):
        line = re.sub(r"^\s*([-*#|]+|\d+\.)\s*", "", line).replace("**", "").strip()
        sentences += [s.strip() for s in re.split(r"(?<=[.!?])\s+", line) if len(s.split()) >= 3]
    return sentences


def text_of(message):
    content = message.get("content")
    if isinstance(content, str):
        return content
    return "".join(p.get("text", "") for p in content or [] if isinstance(p, dict) and p.get("type") == "text")


def last_reply(path):
    reply = ""
    with open(path) as f:
        for line in f:
            try:
                entry = json.loads(line)
            except ValueError:
                continue
            kind, message = entry.get("type"), entry.get("message") or {}
            if kind == "assistant" and text_of(message).strip():
                reply = text_of(message)
    return reply


def judge(key, reply, sentences):
    questions = {"s%d" % i: {"type": "noul", "instructions": QUESTION + " The `sentence` for this question is `sentences.s%d`." % i}
                 for i in range(len(sentences))}
    state = {"reply": reply, "sentences": {"s%d" % i: s for i, s in enumerate(sentences)}}
    body = json.dumps({"model": "jev-latest", "state": state, "questions": questions}).encode()
    request = urllib.request.Request(ENDPOINT, data=body, headers={
        "Authorization": "Bearer " + key, "Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=12) as response:
        answers = json.load(response)["answers"]
    return [(answers["s%d" % i]["noul"], s) for i, s in enumerate(sentences)]


def main():
    data = json.load(sys.stdin)
    if data.get("stop_hook_active"):
        return
    key = os.environ.get("JEV_API_KEY", "")
    if not key:
        print("explicit-language: JEV_API_KEY is not set; reply not judged", file=sys.stderr)
        return
    reply = data.get("last_assistant_message") or last_reply(data.get("transcript_path", ""))
    sentences = prose(reply)
    if not sentences:
        return
    try:
        scored = judge(key, reply, sentences)
    except Exception as error:
        print("explicit-language: Jev gave no answer (%s); reply not judged" % type(error).__name__, file=sys.stderr)
        return
    failed = [s for score, s in scored if score > 0.5]
    if data.get("explicit_language_report"):
        print(json.dumps(scored))
    elif failed:
        print(json.dumps({"decision": "block", "reason": "Rewrite these sentences so a newcomer can take them "
                          "literally, saying who does what to which thing. Change nothing else:\n- " + "\n- ".join(failed)}))


if __name__ == "__main__":
    main()
