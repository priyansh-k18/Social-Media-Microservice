require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const cors = require('helmet');
const postRoutes = require('./routes/post-routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { default: helmet } = require('helmet');
const { connectToRabbitMQ } = require('./utils/rabbitmq');


const app = express();
const PORT = process.env.PORT || 3002

mongoose.connect(process.env.MONGODB_URI)
        .then(() => logger.info("connected to mognodb"))
        .catch((e) => logger.error("Mongo connection error", e));

const redisClient = new Redis(process.env.REDIS_URL);


//middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req , res , next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request body, ${req.body}`);
    next();
});

//implementing Ip based rate limiting for sensitive endpoints

// const rateLimiter = new RateLimiterRedis({
//   storeClient: redisClient,
//   keyPrefix: "middleware",
//   points: 10,
//   duration: 1,
// });

// app.use((req, res, next) => {
//   rateLimiter
//     .consume(req.ip)
//     .then(() => next())
//     .catch(() => {
//       logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
//       res.status(429).json({ success: false, message: "Too many requests" });
//     });
// });

// //Ip based rate limiting for sensitive endpoints
// const sensitiveEndpointsLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 50,
//   standardHeaders: true,
//   legacyHeaders: false,
//   handler: (req, res) => {
//     logger.warn(`sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
//     res.status(429).json({ success: false, message: "Too many requests" });
//   },
//   store: new RedisStore({
//     sendCommand: (...args) => redisClient.call(...args),
//   }),
// });

//apply this sensitiveEndpoints limiter to our routes

app.use('/api/posts', (req,res,next) => {
        req.redisClient = redisClient
        next()
}, postRoutes);

app.use(errorHandler);

async function startServer(){
        try{
              await connectToRabbitMQ();
              app.listen(PORT, () => {
                logger.info(`post-service running on port ${PORT}`);
              });
        }catch(error){
                logger.error('Failed to start server', error);
                process.exit(1);
        }
}

startServer();




//unhandled promise rejection

process.on("unhandledRejection", (reason, promise) => {
        logger.error("Unhandled Rejection at", promise, "reason:",reason)
});