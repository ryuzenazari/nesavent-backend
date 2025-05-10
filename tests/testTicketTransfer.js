const mongoose = require('mongoose');
const Ticket = require('../src/models/Ticket');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const { generateTicketQR } = require('../src/utils/qrCodeGenerator');
const logger = require('../src/utils/logger');
const dotenv = require('dotenv');
dotenv.config();

/**
 * Test untuk fitur transfer tiket
 * Test ini akan mensimulasikan proses transfer tiket antara dua user
 */

// Setup test data
let testUser1, testUser2, testEvent, testTicket;

async function setupDatabase() {
  logger.info('Menghubungkan ke database untuk testing transfer tiket');
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Buat user pertama
  testUser1 = await User.findOne({ email: 'user1@example.com' });
  if (!testUser1) {
    testUser1 = new User({
      name: 'Test User 1',
      email: 'user1@example.com',
      password: '$2b$10$YYqdah2EVvASTLSQpRQAlezD8Hfg8x5zpC174e6nZs.pMss3Ni8E6', // password123
      role: 'user',
      isVerified: true
    });
    await testUser1.save();
    logger.info('User 1 berhasil dibuat');
  }

  // Buat user kedua
  testUser2 = await User.findOne({ email: 'user2@example.com' });
  if (!testUser2) {
    testUser2 = new User({
      name: 'Test User 2',
      email: 'user2@example.com',
      password: '$2b$10$YYqdah2EVvASTLSQpRQAlezD8Hfg8x5zpC174e6nZs.pMss3Ni8E6', // password123
      role: 'user',
      isVerified: true
    });
    await testUser2.save();
    logger.info('User 2 berhasil dibuat');
  }

  // Buat event untuk test
  testEvent = await Event.findOne({ title: 'Event Test Transfer' });
  if (!testEvent) {
    testEvent = new Event({
      title: 'Event Test Transfer',
      description: 'Event untuk testing fitur transfer tiket',
      date: new Date('2025-07-20'),
      time: '19:00 - 21:00',
      location: 'Test Venue',
      category: 'Testing',
      organizer: 'Test Organizer',
      totalTickets: 100,
      availableTickets: 99,
      price: {
        regular: 50000,
        student: 25000
      },
      isActive: true,
      createdBy: testUser1._id,
      ticketTypes: [
        {
          name: 'Transfer Test',
          description: 'Tiket khusus untuk test transfer',
          price: 75000,
          quantity: 50,
          availableQuantity: 49,
          benefits: [
            'Test Benefit 1',
            'Test Benefit 2'
          ],
          isActive: true
        }
      ]
    });
    await testEvent.save();
    logger.info('Event untuk testing transfer tiket berhasil dibuat');
  }

  // Buat tiket untuk user 1
  testTicket = await Ticket.findOne({ 
    event: testEvent._id, 
    user: testUser1._id,
    ticketTypeName: 'Transfer Test'
  });
  
  if (!testTicket) {
    const ticketNumber = `TEST-${Math.floor(100000 + Math.random() * 900000)}-${Date.now().toString().slice(-6)}`;
    
    testTicket = new Ticket({
      event: testEvent._id,
      user: testUser1._id,
      ticketType: 'custom',
      ticketTypeId: testEvent.ticketTypes[0]._id,
      ticketTypeName: 'Transfer Test',
      price: 75000,
      quantity: 1,
      ticketNumber: ticketNumber,
      paymentStatus: 'paid',
      paymentMethod: 'test',
      ticketBenefits: testEvent.ticketTypes[0].benefits
    });
    
    const qrCodeData = await generateTicketQR(testTicket._id, testEvent._id, testUser1._id);
    testTicket.qrCode = qrCodeData;
    
    await testTicket.save();
    logger.info('Tiket untuk testing transfer berhasil dibuat');
  }
  
  logger.info('Database setup untuk testing transfer tiket selesai');
}

