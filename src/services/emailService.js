// File ini adalah pengalih (alias) ke implementasi emailService yang sebenarnya
// untuk menjaga kompatibilitas dengan kode yang sudah menggunakan file ini
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

logger.info('Email service alias loaded - redirecting to unified email service');

// Log konfigurasi email
logger.info('Email configuration loaded:', {
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpSecure: process.env.SMTP_SECURE,
  smtpUser: process.env.SMTP_USER ? `${process.env.SMTP_USER.substring(0, 5)}...` : undefined,
});

// Konfigurasi SMTP transporter tunggal
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verifikasi koneksi SMTP pada startup
transporter
  .verify()
  .then(() => logger.info('Server siap mengirim email'))
  .catch(err =>
    logger.error('Tidak dapat terhubung ke server email', {
      error: err.message
    })
  );

/**
 * Membaca file template HTML
 * @param {string} filePath - Path file relatif dari direktori templates
 * @returns {string} - Konten file HTML
 */
const readHTMLFile = filePath => {
  try {
    // Gunakan path absolut untuk menemukan template
    const templateDir = path.join(process.cwd(), 'src', 'templates');
    const fullPath = path.join(templateDir, filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Template tidak ditemukan: ${filePath}`);
    }
    
    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    return fileContent;
  } catch (error) {
    logger.error('Gagal membaca file template email', {
      error: error.message,
      filePath,
      fullPath: path.join(process.cwd(), 'src', 'templates', filePath)
    });
    throw new Error(`Gagal membaca template email: ${error.message}`);
  }
};

/**
 * Membuat template HTML dengan data yang diberikan
 * @param {string} filePath - Path ke file template
 * @param {Object} replacements - Data untuk disisipkan ke template
 * @returns {string} - HTML yang sudah dirender
 */
const createTemplate = (filePath, replacements) => {
  try {
    const html = readHTMLFile(filePath);
    const template = handlebars.compile(html);
    return template(replacements);
  } catch (error) {
    logger.error('Gagal membuat template email', {
      error: error.message,
      filePath
    });
    throw new Error(`Gagal membuat template email: ${error.message}`);
  }
};

/**
 * Mengirim email verifikasi ke pengguna
 * @param {string} email - Alamat email penerima
 * @param {string} name - Nama penerima
 * @param {string} token - Token verifikasi
 * @returns {Object} - Status pengiriman email
 */
const sendVerificationEmail = async (email, name, token) => {
  try {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const htmlContent = createTemplate('verification-email.html', {
      name,
      verificationUrl,
      appName: 'NesaVent',
      year: new Date().getFullYear()
    });
    const mailOptions = {
      from: `"NesaVent" <${process.env.SMTP_USER}@mailtrap.io>`,
      to: email,
      subject: 'Verifikasi Akun NesaVent Anda',
      html: htmlContent
    };
    const info = await transporter.sendMail(mailOptions);
    logger.info('Email verifikasi terkirim', {
      messageId: info.messageId,
      email
    });
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    logger.error('Gagal mengirim email verifikasi', {
      error: error.message,
      email
    });
    return {
      success: false,
      message: 'Gagal mengirim email verifikasi'
    };
  }
};

/**
 * Mengirim konfirmasi tiket ke pengguna
 * @param {string} email - Alamat email penerima
 * @param {string} name - Nama penerima
 * @param {Object} ticket - Info tiket
 * @param {Object} event - Info acara
 * @returns {Object} - Status pengiriman email
 */
const sendTicketConfirmation = async (email, name, ticket, event) => {
  try {
    const htmlContent = createTemplate('ticket-confirmation.html', {
      name,
      eventTitle: event.title,
      eventDate: new Date(event.date).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      eventTime: event.time,
      eventLocation: event.location,
      ticketNumber: ticket.ticketNumber,
      ticketType: ticket.ticketType === 'student' ? 'Mahasiswa' : 'Reguler',
      ticketPrice: ticket.price.toLocaleString('id-ID', {
        style: 'currency',
        currency: 'IDR'
      }),
      qrCodeImage: ticket.qrCode?.dataUrl || '',
      viewTicketUrl: `${process.env.FRONTEND_URL}/tickets/${ticket._id}`,
      appName: 'NesaVent',
      year: new Date().getFullYear()
    });
    const mailOptions = {
      from: `"NesaVent" <${process.env.SMTP_USER}@mailtrap.io>`,
      to: email,
      subject: `Tiket Anda untuk ${event.title}`,
      html: htmlContent
    };
    const info = await transporter.sendMail(mailOptions);
    logger.info('Email konfirmasi tiket terkirim', {
      messageId: info.messageId,
      email,
      ticketId: ticket._id
    });
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    logger.error('Gagal mengirim email konfirmasi tiket', {
      error: error.message,
      email,
      ticketId: ticket?._id
    });
    return {
      success: false,
      message: 'Gagal mengirim email konfirmasi tiket'
    };
  }
};

/**
 * Mengirim email reset password
 * @param {string} email - Alamat email penerima 
 * @param {string} name - Nama penerima
 * @param {string} token - Token reset password
 * @returns {Object} - Status pengiriman email
 */
const sendPasswordResetEmail = async (email, name, token) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const htmlContent = createTemplate('reset-password.html', {
      name,
      resetUrl,
      appName: 'NesaVent',
      year: new Date().getFullYear()
    });
    const mailOptions = {
      from: `"NesaVent" <${process.env.SMTP_USER}@mailtrap.io>`,
      to: email,
      subject: 'Reset Password NesaVent Anda',
      html: htmlContent
    };
    const info = await transporter.sendMail(mailOptions);
    logger.info('Email reset password terkirim', {
      messageId: info.messageId,
      email
    });
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    logger.error('Gagal mengirim email reset password', {
      error: error.message,
      email
    });
    return {
      success: false,
      message: 'Gagal mengirim email reset password'
    };
  }
};

/**
 * Mengirim konfirmasi pembayaran
 * @param {string} email - Alamat email penerima
 * @param {string} name - Nama penerima
 * @param {Object} paymentData - Data pembayaran
 * @returns {Object} - Status pengiriman email
 */
const sendPaymentConfirmation = async (email, name, paymentData) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Pembayaran Berhasil</h2>
        <p>Halo ${name},</p>
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
    `;
    
    const mailOptions = {
      from: `"NesaVent" <${process.env.SMTP_USER}@mailtrap.io>`,
      to: email,
      subject: 'Konfirmasi Pembayaran NesaVent',
      html: htmlContent
    };
    
    const info = await transporter.sendMail(mailOptions);
    logger.info('Email konfirmasi pembayaran terkirim', {
      messageId: info.messageId,
      email
    });
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    logger.error('Gagal mengirim email konfirmasi pembayaran', {
      error: error.message,
      email
    });
    return {
      success: false,
      message: 'Gagal mengirim email konfirmasi pembayaran'
    };
  }
};

/**
 * Fungsi generik untuk mengirim email (kompatibilitas dengan berbagai format)
 * @param {Object} options - Opsi email
 * @param {string} options.to - Alamat email penerima
 * @param {string} options.subject - Subjek email
 * @param {Object} options.data - Data untuk template
 * @returns {Object} - Status pengiriman email
 */
const sendEmail = async (options) => {
  try {
    // Cek jika format adalah format lama (object dengan property to, subject, template)
    if (typeof options === 'object' && options.to && options.subject) {
      // Ekstrak nama dan email
      const email = options.to;
      const name = options.data?.name || '';
      const subject = options.subject;
      
      // Buat email HTML sederhana
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${subject}</h2>
          <p>Halo ${name},</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            ${Object.entries(options.data || {}).map(([key, value]) => {
              if (typeof value === 'string') {
                return `<p><strong>${key}:</strong> ${value}</p>`;
              }
              return '';
            }).join('')}
          </div>
          <p>Terima kasih telah menggunakan NesaVent!</p>
        </div>
      `;
      
      const mailOptions = {
        from: `"NesaVent" <${process.env.SMTP_USER}@mailtrap.io>`,
        to: email,
        subject: subject,
        html: htmlContent
      };
      
      const info = await transporter.sendMail(mailOptions);
      logger.info(`Email generik terkirim: ${subject}`, {
        messageId: info.messageId,
        email
      });
      
      return {
        success: true,
        messageId: info.messageId
      };
    }
    
    logger.warn('Format email tidak dikenali');
    return { success: false, message: 'Format email tidak dikenali' };
  } catch (error) {
    logger.error(`Gagal mengirim email generik: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Mengirim notifikasi transfer tiket ke penerima
 * @param {string} email - Alamat email penerima
 * @param {string} name - Nama penerima
 * @param {Object} ticket - Info tiket
 * @param {Object} event - Info acara
 * @returns {Object} - Status pengiriman email
 */
const sendTicketTransferNotification = async (email, name, ticket, event, sender) => {
  try {
    const htmlContent = createTemplate('ticket-transfer.html', {
      name,
      senderName: sender.name,
      eventTitle: event.title,
      eventDate: new Date(event.date).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      eventTime: event.time,
      eventLocation: event.location,
      ticketType: ticket.ticketTypeName,
      acceptUrl: `${process.env.FRONTEND_URL}/tickets/accept-transfer/${ticket._id}`,
      viewTicketUrl: `${process.env.FRONTEND_URL}/tickets/${ticket._id}`,
      appName: 'NesaVent',
      year: new Date().getFullYear()
    });
    
    const mailOptions = {
      from: `"NesaVent" <${process.env.SMTP_USER}@mailtrap.io>`,
      to: email,
      subject: `Anda menerima tiket untuk ${event.title}`,
      html: htmlContent
    };
    
    const info = await transporter.sendMail(mailOptions);
    logger.info('Email notifikasi transfer tiket terkirim', {
      messageId: info.messageId,
      email,
      ticketId: ticket._id
    });
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    logger.error('Gagal mengirim email notifikasi transfer tiket', {
      error: error.message,
      email,
      ticketId: ticket?._id
    });
    return {
      success: false,
      message: 'Gagal mengirim email notifikasi transfer tiket'
    };
  }
};

/**
 * Mengirim konfirmasi transfer tiket ke pengirim
 * @param {string} email - Alamat email pengirim
 * @param {string} name - Nama pengirim
 * @param {Object} ticket - Info tiket
 * @param {Object} event - Info acara
 * @returns {Object} - Status pengiriman email
 */
const sendTicketTransferConfirmation = async (email, name, ticket, event, recipient) => {
  try {
    const htmlContent = createTemplate('ticket-transfer-confirmation.html', {
      name,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      eventTitle: event.title,
      eventDate: new Date(event.date).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      eventTime: event.time,
      ticketType: ticket.ticketTypeName,
      appName: 'NesaVent',
      year: new Date().getFullYear()
    });
    
    const mailOptions = {
      from: `"NesaVent" <${process.env.SMTP_USER}@mailtrap.io>`,
      to: email,
      subject: `Transfer tiket untuk ${event.title} berhasil`,
      html: htmlContent
    };
    
    const info = await transporter.sendMail(mailOptions);
    logger.info('Email konfirmasi transfer tiket terkirim', {
      messageId: info.messageId,
      email,
      ticketId: ticket._id
    });
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    logger.error('Gagal mengirim email konfirmasi transfer tiket', {
      error: error.message,
      email,
      ticketId: ticket?._id
    });
    return {
      success: false,
      message: 'Gagal mengirim email konfirmasi transfer tiket'
    };
  }
};

module.exports = {
  sendVerificationEmail,
  sendTicketConfirmation,
  sendPasswordResetEmail,
  sendPaymentConfirmation,
  sendTicketTransferNotification,
  sendTicketTransferConfirmation,
  sendEmail
};
