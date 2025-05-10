const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const logger = require('../utils/logger');

// Serialize user untuk disimpan di session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user dari session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Cek apakah konfigurasi Google OAuth tersedia
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  // Konfigurasi strategi Google OAuth
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
      passReqToCallback: true
    },
    async function(req, accessToken, refreshToken, profile, done) {
      try {
        // Cek apakah user dengan Google ID ini sudah ada di database
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
          // Update informasi dari Google jika user sudah ada
          user.googleProfile = profile;
          user.name = user.name || profile.displayName;
          if (profile.emails && profile.emails.length > 0) {
            user.email = user.email || profile.emails[0].value;
          }
          if (profile.photos && profile.photos.length > 0) {
            user.profileImage = user.profileImage || profile.photos[0].value;
          }
          
          // Set user as verified jika login dengan Google
          if (!user.isVerified) {
            user.isVerified = true;
          }
          
          await user.save();
          return done(null, user);
        } else {
          // Cek jika ada user dengan email yang sama
          let email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
          if (email) {
            const existingUser = await User.findOne({ email });
            
            if (existingUser) {
              // Update user yang sudah ada dengan Google ID
              existingUser.googleId = profile.id;
              existingUser.googleProfile = profile;
              if (profile.photos && profile.photos.length > 0) {
                existingUser.profileImage = existingUser.profileImage || profile.photos[0].value;
              }
              
              // Set user as verified jika login dengan Google
              if (!existingUser.isVerified) {
                existingUser.isVerified = true;
              }
              
              await existingUser.save();
              return done(null, existingUser);
            }
          }
          
          // Buat user baru jika user belum ada
          if (!email) {
            return done(new Error('Tidak dapat mengakses email dari akun Google Anda'), null);
          }
          
          // Deteksi apakah ini email mahasiswa (domain edu)
          const isStudentEmail = email.endsWith('.edu') || email.endsWith('.ac.id') || email.includes('student');
          
          const newUser = new User({
            name: profile.displayName,
            email: email,
            googleId: profile.id,
            googleProfile: profile,
            isVerified: true,
            role: isStudentEmail ? 'student' : 'user',
            profileImage: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null
          });
          
          await newUser.save();
          logger.info(`User baru mendaftar dengan Google: ${email}`);
          
          return done(null, newUser);
        }
      } catch (error) {
        logger.error('Error saat autentikasi Google', { error: error.message });
        return done(error, null);
      }
    }
  ));
} else {
  logger.warn('Konfigurasi Google OAuth tidak ditemukan. Fitur login dengan Google tidak akan tersedia.');
}

module.exports = passport; 