import httpx

tests = [
    {"email": "admin@oceansmart.id", "password": "ocean123"},
    {"email": "Admin@OceanSmart.id", "password": "ocean123"},  # case insensitive test
    {"email": "oceansmart", "password": "ocean123"},            # login by nama
]

with httpx.Client(timeout=10) as c:
    for t in tests:
        r = c.post("http://localhost:8000/api/login", json=t)
        print(f"email={t['email']} -> {r.status_code}: {r.text[:120]}")
