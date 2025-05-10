const AbuseReport = require('../models/AbuseReport');
const User = require('../models/User');
const { createAuditLog } = require('../services/auditService');
const { sendNotification } = require('../services/notificationService');

// Buat laporan penyalahgunaan baru
exports.createReport = async (req, res) => {
  try {
    const { 
      reportedUserId, 
      resourceType, 
      resourceId, 
      category, 
      description, 
      evidenceUrls 
    } = req.body;

    const reporterId = req.user.id;

    // Validasi bahwa user melaporkan tidak melaporkan dirinya sendiri
    if (reportedUserId && reportedUserId === reporterId) {
      return res.status(400).json({
        success: false,
        message: 'Anda tidak dapat melaporkan diri sendiri'
      });
    }

    // Cek apakah resource yang dilaporkan ada
    // Implementasi validasi resource bisa ditambahkan disini sesuai resourceType

    // Buat laporan
    const report = await AbuseReport.create({
      reporterId,
      reportedUserId,
      resourceType,
      resourceId,
      category,
      description,
      evidenceUrls: evidenceUrls || [],
      ipAddress: req.ip
    });

    // Membuat log audit
    await createAuditLog({
      userId: reporterId,
      action: 'create',
      resourceType: 'report',
      resourceId: report._id,
      details: { category, resourceType },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'success',
      severity: 'medium'
    });

    // Notifikasi admin tentang laporan baru (high priority)
    if (['harmful_content', 'harassment', 'fraud'].includes(category)) {
      await sendNotification({
        to: 'admin',
        type: 'abuse_report',
        subject: 'Laporan Penyalahgunaan Prioritas Tinggi',
        content: `Laporan baru dengan kategori ${category} telah diterima dan memerlukan perhatian segera.`,
        priority: 'high',
        data: { reportId: report._id }
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Laporan berhasil dikirim dan akan segera ditinjau',
      data: { reportId: report._id }
    });
  } catch (error) {
    console.error('Error creating abuse report:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memproses laporan Anda'
    });
  }
};

// Dapatkan semua laporan (untuk admin)
exports.getAllReports = async (req, res) => {
  try {
    const { 
      status, 
      category, 
      priority, 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    // Hanya admin yang bisa melihat semua laporan
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki izin untuk mengakses data ini'
      });
    }

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort,
      populate: [
        { path: 'reporterId', select: 'name email' },
        { path: 'reportedUserId', select: 'name email' },
        { path: 'reviewedBy', select: 'name email' }
      ]
    };

    const reports = await AbuseReport.paginate(filter, options);

    // Log akses data laporan
    await createAuditLog({
      userId: req.user.id,
      action: 'view',
      resourceType: 'report',
      details: { filter, page, limit },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'success',
      severity: 'low'
    });

    return res.status(200).json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching abuse reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data laporan'
    });
  }
};

// Dapatkan detail laporan
exports.getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = await AbuseReport.findById(id)
      .populate('reporterId', 'name email')
      .populate('reportedUserId', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('relatedReports');
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Laporan tidak ditemukan'
      });
    }

    // Hanya admin atau pelapor yang dapat melihat detail laporan
    if (!req.user.isAdmin && report.reporterId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki izin untuk melihat laporan ini'
      });
    }

    // Log akses detail laporan
    await createAuditLog({
      userId: req.user.id,
      action: 'view',
      resourceType: 'report',
      resourceId: report._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'success',
      severity: 'low'
    });

    return res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error fetching abuse report:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil detail laporan'
    });
  }
};

