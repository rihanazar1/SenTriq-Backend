const express = require('express');
const router = express.Router();
const {
  createBlog,
  getAllBlogs,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
  toggleBlogStatus,
  likeBlog,
  getBlogStats
} = require('../controllers/blog.Controller');
const { protect } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const upload = require('../config/multer');

// Public routes
router.get('/', getAllBlogs);
router.get('/:slug', getBlogBySlug);
router.post('/:id/like', likeBlog);

// Admin routes
router.post('/', protect, adminAuth, upload.single('coverImage'), createBlog);
router.put('/:id', protect, adminAuth, upload.single('coverImage'), updateBlog);
router.delete('/:id', protect, adminAuth, deleteBlog);
router.patch('/:id/toggle-status', protect, adminAuth, toggleBlogStatus);
router.get('/admin/stats', protect, adminAuth, getBlogStats);

module.exports = router;
