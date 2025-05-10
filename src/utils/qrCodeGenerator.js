const QRCode = require('qrcode');
const crypto = require('crypto');
const logger = require('./logger');
const generateTicketQR = async (ticketId, eventId, userId) => {
  try {
    const verificationCode = crypto
      .createHash('sha256')
      .update(`${ticketId}-${eventId}-${userId}-${Date.now()}`)
      .digest('hex')
      .substring(0, 12);
    const qrData = JSON.stringify({
      tid: ticketId,
      eid: eventId,
      uid: userId,
      vc: verificationCode,
      ts: Date.now()
    });
    const dataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return {
      dataUrl,
      verificationCode
    };
  } catch (error) {
    logger.error('Gagal membuat QR code untuk tiket', {
      error: error.message,
      ticketId,
      eventId,
      userId
    });
    throw new Error('Gagal membuat QR code');
  }
};
const verifyTicketQR = (qrData, ticket) => {
  try {
    if (!ticket.qrCode || !ticket.qrCode.verificationCode) {
      return {
        valid: false,
        message: 'QR code tiket tidak valid'
      };
    }
    if (qrData.vc !== ticket.qrCode.verificationCode) {
      return {
        valid: false,
        message: 'Kode verifikasi tidak valid'
      };
    }
    if (ticket.isUsed) {
      return {
        valid: false,
        message: 'Tiket sudah digunakan sebelumnya'
      };
    }
    if (ticket.paymentStatus !== 'paid') {
      return {
        valid: false,
        message: 'Tiket belum dibayar'
      };
    }
    return {
      valid: true,
      message: 'Tiket valid'
    };
  } catch (error) {
    logger.error('Gagal memverifikasi QR code tiket', {
      error: error.message,
      ticketId: ticket._id
    });
    return {
      valid: false,
      message: 'Terjadi kesalahan saat memverifikasi tiket'
    };
  }
};
module.exports = {
  generateTicketQR,
  verifyTicketQR
}; 