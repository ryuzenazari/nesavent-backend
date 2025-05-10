# NesaVent - Platform Ticketing untuk Event Kampus

NesaVent adalah platform penjualan tiket event untuk komunitas kampus di Surabaya. Aplikasi ini dikembangkan oleh mahasiswa sebagai proyek independen, dibangun dengan Express.js dan MongoDB, serta terintegrasi dengan Midtrans untuk payment.

> **Pernyataan**: NesaVent adalah platform independen yang dibuat oleh mahasiswa dan tidak terafiliasi secara resmi dengan Universitas Negeri Surabaya (UNESA).

## Features

- Authentication user dengan berbagai role (user, student, creator, staff_creator, admin)
- **Login with Google**
- Management event (list, detail, search)
- Booking dan purchase ticket
- **Custom ticket types** yang dapat dikonfigurasi oleh creator (name, description, price, quota, dan benefit)
- Payment system terintegrasi Midtrans
- User dashboard untuk melihat ticket yang dibeli
- Profile picture untuk user
- Banner/poster untuk event
- QR code untuk validasi ticket
- Email notification untuk konfirmasi registration, payment, dan informasi event
- Email verification untuk user
- API security dengan rate limiting
- Activity logging
- **Short Link system untuk sharing event**
- **Transfer ticket ke pengguna lain**
- **Verifikasi Mahasiswa yang Lebih Fleksibel**
- **Fitur Sosial & Engagement**

## User Roles

- **User**: User umum yang dapat membeli regular ticket
- **Student**: Student (diverifikasi melalui email domain kampus atau KTM) yang dapat membeli ticket dengan harga khusus
- **Creator**: Event creator yang dapat membuat dan mengelola event mereka sendiri
- **Staff Creator**: Staff yang dapat membuat dan mengelola semua event 
- **Admin**: System administrator dengan full access

## Requirements

- Node.js (v14+)
- MongoDB
- NPM atau Yarn
- Akun Midtrans (untuk payment gateway)

## Installation

1. Clone repository ini
```
git clone https://github.com/username/nesavent.git
cd nesavent
```

2. Install dependencies
```
npm install
```

3. Buat file `.env` sesuai dengan contoh berikut:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nesavent
JWT_SECRET=nesavent_jwt_secret_key
JWT_EXPIRES_IN=7d
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
MIDTRANS_CLIENT_KEY=SB-Mid-client-XXXXXXXXXXXXXXXX
MIDTRANS_SERVER_KEY=SB-Mid-server-XXXXXXXXXXXXXXXX
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_SNAP_URL=https://app.sandbox.midtrans.com/snap/snap.js
MIDTRANS_MERCHANT_ID=G12345678
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

4. Buat direktori uploads
```
mkdir -p uploads/events uploads/profiles uploads/documents uploads/student_ktm
```

5. Jalankan server
```
npm run dev
```

Server akan berjalan di `http://localhost:5000`

## Seeding Database

Untuk mengisi database dengan data awal untuk testing, jalankan:

```
npm run seed:db
```

Ini akan mengisi database dengan:
- User dengan berbagai role (admin, creator, staff, student, user)
- Event dengan custom ticket types
- Ticket yang sudah dibeli
- Request verifikasi mahasiswa

Credentials untuk semua user dalam data awal ini:
- Password: `password123`
- Email: lihat di terminal atau kode `seedDb.js`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register akun baru
- `POST /api/auth/login` - Login
- `GET /api/auth/google` - Login dengan Google (NEW!)
- `GET /api/auth/google/callback` - Callback untuk login Google (NEW!)
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

### Ratings & Reviews
- `POST /api/events/:eventId/ratings` - Memberikan rating dan review untuk event
- `GET /api/events/:eventId/ratings` - Melihat rating dan review event
- `GET /api/user/ratings` - Melihat rating dan review yang diberikan user
- `PUT /api/ratings/:ratingId` - Mengupdate rating dan review
- `DELETE /api/ratings/:ratingId` - Menghapus rating dan review
- `POST /api/ratings/:ratingId/like` - Menyukai review
- `PUT /api/ratings/:ratingId/flag` - Melaporkan review yang tidak pantas (Admin only)

