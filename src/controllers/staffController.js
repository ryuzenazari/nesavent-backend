const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const logger = require('../utils/logger');

exports.getDashboard = async (req, res) => {
  try {
    const staff = await User.findById(req.user._id).select('-password');
    
    if (req.user.role !== 'staff_creator') {
      return res.status(403).json({
        success: false,
        message: 'Hanya staff creator yang dapat mengakses halaman ini'
      });
    }

    let creatorInfo = null;
    
    if (staff.staffDetails && staff.staffDetails.creatorId) {
      creatorInfo = await User.findById(staff.staffDetails.creatorId).select(
        'name email profileImage myPage.organization'
      );
    } 
    else if (staff.staffDetails && staff.staffDetails.addedBy) {
      creatorInfo = await User.findById(staff.staffDetails.addedBy).select(
        'name email profileImage myPage.organization'
      );
      
      if (!staff.staffDetails.creatorId) {
        staff.staffDetails.creatorId = staff.staffDetails.addedBy;
        await staff.save();
        logger.info(`Updated creatorId for staff ${staff._id} based on addedBy field`);
      }
    }

    if (!creatorInfo) {
      return res.status(400).json({
        success: false,
        message: 'Anda belum terhubung dengan creator manapun. Hubungi admin untuk bantuan.'
      });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const ticketsScannedToday = await Ticket.countDocuments({
      'checkInInfo.scannedBy': req.user._id,
      'checkInInfo.scannedAt': {
        $gte: today
      }
    });
    
    const totalTicketsScanned = await Ticket.countDocuments({
      'checkInInfo.scannedBy': req.user._id
    });
    
    const creatorEvents = await Event.find({
      createdBy: staff.staffDetails.creatorId,
      date: { $gte: new Date() }
    })
    .select('_id title date location')
    .sort({ date: 1 })
    .limit(5);

    res.status(200).json({
      success: true,
      role: 'staff_creator',
      staffName: staff.staffDetails?.staffName || staff.name,
      creatorInfo: {
        id: creatorInfo._id,
        name: creatorInfo.name,
        email: creatorInfo.email,
        profileImage: creatorInfo.profileImage,
        organization: creatorInfo.myPage?.organization?.name || null
      },
      stats: {
        ticketsScannedToday,
        totalTicketsScanned
      },
      permissions: staff.staffDetails?.permissions || {
        scanTickets: true,
        viewAttendees: false,
        viewStats: false
      },
      upcomingEvents: creatorEvents,
      message: 'Staff creator hanya dapat memvalidasi tiket untuk event yang dibuat oleh creator yang mengundang'
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
