import mongoose from 'mongoose';

export async function connectDB(uri) {
  mongoose.set('strictQuery', true);

  // If you ever omit the db name in the URI, you can force it via env:
  const opts = {};
  if (process.env.MONGO_DB_NAME) opts.dbName = process.env.MONGO_DB_NAME;

  await mongoose.connect(uri, opts);

  const conn = mongoose.connection;
  console.log(`MongoDB connected: host=${conn.host} db=${conn.name}`);
}