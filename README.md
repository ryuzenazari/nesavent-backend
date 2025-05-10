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

## Installation

1. Clone repository
   ```bash
git clone https://github.com/username/nesavent.git
cd nesavent
```

2. Install dependencies
   ```bash
npm install
```

3. Setup file `.env` dengan credentials yang diperlukan

4. Jalankan server
   ```bash
npm run dev
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

### Security & Compliance
- Rate limiting untuk API endpoints
- Input validation dan sanitization
- XSS protection
- CSRF protection
- Data encryption
- Audit logging untuk aktivitas sensitif
- Data retention policy
- GDPR compliance features
- Privacy controls untuk user

### Analytics & Reporting
- Dashboard analytics untuk creator
- Laporan penjualan tiket
- Visitor demographics
- Conversion rate tracking
- Attendance statistics
- Performance metrics untuk event
- Export data ke CSV/PDF

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

## Teknologi yang Digunakan

- **Backend**: Express.js, Node.js
- **Database**: MongoDB, Mongoose
- **Authentication**: JWT, Google OAuth
- **Security**: Bcrypt, Helmet
- **Email**: Nodemailer
- **Payment**: Midtrans Gateway

## Struktur Folder

```
nesavent/
├── src/                    # Source code
│   ├── controllers/        # Logic controllers
│   ├── middleware/         # Express middleware
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── services/           # Business services
│   └── utils/              # Utility functions
├── uploads/                # Uploaded files
└── .env                    # Environment variables
```

## Panduan Deployment

1. Setup server dengan Node.js dan MongoDB
2. Clone repository dan install dependencies
3. Konfigurasi file .env dengan credential yang benar
4. Jalankan build script dan start server
5. Setup reverse proxy (Nginx/Apache) untuk produksi

## Kontribusi

Kami menerima kontribusi untuk pengembangan platform ini. Silakan fork repository dan ajukan pull request Anda.
