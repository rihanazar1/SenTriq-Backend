const express = require('express');
const router = express.Router();
const {
  addComment,
  getBlogComments,
  updateComment,
  deleteComment
} = require('../controllers/comment.Controller');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/blog/:blogId', getBlogComments);

// Protected routes
router.post('/', protect, addComment);
router.put('/:id', protect, updateComment);
router.delete('/:id', protect, deleteComment);

module.exports = router;
