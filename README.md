# NesaVent - Platform Ticketing untuk Event Kampus

NesaVent adalah platform penjualan tiket event untuk komunitas kampus di Surabaya. Aplikasi ini dikembangkan dengan Express.js dan MongoDB, serta terintegrasi dengan Midtrans untuk payment.

## Fitur Utama

- Authentication dengan berbagai role
- Management event dan pembelian tiket
- Payment system terintegrasi Midtrans
- QR code untuk validasi ticket
- Email notification dan verification
- Verifikasi Mahasiswa Fleksibel
- Fitur Sosial & Engagement
- Sistem keamanan dan compliance
- Optimisasi performa dan caching

## User Roles

- **User**: User umum yang dapat membeli regular ticket
- **Student**: Mahasiswa terverifikasi yang dapat membeli ticket dengan harga khusus
- **Creator**: Event creator yang dapat membuat dan mengelola event
- **Staff Creator**: Staff yang membantu creator mengelola event
- **Admin**: System administrator dengan full access

## Requirements

- Node.js (v14+)
- MongoDB
- NPM atau Yarn
- Akun Midtrans (untuk payment gateway)
- Redis (opsional, untuk rate limiting yang lebih baik)

## Installation

### 1. Clone Repository
```bash
git clone https://github.com/username/nesavent.git
cd nesavent
```

### 2. Install Dependencies
```bash
npm install
# atau jika menggunakan Yarn
yarn install
```

### 3. Konfigurasi Environment
Buat file `.env` di root project dengan konfigurasi berikut:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nesavent
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Midtrans Configuration
MIDTRANS_CLIENT_KEY=SB-Mid-client-XXXXXXXXXXXXXXXX
MIDTRANS_SERVER_KEY=SB-Mid-server-XXXXXXXXXXXXXXXX
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_SNAP_URL=https://app.sandbox.midtrans.com/snap/snap.js

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379
```

### 4. Setup Direktori Uploads
```bash
mkdir -p uploads/events uploads/profiles uploads/documents uploads/student_ktm
```

### 5. Jalankan Server
```bash
# Development mode dengan nodemon
npm run dev

# Production mode
npm start
```

Server berjalan di `http://localhost:5000`

### 6. Seeding Database (Opsional)
Untuk mengisi database dengan data awal:
```bash
npm run seed:db
```

## Fitur Lengkap

### User Authentication & Management
- Multi-role user system (User, Student, Creator, Staff Creator, Admin)
- Login with Google (OAuth integration)
- Email verification
- Profile management dengan update foto profil
- Password reset flow
- Session handling dengan JWT
- Account privacy settings

### Dashboard User
- Personalized dashboard untuk setiap user
- Riwayat pembelian tiket
- Status verifikasi mahasiswa
- Notifikasi dan pemberitahuan
- Upcoming events yang sesuai dengan preferensi user
- Saved events untuk dikunjungi nanti

### Event Management
- Pembuatan event dengan informasi lengkap
- Upload gambar banner/poster
- Pengaturan lokasi dan kapasitas
- Pemilihan kategori dan tag event
- Scheduling dan timeline event
- Event drafting dan publishing
- Event statistics dan insights

### Custom Ticket Types
- Pembuatan tipe tiket dengan nama dan deskripsi kustom (VIP, Regular, Early Bird)
- Pengaturan harga berbeda untuk setiap tipe tiket
- Penentuan kuota tiket per tipe
- Definisi benefit khusus per tipe tiket
- Pengaktifan/penonaktifan tipe tiket
- Early bird dan late registration pricing

### Booking dan Payment
- Pemilihan tipe tiket dari sebuah event
- Checkout process dengan detail pricing
- Payment gateway integration dengan Midtrans
- Multiple payment methods (transfer bank, e-wallet, credit card)
- Receipt dan invoicing system
- Payment status tracking
- Refund management untuk event cancellation

### QR Ticket System
- Pembuatan QR code unik untuk setiap tiket
- QR scanner untuk event creator dan staff
- Validation system untuk mencegah duplikasi
- Check-in recording dan attendance tracking
- Offline validation capability
- Multi-device scanning support

### Transfer Ticket
- Memindahkan tiket ke pengguna lain yang terdaftar
- Pembuatan QR code baru otomatis untuk penerima
- Pencatatan riwayat transfer untuk audit
- Hanya berlaku untuk tiket yang sudah dibayar dan belum divalidasi
- Batasan jumlah transfer per tiket

