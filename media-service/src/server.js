require("dotenv").config();
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors');
const helmet = require('helmet');
const mediaRoutes = require('./routes/media-routes')
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { connectToRabbitMQ, consumeEvent } = require("./utils/rabbitmq");
const { handlePostDeletedEvent } = require("./eventHandlers/media-event-handlers");

const app = express();
const PORT = process.env.PORT || 3003

//connect to mongodb
    mongoose.connect(process.env.MONGODB_URI)
    .then(() => logger.info("connected to mongodb"))
    .catch((e) => logger.error("Mongo connection error", e));

app.use(cors());
app.use(express.json());
app.use(helmet());

app.use((req , res , next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request body, ${req.body}`);
    next();
})

app.use("/api/media", mediaRoutes);

app.use(errorHandler);

async function startServer(){
    try{
        await connectToRabbitMQ();

        //consume events
        await consumeEvent('post.deleted',handlePostDeletedEvent)

        app.listen(PORT, () => {
            logger.info(`Media service running on port ${PORT}`);
        });
    }catch(error){
        logger.error('Failed to start server', error);
    }
}

startServer();


process.on("unhandledRejection", (reason,promise) => {
    logger.error("Unhandled Rejection at" , promise, "reason:",reason);
});
