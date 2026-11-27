"""Chạy: python3 scripts/hsk2/build_hsk2.py  → src/data/hsk2.ts (qua build_hsk2.mjs)."""
import json, subprocess, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts/hsk2"))
from hsk2_src import LESSONS, SENT_PY
json.dump({"lessons": LESSONS, "py": SENT_PY}, open("/tmp/hsk2_src.json", "w"), ensure_ascii=False)
subprocess.run(["node", "scripts/hsk2/build_hsk2.mjs", "/tmp/hsk2_src.json"], cwd=ROOT, check=True)