### Verifikasi Mahasiswa
- Verifikasi otomatis melalui email kampus
- Verifikasi manual melalui upload KTM (Kartu Tanda Mahasiswa)
- Approval/rejection oleh admin
- History verifikasi dan status tracking
- Reminder untuk verifikasi ulang
- Validasi metadata KTM

### Sistem Notifikasi
- Notifikasi dalam aplikasi dan email
- Penanda status dibaca/belum dibaca
- Notifikasi untuk berbagai aktivitas (event, tiket, pembayaran)
- Notifikasi untuk perubahan status event
- Reminder notification untuk upcoming event
- Push notification option

### Email System
- Email konfirmasi registrasi
- Verifikasi email
- Pemberitahuan pembayaran
- Reminder untuk upcoming event
- Tiket elektronik dengan QR code
- Marketing dan newsletter (opt-in)

### Shortlink System
- Pembuatan URL pendek untuk sharing event
- Pelacakan klik pada setiap shortlink
- Statistik referral untuk event creator
- Kode referral unik untuk setiap pengguna
- Pembagian shortlink melalui media sosial
- UTM tracking untuk analisis marketing

### Creator Staff Management
- Pengundangan staff untuk membantu mengelola event
- Pemberian izin granular (scan tiket, lihat peserta, statistik)
- Pembatasan akses staff hanya ke event creator yang mengundang
- Pencatatan aktivitas staff untuk audit
- Staff role customization
- Komunikasi internal antar tim event

### Rating dan Review
- Sistem rating berbintang (1-5)
- Review tekstual untuk event
- Moderasi review oleh admin
- Like/dislike pada review
- Reply dari event creator
- Filter dan sorting review

### Feedback System
- Formulir feedback terstruktur
- Kategori feedback (venue, content, organization)
- Respon dari event creator
- Status tracking untuk feedback (diproses, diselesaikan)
- Feedback reporting dan analisis

### Engagement & Social Features
- Follow sistem untuk creator
- Share event ke media sosial
- Liking dan saving event
- Commenting pada event
- Event recommendation berdasarkan preferensi
- Creator discovery system

### Abuse Reporting
- Pelaporan konten yang melanggar ketentuan
- Kategori laporan (misleading, inappropriate, scam)
- Admin review system
- Notifikasi status laporan
- Automatic content flagging
- Penalty system untuk violators

### Analytics & Reporting
- Dashboard analytics untuk creator
- Laporan penjualan tiket
- Visitor demographics
- Conversion rate tracking
- Attendance statistics
- Performance metrics untuk event
- Export data ke CSV/PDF

### Fitur Admin
- **Dashboard Admin Komprehensif**
  - Statistik platform real-time
  - Overview sistem secara keseluruhan
  - Metrik utama dalam satu tampilan
  - Status sistem dan layanan
  - Notifikasi admin dengan indikator prioritas

- **Sistem Moderasi Konten**
  - Pengelolaan kasus moderasi konten
  - Filter berdasarkan status, jenis konten, dan tingkat keparahan
  - Proses peninjauan dan persetujuan/penolakan konten
  - Notifikasi otomatis untuk kasus moderasi baru
  - Pencatatan tindakan moderasi untuk audit

- **Manajemen Kode Promo**
  - Pembuatan kode promo dengan berbagai jenis (persentase, nominal tetap, gratis)
  - Pengaturan batas penggunaan dan periode validitas
  - Pembatasan untuk event atau kategori tertentu
  - Statistik penggunaan kode promo
  - Aktivasi/deaktivasi kode promo

- **Sistem Laporan Platform**
  - Pembuatan laporan platform (harian, mingguan, bulanan, kuartalan, tahunan)
  - Metrik komprehensif untuk semua aspek platform
  - Visualisasi data dalam bentuk grafik
  - Insight dan rekomendasi otomatis
  - Penerbitan dan distribusi laporan

- **Sistem Notifikasi Admin**
  - Notifikasi dengan tingkat prioritas berbeda
  - Pengelompokan berdasarkan kategori (sistem, moderasi, pembayaran, dll)
  - Penanda telah dibaca dan tindakan telah diambil
  - Notifikasi yang memerlukan tindakan segera
  - Status tracking untuk tindak lanjut

