const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Membuat log audit untuk berbagai aktivitas dalam aplikasi
 * @param {Object} logData Data log yang akan disimpan
 * @param {string} logData.userId ID pengguna yang melakukan tindakan
 * @param {string} logData.action Tindakan yang dilakukan (create, update, delete, view, dll)
 * @param {string} logData.resourceType Jenis sumber daya yang dikenai tindakan
 * @param {string} [logData.resourceId] ID sumber daya yang dikenai tindakan (opsional)
 * @param {Object} [logData.details] Detail tambahan tentang tindakan
 * @param {string} [logData.ipAddress] Alamat IP pengguna
 * @param {string} [logData.userAgent] User agent pengguna
 * @param {string} [logData.result] Hasil tindakan (success, failure, error, warning, info)
 * @param {string} [logData.severity] Tingkat keparahan (critical, high, medium, low, info)
 * @returns {Promise<Object>} Log audit yang telah dibuat
 */
exports.createAuditLog = async (logData) => {
  try {
    // Hitung tanggal retensi berdasarkan tingkat keparahan
    let retentionPeriod = 365; // Default 1 tahun (hari)
    
    if (logData.severity === 'critical') {
      retentionPeriod = 1825; // 5 tahun
    } else if (logData.severity === 'high') {
      retentionPeriod = 730; // 2 tahun
    } else if (logData.severity === 'medium') {
      retentionPeriod = 365; // 1 tahun
    } else if (logData.severity === 'low') {
      retentionPeriod = 180; // 6 bulan
    } else if (logData.severity === 'info') {
      retentionPeriod = 90; // 3 bulan
    }

    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() + retentionPeriod);

    // Tambahkan metadata browser dari user agent
    const metadata = {};
    if (logData.userAgent) {
      // Implementasi sederhana, bisa diperinci lebih lanjut dengan parser user agent
      const ua = logData.userAgent.toLowerCase();
      
      // Deteksi browser
      if (ua.includes('chrome')) {
        metadata.browser = 'Chrome';
      } else if (ua.includes('firefox')) {
        metadata.browser = 'Firefox';
      } else if (ua.includes('safari') && !ua.includes('chrome')) {
        metadata.browser = 'Safari';
      } else if (ua.includes('edge')) {
        metadata.browser = 'Edge';
      } else if (ua.includes('opera')) {
        metadata.browser = 'Opera';
      } else {
        metadata.browser = 'Lainnya';
      }
      
      // Deteksi OS
      if (ua.includes('windows')) {
        metadata.os = 'Windows';
      } else if (ua.includes('mac')) {
        metadata.os = 'MacOS';
      } else if (ua.includes('android')) {
        metadata.os = 'Android';
      } else if (ua.includes('iphone') || ua.includes('ipad')) {
        metadata.os = 'iOS';
      } else if (ua.includes('linux')) {
        metadata.os = 'Linux';
      } else {
        metadata.os = 'Lainnya';
      }
      
      // Deteksi device
      if (ua.includes('mobile')) {
        metadata.device = 'Mobile';
      } else if (ua.includes('tablet')) {
        metadata.device = 'Tablet';
      } else {
        metadata.device = 'Desktop';
      }
    }

    // Buat log audit
    const auditLog = await AuditLog.create({
      ...logData,
      metadata,
      retentionDate
    });

    return auditLog;
  } catch (error) {
    logger.error('Gagal membuat log audit', {
      error: error.message,
      errorStack: error.stack,
      logData
    });
    
    // Kita masih mengembalikan objek simulasi log untuk mencegah aplikasi gagal
    // meskipun logging gagal
    return {
      _id: 'error_creating_log',
      ...logData,
      error: error.message
    };
  }
};

/**
 * Membersihkan log audit yang sudah melewati tanggal retensi
 * @returns {Promise<number>} Jumlah log yang dihapus
 */
exports.purgeExpiredAuditLogs = async () => {
  try {
    const result = await AuditLog.deleteMany({
      retentionDate: { $lt: new Date() }
    });
    
    logger.info(`${result.deletedCount} log audit kadaluarsa telah dihapus`);
    return result.deletedCount;
  } catch (error) {
    logger.error('Gagal membersihkan log audit kadaluarsa', {
      error: error.message,
      errorStack: error.stack
    });
    throw error;
  }
};

/**
 * Mendapatkan ringkasan statistik log audit
 * @param {Object} options Opsi untuk memfilter statistik
 * @param {Date} [options.startDate] Tanggal mulai untuk meringkas
 * @param {Date} [options.endDate] Tanggal akhir untuk meringkas
 * @returns {Promise<Object>} Statistik log audit
 */
exports.getAuditStats = async (options = {}) => {
  try {
    const { startDate, endDate } = options;
    
    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = startDate;
      }
      if (endDate) {
        matchStage.createdAt.$lte = endDate;
      }
    }

    const stats = await AuditLog.aggregate([
      {
        $match: matchStage
      },
      {
        $facet: {
          actionStats: [
            { $group: { _id: "$action", count: { $sum: 1 } } }
          ],
          resourceStats: [
            { $group: { _id: "$resourceType", count: { $sum: 1 } } }
          ],
          resultStats: [
            { $group: { _id: "$result", count: { $sum: 1 } } }
          ],
          severityStats: [
            { $group: { _id: "$severity", count: { $sum: 1 } } }
          ],
          dailyStats: [
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ],
          userStats: [
            { $group: { _id: "$userId", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          totalCount: [
            { $count: "value" }
          ]
        }
      }
    ]);

    return stats[0];
  } catch (error) {
    logger.error('Gagal mendapatkan statistik audit', {
      error: error.message,
      errorStack: error.stack
    });
    throw error;
  }
}; 