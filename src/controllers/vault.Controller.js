const asyncHandler = require('express-async-handler');
const Vault = require('../models/vaultSchema');
const User = require('../models/userSchema');
const bcrypt = require('bcryptjs');

// Generate master key from user password using bcrypt
const generateMasterKey = async (userPassword, userId) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(`${userPassword}:${userId.toString()}`, salt);
};



const createVaultEntry = asyncHandler(async (req, res) => {
  const { 
    applicationName, 
    websiteUrl, 
    username, 
    password, 
    notes, 
    masterPassword 
  } = req.body;
  const userId = req.user._id;

  // Verify master password (user's account password)
  const user = await User.findById(userId).select('+password');
  const isValidPassword = await user.comparePassword(masterPassword);
  
  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      error: 'Invalid master password'
    });
  }

  // Generate master key for encryption
  const masterKey = await generateMasterKey(masterPassword, userId);

  // Encrypt sensitive data
  const encryptedUsername = await Vault.encryptData(username, masterKey);
  const encryptedPassword = await Vault.encryptData(password, masterKey);
  const encryptedNotes = notes ? await Vault.encryptData(notes, masterKey) : null;

  // Create vault entry
  const vaultEntry = await Vault.create({
    userId,
    applicationName,
    websiteUrl: websiteUrl || null,
    encryptedUsername: encryptedUsername.encrypted,
    encryptedPassword: encryptedPassword.encrypted,
    encryptedNotes: encryptedNotes ? encryptedNotes.encrypted : null,
    iv: encryptedUsername.iv // Use same IV for all fields
  });

  res.status(201).json({
    success: true,
    data: {
      id: vaultEntry._id,
      applicationName: vaultEntry.applicationName,
      websiteUrl: vaultEntry.websiteUrl,
      createdAt: vaultEntry.createdAt
    }
  });
});




const getVaultEntries = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { search } = req.query;

  let entries;
  if (search) {
    entries = await Vault.searchEntries(userId, search);
  } else {
    entries = await Vault.find({ userId, isActive: true })
      .select('applicationName websiteUrl lastAccessed createdAt')
      .sort({ createdAt: -1 });
  }

  res.status(200).json({
    success: true,
    count: entries.length,
    data: entries
  });
});




const getDecryptedEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { masterPassword } = req.body;
  const userId = req.user._id;

  // Verify master password
  const user = await User.findById(userId).select('+password');
  const isValidPassword = await user.comparePassword(masterPassword);
  
  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      error: 'Invalid master password'
    });
  }

  // Get vault entry
  const vaultEntry = await Vault.findOne({ _id: id, userId, isActive: true });
  
  if (!vaultEntry) {
    return res.status(404).json({
      success: false,
      error: 'Vault entry not found'
    });
  }

  // Generate master key and decrypt data
  const masterKey = await generateMasterKey(masterPassword, userId);
  
  try {
    const decryptedData = await vaultEntry.decryptSensitiveData(masterKey);
    
    // Update last accessed
    vaultEntry.lastAccessed = new Date();
    await vaultEntry.save();

    res.status(200).json({
      success: true,
      data: {
        id: vaultEntry._id,
        applicationName: vaultEntry.applicationName,
        websiteUrl: vaultEntry.websiteUrl,
        username: decryptedData.username,
        password: decryptedData.password,
        notes: decryptedData.notes,
        lastAccessed: vaultEntry.lastAccessed,
        createdAt: vaultEntry.createdAt,
        updatedAt: vaultEntry.updatedAt
      }
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Failed to decrypt data. Invalid master password.'
    });
  }
});




const updateVaultEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    applicationName, 
    websiteUrl, 
    username, 
    password, 
    notes, 
    masterPassword 
  } = req.body;
  const userId = req.user._id;

  // Verify master password
  const user = await User.findById(userId).select('+password');
  const isValidPassword = await user.comparePassword(masterPassword);
  
  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      error: 'Invalid master password'
    });
  }

  // Get vault entry
  const vaultEntry = await Vault.findOne({ _id: id, userId, isActive: true });
  
  if (!vaultEntry) {
    return res.status(404).json({
      success: false,
      error: 'Vault entry not found'
    });
  }

  // Generate master key for encryption
  const masterKey = await generateMasterKey(masterPassword, userId);

  // Update non-sensitive fields
  if (applicationName) vaultEntry.applicationName = applicationName;
  if (websiteUrl !== undefined) vaultEntry.websiteUrl = websiteUrl;

  // Update sensitive fields if provided
  if (username) {
    const encryptedUsername = await Vault.encryptData(username, masterKey);
    vaultEntry.encryptedUsername = encryptedUsername.encrypted;
    vaultEntry.iv = encryptedUsername.iv;
  }
  
  if (password) {
    const encryptedPassword = await Vault.encryptData(password, masterKey);
    vaultEntry.encryptedPassword = encryptedPassword.encrypted;
  }
  
  if (notes !== undefined) {
    if (notes) {
      const encryptedNotes = await Vault.encryptData(notes, masterKey);
      vaultEntry.encryptedNotes = encryptedNotes.encrypted;
    } else {
      vaultEntry.encryptedNotes = null;
    }
  }

  await vaultEntry.save();

  res.status(200).json({
    success: true,
    data: {
      id: vaultEntry._id,
      applicationName: vaultEntry.applicationName,
      websiteUrl: vaultEntry.websiteUrl,
      updatedAt: vaultEntry.updatedAt
    }
  });
});



const deleteVaultEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { masterPassword } = req.body;
  const userId = req.user._id;

  // Verify master password
  const user = await User.findById(userId).select('+password');
  const isValidPassword = await user.comparePassword(masterPassword);
  
  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      error: 'Invalid master password'
    });
  }

  // Get and delete vault entry
  const vaultEntry = await Vault.findOne({ _id: id, userId, isActive: true });
  
  if (!vaultEntry) {
    return res.status(404).json({
      success: false,
      error: 'Vault entry not found'
    });
  }

  // Soft delete
  vaultEntry.isActive = false;
  await vaultEntry.save();

  res.status(200).json({
    success: true,
    message: 'Vault entry deleted successfully'
  });
});



const getVaultStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const stats = await Vault.getUserVaultStats(userId);

  res.status(200).json({
    success: true,
    data: stats[0] || {
      totalEntries: 0,
      recentEntries: 0
    }
  });
});

module.exports = {
  createVaultEntry,
  getVaultEntries,
  getDecryptedEntry,
  updateVaultEntry,
  deleteVaultEntry,
  getVaultStats
};