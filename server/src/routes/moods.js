import express from "express";
import mongoose from "mongoose";
import Mood from "../models/Mood.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

/** Clamp helpers */
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * POST /api/moods
 * Body: { label: "Happy"|"Content"|"Neutral"|"Stressed"|"Sad", value: 1..5, level: 0..100 }
 */
router.post("/", auth, async (req, res) => {
  try {
    const { label, value, level } = req.body || {};
    const allowed = ["Happy", "Content", "Neutral", "Stressed", "Sad"];
    if (!allowed.includes(label)) return res.status(400).json({ message: "Invalid label" });

    const doc = await Mood.create({
      userId: new mongoose.Types.ObjectId(req.userId),
      label,
      value: clamp(Number(value) || 3, 1, 5),
      level: clamp(Number(level) || 50, 0, 100),
    });

    return res.status(201).json({ ok: true, id: doc.id });
  } catch (err) {
    console.error("POST /moods error:", err);
    return res.status(500).json({ message: "Failed to save mood" });
  }
});

/**
 * GET /api/moods/series?days=30
 * Returns { dates: [ISO day strings], values: [number|null] }
 * values are the daily average (1..5) for each day; null if no entry that day
 */
router.get("/series", auth, async (req, res) => {
  try {
    const days = clamp(parseInt(req.query.days || "30", 10) || 30, 1, 120);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const since = new Date(today);
    since.setDate(today.getDate() - (days - 1));

    // Aggregate by day for this user
    const rows = await Mood.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.userId),
          createdAt: { $gte: since },
        },
      },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          avg: { $avg: "$value" },
        },
      },
      { $project: { _id: 0, date: "$_id", value: { $round: ["$avg", 1] } } },
      { $sort: { date: 1 } },
    ]);

    // Map YYYY-MM-DD → value
    const map = new Map(rows.map((r) => [r.date, r.value]));

    // Build continuous arrays
    const dates = [];
    const values = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      dates.push(key);
      values.push(map.has(key) ? map.get(key) : null);
    }

    return res.json({ dates, values });
  } catch (err) {
    console.error("GET /moods/series error:", err);
    return res.status(500).json({ message: "Failed to load series" });
  }
});

export default router;