// Update status laporan (admin only)
exports.updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes, resolution, priority, escalationLevel } = req.body;
    
    // Hanya admin yang bisa memperbarui laporan
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki izin untuk memperbarui status laporan'
      });
    }

    const report = await AbuseReport.findById(id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Laporan tidak ditemukan'
      });
    }

    // Update laporan
    const updateData = { 
      status, 
      reviewedBy: req.user.id,
      reviewNotes
    };

    if (resolution) {
      updateData.resolution = {
        ...resolution,
        actionDate: new Date()
      };
    }

    if (priority) {
      updateData.priority = priority;
    }

    if (typeof escalationLevel === 'number') {
      updateData.escalationLevel = escalationLevel;
    }

    const updatedReport = await AbuseReport.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('reporterId', 'name email');

    // Log perubahan status laporan
    await createAuditLog({
      userId: req.user.id,
      action: 'update',
      resourceType: 'report',
      resourceId: report._id,
      details: { status, resolution },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'success',
      severity: 'medium'
    });

    // Notifikasi pelapor tentang perubahan status
    if (status === 'resolved' || status === 'rejected') {
      await sendNotification({
        to: updatedReport.reporterId._id,
        type: 'abuse_report_update',
        subject: `Status Laporan Anda: ${status === 'resolved' ? 'Ditindaklanjuti' : 'Ditolak'}`,
        content: `Laporan penyalahgunaan Anda telah ${status === 'resolved' ? 'ditindaklanjuti' : 'ditolak'} oleh tim kami.`,
        data: { reportId: report._id }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Status laporan berhasil diperbarui',
      data: updatedReport
    });
  } catch (error) {
    console.error('Error updating abuse report:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui status laporan'
    });
  }
};

// Dapatkan laporan yang dibuat oleh user saat ini
exports.getMyReports = async (req, res) => {
  try {
    const { 
      status, 
      page = 1, 
      limit = 10, 
      sortOrder = 'desc' 
    } = req.query;

    const filter = { reporterId: req.user.id };
    if (status) filter.status = status;

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: sortOrder === 'asc' ? 1 : -1 },
      populate: [
        { path: 'reportedUserId', select: 'name email' }
      ]
    };

    const reports = await AbuseReport.paginate(filter, options);

    return res.status(200).json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data laporan Anda'
    });
  }
};

// Menambahkan laporan terkait
exports.addRelatedReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { relatedReportId } = req.body;
    
    // Hanya admin yang bisa menambahkan laporan terkait
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki izin untuk operasi ini'
      });
    }

    const report = await AbuseReport.findById(id);
    const relatedReport = await AbuseReport.findById(relatedReportId);
    
    if (!report || !relatedReport) {
      return res.status(404).json({
        success: false,
        message: 'Satu atau kedua laporan tidak ditemukan'
      });
    }

    // Tambahkan ke array relatedReports jika belum ada
    if (!report.relatedReports.includes(relatedReportId)) {
      report.relatedReports.push(relatedReportId);
      await report.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Laporan terkait berhasil ditambahkan',
      data: report
    });
  } catch (error) {
    console.error('Error adding related report:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menambahkan laporan terkait'
    });
  }
};

// Mendapatkan statistik laporan penyalahgunaan (admin only)
exports.getReportStats = async (req, res) => {
  try {
    // Hanya admin yang bisa melihat statistik
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki izin untuk mengakses data ini'
      });
    }

    const stats = await AbuseReport.aggregate([
      {
        $facet: {
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          byCategory: [
            { $group: { _id: "$category", count: { $sum: 1 } } }
          ],
          byPriority: [
            { $group: { _id: "$priority", count: { $sum: 1 } } }
          ],
          byResourceType: [
            { $group: { _id: "$resourceType", count: { $sum: 1 } } }
          ],
          recentTrends: [
            { 
              $match: { 
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } 
              } 
            },
            {
              $group: {
                _id: { 
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ],
          totalCount: [
            { $count: "value" }
          ],
          pendingCount: [
            { $match: { status: "pending" } },
            { $count: "value" }
          ],
          highPriorityCount: [
            { $match: { priority: "high" } },
            { $count: "value" }
          ]
        }
      }
    ]);

    // Log akses statistik
    await createAuditLog({
      userId: req.user.id,
      action: 'view',
      resourceType: 'report',
      details: { view: 'statistics' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      result: 'success',
      severity: 'low'
    });

    return res.status(200).json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('Error fetching abuse report stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil statistik laporan'
    });
  }
}; 