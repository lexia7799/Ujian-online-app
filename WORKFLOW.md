# Alur Lengkap Sistem Ujian Online

## 📋 Daftar Isi
1. [Alur Dosen (Teacher Workflow)](#alur-dosen-teacher-workflow)
2. [Alur Siswa (Student Workflow)](#alur-siswa-student-workflow)
3. [Fitur Keamanan](#fitur-keamanan)
4. [Troubleshooting](#troubleshooting)

---

## 🎓 Alur Dosen (Teacher Workflow)

### 1. **Registrasi & Login Dosen**
- Akses halaman utama → Pilih "Saya Dosen"
- **Registrasi**: Buat akun dengan username dan password
- **Login**: Masuk dengan kredensial yang sudah dibuat

### 2. **Membuat Ujian Baru**
- Di Dashboard Dosen → Tab "Buat Ujian Baru"
- Isi form ujian:
  - **Nama Ujian**: Contoh "Ujian Akhir Kalkulus"
  - **Password Ujian**: Password untuk akses dosen ke ujian
  - **Waktu Mulai**: Tanggal dan jam mulai ujian
  - **Waktu Selesai**: Tanggal dan jam berakhir ujian
- Sistem otomatis generate **Kode Ujian** (contoh: A7B3K2)
- Klik "Lanjutkan ke Kelola Soal"

### 3. **Mengelola Soal**
- **Tambah Soal**:
  - Pilih tipe: Pilihan Ganda atau Esai
  - Tulis pertanyaan
  - Untuk Pilihan Ganda: Isi 4 opsi dan pilih jawaban benar
  - Untuk Esai: Hanya tulis pertanyaan
- **Edit/Hapus Soal**: Gunakan tombol edit/hapus di daftar soal
- **Publikasi Ujian**: Klik "Publikasikan" agar siswa bisa akses

### 4. **Mengelola Aplikasi Siswa**
- Cari ujian dengan kode → Masukkan password
- Pilih "Konfirmasi Siswa"
- **Bulk Approval**:
  - Centang siswa yang ingin disetujui
  - Klik "Setujui Terpilih" atau "Tolak Terpilih"
- **Individual Approval**: Setujui/tolak satu per satu

### 5. **Monitoring Ujian (Proctoring)**
- Pilih "Awasi Ujian" dari menu ujian
- **Fitur Monitoring**:
  - Lihat status real-time semua siswa
  - Foto pelanggaran otomatis tersimpan
  - Filter/cari siswa tertentu
  - Lihat detail pelanggaran per siswa

### 6. **Melihat Hasil & Penilaian**
- Pilih "Lihat Hasil" dari menu ujian
- **Penilaian Otomatis**: Pilihan ganda dinilai otomatis
- **Penilaian Manual**: 
  - Klik "Nilai Esai" untuk setiap siswa
  - Beri nilai 0-100 untuk setiap soal esai
- **Download PDF**: Unduh laporan hasil lengkap
- **Nilai Akhir**: 50% PG + 50% Esai (jika ada esai)

### 7. **Edit Password Ujian**
- Setelah verifikasi ujian, klik "Edit Password"
- Masukkan password baru
- Sistem akan update password ujian

---

## 🎒 Alur Siswa (Student Workflow)

### 1. **Registrasi & Login Siswa**
- Akses halaman utama → Pilih "Saya Siswa"
- **Registrasi**: Isi form lengkap:
  - Data Pribadi: Nama, Jurusan, Kelas, Universitas, WhatsApp
  - Data Akun: NIM (harus unik), Username (harus unik), Password
- **Login**: Masuk dengan username dan password

### 2. **Dashboard Siswa**
- **Edit Profil**: Update data pribadi dan password
- **Riwayat Ujian**: Lihat hasil ujian sebelumnya
- **Status Aplikasi**: 
  - 🟡 Menunggu Konfirmasi
  - ✅ Disetujui (siap ujian)
  - ❌ Ditolak

### 3. **Mengajukan Ujian**
- Klik "Ajukan Ujian" di dashboard
- Masukkan **Kode Ujian** dari dosen
- Sistem cek:
  - Ujian valid dan ada
  - Siswa belum pernah ikut ujian ini
  - Buat aplikasi dengan status "pending"

### 4. **Menunggu Persetujuan**
- Status "Menunggu Konfirmasi" di dashboard
- Tunggu dosen menyetujui aplikasi
- Notifikasi otomatis saat status berubah

### 5. **Memulai Ujian**
- Setelah disetujui, klik "Mulai Ujian"
- **Isi Identitas**: Nama, NIM, Jurusan, Kelas
- **Pemeriksaan Perangkat**:
  - ✅ Akses dari Desktop (bukan mobile)
  - ✅ Layar tunggal (tidak boleh dual monitor)
  - ✅ Akses kamera (untuk monitoring)
- Klik "Mulai Ujian" → Otomatis masuk fullscreen

### 6. **Mengerjakan Ujian**
- **Interface Ujian**:
  - Timer countdown di atas tengah
  - Live camera feed (kanan atas)
  - Soal dan jawaban di tengah
- **Menjawab Soal**:
  - Pilihan Ganda: Klik opsi yang benar
  - Esai: Ketik jawaban di text area
- **Sistem Keamanan Aktif**:
  - Tidak boleh keluar fullscreen
  - Tidak boleh switch tab/window
  - Tidak boleh copy/paste
  - Tidak boleh screenshot
  - Foto otomatis saat pelanggaran

### 7. **Menyelesaikan Ujian**
- **Selesai Manual**: Klik "Selesaikan Ujian"
- **Cek Soal Kosong**: Sistem warning jika ada soal belum dijawab
- **Konfirmasi**: Konfirmasi untuk menyelesaikan
- **Selesai Otomatis**: Ujian berakhir saat waktu habis
- **Keluar Fullscreen**: Otomatis keluar fullscreen

### 8. **Melihat Hasil**
- **Nilai Langsung**: Nilai pilihan ganda langsung muncul
- **Nilai Esai**: Menunggu dosen menilai
- **Nilai Akhir**: Kombinasi PG + Esai
- **Riwayat**: Tersimpan di dashboard siswa

---

## 🔒 Fitur Keamanan

### **Monitoring Real-time**
- **Camera Capture**: Foto otomatis saat pelanggaran
- **Fullscreen Lock**: Wajib fullscreen selama ujian
- **Tab Detection**: Deteksi switch tab/window
- **Copy-Paste Block**: Blokir copy/paste
- **Screenshot Block**: Blokir screenshot
- **Developer Tools Block**: Blokir inspect element

### **Sistem Pelanggaran**
- **3 Strike System**: Maksimal 3 pelanggaran
- **Auto Disqualification**: Diskualifikasi otomatis setelah 3 pelanggaran
- **Violation Photos**: Foto tersimpan untuk setiap pelanggaran
- **Real-time Alerts**: Dosen bisa lihat pelanggaran real-time

### **Device Restrictions**
- **Desktop Only**: Hanya bisa diakses dari laptop/desktop
- **Single Screen**: Tidak boleh dual monitor
- **Camera Required**: Wajib ada kamera untuk monitoring
- **Minimum Resolution**: Layar minimal 1024px

---

## 🔧 Troubleshooting

### **Masalah Umum Siswa**

#### **"Akses Ditolak - Mobile Device"**
- **Penyebab**: Mengakses dari HP/tablet
- **Solusi**: Gunakan laptop/desktop dengan layar minimal 1024px

#### **"Camera Error"**
- **Penyebab**: Browser tidak bisa akses kamera
- **Solusi**: 
  - Izinkan akses kamera di browser
  - Refresh halaman
  - Gunakan Chrome/Firefox terbaru

#### **"Fullscreen Failed"**
- **Penyebab**: Browser tidak support fullscreen
- **Solusi**: Gunakan browser modern (Chrome, Firefox, Edge)

#### **"Ujian Tidak Ditemukan"**
- **Penyebab**: Kode ujian salah atau ujian belum dipublikasi
- **Solusi**: 
  - Cek kode ujian dengan dosen
  - Pastikan ujian sudah dipublikasi

### **Masalah Umum Dosen**

#### **"Tidak Ada Siswa yang Mendaftar"**
- **Penyebab**: Ujian belum dipublikasi atau kode belum dibagikan
- **Solusi**: 
  - Publikasikan ujian di menu "Kelola Soal"
  - Bagikan kode ujian ke siswa

#### **"PDF Kosong/Error"**
- **Penyebab**: Belum ada siswa yang selesai ujian
- **Solusi**: Tunggu siswa menyelesaikan ujian

#### **"Foto Pelanggaran Tidak Muncul"**
- **Penyebab**: Siswa tidak mengizinkan akses kamera
- **Solusi**: Instruksikan siswa untuk mengizinkan kamera

### **Tips Penggunaan**

#### **Untuk Dosen**:
- Buat ujian minimal 30 menit sebelum dimulai
- Test ujian dengan akun siswa dummy
- Siapkan kode ujian dan password sebelum ujian
- Monitor siswa secara real-time selama ujian
- Nilai esai segera setelah ujian selesai

#### **Untuk Siswa**:
- Test kamera dan browser sebelum ujian
- Pastikan koneksi internet stabil
- Siapkan lingkungan ujian yang tenang
- Jangan buka aplikasi lain selama ujian
- Baca instruksi dengan teliti

---

## 📊 Statistik & Laporan

### **Data yang Tersedia**:
- Jumlah siswa yang mendaftar
- Jumlah siswa yang disetujui/ditolak
- Jumlah siswa yang menyelesaikan ujian
- Rata-rata nilai kelas
- Jumlah pelanggaran per siswa
- Waktu pengerjaan per siswa
- Foto bukti pelanggaran

### **Format Laporan**:
- **PDF Export**: Laporan lengkap hasil ujian
- **Real-time Dashboard**: Monitoring live
- **Historical Data**: Riwayat ujian sebelumnya

---

## 🎯 Best Practices

### **Persiapan Ujian**:
1. **H-1**: Buat ujian dan soal-soal
2. **H-1**: Test sistem dengan akun dummy
3. **H-1**: Bagikan kode ujian ke siswa
4. **30 menit sebelum**: Publikasikan ujian
5. **15 menit sebelum**: Konfirmasi siswa yang mendaftar
6. **Selama ujian**: Monitor real-time
7. **Setelah ujian**: Nilai esai dan download laporan

### **Keamanan Optimal**:
- Gunakan password ujian yang kuat
- Ganti password jika bocor
- Monitor foto pelanggaran secara berkala
- Tindak lanjuti siswa dengan pelanggaran tinggi
- Simpan bukti pelanggaran untuk keperluan akademik

---

*Sistem Ujian Online - Secure & Reliable Exam Platform*