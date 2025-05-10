# Pengujian NesaVent

Direktori ini berisi berbagai file pengujian untuk memverifikasi fungsionalitas aplikasi NesaVent.

## Daftar File Pengujian

1. `testComprehensive.js` - Pengujian komprehensif fitur utama (user, event, dan tiket)
2. `testTicketTypes.js` - Khusus menguji implementasi tipe tiket kustom
3. `testTicketManagement.js` - Menguji sistem manajemen tiket
4. `testApi.js` - Menguji endpoint API menggunakan supertest
5. `testShortLink.js` - **BARU!** Menguji fungsionalitas ShortLink
6. `testAll.js` - Menjalankan semua pengujian di atas secara berurutan

## Cara Menjalankan Pengujian

### Menjalankan Semua Pengujian

```bash
# Windows
run-tests.bat

# Linux/macOS (pastikan sudah chmod +x run-tests.sh)
./run-tests.sh

# Menggunakan npm script
npm run test:all
```

### Menjalankan Pengujian Tertentu

```bash
# Pengujian komprehensif
npm run test:comprehensive

# Pengujian API
npm run test:api

# Pengujian tipe tiket
npm run test:tickets

# Pengujian manajemen tiket
npm run test:ticket-management
```

### Pengujian ShortLink

```bash
npm run test:shortlink
```

Pengujian ini akan memverifikasi:
- Pembuatan kode ShortLink yang unik
- Pembuatan ShortLink untuk event dan URL eksternal
- Pencatatan kunjungan ke ShortLink
- Pembaruan status dan informasi ShortLink
- Penghapusan ShortLink

## Catatan Penting

1. Pastikan database sudah diisi dengan data awal menggunakan:
   ```
   npm run seed:db
   ```

2. Semua pengujian mengakses database, jadi pastikan MongoDB berjalan dan terkonfigurasi dengan benar di file `.env`.

3. Pengujian API tidak memerlukan server berjalan karena menggunakan supertest untuk simulasi request langsung.

4. Password untuk semua pengguna dalam pengujian diasumsikan adalah 'password123' sesuai dengan data seeder. 