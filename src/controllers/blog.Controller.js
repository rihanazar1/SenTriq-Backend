const asyncHandler = require('express-async-handler');
const Blog = require('../models/blogSchema');
const Comment = require('../models/commentSchema');
const { uploadToImageKit, deleteFromImageKit } = require('../utils/imageUpload');
const slugify = require('slugify');

// Create blog (Admin only)
const createBlog = asyncHandler(async (req, res) => {
  const { title, content, excerpt, category, tags, status, isFeatured, metaTitle, metaDescription } = req.body;

  let coverImageUrl = null;
  let coverImageFileId = null;

  // Upload cover image if provided
  if (req.file) {
    console.log('File received:', req.file.originalname, 'Size:', req.file.size);
    const uploadResult = await uploadToImageKit(req.file, 'blogs/covers');
    
    if (uploadResult.success) {
      coverImageUrl = uploadResult.url;
      coverImageFileId = uploadResult.fileId;
      console.log('Image uploaded successfully:', coverImageUrl);
    } else {
      console.error('Upload failed:', uploadResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload cover image: ' + uploadResult.error
      });
    }
  } else {
    console.log('No file received in request');
  }

  // Generate slug from title
  const slug = slugify(title, { lower: true, strict: true });

  // Check if slug already exists
  const existingBlog = await Blog.findOne({ slug });
  if (existingBlog) {
    return res.status(400).json({
      success: false,
      error: 'Blog with this title already exists'
    });
  }

  // Parse tags - handle array, JSON string, or comma-separated string
  let parsedTags = [];
  if (tags) {
    if (Array.isArray(tags)) {
      // Already an array
      parsedTags = tags;
    } else if (typeof tags === 'string') {
      try {
        // Try parsing as JSON first
        parsedTags = JSON.parse(tags);
      } catch (e) {
        // If not JSON, treat as comma-separated string
        parsedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
    }
  }

  const blog = await Blog.create({
    title,
    slug,
    content,
    excerpt,
    coverImage: coverImageUrl,
    coverImageFileId,
    author: req.user._id,
    category,
    tags: parsedTags,
    status: status || 'draft',
    isFeatured: isFeatured === 'true',
    metaTitle,
    metaDescription
  });

  const populatedBlog = await Blog.findById(blog._id).populate('author', 'name email');

  res.status(201).json({
    success: true,
    data: populatedBlog
  });
});







// Get all blogs (Public - with filters)
const getAllBlogs = asyncHandler(async (req, res) => {
  const {
    status,
    category,
    isFeatured,
    search,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  const query = {};

  // Only show published blogs to non-admin users
  if (!req.user || req.user.role !== 'admin') {
    query.status = 'published';
  } else if (status) {
    query.status = status;
  }

  if (category) query.category = category;
  if (isFeatured) query.isFeatured = isFeatured === 'true';

  // Search in title, content, excerpt
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { excerpt: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }

  const skip = (page - 1) * limit;
  const sortOrder = order === 'desc' ? -1 : 1;

  const blogs = await Blog.find(query)
    .populate('author', 'name email')
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(parseInt(limit))
    .select('-__v');

  const total = await Blog.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      blogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalBlogs: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }
  });
});






// Get single blog by slug (Public)
const getBlogBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const blog = await Blog.findOne({ slug })
    .populate('author', 'name email')
    .populate({
      path: 'comments',
      populate: {
        path: 'user',
        select: 'name email'
      }
    });

  if (!blog) {
    return res.status(404).json({
      success: false,
      error: 'Blog not found'
    });
  }

  // Only allow viewing published blogs for non-admin
  if (blog.status !== 'published' && (!req.user || req.user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      error: 'This blog is not published yet'
    });
  }

  // Increment view count
  blog.viewsCount += 1;
  await blog.save();

  res.status(200).json({
    success: true,
    data: blog
  });
});





