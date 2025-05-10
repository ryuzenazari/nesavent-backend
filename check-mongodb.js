const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function checkMongoDB() {
  try {
    console.log('Mencoba terhubung ke MongoDB...');
    console.log('URI:', process.env.MONGODB_URI);
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Berhasil terhubung ke MongoDB!');

    // Cek database yang tersedia
    const admin = mongoose.connection.db.admin();
    const databases = await admin.listDatabases();
    console.log('\nDatabase yang tersedia:');
    databases.databases.forEach(db => {
      console.log(`- ${db.name}`);
    });

    // Cek koleksi dalam database saat ini
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nKoleksi dalam database:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });

    // Cek jumlah data dalam setiap koleksi
    console.log('\nJumlah data dalam setiap koleksi:');
    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log(`- ${collection.name}: ${count} dokumen`);
    }

    // Melihat contoh data dari koleksi users (jika ada)
    if (collections.some(c => c.name === 'users')) {
      const users = await mongoose.connection.db.collection('users').find({}).limit(3).toArray();
      console.log('\nContoh data users:');
      console.log(JSON.stringify(users, null, 2));
    }

    // Melihat contoh data dari koleksi events (jika ada)
    if (collections.some(c => c.name === 'events')) {
      const events = await mongoose.connection.db.collection('events').find({}).limit(3).toArray();
      console.log('\nContoh data events:');
      console.log(JSON.stringify(events, null, 2));
    }

    await mongoose.connection.close();
    console.log('\nKoneksi MongoDB ditutup.');
  } catch (error) {
    console.error('Gagal memeriksa MongoDB:', error);
  }
}

checkMongoDB(); 