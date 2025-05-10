const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const logger = require('../utils/logger');
exports.getDashboard = async (req, res) => {
  try {
    const staff = await User.findById(req.user._id)
      .select('-password');
    
    if (req.user.role !== 'staff_creator') {
      return res.status(403).json({
        success: false,
        message: 'Hanya staff creator yang dapat mengakses halaman ini'
      });
    }
    
    let creatorInfo = null;
    if (staff.staffDetails && staff.staffDetails.addedBy) {
      creatorInfo = await User.findById(staff.staffDetails.addedBy)
        .select('name email profileImage');
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const ticketsScannedToday = await Ticket.countDocuments({
      'checkInInfo.scannedBy': req.user._id,
      'checkInInfo.scannedAt': { $gte: today }
    });
    
    const totalTicketsScanned = await Ticket.countDocuments({
      'checkInInfo.scannedBy': req.user._id
    });
    
    res.status(200).json({
      success: true,
      role: 'staff_creator',
      staffName: staff.staffDetails?.staffName || staff.name,
      creatorInfo,
      stats: {
        ticketsScannedToday,
        totalTicketsScanned
      },
      message: 'Staff creator hanya dapat melakukan scan QR code tiket'
    });
  } catch (error) {
    logger.error(`Staff dashboard error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data dashboard staff',
      error: error.message
    });
  }
}; 