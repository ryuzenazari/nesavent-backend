require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../src/utils/logger');

// Model
const Event = require('../src/models/Event');
const User = require('../src/models/User');
const Ticket = require('../src/models/Ticket');

// Fungsi utama testing
async function runTests() {
  try {
    // Connect ke database
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Terhubung ke MongoDB untuk testing');
    
    // ======= TEST 1: Memeriksa data Event dengan tipe tiket kustom =======
    logger.info('TEST 1: Memeriksa data Event dengan tipe tiket kustom');
    const events = await Event.find().sort({ date: 1 });
    
    if (events.length === 0) {
      logger.error('Tidak ada event di database. Run seed:db terlebih dahulu');
      process.exit(1);
    }
    
    logger.info(`Ditemukan ${events.length} event di database`);
    
    events.forEach((event, index) => {
      logger.info(`Event ${index + 1}: ${event.title}`);
      logger.info(`  Tipe Tiket (${event.ticketTypes.length}):`);
      
      event.ticketTypes.forEach(type => {
        logger.info(`    - ${type.name}: Rp${type.price} (${type.availableQuantity}/${type.quantity} tersedia)`);
        logger.info(`      ${type.benefits.length} benefits: ${type.benefits.join(', ')}`);
      });
    });
    
    // ======= TEST 2: Memeriksa data Ticket yang sudah ada =======
    logger.info('\nTEST 2: Memeriksa data Ticket yang sudah ada');
    const tickets = await Ticket.find()
      .populate('user', 'name email')
      .populate('event', 'title date');
    
    logger.info(`Ditemukan ${tickets.length} tiket di database`);
    
    tickets.forEach((ticket, index) => {
      logger.info(`Tiket ${index + 1}: ${ticket.ticketTypeName} untuk event "${ticket.event.title}"`);
      logger.info(`  Pemilik: ${ticket.user.name} (${ticket.user.email})`);
      logger.info(`  Harga: Rp${ticket.price}`);
      logger.info(`  Status: ${ticket.paymentStatus}`);
      logger.info(`  Benefits: ${ticket.ticketBenefits.join(', ')}`);
    });
    
    // ======= TEST 3: Memeriksa data User =======
    logger.info('\nTEST 3: Memeriksa data User');
    const users = await User.find().sort({ role: 1 });
    
    logger.info(`Ditemukan ${users.length} user di database`);
    
    const roleCount = {};
    users.forEach(user => {
      roleCount[user.role] = (roleCount[user.role] || 0) + 1;
    });
    
    logger.info(`Jumlah user berdasarkan role:`);
    Object.keys(roleCount).forEach(role => {
      logger.info(`  - ${role}: ${roleCount[role]} user`);
    });
    
    // ======= TEST 4: Simulasi pembelian tiket (data saja) =======
    logger.info('\nTEST 4: Simulasi data pembelian tiket');
    
    const testEvent = events[0];
    const testUser = users.find(u => u.role === 'user');
    const testTicketType = testEvent.ticketTypes[0];
    
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
    
    logger.info('\nSemua test selesai!');
    mongoose.disconnect();
    process.exit(0);
    
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

// Jalankan tests
runTests();

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection', { error: err.message, stack: err.stack });
  process.exit(1);
}); 