async function testTransferTicket() {
  try {
    logger.info('=== MULAI TESTING TRANSFER TIKET ===');
    
    // 1. Verifikasi data awal sebelum transfer
    logger.info('- Step 1: Verifikasi data tiket sebelum transfer');
    const ticketBefore = await Ticket.findById(testTicket._id);
    
    if (ticketBefore.user.toString() !== testUser1._id.toString()) {
      throw new Error('Tiket tidak dimiliki oleh user yang benar sebelum transfer');
    }
    
    logger.info(`  Tiket ${ticketBefore.ticketNumber} dimiliki oleh ${testUser1.name} (${testUser1.email})`);
    logger.info(`  Status tiket: ${ticketBefore.paymentStatus}`);
    logger.info(`  Tipe tiket: ${ticketBefore.ticketTypeName}`);
    
    // 2. Simulasi proses transfer
    logger.info('- Step 2: Simulasi proses transfer tiket');
    
    // Buat QR code baru untuk tiket setelah transfer
    const newQRData = await generateTicketQR(testTicket._id, testEvent._id, testUser2._id);
    
    // Update data tiket ke pemilik baru
    const updatedTicket = await Ticket.findByIdAndUpdate(
      testTicket._id,
      { 
        user: testUser2._id, 
        qrCode: newQRData,
        $push: { transferHistory: { from: testUser1._id, to: testUser2._id, transferredAt: new Date() } }
      },
      { new: true }
    );
    
    logger.info(`  Tiket ditransfer dari ${testUser1.name} ke ${testUser2.name}`);
    
    // 3. Verifikasi hasil transfer
    logger.info('- Step 3: Verifikasi data tiket setelah transfer');
    const ticketAfter = await Ticket.findById(testTicket._id);
    
    // Cek kepemilikan tiket setelah transfer
    if (ticketAfter.user.toString() !== testUser2._id.toString()) {
      throw new Error('Transfer tiket gagal: Kepemilikan tiket tidak berubah');
    }
    logger.info(`  Tiket sekarang dimiliki oleh: ${testUser2.name} (${testUser2.email})`);
    
    // Cek QR code berubah setelah transfer
    if (ticketAfter.qrCode.verificationCode === ticketBefore.qrCode.verificationCode) {
      throw new Error('Transfer tiket gagal: Kode verifikasi QR tidak diperbarui');
    }
    logger.info(`  QR code tiket berhasil diperbarui dengan kode verifikasi baru`);
    
    // Cek riwayat transfer
    if (!ticketAfter.transferHistory || ticketAfter.transferHistory.length === 0) {
      throw new Error('Transfer tiket gagal: Tidak ada riwayat transfer yang tercatat');
    }
    
    const lastTransfer = ticketAfter.transferHistory[ticketAfter.transferHistory.length - 1];
    logger.info(`  Riwayat transfer tercatat: dari ${testUser1._id} ke ${testUser2._id} pada ${lastTransfer.transferredAt}`);
    
    // 4. Tes selesai
    logger.info('=== TESTING TRANSFER TIKET SELESAI (SUCCESS) ===');
    return {
      success: true,
      message: 'Transfer tiket berhasil diuji'
    };
    
  } catch (error) {
    logger.error('TESTING TRANSFER TIKET GAGAL:', { error: error.message });
    return {
      success: false,
      message: `Testing transfer tiket gagal: ${error.message}`
    };
  }
}

async function cleanupAfterTest() {
  // Kembalikan tiket ke user asli setelah selesai testing
  try {
    const qrData = await generateTicketQR(testTicket._id, testEvent._id, testUser1._id);
    
    await Ticket.findByIdAndUpdate(testTicket._id, {
      user: testUser1._id,
      qrCode: qrData,
      $push: { transferHistory: { from: testUser2._id, to: testUser1._id, transferredAt: new Date() } }
    });
    
    logger.info('Tiket dikembalikan ke user asli setelah testing');
  } catch (error) {
    logger.error('Gagal mengembalikan tiket ke user asli', { error: error.message });
  }
}

async function runTests() {
  try {
    await setupDatabase();
    const results = await testTransferTicket();
    await cleanupAfterTest();
    
    if (results.success) {
      logger.info('Semua test transfer tiket berhasil', { results });
    } else {
      logger.error('Test transfer tiket gagal', { results });
    }
    
    await mongoose.connection.close();
    logger.info('Koneksi database ditutup');
    
  } catch (error) {
    logger.error('Error saat menjalankan test transfer tiket', { error: error.message });
    await mongoose.connection.close();
  }
}

runTests(); 