# Panduan Deployment

## 1. Deploy ke Netlify

### Cara 1: Drag & Drop (Paling Mudah)
1. Jalankan `npm run build` di terminal
2. Buka [netlify.com](https://netlify.com) dan login
3. Drag folder `dist` ke area "Deploy manually"
4. Selesai! Situs Anda akan live

### Cara 2: Git Integration
1. Push kode ke GitHub/GitLab
2. Login ke [netlify.com](https://netlify.com)
3. Klik "New site from Git"
4. Pilih repository Anda
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Tambahkan environment variables di Netlify dashboard:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - dll (sesuai .env.example)

## 2. Deploy ke Vercel

### Cara 1: Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Cara 2: Git Integration
1. Push kode ke GitHub/GitLab
2. Login ke [vercel.com](https://vercel.com)
3. Klik "New Project"
4. Import repository Anda
5. Vercel akan auto-detect Vite project
6. Tambahkan environment variables:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - dll (sesuai .env.example)

## 3. Environment Variables

Buat file `.env` di root project dengan isi:
```
VITE_FIREBASE_API_KEY=AIzaSyC6JKHURMERm5VuJSfWy1DiGJ_Z-kUfIdM
VITE_FIREBASE_AUTH_DOMAIN=ujian-online-15771.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ujian-online-15771
VITE_FIREBASE_STORAGE_BUCKET=ujian-online-15771.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=576591173041
VITE_FIREBASE_APP_ID=1:576591173041:web:a19ef2da4a07866eb91990
VITE_FIREBASE_MEASUREMENT_ID=G-34TVQSPSTJ
```

## 4. Troubleshooting

### Error: Page not found saat refresh
- Pastikan file `netlify.toml` atau `vercel.json` sudah ada
- Kedua file ini mengatur redirect untuk SPA

### Error: Firebase not configured
- Pastikan semua environment variables sudah diset
- Cek apakah nama variable dimulai dengan `VITE_`

### Build error
- Jalankan `npm run build` lokal dulu untuk cek error
- Pastikan semua dependencies terinstall

## 5. Custom Domain (Opsional)

### Netlify:
1. Beli domain atau gunakan domain existing
2. Di Netlify dashboard → Domain settings
3. Add custom domain
4. Update DNS records sesuai instruksi

### Vercel:
1. Di Vercel dashboard → Project settings → Domains
2. Add domain
3. Update DNS records sesuai instruksi

## 6. Tips Optimasi

1. **Compress Images**: Gunakan format WebP untuk gambar
2. **Enable Gzip**: Otomatis di Netlify/Vercel
3. **CDN**: Otomatis di kedua platform
4. **HTTPS**: Otomatis tersedia
5. **Analytics**: Bisa diaktifkan di dashboard masing-masing

## 7. Monitoring

- **Netlify**: Built-in analytics dan form handling
- **Vercel**: Built-in analytics dan serverless functions
- **Firebase**: Monitoring di Firebase console

Pilih platform yang paling sesuai dengan kebutuhan Anda!