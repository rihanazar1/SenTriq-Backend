const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const VaultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },

    applicationName: {
      type: String,
      required: [true, 'Application/Website name is required'],
      trim: true,
      maxlength: [100, 'Application name cannot exceed 100 characters']
    },

    websiteUrl: {
      type: String,
      trim: true,
      default: null
    },

    encryptedUsername: {
      type: String,
      required: [true, 'Username/Email is required']
    },

    encryptedPassword: {
      type: String,
      required: [true, 'Password is required']
    },

    encryptedNotes: {
      type: String,
      default: null
    },

    iv: {
      type: String,
      required: true
    },


    lastAccessed: {
      type: Date,
      default: null
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
VaultSchema.index({ userId: 1, applicationName: 1 });
VaultSchema.index({ userId: 1, createdAt: -1 });

// Simple encryption/decryption using bcrypt for key derivation
VaultSchema.statics.encryptData = async function(text, masterKey) {
  // Use bcrypt to create a consistent hash from master key
  const salt = await bcrypt.genSalt(10);
  const keyHash = await bcrypt.hash(masterKey, salt);
  
  // Simple XOR encryption using the hash
  const encrypted = Buffer.from(text)
    .map((byte, index) => byte ^ keyHash.charCodeAt(index % keyHash.length))
    .toString('base64');
  
  return {
    encrypted,
    iv: salt
  };
};

VaultSchema.statics.decryptData = async function(encryptedText, iv, masterKey) {
  try {
    // Recreate the key hash using the stored salt
    const keyHash = await bcrypt.hash(masterKey, iv);
    
    // Decrypt using XOR
    const decrypted = Buffer.from(encryptedText, 'base64')
      .map((byte, index) => byte ^ keyHash.charCodeAt(index % keyHash.length))
      .toString();
    
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed');
  }
};

// Instance method to decrypt all sensitive data
VaultSchema.methods.decryptSensitiveData = async function(masterKey) {
  try {
    const username = await this.constructor.decryptData(this.encryptedUsername, this.iv, masterKey);
    const password = await this.constructor.decryptData(this.encryptedPassword, this.iv, masterKey);
    const notes = this.encryptedNotes ? await this.constructor.decryptData(this.encryptedNotes, this.iv, masterKey) : null;
    
    return {
      username,
      password,
      notes
    };
  } catch (error) {
    throw new Error('Failed to decrypt data. Invalid master key.');
  }
};

// Static method to get user's vault statistics
VaultSchema.statics.getUserVaultStats = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true } },
    {
      $group: {
        _id: null,
        totalEntries: { $sum: 1 },
        recentEntries: { $sum: { $cond: [{ $gte: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] }, 1, 0] } }
      }
    },
    {
      $project: {
        _id: 0,
        totalEntries: 1,
        recentEntries: 1
      }
    }
  ]);
};

// Static method to search entries
VaultSchema.statics.searchEntries = function(userId, searchTerm) {
  return this.find({
    userId: new mongoose.Types.ObjectId(userId),
    isActive: true,
    $or: [
      { applicationName: { $regex: searchTerm, $options: 'i' } },
      { websiteUrl: { $regex: searchTerm, $options: 'i' } }
    ]
  })
  .select('applicationName websiteUrl lastAccessed createdAt')
  .sort({ createdAt: -1 });
};

const VaultModel = mongoose.model('Vault', VaultSchema);

module.exports = VaultModel;