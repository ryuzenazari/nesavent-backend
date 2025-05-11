# 🎫 NesaVent - Platform Ticketing untuk Event Kampus UNESA

<div align="center">
  <img src="https://iili.io/3vNeAAX.png" alt="NesaVent Logo" width="200" height="200">
  
  Platform penjualan tiket event untuk komunitas Universitas Negeri Surabaya (UNESA)
  
  [![Node.js](https://img.shields.io/badge/Node.js-v14+-green)](https://nodejs.org)
  [![Express.js](https://img.shields.io/badge/Express.js-v4.17.1-blue)](https://expressjs.com)
  [![MongoDB](https://img.shields.io/badge/MongoDB-v4.4+-green)](https://www.mongodb.com)
  [![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
</div>

## ✨ Fitur Utama

- 🔐 **Authentication** dengan berbagai role (JWT & OAuth)
- 🎪 **Management event** lengkap dengan tiket khusus mahasiswa
- 💳 **Payment system** terintegrasi Midtrans
- 📱 **QR code** untuk validasi tiket
- 📧 **Email notification** dan verification
- 🎓 **Verifikasi Mahasiswa** melalui KTM
- 👥 **Fitur Sosial** (Follow creator, Social sharing)
- ⭐ **Rating dan Feedback** event
- 🔗 **Shortlink System** untuk sharing event
- 📊 **Analytics dan Reporting** untuk creator
- 🛡️ **Sistem keamanan** dan monitoring
- ⚡ **Redis caching** dan rate limiting

## 👥 User Roles

- 👤 **User**: User umum yang dapat membeli regular ticket
- 🎓 **Student**: Mahasiswa terverifikasi yang dapat membeli ticket dengan harga khusus
- 🎨 **Creator**: Event creator yang dapat membuat dan mengelola event
- 👨‍💼 **Staff Creator**: Staff yang membantu creator mengelola event
- 👑 **Admin**: System administrator dengan full access

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB dengan Mongoose ORM
- **Authentication**: JWT, Passport, Google OAuth
- **File Upload**: Multer, Sharp
- **Payment**: Midtrans Payment Gateway
- **Email**: Nodemailer
- **Caching**: Redis, Node-Cache
- **Security**: Helmet, Express-rate-limit, CORS
- **Monitoring**: Winston logger, Custom monitoring service
- **Documentation**: OpenAPI Specification 3.0

## 📋 Requirements

- Node.js (v14+)
- MongoDB
- NPM atau Yarn
- Akun Midtrans (untuk payment gateway)
- Redis (untuk rate limiting dan caching)

## 🚀 Installation

### 1. Clone Repository
```bash
git clone https://github.com/ryuzenazari/nesavent-backend
cd nesavent-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Konfigurasi Environment
Buat file `.env` di root project dengan konfigurasi berikut:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nesavent
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@example.com
SMTP_PASS=your_password

# Frontend & Backend URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# Midtrans Configuration
MIDTRANS_CLIENT_KEY=SB-Mid-client-XXXXXXXXXXXXXXXX
MIDTRANS_SERVER_KEY=SB-Mid-server-XXXXXXXXXXXXXXXX
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_SNAP_URL=https://app.sandbox.midtrans.com/snap/snap.js
MIDTRANS_MERCHANT_ID=XXXXXXXX

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Admin Dashboard URL
ADMIN_DASHBOARD_URL=http://localhost:3000/admin
```

### 4. Setup Database
MongoDB akan diinisialisasi otomatis saat aplikasi pertama kali dijalankan. Untuk mengatur akun admin pertama:
```bash
npm run create:admin
```

### 5. Setup Direktori Uploads
Aplikasi akan membuat direktori-direktori ini saat pertama kali dijalankan:
```
uploads/events
uploads/profiles
uploads/documents
uploads/documents/ktm
```

### 6. Jalankan Server
```bash
# Development mode dengan nodemon
npm run dev

# Production mode
npm start
```

Server berjalan di `http://localhost:5000`

## 📁 Struktur Direktori

```
src/
├── config/         # Konfigurasi app, passport, dll
├── controllers/    # Controller untuk setiap entitas
├── middleware/     # Middleware seperti auth, logging, upload
├── models/         # Model MongoDB dengan Mongoose
├── routes/         # Definisi rute API
├── services/       # Business logic
├── utils/          # Utility functions
├── views/          # Template untuk email
└── app.js          # Entry point aplikasi
```

## 📜 Script NPM

```bash
npm start           # Menjalankan server produksi
npm run dev         # Menjalankan server dengan nodemon (development)
npm run create:admin # Membuat akun admin pertama
npm run reset:admin  # Reset password admin
npm run seed:db     # Mengisi database dengan data contoh
npm run migrate:social # Menjalankan migrasi untuk fitur sosial
```

## 📚 API Documentation

NesaVent menggunakan OpenAPI Specification 3.0.0 untuk dokumentasi API. Dokumentasi lengkap tersedia dalam format YAML di file `API.md`.

### Mengakses Dokumentasi API

Anda dapat mengakses dokumentasi API interaktif dengan mengimpor konten YAML dari `API.md` ke Swagger UI:

1. Kunjungi [Swagger Editor](https://editor.swagger.io/)
2. Salin konten YAML dari API.md
3. Paste di editor Swagger

### Integrasi Dokumentasi API ke Aplikasi Express

```javascript
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./openapi.yaml');

const app = express();
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
```

## 🛡️ Security

- 🔐 **Authentication** menggunakan JWT dengan mekanisme refresh token
- 🚫 **Rate Limiting** untuk mencegah brute force dan DDoS
- ✅ **Input Validation** menggunakan express-validator
- 🔒 **CORS** dikonfigurasi dengan aman
- 🪖 **Helmet** untuk mengamankan HTTP headers
- 🐛 **Error Tracking** untuk monitoring vulnerabilitas
- 📊 **Performance Monitoring** untuk mengidentifikasi bottlenecks

## 🔌 Integrasi Pihak Ketiga

- 💳 **Midtrans** untuk payment gateway
- 🔑 **Google OAuth** untuk login dengan Google
- ⚡ **Redis Cloud** untuk distributed caching dan rate limiting
- 📧 **Node Mailer** untuk pengiriman email
- 📱 **QRCode** untuk generasi dan validasi QR Code tiket
- 📄 **ExcelJS** dan **PDFKit** untuk ekspor laporan

## 🧪 Testing

Project ini menggunakan Jest untuk unit testing.

```bash
# Menjalankan semua test
npm test
```

## 🌐 Deployment

### Server Requirements

- Node.js (v14+)
- MongoDB
- Redis
- HTTPS Certificate
- Reverse Proxy (Nginx/Apache)

### Setup untuk Production

1. Clone repository
2. Install dependencies dengan `npm install --production`
3. Setup environment variables
4. Jalankan with PM2: `pm2 start src/app.js --name nesavent`

## 👨‍💻 Kontributor

- Tim Pengembang NesaVent

## 📄 License

Copyright © 2025 NesaVent. All rights reserved.

## 📞 Support

Untuk pertanyaan dan dukungan, hubungi kami di support@nesavent.com atau buat issue di repositori GitHub.

## ⚠️ Disclaimer

NesaVent adalah platform independen dan tidak terafiliasi secara resmi dengan Universitas Negeri Surabaya (UNESA).
