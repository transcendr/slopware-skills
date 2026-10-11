#!/usr/bin/env python3
"""Stream a Codex thread's progress: assistant notes, approval/error signals, turn end, silence."""
import glob, json, os, sys, time
tid = sys.argv[1]
stall = int(sys.argv[2]) if len(sys.argv) > 2 else 240
files = glob.glob(os.path.expanduser(f"~/.codex/sessions/**/*{tid}*.jsonl"), recursive=True)
path = max(files, key=os.path.getmtime)
f = open(path); f.seek(0, 2)
last_write, warned = time.time(), False
def out(s): print(s[:400].replace("\n", " "), flush=True)
while True:
    line = f.readline()
    if not line:
        if time.time() - last_write > stall and not warned:
            out(f"SILENT {int(time.time()-last_write)}s: no session writes (may be reasoning, or blocked)")
            warned = True
        time.sleep(1); continue
    last_write, warned = time.time(), False
    try: o = json.loads(line)
    except Exception: continue
    p = o.get("payload") or {}
    t = p.get("type") or o.get("type")
    ts = o.get("timestamp", "")[11:19]
    if t == "message" and p.get("role") == "assistant":
        c = p.get("content") or []
        txt = " ".join(x.get("text", "") for x in c if isinstance(x, dict))
        if txt.strip(): out(f"{ts} NOTE {txt}")
    elif t in ("task_complete", "turn_aborted"):
        out(f"{ts} TURN_END {t}")
    else:
        if t and "approval" in t.lower():
            out(f"{ts} APPROVAL_WAIT {t}: {json.dumps(p)[:250]}")
