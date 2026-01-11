const logger = require('../utils/logger');
const { validateCreatePost } = require('../utils/validate');
const Post = require('../models/Post');
const { publishEvent } = require('../utils/rabbitmq');
const mongoose = require('mongoose');

async function invalidatePostCache(req,input){
   const cachedkey = `post:${input}`
   await req.redisClient.del(cachedkey);

   const keys = await req.redisClient.keys("post:*");
   if(keys.length > 0){
      await req.redisClient.del(keys)
   }
}

const createPost = async(req , res) => {
    logger.info('Create post endpoint hit');
    try{
       const {error} = validateCreatePost(req.body);
       if(error){
          logger.warn("Validation error", error.details[0].message);
          return res.status(400).json({
             success : false,
             message : error.details[0].message,
          });
       }
        const {content,mediaIds} = req.body;
        const newlyCreatedPost = new Post({
            user : req.user.userId,
            content,
            mediaIds : mediaIds || [],
        })

        await newlyCreatedPost.save();

        await publishEvent('post.created',{
            postId : newlyCreatedPost._id.toString(),
            userId : newlyCreatedPost.user.toString(),
            content:newlyCreatedPost.content,
            createdAt:newlyCreatedPost.createdAt
        });
        
        await invalidatePostCache(req, newlyCreatedPost._id.toString());
        logger.info("Post created successfully", newlyCreatedPost);
        res.status(201).json({
            success : true,
            message : 'Post created successfully'
        })


    }catch(e){
       logger.error('Error while creating post', e);
       res.status(500).json({
          success : false,
          message : 'Error creating post'
       })
    }
};

const getAllPosts = async(req , res) => {
    try{
         
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const startIndex = (page - 1) * limit

      const cachekey = `posts:${page}:${limit}`;
      const cachedPosts = await req.redisClient.get(cachekey);
     
      if(cachedPosts){
         return res.json(JSON.parse(cachedPosts));
      }

      const posts = await Post.find({})
         .sort({ createdAt: -1})
         .skip(startIndex)
         .limit(limit);

      const totalNoOfPosts = await Post.countDocuments()

      const result = {
         posts,
         currentpage : page,
         totalPages : Math.ceil(totalNoOfPosts/limit),
         totalPosts : totalNoOfPosts
      }

      //save your posts in redis cache
      await req.redisClient.setex(cachekey,300, JSON.stringify(result))

      res.json(result)
    }catch(e){
       logger.error('Error fetching post',e);
       res.status(500).json({
          success : false,
          message : 'Error fetching post'
       })
    }
};

const getPost = async(req , res) => {
    try{
      const postId = req.params.id;
      
      logger.info(`Fetching post with ID: ${postId}`);

      // Validate postId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(postId)) {
          logger.warn(`Invalid post ID format: ${postId}`);
          return res.status(400).json({
              success: false,
              message: "Invalid post ID format",
          });
      }

      const cachekey = `post:${postId}`;
      const cachedPost = await req.redisClient.get(cachekey);

      if(cachedPost){
         logger.info(`Post found in cache: ${postId}`);
         return res.json(JSON.parse(cachedPost));
      }

      logger.info(`Post not in cache, querying database for: ${postId}`);
      const singlePostDetailsbyId = await Post.findById(postId);

      if(!singlePostDetailsbyId){
         logger.warn(`Post not found in database: ${postId}`);
         return res.status(404).json({
            message : 'Post not found',
            success : false
         })
      }

      logger.info(`Post found: ${postId}, caching result`);
      await req.redisClient.setex(cachekey, 3600, JSON.stringify(singlePostDetailsbyId));
      res.json(singlePostDetailsbyId);

    }catch(e){
       logger.error('Error fetching post',e);
       res.status(500).json({
          success : false,
          message : 'Error fetching post by ID'
       })
    }
};

const deletePost = async(req , res) => {
    try{
        const postId = req.params.id;
        const userId = req.user.userId;

        logger.info(`Attempting to delete post: ${postId} by user: ${userId}`);

        // Validate postId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(postId)) {
            logger.warn(`Invalid post ID format: ${postId}`);
            return res.status(400).json({
                success: false,
                message: "Invalid post ID format",
            });
        }

        // Validate userId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            logger.warn(`Invalid user ID format: ${userId}`);
            return res.status(400).json({
                success: false,
                message: "Invalid user ID format",
            });
        }

        // First find the post to check if it exists and belongs to the user
        logger.info(`Querying for post with _id: ${postId}, user: ${userId}`);
        const post = await Post.findOne({
            _id: postId,
            user: userId
        });

        if(!post) {
            // Check if post exists at all (for better error message)
            logger.info(`Post not found with user match, checking if post exists at all...`);
            const postExists = await Post.findById(postId);
            if (!postExists) {
                logger.warn(`Post does not exist in database: ${postId}`);
                return res.status(404).json({
                    success: false,
                    message: "Post not found",
                });
            } else {
                logger.warn(`Post exists but user mismatch. Post user: ${postExists.user}, Request user: ${userId}`);
                return res.status(403).json({
                    success: false,
                    message: "You don't have permission to delete this post",
                });
            }
        }

        logger.info(`Post found and belongs to user. Post ID: ${post._id}, User ID: ${post.user}`);

        // Delete the post
        await Post.findByIdAndDelete(postId);

        // Publish post deleted event
        await publishEvent('post.deleted',{
            postId : post._id.toString(),
            userId : userId,
            mediaIds : post.mediaIds || [],
        });

        await invalidatePostCache(req, postId);
        res.json({
            success: true,
            message: "Post deleted successfully",
        })

    }catch(e){
       logger.error('Error deleting post',e);
       res.status(500).json({
          success : false,
          message : 'Error deleting post'
       })
    }
};

module.exports = {createPost,getAllPosts, getPost, deletePost};