### Feedback
- `POST /api/events/:eventId/feedback` - Memberikan feedback untuk event
- `GET /api/events/:eventId/feedback` - Melihat feedback event
- `GET /api/events/:eventId/feedback/statistics` - Melihat statistik feedback event (Creator only)
- `GET /api/user/feedback` - Melihat feedback yang diberikan user
- `PUT /api/feedback/:feedbackId` - Mengupdate feedback
- `DELETE /api/feedback/:feedbackId` - Menghapus feedback
- `POST /api/feedback/:feedbackId/respond` - Merespon feedback (Creator only)
- `PUT /api/feedback/:feedbackId/status` - Mengubah status feedback (Creator only)

### Social Sharing
- `POST /api/events/:eventId/share` - Membuat link share untuk event
- `GET /api/events/:eventId/share-links` - Mendapatkan link share untuk event
- `GET /api/events/:eventId/shares` - Melihat data share event (Creator only)
- `GET /api/events/:eventId/shares/statistics` - Melihat statistik share event (Creator only)
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

### Events
- `GET /api/events` - Get semua event
- `GET /api/events/my-events` - Get event yang dibuat oleh user yang login (Creator, Staff Creator, Admin)
- `GET /api/events/:id` - Get detail event
- `POST /api/events` - Create event baru (Creator, Staff Creator, Admin)
  - Support upload image dan banner event (multipart/form-data)
- `PUT /api/events/:id` - Update event (Event Owner, Staff Creator, Admin)
  - Support update image dan banner event (multipart/form-data)
- `DELETE /api/events/:id` - Delete event (Event Owner, Staff Creator, Admin)
- `POST /api/events/ticket-types` - Manage custom ticket types (Creator, Admin)

### Tickets
- `POST /api/tickets` - Purchase ticket
- `GET /api/tickets` - Get semua ticket user
- `GET /api/tickets/:id` - Get detail ticket
- `POST /api/tickets/:id/resend-email` - Kirim ulang confirmation email ticket
- `PUT /api/tickets/:id/cancel` - Cancel ticket
- `POST /api/tickets/:id/transfer` - Transfer ticket ke pengguna lain (NEW!)
- `POST /api/tickets/validate` - Validate ticket QR code (Staff Creator, Admin)

### Payments
- `POST /api/payment/notification` - Callback notification dari Midtrans
- `GET /api/payment/status/:id` - Check payment status

### Notifications
- `GET /api/notifications` - Mendapatkan daftar notifikasi user
- `PATCH /api/notifications/:notificationId/read` - Menandai notifikasi sebagai telah dibaca
- `PATCH /api/notifications/read-all` - Menandai semua notifikasi sebagai telah dibaca

## Custom Ticket Types Feature

NesaVent memungkinkan event creator untuk membuat dan mengelola custom ticket types dengan:

- **Name dan description** - Misalnya "VIP", "Regular", "Early Bird", dll
- **Varied pricing** - Setiap ticket type dapat memiliki price yang berbeda
- **Ticket quota** - Mengatur jumlah ticket yang available per type
- **Benefits** - Mendefinisikan benefits khusus untuk setiap ticket type
- **Active status** - Mengaktifkan atau menonaktifkan ticket types tertentu

Ticket buyers dapat memilih ticket type yang sesuai dengan kebutuhan mereka, dan sistem akan mencatat benefits yang mereka dapatkan dari ticket type tersebut.

## Transfer Ticket Feature

NesaVent sekarang memungkinkan pengguna untuk mentransfer tiket mereka ke pengguna lain yang terdaftar di sistem. Fitur ini berguna ketika:
- Pengguna tidak dapat menghadiri acara dan ingin memberikan tiketnya kepada teman atau keluarga
- Tiket dibeli untuk orang lain dan perlu ditransfer ke akun mereka
- Mengorganisir distribusi tiket untuk kelompok

Cara kerjanya:
1. Pemilik tiket memilih tiket yang ingin ditransfer dan memasukkan email penerima
2. Sistem memverifikasi bahwa penerima terdaftar di NesaVent
3. Tiket ditransfer ke akun penerima dengan QR code baru yang dibuat
4. Kedua pihak menerima email konfirmasi
5. Semua aktivitas transfer dicatat dalam histori tiket untuk tujuan audit

Syarat untuk mentransfer tiket:
- Tiket harus sudah dibayar
- Tiket belum digunakan
- Tiket tidak dibatalkan
- Penerima harus memiliki akun yang terdaftar di NesaVent

