import httpx

biota_baru = [
    {"biota_id": "BIO-0013", "nama_umum": "Ikan Mas", "nama_ilmiah": "Carassius auratus", "zona_kedalaman": "0-5m", "status_konservasi": "Least Concern", "deskripsi": "Ikan berwarna keemasan mencolok dengan sirip yang elegan. Mudah beradaptasi di berbagai kondisi perairan dan dikenal sebagai ikan hias populer di seluruh dunia.", "habitat": "Perairan dangkal, laguna, kolam pesisir"},
    {"biota_id": "BIO-0014", "nama_umum": "Ikan Sebelah (Halibut)", "nama_ilmiah": "Hippoglossus hippoglossus", "zona_kedalaman": "15-30m", "status_konservasi": "Vulnerable", "deskripsi": "Ikan demersal berbentuk pipih lateral dengan kedua mata berada di satu sisi tubuh. Dapat tumbuh hingga 2 meter dan merupakan ikan dasar laut yang penting secara komersial.", "habitat": "Dasar laut berpasir, perairan dingin"},
    {"biota_id": "BIO-0015", "nama_umum": "Hiu Banteng", "nama_ilmiah": "Carcharhinus leucas", "zona_kedalaman": "0-15m", "status_konservasi": "Vulnerable", "deskripsi": "Hiu bertubuh kekar dengan moncong tumpul. Salah satu hiu paling adaptif, mampu hidup di perairan laut maupun tawar. Dikenal agresif dan sering mendekati kawasan pesisir.", "habitat": "Muara, laguna, perairan dangkal pesisir"},
    {"biota_id": "BIO-0016", "nama_umum": "Lobster Mutiara", "nama_ilmiah": "Panulirus ornatus", "zona_kedalaman": "15-30m", "status_konservasi": "Near Threatened", "deskripsi": "Lobster besar bercorak mutiara indah yang hidup di dasar karang dan celah batu. Komoditas perikanan bernilai tinggi di perairan tropis Indonesia.", "habitat": "Dasar karang, celah batu, slope dalam"},
    {"biota_id": "BIO-0017", "nama_umum": "Ikan Todak", "nama_ilmiah": "Xiphias gladius", "zona_kedalaman": "5-30m", "status_konservasi": "Least Concern", "deskripsi": "Ikan pelagis besar dengan moncong rahang atas yang memanjang menyerupai pedang. Perenang cepat dan predator tangguh di perairan laut terbuka tropis hingga subtropis.", "habitat": "Perairan laut lepas, zona pelagis"},
]

with httpx.Client(timeout=10) as c:
    for b in biota_baru:
        r = c.post("http://localhost:8000/api/biota", json=b)
        nama = b["nama_umum"]
        print(f"{nama}: {r.status_code} - {r.text[:100]}")
