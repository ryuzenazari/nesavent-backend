const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();
const User = require('../models/User');
const adminEmail = 'admin@example.com';
const newPassword = 'admin123';
const resetAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Terhubung ke MongoDB');
    const admin = await User.findOne({ email: adminEmail });
    
    if (!admin) {
      console.log('Admin tidak ditemukan, buat admin baru:');
      console.log('npm run create:admin');
      return;
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    
    admin.role = 'admin';
    
    await admin.save();
    
    console.log('Password admin berhasil direset');
    console.log('Email:', adminEmail);
    console.log('Password:', newPassword);
    
    await mongoose.connection.close();
    console.log('Koneksi ke MongoDB ditutup');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
};
resetAdminPassword(); 