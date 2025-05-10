const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
const sendVerificationEmail = async (email, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verifikasi Email NesaVent',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verifikasi Email Anda</h2>
        <p>Terima kasih telah mendaftar di NesaVent. Silakan klik tombol di bawah untuk verifikasi email Anda:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verifikasi Email</a>
        </div>
        <p>Jika Anda tidak melakukan pendaftaran di NesaVent, silakan abaikan email ini.</p>
        <p>Link ini akan kadaluarsa dalam 24 jam.</p>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to: ${email}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send verification email to ${email}: ${error.message}`);
    throw new Error('Gagal mengirim email verifikasi');
  }
};
const sendTicketConfirmation = async (email, ticketData, qrCodeDataUrl) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Konfirmasi Tiket: ${ticketData.eventTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Tiket Anda Berhasil Dipesan</h2>
        <p>Terima kasih telah membeli tiket untuk event: <strong>${ticketData.eventTitle}</strong></p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Detail Tiket</h3>
          <p><strong>Nomor Tiket:</strong> ${ticketData.ticketId}</p>
          <p><strong>Event:</strong> ${ticketData.eventTitle}</p>
          <p><strong>Tanggal:</strong> ${new Date(ticketData.eventDate).toLocaleDateString('id-ID')}</p>
          <p><strong>Waktu:</strong> ${ticketData.eventTime}</p>
          <p><strong>Lokasi:</strong> ${ticketData.eventLocation}</p>
          <p><strong>Tipe Tiket:</strong> ${ticketData.ticketType}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <p>Tunjukkan QR Code ini saat masuk ke venue:</p>
          <img src="${qrCodeDataUrl}" alt="QR Code Tiket" style="max-width: 250px; height: auto;">
        </div>
        
        <p>Informasi lebih lanjut, silakan kunjungi website NesaVent atau hubungi panitia acara.</p>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Ticket confirmation email sent to: ${email}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send ticket confirmation to ${email}: ${error.message}`);
    throw new Error('Gagal mengirim email konfirmasi tiket');
  }
};
const sendPaymentConfirmation = async (email, paymentData) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Konfirmasi Pembayaran NesaVent',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Pembayaran Berhasil</h2>
        <p>Pembayaran Anda untuk event <strong>${paymentData.eventTitle}</strong> telah berhasil.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Detail Pembayaran</h3>
          <p><strong>ID Transaksi:</strong> ${paymentData.transactionId}</p>
          <p><strong>Jumlah:</strong> Rp ${paymentData.amount.toLocaleString('id-ID')}</p>
          <p><strong>Metode Pembayaran:</strong> ${paymentData.paymentMethod}</p>
          <p><strong>Waktu Pembayaran:</strong> ${new Date(paymentData.paymentTime).toLocaleString('id-ID')}</p>
        </div>
        
        <p>Tiket Anda telah dikirim dalam email terpisah.</p>
        <p>Terima kasih telah menggunakan NesaVent!</p>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Payment confirmation email sent to: ${email}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send payment confirmation to ${email}: ${error.message}`);
    throw new Error('Gagal mengirim email konfirmasi pembayaran');
  }
};
const sendEventReminder = async (email, eventData) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Pengingat Event: ${eventData.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Pengingat Event</h2>
        <p>Event <strong>${eventData.title}</strong> akan berlangsung dalam 24 jam!</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Detail Event</h3>
          <p><strong>Event:</strong> ${eventData.title}</p>
          <p><strong>Tanggal:</strong> ${new Date(eventData.date).toLocaleDateString('id-ID')}</p>
          <p><strong>Waktu:</strong> ${eventData.time}</p>
          <p><strong>Lokasi:</strong> ${eventData.location}</p>
        </div>
        
        <p>Jangan lupa untuk membawa tiket dan KTP Anda.</p>
        <p>Sampai jumpa di event!</p>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Event reminder email sent to: ${email}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send event reminder to ${email}: ${error.message}`);
    throw new Error('Gagal mengirim email pengingat event');
  }
};
const sendTicketTransferNotification = async (email, recipientName, ticket, event, fromUser) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Tiket Ditransfer ke Anda: ${event.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Anda Menerima Tiket yang Ditransfer</h2>
        <p>Halo <strong>${recipientName}</strong>,</p>
        <p><strong>${fromUser.name}</strong> (<em>${fromUser.email}</em>) telah mentransfer tiket event kepada Anda.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Detail Tiket</h3>
          <p><strong>Nomor Tiket:</strong> ${ticket.ticketNumber}</p>
          <p><strong>Event:</strong> ${event.title}</p>
          <p><strong>Tanggal:</strong> ${new Date(event.date).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</p>
          <p><strong>Waktu:</strong> ${event.time}</p>
          <p><strong>Lokasi:</strong> ${event.location}</p>
          <p><strong>Tipe Tiket:</strong> ${ticket.ticketTypeName || ticket.ticketType}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <p>Berikut adalah QR Code tiket Anda:</p>
          <img src="${ticket.qrCode.dataUrl}" alt="QR Code Tiket" style="max-width: 250px; height: auto;">
          <p><strong>Kode Verifikasi:</strong> ${ticket.qrCode.verificationCode}</p>
        </div>
        
        <p>Simpan tiket ini dan tunjukkan QR code saat masuk ke venue.</p>
        <p>Untuk informasi lebih lanjut, silakan kunjungi website NesaVent atau hubungi panitia acara.</p>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Ticket transfer notification sent to: ${email}`, { ticketId: ticket._id });
    return true;
  } catch (error) {
    logger.error(`Failed to send ticket transfer notification to ${email}: ${error.message}`);
    throw new Error('Gagal mengirim email notifikasi transfer tiket');
  }
};
const sendTicketTransferConfirmation = async (email, userName, ticket, event, recipientUser) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Konfirmasi Transfer Tiket: ${event.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Transfer Tiket Berhasil</h2>
        <p>Halo <strong>${userName}</strong>,</p>
        <p>Tiket Anda untuk event <strong>${event.title}</strong> telah berhasil ditransfer kepada:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Detail Penerima</h3>
          <p><strong>Nama:</strong> ${recipientUser.name}</p>
          <p><strong>Email:</strong> ${recipientUser.email}</p>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Detail Tiket</h3>
          <p><strong>Nomor Tiket:</strong> ${ticket.ticketNumber}</p>
          <p><strong>Event:</strong> ${event.title}</p>
          <p><strong>Tipe Tiket:</strong> ${ticket.ticketTypeName || ticket.ticketType}</p>
        </div>
        
        <p>Tiket ini tidak lagi tercantum di akun Anda dan telah dipindahkan ke akun penerima.</p>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Ticket transfer confirmation sent to: ${email}`, { ticketId: ticket._id });
    return true;
  } catch (error) {
    logger.error(`Failed to send ticket transfer confirmation to ${email}: ${error.message}`);
    throw new Error('Gagal mengirim email konfirmasi transfer tiket');
  }
};
module.exports = {
  sendVerificationEmail,
  sendTicketConfirmation,
  sendPaymentConfirmation,
  sendEventReminder,
  sendTicketTransferNotification,
  sendTicketTransferConfirmation
}; 