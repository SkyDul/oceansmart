# OceanSmart - Marine Intelligence Platform 🌊

OceanSmart adalah platform cerdas pemantauan kawasan konservasi laut berbasis Internet of Things (IoT), *Geographic Information System* (GIS), dan *Digital Twin* 3D. 

Aplikasi ini ditujukan untuk memantau kualitas air laut, memberikan peringatan dini terhadap kondisi kritis (seperti pemutihan karang), dan memvisualisasikan data lingkungan laut beserta biota di dalamnya secara *real-time*.

## 🚀 Fitur Utama
- **Dashboard Analitik:** Ringkasan kondisi laut (*Ocean Health Index*).
- **Peta SIG (Sistem Informasi Geografis):** Pemetaan interaktif sebaran sensor IoT di perairan.
- **Digital Twin 3D:** Simulasi 3D interaktif untuk setiap lapisan kedalaman laut beserta biota laut yang berenang di dalamnya.
- **Pemantauan Real-Time:** Monitoring parameter lingkungan (pH, Suhu, Oksigen Terlarut/DO, Salinitas, dan Kekeruhan).
- **OceanBot (AI Assistant):** Chatbot pintar bertenaga Google Gemini AI yang dapat menjawab kondisi perairan dan berinteraksi melalui widget di layar.

## 🛠️ Teknologi yang Digunakan
* **Frontend:** React.js, Vite, Three.js / `<model-viewer>` (untuk 3D).
* **Backend:** Python, FastAPI.
* **Database:** MySQL, SQLAlchemy (ORM).
* **AI Engine:** Google Gemini 2.0 Flash API.

---

## 💻 Panduan Instalasi & Setup

Ikuti langkah-langkah berikut untuk menjalankan proyek ini di komputer Anda (Localhost).

### 1. Persiapan Awal (Prerequisites)
Pastikan komputer Anda sudah terinstal:
- [Node.js](https://nodejs.org/) (Versi 18 atau terbaru)
- [Python](https://www.python.org/) (Versi 3.10 atau terbaru)
- MySQL Server (Bisa menggunakan XAMPP, Laragon, dsb.)
- Git

### 2. Setup Database (Sangat Mudah!)
**Apakah database perlu diimpor secara manual?** 
👉 **TIDAK PERLU.** Aplikasi ini menggunakan sistem autoseeding. Anda hanya perlu membuat wadah databasenya saja, dan sistem backend akan membangun tabel serta mengisi data dummy secara otomatis saat pertama kali dijalankan.

1. Buka MySQL Anda (lewat phpMyAdmin, HeidiSQL, atau Terminal).
2. Buat database kosong baru dengan nama: `oceansmart`
   *(Tidak perlu membuat tabel apa pun, biarkan kosong).*

### 3. Setup Backend (FastAPI Python)
Buka terminal/command prompt, lalu jalankan:

```bash
# Pindah ke direktori backend
cd backend

# (Opsional tapi disarankan) Buat Virtual Environment
python -m venv venv
venv\Scripts\activate      # Untuk Windows
source venv/bin/activate   # Untuk Mac/Linux

# Install dependensi
pip install -r requirements.txt

# Buat file konfigurasi environment
cp .env.example .env
```

Buka file `backend/.env` dan sesuaikan koneksi database milik komputer Anda:
```env
# Format: mysql+pymysql://<USER>:<PASSWORD>@localhost:3306/<NAMA_DATABASE>
DATABASE_URL=mysql+pymysql://root:@localhost:3306/oceansmart
GEMINI_API_KEY=masukkan_api_key_google_gemini_anda_di_sini
```
*(Catatan: Jika MySQL Anda tidak ada password, cukup biarkan kosong setelah `root:`).*

**Jalankan Backend:**
```bash
uvicorn app.main:app --reload
```
*Saat perintah di atas sukses dijalankan, FastAPI akan secara otomatis membuat tabel dan menyuntikkan ribuan data sensor & biota ke database Anda.*

### 4. Setup Frontend (React + Vite)
Buka terminal baru, lalu jalankan:

```bash
# Pindah ke direktori frontend
cd frontend

# Install dependensi Node.js
npm install

# Jalankan server frontend
npm run dev
```

Buka peramban (browser) dan akses: **http://localhost:5173**

---

## 🤖 Mengaktifkan OceanBot (AI)
Jika OceanBot (Ikan Robot di pojok kanan bawah) membalas dengan kalimat *"Koneksi AI sibuk"*, itu berarti Anda perlu menggunakan API Key milik Anda sendiri:
1. Kunjungi [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Buat API Key gratis.
3. Masukkan kode tersebut ke variabel `GEMINI_API_KEY` di file `backend/.env`.
4. *Restart* uvicorn backend Anda.

---
Dikembangkan untuk masa depan konservasi laut 🌍💙
