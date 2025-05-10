require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../src/utils/logger');
const ShortLink = require('../src/models/ShortLink');
const Event = require('../src/models/Event');
const User = require('../src/models/User');
const shortLinkService = require('../src/services/shortLinkService');

// Jalankan pengujian
(async () => {
  try {
    // Koneksi ke database
    logger.info('Terhubung ke MongoDB untuk testing');
    await mongoose.connect(process.env.MONGODB_URI);
    
    // 1. Pengujian fungsi pembuatan kode unik
    logger.info('\n--- 1. Pengujian pembuatan kode unik ---');
    
    const uniqueCode1 = await shortLinkService.generateUniqueCode();
    logger.info(`Kode unik 1: ${uniqueCode1}`);
    
    const uniqueCode2 = await shortLinkService.generateUniqueCode();
    logger.info(`Kode unik 2: ${uniqueCode2}`);
    
    if (uniqueCode1 !== uniqueCode2) {
      logger.info('✓ Kode unik berbeda - OK');
    } else {
      logger.error('❌ Kode seharusnya berbeda');
    }
    
    // 2. Pengujian pembuatan shortlink
    logger.info('\n--- 2. Pengujian pembuatan shortlink ---');
    
    // Dapatkan user untuk testing
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      throw new Error('Admin user tidak ditemukan untuk pengujian');
    }
    
    // Dapatkan event untuk testing
    const testEvent = await Event.findOne();
    if (!testEvent) {
      throw new Error('Event tidak ditemukan untuk pengujian');
    }
    
    // 2.1 Buat shortlink untuk event
    logger.info('2.1 Membuat shortlink untuk event');
    
    const eventShortLink = await shortLinkService.createShortLink({
      targetType: 'event',
      targetId: testEvent._id,
      targetModel: 'Event'
    }, adminUser._id);
    
    logger.info(`Shortlink event dibuat: ${eventShortLink.code}`);
    logger.info(`Target ID: ${eventShortLink.targetId}`);
    logger.info(`Target type: ${eventShortLink.targetType}`);
    
    // 2.2 Buat shortlink untuk external URL
    logger.info('\n2.2 Membuat shortlink untuk URL eksternal');
    
    const externalShortLink = await shortLinkService.createShortLink({
      targetType: 'external',
      customUrl: 'https://unesa.ac.id'
    }, adminUser._id);
    
    logger.info(`Shortlink eksternal dibuat: ${externalShortLink.code}`);
    logger.info(`Custom URL: ${externalShortLink.customUrl}`);
    
    // 3. Pengujian mendapatkan shortlink
    logger.info('\n--- 3. Pengujian mendapatkan shortlink ---');
    
    const retrievedLink = await shortLinkService.getShortLink(eventShortLink.code);
    
    if (retrievedLink && retrievedLink.code === eventShortLink.code) {
      logger.info('✓ Shortlink berhasil diambil - OK');
      logger.info(`Code: ${retrievedLink.code}`);
      logger.info(`Target ID: ${retrievedLink.targetId}`);
      logger.info(`Target type: ${retrievedLink.targetType}`);
    } else {
      logger.error('❌ Gagal mengambil shortlink');
    }
    
    // 4. Pengujian mencatat kunjungan
    logger.info('\n--- 4. Pengujian mencatat kunjungan ---');
    
    logger.info(`Kunjungan awal: ${retrievedLink.visits}`);
    
    const recordSuccess = await shortLinkService.recordVisit(eventShortLink.code);
    
    if (recordSuccess) {
      const updatedLink = await ShortLink.findOne({ code: eventShortLink.code });
      logger.info(`Kunjungan setelah update: ${updatedLink.visits}`);
      
      if (updatedLink.visits > retrievedLink.visits) {
        logger.info('✓ Kunjungan berhasil dicatat - OK');
      } else {
        logger.error('❌ Kunjungan tidak terupdate');
      }
    } else {
      logger.error('❌ Gagal mencatat kunjungan');
    }
    
    // 5. Pengujian update shortlink
    logger.info('\n--- 5. Pengujian update shortlink ---');
    
    const updateData = {
      isActive: false
    };
    
    const updatedShortLink = await shortLinkService.updateShortLink(
      externalShortLink.code,
      updateData,
      adminUser._id
    );
    
    if (updatedShortLink && !updatedShortLink.isActive) {
      logger.info('✓ Shortlink berhasil diupdate - OK');
      logger.info(`Status aktif sekarang: ${updatedShortLink.isActive}`);
    } else {
      logger.error('❌ Gagal mengupdate shortlink');
    }
    
    // 6. Pengujian mendapatkan daftar shortlink pengguna
    logger.info('\n--- 6. Pengujian mendapatkan daftar shortlink pengguna ---');
    
    const userLinks = await shortLinkService.getUserShortLinks(adminUser._id);
    
    if (Array.isArray(userLinks) && userLinks.length > 0) {
      logger.info(`✓ Berhasil mendapatkan ${userLinks.length} shortlink untuk user - OK`);
      logger.info('Shortlink pertama:');
      logger.info(`- Kode: ${userLinks[0].code}`);
      logger.info(`- Target type: ${userLinks[0].targetType}`);
    } else {
      logger.error('❌ Gagal mendapatkan daftar shortlink pengguna');
    }
    
    // 7. Pengujian menghapus shortlink
    logger.info('\n--- 7. Pengujian menghapus shortlink ---');
    
    const deleteSuccess = await shortLinkService.deleteShortLink(
      externalShortLink.code,
      adminUser._id
    );
    
    if (deleteSuccess) {
      // Periksa apakah benar-benar terhapus
      const deletedLink = await ShortLink.findOne({ code: externalShortLink.code });
      
      if (!deletedLink) {
        logger.info('✓ Shortlink berhasil dihapus - OK');
      } else {
        logger.error('❌ Shortlink masih ada meskipun harusnya sudah dihapus');
      }
    } else {
      logger.error('❌ Gagal menghapus shortlink');
    }
    
    // Pembersihan data pengujian
    logger.info('\n--- Pembersihan data pengujian ---');
    
    try {
      await ShortLink.deleteOne({ code: eventShortLink.code });
      logger.info('✓ Data pengujian dibersihkan');
    } catch (err) {
      logger.warn('Gagal membersihkan data pengujian');
    }
    
    logger.info('\n=== Pengujian shortlink selesai ===');
    
  } catch (error) {
    logger.error(`Error pada pengujian: ${error.message}`);
    console.error(error);
  } finally {
    // Tutup koneksi database
    await mongoose.disconnect();
    logger.info('Koneksi database ditutup');
    process.exit(0);
  }
})(); 