- **User Management**
  - Pencarian dan filter user berdasarkan berbagai kriteria
  - Detail profil lengkap dengan aktivitas
  - Kemampuan untuk mengaktifkan/menonaktifkan akun
  - Persetujuan verifikasi creator dan mahasiswa
  - Pengelolaan hak akses user

- **Keamanan dan Audit**
  - Pencatatan semua aktivitas admin
  - Laporan aktivitas mencurigakan
  - Kontrol akses berdasarkan peran
  - Kebijakan penyimpanan data
  - Pemantauan upaya login yang gagal

### Sistem Reward & Loyalitas

- **User Rewards**
  - Sistem poin loyalitas untuk aktivitas pengguna
  - Berbagai tingkat keanggotaan (Silver, Gold, Platinum)
  - Reward untuk pembelian tiket dan interaksi platform
  - Leaderboard partisipasi pengguna
  - Redeem poin untuk diskon dan benefit ekslusif

- **Sistem Badge & Achievement**
  - Badge untuk berbagai pencapaian (pembelian pertama, pengunjung setia)
  - Milestone achievements untuk event creator
  - Showcase achievement di profil publik
  - Notifikasi untuk badge yang baru diperoleh
  - Exclusive badge untuk pengguna terverifikasi

- **Riwayat Aktivitas User**
  - Pelacakan komprehensif semua aktivitas user (login, pembelian, interaksi)
  - Timeline aktivitas di dashboard pengguna
  - Filter dan pencarian riwayat aktivitas
  - Ekspor data aktivitas user
  - Analisis pola perilaku pengguna

### Fitur Creator Lanjutan

- **Template Event**
  - Pembuatan template untuk tipe event berulang
  - Penyimpanan layout dan konfigurasi tiket
  - Duplikasi cepat event dengan template yang tersimpan
  - Sharing template antar creator
  - Manajemen library template

- **Multi-Event Management**
  - Pengelolaan serangkaian event terkait dalam satu panel
  - Bundling tiket untuk beberapa event
  - Statistik gabungan untuk event series
  - Pembuatan event series dengan jadwal otomatis
  - Migrasi peserta antar event dalam series

- **Sistem Pembayaran Creator**
  - Penjadwalan automatic payout
  - Detil laporan finansial dengan breakdown fee
  - Integrasi dengan berbagai metode pembayaran
  - Pengaturan split payment untuk event kolaboratif
  - Pencatatan riwayat payout dan tax reporting

- **Kolaborasi Antar Creator**
  - Fitur untuk membuat event kolaborasi antar creator
  - Pengaturan pembagian pendapatan dan tanggung jawab
  - Dashboard kolaborasi untuk komunikasi dan tracking
  - Penggabungan komunitas antar creator
  - Statistik perbandingan performa kolaborasi

### Sistem Backup & Keamanan Data

- **Backup Otomatis**
  - Konfigurasi jadwal backup otomatis
  - Backup inkremental dan penuh
  - Penyimpanan multi-lokasi untuk backup
  - Versioning untuk multiple restore points
  - Enkripsi data backup

- **Kebijakan Retensi Data**
  - Pengaturan retensi data per jenis informasi
  - Pembersihan otomatis data yang tidak diperlukan
  - Compliance dengan regulasi privasi data
  - Opsi archiving untuk data histori
  - Notifikasi sebelum penghapusan permanen

- **Pencadangan & Pemulihan Akun**
  - Fitur backup akun untuk pengguna
  - Ekspor data personal dalam format standar
  - Prosedur pemulihan akun yang aman
  - Multi-step verification untuk restorasi data sensitif
  - Timeline pemulihan dengan status real-time

### Optimisasi & Performance
- Caching system untuk data yang sering diakses
- Image optimization untuk banner event
- Database indexing untuk query yang sering digunakan
- Rate limiting yang lebih spesifik per endpoint
- HTTP compression untuk respon server
- Redis integration untuk rate limiting dan caching
- Query optimization dengan pagination dan filtering
- Lazy loading untuk gambar dan data

