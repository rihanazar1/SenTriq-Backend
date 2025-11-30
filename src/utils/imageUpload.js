const imagekit = require('../config/imagekit');
const axios = require('axios');

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

// Extract and upload images from blog content
const processContentImages = async (content) => {
  if (!content) return { content, fileIds: [] };

  const uploadedFileIds = [];
  let processedContent = content;

  try {
    // Regex to match img tags with src attribute
    const imgTagRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    // Regex to match markdown images ![alt](url)
    const markdownImgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;

    const imageUrls = new Set();

    // Extract from HTML img tags
    let match;
    while ((match = imgTagRegex.exec(content)) !== null) {
      const url = match[1];
      // Skip if already on ImageKit or is a data URL
      if (!url.includes('ik.imagekit.io') && !url.startsWith('data:')) {
        imageUrls.add({ url, fullMatch: match[0], type: 'html' });
      }
    }

    // Extract from Markdown syntax
    while ((match = markdownImgRegex.exec(content)) !== null) {
      const url = match[2];
      if (!url.includes('ik.imagekit.io') && !url.startsWith('data:')) {
        imageUrls.add({ url, fullMatch: match[0], type: 'markdown', alt: match[1] });
      }
    }

    // Process base64 images
    const base64ImgRegex = /<img[^>]+src=["'](data:image\/[^;]+;base64,[^"']+)["'][^>]*>/gi;
    while ((match = base64ImgRegex.exec(content)) !== null) {
      imageUrls.add({ url: match[1], fullMatch: match[0], type: 'base64' });
    }

    // Upload each image
    for (const imgData of imageUrls) {
      try {
        let uploadResult;

        if (imgData.type === 'base64') {
          // Handle base64 images
          const base64Data = imgData.url.split(',')[1];
          const mimeType = imgData.url.match(/data:(image\/[^;]+);/)[1];
          const extension = mimeType.split('/')[1];

          uploadResult = await imagekit.upload({
            file: base64Data,
            fileName: `${Date.now()}_content_image.${extension}`,
            folder: 'blogs/content',
            useUniqueFileName: true
          });
        } else {
          // Handle external URLs
          const response = await axios.get(imgData.url, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0'
            }
          });

          const buffer = Buffer.from(response.data);
          const base64 = buffer.toString('base64');

          // Get file extension from URL or content-type
          let extension = imgData.url.split('.').pop().split('?')[0];
          if (!['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension.toLowerCase())) {
            const contentType = response.headers['content-type'];
            extension = contentType ? contentType.split('/')[1] : 'jpg';
          }

          uploadResult = await imagekit.upload({
            file: base64,
            fileName: `${Date.now()}_content_image.${extension}`,
            folder: 'blogs/content',
            useUniqueFileName: true
          });
        }

        if (uploadResult && uploadResult.url) {
          uploadedFileIds.push(uploadResult.fileId);

          // Replace in content
          if (imgData.type === 'html' || imgData.type === 'base64') {
            processedContent = processedContent.replace(
              imgData.fullMatch,
              imgData.fullMatch.replace(imgData.url, uploadResult.url)
            );
          } else if (imgData.type === 'markdown') {
            processedContent = processedContent.replace(
              imgData.fullMatch,
              `![${imgData.alt}](${uploadResult.url})`
            );
          }

          console.log(`Content image uploaded: ${uploadResult.url}`);
        }
      } catch (error) {
        console.error(`Failed to upload content image ${imgData.url}:`, error.message);
        // Continue with other images even if one fails
      }
    }

    return {
      content: processedContent,
      fileIds: uploadedFileIds
    };
  } catch (error) {
    console.error('Error processing content images:', error);
    return { content, fileIds: [] };
  }
};

module.exports = { uploadToImageKit, deleteFromImageKit, processContentImages };
