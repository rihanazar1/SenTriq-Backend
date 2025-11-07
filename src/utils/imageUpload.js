const imagekit = require('../config/imagekit');

const uploadToImageKit = async (file, folder = 'blogs') => {
  try {
    console.log('Uploading to ImageKit:', file.originalname);
    
    // Convert buffer to base64
    const fileBase64 = file.buffer.toString('base64');
    
    const result = await imagekit.upload({
      file: fileBase64,
      fileName: `${Date.now()}_${file.originalname}`,
      folder: folder,
      useUniqueFileName: true
    });

    console.log('ImageKit upload success:', result.url);

    return {
      success: true,
      url: result.url,
      fileId: result.fileId,
      thumbnailUrl: result.thumbnailUrl
    };
  } catch (error) {
    console.error('ImageKit upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const deleteFromImageKit = async (fileId) => {
  try {
    await imagekit.deleteFile(fileId);
    return { success: true };
  } catch (error) {
    console.error('ImageKit delete error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { uploadToImageKit, deleteFromImageKit };