API untuk transfer tiket tersedia melalui endpoint `POST /api/tickets/:id/transfer` dengan parameter `recipientEmail`.

## Notification System

NesaVent memiliki sistem notifikasi yang komprehensif untuk memastikan pengguna selalu mendapat informasi terkini tentang aktivitas mereka di platform.

### Jenis Notifikasi
- **Event Approval** - Notifikasi untuk admin ketika ada event gratis baru yang membutuhkan persetujuan
- **Ticket Purchase** - Konfirmasi pembelian tiket
- **Payment Confirmation** - Konfirmasi pembayaran berhasil
- **Ticket Transfer** - Notifikasi untuk pengirim dan penerima saat tiket ditransfer
- **Event Reminder** - Pengingat event yang akan datang

### Fitur Notifikasi
- Notifikasi real-time di aplikasi
- Email notification untuk informasi penting
- Status dibaca/belum dibaca
- Pagination untuk daftar notifikasi
- Mark as read untuk notifikasi individual
- Mark all as read untuk semua notifikasi

### API Endpoints
- `GET /api/notifications` - Mendapatkan daftar notifikasi user
- `PATCH /api/notifications/:notificationId/read` - Menandai notifikasi sebagai telah dibaca
- `PATCH /api/notifications/read-all` - Menandai semua notifikasi sebagai telah dibaca

## Social Login Feature

NesaVent kini mendukung login dengan Google untuk memudahkan pengguna mendaftar dan masuk ke aplikasi.

Cara kerjanya:
1. User mengklik tombol "Login with Google" di halaman login
2. User akan diarahkan ke halaman autentikasi Google
3. Setelah autentikasi berhasil, user akan dikembalikan ke aplikasi
4. Jika email user belum terdaftar, sistem akan membuat akun baru secara otomatis
5. Jika email sudah terdaftar, akun yang ada akan ditautkan dengan Google

Keuntungan menggunakan Login with Google:
- Login dengan satu klik
- Tidak perlu mengingat password tambahan
- Email otomatis terverifikasi
- Profil otomatis diisi (nama dan foto)

## Technologies Used

- Express.js - Web framework
- MongoDB - Database
- Mongoose - ODM untuk MongoDB
- JWT - Authentication
- Multer - File uploads
- Bcrypt - Password encryption
- QRCode - Ticket QR code generation
- Nodemailer - Email sending
- Winston - Logging
- Rate Limiter - API security
- Helmet - Security headers
- Midtrans - Payment gateway
- Jest - Unit testing

## Midtrans Integration

NesaVent terintegrasi dengan Midtrans sebagai payment gateway. Untuk menggunakan payment feature:

