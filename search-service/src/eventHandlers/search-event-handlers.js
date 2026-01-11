const Search = require("../models/search");
const logger = require("../utils/logger");

/**
 * Handle post creation event
 */
async function handlePostCreated(event) {
  try {
    // defensive validation
    if (!event || !event.postId || !event.userId) {
      logger.warn("Invalid post created event received", event);
      return;
    }

    const newSearchPost = new Search({
      postId: event.postId,
      userId: event.userId,
      content: event.content || "",
      createdAt: event.createdAt || new Date(),
    });

    await newSearchPost.save();

    logger.info(
      `Search post indexed successfully | postId=${event.postId}, searchId=${newSearchPost._id}`
    );
  } catch (error) {
    logger.error(
      `Error handling post created event | postId=${event?.postId}`,
      error
    );
  }
}

/**
 * Handle post deletion event
 */
async function handlePostDeleted(event) {
  try {
    if (!event || !event.postId) {
      logger.warn("Invalid post deleted event received", event);
      return;
    }

    const deletedPost = await Search.findOneAndDelete({
      postId: event.postId,
    });

    if (deletedPost) {
      logger.info(`Search post removed | postId=${event.postId}`);
    } else {
      logger.warn(`Search post not found | postId=${event.postId}`);
    }
  } catch (error) {
    logger.error(
      `Error handling post deleted event | postId=${event?.postId}`,
      error
    );
  }
}

module.exports = {
  handlePostCreated,
  handlePostDeleted,
};
