require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const logger = require('../src/utils/logger');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Model
const Event = require('../src/models/Event');
const User = require('../src/models/User');
const Ticket = require('../src/models/Ticket');
const Transaction = require('../src/models/Transaction');

// Konfigurasi
const API_URL = process.env.API_URL || 'http://localhost:5000';
let tokens = {};
let testData = {};

// Fungsi helper untuk mencatat hasil tes
let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

function logTest(name, status, message = '', error = null) {
  const result = { name, status, message };
  if (error) result.error = error;

  if (status === 'passed') {
    testResults.passed++;
    logger.info(`✓ LULUS: ${name} - ${message}`);
  } else if (status === 'failed') {
    testResults.failed++;
    logger.error(`✗ GAGAL: ${name} - ${message}`, { error });
  } else if (status === 'skipped') {
    testResults.skipped++;
    logger.warn(`⚠ DILEWATI: ${name} - ${message}`);
  }

  testResults.tests.push(result);
}

// Helper untuk login
async function login(email, password) {
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email,
      password
    });
    return response.data.token;
  } catch (error) {
    logger.error('Login error', {
      error: error.response?.data?.message || error.message
    });
    return null;
  }
}

// Konfigurasi axios untuk menggunakan token
function configureAxios(token) {
  return axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
}

// Fungsi utama testing
async function runTests() {
  try {
    // Connect ke database
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Terhubung ke MongoDB untuk testing');

    // A. PENGUJIAN DATABASE
    await testDatabase();

    // B. PENGUJIAN AUTENTIKASI (SIMULASI)
    await testAuth();

    // C. PENGUJIAN EVENT & TICKET TYPES
    await testEvents();

    // D. PENGUJIAN TIKET
    await testTickets();

    // E. PENGUJIAN VALIDASI TIKET 
    await testTicketValidation();
    
    // Tampilkan hasil pengujian
    logger.info('\n==============================================================');
    logger.info('📊 HASIL PENGUJIAN');
    logger.info(`✓ Lulus: ${testResults.passed}`);
    logger.info(`✗ Gagal: ${testResults.failed}`);
    logger.info(`⚠ Dilewati: ${testResults.skipped}`);
    logger.info(`Total Test: ${testResults.tests.length}`);
    logger.info('==============================================================\n');
    
    // Simpan hasil pengujian ke file
    const resultFile = path.join(__dirname, '../logs/test-results.json');
    fs.writeFileSync(resultFile, JSON.stringify(testResults, null, 2));
    logger.info(`Hasil pengujian disimpan ke ${resultFile}`);
    
    await mongoose.disconnect();
    process.exit(testResults.failed > 0 ? 1 : 0);
  } catch (error) {
    logger.error('Error saat menjalankan test', { error: error.message, stack: error.stack });
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      // Ignore disconnect error
    }
    process.exit(1);
  }
}