1. Register akun di [Midtrans](https://midtrans.com)
2. Get API keys dari Midtrans Dashboard
3. Set Midtrans configuration di file `.env`
4. Gunakan Sandbox mode untuk testing

## Folder Structure

```
nesavent/
├── logs/                   # Log files
├── src/                    # Source code
│   ├── controllers/        # Logic controllers
│   ├── middleware/         # Express middleware
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── services/           # Business services
│   ├── utils/              # Utility functions
│   └── app.js              # Express app setup
├── uploads/                # Uploaded files
│   ├── events/             # Event images dan banners
│   ├── profiles/           # User profile pictures
│   ├── documents/          # Event-related documents
│   └── student_ktm/        # KTM uploads for student verification
├── .env                    # Environment variables
└── package.json            # Dependencies dan scripts
```

## Creating Admin User

Untuk testing dan system administration, Anda dapat membuat admin user secara otomatis dengan menjalankan command:

```
npm run create:admin
```

Command ini akan membuat admin user dengan credentials:
- Email: admin@example.com
- Password: admin123

Admin user memiliki access ke semua features, termasuk mengubah role user lain.

## Short Link ()

NesaVent kini dilengkapi dengan Short Link system yang memungkinkan user untuk:

1. Membuat short link untuk event atau ticket tertentu
2. Track jumlah visits pada Short Link
3. Membuat Short Link untuk external URL
4. Set expiry date untuk Short Link

Untuk menggunakan Short Link feature, akses endpoints berikut:

- `POST /api/shortlinks` - Create Short Link baru
- `GET /api/shortlinks` - View list Short Link yang dibuat
- `GET /s/{code}` - Access Short Link langsung (public)

Event creators juga dapat membuat Short Link untuk event mereka dengan endpoint:
- `POST /api/events/{id}/shortlink` - Create Short Link khusus untuk event

## Verifikasi Mahasiswa Fleksibel

NesaVent kini mendukung verifikasi mahasiswa yang lebih fleksibel dengan dua opsi:

### Opsi Verifikasi
1. **Email Kampus** - Mahasiswa dapat memverifikasi status mereka menggunakan email dengan domain kampus
2. **KTM (Kartu Tanda Mahasiswa)** - Mahasiswa dapat mengupload gambar KTM mereka untuk diverifikasi oleh admin

### Proses Verifikasi
1. User mengakses halaman verifikasi mahasiswa
2. User memilih metode verifikasi (email kampus atau upload KTM)
3. Jika memilih email kampus, sistem akan mengirimkan email verifikasi
4. Jika memilih KTM, user dapat mengupload gambar KTM mereka
5. Admin akan mereview dan menyetujui atau menolak request verifikasi
6. User akan menerima notifikasi tentang status verifikasi mereka
7. Setelah diverifikasi, role user akan terupdate menjadi "student" dan dapat membeli tiket khusus mahasiswa

### Keuntungan
- Fleksibilitas dalam metode verifikasi
- Opsi verifikasi instan via email kampus
- Opsi verifikasi manual via KTM untuk mahasiswa yang tidak memiliki email kampus
- Riwayat verifikasi tersimpan untuk tujuan audit
- Update status otomatis setelah verifikasi berhasil

### API Endpoints
- `POST /api/student-verification` - Request verifikasi mahasiswa
- `GET /api/student-verification` - Melihat status verifikasi mahasiswa
- `GET /api/student-verification/history` - Melihat riwayat verifikasi mahasiswa
- `PUT /api/student-verification/:id/approve` - Menyetujui verifikasi mahasiswa (Admin only)
- `PUT /api/student-verification/:id/reject` - Menolak verifikasi mahasiswa (Admin only)
- `GET /api/student-verification/admin` - Melihat daftar request verifikasi mahasiswa (Admin only)

## Fitur Sosial & Engagement

NesaVent kini dilengkapi dengan berbagai fitur sosial dan engagement untuk meningkatkan interaksi user, mendapatkan feedback, dan mendorong pertumbuhan komunitas.

### Rating & Review System
- Rating bintang 1-5 untuk setiap event
- Review detail dengan teks dan opsional gambar
- Like untuk review yang bermanfaat dari user lain
- Sistem moderasi untuk menandai review yang tidak pantas
- Skor rating rata-rata ditampilkan pada event
- Pengelompokan review berdasarkan rating dan sortir (terbaru, tertinggi, terendah)

### Social Sharing
- Berbagi event langsung ke berbagai platform media sosial (Facebook, Twitter, WhatsApp, Telegram, Instagram)
- Short link otomatis untuk sharing
- Tracking click dan conversion untuk link share
- Analitik performa share untuk creator event
- Referral code untuk atribusi tiket yang terjual dari share

### Feedback System
- Feedback terstruktur dengan kategori (venue, organisasi, konten, pembicara, fasilitas, harga)
- Tipe feedback yang dapat dipilih (saran, keluhan, apresiasi, pertanyaan)
- Opsi anonim untuk feedback
- Respon langsung dari creator event
- Dashboard statistik feedback untuk penyelenggara

### Creator Follow
- Follow penyelenggara event favorit
- Notifikasi untuk event baru dari creator yang diikuti
- Notifikasi untuk update event
- Pengaturan preferensi notifikasi (event baru, update, penawaran khusus)
- Daftar creator yang direkomendasikan berdasarkan preferensi dan riwayat

### Manfaat
- Meningkatkan engagement dan loyalitas user
- Mendapatkan insight berharga untuk peningkatan event
- Memperluas jangkauan event melalui sharing
- Membangun komunitas di sekitar creator event
- Memberikan pengalaman yang lebih personal dan terhubung

### API Endpoints Utama
- Rating & Review: `/api/events/:eventId/ratings`
- Feedback: `/api/events/:eventId/feedback`
- Social Sharing: `/api/events/:eventId/share`
- Creator Follow: `/api/creators/:creatorId/follow`
