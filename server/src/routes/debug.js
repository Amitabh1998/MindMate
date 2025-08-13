import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';

const router = express.Router();

router.get('/db', async (_req, res) => {
  const conn = mongoose.connection;
  const collections = await conn.db.listCollections().toArray();
  const usersCount = await User.countDocuments();
  const latest = await User.find().sort({ createdAt: -1 }).limit(3).select('name email createdAt');
  res.json({
    host: conn.host,
    db: conn.name,
    collections: collections.map(c => c.name),
    usersCount,
    latest,
  });
});

export default router;