# Sistem Ujian Online dengan Proctoring

Platform ujian online yang aman dengan fitur pengawasan anti-curang menggunakan React, TypeScript, dan Firebase.

## 🚀 Fitur Utama

### 👨‍🏫 Untuk Dosen
- **Manajemen Ujian**: Buat, edit, dan kelola ujian
- **Bank Soal**: Pilihan ganda dan esai dengan editor yang mudah
- **Konfirmasi Siswa**: Setujui/tolak aplikasi siswa secara bulk atau individual
- **Monitoring Real-time**: Awasi siswa selama ujian dengan foto pelanggaran
- **Penilaian Otomatis**: Pilihan ganda dinilai otomatis, esai manual
- **Laporan PDF**: Export hasil ujian dalam format PDF

### 👨‍🎓 Untuk Siswa
- **Registrasi Mudah**: Daftar dengan data lengkap dan validasi unik
- **Dashboard Personal**: Lihat riwayat ujian dan status aplikasi
- **Pemeriksaan Perangkat**: Validasi otomatis device dan kamera
- **Interface Ujian**: Antarmuka yang bersih dengan timer dan monitoring
- **Keamanan Tinggi**: Fullscreen lock, anti-cheat, dan violation detection

## 🔒 Sistem Keamanan

### Anti-Cheat Features
- **Fullscreen Lock**: Wajib fullscreen selama ujian
- **Tab Detection**: Deteksi perpindahan tab/window
- **Copy-Paste Block**: Blokir copy/paste dan shortcut berbahaya
- **Screenshot Prevention**: Blokir screenshot dan print screen
- **Developer Tools Block**: Blokir inspect element dan console
- **Camera Monitoring**: Foto otomatis saat pelanggaran terdeteksi

### Device Restrictions
- **Desktop Only**: Hanya bisa diakses dari laptop/desktop
- **Single Screen**: Tidak boleh menggunakan dual monitor
- **Camera Required**: Wajib kamera untuk monitoring
- **Minimum Resolution**: Layar minimal 1024px

### Violation System
- **3-Strike Rule**: Maksimal 3 pelanggaran sebelum diskualifikasi
- **Auto Photo Capture**: Foto otomatis tersimpan saat pelanggaran
- **Real-time Monitoring**: Dosen bisa melihat pelanggaran secara langsung
- **Evidence Storage**: Semua bukti pelanggaran tersimpan di database

## 🛠️ Teknologi

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **File Storage**: Firebase Storage
- **PDF Generation**: jsPDF + jsPDF-AutoTable
- **Icons**: Lucide React

## 📋 Persyaratan Sistem

### Untuk Siswa
- **Browser**: Chrome 90+, Firefox 88+, Edge 90+, Safari 14+
- **Device**: Laptop/Desktop (tidak support mobile)
- **Resolusi**: Minimal 1024x768px
- **Kamera**: Webcam aktif dan berfungsi
- **Internet**: Koneksi stabil minimal 1 Mbps

### Untuk Dosen
- **Browser**: Chrome 90+, Firefox 88+, Edge 90+, Safari 14+
- **Device**: Laptop/Desktop/Tablet
- **Internet**: Koneksi stabil minimal 2 Mbps

## 🚀 Instalasi & Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd ujian-online
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Firebase
1. Buat project baru di [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password)
3. Enable Firestore Database
4. Enable Storage
5. Copy konfigurasi Firebase

### 4. Environment Variables
Buat file `.env` di root project:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 5. Setup Firestore Rules
Copy rules dari `firestore-rules.txt` ke Firebase Console

### 6. Run Development Server
```bash
npm run dev
```

## 📦 Deployment

### Netlify
```bash
npm run build
# Upload folder 'dist' ke netlify.com
```

### Vercel
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Manual Build
```bash
npm run build
# Deploy folder 'dist' ke hosting pilihan
```

## 📖 Cara Penggunaan

### Untuk Dosen
1. **Registrasi/Login** → Buat akun dosen
2. **Buat Ujian** → Isi detail ujian dan generate kode
3. **Tambah Soal** → Buat soal pilihan ganda dan/atau esai
4. **Publikasi** → Publikasikan ujian agar siswa bisa akses
5. **Konfirmasi Siswa** → Setujui aplikasi siswa yang mendaftar
6. **Monitor Ujian** → Awasi siswa real-time selama ujian
7. **Nilai & Laporan** → Nilai esai dan download laporan PDF

### Untuk Siswa
1. **Registrasi/Login** → Buat akun dengan data lengkap
2. **Ajukan Ujian** → Masukkan kode ujian dari dosen
3. **Tunggu Persetujuan** → Menunggu dosen menyetujui aplikasi
4. **Pemeriksaan Device** → Validasi perangkat dan kamera
5. **Mulai Ujian** → Kerjakan soal dalam mode fullscreen
6. **Selesai** → Submit jawaban dan lihat hasil

## 🔧 Konfigurasi

### Firebase Firestore Structure
```
artifacts/
  ujian-online-app/
    public/
      data/
        teachers/          # Data dosen
        students/          # Data siswa
        exams/            # Data ujian
          {examId}/
            questions/    # Soal ujian
            sessions/     # Sesi ujian siswa
            applications/ # Aplikasi siswa
```

### Environment Variables
- `VITE_FIREBASE_*`: Konfigurasi Firebase
- Semua variable harus diawali `VITE_` untuk Vite

## 🐛 Troubleshooting

### Masalah Umum
- **Camera Error**: Pastikan browser mengizinkan akses kamera
- **Fullscreen Failed**: Gunakan browser modern yang support fullscreen API
- **Mobile Blocked**: Sistem memang tidak support mobile device
- **Firebase Error**: Periksa konfigurasi Firebase dan environment variables

### Debug Mode
```bash
npm run dev
# Buka browser console untuk melihat error logs
```

## 📄 Lisensi

MIT License - Lihat file `LICENSE` untuk detail lengkap.

## 🤝 Kontribusi

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📞 Support

Untuk bantuan dan pertanyaan:
- Buka issue di GitHub repository
- Email: [your-email@domain.com]
- Documentation: Lihat file `WORKFLOW.md` untuk panduan lengkap

---

**Sistem Ujian Online** - Platform ujian yang aman dan terpercaya untuk institusi pendidikan.