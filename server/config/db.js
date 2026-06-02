const mongoose = require('mongoose');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set in environment variables');
  }

  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        tls: true,
        tlsAllowInvalidCertificates: process.env.NODE_ENV !== 'production',
        serverSelectionTimeoutMS: 10000,
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      let details = '';
      const servers = error?.reason?.servers;
      if (servers && typeof servers.values === 'function') {
        const firstServer = servers.values().next().value;
        if (firstServer?.error?.message) {
          details = ` | Details: ${firstServer.error.message}`;
        }
      }

      if (attempt === maxAttempts) {
        throw new Error(`MongoDB Connection Error: ${error.message}${details}`);
      }

      console.warn(`MongoDB connect attempt ${attempt}/${maxAttempts} failed: ${error.message}${details}`);
      await sleep(1500 * attempt);
    }
  }
};

module.exports = connectDB;
