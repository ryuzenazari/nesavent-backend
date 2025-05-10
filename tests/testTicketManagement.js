require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../src/utils/logger');

// Model
const Event = require('../src/models/Event');
const User = require('../src/models/User');

// Fungsi utama testing
async function runTests() {
  try {
    // Connect ke database
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Terhubung ke MongoDB untuk testing manajemen tiket');
    
    // ======= TEST 1: Mencari creator dan event yang dia miliki =======
    logger.info('TEST 1: Mencari creator dan event miliknya');
    
    const creator = await User.findOne({ email: 'creator1@example.com' });
    if (!creator) {
      logger.error('Creator tidak ditemukan. Jalankan seed:db terlebih dahulu');
      process.exit(1);
    }
    
    logger.info(`Creator ditemukan: ${creator.name} (${creator.email})`);
    
    const events = await Event.find({ createdBy: creator._id });
    if (events.length === 0) {
      logger.error('Creator tidak memiliki event. Jalankan seed:db terlebih dahulu');
      process.exit(1);
    }
    
    const event = events[0];
    logger.info(`Event ditemukan: ${event.title} (ID: ${event._id})`);
    logger.info(`Event ini memiliki ${event.ticketTypes.length} tipe tiket`);
    
    // ======= TEST 2: Menampilkan detail tipe tiket yang ada =======
    logger.info('\nTEST 2: Menampilkan detail tipe tiket yang ada');
    
    logger.info(`Tipe tiket untuk event "${event.title}":`);
    event.ticketTypes.forEach((type, index) => {
      logger.info(`${index + 1}. ${type.name} - Rp${type.price}`);
      logger.info(`   Deskripsi: ${type.description}`);
      logger.info(`   Jumlah: ${type.availableQuantity}/${type.quantity} tersedia`);
      logger.info(`   Benefits: ${type.benefits.join(', ')}`);
    });
    
    // ======= TEST 3: Simulasi pembuatan tipe tiket baru =======
    logger.info('\nTEST 3: Simulasi pembuatan tipe tiket baru');
    
    const newTicketType = {
      name: 'VVIP',
      description: 'Tiket VVIP dengan akses premium dan makanan',
      price: 300000,
      quantity: 20,
      availableQuantity: 20,
      benefits: ['Akses area festival', 'Makanan dan minuman gratis', 'Tempat duduk prioritas', 'Goody bag eksklusif'],
      isActive: true
    };
    
    logger.info(`Simulasi menambahkan tipe tiket: ${newTicketType.name}`);
    logger.info(`Detail: ${JSON.stringify(newTicketType)}`);
    
    // Simulasi model data untuk manageTicketTypes
    const updatedTicketTypes = [...event.ticketTypes.map(t => t.toObject()), newTicketType];
    
    // Perbarui total dan available tiket
    const totalTickets = updatedTicketTypes.reduce((sum, type) => sum + type.quantity, 0);
    const availableTickets = updatedTicketTypes.reduce((sum, type) => sum + type.availableQuantity, 0);
    
    logger.info(`Total tiket setelah penambahan: ${totalTickets} (tersedia: ${availableTickets})`);
    logger.info(`Data yang akan dikirim ke model Event:`);
    logger.info(`  event.ticketTypes = [${updatedTicketTypes.map(t => t.name).join(', ')}]`);
    logger.info(`  event.totalTickets = ${totalTickets}`);
    logger.info(`  event.availableTickets = ${availableTickets}`);
    
    // ======= TEST 4: Simulasi edit tipe tiket =======
    logger.info('\nTEST 4: Simulasi edit tipe tiket');
    
    // Ambil tipe tiket pertama untuk diedit
    const editedTicketType = {...event.ticketTypes[0].toObject()};
    editedTicketType.price = editedTicketType.price + 25000; // Tambahkan harga
    editedTicketType.benefits = [...editedTicketType.benefits, 'Benefit baru'];
    
    logger.info(`Simulasi mengubah tipe tiket: ${editedTicketType.name}`);
    logger.info(`Harga lama: Rp${event.ticketTypes[0].price} -> Harga baru: Rp${editedTicketType.price}`);
    logger.info(`Benefits baru: ${editedTicketType.benefits.join(', ')}`);
    
    logger.info('\nSemua test simulasi berhasil dijalankan');
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