const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      }
    },
    role: {
      type: String,
      enum: ['user', 'student', 'creator', 'staff_creator', 'admin'],
      default: 'user'
    },
    profileImage: {
      type: String,
      default: null
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationToken: String,
    verificationTokenExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockedUntil: Date,
    lastLogin: Date,
    nim: {
      type: String,
      trim: true,
      sparse: true
    },
    myPage: {
      slug: {
        type: String,
        unique: true,
        sparse: true,
        index: true
      },
      bio: {
        type: String,
        maxlength: 1000
      },
      coverImage: {
        type: String
      },
      socialMedia: {
        website: String,
        instagram: String,
        twitter: String,
        facebook: String,
        linkedin: String,
        youtube: String
      },
      organization: {
        name: String,
        logo: String,
        position: String
      },
      contact: {
        email: String,
        phone: String,
        whatsapp: String
      },
      stats: {
        totalEvents: {
          type: Number,
          default: 0
        },
        totalTicketsSold: {
          type: Number,
          default: 0
        },
        followers: {
          type: Number,
          default: 0
        },
        rating: {
          type: Number,
          default: 0
        }
      },
      isPublic: {
        type: Boolean,
        default: true
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    },
    staffDetails: {
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      addedAt: Date,
      staffName: String,
      creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      permissions: {
        scanTickets: {
          type: Boolean,
          default: true
        },
        viewAttendees: {
          type: Boolean,
          default: false
        },
        viewStats: {
          type: Boolean,
          default: false
        }
      }
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    googleProfile: {
      type: Object
    }
  },
  {
    timestamps: true
  }
);
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};
userSchema.methods.incrementLoginAttempts = async function () {
  this.loginAttempts += 1;
  if (this.loginAttempts >= 5) {
    const lockTime = new Date();
    lockTime.setMinutes(lockTime.getMinutes() + 30);
    this.lockedUntil = lockTime;
  }
  return this.save();
};
userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockedUntil = undefined;
  this.lastLogin = new Date();
  return this.save();
};
userSchema.methods.isAccountLocked = function () {
  return this.lockedUntil && new Date() < this.lockedUntil;
};
const User = mongoose.model('User', userSchema);
module.exports = User;
