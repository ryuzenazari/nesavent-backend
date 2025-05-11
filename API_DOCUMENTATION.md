# Dokumentasi API NesaVent

## Pengenalan

NesaVent adalah platform penjualan tiket event untuk komunitas Universitas Negeri Surabaya (UNESA). Dokumentasi ini menjelaskan cara mengakses dan menggunakan API NesaVent.

## Mengakses Swagger UI

Dokumentasi API interaktif tersedia melalui Swagger UI. Untuk mengakses:

1. Pastikan server berjalan: `npm run dev`
2. Buka browser dan akses URL: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)

## Fitur Swagger UI

Dengan Swagger UI, Anda dapat:

- Melihat daftar lengkap endpoint API
- Melihat parameter yang diperlukan untuk setiap endpoint
- Mencoba endpoint API langsung dari browser
- Melihat skema respons untuk setiap endpoint

## Autentikasi API

Sebagian besar endpoint memerlukan autentikasi JWT. Untuk mengautentikasi melalui Swagger UI:

1. Login melalui endpoint `/api/auth/login`
2. Salin token yang diterima
3. Klik tombol "Authorize" di bagian atas halaman Swagger UI
4. Masukkan token dengan format: `Bearer <token>`
5. Klik "Authorize"

## Contoh Penggunaan

### Login

```
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Mendapatkan Daftar Event

```
GET /api/events
```

### Membuat Transaksi

```
POST /api/transactions
{
  "eventId": "60d21b4667d0d8992e610c85",
  "ticketTypeId": "60d21b4667d0d8992e610c86",
  "quantity": 2
}
```

## Format Response

Semua response API menggunakan format JSON dengan struktur umum:

```json
{
  "success": true,
  "data": { ... },
  "message": "Success message"
}
```

Untuk error response:

```json
{
  "success": false,
  "error": "Error message",
  "code": 400
}
```

## Pengembangan API

API didokumentasikan menggunakan spesifikasi OpenAPI 3.0. File definisi API tersedia di `OpenAPI.yaml`. 