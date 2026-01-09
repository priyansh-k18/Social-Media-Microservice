const Media = require("../models/media");
const logger = require("../utils/logger");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");



const handlePostDeletedEvent = async (content) => {
    try{
        const {postId,mediaIds} = content;
        logger.info(`Deleting media for post: ${postId}`);
        const mediaToDelete = await Media.find({_id : {$in : mediaIds}});
        for(const media of mediaToDelete){
            await deleteMediaFromCloudinary(media.publicId);
            await Media.findByIdAndDelete(media._id);

            logger.info(`Media deleted from cloudinary and database: ${media.publicId}`);
        }
        logger.info(`Processed deletion of ${mediaToDelete.length} media for post: ${postId}`);
    }catch(error){
        logger.error('Error while handling post deleted event',error);
    }
}

module.exports = { handlePostDeletedEvent };