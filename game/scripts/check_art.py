import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
text = (root / "src/data/cards.ts").read_text()
arts = re.findall(r"art: '([^']+)'", text)
missing = []
for a in arts:
    p = root / "public" / a.lstrip("/")
    if not p.exists():
        missing.append(a)
print(f"art_refs {len(arts)} missing {len(missing)}")
for m in missing:
    print("MISS", m)

ids = [
    "moonember", "moonsaddle", "thundersaddle", "miracore",
    "windfeather", "blossomwing", "clearblade",
    "shellwhite", "chartspike", "thickdive",
    "fluffwing", "dawnwing", "lampcloak",
    "fireflytail", "lampqueen", "tidefin",
    "shadebug", "moonslash", "shadecoil",
]
for i in ids:
    hits = [a for a in arts if i in a]
    print(("OK" if hits else "NOART"), i, hits[0] if hits else "")
if missing:
    raise SystemExit(1)
