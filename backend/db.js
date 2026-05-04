const mongoose = require('mongoose');

const cached = global.__mongooseTaskManager || { conn: null, promise: null };
global.__mongooseTaskManager = cached;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined');
  }
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri);
  }
  await cached.promise;
  cached.conn = mongoose.connection;
  return cached.conn;
}

module.exports = { connectDB };