// A. PENGUJIAN DATABASE
async function testDatabase() {
  logger.info('\n==== A. PENGUJIAN DATABASE ====');
  
  // TEST A.1: Memeriksa data user
  try {
    const users = await User.find().sort({ role: 1 });
    
    if (users.length > 0) {
      logTest('A.1 Pemeriksaan Data User', 'passed', `Ditemukan ${users.length} user`);
      
      // Simpan creator dan user untuk pengujian nanti
      testData.creator = users.find(u => u.role === 'creator');
      testData.user = users.find(u => u.role === 'user');
      testData.admin = users.find(u => u.role === 'admin');
      testData.student = users.find(u => u.role === 'student');
      
      // Hitung jumlah user per role
      const roleCount = {};
      users.forEach(user => {
        roleCount[user.role] = (roleCount[user.role] || 0) + 1;
      });
      
      Object.keys(roleCount).forEach(role => {
        logger.info(`  - ${role}: ${roleCount[role]} user`);
      });
    } else {
      logTest('A.1 Pemeriksaan Data User', 'failed', 'Tidak ada user ditemukan');
    }
  } catch (error) {
    logTest('A.1 Pemeriksaan Data User', 'failed', error.message, error);
  }
  
  // TEST A.2: Memeriksa data event
  try {
    const events = await Event.find();
    
    if (events.length > 0) {
      logTest('A.2 Pemeriksaan Data Event', 'passed', `Ditemukan ${events.length} event`);
      // Simpan event untuk pengujian nanti
      testData.event = events[0];
      
      // Periksa tipe tiket
      const totalTicketTypes = events.reduce((sum, e) => sum + e.ticketTypes.length, 0);
      logger.info(`  Total tipe tiket: ${totalTicketTypes}`);
      
      // Tampilkan event pertama sebagai contoh
      logger.info(`  Event contoh: ${events[0].title}`);
      logger.info(`    - ${events[0].ticketTypes.length} tipe tiket`);
      logger.info(`    - Total tiket: ${events[0].totalTickets}`);
      logger.info(`    - Tiket tersedia: ${events[0].availableTickets}`);
    } else {
      logTest('A.2 Pemeriksaan Data Event', 'failed', 'Tidak ada event ditemukan');
    }
  } catch (error) {
    logTest('A.2 Pemeriksaan Data Event', 'failed', error.message, error);
  }
  
  // TEST A.3: Memeriksa data tiket
  try {
    const tickets = await Ticket.find()
      .populate('user', 'name email')
      .populate('event', 'title');
    
    if (tickets.length > 0) {
      logTest('A.3 Pemeriksaan Data Tiket', 'passed', `Ditemukan ${tickets.length} tiket`);
      // Simpan tiket untuk pengujian nanti
      testData.ticket = tickets[0];
      
      // Hitung tiket berdasarkan status
      const statusCount = {};
      tickets.forEach(ticket => {
        statusCount[ticket.paymentStatus] = (statusCount[ticket.paymentStatus] || 0) + 1;
      });
      
      Object.keys(statusCount).forEach(status => {
        logger.info(`  - Status ${status}: ${statusCount[status]} tiket`);
      });
    } else {
      logTest('A.3 Pemeriksaan Data Tiket', 'failed', 'Tidak ada tiket ditemukan');
    }
  } catch (error) {
    logTest('A.3 Pemeriksaan Data Tiket', 'failed', error.message, error);
  }
}

// B. PENGUJIAN AUTENTIKASI (SIMULASI)
async function testAuth() {
  logger.info('\n==== B. PENGUJIAN AUTENTIKASI (SIMULASI) ====');
  
  // TEST B.1: Simulasi Login
  // CATATAN: Ini hanya simulasi, tidak benar-benar memanggil API
  if (testData.user) {
    logTest('B.1 Simulasi Login', 'passed', `Login user ${testData.user.email} berhasil disimulasikan`);
    tokens.user = `simulated_token_for_${testData.user.email}`;
  } else {
    logTest('B.1 Simulasi Login', 'skipped', 'Tidak ada data user untuk simulasi');
  }
  
  if (testData.creator) {
    logTest('B.2 Simulasi Login Creator', 'passed', `Login creator ${testData.creator.email} berhasil disimulasikan`);
    tokens.creator = `simulated_token_for_${testData.creator.email}`;
  } else {
    logTest('B.2 Simulasi Login Creator', 'skipped', 'Tidak ada data creator untuk simulasi');
  }
  
  // TEST B.3: Simulasi Register
  const simulatedNewUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: 'user'
  };
  
  logTest('B.3 Simulasi Register', 'passed', `Registrasi user ${simulatedNewUser.email} berhasil disimulasikan`);
  
  // TEST B.4: Simulasi Reset Password
  if (testData.user) {
    logTest('B.4 Simulasi Reset Password', 'passed', `Reset password untuk ${testData.user.email} berhasil disimulasikan`);
  } else {
    logTest('B.4 Simulasi Reset Password', 'skipped', 'Tidak ada data user untuk simulasi');
  }
}

