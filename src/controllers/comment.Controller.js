const asyncHandler = require('express-async-handler');
const Comment = require('../models/commentSchema');
const Blog = require('../models/blogSchema');

// Add comment (Authenticated users)
const addComment = asyncHandler(async (req, res) => {
  const { blogId, content, parentCommentId } = req.body;

  // Check if blog exists
  const blog = await Blog.findById(blogId);
  if (!blog) {
    return res.status(404).json({
      success: false,
      error: 'Blog not found'
    });
  }

  // If parent comment exists, verify it
  if (parentCommentId) {
    const parentComment = await Comment.findById(parentCommentId);
    if (!parentComment || parentComment.blog.toString() !== blogId) {
      return res.status(404).json({
        success: false,
        error: 'Parent comment not found'
      });
    }
  }

  const comment = await Comment.create({
    blog: blogId,
    user: req.user._id,
    content,
    parentComment: parentCommentId || null
  });

  // Add comment to blog
  blog.comments.push(comment._id);
  await blog.save();

  const populatedComment = await Comment.findById(comment._id)
    .populate('user', 'name email')
    .populate('parentComment');

  // Emit socket event for real-time update
  if (req.io) {
    req.io.to(`blog_${blogId}`).emit('new_comment', populatedComment);
  }

  res.status(201).json({
    success: true,
    data: populatedComment
  });
});




// Get comments for a blog
const getBlogComments = asyncHandler(async (req, res) => {
  const { blogId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const skip = (page - 1) * limit;

  const comments = await Comment.find({ 
    blog: blogId, 
    isDeleted: false,
    parentComment: null // Only get top-level comments
  })
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get replies for each comment
  const commentsWithReplies = await Promise.all(
    comments.map(async (comment) => {
      const replies = await Comment.find({ 
        parentComment: comment._id,
        isDeleted: false
      })
        .populate('user', 'name email')
        .sort({ createdAt: 1 });

      return {
        ...comment.toObject(),
        replies
      };
    })
  );

  const total = await Comment.countDocuments({ 
    blog: blogId, 
    isDeleted: false,
    parentComment: null
  });

  res.status(200).json({
    success: true,
    data: {
      comments: commentsWithReplies,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalComments: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }
  });
});



// Update comment (Owner only)
const updateComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  const comment = await Comment.findById(id);

  if (!comment) {
    return res.status(404).json({
      success: false,
      error: 'Comment not found'
    });
  }

  // Check if user is the owner
  if (comment.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      error: 'You can only edit your own comments'
    });
  }

  comment.content = content;
  comment.isEdited = true;
  await comment.save();

  const updatedComment = await Comment.findById(comment._id)
    .populate('user', 'name email');

  // Emit socket event
  if (req.io) {
    req.io.to(`blog_${comment.blog}`).emit('comment_updated', updatedComment);
  }

  res.status(200).json({
    success: true,
    data: updatedComment
  });
});

// Delete comment (Owner or Admin)
const deleteComment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const comment = await Comment.findById(id);

  if (!comment) {
    return res.status(404).json({
      success: false,
      error: 'Comment not found'
    });
  }

  // Check if user is owner or admin
  if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'You can only delete your own comments'
    });
  }

  comment.isDeleted = true;
  comment.content = '[This comment has been deleted]';
  await comment.save();

  // Remove from blog's comments array
  await Blog.findByIdAndUpdate(comment.blog, {
    $pull: { comments: comment._id }
  });

  // Emit socket event
  if (req.io) {
    req.io.to(`blog_${comment.blog}`).emit('comment_deleted', { commentId: id });
  }

  res.status(200).json({
    success: true,
    message: 'Comment deleted successfully'
  });
});

module.exports = {
  addComment,
  getBlogComments,
  updateComment,
  deleteComment
};
