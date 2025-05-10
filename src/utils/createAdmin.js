const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();
const User = require('../models/User');
const adminUser = {
  name: 'Admin',
  email: 'admin@example.com',
  password: 'admin123',
  role: 'admin'
};
const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Terhubung ke MongoDB');
    const existingAdmin = await User.findOne({ email: adminUser.email });
    
    if (existingAdmin) {
      console.log('User admin sudah ada dengan email:', adminUser.email);
      console.log('Password admin untuk login (sudah di-hash):', existingAdmin.password.substring(0, 20) + '...');
      
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('Role user berhasil diubah menjadi admin');
      }
    } else {
      const hashedPassword = await bcrypt.hash(adminUser.password, 10);
      console.log('Password admin akan di-hash menjadi:', hashedPassword.substring(0, 20) + '...');
      
      const newAdmin = new User({
        name: adminUser.name,
        email: adminUser.email,
        password: hashedPassword,
        role: 'admin'
      });
      
      await newAdmin.save();
      console.log('User admin berhasil dibuat dengan email:', adminUser.email);
    }
    
    await mongoose.connection.close();
    console.log('Koneksi ke MongoDB ditutup');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
};
createAdmin(); 