### Monitoring & Maintenance
- Health check endpoints untuk memantau status sistem
- Error tracking dengan logging dan alerting
- Performance monitoring untuk API dan database
- Automated testing yang lebih luas
- System metrics dashboard
- Real-time logging dan analisis
- Monitoring database connection dan query performance
- Alerting system untuk kondisi kritis

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register akun baru
- `POST /api/auth/login` - Login
- `GET /api/auth/google` - Login dengan Google
- `GET /api/auth/google/callback` - Callback untuk login Google
- `GET /api/auth/verify-email/:token` - Verify email user
- `POST /api/auth/resend-verification` - Kirim ulang verification email
- `GET /api/auth/profile` - Lihat user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/profile/image` - Upload profile picture
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password
- `PUT /api/auth/role` - Update user role (Admin only)

### Student Verification
- `POST /api/student-verification` - Request verifikasi mahasiswa
- `GET /api/student-verification` - Melihat status verifikasi mahasiswa
- `GET /api/student-verification/history` - Melihat riwayat verifikasi mahasiswa
- `PUT /api/student-verification/:id/approve` - Menyetujui verifikasi mahasiswa (Admin only)
- `PUT /api/student-verification/:id/reject` - Menolak verifikasi mahasiswa (Admin only)
- `GET /api/student-verification/admin` - Melihat daftar request verifikasi mahasiswa (Admin only)

### Events
- `GET /api/events` - Get semua event
- `GET /api/events/my-events` - Get event yang dibuat oleh user yang login
- `GET /api/events/:id` - Get detail event
- `POST /api/events` - Create event baru
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/ticket-types` - Manage custom ticket types

### Tickets
- `POST /api/tickets` - Purchase ticket
- `GET /api/tickets` - Get semua ticket user
- `GET /api/tickets/:id` - Get detail ticket
- `POST /api/tickets/:id/resend-email` - Kirim ulang confirmation email ticket
- `PUT /api/tickets/:id/cancel` - Cancel ticket
- `POST /api/tickets/:id/transfer` - Transfer ticket ke pengguna lain
- `POST /api/tickets/validate` - Validate ticket QR code

### Payments
- `POST /api/payment/notification` - Callback notification dari Midtrans
- `GET /api/payment/status/:id` - Check payment status

### Notifications
- `GET /api/notifications` - Mendapatkan daftar notifikasi user
- `PATCH /api/notifications/:notificationId/read` - Menandai notifikasi sebagai telah dibaca
- `PATCH /api/notifications/read-all` - Menandai semua notifikasi sebagai telah dibaca

### Ratings & Reviews
- `POST /api/events/:eventId/ratings` - Memberikan rating dan review untuk event
- `GET /api/events/:eventId/ratings` - Melihat rating dan review event
- `GET /api/user/ratings` - Melihat rating dan review yang diberikan user
- `PUT /api/ratings/:ratingId` - Mengupdate rating dan review
- `DELETE /api/ratings/:ratingId` - Menghapus rating dan review
- `POST /api/ratings/:ratingId/like` - Menyukai review
- `PUT /api/ratings/:ratingId/flag` - Melaporkan review yang tidak pantas

### Feedback
- `POST /api/events/:eventId/feedback` - Memberikan feedback untuk event
- `GET /api/events/:eventId/feedback` - Melihat feedback event
- `GET /api/events/:eventId/feedback/statistics` - Melihat statistik feedback event
- `GET /api/user/feedback` - Melihat feedback yang diberikan user
- `PUT /api/feedback/:feedbackId` - Mengupdate feedback
- `DELETE /api/feedback/:feedbackId` - Menghapus feedback
- `POST /api/feedback/:feedbackId/respond` - Merespon feedback
- `PUT /api/feedback/:feedbackId/status` - Mengubah status feedback

### Social Sharing
- `POST /api/events/:eventId/share` - Membuat link share untuk event
- `GET /api/events/:eventId/share-links` - Mendapatkan link share untuk event
- `GET /api/events/:eventId/shares` - Melihat data share event
- `GET /api/events/:eventId/shares/statistics` - Melihat statistik share event
- `GET /api/user/shares` - Melihat history share user
- `GET /api/track-share/:referralCode` - Melacak click pada link share

### Creator Follow
- `POST /api/creators/:creatorId/follow` - Follow creator
- `DELETE /api/creators/:creatorId/follow` - Unfollow creator
- `GET /api/creators/:creatorId/followers` - Melihat followers creator
- `GET /api/creators/:creatorId/follow-status` - Melihat status follow creator
- `PUT /api/creators/:creatorId/notifications` - Mengatur notifikasi creator
- `GET /api/user/following` - Melihat creator yang difollow user
- `GET /api/creators/top` - Melihat top creators
- `GET /api/creators/suggested` - Melihat suggested creators untuk user

