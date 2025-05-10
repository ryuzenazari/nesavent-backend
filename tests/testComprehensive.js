require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../src/utils/logger');

// Import semua model yang akan diuji
const Event = require('../src/models/Event');
const User = require('../src/models/User');
const Ticket = require('../src/models/Ticket');
// Hapus import yang tidak ada
// const Payment = require('../src/models/Payment');

// Konfigurasi timeout untuk pengujian
const TEST_TIMEOUT = 10000; // 10 detik

// Fungsi utama untuk menjalankan semua pengujian
async function runComprehensiveTests() {
  try {
    logger.info('=== MULAI PENGUJIAN KOMPREHENSIF ===');
    
    // Terhubung ke database
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Terhubung ke MongoDB untuk pengujian');
    
    // ======= BAGIAN 1: PENGUJIAN USER =======
    logger.info('\n=== 1. PENGUJIAN USER ===');
    
    // 1.1 Memeriksa user berdasarkan role
    logger.info('\n--- 1.1. Memeriksa data user berdasarkan role ---');
    const usersByRole = await User.find().sort({ role: 1 });
    
    // Menghitung jumlah user per role
    const roleCount = {};
    usersByRole.forEach(user => {
      roleCount[user.role] = (roleCount[user.role] || 0) + 1;
    });
    
    logger.info(`Total user dalam database: ${usersByRole.length}`);
    Object.keys(roleCount).forEach(role => {
      logger.info(`  - ${role}: ${roleCount[role]} user`);
    });
    
    // 1.2 Memeriksa user admin
    logger.info('\n--- 1.2. Memeriksa user admin ---');
    const admins = await User.find({ role: 'admin' });
    
    if (admins.length === 0) {
      logger.warn('Tidak ada user admin dalam database');
    } else {
      logger.info(`Ditemukan ${admins.length} admin:`);
      admins.forEach((admin, i) => {
        logger.info(`  Admin ${i + 1}: ${admin.name} (${admin.email})`);
      });
    }
    
    // 1.3 Memeriksa user creator
    logger.info('\n--- 1.3. Memeriksa user creator ---');
    const creators = await User.find({ role: 'creator' });
    
    if (creators.length === 0) {
      logger.warn('Tidak ada user creator dalam database');
    } else {
      logger.info(`Ditemukan ${creators.length} creator:`);
      creators.forEach((creator, i) => {
        logger.info(`  Creator ${i + 1}: ${creator.name} (${creator.email})`);
      });
    }
    
    // ======= BAGIAN 2: PENGUJIAN EVENT =======
    logger.info('\n=== 2. PENGUJIAN EVENT ===');
    
    // 2.1 Memeriksa semua event dan kategori
    logger.info('\n--- 2.1. Memeriksa data event dan kategorinya ---');
    const events = await Event.find().sort({ date: 1 });
    
    logger.info(`Total event dalam database: ${events.length}`);
    
    // Menghitung jumlah event per kategori
    const categoryCount = {};
    events.forEach(event => {
      categoryCount[event.category] = (categoryCount[event.category] || 0) + 1;
    });
    
    logger.info('Jumlah event berdasarkan kategori:');
    Object.keys(categoryCount).forEach(category => {
      logger.info(`  - ${category}: ${categoryCount[category]} event`);
    });
    
    // 2.2 Memeriksa event berdasarkan status (aktif/selesai)
    logger.info('\n--- 2.2. Memeriksa event berdasarkan status (aktif/selesai) ---');
    const currentDate = new Date();
    
    const activeEvents = events.filter(event => new Date(event.date) >= currentDate);
    const pastEvents = events.filter(event => new Date(event.date) < currentDate);
    
    logger.info(`Event aktif: ${activeEvents.length}`);
    logger.info(`Event selesai: ${pastEvents.length}`);
    
    // ======= BAGIAN 3: PENGUJIAN TIPE TIKET KUSTOM =======
    logger.info('\n=== 3. PENGUJIAN TIPE TIKET KUSTOM ===');
    
    // 3.1 Memeriksa tipe tiket pada setiap event
    logger.info('\n--- 3.1. Memeriksa tipe tiket pada setiap event ---');
    
    let totalTicketTypes = 0;
    const ticketTypeStats = {
      totalPrice: 0,
      avgPrice: 0,
      minPrice: Infinity,
      maxPrice: 0,
      totalBenefits: 0
    };
    
    events.forEach((event, index) => {
      logger.info(`\nEvent ${index + 1}: ${event.title}`);
      logger.info(`  Tipe Tiket (${event.ticketTypes.length}):`);
      
      totalTicketTypes += event.ticketTypes.length;
      
      event.ticketTypes.forEach(type => {
        logger.info(`    - ${type.name}: Rp${type.price} (${type.availableQuantity}/${type.quantity} tersedia)`);
        logger.info(`      ${type.benefits.length} benefits: ${type.benefits.join(', ')}`);
        
        // Mengumpulkan statistik tiket
        ticketTypeStats.totalPrice += type.price;
        ticketTypeStats.minPrice = Math.min(ticketTypeStats.minPrice, type.price);
        ticketTypeStats.maxPrice = Math.max(ticketTypeStats.maxPrice, type.price);
        ticketTypeStats.totalBenefits += type.benefits.length;
      });
    });
    
    // Menghitung rata-rata harga tiket
    ticketTypeStats.avgPrice = totalTicketTypes > 0 ? 
      Math.round(ticketTypeStats.totalPrice / totalTicketTypes) : 0;
    
    logger.info('\n--- 3.2. Statistik tipe tiket ---');
    logger.info(`Total tipe tiket: ${totalTicketTypes}`);
    logger.info(`Rata-rata harga tiket: Rp${ticketTypeStats.avgPrice}`);
    logger.info(`Harga tiket terendah: Rp${ticketTypeStats.minPrice === Infinity ? 0 : ticketTypeStats.minPrice}`);
    logger.info(`Harga tiket tertinggi: Rp${ticketTypeStats.maxPrice}`);
    logger.info(`Rata-rata jumlah benefit per tipe tiket: ${(ticketTypeStats.totalBenefits / totalTicketTypes).toFixed(2)}`);
    
    // ======= BAGIAN 4: PENGUJIAN TIKET TERJUAL =======
    logger.info('\n=== 4. PENGUJIAN TIKET TERJUAL ===');
    
    // 4.1 Memeriksa semua tiket yang terjual
    logger.info('\n--- 4.1. Memeriksa tiket yang terjual ---');
    const tickets = await Ticket.find()
      .populate('user', 'name email')
      .populate('event', 'title date');
    
    logger.info(`Total tiket terjual: ${tickets.length}`);
    
    // 4.2 Menghitung tiket berdasarkan status pembayaran
    logger.info('\n--- 4.2. Menghitung tiket berdasarkan status pembayaran ---');
    const ticketsByStatus = {};
    tickets.forEach(ticket => {
      ticketsByStatus[ticket.paymentStatus] = (ticketsByStatus[ticket.paymentStatus] || 0) + 1;
    });
    
    Object.keys(ticketsByStatus).forEach(status => {
      logger.info(`  - Status ${status}: ${ticketsByStatus[status]} tiket`);
    });
    
    // 4.3 Memeriksa distribusi tiket berdasarkan tipe
    logger.info('\n--- 4.3. Distribusi tiket berdasarkan tipe ---');
    const ticketsByType = {};
    tickets.forEach(ticket => {
      ticketsByType[ticket.ticketTypeName] = (ticketsByType[ticket.ticketTypeName] || 0) + 1;
    });
    
    Object.keys(ticketsByType).forEach(typeName => {
      logger.info(`  - ${typeName}: ${ticketsByType[typeName]} tiket`);
    });
    
    // ======= BAGIAN 5: SIMULASI PEMBELIAN TIKET =======
    logger.info('\n=== 5. SIMULASI PEMBELIAN TIKET ===');
    
    if (activeEvents.length > 0 && usersByRole.some(user => user.role === 'user')) {
      const testEvent = activeEvents[0];
      const testUser = usersByRole.find(u => u.role === 'user');
      
      if (testEvent.ticketTypes.length > 0) {
        const testTicketType = testEvent.ticketTypes[0];
        
        logger.info('\n--- 5.1. Simulasi data pembelian tiket ---');
        logger.info(`Simulasi user ${testUser.name} membeli tiket ${testTicketType.name} untuk event "${testEvent.title}"`);
        logger.info(`  Harga: Rp${testTicketType.price}`);
        logger.info(`  Ketersediaan: ${testTicketType.availableQuantity}/${testTicketType.quantity}`);
        logger.info(`  Benefits: ${testTicketType.benefits.join(', ')}`);
        
        // Data untuk pembelian tiket (simulasi saja, tidak disimpan ke DB)
        const ticketData = {
          event: testEvent._id,
          user: testUser._id,
          ticketType: 'custom',
          ticketTypeId: testTicketType._id,
          ticketTypeName: testTicketType.name,
          price: testTicketType.price,
          quantity: 1,
          paymentStatus: 'pending',
          paymentMethod: 'midtrans',
          ticketBenefits: testTicketType.benefits || []
        };
        
        logger.info(`Data tiket: ${JSON.stringify(ticketData, null, 2)}`);
        
        // 5.2 Simulasi proses pembayaran
        logger.info('\n--- 5.2. Simulasi proses pembayaran ---');
        logger.info('Pembuatan data order pembayaran:');
        
        const paymentData = {
          user: testUser._id,
          event: testEvent._id,
          ticketType: testTicketType._id,
          amount: testTicketType.price,
          status: 'pending',
          paymentMethod: 'midtrans',
          orderId: `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          transactionId: `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        };
        
        logger.info(`Data pembayaran: ${JSON.stringify(paymentData, null, 2)}`);
        
        // 5.3 Simulasi notifikasi
        logger.info('\n--- 5.3. Simulasi notifikasi ---');
        const notificationData = {
          recipient: testUser._id,
          title: 'Pembelian Tiket Berhasil',
          message: `Pembelian tiket ${testTicketType.name} untuk acara "${testEvent.title}" berhasil.`,
          type: 'success',
          data: {
            eventId: testEvent._id,
            ticketId: `TIC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          },
          read: false
        };
        
        logger.info(`Data notifikasi: ${JSON.stringify(notificationData, null, 2)}`);
      } else {
        logger.warn('Tidak dapat melakukan simulasi pembelian tiket: event tidak memiliki tipe tiket');
      }
    } else {
      logger.warn('Tidak dapat melakukan simulasi pembelian tiket: tidak ada event aktif atau user');
    }
    
    logger.info('\n=== PENGUJIAN KOMPREHENSIF SELESAI ===');
    await mongoose.disconnect();
    return true;
    
  } catch (error) {
    logger.error('Error saat menjalankan pengujian komprehensif', { 
      error: error.message, 
      stack: error.stack 
    });
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      // Mengabaikan error disconnect
    }
    return false;
  }
}

// Menjalankan semua pengujian
runComprehensiveTests()
  .then(success => {
    if (success) {
      logger.info('Semua pengujian berhasil dijalankan');
    } else {
      logger.error('Terjadi kesalahan saat menjalankan pengujian');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    logger.error('Fatal error', { error: err.message, stack: err.stack });
    process.exit(1);
  });

// Handler untuk rejection yang tidak tertangani
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection', { error: err.message, stack: err.stack });
  process.exit(1);
}); 