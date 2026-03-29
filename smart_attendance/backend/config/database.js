const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    const canStartWithoutDb =
      process.env.ALLOW_START_WITHOUT_DB === 'true' ||
      (process.env.ALLOW_START_WITHOUT_DB !== 'false' && process.env.NODE_ENV !== 'production');

    if (canStartWithoutDb) {
      console.warn(`MongoDB connection unavailable: ${error.message}`);
      console.warn('Starting backend in degraded mode (database-dependent APIs may fail).');
      return null;
    }

    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