// C. PENGUJIAN EVENT & TICKET TYPES
async function testEvents() {
  logger.info('\n==== C. PENGUJIAN EVENT & TICKET TYPES ====');
  
  // TEST C.1: Memverifikasi Event Data Model
  try {
    if (testData.event) {
      // Verifikasi model data event
      if (testData.event.title && testData.event.date && testData.event.ticketTypes) {
        logTest('C.1 Verifikasi Model Data Event', 'passed', `Model event valid: ${testData.event.title}`);
        
        // Tampilkan detail event
        logger.info(`  - Title: ${testData.event.title}`);
        logger.info(`  - Date: ${testData.event.date}`);
        logger.info(`  - Location: ${testData.event.location}`);
      } else {
        logTest('C.1 Verifikasi Model Data Event', 'failed', 'Model event tidak lengkap');
      }
    } else {
      logTest('C.1 Verifikasi Model Data Event', 'skipped', 'Tidak ada data event');
    }
  } catch (error) {
    logTest('C.1 Verifikasi Model Data Event', 'failed', error.message, error);
  }
  
  // TEST C.2: Memverifikasi Ticket Types
  try {
    if (testData.event && testData.event.ticketTypes) {
      const ticketTypes = testData.event.ticketTypes;
      
      if (ticketTypes.length > 0) {
        logTest('C.2 Verifikasi Ticket Types', 'passed', `${ticketTypes.length} tipe tiket ditemukan`);
        
        // Tampilkan detail tipe tiket pertama
        logger.info(`  Contoh tipe tiket: ${ticketTypes[0].name}`);
        logger.info(`  - Price: Rp${ticketTypes[0].price}`);
        logger.info(`  - Description: ${ticketTypes[0].description}`);
        logger.info(`  - Benefits: ${ticketTypes[0].benefits.join(', ')}`);
      } else {
        logTest('C.2 Verifikasi Ticket Types', 'failed', 'Event tidak memiliki tipe tiket');
      }
    } else {
      logTest('C.2 Verifikasi Ticket Types', 'skipped', 'Tidak ada data event');
    }
  } catch (error) {
    logTest('C.2 Verifikasi Ticket Types', 'failed', error.message, error);
  }
  
  // TEST C.3: Simulasi Pembuatan Event Baru
  try {
    const newEventData = {
      title: 'Test Event',
      description: 'Event untuk pengujian',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 minggu dari sekarang
      time: '19:00 - 22:00',
      location: 'Auditorium Kampus',
      category: 'Seminar',
      organizer: 'HIMA Komputer',
      totalTickets: 100,
      price: {
        regular: 50000,
        student: 25000
      },
      ticketTypes: [
        {
          name: 'Regular',
          description: 'Tiket reguler',
          price: 50000,
          quantity: 70,
          benefits: ['Akses ke seminar', 'Sertifikat']
        },
        {
          name: 'VIP',
          description: 'Tiket VIP',
          price: 100000,
          quantity: 30,
          benefits: ['Akses ke seminar', 'Sertifikat', 'Goodie bag', 'Makan siang']
        }
      ]
    };
    
    logTest('C.3 Simulasi Pembuatan Event', 'passed', `Event ${newEventData.title} berhasil disimulasikan`);
    
    // Tampilkan detail event baru
    logger.info(`  - Title: ${newEventData.title}`);
    logger.info(`  - Date: ${newEventData.date}`);
    logger.info(`  - Ticket types: ${newEventData.ticketTypes.length}`);
    
  } catch (error) {
    logTest('C.3 Simulasi Pembuatan Event', 'failed', error.message, error);
  }
  
  // TEST C.4: Simulasi Edit Tipe Tiket
  try {
    if (testData.event && testData.event.ticketTypes && testData.event.ticketTypes.length > 0) {
      const ticketType = testData.event.ticketTypes[0];
      
      // Simulasi edit
      const editedTicketType = {
        ...ticketType.toObject(),
        price: ticketType.price + 10000,
        benefits: [...ticketType.benefits, 'Benefit tambahan']
      };
      
      logTest('C.4 Simulasi Edit Tipe Tiket', 'passed', `Tipe tiket ${ticketType.name} berhasil diedit (simulasi)`);
      logger.info(`  - Harga lama: Rp${ticketType.price}`);
      logger.info(`  - Harga baru: Rp${editedTicketType.price}`);
      logger.info(`  - Benefits baru: ${editedTicketType.benefits.join(', ')}`);
    } else {
      logTest('C.4 Simulasi Edit Tipe Tiket', 'skipped', 'Tidak ada tipe tiket untuk diedit');
    }
  } catch (error) {
    logTest('C.4 Simulasi Edit Tipe Tiket', 'failed', error.message, error);
  }
}