### Abuse Report
- `POST /api/reports` - Membuat laporan penyalahgunaan
- `GET /api/reports/my-reports` - Melihat laporan yang dibuat oleh user
- `GET /api/reports/:id` - Melihat detail laporan
- `GET /api/reports` - Melihat semua laporan (Admin only)
- `PATCH /api/reports/:id/status` - Memperbarui status laporan (Admin only)
- `POST /api/reports/:id/related` - Menambahkan laporan terkait (Admin only)
- `GET /api/reports/stats/overview` - Melihat statistik laporan penyalahgunaan (Admin only)

### Staff Management
- `POST /api/creator/staff/invite` - Mengundang pengguna menjadi staff
- `GET /api/creator/staff` - Mendapatkan daftar staff
- `PATCH /api/creator/staff/:staffId` - Memperbarui izin staff
- `DELETE /api/creator/staff/:staffId` - Menghapus staff

### User Rewards
- `GET /api/rewards/my-points` - Melihat poin yang dimiliki
- `GET /api/rewards/redeem-options` - Melihat opsi penukaran poin
- `POST /api/rewards/redeem` - Menukarkan poin dengan reward
- `GET /api/rewards/history` - Melihat riwayat poin dan penukaran
- `GET /api/rewards/level` - Melihat level keanggotaan dan progress

### Monitoring (Admin Only)
- `GET /api/monitoring/health` - Memeriksa status sistem
- `GET /api/monitoring/metrics` - Mendapatkan metrics kinerja sistem
- `GET /api/monitoring/errors` - Melihat riwayat error
- `GET /api/monitoring/performance` - Metrics performa API
- `GET /api/monitoring/logs` - Melihat application logs
- `GET /api/monitoring/system` - Informasi sistem server
- `POST /api/monitoring/test-alerts` - Menguji sistem alerting

### Backup & Data Management
- `POST /api/backup/schedule` - Menjadwalkan backup (Admin only)
- `GET /api/backup/history` - Melihat riwayat backup (Admin only)
- `POST /api/backup/restore` - Memulihkan dari backup (Admin only)
- `GET /api/user/data-export` - Mengekspor data pribadi user
- `DELETE /api/user/data` - Meminta penghapusan data pribadi

## Teknologi yang Digunakan

- **Backend**: Express.js, Node.js
- **Database**: MongoDB, Mongoose
- **Authentication**: JWT, Google OAuth
- **Security**: Bcrypt, Helmet
- **Email**: Nodemailer
- **Payment**: Midtrans Gateway
- **Caching**: Node-cache, Redis
- **Image Processing**: Sharp
- **Compression**: Compression middleware
- **Monitoring**: Winston, Morgan
- **Testing**: Jest, Supertest
- **Documentation**: Swagger, JSDoc
- **CI/CD**: GitHub Actions
- **Hosting**: AWS, Docker

## Struktur Folder

```
nesavent/
├── src/                    # Source code
│   ├── controllers/        # Logic controllers
│   ├── middleware/         # Express middleware
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── services/           # Business services
│   ├── utils/              # Utility functions
│   ├── config/             # Configuration files
│   ├── templates/          # Email templates
│   └── migrations/         # Database migrations
├── uploads/                # Uploaded files
├── logs/                   # Application logs
├── tests/                  # Test files
├── scripts/                # Maintenance scripts
└── .env                    # Environment variables
```

## Panduan Deployment

1. Setup server dengan Node.js (v14+) dan MongoDB
2. Clone repository dan install dependencies
3. Konfigurasi file .env dengan credential yang benar
4. Setup direktori uploads dan berikan permission yang tepat
5. Jalankan build script untuk produksi: `npm run build`
6. Setup PM2 atau process manager lain: `pm2 start dist/app.js --name nesavent`
7. Setup reverse proxy (Nginx/Apache) untuk produksi
8. Konfigurasi SSL certificate untuk HTTPS
9. Setup monitoring dan logging
10. Konfigurasi backup database otomatis

## Kontribusi

Kami menerima kontribusi untuk pengembangan platform ini. Silakan fork repository dan ajukan pull request Anda.

1. Fork repository ini
2. Buat branch baru: `git checkout -b fitur-baru`
3. Commit perubahan Anda: `git commit -m 'Menambahkan fitur baru'`
4. Push ke branch: `git push origin fitur-baru`
5. Ajukan pull request