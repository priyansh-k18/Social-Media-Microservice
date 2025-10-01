const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectToDb = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    logger.info("Database connected successfully");

    mongoose.connection.on("connected", () => {
      logger.info("Mongoose connected to DB");
    });

    mongoose.connection.on("error", (err) => {
      logger.error("Mongoose connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("Mongoose disconnected");
    });

  } catch (e) {
    logger.error("Failed to connect to database", e);
    process.exit(1);
  }
};

module.exports = connectToDb;
