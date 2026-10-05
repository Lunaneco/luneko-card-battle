import urllib.request

checks = [
    "http://127.0.0.1:5173/",
    "http://127.0.0.1:5173/src/main.ts",
    "http://127.0.0.1:5173/art/partners/moonember.jpg",
    "http://127.0.0.1:5173/art/partners/clearblade.jpg",
    "http://127.0.0.1:5173/art/beasts/skyfeather.jpg",
    "http://127.0.0.1:5173/art/ui/city.jpg",
    "http://127.0.0.1:5173/art/ui/zero.jpg",
    "http://127.0.0.1:5173/art/ui/cardback.jpg",
]
fail = 0
for u in checks:
    try:
        with urllib.request.urlopen(u, timeout=5) as r:
            print(r.status, u)
            if r.status != 200:
                fail += 1
    except Exception as e:
        print("FAIL", u, e)
        fail += 1
raise SystemExit(fail)