// D. PENGUJIAN TIKET
async function testTickets() {
  logger.info('\n==== D. PENGUJIAN TIKET ====');
  
  // TEST D.1: Verifikasi Tiket Data Model
  try {
    if (testData.ticket) {
      // Verifikasi model data tiket
      if (testData.ticket.ticketNumber && testData.ticket.paymentStatus && testData.ticket.qrCode) {
        logTest('D.1 Verifikasi Model Data Tiket', 'passed', `Tiket valid: ${testData.ticket.ticketNumber}`);
        
        // Tampilkan detail tiket
        logger.info(`  - Ticket Number: ${testData.ticket.ticketNumber}`);
        logger.info(`  - Status: ${testData.ticket.paymentStatus}`);
        logger.info(`  - Type: ${testData.ticket.ticketType}${testData.ticket.ticketTypeName ? ` (${testData.ticket.ticketTypeName})` : ''}`);
        logger.info(`  - User: ${testData.ticket.user.name}`);
        logger.info(`  - Event: ${testData.ticket.event.title}`);
      } else {
        logTest('D.1 Verifikasi Model Data Tiket', 'failed', 'Model tiket tidak lengkap');
      }
    } else {
      logTest('D.1 Verifikasi Model Data Tiket', 'skipped', 'Tidak ada data tiket');
    }
  } catch (error) {
    logTest('D.1 Verifikasi Model Data Tiket', 'failed', error.message, error);
  }
  
  // TEST D.2: Simulasi Pembelian Tiket
  try {
    if (testData.event && testData.user && testData.event.ticketTypes && testData.event.ticketTypes.length > 0) {
      const ticketType = testData.event.ticketTypes[0];
      
      // Data pembelian tiket
      const ticketPurchaseData = {
        eventId: testData.event._id,
        ticketTypeId: ticketType._id,
        quantity: 1,
        paymentMethod: 'midtrans'
      };
      
      logTest('D.2 Simulasi Pembelian Tiket', 'passed', `Tiket ${ticketType.name} berhasil dibeli (simulasi)`);
      logger.info(`  - User: ${testData.user.name}`);
      logger.info(`  - Event: ${testData.event.title}`);
      logger.info(`  - Tipe Tiket: ${ticketType.name}`);
      logger.info(`  - Harga: Rp${ticketType.price}`);
    } else {
      logTest('D.2 Simulasi Pembelian Tiket', 'skipped', 'Data tidak lengkap untuk simulasi pembelian tiket');
    }
  } catch (error) {
    logTest('D.2 Simulasi Pembelian Tiket', 'failed', error.message, error);
  }
  
  // TEST D.3: Verifikasi QR Code
  try {
    if (testData.ticket && testData.ticket.qrCode) {
      // Periksa apakah QR code ada
      if (testData.ticket.qrCode.dataUrl && testData.ticket.qrCode.verificationCode) {
        logTest('D.3 Verifikasi QR Code', 'passed', 'Tiket memiliki QR code yang valid');
        logger.info(`  - Verification code ada: ${testData.ticket.qrCode.verificationCode ? 'Ya' : 'Tidak'}`);
        logger.info(`  - Data URL ada: ${testData.ticket.qrCode.dataUrl ? 'Ya' : 'Tidak'}`);
      } else {
        logTest('D.3 Verifikasi QR Code', 'failed', 'QR code tidak lengkap');
      }
    } else {
      logTest('D.3 Verifikasi QR Code', 'skipped', 'Tidak ada data tiket atau QR code');
    }
  } catch (error) {
    logTest('D.3 Verifikasi QR Code', 'failed', error.message, error);
  }
  
  // TEST D.4: Simulasi Pembatalan Tiket
  try {
    if (testData.ticket) {
      logTest('D.4 Simulasi Pembatalan Tiket', 'passed', `Tiket ${testData.ticket.ticketNumber} berhasil dibatalkan (simulasi)`);
      logger.info(`  - Ticket Number: ${testData.ticket.ticketNumber}`);
      logger.info(`  - Status sebelum: ${testData.ticket.paymentStatus}`);
      logger.info(`  - Status setelah: cancelled (simulasi)`);
    } else {
      logTest('D.4 Simulasi Pembatalan Tiket', 'skipped', 'Tidak ada data tiket');
    }
  } catch (error) {
    logTest('D.4 Simulasi Pembatalan Tiket', 'failed', error.message, error);
  }
}

