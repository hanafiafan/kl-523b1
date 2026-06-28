# Panduan Pengujian Sistem Klastering KL-523B1

Dokumen ini merupakan panduan komprehensif untuk melakukan pengujian (testing) pada Web Aplikasi Data Mining KL-523B1. Panduan ini menjelaskan alur sistem, skema dataset, dan trik untuk mendapatkan hasil pengujian model dengan nilai metrik evaluasi tertinggi maupun terendah.

---

## 1. Skema Sistem & Dataset Utama

Sistem ini dikunci secara eksklusif (Default) untuk menganalisis dataset **`ai_student_impact_dataset.csv`** (Dampak Penggunaan AI terhadap Mahasiswa). 

**Dua Variabel Pengujian Utama:**
- **Variabel X (`Weekly_GenAI_Hours`):** Jumlah jam penggunaan AI generatif per minggu.
- **Variabel Y (`Post_Semester_GPA`):** IPK mahasiswa di akhir semester.

Sistem tidak mengizinkan pengunggahan dataset latihan eksternal demi menjaga integritas *Smart Academic Recommendations* (Sistem Pakar) yang dibangun khusus untuk skema 2 variabel di atas.

---

## 2. Alur Pengujian (End-to-End)

Sistem terdiri dari 4 tahapan halaman utama:
1. **WORKSPACE (Input):** Halaman awal untuk melihat pratinjau data dan mengatur konfigurasi algoritma (K-Means atau DBSCAN).
2. **ENGINE (Process):** Halaman terminal virtual (*Client-Side Rendering*) yang menampilkan log proses perhitungan algoritma langkah-demi-langkah.
3. **OUTPUT (Result):** Visualisasi hasil berupa tabel sentroid, Scatter Plot, Bar Chart, fitur PDF Ekspor, dan Evaluasi Model (Silhouette & DBI).
4. **SIMULATOR (Predict):** Pengujian data baru (Manual atau Batch CSV) terhadap model sentroid yang sudah dilatih tanpa perlu melakukan kalkulasi ulang dari nol.

---

## 3. Langkah-Langkah Pengujian Standar

### Skenario A: K-Means Clustering (Skenario Utama)
1. Buka aplikasi, Anda akan otomatis berada di halaman **Workspace**.
2. Dataset *AI Student Impact* akan langsung termuat.
3. Pada panel **Algoritma**, pilih **K-Means**.
4. Geser *slider* **Jumlah Cluster (K)** ke angka **4** (Disarankan).
5. Pastikan Kolom Target X adalah `Weekly_GenAI_Hours` dan Y adalah `Post_Semester_GPA`.
6. Klik **Start Engine**. Anda akan diarahkan ke halaman *Log Engine*.
7. Setelah selesai, klik **Lihat Hasil Akhir** untuk membuka halaman visualisasi.
8. Klik tombol **Export PDF** untuk mencetak laporan resmi secara rapi.

### Skenario B: DBSCAN Clustering (Uji Noise/Outlier)
1. Di halaman Workspace, ganti tipe algoritma ke **DBSCAN**.
2. Tentukan **Epsilon (Eps)** (Jangkauan jarak, misal: `0.5`).
3. Tentukan **MinPts** (Batas minimum data agar bisa jadi klaster, misal: `5`).
4. Klik **Start Engine**.
5. Di halaman hasil, sistem DBSCAN akan menemukan klaster dengan sendirinya berdasarkan kepadatan data. Mahasiswa yang sifatnya anomali/terbuang akan dilabeli sebagai **"Noise (Outlier)"**.

---

## 4. Cara Mendapatkan Nilai Metrik "Tertinggi" & "Terendah"

Untuk kebutuhan pengujian akademis atau demonstrasi sidang, Anda harus mengerti cara memanipulasi metrik Evaluasi (Silhouette Score & Davies-Bouldin Index).

### 🏆 Cara Mendapatkan Nilai Evaluasi Terbaik (Optimal)
Untuk metrik pengelompokan yang "sempurna", jarak antar data di klaster yang sama harus sangat dekat, dan jarak antar klaster berbeda harus berjauhan.
- **Set Algoritma:** K-Means
- **Set Jumlah Cluster (K): 4**
- **Mengapa K=4?** Karena perilaku mahasiswa secara alami terpecah dalam 4 kuadran (IPK Tinggi + AI Banyak, IPK Tinggi + AI Sedang/Rendah, IPK Rendah + AI Banyak, IPK Rendah + AI Rendah).
- **Hasil Metrik:** 
  - **Silhouette Score:** Akan menunjukkan angka positif tinggi yang mendekati 1 (Warna indikator: **Hijau / Sangat Baik**).
  - **Davies-Bouldin Index (DBI):** Akan menunjukkan angka yang paling rendah / mendekati 0 (Warna indikator: **Hijau / Sangat Baik**).

### 💥 Cara Mendapatkan Nilai Evaluasi Terburuk
Ini berguna untuk membuktikan bahwa engine evaluasi sistem bekerja dan bisa menolak asumsi model yang jelek.
- **Set Algoritma:** K-Means
- **Set Jumlah Cluster (K): 10** (Nilai K ditarik ke paling ujung/maksimal).
- **Mengapa K=10?** Data akan dipaksa terpecah menjadi terlalu banyak kelompok yang jarak antar sentroidnya menjadi sangat tumpang tindih (*overlapping*).
- **Hasil Metrik:** 
  - **Silhouette Score:** Akan sangat anjlok mendekati 0 atau bahkan bernilai Negatif (Warna indikator: **Merah / Buruk**).
  - **Davies-Bouldin Index (DBI):** Angka akan melonjak menjadi sangat tinggi (Warna indikator: **Merah / Buruk**).

---

## 5. Panduan Modul Simulasi (Predict)

Fungsi Simulator dipakai setelah Anda sukses melakukan *training* model K-Means di halaman Output.

1. Buka menu **SIMULATOR (Predict)** di *navbar* atas.
2. **Uji Manual:** 
   - Masukkan ID Mahasiswa sembarang (cth: `TEST-99`).
   - Masukkan nilai X (Jam penggunaan AI, cth: `35`).
   - Masukkan nilai Y (Target IPK, cth: `4.0`).
   - Klik **Hitung Prediksi**, dan sistem akan langsung menempatkan mahasiswa ini ke dalam *Cluster* "Efficient AI Academic Adopters" lengkap dengan warna dan saran dari jarak sentroid terdekatnya!
3. **Batch Uji CSV:**
   - Anda juga bisa menyeret (*drag-and-drop*) file CSV kosong/baru yang berisi ribuan mahasiswa. Sistem akan memproses ribuan tebakan kategori dalam sekejap tanpa harus mengulang proses *training* data di halaman awal.

---
*Di-generate oleh Engine KL-523B1*