// Update blog (Admin only)
const updateBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, content, excerpt, category, tags, status, isFeatured, metaTitle, metaDescription } = req.body;

  const blog = await Blog.findById(id);

  if (!blog) {
    return res.status(404).json({
      success: false,
      error: 'Blog not found'
    });
  }

  // Handle cover image update
  if (req.file) {
    // Delete old image if exists
    if (blog.coverImageFileId) {
      await deleteFromImageKit(blog.coverImageFileId);
    }

    const uploadResult = await uploadToImageKit(req.file, 'blogs/covers');
    if (uploadResult.success) {
      blog.coverImage = uploadResult.url;
      blog.coverImageFileId = uploadResult.fileId;
    }
  }

  // Update slug if title changed
  if (title && title !== blog.title) {
    blog.slug = slugify(title, { lower: true, strict: true });
  }

  // Parse tags - handle array, JSON string, or comma-separated string
  let parsedTags = blog.tags;
  if (tags) {
    if (Array.isArray(tags)) {
      parsedTags = tags;
    } else if (typeof tags === 'string') {
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        parsedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
    }
  }

  blog.title = title || blog.title;
  blog.content = content || blog.content;
  blog.excerpt = excerpt || blog.excerpt;
  blog.category = category || blog.category;
  blog.tags = parsedTags;
  blog.status = status || blog.status;
  blog.isFeatured = isFeatured !== undefined ? isFeatured === 'true' : blog.isFeatured;
  blog.metaTitle = metaTitle || blog.metaTitle;
  blog.metaDescription = metaDescription || blog.metaDescription;

  await blog.save();

  const updatedBlog = await Blog.findById(blog._id).populate('author', 'name email');

  res.status(200).json({
    success: true,
    data: updatedBlog
  });
});

// Delete blog (Admin only)
const deleteBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const blog = await Blog.findById(id);

  if (!blog) {
    return res.status(404).json({
      success: false,
      error: 'Blog not found'
    });
  }

  // Delete cover image from ImageKit
  if (blog.coverImageFileId) {
    await deleteFromImageKit(blog.coverImageFileId);
  }

  // Delete all comments associated with this blog
  await Comment.deleteMany({ blog: id });

  await blog.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Blog deleted successfully'
  });
});

// Publish/Unpublish blog (Admin only)
const toggleBlogStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const blog = await Blog.findById(id);

  if (!blog) {
    return res.status(404).json({
      success: false,
      error: 'Blog not found'
    });
  }

  blog.status = blog.status === 'published' ? 'draft' : 'published';
  await blog.save();

  res.status(200).json({
    success: true,
    message: `Blog ${blog.status === 'published' ? 'published' : 'unpublished'} successfully`,
    data: blog
  });
});

// Like blog
const likeBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const blog = await Blog.findById(id);

  if (!blog) {
    return res.status(404).json({
      success: false,
      error: 'Blog not found'
    });
  }

  blog.likesCount += 1;
  await blog.save();

  res.status(200).json({
    success: true,
    data: {
      likesCount: blog.likesCount
    }
  });
});

// Get blog stats (Admin only)
const getBlogStats = asyncHandler(async (req, res) => {
  const stats = await Blog.aggregate([
    {
      $group: {
        _id: null,
        totalBlogs: { $sum: 1 },
        publishedBlogs: {
          $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
        },
        draftBlogs: {
          $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
        },
        featuredBlogs: {
          $sum: { $cond: ['$isFeatured', 1, 0] }
        },
        totalViews: { $sum: '$viewsCount' },
        totalLikes: { $sum: '$likesCount' },
        avgViews: { $avg: '$viewsCount' },
        avgLikes: { $avg: '$likesCount' }
      }
    }
  ]);

  const categoryStats = await Blog.aggregate([
    { $match: { category: { $ne: null } } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: stats[0] || {},
      categories: categoryStats
    }
  });
});

module.exports = {
  createBlog,
  getAllBlogs,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
  toggleBlogStatus,
  likeBlog,
  getBlogStats
};