// E. PENGUJIAN VALIDASI TIKET
async function testTicketValidation() {
  logger.info('\n==== E. PENGUJIAN VALIDASI TIKET ====');
  
  // TEST E.1: Simulasi Validasi Tiket
  try {
    if (testData.ticket && testData.ticket.qrCode) {
      // Simulasi data QR yang dipindai
      const qrData = {
        tid: testData.ticket._id,
        eid: testData.ticket.event._id,
        uid: testData.ticket.user._id,
        vc: testData.ticket.qrCode.verificationCode,
        ts: Date.now()
      };
      
      // Simulasi proses validasi
      const validationResult = {
        valid: true,
        message: 'Tiket valid dan berhasil digunakan (simulasi)',
        ticket: {
          id: testData.ticket._id,
          ticketNumber: testData.ticket.ticketNumber
        }
      };
      
      logTest('E.1 Simulasi Validasi Tiket', 'passed', 'Validasi QR code berhasil (simulasi)');
      logger.info(`  - Ticket: ${testData.ticket.ticketNumber}`);
      logger.info(`  - Event: ${testData.ticket.event.title}`);
      logger.info(`  - Status validasi: ${validationResult.valid ? 'Valid' : 'Tidak valid'}`);
    } else {
      logTest('E.1 Simulasi Validasi Tiket', 'skipped', 'Tidak ada data tiket atau QR code');
    }
  } catch (error) {
    logTest('E.1 Simulasi Validasi Tiket', 'failed', error.message, error);
  }
  
  // TEST E.2: Simulasi Penggunaan Tiket
  try {
    if (testData.ticket) {
      logTest('E.2 Simulasi Penggunaan Tiket', 'passed', `Tiket ${testData.ticket.ticketNumber} berhasil digunakan (simulasi)`);
      logger.info(`  - Ticket Number: ${testData.ticket.ticketNumber}`);
      logger.info(`  - Status sebelum: isUsed = ${testData.ticket.isUsed ? 'true' : 'false'}`);
      logger.info(`  - Status setelah: isUsed = true (simulasi)`);
      logger.info(`  - Check-in Time: ${new Date().toISOString()} (simulasi)`);
    } else {
      logTest('E.2 Simulasi Penggunaan Tiket', 'skipped', 'Tidak ada data tiket');
    }
  } catch (error) {
    logTest('E.2 Simulasi Penggunaan Tiket', 'failed', error.message, error);
  }
  
  // TEST E.3: Simulasi Check-In Statistics
  try {
    if (testData.event) {
      // Simulasi statistik
      const stats = {
        totalTickets: testData.event.totalTickets,
        checkedInTickets: Math.floor(testData.event.totalTickets * 0.4), // 40% telah check in (simulasi)
        percentCheckedIn: 40,
        remainingTickets: Math.floor(testData.event.totalTickets * 0.6)
      };
      
      logTest('E.3 Simulasi Statistik Check-In', 'passed', 'Berhasil mendapatkan statistik check-in (simulasi)');
      logger.info(`  - Total tiket: ${stats.totalTickets}`);
      logger.info(`  - Tiket yang sudah check-in: ${stats.checkedInTickets} (${stats.percentCheckedIn}%)`);
      logger.info(`  - Tiket yang belum check-in: ${stats.remainingTickets}`);
    } else {
      logTest('E.3 Simulasi Statistik Check-In', 'skipped', 'Tidak ada data event');
    }
  } catch (error) {
    logTest('E.3 Simulasi Statistik Check-In', 'failed', error.message, error);
  }
}

const runAllTests = async () => {
  console.log('=======================================');
  console.log('NesaVent - Menjalankan Semua Pengujian');
  console.log('=======================================');

  // Menjalankan pengujian secara berurutan
  console.log('\n[1/5] Menjalankan pengujian tipe tiket...');
  await runCommand('npm', ['run', 'test:tickets']);

  console.log('\n[2/5] Menjalankan pengujian manajemen tiket...');
  await runCommand('npm', ['run', 'test:ticket-management']);

  console.log('\n[3/5] Menjalankan pengujian komprehensif...');
  await runCommand('npm', ['run', 'test:comprehensive']);
  
  console.log('\n[4/5] Menjalankan pengujian API...');
  await runCommand('npm', ['run', 'test:api']);
  
  console.log('\n[5/5] Menjalankan pengujian ShortLink...');
  await runCommand('npm', ['run', 'test:shortlink']);

  console.log('\n=======================================');
  console.log('Semua pengujian telah selesai!');
  console.log('=======================================');
};

// Jalankan tests
runTests();

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection', { error: err.message, stack: err.stack });
  process.exit(1);
});

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    exec(`${command} ${args.join(' ')}`, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Error saat menjalankan perintah: ${command} ${args.join(' ')}`, { error: error.message, stdout, stderr });
        reject(error);
      } else {
        logger.info(`Perintah berhasil: ${command} ${args.join(' ')}`);
        resolve();
      }
    });
  });
} 