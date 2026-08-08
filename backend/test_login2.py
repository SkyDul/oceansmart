import urllib.request, json

def test(email, password):
    data = json.dumps({"email": email, "password": password}).encode()
    req = urllib.request.Request(
        "http://localhost:8000/api/login",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            print(f"OK {email}: {r.read().decode()[:120]}")
    except urllib.error.HTTPError as e:
        print(f"FAIL {email}: {e.code} {e.read().decode()[:120]}")
    except Exception as e:
        print(f"ERROR {email}: {e}")

test("admin@oceansmart.id", "ocean123")
test("oceansmart", "ocean123")
test("Admin@OceanSmart.id", "ocean123")
