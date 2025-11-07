const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  content: {
    type: String,
    required: true,
  },
  excerpt: {
    type: String,
  },
  coverImage: {
    type: String,
  },
  coverImageFileId: {
    type: String,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  category: {
    type: String,
  },
  tags: {
    type: [String],
  },
  status: {
    type: String,
    enum: ["draft", "published"],
    default: "draft",
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  viewsCount: {
    type: Number,
    default: 0,
  },
  likesCount: {
    type: Number,
    default: 0,
  },
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
  ],
  metaTitle: {
    type: String,
  },
  metaDescription: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model("Blog", blogSchema);





// {
//   "title": "Modern React Hooks You Should Know",
//   "content": "React Hooks have changed the way we write components. useState and useEffect are just the beginning. Custom hooks let you extract component logic into reusable functions. useContext simplifies state management across components. useMemo and useCallback optimize performance. useReducer handles complex state logic. Learn when and how to use each hook effectively for cleaner, more maintainable code.",
//   "excerpt": "Master React Hooks for better component development",
//   "category": "Web Development",
//   "tags": ["react", "hooks", "javascript", "frontend"],
//   "status": "published",
//   "isFeatured": false,
//   "metaTitle": "React Hooks Guide - useState, useEffect & More",
//   "metaDescription": "Learn essential React Hooks for modern component development"
// }


// {
//   "title": "MongoDB Best Practices for Production",
//   "content": "MongoDB is a powerful NoSQL database, but it requires proper configuration for production use. Always use indexes on frequently queried fields. Implement proper schema validation. Use connection pooling for better performance. Enable authentication and use role-based access control. Regular backups are essential. Monitor query performance with explain(). Avoid large documents and use references when needed. Implement proper error handling and logging.",
//   "excerpt": "Essential MongoDB practices for production applications",
//   "category": "Database",
//   "tags": ["mongodb", "database", "nosql", "backend"],
//   "status": "published",
//   "isFeatured": true,
//   "metaTitle": "MongoDB Production Best Practices",
//   "metaDescription": "Learn how to optimize MongoDB for production environments"
// }



// Fake Comment Data 

// {
//   "blogId": "your-blog-id-here",
//   "content": "Great article! This really helped me understand the concepts better. Thanks for sharing!"
// }
// {
//   "blogId": "your-blog-id-here",
//   "content": "Very informative post. Could you also cover error handling in the next tutorial?"
// }
// Reply 
// {
//   "blogId": "your-blog-id-here",
//   "content": "Thanks for the feedback! I'll definitely cover that in the next post.",
//   "parentCommentId": "parent-comment-id-here"
// }
