const mongoose = require('mongoose');
const Event = require('../models/Event');
const User = require('../models/User');
const { connectDB } = require('../app');

const addRatingsFieldToEvents = async () => {
  try {
    console.log('Menambahkan field ratings ke event yang belum memilikinya...');
    const result = await Event.updateMany(
      { ratings: { $exists: false } },
      { $set: { ratings: { average: 0, count: 0 } } }
    );
    console.log(`${result.modifiedCount} event diperbarui dengan field ratings`);
  } catch (error) {
    console.error('Error saat menambahkan field ratings ke event:', error);
  }
};

const createUploadsDirectory = async () => {
  const fs = require('fs');
  const path = require('path');
  
  const directories = [
    '../uploads/events/ratings',
    '../uploads/social_share'
  ];
  
  for (const dir of directories) {
    const fullPath = path.join(__dirname, dir);
    
    if (!fs.existsSync(fullPath)) {
      try {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`Direktori ${fullPath} berhasil dibuat`);
      } catch (error) {
        console.error(`Error saat membuat direktori ${fullPath}:`, error);
      }
    } else {
      console.log(`Direktori ${fullPath} sudah ada`);
    }
  }
};

const updateUserModel = async () => {
  try {
    console.log('Memperbarui model User untuk social engagement...');
    
    const result = await User.updateMany(
      { 'myPage.stats.rating': { $exists: false } },
      { 
        $set: { 
          'myPage.stats.rating': 0
        } 
      }
    );
    
    console.log(`${result.modifiedCount} user diperbarui dengan field myPage.stats.rating`);
  } catch (error) {
    console.error('Error saat memperbarui model User:', error);
  }
};

const runMigration = async () => {
  await connectDB();
  
  await addRatingsFieldToEvents();
  await createUploadsDirectory();
  await updateUserModel();
  
  console.log('Migration selesai');
  process.exit(0);
};

runMigration().catch(error => {
  console.error('Migration gagal:', error);
  process.exit(1);
});